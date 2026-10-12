/**
 * Tests für den Zauberstab-Generator (Aufgabe 1.5): deterministisch, plausible
 * Spannen über 10 000 Würfe, Seltenheitsverteilung passend zu den Gewichten.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AFFIXE } from '@content/affixe';
import { SELTENHEITEN } from '@content/seltenheiten';
import { texte } from '@content/texte';
import type { Seltenheit, Zauberstab } from '@content/typen';
import { EINZIGARTIGE, HOELZER, KERNE, LAENGEN, STAB_LISTE } from '@content/zauberstaebe';
import { erzeugeZufall, registriereTexte, t } from '@engine/index';
import {
  berechneWerte,
  erzeugeZauberstab,
  istZauberstab,
  wuerfleSeltenheit,
} from '@game/zauberstab';

beforeAll(() => {
  registriereTexte(texte, { ersetzen: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ANZAHL = 10_000;

/** 10 000 Stäbe mit wechselnder Stufe (1 bis 5, also auch über der Tabelle). */
function wuerfleViele(seed = 20261012): Zauberstab[] {
  const zufall = erzeugeZufall(seed).abzweig('beute');
  return Array.from({ length: ANZAHL }, (_, i) =>
    erzeugeZauberstab(zufall, { stufe: (i % 5) + 1 }),
  );
}

describe('Determinismus', () => {
  it('gleicher Seed ergibt dieselben Stäbe, anderer Seed andere', () => {
    const a = wuerfleViele(7).slice(0, 300);
    const b = wuerfleViele(7).slice(0, 300);
    const c = wuerfleViele(8).slice(0, 300);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('nutzt nie Math.random oder Date.now', () => {
    const zufall = vi.spyOn(Math, 'random');
    const uhr = vi.spyOn(Date, 'now');
    for (let i = 0; i < 200; i++) {
      erzeugeZauberstab(erzeugeZufall(i), { stufe: 3 });
    }
    expect(zufall).not.toHaveBeenCalled();
    expect(uhr).not.toHaveBeenCalled();
  });

  it('der Strom hängt nur vom Abzweig ab, nicht von anderen Zügen', () => {
    const welt1 = erzeugeZufall(99);
    const welt2 = erzeugeZufall(99);
    welt2.zahl();
    welt2.zahl();
    const stab1 = erzeugeZauberstab(welt1.abzweig('beute'), { stufe: 2 });
    const stab2 = erzeugeZauberstab(welt2.abzweig('beute'), { stufe: 2 });
    expect(stab2).toEqual(stab1);
  });
});

describe('Verteilung über 10 000 Würfe', () => {
  // Erst nach dem Registrieren der Texte würfeln (beforeAll oben läuft zuerst).
  let staebe: Zauberstab[] = [];
  beforeAll(() => {
    staebe = wuerfleViele();
  });

  it('die Seltenheiten passen zu den Gewichten', () => {
    const anzahl: Record<Seltenheit, number> = {
      gewoehnlich: 0,
      magisch: 0,
      selten: 0,
      einzigartig: 0,
    };
    for (const stab of staebe) anzahl[stab.seltenheit]++;
    const summe = Object.values(SELTENHEITEN).reduce((s, d) => s + d.gewicht, 0);
    for (const seltenheit of ['gewoehnlich', 'magisch', 'selten'] as const) {
      const erwartet = (SELTENHEITEN[seltenheit].gewicht / summe) * ANZAHL;
      // Fünf Standardabweichungen Spielraum, damit der Test nie zufällig kippt.
      const sigma = Math.sqrt(erwartet * (1 - erwartet / ANZAHL));
      expect(Math.abs(anzahl[seltenheit] - erwartet), seltenheit).toBeLessThan(5 * sigma);
    }
    expect(anzahl.einzigartig).toBe(0);
  });

  it('wuerfleSeltenheit liefert nur gewürfelte Seltenheiten', () => {
    const zufall = erzeugeZufall(5);
    const gesehen = new Set<Seltenheit>();
    for (let i = 0; i < 2000; i++) gesehen.add(wuerfleSeltenheit(zufall));
    expect(gesehen).toEqual(new Set(['gewoehnlich', 'magisch', 'selten']));
  });

  it('Zusatzaffixe: Anzahl nach Seltenheit, nie doppelt, nie die Art des Kerns', () => {
    for (const stab of staebe) {
      const [min, max] = SELTENHEITEN[stab.seltenheit].zusatzaffixe;
      expect(stab.affixe.length).toBeGreaterThanOrEqual(min);
      expect(stab.affixe.length).toBeLessThanOrEqual(max);
      const arten = stab.affixe.map((a) => a.wirkung.art);
      expect(new Set(arten).size).toBe(arten.length);
      expect(arten).not.toContain(AFFIXE[KERNE[stab.kern].effekt.affix].art);
    }
  });

  it('Affixwerte liegen in der Spanne ihrer Stufe und Mindeststufen gelten', () => {
    for (const stab of staebe) {
      for (const affix of stab.affixe) {
        const vorlage = AFFIXE[affix.id];
        const spanne = vorlage.spannen[Math.min(stab.stufe, vorlage.spannen.length) - 1];
        expect(spanne).toBeDefined();
        const [min, max] = spanne ?? [0, 0];
        expect(affix.wirkung.wert).toBeGreaterThanOrEqual(min);
        expect(affix.wirkung.wert).toBeLessThanOrEqual(max);
        expect(stab.stufe).toBeGreaterThanOrEqual(vorlage.mindestStufe);
        expect(affix.wirkung.art).toBe(vorlage.art);
      }
    }
  });

  it('seltene Stäbe haben Präfix und Suffix und einen zusammengesetzten Namen', () => {
    const selten = staebe.filter((s) => s.seltenheit === 'selten');
    expect(selten.length).toBeGreaterThan(300);
    for (const stab of selten) {
      const plaetze = stab.affixe.map((a) => AFFIXE[a.id].platz);
      expect(plaetze).toContain('praefix');
      expect(plaetze).toContain('suffix');
      expect(stab.name).toContain(' · ');
      expect(stab.name.endsWith(t(HOELZER[stab.holz].stabSchluessel))).toBe(true);
    }
  });

  it('Namen: gewöhnlich schlicht, magisch mit Adjektiv oder Genitiv', () => {
    for (const stab of staebe) {
      const waffe = t(HOELZER[stab.holz].stabSchluessel);
      if (stab.seltenheit === 'gewoehnlich') expect(stab.name).toBe(waffe);
      if (stab.seltenheit === 'magisch') {
        expect(stab.name).not.toBe(waffe);
        expect(stab.name).toContain(waffe);
      }
      expect(stab.name).not.toMatch(/⟦|\{|undefined/);
    }
  });

  it('Beschreibung: Satz der Liste bei Listenpaaren, sonst ein Satz aus Bausteinen', () => {
    let ausListe = 0;
    let gebaut = 0;
    for (const stab of staebe) {
      const eintrag = STAB_LISTE.find((e) => e.holz === stab.holz && e.kern === stab.kern);
      expect(stab.beschreibung).toMatch(/^Der \S+ Zauberstab für jemanden mit .+ und .+\.$/);
      expect(stab.beschreibung).not.toMatch(/⟦|\{/);
      if (eintrag === undefined) {
        gebaut++;
      } else {
        ausListe++;
        expect(stab.beschreibung).toBe(t(eintrag.satzSchluessel));
      }
    }
    // Rund ein Viertel der Stäbe kommt aus der Liste (plus Zufallstreffer).
    expect(ausListe / ANZAHL).toBeGreaterThan(0.2);
    expect(ausListe / ANZAHL).toBeLessThan(0.35);
    expect(gebaut).toBeGreaterThan(5000);
  });

  it('gebaute Sätze nennen nie denselben Charakterzug zweimal und sind abwechslungsreich', () => {
    const saetze = new Set<string>();
    for (const stab of staebe) {
      const treffer = /mit (.+) und (.+)\.$/.exec(stab.beschreibung);
      expect(treffer?.[1]).not.toBe(treffer?.[2]);
      saetze.add(stab.beschreibung);
    }
    expect(saetze.size).toBeGreaterThan(300);
  });

  it('Kennungen sind eindeutig', () => {
    expect(new Set(staebe.map((s) => s.id)).size).toBe(ANZAHL);
  });

  it('Länge, Güte und Stufe liegen in den erlaubten Bereichen', () => {
    const laengen = new Set<number>(LAENGEN.map((l) => l.zoll));
    const gesehen = new Set<number>();
    for (const stab of staebe) {
      expect(laengen.has(stab.laenge)).toBe(true);
      gesehen.add(stab.laenge);
      expect(stab.guete).toBeGreaterThanOrEqual(0.92);
      expect(stab.guete).toBeLessThanOrEqual(1.08);
      expect(stab.stufe).toBeGreaterThanOrEqual(1);
    }
    expect(gesehen.size).toBe(LAENGEN.length);
    // Alle 100 Holz-Kern-Paare kommen vor.
    expect(new Set(staebe.map((s) => `${s.holz}|${s.kern}`)).size).toBe(100);
  });

  it('alle Werte sind endlich, nie negativ und sinnvoll geordnet', () => {
    for (const stab of staebe) {
      const werte = berechneWerte(stab);
      for (const zahl of [
        werte.zauberkraftMin,
        werte.zauberkraftMax,
        werte.zaubertempo,
        werte.reichweite,
        werte.maximalesMana,
        ...Object.values(werte.wirkungen),
      ]) {
        expect(Number.isFinite(zahl)).toBe(true);
        expect(zahl).toBeGreaterThanOrEqual(0);
      }
      expect(werte.zauberkraftMin).toBeGreaterThan(0);
      expect(werte.zauberkraftMax).toBeGreaterThanOrEqual(werte.zauberkraftMin);
      expect(werte.zaubertempo).toBeGreaterThan(0.5);
      expect(werte.zaubertempo).toBeLessThan(2.5);
      expect(werte.reichweite).toBeGreaterThan(6);
      expect(werte.reichweite).toBeLessThan(25);
      expect(werte.maximalesMana).toBeGreaterThan(10);
      expect(werte.affixe).toHaveLength(stab.affixe.length + 1);
    }
  });

  it('höhere Stufen machen kräftigere Stäbe, Holz und Länge wirken spürbar', () => {
    const mittel = (
      filter: (s: Zauberstab) => boolean,
      wert: (s: Zauberstab) => number,
    ): number => {
      const auswahl = staebe.filter(filter);
      return auswahl.reduce((summe, s) => summe + wert(s), 0) / auswahl.length;
    };
    const kraft = (s: Zauberstab): number => {
      const w = berechneWerte(s);
      return (w.zauberkraftMin + w.zauberkraftMax) / 2;
    };
    const tempo = (s: Zauberstab): number => berechneWerte(s).zaubertempo;
    const weite = (s: Zauberstab): number => berechneWerte(s).reichweite;

    expect(mittel((s) => s.stufe === 4, kraft)).toBeGreaterThan(
      mittel((s) => s.stufe === 1, kraft) * 1.8,
    );
    expect(mittel((s) => s.holz === 'eiche', kraft)).toBeGreaterThan(
      mittel((s) => s.holz === 'birke', kraft) * 1.8,
    );
    expect(mittel((s) => s.holz === 'birke', tempo)).toBeGreaterThan(
      mittel((s) => s.holz === 'eiche', tempo) * 1.3,
    );
    expect(mittel((s) => s.laenge === 10, tempo)).toBeGreaterThan(
      mittel((s) => s.laenge === 14, tempo) * 1.3,
    );
    expect(mittel((s) => s.laenge === 14, weite)).toBeGreaterThan(
      mittel((s) => s.laenge === 10, weite) * 1.5,
    );
  });

  it('Beispiele für den Bericht sehen plausibel aus', () => {
    const zufall = erzeugeZufall(42).abzweig('beute');
    const proben = (['gewoehnlich', 'magisch', 'selten'] as const).map((seltenheit) =>
      erzeugeZauberstab(zufall, { stufe: 3, seltenheit }),
    );
    for (const stab of proben) {
      expect(stab.name.length).toBeGreaterThan(4);
      expect(stab.affixe.every((a) => a.text.length > 5 && !a.text.includes('{'))).toBe(true);
    }
  });
});

describe('Eingaben', () => {
  it('eine vorgegebene Seltenheit wird eingehalten', () => {
    const zufall = erzeugeZufall(11);
    for (const seltenheit of ['gewoehnlich', 'magisch', 'selten'] as const) {
      for (let i = 0; i < 50; i++) {
        expect(erzeugeZauberstab(zufall, { stufe: 2, seltenheit }).seltenheit).toBe(seltenheit);
      }
    }
  });

  it('die Stufe wird zur benötigten Stufe, ungültige Werte werden zu 1', () => {
    const zufall = erzeugeZufall(3);
    expect(erzeugeZauberstab(zufall, { stufe: 3 }).stufe).toBe(3);
    expect(erzeugeZauberstab(zufall, { stufe: 2.7 }).stufe).toBe(2);
    expect(erzeugeZauberstab(zufall, { stufe: 0 }).stufe).toBe(1);
    expect(erzeugeZauberstab(zufall, { stufe: -4 }).stufe).toBe(1);
    expect(erzeugeZauberstab(zufall, { stufe: Number.NaN }).stufe).toBe(1);
  });

  it('auf Stufe 1 gibt es weder Durchbohren noch Zusatzgeschosse, auf Stufe 3 schon', () => {
    const zufall = erzeugeZufall(21);
    const arten = (stufe: number): Set<string> =>
      new Set(
        Array.from({ length: 4000 }, () =>
          erzeugeZauberstab(zufall, { stufe, seltenheit: 'selten' }),
        )
          .flatMap((s) => s.affixe)
          .map((a) => a.id),
      );
    const eins = arten(1);
    expect(eins.has('feuerball-durchbohren')).toBe(false);
    expect(eins.has('feuerball-zusatzgeschosse')).toBe(false);
    const drei = arten(3);
    expect(drei.has('feuerball-durchbohren')).toBe(true);
    expect(drei.has('feuerball-zusatzgeschosse')).toBe(true);
  });

  it('Einzahl und Mehrzahl: „1 zusätzliches Geschoss“, „2 zusätzliche Geschosse“', () => {
    const zufall = erzeugeZufall(21);
    const texteMitGeschoss = Array.from({ length: 4000 }, () =>
      erzeugeZauberstab(zufall, { stufe: 3, seltenheit: 'selten' }),
    )
      .flatMap((s) => s.affixe)
      .filter((a) => a.id === 'feuerball-zusatzgeschosse')
      .map((a) => a.text);
    expect(texteMitGeschoss.length).toBeGreaterThan(0);
    for (const text of texteMitGeschoss) {
      expect(text).toBe('Feuerball verschießt 1 zusätzliches Geschoss');
    }
  });

  it('einzigartig liefert Aschenfang mit zwei zusätzlichen Geschossen', () => {
    const stab = erzeugeZauberstab(erzeugeZufall(1), { stufe: 1, seltenheit: 'einzigartig' });
    const daten = EINZIGARTIGE.aschenfang;
    expect(stab.name).toBe('Aschenfang');
    expect(stab.seltenheit).toBe('einzigartig');
    expect(stab.stufe).toBe(daten.stufe);
    expect(stab.holz).toBe(daten.holz);
    expect(stab.kern).toBe(daten.kern);
    expect(stab.affixe.map((a) => a.text)).toContain(
      'Feuerball verschießt 2 zusätzliche Geschosse',
    );
    const werte = berechneWerte(stab);
    expect(werte.wirkungen['feuerball-zusatzgeschosse']).toBe(2);
    expect(werte.wirkungen['schaden-gegen-tiere-prozent']).toBe(20);
    expect(stab.id.startsWith('aschenfang-')).toBe(true);
  });

  it('istZauberstab erkennt Stäbe und lehnt andere Gegenstände ab', () => {
    const stab = erzeugeZauberstab(erzeugeZufall(2), { stufe: 1 });
    expect(istZauberstab(stab)).toBe(true);
    expect(istZauberstab({ id: 'wargzahn' })).toBe(false);
    expect(istZauberstab({ id: 'trank', seltenheit: 'gewoehnlich' })).toBe(false);
  });
});
