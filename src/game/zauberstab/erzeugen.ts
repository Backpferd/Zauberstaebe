/**
 * Zauberstab-Generator, das Herz des Beute-Systems (Aufgabe 1.5).
 *
 * `erzeugeZauberstab(zufall, { stufe, seltenheit? })` ist deterministisch: Mit
 * demselben Zufallsstrom entsteht derselbe Stab. Übergeben wird am besten ein
 * eigener Strom, z. B. `welt.zufall.abzweig('beute')`.
 *
 * Ablauf:
 * 1. Seltenheit würfeln (nach Gewichten), falls nicht vorgegeben.
 * 2. Einzigartig: fester Stab aus den Daten. Sonst Holz, Kern und Länge würfeln;
 *    mit 25 % Wahrscheinlichkeit kommt ein Paar aus der `Zauberstabliste`.
 * 3. Zusatzaffixe nach Seltenheit würfeln. Seltene Stäbe bekommen mindestens
 *    ein Präfix und ein Suffix (daraus entsteht ihr Name).
 * 4. Name und Beschreibung aus Textbausteinen zusammensetzen.
 *
 * Alle Texte kommen über `t()`, es steht kein deutscher Satz im Code.
 */
import { AFFIX_LISTE, AFFIXE } from '@content/affixe';
import { SELTENHEITEN, SELTENHEIT_REIHENFOLGE } from '@content/seltenheiten';
import {
  BESCHREIBUNG_EINLEITUNGEN,
  EINZIGARTIGE,
  GUETE_SPANNE,
  HOELZER,
  KERNE,
  LAENGEN,
  STAB_LISTE,
  STAB_LISTE_CHANCE,
} from '@content/zauberstaebe';
import type {
  Affix,
  AffixVorlage,
  EinzigartigId,
  HolzId,
  KernId,
  Seltenheit,
  Zauberstab,
} from '@content/typen';
import { t, type Zufall } from '@engine/index';
import { baueFestesAffix, formatiereAffix } from './werte';

export interface StabOptionen {
  /** Stufe der Beute (bei Gebiet 1: 1 bis 4). Wird zur benötigten Stufe des Stabs. */
  stufe: number;
  /** Vorgegebene Seltenheit. Ohne Angabe wird nach Gewichten gewürfelt. */
  seltenheit?: Seltenheit;
}

const HOLZ_IDS = Object.keys(HOELZER) as HolzId[];
const KERN_IDS = Object.keys(KERNE) as KernId[];
const EINZIGARTIG_IDS = Object.keys(EINZIGARTIGE) as EinzigartigId[];

/** Würfelt aus Einträgen mit Gewichten (Gewicht 0 kommt nie vor). */
function waehleGewichtet<T>(zufall: Zufall, eintraege: readonly T[], gewicht: (e: T) => number): T {
  const summe = eintraege.reduce((s, e) => s + gewicht(e), 0);
  let rest = zufall.zahl() * summe;
  let letzter: T | undefined;
  for (const eintrag of eintraege) {
    const g = gewicht(eintrag);
    if (g <= 0) continue;
    letzter = eintrag;
    rest -= g;
    if (rest < 0) return eintrag;
  }
  if (letzter === undefined) throw new RangeError('waehleGewichtet: Alle Gewichte sind 0.');
  return letzter;
}

/** Würfelt eine Seltenheit nach den Gewichten aus `seltenheiten.ts`. */
export function wuerfleSeltenheit(zufall: Zufall): Seltenheit {
  return waehleGewichtet(zufall, SELTENHEIT_REIHENFOLGE, (s) => SELTENHEITEN[s].gewicht);
}

function hexZeichen(zufall: Zufall): string {
  return zufall.ganzzahl(0, 0xffffffff).toString(16).padStart(8, '0');
}

/** Würfelt den Wert eines Affixes in der Spanne der Stufe. */
function wuerfleWert(zufall: Zufall, vorlage: AffixVorlage, stufe: number): number {
  const index = Math.min(stufe, vorlage.spannen.length) - 1;
  const [min, max] = vorlage.spannen[index] ??
    vorlage.spannen[vorlage.spannen.length - 1] ?? [0, 0];
  if (vorlage.nachkomma === 0) return zufall.ganzzahl(min, max);
  return zufall.ganzzahl(Math.round(min * 10), Math.round(max * 10)) / 10;
}

function baueAffix(vorlage: AffixVorlage, wert: number): Affix {
  return {
    id: vorlage.id,
    text: formatiereAffix(vorlage.id, wert),
    wirkung: { art: vorlage.art, wert },
  };
}

/** Würfelt `anzahl` verschiedene Affixe. `mitPaar`: mindestens ein Präfix und ein Suffix. */
function wuerfleAffixe(
  zufall: Zufall,
  anzahl: number,
  stufe: number,
  kernArt: AffixVorlage['art'],
  mitPaar: boolean,
): Affix[] {
  const moeglich = AFFIX_LISTE.filter((a) => a.mindestStufe <= stufe && a.art !== kernArt);
  const gewaehlt: AffixVorlage[] = [];

  const ziehe = (aus: readonly AffixVorlage[]): void => {
    const frei = aus.filter((a) => !gewaehlt.some((g) => g.art === a.art));
    gewaehlt.push(waehleGewichtet(zufall, frei, (a) => a.gewicht));
  };

  if (mitPaar && anzahl >= 2) {
    ziehe(moeglich.filter((a) => a.platz === 'praefix'));
    ziehe(moeglich.filter((a) => a.platz === 'suffix'));
  }
  while (gewaehlt.length < anzahl) ziehe(moeglich);

  // Präfixe zuerst, wie im Inventar üblich. Die Reihenfolge der Würfe bleibt unberührt.
  const geordnet = [...gewaehlt].sort(
    (a, b) => Number(a.platz === 'suffix') - Number(b.platz === 'suffix'),
  );
  return geordnet.map((vorlage) => baueAffix(vorlage, wuerfleWert(zufall, vorlage, stufe)));
}

/** Name nach Seltenheit: „Eichenstab“, „Glühender Birkenstab“, „Glutdorn · Eichenstab“. */
function baueName(holz: HolzId, seltenheit: Seltenheit, affixe: readonly Affix[]): string {
  const stab = t(HOELZER[holz].stabSchluessel);
  if (seltenheit === 'gewoehnlich' || affixe.length === 0) return stab;

  const vorlagen = affixe.map((a) => AFFIXE[a.id]);
  const praefix = vorlagen.find((v) => v.platz === 'praefix');
  const suffix = vorlagen.find((v) => v.platz === 'suffix');

  if (seltenheit === 'selten' && praefix !== undefined && suffix !== undefined) {
    return t('stab.name.selten', {
      praefix: t(praefix.wortSchluessel),
      suffix: t(suffix.wortSchluessel),
      stab,
    });
  }
  if (praefix !== undefined && suffix !== undefined) {
    return t('stab.name.magisch.beides', {
      adjektiv: t(praefix.nameSchluessel),
      stab,
      genitiv: t(suffix.nameSchluessel),
    });
  }
  if (praefix !== undefined) {
    return t('stab.name.magisch.praefix', { adjektiv: t(praefix.nameSchluessel), stab });
  }
  if (suffix !== undefined) {
    return t('stab.name.magisch.suffix', { stab, genitiv: t(suffix.nameSchluessel) });
  }
  return stab;
}

/** Satz der Zauberstabliste, falls das Paar dort steht, sonst aus Charakterzügen gebaut. */
function baueBeschreibung(zufall: Zufall, holz: HolzId, kern: KernId): string {
  const aus = STAB_LISTE.find((eintrag) => eintrag.holz === holz && eintrag.kern === kern);
  if (aus !== undefined) return t(aus.satzSchluessel);
  return t('stab.satz', {
    einleitung: t(zufall.waehle(BESCHREIBUNG_EINLEITUNGEN)),
    zug1: t(zufall.waehle(HOELZER[holz].zuege)),
    zug2: t(zufall.waehle(KERNE[kern].zuege)),
  });
}

function erzeugeEinzigartig(zufall: Zufall, id: string): Zauberstab {
  const daten = EINZIGARTIGE[zufall.waehle(EINZIGARTIG_IDS)];
  return {
    id: `${daten.id}-${id}`,
    name: t(daten.nameSchluessel),
    holz: daten.holz,
    kern: daten.kern,
    laenge: daten.laenge,
    seltenheit: 'einzigartig',
    affixe: daten.affixe.map(baueFestesAffix),
    beschreibung: t(daten.beschreibungSchluessel),
    stufe: daten.stufe,
    guete: daten.guete,
  };
}

/**
 * Erzeugt einen Zauberstab. Deterministisch: gleicher Zufallsstrom, gleicher Stab.
 *
 * `stufe` unter 1 wird zu 1. Die Wertspannen der Affixe gelten bis Stufe 4,
 * höhere Stufen nutzen die Spannen der Stufe 4.
 */
export function erzeugeZauberstab(zufall: Zufall, optionen: StabOptionen): Zauberstab {
  const stufe = Number.isFinite(optionen.stufe) ? Math.max(1, Math.floor(optionen.stufe)) : 1;
  const kennung = `${hexZeichen(zufall)}${hexZeichen(zufall)}`;
  const seltenheit = optionen.seltenheit ?? wuerfleSeltenheit(zufall);

  if (seltenheit === 'einzigartig') return erzeugeEinzigartig(zufall, kennung);

  let holz: HolzId;
  let kern: KernId;
  if (zufall.zahl() < STAB_LISTE_CHANCE) {
    const eintrag = zufall.waehle(STAB_LISTE);
    holz = eintrag.holz;
    kern = eintrag.kern;
  } else {
    holz = zufall.waehle(HOLZ_IDS);
    kern = zufall.waehle(KERN_IDS);
  }
  const laenge = zufall.waehle(LAENGEN).zoll;
  const guete = Math.round(zufall.bereich(GUETE_SPANNE[0], GUETE_SPANNE[1]) * 100) / 100;

  const [min, max] = SELTENHEITEN[seltenheit].zusatzaffixe;
  const anzahl = zufall.ganzzahl(min, max);
  const kernArt = AFFIXE[KERNE[kern].effekt.affix].art;
  const affixe = wuerfleAffixe(zufall, anzahl, stufe, kernArt, seltenheit === 'selten');

  return {
    id: `${holz}-${kern}-${kennung}`,
    name: baueName(holz, seltenheit, affixe),
    holz,
    kern,
    laenge,
    seltenheit,
    affixe,
    beschreibung: baueBeschreibung(zufall, holz, kern),
    stufe,
    guete,
  };
}
