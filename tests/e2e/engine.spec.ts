import { expect, test, type Page } from '@playwright/test';

// Der Software-Renderer (SwiftShader) ist langsam, besonders wenn mehrere Tests
// parallel laufen und Shader kompiliert werden. Deshalb großzügige Zeitgrenzen.
test.describe.configure({ timeout: 90_000 });

/** Lädt die Seite und wartet, bis das erste Bild steht. Sammelt Konsolenfehler. */
// Standard ist Grafikstufe niedrig: Mit AO und Bloom schafft SwiftShader weniger als 1 Bild/s,
// dann scheitern alle Prüfungen in Echtzeit. Der F4-Test schaltet die Stufen trotzdem alle durch.
async function laden(page: Page, adresse = './?grafik=niedrig'): Promise<string[]> {
  const fehler: string[] = [];
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(`Konsole: ${nachricht.text()}`);
  });
  page.on('pageerror', (error) => fehler.push(`Seitenfehler: ${error.message}`));
  await page.goto(adresse);
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.body.dataset['bereit'] === 'true' && window.__zauberstaebe !== undefined,
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
  return fehler;
}

const spielerPosition = (page: Page) =>
  page.evaluate(() => {
    const spieler = window.__zauberstaebe?.spieler();
    if (!spieler) throw new Error('Kein Spieler');
    return { ...spieler.position, blickrichtung: spieler.blickrichtung };
  });

test('F3 zeigt die Debug-Anzeige und blendet sie wieder aus', async ({ page }) => {
  const fehler = await laden(page);
  const anzeige = page.locator('#debug-anzeige');
  await expect(anzeige).toHaveCount(0);

  await page.keyboard.press('F3');
  await expect(anzeige).toBeVisible();
  for (const text of ['Bildrate', 'Draw-Calls', 'Dreiecke', 'Entitäten', 'Schritt', 'Seed']) {
    await expect(anzeige).toContainText(text);
  }
  // Die Werte aktualisieren sich laufend.
  await expect.poll(() => anzeige.textContent()).toMatch(/Bildrate: [1-9]/);
  await page.screenshot({ path: 'tests/e2e/screenshots/debug-anzeige.png' });

  await page.keyboard.press('F3');
  await expect(anzeige).toBeHidden();
  expect(fehler).toEqual([]);
});

test('Gedrücktes W bewegt die Spielerfigur nach hinten (−z)', async ({ page }) => {
  const fehler = await laden(page);
  const start = await spielerPosition(page);

  await page.keyboard.down('KeyW');
  // Schrittgenau simulieren, unabhängig von der Bildrate des Software-Renderers:
  // 30 Schritte = 0,5 s bei 5 m/s = 2,5 m.
  await page.evaluate(() => window.__zauberstaebe?.simuliere(30));
  const mitte = await spielerPosition(page);
  expect(mitte.z).toBeLessThan(start.z - 2.4);
  expect(mitte.x).toBeCloseTo(start.x, 5);

  // Auch in Echtzeit läuft die Figur weiter, solange W gehalten wird.
  await expect.poll(async () => (await spielerPosition(page)).z).toBeLessThan(mitte.z - 0.2);
  await page.keyboard.up('KeyW');

  // Losgelassen: Die Figur bleibt stehen.
  await page.evaluate(() => window.__zauberstaebe?.simuliere(2));
  const halt = await spielerPosition(page);
  await page.evaluate(() => window.__zauberstaebe?.simuliere(30));
  expect((await spielerPosition(page)).z).toBeCloseTo(halt.z, 5);

  // Die Kamera ist mitgekommen.
  await page.screenshot({ path: 'tests/e2e/screenshots/gelaufen.png' });
  expect(fehler).toEqual([]);
});

test('Die Figur blickt zur Maus, ein Klick erzeugt ein Geschoss', async ({ page }) => {
  const fehler = await laden(page);
  const leinwand = await page.locator('canvas#spiel').boundingBox();
  if (!leinwand) throw new Error('Kein Canvas');
  const mitteY = leinwand.y + leinwand.height / 2;

  // Maus weit rechts neben die Figur: Blick nach +x (π/2).
  await page.mouse.move(leinwand.x + leinwand.width * 0.9, mitteY);
  await expect
    .poll(async () => (await spielerPosition(page)).blickrichtung, { timeout: 10_000 })
    .toBeGreaterThan(1.2);
  expect((await spielerPosition(page)).blickrichtung).toBeLessThan(1.95);

  await page.mouse.click(leinwand.x + leinwand.width * 0.9, mitteY);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__zauberstaebe?.ereignisse().some((e) => e.name === 'geschoss:erzeugt'),
      ),
    )
    .toBe(true);
  const geschosse = await page.evaluate(
    () =>
      window.__zauberstaebe?.entitaeten().filter((e) => e.marken.includes('geschoss')).length ?? 0,
  );
  expect(geschosse).toBeGreaterThan(0);
  await page.screenshot({ path: 'tests/e2e/screenshots/geschoss.png' });

  // Nach 1,2 s verfällt die Kugel wieder.
  await page.evaluate(() => window.__zauberstaebe?.simuliere(90));
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__zauberstaebe?.ereignisse().some((e) => e.name === 'geschoss:verfallen'),
      ),
    )
    .toBe(true);
  expect(fehler).toEqual([]);
});

test('F4 schaltet die Grafikstufe durch', async ({ page }) => {
  // Stufe „hoch“ ist im Software-Renderer der CI sehr langsam.
  test.setTimeout(120_000);
  const fehler = await laden(page, './');
  const stufe = () => page.evaluate(() => window.__zauberstaebe?.grafikstufe);
  // Wartet, bis mit der neuen Stufe wirklich zwei Bilder gezeichnet sind.
  const bilderWeiter = async () => {
    const vorher = await page.evaluate(() => window.__zauberstaebe?.bilder ?? 0);
    await expect
      .poll(() => page.evaluate(() => window.__zauberstaebe?.bilder ?? 0), { timeout: 30_000 })
      .toBeGreaterThan(vorher + 1);
  };

  expect(await stufe()).toBe('mittel');
  await page.screenshot({ path: 'tests/e2e/screenshots/grafik-mittel.png' });

  await page.keyboard.press('F4');
  expect(await stufe()).toBe('hoch');
  await expect(page.locator('.debug-meldung')).toContainText('Hoch');
  await bilderWeiter();
  await page.screenshot({ path: 'tests/e2e/screenshots/grafik-hoch.png' });

  await page.keyboard.press('F4');
  expect(await stufe()).toBe('niedrig');
  await bilderWeiter();
  await page.screenshot({ path: 'tests/e2e/screenshots/grafik-niedrig.png' });

  await page.keyboard.press('F4');
  expect(await stufe()).toBe('mittel');

  const gemeldet = await page.evaluate(
    () =>
      window.__zauberstaebe
        ?.ereignisse()
        .filter((e) => e.name === 'grafikstufe:geaendert')
        .map((e) => e.nutzlast) ?? [],
  );
  expect(gemeldet.at(-1)).toEqual({ stufe: 'mittel' });
  await bilderWeiter();
  expect(fehler).toEqual([]);
});

test('Seed aus der Adresszeile und F8-Fehlerbericht', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fehler = await laden(page, './?seed=12345&grafik=niedrig');
  expect(await page.evaluate(() => window.__zauberstaebe?.seed)).toBe(12345);
  expect(await page.evaluate(() => window.__zauberstaebe?.grafikstufe)).toBe('niedrig');

  await page.keyboard.press('F8');
  await expect(page.locator('.debug-meldung')).toBeVisible();
  const bericht = await page.evaluate(() => navigator.clipboard.readText());
  expect(bericht).toContain('Fehlerbericht');
  expect(bericht).toContain('Seed: 12345');
  expect(bericht).toContain('Spielerposition');
  expect(bericht).toContain('Letzte Ereignisse');
  expect(bericht).toContain('Grafikkarte');
  expect(fehler).toEqual([]);
});
