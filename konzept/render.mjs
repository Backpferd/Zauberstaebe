// Rendert die Konzeptszene in einem Headless-Chromium und speichert einen Screenshot.
//   node render.mjs [ausgabe.png] [?query]
//   SCALE=2 node render.mjs  -> Supersampling (doppelte Auflösung, danach verkleinert)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const out = process.argv[2] || 'screenshot.png';
const query = process.argv[3] || '';
const scale = Number(process.env.SCALE || 1);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
page.on('console', (m) => { if (m.type() !== 'debug') console.log(`[${m.type()}]`, m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
await page.goto(`http://localhost:${port}/index.html${query}`);
await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 600000 });
const err = await page.evaluate(() => window.__error);
if (err) console.log('FEHLER:', err);
console.log('stats', JSON.stringify(await page.evaluate(() => window.__stats)));
await page.screenshot({ path: out, scale: scale > 1 ? 'device' : 'css', timeout: 600000 });
console.log(`gespeichert: ${out} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
await browser.close();
server.close();
