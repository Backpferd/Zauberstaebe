import { expect, test } from '@playwright/test';

test('Die Seite lädt, zeichnet die Testszene und meldet keine Konsolenfehler', async ({ page }) => {
  test.setTimeout(90_000);
  const fehler: string[] = [];
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(`Konsole: ${nachricht.text()}`);
  });
  page.on('pageerror', (error) => fehler.push(`Seitenfehler: ${error.message}`));

  await page.goto('./');
  await expect(page).toHaveTitle('Zauberstäbe');

  const leinwand = page.locator('canvas#spiel');
  await expect(leinwand).toBeVisible();

  // Mindestens ein Bild wurde gezeichnet. Großzügig warten: Beim ersten Start
  // lädt Vite die Seite unter Umständen einmal neu, und SwiftShader ist langsam.
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.body.dataset['bereit'] === 'true' && window.__zauberstaebe !== undefined,
        ),
      { timeout: 30_000 },
    )
    .toBe(true);

  // Das Canvas hat einen WebGL-Kontext.
  const hatWebGl = await leinwand.evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  });
  expect(hatWebGl).toBe(true);

  const groesse = await leinwand.boundingBox();
  expect(groesse?.width).toBeGreaterThan(100);
  expect(groesse?.height).toBeGreaterThan(100);

  // Die Simulation läuft: Schritte werden gezählt, es gibt einen Spieler.
  await expect
    .poll(() => page.evaluate(() => window.__zauberstaebe?.schritt ?? 0))
    .toBeGreaterThan(5);
  const spieler = await page.evaluate(() => window.__zauberstaebe?.spieler());
  expect(spieler?.marken).toContain('spieler');

  await page.screenshot({ path: 'tests/e2e/screenshots/start.png' });

  expect(fehler).toEqual([]);
});
