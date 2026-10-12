import { expect, test, type Page } from '@playwright/test';

// Die Vorschauseite ist reines HTML über dem Canvas. Der Software-Renderer
// (SwiftShader) ist trotzdem langsam, deshalb großzügige Zeitgrenzen und
// die niedrige Grafikstufe.
test.describe.configure({ timeout: 90_000 });

/** Lädt die Vorschau, wartet auf die 24 Karten und sammelt Konsolenfehler und Textwarnungen. */
async function laden(page: Page, suche = 'seed=42'): Promise<string[]> {
  const probleme: string[] = [];
  page.on('console', (nachricht) => {
    const text = nachricht.text();
    if (nachricht.type() === 'error') probleme.push(`Konsole: ${text}`);
    if (nachricht.type() === 'warning' && text.includes('Text fehlt')) probleme.push(text);
  });
  page.on('pageerror', (error) => probleme.push(`Seitenfehler: ${error.message}`));
  await page.goto(`./?szene=inhalte&grafik=niedrig&${suche}`);
  await expect(page.locator('.stab-karte')).toHaveCount(24, { timeout: 30_000 });
  return probleme;
}

const kartenTexte = (page: Page): Promise<string[]> => page.locator('.stab-karte').allInnerTexts();

test('Die Inhalte-Vorschau zeigt 24 Zauberstäbe mit Werten, Affixen und Seed', async ({ page }) => {
  const probleme = await laden(page);
  await expect(page).toHaveTitle(/Inhalte und Zauberstäbe/);
  await expect(page.locator('#seed-anzeige')).toHaveText('Seed: 42');

  const karten = await kartenTexte(page);
  expect(karten).toHaveLength(24);
  for (const text of karten) {
    expect(text).toContain('Zauberkraft');
    expect(text).toContain('Zaubertempo');
    expect(text).toContain('Reichweite');
    expect(text).toMatch(/Mana/);
    expect(text).toMatch(/„Der \S+ Zauberstab für jemanden mit .+“/);
  }
  // Jede Karte hat mindestens den Kerneffekt als Affix.
  await expect(page.locator('.stab-karte ul.affixe li.kern')).toHaveCount(24);
  // Es gibt Abwechslung: nicht nur eine Seltenheit, nicht nur ein Holz.
  const seltenheiten = await page
    .locator('.stab-karte')
    .evaluateAll((knoten) => knoten.map((k) => (k as HTMLElement).dataset['seltenheit']));
  expect(new Set(seltenheiten).size).toBeGreaterThanOrEqual(2);
  await expect(page.locator('body')).not.toContainText('⟦');

  await page.screenshot({ path: 'tests/e2e/screenshots/inhalte-staebe.png' });
  expect(probleme).toEqual([]);
});

test('Gegner- und Zaubertabellen nennen alle Einträge', async ({ page }) => {
  const probleme = await laden(page);
  const gegner = page
    .locator('h2', { hasText: 'Gegner' })
    .locator('xpath=following-sibling::table[1]');
  for (const name of ['Wolf', 'Warg', 'Irrlicht', 'Grimmzahn, der Rudelführer']) {
    await expect(gegner).toContainText(name);
  }
  const zauber = page
    .locator('h2', { hasText: 'Zauber' })
    .locator('xpath=following-sibling::table[1]');
  for (const name of ['Feuerball', 'Frostnova', 'Ausweichrolle']) {
    await expect(zauber).toContainText(name);
  }
  await expect(zauber).toContainText('4 m in 0,35 s');

  await zauber.scrollIntoViewIfNeeded();
  await page.locator('h2', { hasText: 'Gegner' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/e2e/screenshots/inhalte-tabellen.png' });
  expect(probleme).toEqual([]);
});

test('Neu würfeln ändert den Seed, derselbe Seed ergibt dieselbe Seite', async ({ page }) => {
  const probleme = await laden(page);
  const vorher = await kartenTexte(page);

  await page.locator('#wuerfeln').click();
  await expect(page.locator('#seed-anzeige')).not.toHaveText('Seed: 42');
  await expect(page.locator('.stab-karte')).toHaveCount(24);
  const nachher = await kartenTexte(page);
  expect(nachher).not.toEqual(vorher);

  // Den alten Seed wieder eintragen: genau dieselben Stäbe.
  await page.locator('#seed-feld').fill('42');
  await page.locator('#seed-feld').press('Enter');
  await expect(page.locator('#seed-anzeige')).toHaveText('Seed: 42');
  expect(await kartenTexte(page)).toEqual(vorher);
  expect(probleme).toEqual([]);
});

test('Stufe und Seltenheit sind wählbar', async ({ page }) => {
  const probleme = await laden(page);

  await page.locator('#stufe').selectOption('4');
  await page.locator('#seltenheit').selectOption('selten');
  for (const text of await kartenTexte(page)) {
    expect(text).toMatch(/Stufe 4/i);
    expect(text).toMatch(/Selten/i);
    expect(text).toContain(' · ');
  }
  await page.screenshot({ path: 'tests/e2e/screenshots/inhalte-selten-stufe4.png' });

  await page.locator('#seltenheit').selectOption('einzigartig');
  for (const text of await kartenTexte(page)) {
    expect(text).toContain('Aschenfang');
    expect(text).toContain('Feuerball verschießt 2 zusätzliche Geschosse');
  }

  await page.locator('#seltenheit').selectOption('gewoehnlich');
  await page.locator('#stufe').selectOption('1');
  for (const text of await kartenTexte(page)) {
    // Gewöhnlich: nur der Kerneffekt als einziger Affix.
    expect(text).toMatch(/Stufe 1/i);
  }
  await expect(page.locator('.stab-karte ul.affixe li')).toHaveCount(24);
  expect(probleme).toEqual([]);
});
