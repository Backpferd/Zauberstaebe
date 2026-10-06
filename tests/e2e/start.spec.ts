import { expect, test } from '@playwright/test';

test('Die Seite lädt, zeigt ein WebGL-Canvas und meldet keine Konsolenfehler', async ({ page }) => {
  const fehler: string[] = [];
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(`Konsole: ${nachricht.text()}`);
  });
  page.on('pageerror', (error) => fehler.push(`Seitenfehler: ${error.message}`));

  await page.goto('./');
  await expect(page).toHaveTitle('Zauberstäbe');

  const leinwand = page.locator('canvas#spiel');
  await expect(leinwand).toBeVisible();

  // Das Canvas hat einen WebGL-Kontext, und mindestens ein Bild wurde gezeichnet.
  await expect(page.locator('body[data-bereit="true"]')).toBeAttached();
  const hatWebGl = await leinwand.evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  });
  expect(hatWebGl).toBe(true);

  const groesse = await leinwand.boundingBox();
  expect(groesse?.width).toBeGreaterThan(100);
  expect(groesse?.height).toBeGreaterThan(100);

  await page.screenshot({ path: 'tests/e2e/screenshots/start.png' });

  expect(fehler).toEqual([]);
});
