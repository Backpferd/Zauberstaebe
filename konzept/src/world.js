import * as THREE from 'three';
import { fbm, smoothstep, distToPolyline, paintFaces } from './util.js';
import {
  vertexColorMat, makePine, makeLeafTree, makeBirch, makeDeadTree, makeBush, makeRock,
  makeMushrooms, makeLog, makePillar, makeWall, makePlatform, makeTent, makeCrate, part, mat,
} from './models.js';

// Wege der Lichtung (x, z)
export const PATHS = [
  [[0.8, 14], [-1.2, 7], [-1.9, 3.2], [0.2, -0.8], [2.6, -4.6], [4.0, -9], [4.6, -20]],
  [[-1.6, 0.6], [-4.6, -2.4], [-7.0, -4.2], [-9.2, -5.0]],
  [[-2.0, 2.8], [-5.0, 2.9], [-8.0, 2.7]],
];

export const CLEARING = { x: 0.6, z: -0.8, rx: 12.5, rz: 8.2 };

export function buildWorld(ctx) {
  const { scene, rng, noise, layout } = ctx;
  const pathDist = (x, z) => Math.min(...PATHS.map((p) => distToPolyline(x, z, p)));
  const ellipse = (x, z) => Math.hypot((x - CLEARING.x) / CLEARING.rx, (z - CLEARING.z) / CLEARING.rz);
  const heightAt = (x, z) => {
    const e = ellipse(x, z);
    let h = 0.06 * fbm(noise, x * 0.12, z * 0.12, 3);
    h += smoothstep(0.95, 1.9, e) * (1.3 + 1.2 * fbm(noise, x * 0.05 + 7, z * 0.05 + 3, 2));
    h -= 0.04 * (1 - smoothstep(0.6, 1.4, pathDist(x, z)));
    return h;
  };
  ctx.heightAt = heightAt;
  ctx.pathDist = pathDist;
  ctx.ellipse = ellipse;

  // --- Boden --------------------------------------------------------------
  const C = (h) => new THREE.Color(h);
  const grassA = C(0x2a3b22), grassB = C(0x37492b), grassC = C(0x45542d), litter = C(0x55402a);
  const dirtA = C(0x4f3e2c), dirtB = C(0x5e4b34), forest = C(0x1d2618), needles = C(0x33281c);
  const groundColor = (x, z, out) => {
    const n1 = fbm(noise, x * 0.18, z * 0.18, 3) * 0.5 + 0.5;
    const n2 = fbm(noise, x * 0.07 + 31, z * 0.07 - 17, 3) * 0.5 + 0.5;
    out.copy(grassA).lerp(grassB, smoothstep(0.3, 0.7, n1));
    out.lerp(grassC, smoothstep(0.6, 0.85, n2) * 0.6);
    out.lerp(litter, smoothstep(0.55, 0.8, 1 - n2) * 0.5);
    const e = ellipse(x, z);
    out.lerp(forest, smoothstep(0.9, 1.4, e) * 0.75);
    out.lerp(needles, smoothstep(1.1, 1.6, e) * 0.3 * n1);
    const pd = pathDist(x, z) + (n1 - 0.5) * 0.7;
    const pm = 1 - smoothstep(0.45, 1.05, pd);
    if (pm > 0) out.lerp(n2 > 0.5 ? dirtB : dirtA, pm);
    out.multiplyScalar(0.97 + rng() * 0.06);
  };
  let geo = new THREE.PlaneGeometry(130, 130, 200, 200);
  geo.rotateX(-Math.PI / 2);
  geo.translate(CLEARING.x, 0, CLEARING.z - 10);
  // Farben pro Eckpunkt (weiche Übergänge), Licht bleibt facettiert (flatShading)
  const pos = geo.attributes.position;
  const vcol = new Float32Array(pos.count * 3);
  const gcol = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    groundColor(x, z, gcol);
    vcol[i * 3] = gcol.r; vcol[i * 3 + 1] = gcol.g; vcol[i * 3 + 2] = gcol.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(vcol, 3));
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, vertexColorMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const blocked = layout.blocked;
  const isBlocked = (x, z, pad = 0) => blocked.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + pad);

  // --- Bäume --------------------------------------------------------------
  const trees = [];
  for (let i = 0; i < 9000 && trees.length < 460; i++) {
    const x = rng.range(-44, 46), z = rng.range(-48, 16);
    const e = ellipse(x, z);
    if (e < 0.93) continue;
    if (pathDist(x, z) < 1.9) continue;
    if (z > 2.5 && x > -15 && x < 17) continue;
    if (isBlocked(x, z)) continue;
    if (rng() > smoothstep(0.93, 1.3, e)) continue;
    const minD = e < 1.2 ? 2.1 : 1.8;
    if (trees.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < minD * minD)) continue;
    trees.push({ x, z });
  }
  for (const t of trees) {
    const r = rng();
    const tree = r < 0.55 ? makePine(rng) : r < 0.78 ? makeLeafTree(rng) : r < 0.9 ? makeBirch(rng) : makeDeadTree(rng);
    tree.position.set(t.x, heightAt(t.x, t.z) - 0.1, t.z);
    scene.add(tree);
  }

  // --- Büsche, Felsen, Baumstämme, Pilze -----------------------------------
  for (let i = 0; i < 900; i++) {
    const x = rng.range(-22, 24), z = rng.range(-20, 10);
    const e = ellipse(x, z);
    if (e < 0.8 || e > 1.5 || pathDist(x, z) < 1.4 || isBlocked(x, z)) continue;
    if (z > 4.5 && Math.abs(x - 1) < 9) continue;
    if (rng() > 0.18) continue;
    const b = makeBush(rng);
    b.position.set(x, heightAt(x, z), z);
    scene.add(b);
  }
  for (let i = 0; i < 70; i++) {
    const x = rng.range(-16, 19), z = rng.range(-13, 9);
    const e = ellipse(x, z);
    if (pathDist(x, z) < 1.0 || isBlocked(x, z, 0.4)) continue;
    const big = e > 0.85 && (z < 1.5 || x < -13 || x > 15);
    const r = makeRock(rng, big ? rng.range(0.6, 1.4) : rng.range(0.15, 0.4));
    r.position.set(x, heightAt(x, z) - 0.05, z);
    scene.add(r);
  }
  for (const [x, z, rot] of layout.logs) {
    const l = makeLog(rng, 3.2);
    l.rotation.y = rot;
    l.position.set(x, heightAt(x, z) - 0.05, z);
    scene.add(l);
  }
  for (const [x, z] of layout.mushrooms) {
    const m = makeMushrooms(rng);
    m.position.set(x, heightAt(x, z), z);
    scene.add(m);
  }

  // --- Gras (instanziert) --------------------------------------------------
  const blade = new THREE.ConeGeometry(0.045, 0.42, 3);
  blade.translate(0, 0.21, 0);
  const grassMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 });
  const maxBlades = 16000;
  const grass = new THREE.InstancedMesh(blade, grassMat, maxBlades);
  grass.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const gc = [C(0x3d5a2a), C(0x4f6a2f), C(0x5f7032), C(0x34502a), C(0x6b6a30)];
  const tmp = new THREE.Color();
  let nBlades = 0;
  for (let i = 0; i < 9000 && nBlades < maxBlades - 6; i++) {
    const cx = rng.range(-18, 21), cz = rng.range(-14, 9);
    const dens = fbm(noise, cx * 0.15 + 50, cz * 0.15, 2) * 0.5 + 0.5;
    if (rng() > dens * 1.3) continue;
    if (pathDist(cx, cz) < 0.9 || isBlocked(cx, cz, -0.3) || ellipse(cx, cz) > 1.35) continue;
    const k = rng.int(3, 7);
    for (let j = 0; j < k; j++) {
      const x = cx + rng.range(-0.22, 0.22), z = cz + rng.range(-0.22, 0.22);
      dummy.position.set(x, heightAt(x, z) - 0.02, z);
      dummy.rotation.set(rng.range(-0.35, 0.35), rng() * 3, rng.range(-0.35, 0.35));
      dummy.scale.setScalar(rng.range(0.6, 1.25));
      dummy.updateMatrix();
      grass.setMatrixAt(nBlades, dummy.matrix);
      tmp.copy(rng.pick(gc)).multiplyScalar(rng.range(0.8, 1.1));
      grass.setColorAt(nBlades, tmp);
      nBlades++;
    }
  }
  grass.count = nBlades;
  scene.add(grass);

  // Blumen
  const flowerGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ flatShading: true }), 400);
  const fc = [C(0x7a52b0), C(0xb89a30), C(0x9a4a70)];
  let nf = 0;
  for (let i = 0; i < 2000 && nf < 400; i++) {
    const x = rng.range(-16, 19), z = rng.range(-12, 8);
    if (pathDist(x, z) < 1.0 || isBlocked(x, z) || ellipse(x, z) > 1.05) continue;
    if (rng() > 0.12) continue;
    dummy.position.set(x, heightAt(x, z) + rng.range(0.15, 0.3), z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(rng.range(0.7, 1.2));
    dummy.updateMatrix();
    flowers.setMatrixAt(nf, dummy.matrix);
    flowers.setColorAt(nf, rng.pick(fc));
    nf++;
  }
  flowers.count = nf;
  scene.add(flowers);

  // --- Ruinen mit Wegpunkt -------------------------------------------------
  const wp = layout.waypoint;
  const wpY = heightAt(wp.x, wp.z);
  const plat = makePlatform(rng);
  plat.position.set(wp.x, wpY - 0.05, wp.z);
  scene.add(plat);
  ctx.waypointTop = wpY - 0.05 + 0.48;
  const pillarSpec = [[0.15, 2.9, false], [1.25, 0.45, true], [2.45, 1.0, true], [3.3, 2.2, true], [4.35, 3.2, false], [5.35, 3.4, false]];
  for (const [a, h, broken] of pillarSpec) {
    const px = wp.x + Math.cos(a) * 3.55, pz = wp.z + Math.sin(a) * 3.55;
    const p = makePillar(rng, h, broken);
    p.position.set(px, heightAt(px, pz) - 0.05, pz);
    p.rotation.y = rng() * Math.PI;
    scene.add(p);
  }
  {
    // umgestürzte Säule
    const fall = new THREE.Group();
    const seg = part(fall, paintFaces(new THREE.CylinderGeometry(0.34, 0.38, 2.6, 8), (c, n, out) => {
      out.set(rng.pick([0x6a6862, 0x5f5d58, 0x75726a])).multiplyScalar(rng.range(0.9, 1.05));
    }), vertexColorMat, 0, 0.32, 0);
    seg.rotation.z = Math.PI / 2;
    fall.position.set(wp.x + 3.6, heightAt(wp.x + 3.6, wp.z + 2.2), wp.z + 2.4);
    fall.rotation.y = 0.7;
    scene.add(fall);
  }
  const wall = makeWall(rng, 6.2, 2.4);
  wall.position.set(wp.x - 0.6, heightAt(wp.x - 0.6, wp.z - 4.6) - 0.05, wp.z - 4.6);
  wall.rotation.y = 0.12;
  scene.add(wall);
  const wall2 = makeWall(rng, 3.8, 1.4);
  wall2.position.set(wp.x - 4.5, heightAt(wp.x - 4.5, wp.z - 1.5) - 0.05, wp.z - 1.5);
  wall2.rotation.y = 1.25;
  scene.add(wall2);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, r = rng.range(3.0, 5.0);
    const x = wp.x + Math.cos(a) * r, z = wp.z + Math.sin(a) * r;
    const rb = makeRock(rng, rng.range(0.15, 0.32), 0.3);
    rb.position.set(x, heightAt(x, z), z);
    scene.add(rb);
  }

  // --- Lager ---------------------------------------------------------------
  const camp = layout.camp;
  const tent = makeTent();
  tent.position.set(camp.tent.x, heightAt(camp.tent.x, camp.tent.z) - 0.02, camp.tent.z);
  tent.rotation.y = camp.tent.rot;
  scene.add(tent);
  for (const [x, z] of camp.crates) {
    const c = makeCrate(rng);
    c.position.set(x, heightAt(x, z), z);
    scene.add(c);
  }
  const fire = camp.fire;
  const fy = heightAt(fire.x, fire.z);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const st = makeRock(rng, 0.2, 0);
    st.position.set(fire.x + Math.cos(a) * 0.62, fy, fire.z + Math.sin(a) * 0.62);
    scene.add(st);
  }
  const logM = mat(0x2e1d12);
  for (let i = 0; i < 4; i++) {
    const lg = new THREE.Group();
    lg.position.set(fire.x, fy, fire.z);
    lg.rotation.y = (i / 4) * Math.PI * 2 + 0.3;
    scene.add(lg);
    const l = part(lg, new THREE.CylinderGeometry(0.06, 0.08, 0.95, 6), logM, 0.22, 0.2, 0);
    l.rotation.z = Math.PI / 2 - 0.45;
  }
  const bench = makeLog(rng, 1.8);
  bench.rotation.y = 0.4;
  bench.scale.setScalar(0.75);
  bench.position.set(fire.x - 0.6, fy - 0.05, fire.z - 1.5);
  scene.add(bench);

  return { ground, trees };
}
