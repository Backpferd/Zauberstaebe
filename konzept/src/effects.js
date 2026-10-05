import * as THREE from 'three';
import { part, orient } from './models.js';

// ---------------------------------------------------------------------------
// Partikel: ein Punktwolken-Layer mit Größe/Farbe/Alpha pro Punkt (HDR-Farben
// > 1 erzeugen über den Bloom-Pass ein Leuchten).
// ---------------------------------------------------------------------------
const VS = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const FS = /* glsl */`
  uniform sampler2D map;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 t = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);
  }`;

export class ParticleLayer {
  constructor(texture, max = 6000, blending = THREE.AdditiveBlending) {
    this.n = 0;
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, uScale: { value: 800 } },
      vertexShader: VS,
      fragmentShader: FS,
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }
  add(p, c, size, alpha = 1) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.size[i] = size;
    this.alpha[i] = alpha;
  }
  finish() {
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'aColor', 'aSize', 'aAlpha']) this.geo.attributes[k].needsUpdate = true;
  }
}

export function glowSprite(tex, color, scale, opacity = 1) {
  const m = new THREE.SpriteMaterial({
    map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  return s;
}

export function groundDecal(tex, color, size, opacity = 1, blending = THREE.AdditiveBlending) {
  const m = new THREE.MeshBasicMaterial({
    map: tex, color, transparent: true, opacity, blending, depthWrite: false, fog: false,
    polygonOffset: true, polygonOffsetFactor: -4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 2;
  return mesh;
}

const V = () => new THREE.Vector3();
const C = (r, g, b) => new THREE.Color(r, g, b);

function randomOnSphere(rng, out) {
  const u = rng() * 2 - 1, a = rng() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return out.set(Math.cos(a) * s, u, Math.sin(a) * s);
}

// ---------------------------------------------------------------------------
// Feuerball im Flug mit Schweif
// ---------------------------------------------------------------------------
export function fireball(fx, from, to, { trail = 3.4, scale = 1 } = {}) {
  const { scene, add, smoke, tex, rng } = fx;
  const dir = to.clone().sub(from).normalize();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 * scale, 2),
    new THREE.MeshBasicMaterial({ color: C(6, 3, 0.8) }));
  core.position.copy(to);
  scene.add(core);
  const s1 = glowSprite(tex.glow, C(3.5, 1.3, 0.3), 1.3 * scale);
  s1.position.copy(to);
  scene.add(s1);
  const s2 = glowSprite(tex.glow, C(1.6, 0.42, 0.06), 3.4 * scale, 0.7);
  s2.position.copy(to);
  scene.add(s2);
  const L = new THREE.PointLight(0xff8a3a, 10, 8, 1.6);
  L.position.copy(to);
  scene.add(L);

  const side = V().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = V().crossVectors(side, dir).normalize();
  const p = V(), c = new THREE.Color();
  const hot = C(5, 2.2, 0.5), mid = C(3.0, 0.8, 0.1), cold = C(0.9, 0.18, 0.03);
  for (let i = 0; i < 220; i++) {
    const t = Math.pow(rng(), 1.6);
    const spread = 0.04 + t * 0.34;
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * spread;
    p.copy(to).addScaledVector(dir, -t * trail)
      .addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r * 0.8);
    if (t < 0.5) c.copy(hot).lerp(mid, t * 2); else c.copy(mid).lerp(cold, (t - 0.5) * 2);
    add.add(p, c, (0.66 * (1 - t) + 0.1) * scale * rng.range(0.7, 1.2), Math.pow(1 - t, 1.2) * 0.9);
  }
  for (let i = 0; i < 50; i++) {
    const t = rng.range(0.3, 1.0);
    const a = rng() * Math.PI * 2, r = rng.range(0.1, 0.45) * t;
    p.copy(to).addScaledVector(dir, -t * trail * 1.05)
      .addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r + t * 0.25);
    smoke.add(p, C(0.05, 0.045, 0.04), rng.range(0.35, 0.8), (1 - t) * 0.4);
  }
  for (let i = 0; i < 30; i++) {
    const t = rng.range(0, 0.8);
    p.copy(to).addScaledVector(dir, -t * trail).add(randomOnSphere(rng, V()).multiplyScalar(rng.range(0.2, 0.6)));
    add.add(p, C(8, 4, 1), rng.range(0.04, 0.09), 1);
  }
}

// ---------------------------------------------------------------------------
// Einschlag (Explosion)
// ---------------------------------------------------------------------------
export function explosion(fx, at, scale = 1) {
  const { scene, add, smoke, tex, rng } = fx;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * scale, 2), new THREE.MeshBasicMaterial({
    color: C(5, 2.2, 0.5), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.position.copy(at);
  scene.add(core);
  const g1 = glowSprite(tex.glow, C(3, 1.1, 0.2), 2.6 * scale);
  g1.position.copy(at);
  scene.add(g1);
  const g2 = glowSprite(tex.glow, C(0.6, 0.18, 0.03), 4.6 * scale, 0.5);
  g2.position.copy(at);
  scene.add(g2);
  const L = new THREE.PointLight(0xff7020, 18, 7, 1.6);
  L.position.copy(at).add(new THREE.Vector3(0, 0.4, 0));
  scene.add(L);
  const p = V(), d = V(), c = new THREE.Color();
  for (let i = 0; i < 120; i++) {
    randomOnSphere(rng, d);
    d.y = Math.abs(d.y) * 0.8 + 0.1;
    d.normalize();
    const r = rng.range(0.35, 2.0) * scale;
    p.copy(at).addScaledVector(d, r);
    c.copy(C(8, 4, 1)).lerp(C(3, 0.7, 0.1), r / 2.0);
    add.add(p, c, rng.range(0.05, 0.13), 1);
  }
  for (let i = 0; i < 40; i++) {
    randomOnSphere(rng, d);
    p.copy(at).addScaledVector(d, rng.range(0, 0.65) * scale);
    add.add(p, C(4.5, 1.5, 0.25), rng.range(0.5, 1.0) * scale, 0.55);
  }
  for (let i = 0; i < 30; i++) {
    randomOnSphere(rng, d);
    d.y = Math.abs(d.y);
    p.copy(at).addScaledVector(d, rng.range(0.5, 1.2) * scale).add(new THREE.Vector3(0, 0.4, 0));
    smoke.add(p, C(0.04, 0.035, 0.03), rng.range(0.6, 1.2) * scale, 0.35);
  }
}

// ---------------------------------------------------------------------------
// Frostnova: Eiskristalle + Frost am Boden
// ---------------------------------------------------------------------------
export function frostNova(fx, at, radius = 1.6) {
  const { scene, add, tex, rng } = fx;
  const iceM = new THREE.MeshStandardMaterial({
    color: 0xbfefff, emissive: 0x4ab8e8, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1,
    transparent: true, opacity: 0.86, flatShading: true,
  });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const r = rng.range(0.55, radius);
    const h = rng.range(0.5, 1.35) * (1.2 - r / radius * 0.5);
    const cr = new THREE.Group();
    cr.position.set(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
    scene.add(cr);
    orient(cr, new THREE.Vector3(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55), new THREE.Vector3(0, 1, 0));
    const m = part(cr, new THREE.OctahedronGeometry(0.2, 0), iceM, 0, h * 0.45, 0);
    m.scale.set(rng.range(0.6, 1), h * 2.6, rng.range(0.6, 1));
  }
  const decal = groundDecal(tex.glow, C(0.5, 1.4, 2.2), radius * 3.2, 0.6);
  decal.position.set(at.x, at.y + 0.06, at.z);
  scene.add(decal);
  const p = V();
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius * 1.3;
    p.set(at.x + Math.cos(a) * r, at.y + rng.range(0.05, 1.6), at.z + Math.sin(a) * r);
    add.add(p, C(1.6, 2.6, 3.2), rng.range(0.04, 0.1), 0.9);
  }
  const L = new THREE.PointLight(0x7fd8ff, 7, 6, 1.6);
  L.position.set(at.x, at.y + 1.2, at.z);
  scene.add(L);
}

// ---------------------------------------------------------------------------
// Aura eines Elite-Gegners
// ---------------------------------------------------------------------------
export function aura(fx, at, radius, color = C(2.8, 0.75, 0.12)) {
  const { scene, add, tex, rng } = fx;
  const ring = groundDecal(tex.ring, color, radius * 2.6, 0.85);
  ring.position.set(at.x, at.y + 0.07, at.z);
  scene.add(ring);
  const inner = groundDecal(tex.glow, color.clone().multiplyScalar(0.25), radius * 2.4, 0.7);
  inner.position.set(at.x, at.y + 0.06, at.z);
  scene.add(inner);
  const p = V();
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, r = radius * rng.range(0.6, 1.15);
    p.set(at.x + Math.cos(a) * r, at.y + Math.pow(rng(), 1.5) * 2.4, at.z + Math.sin(a) * r);
    add.add(p, C(5, 1.6, 0.3), rng.range(0.04, 0.09), rng.range(0.5, 1));
  }
  const L = new THREE.PointLight(0xff6a20, 8, 7, 1.6);
  L.position.set(at.x, at.y + 0.8, at.z);
  scene.add(L);
}

// ---------------------------------------------------------------------------
// Lichtsäule über wertvoller Beute
// ---------------------------------------------------------------------------
export function lootBeam(fx, at, color, height = 4.2) {
  const { scene, add, tex, rng } = fx;
  const mk = (r0, r1, op) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, height, 20, 1, true),
    new THREE.MeshBasicMaterial({
      map: tex.beam, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
  const outer = mk(0.1, 0.26, 0.35);
  outer.position.set(at.x, at.y + height / 2, at.z);
  scene.add(outer);
  const inner = mk(0.025, 0.06, 0.7);
  inner.position.copy(outer.position);
  scene.add(inner);
  const decal = groundDecal(tex.glow, color.clone().multiplyScalar(0.6), 2.2, 0.9);
  decal.position.set(at.x, at.y + 0.05, at.z);
  scene.add(decal);
  const p = V();
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, r = rng.range(0, 0.28);
    p.set(at.x + Math.cos(a) * r, at.y + Math.pow(rng(), 1.4) * height * 0.6, at.z + Math.sin(a) * r);
    add.add(p, color.clone().multiplyScalar(1.4), rng.range(0.04, 0.08), 0.9);
  }
  const L = new THREE.PointLight(color.clone().multiplyScalar(0.35), 5, 4, 1.5);
  L.position.set(at.x, at.y + 0.6, at.z);
  scene.add(L);
}

// ---------------------------------------------------------------------------
// Glühwürmchen und Funken
// ---------------------------------------------------------------------------
export function fireflies(fx, n, sample) {
  const { add, rng } = fx;
  const p = V();
  for (let i = 0; i < n; i++) {
    sample(p);
    const c = rng() < 0.75 ? C(3.0, 2.6, 0.6) : C(1.2, 2.8, 1.6);
    add.add(p, c, rng.range(0.06, 0.1), 0.95);
    add.add(p, c.clone().multiplyScalar(0.22), rng.range(0.28, 0.42), 0.3);
  }
}

// ---------------------------------------------------------------------------
// Lagerfeuer-Flammen
// ---------------------------------------------------------------------------
export function campfireFx(fx, at) {
  const { scene, add, smoke, tex, rng } = fx;
  const flame = (r, h, col, x, z, op) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.position.set(at.x + x, at.y + 0.15 + h / 2, at.z + z);
    m.rotation.set(rng.range(-0.15, 0.15), rng() * 3, rng.range(-0.15, 0.15));
    scene.add(m);
  };
  flame(0.32, 1.0, C(3.5, 0.9, 0.15), 0, 0, 0.75);
  flame(0.2, 0.75, C(3.6, 1.5, 0.3), 0.08, 0.04, 0.85);
  flame(0.16, 0.6, C(4, 1.4, 0.25), -0.12, -0.06, 0.8);
  flame(0.09, 0.42, C(3.2, 1.6, 0.4), 0.0, 0.02, 0.9);
  const g = glowSprite(tex.glow, C(1.6, 0.55, 0.1), 3.0, 0.8);
  g.position.set(at.x, at.y + 0.6, at.z);
  scene.add(g);
  const p = V();
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, r = rng.range(0, 0.45);
    const y = Math.pow(rng(), 1.8) * 3.2;
    p.set(at.x + Math.cos(a) * r + y * 0.15, at.y + 0.4 + y, at.z + Math.sin(a) * r - y * 0.05);
    add.add(p, C(6, 2.2, 0.4), rng.range(0.03, 0.07), 1 - y / 3.6);
  }
  for (let i = 0; i < 26; i++) {
    const y = rng.range(1.0, 4.0);
    p.set(at.x + rng.range(-0.3, 0.3) + y * 0.25, at.y + y, at.z + rng.range(-0.3, 0.3) - y * 0.1);
    smoke.add(p, C(0.06, 0.06, 0.07), rng.range(0.6, 1.3), 0.22 * (1 - y / 4.5));
  }
  const L = new THREE.PointLight(0xff8a3a, 26, 13, 1.5);
  L.position.set(at.x, at.y + 1.1, at.z);
  L.castShadow = false;
  scene.add(L);
}

// ---------------------------------------------------------------------------
// Wegpunkt mit Runenkreis und schwebendem Kristall
// ---------------------------------------------------------------------------
export function waypointFx(fx, at, platformTop) {
  const { scene, add, tex, rng } = fx;
  const runeM = new THREE.MeshBasicMaterial({
    map: tex.rune, color: C(0.5, 2.8, 3.8), transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4,
  });
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 4.3), runeM);
  rune.rotation.x = -Math.PI / 2;
  rune.position.set(at.x, platformTop + 0.01, at.z);
  rune.renderOrder = 2;
  scene.add(rune);
  const decal = groundDecal(tex.glow, C(0.1, 0.6, 0.9), 6, 0.8);
  decal.position.set(at.x, platformTop + 0.015, at.z);
  scene.add(decal);

  const crystalM = new THREE.MeshStandardMaterial({
    color: 0x9ff4ff, emissive: 0x38d8ff, emissiveIntensity: 3.2, roughness: 0.2, flatShading: true,
  });
  const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), crystalM);
  cr.scale.set(1, 1.9, 1);
  cr.rotation.y = 0.5;
  cr.position.set(at.x, platformTop + 1.35, at.z);
  scene.add(cr);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), crystalM);
    sh.scale.set(1, 1.8, 1);
    sh.position.set(at.x + Math.cos(a) * 0.75, platformTop + 1.15 + i * 0.2, at.z + Math.sin(a) * 0.75);
    scene.add(sh);
  }
  const s = glowSprite(tex.glow, C(0.4, 2.0, 2.8), 3.0, 0.9);
  s.position.copy(cr.position);
  scene.add(s);
  const p = V();
  for (let i = 0; i < 140; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 2.0;
    p.set(at.x + Math.cos(a) * r, platformTop + Math.pow(rng(), 1.6) * 4.2, at.z + Math.sin(a) * r);
    add.add(p, C(0.8, 3.0, 3.8), rng.range(0.04, 0.1), 0.85);
  }
  const L = new THREE.PointLight(0x50d8ff, 16, 11, 1.5);
  L.position.set(at.x, platformTop + 1.6, at.z);
  scene.add(L);
}
