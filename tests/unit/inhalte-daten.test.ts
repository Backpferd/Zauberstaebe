/**
 * Datentests für Aufgabe 1.5: Kennungen eindeutig, Verweise gültig, Textschlüssel
 * vorhanden, Zauberstabliste vollständig abgebildet, Werte plausibel.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import { WIRKUNGS_ARTEN } from '@content/affixe';
import {
  AFFIX_LISTE,
  AFFIXE,
  BEGEGNUNGEN,
  BESCHREIBUNG_EINLEITUNGEN,
  EINZIGARTIGE,
  GEBIET,
  GEGNER,
  HOECHSTE_STUFE,
  HOELZER,
  KERNE,
  LAENGEN,
  MATERIALIEN,
  ORTE,
  QUEST,
  REGIONEN,
  SELTENHEIT_REIHENFOLGE,
  SELTENHEITEN,
  STAB_LISTE,
  STUFEN,
  texte,
  TRANKE,
  WEGWEISER,
  ZAUBER,
} from '@content/index';
import type { Ausloeser, BeuteEintrag, BegegnungKennung, OrtKennung } from '@content/typen';
import { registriereTexte, t } from '@engine/index';
import type { BegegnungId, OrtId } from '@world/vertraege';

beforeAll(() => {
  registriereTexte(texte, { ersetzen: true });
});

/** Alle Textschlüssel, die in den Daten stehen (Felder `…Schluessel` und `zuege`). */
function sammleSchluessel(wert: unknown, ergebnis = new Set<string>()): Set<string> {
  if (Array.isArray(wert)) {
    for (const eintrag of wert) sammleSchluessel(eintrag, ergebnis);
  } else if (typeof wert === 'object' && wert !== null) {
    for (const [name, inhalt] of Object.entries(wert)) {
      if (name.endsWith('Schluessel') && typeof inhalt === 'string') ergebnis.add(inhalt);
      else if (name === 'zuege' && Array.isArray(inhalt)) {
        for (const schluessel of inhalt) ergebnis.add(String(schluessel));
      } else sammleSchluessel(inhalt, ergebnis);
    }
  }
  return ergebnis;
}

const ALLE_DATEN = [
  HOELZER,
  KERNE,
  STAB_LISTE,
  EINZIGARTIGE,
  AFFIXE,
  SELTENHEITEN,
  ZAUBER,
  GEGNER,
  BEGEGNUNGEN,
  QUEST,
  GEBIET,
  REGIONEN,
  ORTE,
  WEGWEISER,
  TRANKE,
  MATERIALIEN,
];

/** Alle Beuteeinträge der Daten: Gegner und Truhen. */
function alleBeute(): BeuteEintrag[] {
  const truhen = Object.values(BEGEGNUNGEN).flatMap((b) =>
    'truhe' in b ? [...b.truhe.inhalt] : [],
  );
  return [...Object.values(GEGNER).flatMap((g) => [...g.beute]), ...truhen];
}

describe('Kennungen', () => {
  it('stimmen mit den Schlüsseln der Tabellen überein und sind eindeutig', () => {
    const tabellen: Record<string, Record<string, { id: string }>> = {
      HOELZER,
      KERNE,
      AFFIXE,
      SELTENHEITEN,
      ZAUBER,
      GEGNER,
      BEGEGNUNGEN,
      TRANKE,
      MATERIALIEN,
      EINZIGARTIGE,
    };
    for (const [name, tabelle] of Object.entries(tabellen)) {
      for (const [schluessel, eintrag] of Object.entries(tabelle)) {
        expect(eintrag.id, `${name}.${schluessel}`).toBe(schluessel);
      }
    }
    const ids = AFFIX_LISTE.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Orte und Begegnungen entsprechen den Verträgen der Welt', () => {
    expectTypeOf<OrtKennung>().toEqualTypeOf<OrtId>();
    expectTypeOf<BegegnungKennung>().toEqualTypeOf<BegegnungId>();
    const orte: Record<OrtId, true> = {
      start: true,
      lagerfeuer: true,
      zelt: true,
      schriftrolle: true,
      wegekreuz: true,
      wegweiser: true,
      bruecke: true,
      erdrutsch: true,
      kampf1: true,
      kampf2: true,
      kampf3: true,
      truhe: true,
      'arena-eingang': true,
      bosslichtung: true,
    };
    expect(Object.keys(ORTE).sort()).toEqual(Object.keys(orte).sort());
    expect(Object.keys(BEGEGNUNGEN)).toEqual(['kampf1', 'kampf2', 'kampf3', 'boss']);
  });

  it('Gegner tragen die IDs aus der Architektur', () => {
    expect(Object.keys(GEGNER)).toEqual(['wolf', 'warg', 'irrlicht', 'grimmzahn']);
    expect(Object.keys(ZAUBER)).toEqual(['feuerball', 'frostnova', 'ausweichrolle']);
  });
});

describe('Verweise', () => {
  it('Begegnungen verweisen auf vorhandene Gegner und Orte', () => {
    for (const begegnung of Object.values(BEGEGNUNGEN)) {
      expect(ORTE, begegnung.id).toHaveProperty(begegnung.ort);
      expect(begegnung.wellen.length).toBeGreaterThan(0);
      for (const welle of begegnung.wellen) {
        expect(welle.length).toBeGreaterThan(0);
        for (const { art, anzahl } of welle) {
          expect(GEGNER, `${begegnung.id}: ${art}`).toHaveProperty(art);
          expect(anzahl).toBeGreaterThan(0);
        }
      }
      if ('truhe' in begegnung) expect(ORTE).toHaveProperty(begegnung.truhe.ort);
    }
  });

  it('Kampf 3 enthält den Warg und die Truhe mit dem ersten magischen Stab', () => {
    const arten = BEGEGNUNGEN.kampf3.wellen.flat().map((g) => g.art);
    expect(arten).toContain('warg');
    expect(BEGEGNUNGEN.kampf3.truhe.ort).toBe('truhe');
    expect(BEGEGNUNGEN.kampf3.truhe.inhalt).toContainEqual(
      expect.objectContaining({ art: 'zauberstab', seltenheit: 'magisch' }),
    );
    expect(BEGEGNUNGEN.kampf1.wellen.flat()).toEqual([{ art: 'wolf', anzahl: 2 }]);
    const kampf2 = BEGEGNUNGEN.kampf2.wellen.flat().map((g) => g.art);
    expect(kampf2).toContain('irrlicht');
    expect(kampf2).toContain('wolf');
  });

  it('Beute verweist auf vorhandene Tränke, Materialien und einzigartige Stäbe', () => {
    for (const eintrag of alleBeute()) {
      expect(eintrag.chance).toBeGreaterThan(0);
      expect(eintrag.chance).toBeLessThanOrEqual(1);
      if (eintrag.art === 'trank') expect(TRANKE).toHaveProperty(eintrag.trank);
      if (eintrag.art === 'material') expect(MATERIALIEN).toHaveProperty(eintrag.material);
      if (eintrag.art === 'einzigartig') expect(EINZIGARTIGE).toHaveProperty(eintrag.stab);
      if (eintrag.art === 'gold' || eintrag.art === 'material') {
        expect(eintrag.menge[0]).toBeLessThanOrEqual(eintrag.menge[1]);
        expect(eintrag.menge[0]).toBeGreaterThan(0);
      }
    }
  });

  it('der Boss lässt garantiert den einzigartigen Stab und den Wargzahn fallen', () => {
    const beute = GEGNER.grimmzahn.beute;
    expect(beute).toContainEqual({ art: 'einzigartig', stab: 'aschenfang', chance: 1 });
    expect(beute).toContainEqual(
      expect.objectContaining({ art: 'material', material: 'wargzahn', chance: 1 }),
    );
  });

  it('die Quest verweist auf vorhandene Orte, Begegnungen und Gegner', () => {
    const ausloeser: Ausloeser[] = [QUEST.start, ...QUEST.schritte.map((s) => s.ausloeser)];
    for (const a of ausloeser) {
      if (a.ereignis === 'interaktion:ausgeloest') expect(ORTE).toHaveProperty(a.objektId);
      if (a.ereignis === 'spieler:bewegt') {
        expect(ORTE).toHaveProperty(a.nahe);
        expect(a.radius).toBeGreaterThan(0);
      }
      if (a.ereignis === 'begegnung:gestartet' || a.ereignis === 'begegnung:beendet') {
        expect(BEGEGNUNGEN).toHaveProperty(a.begegnungId);
      }
      if (a.ereignis === 'gegner:besiegt') expect(GEGNER).toHaveProperty(a.art);
    }
  });

  it('der Wegweiser hat drei Arme mit gültigen Zielen', () => {
    expect(Object.keys(WEGWEISER)).toEqual(['dorf', 'berge', 'wald']);
    for (const arm of Object.values(WEGWEISER)) {
      expect(REGIONEN).toHaveProperty(arm.ziel);
      expect(REGIONEN[arm.ziel].zugaenglich).toBe(!arm.gesperrt);
      expect('sperrgrundSchluessel' in arm).toBe(arm.gesperrt);
    }
  });

  it('die Kerne verweisen auf vorhandene Affixe mit gültiger Wirkung', () => {
    for (const kern of Object.values(KERNE)) {
      const affix = AFFIXE[kern.effekt.affix];
      expect(WIRKUNGS_ARTEN).toContain(affix.art);
      expect(kern.effekt.wert).toBeGreaterThan(0);
    }
    for (const stab of Object.values(EINZIGARTIGE)) {
      expect(HOELZER).toHaveProperty(stab.holz);
      expect(KERNE).toHaveProperty(stab.kern);
      for (const fest of stab.affixe) expect(AFFIXE).toHaveProperty(fest.affix);
    }
  });
});

describe('Texte', () => {
  const schluessel = [...sammleSchluessel(ALLE_DATEN), ...BESCHREIBUNG_EINLEITUNGEN];

  it('jeder in Daten genannte Textschlüssel existiert in texte.ts', () => {
    expect(schluessel.length).toBeGreaterThan(200);
    const fehlend = schluessel.filter((s) => !Object.hasOwn(texte, s));
    expect(fehlend).toEqual([]);
  });

  it('kein Text ist leer oder ein Platzhalter', () => {
    const verboten = /TODO|FIXME|lorem|ipsum|platzhalter|\bxxx\b|\btbd\b|undefined|⟦|\[\.\.\.\]/i;
    for (const [name, text] of Object.entries(texte)) {
      expect(text.trim().length, name).toBeGreaterThan(0);
      expect(text, name).not.toMatch(verboten);
    }
  });

  it('Klammern in Texten sind bekannte Platzhalter', () => {
    const erlaubt = new Set([
      'wert',
      'zoll',
      'stab',
      'adjektiv',
      'genitiv',
      'praefix',
      'suffix',
      'einleitung',
      'zug1',
      'zug2',
    ]);
    for (const [name, text] of Object.entries(texte)) {
      if (name.startsWith('debug.')) continue;
      for (const treffer of text.matchAll(/\{([^}]*)\}/g)) {
        expect(erlaubt.has(treffer[1] ?? ''), `${name}: {${treffer[1]}}`).toBe(true);
      }
    }
  });

  it('Texte nutzen echte Umlaute statt ae, oe, ue', () => {
    const ersatz =
      /\b(fuer|ueber|koennen|koennte|koennt|moechte|muessen|waehrend|spaeter|zurueck|gegenueber|staerke|maechtig\w*|gefuehl\w*|natuerlich|draussen|groesse|heisse|strasse|frueh\w*|jaeger|baer|bruecke|schluessel|zaehl\w*)\b/i;
    for (const [name, text] of Object.entries(texte)) {
      if (name.startsWith('debug.')) continue;
      expect(text, name).not.toMatch(ersatz);
    }
  });

  it('jedes Affix hat einen Text mit Wert, jeder Name ein Adjektiv oder eine Genitivwendung', () => {
    for (const affix of AFFIX_LISTE) {
      expect(t(affix.textSchluessel), affix.id).toContain('{wert}');
      if (affix.platz === 'suffix')
        expect(t(affix.nameSchluessel), affix.id).toMatch(/^(der|des) /);
      else expect(t(affix.nameSchluessel), affix.id).toMatch(/^[A-ZÄÖÜ][a-zäöüß]+(er)$/);
    }
  });

  it('Endbildschirm, Tod und Einstieg sind vorhanden', () => {
    expect(texte['ende.zeile']).toBe('Ende des Testlaufs – Fortsetzung: Das Dorf');
    for (const schluessel of [
      'tod.titel',
      'einstieg.1',
      'schriftrolle.hinweis',
      'lagerfeuer.rast',
      'truhe.geoeffnet',
    ]) {
      expect(Object.hasOwn(texte, schluessel), schluessel).toBe(true);
    }
  });
});

describe('Zauberstabliste', () => {
  const datei = fileURLToPath(new URL('../../Zauberstabliste', import.meta.url));
  const zeilen = readFileSync(datei, 'utf8')
    .split(/\r?\n/)
    .map((zeile) => zeile.trim().replace(/^"|"$/g, ''))
    .filter((zeile) => zeile.length > 0);

  it('enthält zehn Stäbe', () => {
    expect(zeilen).toHaveLength(10);
    expect(STAB_LISTE).toHaveLength(10);
  });

  it.each(zeilen.map((zeile, index) => [index + 1, zeile] as const))(
    'Stab %i ist mit Holz, Kern, Länge und Satz abgebildet',
    (_nummer, zeile) => {
      const treffer =
        /^Ein Zauberstab aus (\S+), mit einer? (\S+), (\d+)( 1\/2)? Zoll\. (.+)$/.exec(zeile);
      expect(treffer, zeile).not.toBeNull();
      const [, holzWort = '', kernWort = '', zoll = '0', halb, satz = ''] = treffer ?? [];

      const holz = Object.values(HOELZER).find((h) => holzWort.startsWith(t(h.nameSchluessel)));
      const kern = Object.values(KERNE).find((k) => kernWort.startsWith(t(k.nameSchluessel)));
      expect(holz, holzWort).toBeDefined();
      expect(kern, kernWort).toBeDefined();

      const eintrag = STAB_LISTE.find((e) => e.holz === holz?.id && e.kern === kern?.id);
      expect(eintrag, `${holzWort} + ${kernWort}`).toBeDefined();
      expect(eintrag?.zoll).toBe(Number(zoll) + (halb === undefined ? 0 : 0.5));
      expect(t(eintrag?.satzSchluessel ?? 'fehlt')).toBe(satz);
    },
  );

  it('alle zehn Hölzer und alle zehn Kerne kommen genau einmal vor', () => {
    expect(new Set(STAB_LISTE.map((e) => e.holz)).size).toBe(10);
    expect(new Set(STAB_LISTE.map((e) => e.kern)).size).toBe(10);
    expect(Object.keys(HOELZER)).toHaveLength(10);
    expect(Object.keys(KERNE)).toHaveLength(10);
  });
});

describe('Zauberstab-Daten', () => {
  it('Längen: neun Stufen von 10 bis 14 Zoll, kurz = schnell, lang = weit', () => {
    expect(LAENGEN.map((l) => l.zoll)).toEqual([10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14]);
    for (let i = 1; i < LAENGEN.length; i++) {
      const vorher = LAENGEN[i - 1];
      const jetzt = LAENGEN[i];
      expect(jetzt?.tempo).toBeLessThan(vorher?.tempo ?? 0);
      expect(jetzt?.reichweiteMeter).toBeGreaterThan(vorher?.reichweiteMeter ?? 0);
    }
    const klassen = LAENGEN.map((l) => l.reichweite);
    expect(klassen[0]).toBe('kurz');
    expect(klassen[8]).toBe('lang');
    expect(new Set(klassen)).toEqual(new Set(['kurz', 'mittel', 'lang']));
  });

  it('Hölzer haben erkennbaren Charakter: Eiche kräftig und langsam, Birke schnell und schwach', () => {
    const mitte = (id: keyof typeof HOELZER): number =>
      (HOELZER[id].zauberkraft[0] + HOELZER[id].zauberkraft[1]) / 2;
    for (const holz of Object.values(HOELZER)) {
      expect(holz.zauberkraft[0]).toBeGreaterThan(0);
      expect(holz.zauberkraft[0]).toBeLessThan(holz.zauberkraft[1]);
      expect(holz.mana).toBeGreaterThan(0);
      expect(holz.tempo).toBeGreaterThan(0);
    }
    const hoelzer = Object.keys(HOELZER) as (keyof typeof HOELZER)[];
    expect(hoelzer.every((h) => mitte('eiche') >= mitte(h))).toBe(true);
    expect(hoelzer.every((h) => mitte('birke') <= mitte(h))).toBe(true);
    expect(hoelzer.every((h) => HOELZER.eiche.tempo <= HOELZER[h].tempo)).toBe(true);
    expect(hoelzer.every((h) => HOELZER.birke.tempo >= HOELZER[h].tempo)).toBe(true);
    expect(HOELZER.pappel.mana).toBeGreaterThan(HOELZER.eiche.mana);
  });

  it('Seltenheiten: vier, aufsteigend, einzigartig wird nie gewürfelt', () => {
    expect(SELTENHEIT_REIHENFOLGE).toEqual(['gewoehnlich', 'magisch', 'selten', 'einzigartig']);
    expect(SELTENHEITEN.gewoehnlich.zusatzaffixe).toEqual([0, 0]);
    expect(SELTENHEITEN.magisch.zusatzaffixe).toEqual([1, 2]);
    expect(SELTENHEITEN.selten.zusatzaffixe).toEqual([3, 4]);
    expect(SELTENHEITEN.einzigartig.gewicht).toBe(0);
    expect(Object.keys(EINZIGARTIGE)).toHaveLength(1);
  });

  it('Affixe: 15 bis 25 Stück mit steigenden Spannen und allen Wirkungsarten', () => {
    expect(AFFIX_LISTE.length).toBeGreaterThanOrEqual(15);
    expect(AFFIX_LISTE.length).toBeLessThanOrEqual(25);
    for (const affix of AFFIX_LISTE) {
      expect(affix.spannen, affix.id).toHaveLength(HOECHSTE_STUFE);
      expect(WIRKUNGS_ARTEN, affix.id).toContain(affix.art);
      expect(affix.gewicht).toBeGreaterThan(0);
      let letzteMitte = 0;
      for (const [min, max] of affix.spannen) {
        expect(min, affix.id).toBeGreaterThan(0);
        expect(min, affix.id).toBeLessThanOrEqual(max);
        expect((min + max) / 2, affix.id).toBeGreaterThanOrEqual(letzteMitte);
        letzteMitte = (min + max) / 2;
      }
    }
    const arten = AFFIX_LISTE.map((a) => a.art);
    expect(new Set(arten).size).toBe(arten.length);
    // Jede Fähigkeit von Gebiet 1 hat mehrere eigene Affixe.
    for (const faehigkeit of ['feuerball', 'frostnova', 'ausweichrolle'] as const) {
      expect(AFFIX_LISTE.filter((a) => a.faehigkeit === faehigkeit).length).toBeGreaterThanOrEqual(
        3,
      );
    }
    expect(AFFIX_LISTE.filter((a) => a.platz === 'praefix').length).toBeGreaterThanOrEqual(5);
    expect(AFFIX_LISTE.filter((a) => a.platz === 'suffix').length).toBeGreaterThanOrEqual(5);
  });

  it('jeder Kerneffekt passt zu seinem Kern', () => {
    const erwartet: Record<keyof typeof KERNE, string> = {
      eulenfeder: 'reichweite-prozent',
      einhornhaar: 'lebensregeneration',
      zentaurenhaar: 'ausweichrolle-strecke-prozent',
      adlerfeder: 'geschossgeschwindigkeit-prozent',
      widdersporn: 'feuerschaden-prozent',
      basiliskenhaut: 'einfrieren-dauer-prozent',
      spinnenfeder: 'ausweichrolle-abklingzeit-senkung-prozent',
      basiliskenklaue: 'kritische-trefferchance',
      wargzahn: 'schaden-gegen-tiere-prozent',
      minotaurhorn: 'maximales-leben',
    };
    for (const [id, art] of Object.entries(erwartet)) {
      expect(AFFIXE[KERNE[id as keyof typeof KERNE].effekt.affix].art, id).toBe(art);
    }
  });

  it('der einzigartige Stab verschießt zwei zusätzliche Geschosse', () => {
    const stab = EINZIGARTIGE.aschenfang;
    expect(stab.affixe).toContainEqual({ affix: 'feuerball-zusatzgeschosse', wert: 2 });
    expect(stab.stufe).toBe(HOECHSTE_STUFE);
    expect(t(AFFIXE['feuerball-zusatzgeschosse'].textSchluessel, { wert: 2 })).toBe(
      'Feuerball verschießt 2 zusätzliche Geschosse',
    );
  });
});

describe('Zauber, Gegner, Boss', () => {
  it('Ausweichrolle: ca. 4 m, 0,35 s, 1,2 s Abklingzeit', () => {
    expect(ZAUBER.ausweichrolle.strecke).toBe(4);
    expect(ZAUBER.ausweichrolle.dauer).toBe(0.35);
    expect(ZAUBER.ausweichrolle.abklingzeit).toBe(1.2);
    expect(ZAUBER.ausweichrolle.unverwundbar).toBeLessThanOrEqual(ZAUBER.ausweichrolle.dauer);
  });

  it('Feuerball ist ein Geschoss mit Brennen, Frostnova eine Fläche mit Einfrieren', () => {
    expect(ZAUBER.feuerball.form).toBe('geschoss');
    expect(ZAUBER.feuerball.element).toBe('feuer');
    expect(ZAUBER.feuerball.effekt.art).toBe('brennen');
    expect(ZAUBER.feuerball.geschosstempo).toBeGreaterThan(0);
    expect(ZAUBER.frostnova.form).toBe('flaeche');
    expect(ZAUBER.frostnova.element).toBe('frost');
    expect(ZAUBER.frostnova.effekt.art).toBe('einfrieren');
    for (const zauber of Object.values(ZAUBER)) {
      expect(zauber.manakosten).toBeGreaterThanOrEqual(0);
      expect(zauber.abklingzeit).toBeGreaterThan(0);
    }
  });

  it('Gegnerwerte sind positiv und das Irrlicht schießt aus der Ferne', () => {
    for (const gegner of Object.values(GEGNER)) {
      expect(gegner.leben, gegner.id).toBeGreaterThan(0);
      expect(gegner.schaden, gegner.id).toBeGreaterThan(0);
      expect(gegner.tempo, gegner.id).toBeGreaterThan(gegner.gehtempo);
      expect(gegner.sichtweite, gegner.id).toBeGreaterThan(gegner.angriffsreichweite);
      expect(gegner.ep, gegner.id).toBeGreaterThan(0);
      expect(gegner.ki.length, gegner.id).toBeGreaterThan(0);
      expect(gegner.beute.length, gegner.id).toBeGreaterThan(0);
    }
    expect(GEGNER.irrlicht.angriffsreichweite).toBeGreaterThan(8);
    expect(GEGNER.irrlicht.fernkampf.geschosstempo).toBeGreaterThan(0);
    expect(GEGNER.warg.ansturm.tempo).toBeGreaterThan(GEGNER.warg.tempo);
    expect(GEGNER.warg.leben).toBeGreaterThan(GEGNER.wolf.leben);
    expect(GEGNER.grimmzahn.leben).toBeGreaterThan(GEGNER.warg.leben * 4);
  });

  it('Grimmzahn: Rudelruf bei 66 % und 33 %, Raserei unter 25 %', () => {
    const phasen = GEGNER.grimmzahn.boss.phasen;
    expect(phasen.map((p) => [p.phase, p.lebenAnteil, p.angriff])).toEqual([
      [2, 0.66, 'rudelruf'],
      [3, 0.33, 'rudelruf'],
      [4, 0.25, 'raserei'],
    ]);
    const angriffe = GEGNER.grimmzahn.boss.angriffe;
    expect(Object.keys(angriffe).sort()).toEqual(
      ['prankenhieb', 'rudelruf', 'raserei', 'sprungangriff'].sort(),
    );
    for (const art of angriffe.rudelruf.gegner) expect(GEGNER).toHaveProperty(art.art);
    expect(angriffe.raserei.tempoFaktor).toBeGreaterThan(1);
    expect(angriffe.prankenhieb.ankuendigung).toBeGreaterThan(0.5);
    expect(angriffe.sprungangriff.ankuendigung).toBeGreaterThan(0.5);
  });
});

describe('Quest und Fortschritt', () => {
  it('die Hauptquest hat fünf Schritte mit eindeutigen Kennungen', () => {
    expect(QUEST.id).toBe('schriftrolle');
    expect(QUEST.schritte).toHaveLength(5);
    const ids = QUEST.schritte.map((s) => s.id);
    expect(new Set(ids).size).toBe(5);
    expect(QUEST.start).toEqual({ ereignis: 'interaktion:ausgeloest', objektId: 'schriftrolle' });
    expect(QUEST.schritte[4]?.ausloeser).toEqual({ ereignis: 'gegner:besiegt', art: 'grimmzahn' });
  });

  it('Stufen 1 bis 4 wachsen in allen Werten', () => {
    expect(STUFEN.map((s) => s.stufe)).toEqual([1, 2, 3, 4]);
    expect(STUFEN[0]?.epSchwelle).toBe(0);
    for (let i = 1; i < STUFEN.length; i++) {
      const vorher = STUFEN[i - 1];
      const jetzt = STUFEN[i];
      if (vorher === undefined || jetzt === undefined) throw new Error('Stufe fehlt');
      expect(jetzt.epSchwelle).toBeGreaterThan(vorher.epSchwelle);
      expect(jetzt.leben).toBeGreaterThan(vorher.leben);
      expect(jetzt.mana).toBeGreaterThan(vorher.mana);
      expect(jetzt.zauberkraft).toBeGreaterThan(vorher.zauberkraft);
    }
  });

  it('EP-Bilanz: Stufe 4 wird erst mit dem Sieg über Grimmzahn erreicht', () => {
    const epGegner = (art: keyof typeof GEGNER): number => GEGNER[art].ep;
    const epBegegnung = (id: keyof typeof BEGEGNUNGEN): number =>
      BEGEGNUNGEN[id].wellen.flat().reduce((summe, g) => summe + epGegner(g.art) * g.anzahl, 0);
    const questEp = QUEST.schritte.reduce(
      (summe, s) =>
        summe + (('belohnung' in s && 'ep' in s.belohnung ? s.belohnung.ep : 0) as number),
      0,
    );
    const vorDemBoss =
      epBegegnung('kampf1') + epBegegnung('kampf2') + epBegegnung('kampf3') + questEp;
    const gesamt = vorDemBoss + epBegegnung('boss');
    const schwelle = (stufe: number): number => STUFEN[stufe - 1]?.epSchwelle ?? Infinity;

    expect(vorDemBoss).toBeGreaterThanOrEqual(schwelle(3));
    expect(vorDemBoss).toBeLessThan(schwelle(4));
    expect(gesamt).toBeGreaterThanOrEqual(schwelle(4));
    // Stufe 2 fällt in Kampf 1, Stufe 3 spätestens in Kampf 3.
    expect(epBegegnung('kampf1') + 10).toBeGreaterThanOrEqual(schwelle(2));
    expect(epBegegnung('kampf1') + epBegegnung('kampf2') + 10).toBeLessThan(schwelle(3));
  });

  it('die Fähigkeiten des Spielers reichen für die Gegner: Ein Feuerball erlegt Wölfe in zwei Treffern', () => {
    const stufe1 = STUFEN[0];
    const holz = HOELZER.buche;
    const mittlereZauberkraft =
      (stufe1?.zauberkraft ?? 0) + (holz.zauberkraft[0] + holz.zauberkraft[1]) / 2;
    const treffer =
      ZAUBER.feuerball.schaden.basis +
      ZAUBER.feuerball.schaden.zauberkraftFaktor * mittlereZauberkraft;
    expect(treffer * 2).toBeGreaterThanOrEqual(GEGNER.wolf.leben);
    expect(treffer).toBeLessThan(GEGNER.wolf.leben);
    // Der Feuerball ist bezahlbar: mindestens fünf Würfe aus dem vollen Manavorrat.
    expect((stufe1?.mana ?? 0) / ZAUBER.feuerball.manakosten).toBeGreaterThanOrEqual(5);
  });

  it('Gebietsname ist Wildholz, Dorf und Berge sind gesperrt', () => {
    expect(GEBIET.nameSchluessel).toBe('gebiet.wildholz.name');
    expect(t(GEBIET.nameSchluessel)).toBe('Wildholz');
    expect(t(REGIONEN.erlengrund.nameSchluessel)).toBe('Erlengrund');
    expect(t(REGIONEN['grauzahn-pass'].nameSchluessel)).toBe('Grauzahn-Pass');
    expect(t(GEGNER.grimmzahn.nameSchluessel)).toBe('Grimmzahn');
  });

  it('Tränke wirken sofort und passen zu den Tasten', () => {
    expect(TRANKE.leben.aktion).toBe('trank-1');
    expect(TRANKE.mana.aktion).toBe('trank-2');
    expect(TRANKE.leben.ressource).toBe('leben');
    expect(TRANKE.mana.ressource).toBe('mana');
    expect(TRANKE.leben.menge).toBeGreaterThan(0);
  });
});
