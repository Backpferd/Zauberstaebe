// Erzeugt alle Screenshots für die UI-Stilfindung (Aufgabe 0.5).
//
//   node render.mjs                  alles: Hintergrundplatte (falls sie fehlt) + 12 Oberflächen
//   node render.mjs --neu            Hintergrundplatte auf jeden Fall neu rendern
//   node render.mjs --nur-hintergrund    nur die Hintergrundplatte
//   node render.mjs a-classic        nur eine Variante
//
// Die Hintergrundplatte `hintergrund.png` ist die Konzeptszene aus `konzept/`,
// gerendert ohne deren alte Oberfläche. So liegt jede Stilvariante über dem
// echten Spielbild und nicht über einem Screenshot, in dem die alte UI schon
// eingebrannt ist. `konzept/` selbst wird dabei nicht verändert: Die
// Abhängigkeiten (three.js, Schriften) kommen aus `ui-stile/node_modules`,
// weil der kleine Webserver jede `/node_modules/…`-Anfrage dorthin umlenkt.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uiWurzel = path.dirname(fileURLToPath(import.meta.url));
const projektWurzel = path.dirname(uiWurzel);

const VARIANTEN = ['a-classic', 'b-modern', 'c-wildholz'];
const SZENEN = ['hud', 'inventar', 'schriftrolle', 'wegweiser'];
const BREITE = 1920;
const HOEHE = 1080;

const argumente = process.argv.slice(2);
const nurHintergrund = argumente.includes('--nur-hintergrund');
const hintergrundNeu = argumente.includes('--neu');
const gewaehlt = argumente.filter((a) => VARIANTEN.includes(a));
const varianten = gewaehlt.length ? gewaehlt : VARIANTEN;

// --- kleiner Webserver -------------------------------------------------------
const typen = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

function dateiFuer(pfad) {
  // Jede node_modules-Anfrage – egal aus welchem Ordner – landet in ui-stile/node_modules.
  const i = pfad.indexOf('/node_modules/');
  if (i >= 0) return path.join(uiWurzel, pfad.slice(i + 1));
  return path.join(projektWurzel, pfad);
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const datei = dateiFuer(p);
  if (!datei.startsWith(projektWurzel)) { res.writeHead(403); res.end(); return; }
  fs.readFile(datei, (err, buf) => {
    if (err) { res.writeHead(404); res.end('nicht gefunden'); return; }
    res.writeHead(200, { 'Content-Type': typen[path.extname(datei)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

// --- Browser -----------------------------------------------------------------
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function neueSeite() {
  const seite = await browser.newPage({ viewport: { width: BREITE, height: HOEHE }, deviceScaleFactor: 1 });
  seite.on('pageerror', (e) => console.log('  [Seitenfehler]', e.message));
  seite.on('console', (m) => { if (m.type() === 'error') console.log('  [Konsole]', m.text()); });
  return seite;
}

// --- 1. Hintergrundplatte ----------------------------------------------------
const hintergrund = path.join(uiWurzel, 'hintergrund.png');
if (hintergrundNeu || nurHintergrund || !fs.existsSync(hintergrund)) {
  const t = Date.now();
  process.stdout.write('Hintergrundplatte (Konzeptszene ohne alte Oberfläche) … ');
  const seite = await neueSeite();
  await seite.goto(`http://localhost:${port}/konzept/index.html`);
  await seite.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 600000 });
  const fehler = await seite.evaluate(() => window.__error);
  if (fehler) { console.log('\nFEHLER in der Konzeptszene:', fehler); process.exitCode = 1; }
  // Die alte Oberfläche wegblenden – die 3D-Szene ist zu dem Zeitpunkt schon gerendert.
  await seite.addStyleTag({ content: '#hud, #tooltip, #cursor, #world-ui, #vignette { display: none !important; }' });
  await seite.screenshot({ path: hintergrund, timeout: 600000 });
  await seite.close();
  console.log(`fertig (${((Date.now() - t) / 1000).toFixed(1)} s)`);
}

// --- 2. die zwölf Oberflächen ------------------------------------------------
if (!nurHintergrund) {
  for (const variante of varianten) {
    const ziel = path.join(uiWurzel, variante, 'screenshots');
    fs.mkdirSync(ziel, { recursive: true });
    for (const szene of SZENEN) {
      const t = Date.now();
      process.stdout.write(`${variante} / ${szene} … `);
      const seite = await neueSeite();
      await seite.goto(`http://localhost:${port}/ui-stile/${variante}/index.html?szene=${szene}`);
      await seite.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 60000 });
      await seite.waitForFunction(() => document.body.dataset.bereit === 'ja', null, { timeout: 60000 });
      const datei = path.join(ziel, `${szene}.png`);
      await seite.screenshot({ path: datei, timeout: 120000 });
      await seite.close();
      console.log(`${path.relative(uiWurzel, datei).replace(/\\/g, '/')} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
    }
  }
}

await browser.close();
server.close();
console.log('\nAlles erzeugt.');
