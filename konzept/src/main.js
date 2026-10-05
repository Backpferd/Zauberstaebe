import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { makeRng, makeNoise2D } from './util.js';
import {
  makeDotTexture, makeGlowTexture, makeRingTexture, makeBeamTexture, makeRuneCircleTexture,
} from './textures.js';
import { makeHumanoid, makeWarg, makeWandMesh, mat, part } from './models.js';
import {
  ParticleLayer, glowSprite, groundDecal, fireball, explosion, frostNova, aura, lootBeam, fireflies,
  campfireFx, waypointFx,
} from './effects.js';
import { buildWorld } from './world.js';
import { buildWorldUI } from './ui.js';

const W = 1920, H = 1080;
const params = new URLSearchParams(location.search);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// --- Szenenaufbau (alle Positionen in Metern, x = rechts, z = zur Kamera) ---
const layout = {
  player: { x: -3.0, z: 1.0 },
  wargs: [
    { x: 1.8, z: -0.5, pose: 'lunge', hp: 0.28 },
    { x: 2.7, z: 3.0, pose: 'run', hp: 1.0 },
    { x: 3.0, z: -4.6, pose: 'prowl', hp: 0.55, frozen: true },
  ],
  elite: { x: 6.5, z: -3.1 },
  dead: { x: 4.9, z: 4.3 },
  loot: [
    { id: 'rare', x: 5.7, z: 3.7, cls: 'rare', name: 'Glutdorn · Eichenstab' },
    { id: 'core', x: 3.9, z: 5.0, cls: 'core', name: 'Wargzahn' },
    { id: 'gold', x: 5.5, z: 5.5, cls: 'gold', name: '37 Gold' },
    { id: 'magic', x: 2.2, z: 5.9, cls: 'magic', name: 'Glühender Birkenstab' },
  ],
  waypoint: { x: -8.0, z: -4.8 },
  camp: {
    fire: { x: -7.2, z: 3.0 },
    hunter: { x: -8.2, z: 2.0 },
    tent: { x: -10.4, z: 1.0, rot: 1.1 },
    crates: [[-9.4, 4.2], [-10.1, 3.5]],
  },
  logs: [[-4.6, -6.9, 0.25], [12.2, 1.6, 1.3]],
  mushrooms: [[-6.3, -7.1], [-12.4, -2.6], [10.6, -6.4], [12.4, 3.8], [-3.0, -8.0], [-11.0, -7.6], [1.2, -8.3]],
};
layout.blocked = [
  { x: layout.waypoint.x, z: layout.waypoint.z, r: 4.7 },
  { x: -8.7, z: 2.4, r: 3.3 },
  { x: layout.camp.tent.x, z: layout.camp.tent.z, r: 1.8 },
  { x: layout.player.x, z: layout.player.z, r: 1.0 },
  ...layout.wargs.map((w) => ({ x: w.x, z: w.z, r: 1.3 })),
  { x: layout.elite.x, z: layout.elite.z, r: 2.2 },
  { x: 4.6, z: 4.8, r: 2.6 },
];

async function main() {
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = Number(params.get('exposure') ?? 1.3);

  const scene = new THREE.Scene();
  const fogCol = new THREE.Color(0x0e1a20);
  scene.background = fogCol;
  scene.fog = new THREE.FogExp2(fogCol, 0.021);

  const camera = new THREE.PerspectiveCamera(36, W / H, 0.5, 250);
  const target = V(0.7, 0, 0.3);
  camera.position.copy(target).add(V(0, 17.5, 12.5));
  camera.lookAt(target);
  camera.updateMatrixWorld();

  const hemi = new THREE.HemisphereLight(0x5f74a0, 0x221a12, 1.25);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xaec0ff, 2.1);
  moon.position.copy(target).add(V(-10, 24, 9));
  moon.target.position.copy(target);
  moon.castShadow = true;
  moon.shadow.mapSize.set(4096, 4096);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 26, bottom: -26, near: 1, far: 80 });
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target);

  const rng = makeRng(7);
  const ctx = { scene, rng, noise: makeNoise2D(11), layout, camera, W, H };
  buildWorld(ctx);
  const { heightAt } = ctx;

  // --- Partikel-Layer und Texturen ---
  const tex = {
    dot: makeDotTexture(), glow: makeGlowTexture(), ring: makeRingTexture(), beam: makeBeamTexture(),
    rune: makeRuneCircleTexture(makeRng(3)),
  };
  const add = new ParticleLayer(tex.dot, 8000, THREE.AdditiveBlending);
  const smoke = new ParticleLayer(tex.dot, 2000, THREE.NormalBlending);
  scene.add(smoke.points, add.points);
  const fx = { scene, add, smoke, tex, rng: makeRng(99) };

  // --- Spieler ---
  const P = layout.player;
  const aim = V(layout.wargs[0].x - P.x, 0, layout.wargs[0].z - P.z).normalize();
  const wizard = makeHumanoid();
  wizard.position.set(P.x, heightAt(P.x, P.z), P.z);
  wizard.rotation.y = Math.atan2(aim.x, aim.z);
  wizard.scale.setScalar(1.1);
  scene.add(wizard);
  const playerLight = new THREE.PointLight(0xffd8a8, 14, 10, 1.6);
  playerLight.position.set(P.x + 0.4, heightAt(P.x, P.z) + 3.4, P.z + 0.8);
  scene.add(playerLight);

  // --- Normale Warge ---
  for (const w of layout.wargs) {
    const o = { pose: w.pose, furMat: mat(0x4a4642), darkMat: mat(0x2a2724), bellyMat: mat(0x67605a) };
    if (w.frozen) {
      const ice = (c, e) => new THREE.MeshStandardMaterial({
        color: c, emissive: e, emissiveIntensity: 0.55, flatShading: true, roughness: 0.3, metalness: 0.05,
      });
      o.furMat = ice(0x9fd6ee, 0x1f6c9c);
      o.darkMat = ice(0x6aa6c8, 0x164f78);
      o.bellyMat = ice(0xc8ecf8, 0x2a7aa8);
      o.eyeColor = new THREE.Color(0.8, 1.6, 2.0);
      o.jaw = 0.25;
    }
    if (w.pose === 'lunge') {
      o.furMat = new THREE.MeshStandardMaterial({
        color: 0x46423e, flatShading: true, roughness: 0.85, emissive: 0xff4a10, emissiveIntensity: 0.3,
      });
    }
    const m = makeWarg(o);
    const d = V(P.x - w.x, 0, P.z - w.z).normalize();
    m.position.set(w.x, heightAt(w.x, w.z), w.z);
    m.rotation.y = Math.atan2(d.x, d.z) + (w.frozen ? 0.25 : 0);
    scene.add(m);
    w.obj = m;
  }
  scene.updateMatrixWorld(true);

  // --- Elite-Warg ---
  const E = layout.elite;
  const elite = makeWarg({
    pose: 'stand', furMat: mat(0x2b2521), darkMat: mat(0x1a1614), bellyMat: mat(0x3a332e),
    spikeMat: mat(0xd8ccb0), spikeScale: 1.7, eyeColor: new THREE.Color(9, 3.6, 0.4), jaw: 0.55, headPitch: -0.15,
  });
  elite.scale.setScalar(1.5);
  const ed = V(P.x - E.x, 0, P.z - E.z).normalize();
  elite.position.set(E.x, heightAt(E.x, E.z), E.z);
  elite.rotation.y = Math.atan2(ed.x, ed.z);
  scene.add(elite);
  aura(fx, V(E.x, heightAt(E.x, E.z), E.z), 2.0);

  // --- Toter Warg mit Beute ---
  const D = layout.dead;
  const dead = makeWarg({ pose: 'stand', furMat: mat(0x34302b), eyeColor: new THREE.Color(0.05, 0.02, 0.02), jaw: 0.7 });
  dead.rotation.set(0, 2.3, Math.PI / 2);
  dead.position.set(D.x, heightAt(D.x, D.z) + 0.4, D.z);
  scene.add(dead);
  const blood = groundDecal(tex.glow, new THREE.Color(0x2a0303), 2.6, 0.7, THREE.NormalBlending);
  blood.position.set(D.x - 0.3, heightAt(D.x, D.z) + 0.04, D.z + 0.2);
  scene.add(blood);

  const lootPos = (id) => {
    const l = layout.loot.find((x) => x.id === id);
    return V(l.x, heightAt(l.x, l.z), l.z);
  };
  {
    const p = lootPos('rare');
    const w = makeWandMesh({ scale: 1.5, wood: 0x7a5230, tip: new THREE.Color(4, 1.6, 0.3) });
    w.rotation.set(0, 0.6, Math.PI / 2);
    w.position.set(p.x - 0.4, p.y + 0.06, p.z);
    scene.add(w);
    lootBeam(fx, p, new THREE.Color(3.0, 2.2, 0.7));
  }
  {
    const p = lootPos('magic');
    const w = makeWandMesh({ scale: 1.4, wood: 0xddd6c4, tip: new THREE.Color(0.6, 0.9, 4.0) });
    w.rotation.set(0, -0.4, Math.PI / 2);
    w.position.set(p.x - 0.4, p.y + 0.06, p.z);
    scene.add(w);
    const dcl = groundDecal(tex.glow, new THREE.Color(0.3, 0.4, 1.6), 1.6, 0.8);
    dcl.position.set(p.x, p.y + 0.05, p.z);
    scene.add(dcl);
  }
  {
    const p = lootPos('core');
    const fang = part(scene, new THREE.ConeGeometry(0.07, 0.36, 6), mat(0xe8e0c8));
    fang.rotation.set(0, 0.4, Math.PI / 2 - 0.2);
    fang.position.set(p.x, p.y + 0.08, p.z);
    const dcl = groundDecal(tex.glow, new THREE.Color(1.6, 0.8, 0.2), 1.3, 0.7);
    dcl.position.set(p.x, p.y + 0.05, p.z);
    scene.add(dcl);
  }
  {
    const p = lootPos('gold');
    const coinM = mat(0xe8b830, { metalness: 0.9, roughness: 0.3, emissive: 0x3a2400 });
    const r2 = makeRng(5);
    for (let i = 0; i < 9; i++) {
      const c = part(scene, new THREE.CylinderGeometry(0.075, 0.075, 0.022, 10), coinM);
      c.position.set(p.x + r2.range(-0.25, 0.25), p.y + 0.03 + (i % 3) * 0.022, p.z + r2.range(-0.2, 0.2));
      c.rotation.set(r2.range(-0.3, 0.3), 0, r2.range(-0.3, 0.3));
    }
  }

  // --- Zauber: Mehrfachgeschoss-Feuerball (3 Geschosse) ---
  scene.updateMatrixWorld(true);
  const tip = wizard.userData.wandTip.getWorldPosition(V());
  const w1 = layout.wargs[0].obj;
  const impact = w1.localToWorld(V(0, 1.0, 0.7));
  const base = impact.clone().sub(tip);
  base.y = 0;
  const dist = base.length();
  base.normalize();
  for (const ang of [0.3, -0.3]) {
    const dir = base.clone().applyAxisAngle(V(0, 1, 0), ang);
    const to = tip.clone().addScaledVector(dir, dist * 0.98);
    to.y = tip.y + 0.05;
    fireball(fx, tip, to, { trail: dist * 0.78 });
  }
  explosion(fx, impact, 0.8);
  // Reste des mittleren Geschoss-Schweifs
  {
    const p = V();
    for (let i = 0; i < 70; i++) {
      const t = fx.rng();
      p.lerpVectors(tip, impact, 0.25 + t * 0.6).add(V(fx.rng.range(-0.1, 0.1), fx.rng.range(-0.05, 0.15), fx.rng.range(-0.1, 0.1)));
      add.add(p, new THREE.Color(2.6, 0.7, 0.1), fx.rng.range(0.08, 0.25), 0.25 + t * 0.35);
    }
  }
  // Leuchten an der Stabspitze
  const tipGlow = glowSprite(tex.glow, new THREE.Color(2.4, 0.9, 0.2), 0.9);
  tipGlow.position.copy(tip);
  scene.add(tipGlow);
  const tipLight = new THREE.PointLight(0xffa050, 5, 4, 1.6);
  tipLight.position.copy(tip);
  scene.add(tipLight);

  // --- Frostnova am hinteren Warg ---
  const w3 = layout.wargs[2];
  frostNova(fx, V(w3.x, heightAt(w3.x, w3.z), w3.z), 1.7);

  // --- Lager mit Jäger ---
  const cf = layout.camp.fire;
  campfireFx(fx, V(cf.x, heightAt(cf.x, cf.z), cf.z));
  const hu = layout.camp.hunter;
  const hunter = makeHumanoid({
    robe: 0x4a4528, robeDark: 0x3a2e1e, trim: 0x8a7a50, scarf: 0x5a3a22, hat: 'hood', wand: false,
    wandArm: V(0.15, -0.9, 0.45), freeArm: V(0.35, -0.85, 0.35),
  });
  const hd = V(cf.x - hu.x, 0, cf.z - hu.z).normalize();
  hunter.position.set(hu.x, heightAt(hu.x, hu.z), hu.z);
  hunter.rotation.y = Math.atan2(hd.x, hd.z) - 0.5;
  scene.add(hunter);

  // --- Wegpunkt ---
  waypointFx(fx, layout.waypoint, ctx.waypointTop);

  // --- Glühwürmchen ---
  fireflies(fx, 70, (p) => {
    let x, z;
    do {
      x = fx.rng.range(-15, 17);
      z = fx.rng.range(-11, 7);
    } while (ctx.ellipse(x, z) < 0.55 && fx.rng() < 0.7);
    p.set(x, heightAt(x, z) + fx.rng.range(0.4, 2.8), z);
  });

  // Weiche Kontaktschatten, damit die Figuren am Boden "stehen"
  const blob = (x, z, size, op = 0.55) => {
    const d = groundDecal(tex.glow, new THREE.Color(0, 0, 0), size, op, THREE.NormalBlending);
    d.position.set(x, heightAt(x, z) + 0.03, z);
    scene.add(d);
  };
  blob(P.x, P.z, 2.0);
  for (const w of layout.wargs) blob(w.x, w.z, w.pose === 'lunge' ? 2.0 : 2.6, w.pose === 'lunge' ? 0.35 : 0.55);
  blob(E.x, E.z, 4.2, 0.6);
  blob(hu.x, hu.z, 1.8);

  add.finish();
  smoke.finish();

  // Effekte (transparent) auf Ebene 1: sichtbar für die Kamera, aber nicht im AO-Pass
  scene.traverse((o) => {
    if (o.isSprite || o.isPoints || (o.isMesh && o.material && o.material.transparent)) o.layers.set(1);
  });
  if (params.get('fx') !== '0') camera.layers.enable(1);
  if (params.get('lights') === '0') scene.traverse((o) => { if (o.isPointLight) o.visible = false; });

  // --- Nachbearbeitung ---
  const dpr = window.devicePixelRatio;
  const rt = new THREE.WebGLRenderTarget(W * dpr, H * dpr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (params.get('ao') !== '0') {
    const aoCamera = camera.clone();
    aoCamera.layers.set(0);
    const ao = new GTAOPass(scene, aoCamera, W * dpr, H * dpr);
    ao.output = GTAOPass.OUTPUT.Default;
    ao.blendIntensity = 0.85;
    ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1, thickness: 1, scale: 1 });
    composer.addPass(ao);
  }
  // HDR-Spitzen begrenzen, sonst "explodiert" der Bloom bei vielen überlagerten Partikeln
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uMax: { value: Number(params.get('clamp') ?? 2.5) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float m = max(max(c.r, c.g), c.b);
        if (m > uMax) c.rgb *= uMax / m;
        gl_FragColor = c;
      }`,
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W * dpr, H * dpr),
    Number(params.get('bs') ?? 0.5), Number(params.get('br') ?? 0.4), Number(params.get('bt') ?? 0.92));
  if (params.get('bloom') !== '0') composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const pxScale = (H * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  add.material.uniforms.uScale.value = pxScale;
  smoke.material.uniforms.uScale.value = pxScale;

  await document.fonts.ready;
  buildWorldUI(ctx);
  composer.render();
  window.__stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  window.__ready = true;
}

main().catch((e) => {
  console.error(e);
  window.__error = String(e && e.stack || e);
});
