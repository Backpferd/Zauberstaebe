import * as THREE from 'three';
import { paintFaces } from './util.js';

// ---------------------------------------------------------------------------
// Material-Helfer
// ---------------------------------------------------------------------------
const matCache = new Map();
export function mat(color, extra = {}) {
  const key = String(color) + JSON.stringify(extra);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.88, metalness: 0, ...extra });
    matCache.set(key, m);
  }
  return m;
}

export const vertexColorMat = new THREE.MeshStandardMaterial({
  vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0,
});

export function part(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
// Richtet die lokale -Y-Achse (bzw. base) eines Objekts auf dir aus.
export function orient(obj, dir, base = DOWN) {
  obj.quaternion.setFromUnitVectors(base, dir.clone().normalize());
  return obj;
}

// ---------------------------------------------------------------------------
// Zauberstab
// ---------------------------------------------------------------------------
export function makeWandMesh(o = {}) {
  const w = new THREE.Group();
  const s = o.scale ?? 1;
  part(w, new THREE.CylinderGeometry(0.032 * s, 0.032 * s, 0.13 * s, 6), mat(o.grip ?? 0x2b1a10), 0, -0.02 * s, 0);
  part(w, new THREE.CylinderGeometry(0.017 * s, 0.028 * s, 0.52 * s, 6), mat(o.wood ?? 0x6e4527), 0, -0.3 * s, 0);
  const ring = part(w, new THREE.TorusGeometry(0.031 * s, 0.009 * s, 4, 10),
    mat(0xd8b25a, { metalness: 0.6, roughness: 0.4 }), 0, -0.095 * s, 0);
  ring.rotation.x = Math.PI / 2;
  const tip = part(w, new THREE.OctahedronGeometry(0.04 * s),
    new THREE.MeshBasicMaterial({ color: o.tip ?? new THREE.Color(6, 2.6, 0.7) }), 0, -0.585 * s, 0);
  tip.castShadow = false;
  w.userData.tip = tip;
  return w;
}

// ---------------------------------------------------------------------------
// Zauberer / Menschen (Front zeigt nach +Z)
// ---------------------------------------------------------------------------
export function makeHumanoid(o = {}) {
  const robe = o.robe ?? 0x312c7e;
  const robeDark = o.robeDark ?? 0x221d58;
  const trim = o.trim ?? 0xd8b25a;
  const skin = 0xe3b08a;
  const scarf = o.scarf ?? 0x8e2a2c;
  const g = new THREE.Group();
  const trimM = mat(trim, { metalness: 0.55, roughness: 0.45 });

  const prof = [[0.001, 0], [0.45, 0], [0.44, 0.07], [0.37, 0.45], [0.29, 0.8], [0.255, 0.95],
    [0.29, 1.1], [0.315, 1.2], [0.25, 1.32], [0.12, 1.39], [0.001, 1.4]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  part(g, new THREE.LatheGeometry(prof, 12), mat(robe));
  const hem = part(g, new THREE.TorusGeometry(0.445, 0.03, 4, 24), trimM, 0, 0.05, 0);
  hem.rotation.x = Math.PI / 2;
  const stripe = part(g, new THREE.BoxGeometry(0.07, 0.8, 0.025), trimM, 0, 0.45, 0.365);
  stripe.rotation.x = -0.19;
  const belt = part(g, new THREE.TorusGeometry(0.262, 0.035, 4, 18), mat(0x4a2e1c), 0, 0.92, 0);
  belt.rotation.x = Math.PI / 2;
  part(g, new THREE.BoxGeometry(0.09, 0.08, 0.04), trimM, 0, 0.92, 0.27);
  part(g, new THREE.BoxGeometry(0.13, 0.15, 0.08), mat(0x5a3a22), 0.24, 0.82, 0.08);
  const collar = part(g, new THREE.TorusGeometry(0.19, 0.075, 6, 14), mat(scarf), 0, 1.34, 0);
  collar.rotation.x = Math.PI / 2;
  const tail = part(g, new THREE.BoxGeometry(0.12, 0.45, 0.04), mat(scarf), 0.1, 1.1, -0.3);
  tail.rotation.set(0.35, 0, 0.15);
  part(g, new THREE.IcosahedronGeometry(0.17, 1), mat(skin), 0, 1.53, 0.01);
  const nose = part(g, new THREE.ConeGeometry(0.035, 0.09, 4), mat(0xd49a76), 0, 1.51, 0.19);
  nose.rotation.x = Math.PI / 2;
  part(g, new THREE.BoxGeometry(0.13, 0.08, 0.22), mat(0x2a1c12), -0.12, 0.04, 0.3);
  part(g, new THREE.BoxGeometry(0.13, 0.08, 0.22), mat(0x2a1c12), 0.12, 0.04, 0.26);

  if (o.hat === 'hood') {
    const hood = part(g, new THREE.IcosahedronGeometry(0.215, 1), mat(robeDark), 0, 1.57, -0.04);
    hood.scale.set(1, 1.05, 1.1);
    const tipH = part(g, new THREE.ConeGeometry(0.11, 0.3, 6), mat(robeDark), 0, 1.6, -0.27);
    tipH.rotation.x = -2.1;
    // Bogen und Köcher auf dem Rücken
    const bow = part(g, new THREE.TorusGeometry(0.55, 0.022, 4, 16, Math.PI), mat(0x5a3b20), 0.05, 1.0, -0.33);
    bow.rotation.set(0, 0, Math.PI / 2 + 0.35);
    const quiver = part(g, new THREE.CylinderGeometry(0.07, 0.06, 0.55, 6), mat(0x4a2e1c), -0.15, 1.05, -0.28);
    quiver.rotation.set(0.25, 0, -0.35);
    for (let i = 0; i < 3; i++) {
      const ar = part(quiver, new THREE.ConeGeometry(0.025, 0.08, 4), mat(0xb8b0a0), (i - 1) * 0.025, 0.33, 0);
      ar.castShadow = false;
    }
  } else {
    const hat = new THREE.Group();
    hat.position.set(0, 1.64, 0);
    hat.rotation.set(-0.06, 0, 0.05);
    g.add(hat);
    part(hat, new THREE.CylinderGeometry(0.45, 0.47, 0.035, 20), mat(robeDark));
    const band = part(hat, new THREE.TorusGeometry(0.235, 0.032, 4, 20), trimM, 0, 0.05, 0);
    band.rotation.x = Math.PI / 2;
    part(hat, new THREE.OctahedronGeometry(0.05),
      mat(0xffe08a, { emissive: 0xffc040, emissiveIntensity: 1.5 }), 0, 0.06, 0.25);
    part(hat, new THREE.CylinderGeometry(0.155, 0.25, 0.34, 14), mat(robeDark), 0, 0.17, 0);
    const h2 = new THREE.Group();
    h2.position.y = 0.34;
    h2.rotation.x = -0.4;
    hat.add(h2);
    part(h2, new THREE.CylinderGeometry(0.075, 0.155, 0.27, 12), mat(robeDark), 0, 0.135, 0);
    const h3 = new THREE.Group();
    h3.position.y = 0.27;
    h3.rotation.x = -0.6;
    h2.add(h3);
    part(h3, new THREE.ConeGeometry(0.075, 0.26, 12), mat(robeDark), 0, 0.13, 0);
  }

  const arm = (side, dir, withWand) => {
    const a = new THREE.Group();
    a.position.set(side * 0.27, 1.25, 0.02);
    g.add(a);
    orient(a, dir);
    part(a, new THREE.CylinderGeometry(0.075, 0.115, 0.5, 8), mat(robe), 0, -0.25, 0);
    const cuff = part(a, new THREE.TorusGeometry(0.11, 0.025, 4, 12), trimM, 0, -0.49, 0);
    cuff.rotation.x = Math.PI / 2;
    part(a, new THREE.IcosahedronGeometry(0.065, 1), mat(skin), 0, -0.56, 0);
    if (withWand) {
      const w = makeWandMesh(o.wand);
      w.position.y = -0.56;
      a.add(w);
      g.userData.wandTip = w.userData.tip;
    }
  };
  arm(-1, o.wandArm ?? new THREE.Vector3(0.12, 0.22, 1), o.wand !== false);
  arm(1, o.freeArm ?? new THREE.Vector3(0.45, -0.7, 0.35), false);
  return g;
}

// ---------------------------------------------------------------------------
// Warg (Front zeigt nach +Z)
// ---------------------------------------------------------------------------
export function makeWarg(o = {}) {
  const g = new THREE.Group();
  const fm = o.furMat ?? mat(o.fur ?? 0x3e3933);
  const dm = o.darkMat ?? mat(o.furDark ?? 0x262220);
  const spikeM = o.spikeMat ?? dm;
  const ss = o.spikeScale ?? 1;
  const eyeM = new THREE.MeshBasicMaterial({ color: o.eyeColor ?? new THREE.Color(7, 0.7, 0.2) });
  const body = new THREE.Group();
  g.add(body);
  const ico = (r) => new THREE.IcosahedronGeometry(r, 1);
  const scaled = (m, x, y, z) => { m.scale.set(x, y, z); return m; };

  scaled(part(body, ico(1), fm, 0, 0.82, -0.1), 0.42, 0.4, 0.82);
  scaled(part(body, ico(1), fm, 0, 0.92, 0.42), 0.47, 0.5, 0.5);
  scaled(part(body, ico(1), fm, 0, 0.8, -0.62), 0.37, 0.36, 0.38);
  scaled(part(body, ico(1), o.bellyMat ?? mat(0x57504a), 0, 0.68, 0.38), 0.34, 0.3, 0.42);

  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const sp = part(body, new THREE.ConeGeometry(0.085 * ss, 0.36 * ss * (1 - t * 0.45), 4), spikeM,
      0, 1.36 - t * 0.2, 0.7 - t * 1.25);
    sp.rotation.x = -0.75;
    if (i % 2 === 0 && i < 6) {
      for (const sd of [-1, 1]) {
        const s2 = part(body, new THREE.ConeGeometry(0.06 * ss, 0.26 * ss, 4), spikeM,
          sd * 0.2, 1.24 - t * 0.2, 0.66 - t * 1.25);
        s2.rotation.set(-0.7, 0, -sd * 0.6);
      }
    }
  }

  const head = new THREE.Group();
  head.position.set(0, 1.1, 0.92);
  head.rotation.x = o.headPitch ?? 0.1;
  body.add(head);
  scaled(part(head, ico(1), fm, 0, 0, 0), 0.25, 0.24, 0.3);
  const snout = part(head, new THREE.CylinderGeometry(0.075, 0.14, 0.36, 6), fm, 0, -0.05, 0.31);
  snout.rotation.x = Math.PI / 2;
  part(head, new THREE.IcosahedronGeometry(0.045, 0), mat(0x111111), 0, -0.02, 0.5);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.12, 0.12);
  jaw.rotation.x = o.jaw ?? 0.45;
  head.add(jaw);
  part(jaw, new THREE.BoxGeometry(0.15, 0.05, 0.32), fm, 0, -0.02, 0.16);
  for (const tx of [-0.045, 0.045]) {
    const t = part(jaw, new THREE.ConeGeometry(0.014, 0.06, 4), mat(0xeee6d0), tx, 0.03, 0.28);
    t.castShadow = false;
  }
  part(head, new THREE.BoxGeometry(0.13, 0.08, 0.26), mat(0x4a1010), 0, -0.13, 0.26);
  for (const tx of [-0.05, 0.05]) {
    for (const tz of [0.33, 0.43]) {
      const t = part(head, new THREE.ConeGeometry(0.016, 0.07, 4), mat(0xeee6d0), tx, -0.14, tz);
      t.rotation.x = Math.PI;
      t.castShadow = false;
    }
  }
  for (const sd of [-1, 1]) {
    const eye = part(head, new THREE.IcosahedronGeometry(0.036, 0), eyeM, sd * 0.11, 0.06, 0.2);
    eye.castShadow = false;
    const ear = part(head, new THREE.ConeGeometry(0.075, 0.22, 4), dm, sd * 0.13, 0.21, -0.05);
    ear.rotation.set(-0.45, 0, -sd * 0.3);
  }

  const leg = (x, z, ang, knee) => {
    const L = new THREE.Group();
    L.position.set(x, 0.84, z);
    L.rotation.x = ang;
    body.add(L);
    part(L, new THREE.CylinderGeometry(0.075, 0.105, 0.44, 6), fm, 0, -0.22, 0);
    const K = new THREE.Group();
    K.position.y = -0.44;
    K.rotation.x = knee;
    L.add(K);
    part(K, new THREE.CylinderGeometry(0.05, 0.07, 0.36, 6), dm, 0, -0.18, 0);
    part(K, new THREE.BoxGeometry(0.12, 0.06, 0.17), dm, 0, -0.37, 0.04);
  };
  // [Hüftwinkel, Kniewinkel] für VL, VR, HL, HR (negativ = nach vorn)
  const poses = {
    run: [[-0.55, 0.5], [0.2, 0.15], [0.65, -0.7], [0.1, -0.35]],
    lunge: [[-1.0, 0.85], [-0.8, 0.6], [0.75, -0.45], [0.6, -0.3]],
    stand: [[-0.05, 0.05], [0.08, 0], [0.08, -0.15], [-0.05, -0.05]],
    prowl: [[-0.35, 0.3], [0.1, 0.1], [0.35, -0.5], [0.05, -0.2]],
  };
  const P = poses[o.pose ?? 'run'];
  leg(-0.2, 0.5, ...P[0]);
  leg(0.2, 0.5, ...P[1]);
  leg(-0.21, -0.55, ...P[2]);
  leg(0.21, -0.55, ...P[3]);

  const tail = new THREE.Group();
  tail.position.set(0, 0.95, -0.92);
  tail.rotation.x = o.tailAngle ?? -1.0;
  body.add(tail);
  part(tail, new THREE.ConeGeometry(0.11, 0.7, 5), fm, 0, 0.35, 0);

  if (o.pose === 'lunge') {
    body.rotation.x = -0.14;
    body.position.y = 0.18;
  }
  g.userData.chest = new THREE.Vector3(0, 0.95, 0.45);
  g.userData.headTop = 1.55;
  return g;
}

// ---------------------------------------------------------------------------
// Vegetation
// ---------------------------------------------------------------------------
const PINE_GREENS = [0x1c3a31, 0x21443a, 0x183329, 0x27493a, 0x1f3f2c];
export function makePine(rng) {
  const g = new THREE.Group();
  const h = rng.range(5, 9);
  const k = h / 7;
  const trunkH = 1.5 * k;
  part(g, new THREE.CylinderGeometry(0.12 * k, 0.22 * k, trunkH + 0.4, 6), mat(0x3a281c), 0, (trunkH + 0.4) / 2 - 0.2, 0);
  const m = mat(rng.pick(PINE_GREENS));
  const layers = rng.int(3, 5);
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const r = (1.75 - t * 1.25) * k * rng.range(0.92, 1.08);
    const ch = ((h - trunkH) / layers) * 1.75;
    const y = trunkH + i * ((h - trunkH) / layers) * 0.92 + ch / 2;
    const c = part(g, new THREE.ConeGeometry(r, ch, 7), m, 0, y, 0);
    c.rotation.y = rng() * Math.PI;
  }
  g.rotation.y = rng() * Math.PI * 2;
  return g;
}

export const AUTUMN = [0x8a4b1e, 0x9a6224, 0x6f6a26, 0x7d3a1c, 0xa77a2a, 0x4f5f24];
export function makeLeafTree(rng, palette = AUTUMN) {
  const g = new THREE.Group();
  const h = rng.range(3.8, 6.2);
  const tH = h * 0.55;
  part(g, new THREE.CylinderGeometry(0.14, 0.27, tH, 6), mat(0x45311f), 0, tH / 2, 0);
  const m1 = mat(rng.pick(palette));
  const m2 = mat(rng.pick(palette));
  const n = rng.int(4, 6);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = i === 0 ? 0 : rng.range(0.6, 1.25);
    const r = (rng.range(0.9, 1.35) * h) / 5;
    const c = part(g, new THREE.IcosahedronGeometry(r, 0), i % 2 ? m2 : m1,
      Math.cos(a) * d, tH + (rng.range(0.25, 1.2) * h) / 5, Math.sin(a) * d);
    c.rotation.set(rng() * 3, rng() * 3, rng() * 3);
  }
  return g;
}

export function makeBirch(rng) {
  const g = new THREE.Group();
  const h = rng.range(4.5, 7);
  let trunk = new THREE.CylinderGeometry(0.09, 0.15, h * 0.8, 6, 9);
  trunk.translate(0, h * 0.4, 0);
  const white = new THREE.Color(0xe0dccf), white2 = new THREE.Color(0xcac4b3), dark = new THREE.Color(0x2a2622);
  trunk = paintFaces(trunk, (c, n, out) => {
    out.copy(rng() < 0.2 ? dark : rng() < 0.5 ? white : white2);
  });
  part(g, trunk, vertexColorMat);
  const pal = [0xa5a23a, 0xb8962f, 0x8a9a35, 0xc0a040];
  const m = mat(rng.pick(pal));
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng.range(0.1, 0.7);
    const c = part(g, new THREE.IcosahedronGeometry(rng.range(0.6, 0.95), 0), m,
      Math.cos(a) * d, h * 0.68 + rng.range(0, 1.3), Math.sin(a) * d);
    c.rotation.set(rng() * 3, rng() * 3, rng() * 3);
  }
  return g;
}

export function makeDeadTree(rng) {
  const g = new THREE.Group();
  const h = rng.range(3, 5.5);
  const m = mat(0x3d3934);
  part(g, new THREE.CylinderGeometry(0.08, 0.24, h, 6), m, 0, h / 2, 0);
  const n = rng.int(3, 5);
  for (let i = 0; i < n; i++) {
    const br = new THREE.Group();
    br.position.y = h * rng.range(0.45, 0.9);
    g.add(br);
    const a = rng() * Math.PI * 2;
    orient(br, new THREE.Vector3(Math.cos(a), rng.range(0.5, 1.1), Math.sin(a)), UP);
    const len = rng.range(0.7, 1.6);
    part(br, new THREE.CylinderGeometry(0.025, 0.07, len, 5), m, 0, len / 2, 0);
  }
  return g;
}

export function makeBush(rng, colors = [0x22402a, 0x2b4a2c, 0x1d3a26]) {
  const g = new THREE.Group();
  const m = mat(rng.pick(colors));
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    const r = rng.range(0.35, 0.65);
    const c = part(g, new THREE.IcosahedronGeometry(r, 0), m, rng.range(-0.4, 0.4), r * 0.75, rng.range(-0.4, 0.4));
    c.rotation.set(rng() * 3, rng() * 3, rng() * 3);
  }
  if (rng.chance(0.35)) {
    const berry = mat(0x9a1f2a, { emissive: 0x400808 });
    for (let i = 0; i < 6; i++) {
      part(g, new THREE.IcosahedronGeometry(0.05, 0), berry, rng.range(-0.5, 0.5), rng.range(0.4, 0.9), rng.range(-0.5, 0.5));
    }
  }
  return g;
}

const STONES = [0x6a6862, 0x5f5d58, 0x75726a, 0x55534e];
export function stoneColor(rng, n, out, moss = 0.7) {
  if (n.y > 0.6 && rng() < moss) out.set(rng() < 0.6 ? 0x4c5a33 : 0x5e6a3c);
  else out.set(rng.pick(STONES));
  out.multiplyScalar(rng.range(0.88, 1.08));
}

export function makeRock(rng, size = 1, moss = 0.85) {
  let geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const s1 = rng() * 10, s2 = rng() * 10, s3 = rng() * 10;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const f = 1 + 0.22 * Math.sin(v.x * 3.1 + s1) * Math.cos(v.z * 2.7 + s2) + 0.12 * Math.sin(v.y * 4.3 + s3);
    v.multiplyScalar(f);
    if (v.y < 0) v.y *= 0.35;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.scale(size * rng.range(0.8, 1.3), size * rng.range(0.5, 0.85), size * rng.range(0.8, 1.2));
  geo = paintFaces(geo, (c, n, out) => stoneColor(rng, n, out, moss));
  const m = new THREE.Mesh(geo, vertexColorMat);
  m.castShadow = true;
  m.receiveShadow = true;
  m.rotation.y = rng() * Math.PI * 2;
  return m;
}

export function makeMushrooms(rng) {
  const g = new THREE.Group();
  const capM = new THREE.MeshStandardMaterial({
    color: 0x2fc8b8, emissive: 0x16c4b0, emissiveIntensity: 1.6, flatShading: true, roughness: 0.6,
  });
  const stemM = mat(0xd9d2bd, { emissive: 0x1a3a36 });
  const n = rng.int(3, 6);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, d = rng.range(0, 0.38);
    const h = rng.range(0.12, 0.4), r = rng.range(0.06, 0.15);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    part(g, new THREE.CylinderGeometry(r * 0.3, r * 0.4, h, 5), stemM, x, h / 2, z);
    const cap = part(g, new THREE.SphereGeometry(r, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), capM, x, h, z);
    cap.scale.y = 0.75;
    cap.rotation.set(rng.range(-0.25, 0.25), 0, rng.range(-0.25, 0.25));
  }
  return g;
}

export function makeLog(rng, len = 3) {
  const g = new THREE.Group();
  const l = part(g, new THREE.CylinderGeometry(0.28, 0.32, len, 7), mat(0x3d2b1d), 0, 0.28, 0);
  l.rotation.z = Math.PI / 2;
  const moss = part(g, new THREE.CylinderGeometry(0.29, 0.33, len * 0.6, 7, 1, false, 0, Math.PI * 0.8),
    mat(0x3f5a2a), 0.2, 0.3, 0);
  moss.rotation.set(0, 0, Math.PI / 2);
  const end = part(g, new THREE.CircleGeometry(0.28, 7), mat(0x8a6a44), len / 2 + 0.005, 0.28, 0);
  end.rotation.y = Math.PI / 2;
  g.rotation.y = rng() * Math.PI;
  return g;
}

// ---------------------------------------------------------------------------
// Ruinen, Lager
// ---------------------------------------------------------------------------
export function makePillar(rng, h, broken) {
  const g = new THREE.Group();
  const add = (geo, x, y, z, moss = 0.7) =>
    part(g, paintFaces(geo, (c, n, out) => stoneColor(rng, n, out, moss)), vertexColorMat, x, y, z);
  add(new THREE.BoxGeometry(1.0, 0.3, 1.0), 0, 0.15, 0);
  add(new THREE.CylinderGeometry(0.34, 0.4, h, 8), 0, 0.3 + h / 2, 0, 0.4);
  if (!broken) {
    add(new THREE.BoxGeometry(0.9, 0.25, 0.9), 0, 0.3 + h + 0.125, 0);
  } else {
    const chunk = add(new THREE.CylinderGeometry(0.3, 0.34, 0.45, 8), 0.1, 0.3 + h + 0.12, 0.05);
    chunk.rotation.set(0.3, 0, 0.35);
  }
  return g;
}

export function makeWall(rng, len, maxH) {
  const g = new THREE.Group();
  const bw = 0.62, bh = 0.34, depth = 0.55;
  const cols = Math.round(len / bw);
  for (let c = 0; c < cols; c++) {
    const colH = Math.max(1, Math.round((maxH / bh) * (0.3 + 0.7 * Math.abs(Math.sin(c * 0.8 + rng() * 0.7)))));
    for (let r = 0; r < colH; r++) {
      const off = (r % 2) * bw * 0.5;
      if (c === cols - 1 && off) continue;
      if (rng() < 0.05) continue;
      let geo = new THREE.BoxGeometry(bw * rng.range(0.92, 0.98), bh * 0.94, depth * rng.range(0.9, 1));
      geo = paintFaces(geo, (cc, n, out) => stoneColor(rng, n, out, r === colH - 1 ? 0.8 : 0.15));
      const m = part(g, geo, vertexColorMat, c * bw + off - len / 2, bh / 2 + r * bh, rng.range(-0.03, 0.03));
      m.rotation.y = rng.range(-0.04, 0.04);
    }
  }
  return g;
}

export function makePlatform(rng) {
  const g = new THREE.Group();
  const add = (geo, y, moss) =>
    part(g, paintFaces(geo, (c, n, out) => stoneColor(rng, n, out, moss)), vertexColorMat, 0, y, 0);
  add(new THREE.CylinderGeometry(2.75, 2.95, 0.3, 18), 0.15, 0.25);
  add(new THREE.CylinderGeometry(2.3, 2.45, 0.18, 18), 0.39, 0.05);
  return g;
}

export function makeTent() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-1.15, 0);
  shape.lineTo(1.15, 0);
  shape.lineTo(0, 1.55);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
  geo.translate(0, 0, -1.2);
  part(g, geo, mat(0x9b8560));
  const s2 = new THREE.Shape();
  s2.moveTo(-0.45, 0);
  s2.lineTo(0.45, 0);
  s2.lineTo(0, 0.95);
  s2.closePath();
  part(g, new THREE.ShapeGeometry(s2), mat(0x1a120c), 0, 0.01, 1.215);
  part(g, new THREE.CylinderGeometry(0.035, 0.035, 1.8, 5), mat(0x4a3424), 0, 0.85, 1.27);
  return g;
}

export function makeCrate(rng) {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.7, 0.6, 0.7), mat(0x6a4a2c), 0, 0.3, 0);
  for (const y of [0.08, 0.52]) part(g, new THREE.BoxGeometry(0.74, 0.08, 0.74), mat(0x3d2a18), 0, y, 0);
  g.rotation.y = rng() * Math.PI;
  return g;
}
