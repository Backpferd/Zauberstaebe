import * as THREE from 'three';
import { PATHS } from './world.js';

// Platziert HTML-Elemente (Lebensbalken, Schadenszahlen, Beute-Schilder …)
// an 3D-Positionen der Szene.
export function buildWorldUI(ctx) {
  const { camera, W, H, layout, heightAt } = ctx;
  const root = document.getElementById('world-ui');
  const project = (v) => {
    const p = v.clone().project(camera);
    return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };
  };
  const el = (cls, html, pos, dx = 0, dy = 0) => {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    d.style.left = `${pos.x + dx}px`;
    d.style.top = `${pos.y + dy}px`;
    root.appendChild(d);
    return d;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // Lebensbalken der normalen Warge
  for (const w of layout.wargs) {
    const top = w.obj.localToWorld(V(0, w.pose === 'lunge' ? 2.0 : 1.85, 0.3));
    const p = project(top);
    el(`ehp${w.frozen ? ' frozen' : ''}`, `<i style="width:${Math.round(w.hp * 100)}%"></i>`, p);
    if (w.frozen) el('status', 'Eingefroren', p, 0, -8);
  }

  // Schadenszahlen am getroffenen Warg
  const hit = layout.wargs[0].obj.localToWorld(V(0, 2.2, 0.6));
  const hp = project(hit);
  el('dmg crit', '412<small>KRITISCH</small>', hp, 34, -66);
  el('dmg burn', '57', hp, 98, -12);
  el('dmg', '138', project(layout.wargs[2].obj.localToWorld(V(0, 2.1, 0))), 52, -30);

  // Beute
  const labels = {};
  for (const l of layout.loot) {
    const y = heightAt(l.x, l.z) + 0.25;
    labels[l.id] = el(`loot ${l.cls}`, l.name, project(V(l.x, y, l.z)), l.dx ?? 0, (l.dy ?? 0) - 6);
  }

  // NPC mit Quest
  const hunter = layout.camp.hunter;
  const hy = heightAt(hunter.x, hunter.z);
  el('qmark', '!', project(V(hunter.x, hy + 2.75, hunter.z)));
  el('npcname', 'Jäger Rodrik', project(V(hunter.x, hy + 2.05, hunter.z)), 0, -6);

  // Tooltip neben dem seltenen Stab
  const rare = labels.rare.getBoundingClientRect();
  const tt = document.getElementById('tooltip');
  tt.style.display = 'block';
  const th = tt.offsetHeight;
  const left = Math.min(W - tt.offsetWidth - 16, rare.right + 16);
  const top = Math.max(300, Math.min(H - 210 - th, rare.top - th * 0.62));
  tt.style.left = `${left}px`;
  tt.style.top = `${top}px`;
  const cur = document.getElementById('cursor');
  cur.style.display = 'block';
  cur.style.left = `${rare.right - 44}px`;
  cur.style.top = `${rare.top + 12}px`;

  buildMinimap(ctx);
}

function buildMinimap(ctx) {
  const { layout } = ctx;
  const P = layout.player;
  const S = 3.3; // Pixel pro Meter
  const m = (x, z) => [((x - P.x) * S).toFixed(1), ((z - P.z) * S).toFixed(1)];
  const path = (pts) => `M${pts.map(([x, z]) => m(x, z).join(' ')).join(' L')}`;
  const dot = (x, z, r, fill, extra = '') => {
    const [cx, cy] = m(x, z);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
  };
  const [wx, wz] = m(layout.waypoint.x, layout.waypoint.z);
  const [fx, fz] = m(layout.camp.fire.x, layout.camp.fire.z);
  const [ex, ez] = m(layout.elite.x, layout.elite.z);
  const [lx, lz] = m(layout.loot[0].x, layout.loot[0].z);
  const [hx, hz] = m(layout.camp.hunter.x, layout.camp.hunter.z);
  const svg = `
<svg viewBox="-118 -118 236 236" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="mmclip"><circle r="104"/></clipPath>
    <radialGradient id="mmbg"><stop offset="0" stop-color="#1a2618"/><stop offset="1" stop-color="#080d08"/></radialGradient>
    <radialGradient id="mmfade"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
  </defs>
  <circle r="116" fill="#1c150e"/>
  <circle r="112" fill="none" stroke="#8a6a3a" stroke-width="3"/>
  <circle r="106" fill="none" stroke="#2a2016" stroke-width="4"/>
  <g clip-path="url(#mmclip)">
    <circle r="104" fill="url(#mmbg)" opacity=".94"/>
    <ellipse cx="${m(0.6, -0.8)[0]}" cy="${m(0.6, -0.8)[1]}" rx="${12.5 * S}" ry="${8.2 * S}" fill="#4a6438" opacity=".95" stroke="#6f8a52" stroke-width="1.5"/>
    ${PATHS.map((p) => `<path d="${path(p)}" fill="none" stroke="#8a7350" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`).join('')}
    <circle cx="${wx}" cy="${wz}" r="10" fill="#0b2a33" stroke="#5fe0ff" stroke-width="2.5"/>
    <circle cx="${wx}" cy="${wz}" r="4" fill="#9ff4ff"/>
    <circle cx="${fx}" cy="${fz}" r="5" fill="#ff9a3a"/>
    <text x="${hx}" y="${Number(hz) - 7}" font-family="Cinzel" font-weight="700" font-size="16" fill="#ffd23a" text-anchor="middle">!</text>
    ${layout.wargs.map((w) => dot(w.x, w.z, 4, '#e0402f', 'stroke="#000" stroke-width="1"')).join('')}
    <path d="M${ex} ${Number(ez) - 8} l7 7 l-7 7 l-7 -7 z" fill="#ff9a2a" stroke="#000" stroke-width="1.2"/>
    <path d="M${lx} ${Number(lz) - 5} l5 5 l-5 5 l-5 -5 z" fill="#ffde5a" stroke="#000" stroke-width="1"/>
    <circle r="104" fill="url(#mmfade)"/>
  </g>
  <path d="M-7 6 L0 -9 L7 6 L0 2 Z" fill="#fff" stroke="#000" stroke-width="1.2" transform="rotate(${(Math.atan2(layout.wargs[0].z - P.z, layout.wargs[0].x - P.x) * 180) / Math.PI + 90})"/>
  <text x="0" y="-100" font-family="Cinzel" font-weight="700" font-size="14" fill="#e8dcc2" text-anchor="middle">N</text>
</svg>`;
  document.getElementById('minimap').innerHTML = svg;
}
