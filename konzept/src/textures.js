import * as THREE from 'three';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Weicher Punkt für Partikel.
export const makeDotTexture = () => canvasTexture(128, 128, (g, s) => {
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
});

// Breiter Schein für Leucht-Sprites und Bodenlicht.
export const makeGlowTexture = () => canvasTexture(256, 256, (g, s) => {
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.12, 'rgba(255,255,255,0.7)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.22)');
  grd.addColorStop(0.7, 'rgba(255,255,255,0.05)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
});

// Weicher Ring (Aura am Boden).
export const makeRingTexture = () => canvasTexture(512, 512, (g, s) => {
  const c = s / 2;
  const grd = g.createRadialGradient(c, c, c * 0.55, c, c, c);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.15)');
  grd.addColorStop(0.78, 'rgba(255,255,255,1)');
  grd.addColorStop(0.86, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  g.translate(c, c);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 6;
  for (let i = 0; i < 12; i++) {
    g.rotate(Math.PI / 6);
    g.beginPath();
    g.moveTo(0, -c * 0.62);
    g.lineTo(-14, -c * 0.7);
    g.lineTo(0, -c * 0.66);
    g.lineTo(14, -c * 0.7);
    g.closePath();
    g.stroke();
  }
});

// Senkrechter Verlauf für Lichtsäulen (oben transparent).
export const makeBeamTexture = () => canvasTexture(32, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.25)');
  grd.addColorStop(0.9, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
});

function drawGlyph(g, rng, s = 1) {
  g.lineWidth = 7 * s;
  g.beginPath();
  const h = 42 * s;
  g.moveTo(0, -h);
  g.lineTo(0, h);
  const k = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < k; i++) {
    const y0 = (rng() * 2 - 1) * h * 0.8;
    const dir = rng() < 0.5 ? -1 : 1;
    const len = (16 + rng() * 18) * s;
    const t = rng();
    g.moveTo(0, y0);
    if (t < 0.4) g.lineTo(dir * len, y0 - len * 0.8);
    else if (t < 0.7) g.lineTo(dir * len, y0 + len * 0.8);
    else { g.lineTo(dir * len, y0); g.lineTo(dir * len, y0 + len * 0.6); }
  }
  g.stroke();
}

// Runenkreis für den Wegpunkt.
export const makeRuneCircleTexture = (rng) => canvasTexture(1024, 1024, (g, s) => {
  const c = s / 2;
  g.translate(c, c);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(492, 10); ring(462, 4); ring(330, 7); ring(302, 3); ring(150, 6); ring(60, 4);
  for (let i = 0; i < 24; i++) {
    g.save(); g.rotate((i / 24) * Math.PI * 2); g.translate(0, -396); drawGlyph(g, rng); g.restore();
  }
  for (let i = 0; i < 120; i++) {
    g.save(); g.rotate((i / 120) * Math.PI * 2);
    g.lineWidth = i % 5 ? 2 : 5;
    g.beginPath(); g.moveTo(0, -462); g.lineTo(0, i % 5 ? -474 : -488); g.stroke();
    g.restore();
  }
  g.lineWidth = 5;
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2 + k * Math.PI / 3 - Math.PI / 2;
      const x = Math.cos(a) * 300, y = Math.sin(a) * 300;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i / 8) * Math.PI * 2 + 0.2); g.translate(0, -226); drawGlyph(g, rng, 0.7); g.restore();
  }
});
