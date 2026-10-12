/**
 * Namen und Beschreibungen von Gebiet 1: Wildholz, die Regionen Erlengrund und
 * Grauzahn-Pass sowie alle benannten Orte (`OrtId` in `src/world/vertraege.ts`).
 *
 * Nur Textschlüssel und Flags. Wo die Orte liegen, entscheidet die Welt (1.2).
 */
import type {
  OrtDaten,
  OrtKennung,
  RegionDaten,
  RegionId,
  WegweiserArm,
  WegweiserDaten,
} from './typen';

export const GEBIET = {
  id: 'wildholz',
  nameSchluessel: 'gebiet.wildholz.name',
  beschreibungSchluessel: 'gebiet.wildholz.beschreibung',
} as const;

export const REGIONEN = {
  wildholz: {
    nameSchluessel: 'gebiet.wildholz.name',
    beschreibungSchluessel: 'gebiet.wildholz.beschreibung',
    zugaenglich: true,
  },
  erlengrund: {
    nameSchluessel: 'gebiet.erlengrund.name',
    beschreibungSchluessel: 'gebiet.erlengrund.beschreibung',
    zugaenglich: false,
  },
  'grauzahn-pass': {
    nameSchluessel: 'gebiet.grauzahn-pass.name',
    beschreibungSchluessel: 'gebiet.grauzahn-pass.beschreibung',
    zugaenglich: false,
  },
} as const satisfies Record<RegionId, RegionDaten>;

export const ORTE = {
  start: {
    nameSchluessel: 'ort.start.name',
    beschreibungSchluessel: 'ort.start.beschreibung',
  },
  lagerfeuer: {
    nameSchluessel: 'ort.lagerfeuer.name',
    beschreibungSchluessel: 'ort.lagerfeuer.beschreibung',
    hinweisSchluessel: 'interaktion.lagerfeuer.hinweis',
  },
  zelt: {
    nameSchluessel: 'ort.zelt.name',
    beschreibungSchluessel: 'ort.zelt.beschreibung',
  },
  schriftrolle: {
    nameSchluessel: 'ort.schriftrolle.name',
    beschreibungSchluessel: 'ort.schriftrolle.beschreibung',
    hinweisSchluessel: 'interaktion.schriftrolle.hinweis',
  },
  wegekreuz: {
    nameSchluessel: 'ort.wegekreuz.name',
    beschreibungSchluessel: 'ort.wegekreuz.beschreibung',
  },
  wegweiser: {
    nameSchluessel: 'ort.wegweiser.name',
    beschreibungSchluessel: 'ort.wegweiser.beschreibung',
    hinweisSchluessel: 'interaktion.wegweiser.hinweis',
  },
  bruecke: {
    nameSchluessel: 'ort.bruecke.name',
    beschreibungSchluessel: 'ort.bruecke.beschreibung',
    sperreSchluessel: 'sperre.bruecke',
  },
  erdrutsch: {
    nameSchluessel: 'ort.erdrutsch.name',
    beschreibungSchluessel: 'ort.erdrutsch.beschreibung',
    sperreSchluessel: 'sperre.erdrutsch',
  },
  kampf1: {
    nameSchluessel: 'ort.kampf1.name',
    beschreibungSchluessel: 'ort.kampf1.beschreibung',
  },
  kampf2: {
    nameSchluessel: 'ort.kampf2.name',
    beschreibungSchluessel: 'ort.kampf2.beschreibung',
  },
  kampf3: {
    nameSchluessel: 'ort.kampf3.name',
    beschreibungSchluessel: 'ort.kampf3.beschreibung',
  },
  truhe: {
    nameSchluessel: 'ort.truhe.name',
    beschreibungSchluessel: 'ort.truhe.beschreibung',
    hinweisSchluessel: 'interaktion.truhe.hinweis',
  },
  'arena-eingang': {
    nameSchluessel: 'ort.arena-eingang.name',
    beschreibungSchluessel: 'ort.arena-eingang.beschreibung',
    sperreSchluessel: 'sperre.arena',
  },
  bosslichtung: {
    nameSchluessel: 'ort.bosslichtung.name',
    beschreibungSchluessel: 'ort.bosslichtung.beschreibung',
  },
} as const satisfies Record<OrtKennung, OrtDaten>;

/** Die drei Arme des Wegweisers am Wegekreuz. */
export const WEGWEISER = {
  dorf: {
    ziel: 'erlengrund',
    nameSchluessel: 'wegweiser.dorf.name',
    schildSchluessel: 'wegweiser.dorf.schild',
    gesperrt: true,
    sperrgrundSchluessel: 'wegweiser.dorf.gesperrt',
  },
  berge: {
    ziel: 'grauzahn-pass',
    nameSchluessel: 'wegweiser.berge.name',
    schildSchluessel: 'wegweiser.berge.schild',
    gesperrt: true,
    sperrgrundSchluessel: 'wegweiser.berge.gesperrt',
  },
  wald: {
    ziel: 'wildholz',
    nameSchluessel: 'wegweiser.wald.name',
    schildSchluessel: 'wegweiser.wald.schild',
    gesperrt: false,
  },
} as const satisfies Record<WegweiserArm, WegweiserDaten>;
