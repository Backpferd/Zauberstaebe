import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya/latin-700.css';
import './style.css';

import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  FogExp2,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

/**
 * Bewusst minimale Testszene: Boden, ein Licht, eine Schleife.
 * Der Engine-Kern (Aufgabe 0.3) ersetzt diese Datei durch Spielschleife,
 * Renderer-Modul und Kamera aus `src/engine/`.
 */

const leinwand = document.getElementById('spiel');
if (!(leinwand instanceof HTMLCanvasElement)) {
  throw new Error('Das Canvas-Element #spiel fehlt in index.html.');
}

const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const szene = new Scene();
const nebelFarbe = new Color(0x0e1a20);
szene.background = nebelFarbe;
szene.fog = new FogExp2(nebelFarbe, 0.012);

// Kamera wie in der Konzeptszene: schräg von oben, Blickwinkel 36 Grad.
const ziel = new Vector3(0, 0, 0);
const kamera = new PerspectiveCamera(36, 1, 0.5, 250);
kamera.position.copy(ziel).add(new Vector3(0, 17.5, 12.5));
kamera.lookAt(ziel);

// Licht: schwaches Himmelslicht plus Mondlicht als Richtungslicht.
szene.add(new HemisphereLight(0x5f74a0, 0x221a12, 1.25));
const mond = new DirectionalLight(0xaec0ff, 2.1);
mond.position.copy(ziel).add(new Vector3(-10, 24, 9));
mond.target.position.copy(ziel);
szene.add(mond, mond.target);

// Boden: eine einfache Fläche, noch ohne Gelände.
const boden = new Mesh(
  new PlaneGeometry(200, 200),
  new MeshStandardMaterial({ color: 0x5a7a48, roughness: 1 }),
);
boden.rotation.x = -Math.PI / 2;
szene.add(boden);

// Raster nur zur Orientierung in der Testszene (1 Feld = 1 Meter).
const raster = new GridHelper(60, 60, 0x9fbf86, 0x3d5530);
raster.position.y = 0.01;
szene.add(raster);

function anFensterAnpassen(): void {
  const breite = window.innerWidth;
  const hoehe = window.innerHeight;
  renderer.setSize(breite, hoehe, false);
  kamera.aspect = breite / hoehe;
  kamera.updateProjectionMatrix();
}
window.addEventListener('resize', anFensterAnpassen);
anFensterAnpassen();

function schleife(): void {
  renderer.render(szene, kamera);
  // Marker für Browsertests: mindestens ein Bild wurde gezeichnet.
  document.body.dataset['bereit'] = 'true';
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
