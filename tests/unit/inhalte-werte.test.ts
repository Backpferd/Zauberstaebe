/**
 * Tests für `berechneWerte` (Aufgabe 1.5): Rechenweg, Kerneffekt, Reinheit der Funktion.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { texte } from '@content/texte';
import type { Affix, Zauberstab } from '@content/typen';
import { LAENGEN } from '@content/zauberstaebe';
import { registriereTexte } from '@engine/index';
import { berechneWerte, findeLaenge, formatiereAffix, tabellenWert } from '@game/zauberstab';

beforeAll(() => {
  registriereTexte(texte, { ersetzen: true });
});

function affix(id: Affix['id'], art: Affix['wirkung']['art'], wert: number): Affix {
  return { id, text: formatiereAffix(id, wert), wirkung: { art, wert } };
}

function stab(teil: Partial<Zauberstab>): Zauberstab {
  return {
    id: 'test',
    name: 'Teststab',
    holz: 'birke',
    kern: 'adlerfeder',
    laenge: 10,
    seltenheit: 'gewoehnlich',
    affixe: [],
    beschreibung: 'Test',
    stufe: 1,
    guete: 1,
    ...teil,
  };
}

describe('berechneWerte', () => {
  it('rechnet einen gewöhnlichen Birkenstab von Hand nach', () => {
    const werte = berechneWerte(stab({}));
    // Birke: Zauberkraft 4 bis 7, Mana 28, Tempo ×1,2; 10 Zoll: Tempo 1,3, Reichweite 8 m
    expect(werte.zauberkraftMin).toBe(4);
    expect(werte.zauberkraftMax).toBe(7);
    expect(werte.zaubertempo).toBeCloseTo(1.56, 5);
    expect(werte.reichweite).toBeCloseTo(8, 5);
    expect(werte.reichweiteKlasse).toBe('kurz');
    expect(werte.maximalesMana).toBe(28);
  });

  it('der Kerneffekt wirkt immer, auch ohne Zusatzaffixe', () => {
    const werte = berechneWerte(stab({}));
    expect(werte.wirkungen['geschossgeschwindigkeit-prozent']).toBe(25);
    expect(werte.affixe).toHaveLength(1);
    expect(werte.affixe[0]?.text).toBe('+25 % Geschossgeschwindigkeit');
  });

  it('Affixe schlagen auf Zauberkraft, Tempo, Reichweite und Mana durch', () => {
    const werte = berechneWerte(
      stab({
        holz: 'eiche',
        kern: 'eulenfeder',
        laenge: 14,
        affixe: [
          affix('zauberkraft', 'zauberkraft-prozent', 10),
          affix('zauberkraft-flach', 'zauberkraft-flach', 2),
          affix('zaubertempo', 'zaubertempo-prozent', 10),
          affix('maximales-mana', 'maximales-mana', 15),
        ],
      }),
    );
    // Zauberkraft: (11 + 2) × 1,1 = 14,3 und (17 + 2) × 1,1 = 20,9
    expect(werte.zauberkraftMin).toBe(14);
    expect(werte.zauberkraftMax).toBe(21);
    // Tempo: 0,9 × 0,85 × 1,1
    expect(werte.zaubertempo).toBeCloseTo(0.84, 2);
    // Reichweite: 15 m, dazu +12 % von der Eulenfeder
    expect(werte.reichweite).toBeCloseTo(16.8, 5);
    expect(werte.reichweiteKlasse).toBe('lang');
    expect(werte.maximalesMana).toBe(35);
    expect(werte.affixe.map((a) => a.id)).toEqual([
      'reichweite',
      'zauberkraft',
      'zauberkraft-flach',
      'zaubertempo',
      'maximales-mana',
    ]);
  });

  it('Stufe und Güte verstärken die Zauberkraft', () => {
    const grund = berechneWerte(stab({ holz: 'buche' }));
    const stufe4 = berechneWerte(stab({ holz: 'buche', stufe: 4 }));
    const gut = berechneWerte(stab({ holz: 'buche', guete: 1.08 }));
    expect(stufe4.zauberkraftMax).toBe(Math.round(11 * 2.1));
    expect(stufe4.maximalesMana).toBeGreaterThan(grund.maximalesMana);
    expect(gut.zauberkraftMax).toBeGreaterThanOrEqual(grund.zauberkraftMax);
    expect(gut.zauberkraftMax).toBe(Math.round(11 * 1.08));
  });

  it('die Wirkungen summieren Kern und Affix derselben Art', () => {
    const werte = berechneWerte(
      stab({
        kern: 'widdersporn',
        affixe: [affix('feuerschaden', 'feuerschaden-prozent', 10)],
      }),
    );
    expect(werte.wirkungen['feuerschaden-prozent']).toBe(25);
    expect(werte.wirkungen['frostschaden-prozent']).toBe(0);
  });

  it('verändert den Stab nicht und liefert bei gleichem Stab dasselbe', () => {
    const eingefroren = Object.freeze(
      stab({ affixe: Object.freeze([affix('zaubertempo', 'zaubertempo-prozent', 5)]) as Affix[] }),
    );
    const a = berechneWerte(eingefroren);
    const b = berechneWerte(eingefroren);
    expect(b).toEqual(a);
    expect(eingefroren.affixe).toHaveLength(1);
  });

  it('Kurz ist schnell und kurz, lang ist langsam und weit', () => {
    const kurz = berechneWerte(stab({ holz: 'buche', laenge: 10 }));
    const lang = berechneWerte(stab({ holz: 'buche', laenge: 14 }));
    expect(kurz.zaubertempo).toBeGreaterThan(lang.zaubertempo);
    expect(kurz.reichweite).toBeLessThan(lang.reichweite);
  });
});

describe('Hilfsfunktionen', () => {
  it('tabellenWert nimmt über der Tabelle den letzten Eintrag', () => {
    expect(tabellenWert([1, 2, 3], 1)).toBe(1);
    expect(tabellenWert([1, 2, 3], 3)).toBe(3);
    expect(tabellenWert([1, 2, 3], 9)).toBe(3);
    expect(tabellenWert([1, 2, 3], 0)).toBe(1);
  });

  it('findeLaenge rundet unbekannte Längen auf die nächste', () => {
    expect(findeLaenge(12).zoll).toBe(12);
    expect(findeLaenge(12.2).zoll).toBe(12);
    expect(findeLaenge(99).zoll).toBe(14);
    expect(findeLaenge(1).zoll).toBe(LAENGEN[0]?.zoll);
  });

  it('formatiereAffix setzt Zahlen deutsch ein', () => {
    expect(formatiereAffix('feuerschaden', 18)).toBe('+18 % Feuerschaden');
    expect(formatiereAffix('lebensregeneration', 1.5)).toBe('+1,5 Leben pro Sekunde');
    expect(formatiereAffix('feuerball-zusatzgeschosse', 1)).toBe(
      'Feuerball verschießt 1 zusätzliches Geschoss',
    );
    expect(formatiereAffix('feuerball-zusatzgeschosse', 2)).toBe(
      'Feuerball verschießt 2 zusätzliche Geschosse',
    );
  });
});
