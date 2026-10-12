/**
 * Endgültige Werte eines Zauberstabs (Aufgabe 1.5).
 *
 * `berechneWerte` ist rein: gleicher Stab, gleiche Werte, nichts wird verändert.
 *
 * - **Zauberkraft** = Holz-Spanne × Stufenfaktor × Güte, dann plus flache
 *   Zuschläge, dann mal (1 + Prozentzuschläge). Der Zauberer bringt seine eigene
 *   Zauberkraft mit (`fortschritt.ts`); beides zusammen steht im Schadenswurf
 *   (`zauber.ts`).
 * - **Zaubertempo** (Zauber pro Sekunde) = Länge × Holz × Zuschläge.
 * - **Reichweite** in Metern = Länge × Zuschläge.
 * - **Mana** = Mana des Holzes (nach Stufe) plus Affixe.
 * - **Wirkungen**: Summe aller Affixwerte inklusive des Kerneffekts je Wirkungsart.
 *   Wer sie anwendet (Kampf, Zauber), liest sie von dort.
 */
import { AFFIXE, WIRKUNGS_ARTEN } from '@content/affixe';
import {
  HOELZER,
  KERNE,
  LAENGEN,
  MANA_STUFENFAKTOR,
  ZAUBERKRAFT_STUFENFAKTOR,
} from '@content/zauberstaebe';
import type {
  Affix,
  FesterAffix,
  Laenge,
  Reichweite,
  WirkungsArt,
  Zauberstab,
} from '@content/typen';
import { t } from '@engine/index';

export interface StabWerte {
  /** Untere Grenze der Zauberkraft, ganzzahlig. */
  zauberkraftMin: number;
  /** Obere Grenze der Zauberkraft, ganzzahlig, nie kleiner als die untere. */
  zauberkraftMax: number;
  /** Zauber pro Sekunde, auf zwei Stellen gerundet. */
  zaubertempo: number;
  /** Zielreichweite in Metern, auf eine Stelle gerundet. */
  reichweite: number;
  /** Klasse der Länge: kurz, mittel oder lang. */
  reichweiteKlasse: Reichweite;
  /** Mana, das der Stab zum Maximum des Zauberers beiträgt. */
  maximalesMana: number;
  /** Summe aller Wirkungen (Kerneffekt und Affixe). 0, wo nichts wirkt. */
  wirkungen: Readonly<Record<WirkungsArt, number>>;
  /** Alle Affixe zur Anzeige: erst der Kerneffekt, dann die Zusatzaffixe. */
  affixe: readonly Affix[];
}

/** Wert aus einer Tabelle je Stufe (Index 0 = Stufe 1), darüber gilt der letzte Eintrag. */
export function tabellenWert(tabelle: readonly number[], stufe: number): number {
  const index = Math.min(Math.max(Math.floor(stufe), 1), tabelle.length) - 1;
  return tabelle[index] ?? 1;
}

/** Der übersetzte Text eines Affixes mit eingesetztem Wert. */
export function formatiereAffix(affixId: Affix['id'], wert: number): string {
  const vorlage = AFFIXE[affixId];
  const schluessel =
    wert === 1 && 'textEinzahlSchluessel' in vorlage
      ? vorlage.textEinzahlSchluessel
      : vorlage.textSchluessel;
  return t(schluessel, { wert });
}

/** Macht aus einem festen Affix (Kerneffekt, einzigartiger Stab) ein Affix mit Text. */
export function baueFestesAffix(fest: FesterAffix): Affix {
  return {
    id: fest.affix,
    text: formatiereAffix(fest.affix, fest.wert),
    wirkung: { art: AFFIXE[fest.affix].art, wert: fest.wert },
  };
}

/** Der Kerneffekt des Stabs als Affix mit Text. */
export function kernAffix(stab: Pick<Zauberstab, 'kern'>): Affix {
  return baueFestesAffix(KERNE[stab.kern].effekt);
}

/** Die Länge aus der Tabelle. Unbekannte Längen werden auf die nächste gerundet. */
export function findeLaenge(zoll: number): Laenge {
  let beste: Laenge = LAENGEN[0];
  for (const kandidat of LAENGEN) {
    if (Math.abs(kandidat.zoll - zoll) < Math.abs(beste.zoll - zoll)) beste = kandidat;
  }
  return beste;
}

function runde(wert: number, stellen: number): number {
  const faktor = 10 ** stellen;
  return Math.round(wert * faktor) / faktor;
}

export function berechneWerte(stab: Zauberstab): StabWerte {
  const holz = HOELZER[stab.holz];
  const laenge = findeLaenge(stab.laenge);
  const kern = kernAffix(stab);

  const wirkungen = Object.fromEntries(WIRKUNGS_ARTEN.map((art) => [art, 0])) as Record<
    WirkungsArt,
    number
  >;
  for (const affix of [kern, ...stab.affixe]) {
    wirkungen[affix.wirkung.art] += affix.wirkung.wert;
  }

  const kraftFaktor = tabellenWert(ZAUBERKRAFT_STUFENFAKTOR, stab.stufe) * stab.guete;
  const flach = wirkungen['zauberkraft-flach'];
  const prozent = 1 + wirkungen['zauberkraft-prozent'] / 100;
  const zauberkraftMin = Math.max(
    0,
    Math.round((holz.zauberkraft[0] * kraftFaktor + flach) * prozent),
  );
  const zauberkraftMax = Math.max(
    zauberkraftMin,
    Math.round((holz.zauberkraft[1] * kraftFaktor + flach) * prozent),
  );

  const zaubertempo = runde(
    laenge.tempo * holz.tempo * (1 + wirkungen['zaubertempo-prozent'] / 100),
    2,
  );
  const reichweite = runde(laenge.reichweiteMeter * (1 + wirkungen['reichweite-prozent'] / 100), 1);
  const maximalesMana = Math.round(
    holz.mana * tabellenWert(MANA_STUFENFAKTOR, stab.stufe) + wirkungen['maximales-mana'],
  );

  return {
    zauberkraftMin,
    zauberkraftMax,
    zaubertempo,
    reichweite,
    reichweiteKlasse: laenge.reichweite,
    maximalesMana,
    wirkungen,
    affixe: [kern, ...stab.affixe],
  };
}
