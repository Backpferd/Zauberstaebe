/**
 * Zauberstäbe: Hölzer, Kerne, Längen und die Stäbe der `Zauberstabliste`.
 *
 * - **Holz** bestimmt die Grundwerte (Zauberkraft-Spanne, Mana) und das Tempo.
 * - **Kern** liefert einen festen Spezialeffekt (immer vorhanden, auch bei
 *   gewöhnlichen Stäben).
 * - **Länge** (10 bis 14 Zoll in halben Zoll) bestimmt Tempo und Reichweite:
 *   kurz = schnell und kurze Reichweite, lang = langsam und weite Reichweite.
 *
 * Wie daraus Werte werden, rechnet `src/game/zauberstab/werte.ts`.
 */
import type {
  EinzigartigerStab,
  EinzigartigId,
  Holz,
  HolzId,
  Kern,
  KernId,
  Laenge,
  ListenStab,
} from './typen';

export const HOELZER = {
  buche: {
    id: 'buche',
    nameSchluessel: 'stab.holz.buche',
    stabSchluessel: 'stab.holz.buche.stab',
    charakterSchluessel: 'stab.holz.buche.charakter',
    zauberkraft: [7, 11],
    mana: 30,
    tempo: 1.0,
    zuege: ['stab.zug.klugheit', 'stab.zug.besonnenheit'],
  },
  ahorn: {
    id: 'ahorn',
    nameSchluessel: 'stab.holz.ahorn',
    stabSchluessel: 'stab.holz.ahorn.stab',
    charakterSchluessel: 'stab.holz.ahorn.charakter',
    zauberkraft: [6, 10],
    mana: 40,
    tempo: 1.05,
    zuege: ['stab.zug.reinheit', 'stab.zug.ehrlichkeit'],
  },
  pappel: {
    id: 'pappel',
    nameSchluessel: 'stab.holz.pappel',
    stabSchluessel: 'stab.holz.pappel.stab',
    charakterSchluessel: 'stab.holz.pappel.charakter',
    zauberkraft: [6, 9],
    mana: 45,
    tempo: 1.0,
    zuege: ['stab.zug.weisheit', 'stab.zug.geduld'],
  },
  eiche: {
    id: 'eiche',
    nameSchluessel: 'stab.holz.eiche',
    stabSchluessel: 'stab.holz.eiche.stab',
    charakterSchluessel: 'stab.holz.eiche.charakter',
    zauberkraft: [11, 17],
    mana: 20,
    tempo: 0.85,
    zuege: ['stab.zug.staerke', 'stab.zug.standhaftigkeit'],
  },
  kastanie: {
    id: 'kastanie',
    nameSchluessel: 'stab.holz.kastanie',
    stabSchluessel: 'stab.holz.kastanie.stab',
    charakterSchluessel: 'stab.holz.kastanie.charakter',
    zauberkraft: [8, 13],
    mana: 26,
    tempo: 1.0,
    zuege: ['stab.zug.leidenschaft', 'stab.zug.lebensfreude'],
  },
  zypresse: {
    id: 'zypresse',
    nameSchluessel: 'stab.holz.zypresse',
    stabSchluessel: 'stab.holz.zypresse.stab',
    charakterSchluessel: 'stab.holz.zypresse.charakter',
    zauberkraft: [9, 14],
    mana: 22,
    tempo: 0.95,
    zuege: ['stab.zug.mut', 'stab.zug.ernst'],
  },
  birke: {
    id: 'birke',
    nameSchluessel: 'stab.holz.birke',
    stabSchluessel: 'stab.holz.birke.stab',
    charakterSchluessel: 'stab.holz.birke.charakter',
    zauberkraft: [4, 7],
    mana: 28,
    tempo: 1.2,
    zuege: ['stab.zug.intelligenz', 'stab.zug.neugier'],
  },
  esche: {
    id: 'esche',
    nameSchluessel: 'stab.holz.esche',
    stabSchluessel: 'stab.holz.esche.stab',
    charakterSchluessel: 'stab.holz.esche.charakter',
    zauberkraft: [8, 12],
    mana: 26,
    tempo: 1.1,
    zuege: ['stab.zug.durchsetzungsvermoegen', 'stab.zug.zielstrebigkeit'],
  },
  kiefer: {
    id: 'kiefer',
    nameSchluessel: 'stab.holz.kiefer',
    stabSchluessel: 'stab.holz.kiefer.stab',
    charakterSchluessel: 'stab.holz.kiefer.charakter',
    zauberkraft: [9, 13],
    mana: 18,
    tempo: 1.0,
    zuege: ['stab.zug.mut', 'stab.zug.ausdauer'],
  },
  ulme: {
    id: 'ulme',
    nameSchluessel: 'stab.holz.ulme',
    stabSchluessel: 'stab.holz.ulme.stab',
    charakterSchluessel: 'stab.holz.ulme.charakter',
    zauberkraft: [7, 12],
    mana: 36,
    tempo: 0.9,
    zuege: ['stab.zug.durchhaltevermoegen', 'stab.zug.treue'],
  },
} as const satisfies Record<HolzId, Holz>;

export const KERNE = {
  eulenfeder: {
    id: 'eulenfeder',
    nameSchluessel: 'stab.kern.eulenfeder',
    effekt: { affix: 'reichweite', wert: 12 },
    zuege: ['stab.zug.weitsicht', 'stab.zug.wachsamkeit'],
  },
  einhornhaar: {
    id: 'einhornhaar',
    nameSchluessel: 'stab.kern.einhornhaar',
    effekt: { affix: 'lebensregeneration', wert: 1.5 },
    zuege: ['stab.zug.tapferkeit', 'stab.zug.mitgefuehl'],
  },
  zentaurenhaar: {
    id: 'zentaurenhaar',
    nameSchluessel: 'stab.kern.zentaurenhaar',
    effekt: { affix: 'ausweichrolle-strecke', wert: 25 },
    zuege: ['stab.zug.gerechtigkeitsgefuehl', 'stab.zug.freiheitsdrang'],
  },
  adlerfeder: {
    id: 'adlerfeder',
    nameSchluessel: 'stab.kern.adlerfeder',
    effekt: { affix: 'geschossgeschwindigkeit', wert: 25 },
    zuege: ['stab.zug.integritaet', 'stab.zug.scharfsinn'],
  },
  widdersporn: {
    id: 'widdersporn',
    nameSchluessel: 'stab.kern.widdersporn',
    effekt: { affix: 'feuerschaden', wert: 15 },
    zuege: ['stab.zug.kreativitaet', 'stab.zug.tatendrang'],
  },
  basiliskenhaut: {
    id: 'basiliskenhaut',
    nameSchluessel: 'stab.kern.basiliskenhaut',
    effekt: { affix: 'einfrieren-dauer', wert: 25 },
    zuege: ['stab.zug.entschlossenheit', 'stab.zug.gelassenheit'],
  },
  spinnenfeder: {
    id: 'spinnenfeder',
    nameSchluessel: 'stab.kern.spinnenfeder',
    effekt: { affix: 'ausweichrolle-abklingzeit', wert: 15 },
    zuege: ['stab.zug.beweglichkeit', 'stab.zug.geschick'],
  },
  basiliskenklaue: {
    id: 'basiliskenklaue',
    nameSchluessel: 'stab.kern.basiliskenklaue',
    effekt: { affix: 'kritische-trefferchance', wert: 6 },
    zuege: ['stab.zug.entschlossenheit', 'stab.zug.haerte'],
  },
  wargzahn: {
    id: 'wargzahn',
    nameSchluessel: 'stab.kern.wargzahn',
    effekt: { affix: 'schaden-gegen-tiere', wert: 20 },
    zuege: ['stab.zug.unerschrockenheit', 'stab.zug.jagdgeist'],
  },
  minotaurhorn: {
    id: 'minotaurhorn',
    nameSchluessel: 'stab.kern.minotaurhorn',
    effekt: { affix: 'maximales-leben', wert: 35 },
    zuege: ['stab.zug.willensstaerke', 'stab.zug.zorn'],
  },
} as const satisfies Record<KernId, Kern>;

/** Neun Längen von 10 bis 14 Zoll in halben Zoll. Kurz = schnell, lang = weit. */
export const LAENGEN = [
  { zoll: 10, tempo: 1.3, reichweite: 'kurz', reichweiteMeter: 8.0 },
  { zoll: 10.5, tempo: 1.25, reichweite: 'kurz', reichweiteMeter: 8.9 },
  { zoll: 11, tempo: 1.2, reichweite: 'kurz', reichweiteMeter: 9.8 },
  { zoll: 11.5, tempo: 1.15, reichweite: 'mittel', reichweiteMeter: 10.6 },
  { zoll: 12, tempo: 1.1, reichweite: 'mittel', reichweiteMeter: 11.5 },
  { zoll: 12.5, tempo: 1.05, reichweite: 'mittel', reichweiteMeter: 12.4 },
  { zoll: 13, tempo: 1.0, reichweite: 'lang', reichweiteMeter: 13.3 },
  { zoll: 13.5, tempo: 0.95, reichweite: 'lang', reichweiteMeter: 14.1 },
  { zoll: 14, tempo: 0.9, reichweite: 'lang', reichweiteMeter: 15.0 },
] as const satisfies readonly Laenge[];

/**
 * Die zehn Stäbe der `Zauberstabliste`. Für diese Holz-Kern-Paare steht als
 * Beschreibung der Originalsatz, für alle anderen setzt der Generator einen
 * Satz aus Charakterzügen zusammen. Die Länge ist die der Liste, der Generator
 * würfelt sie aber unabhängig davon.
 */
export const STAB_LISTE = [
  { holz: 'buche', kern: 'eulenfeder', zoll: 11, satzSchluessel: 'stab.liste.buche-eulenfeder' },
  {
    holz: 'ahorn',
    kern: 'einhornhaar',
    zoll: 10.5,
    satzSchluessel: 'stab.liste.ahorn-einhornhaar',
  },
  {
    holz: 'pappel',
    kern: 'zentaurenhaar',
    zoll: 12,
    satzSchluessel: 'stab.liste.pappel-zentaurenhaar',
  },
  { holz: 'eiche', kern: 'adlerfeder', zoll: 14, satzSchluessel: 'stab.liste.eiche-adlerfeder' },
  {
    holz: 'kastanie',
    kern: 'widdersporn',
    zoll: 11,
    satzSchluessel: 'stab.liste.kastanie-widdersporn',
  },
  {
    holz: 'zypresse',
    kern: 'basiliskenhaut',
    zoll: 13,
    satzSchluessel: 'stab.liste.zypresse-basiliskenhaut',
  },
  {
    holz: 'birke',
    kern: 'spinnenfeder',
    zoll: 10,
    satzSchluessel: 'stab.liste.birke-spinnenfeder',
  },
  {
    holz: 'esche',
    kern: 'basiliskenklaue',
    zoll: 12,
    satzSchluessel: 'stab.liste.esche-basiliskenklaue',
  },
  { holz: 'kiefer', kern: 'wargzahn', zoll: 13, satzSchluessel: 'stab.liste.kiefer-wargzahn' },
  {
    holz: 'ulme',
    kern: 'minotaurhorn',
    zoll: 11.5,
    satzSchluessel: 'stab.liste.ulme-minotaurhorn',
  },
] as const satisfies readonly ListenStab[];

/** Einleitungen für zusammengesetzte Beschreibungssätze („Der ideale Zauberstab …“). */
export const BESCHREIBUNG_EINLEITUNGEN = [
  'stab.einleitung.ideal',
  'stab.einleitung.perfekt',
  'stab.einleitung.richtig',
  'stab.einleitung.geeignet',
] as const;

/**
 * Faktor auf Zauberkraft je Stufe (Index 0 = Stufe 1). Der Zauberer selbst wächst
 * langsamer (`fortschritt.ts`), mit besseren Stäben legt er also kräftig zu.
 */
export const ZAUBERKRAFT_STUFENFAKTOR = [1, 1.35, 1.7, 2.1] as const;

/** Faktor auf das Mana des Holzes je Stufe. */
export const MANA_STUFENFAKTOR = [1, 1.25, 1.5, 1.8] as const;

/** Die Güte eines Stabs liegt zufällig in dieser Spanne (Faktor auf die Zauberkraft). */
export const GUETE_SPANNE = [0.92, 1.08] as const;

/** Mit dieser Wahrscheinlichkeit würfelt der Generator ein Paar aus der Zauberstabliste. */
export const STAB_LISTE_CHANCE = 0.25;

/** Einzigartige Stäbe. Im ersten Gebiet gibt es genau einen: die Boss-Beute. */
export const EINZIGARTIGE = {
  aschenfang: {
    id: 'aschenfang',
    nameSchluessel: 'stab.einzigartig.aschenfang.name',
    beschreibungSchluessel: 'stab.einzigartig.aschenfang.beschreibung',
    holz: 'eiche',
    kern: 'wargzahn',
    laenge: 13,
    stufe: 4,
    guete: 1.08,
    affixe: [
      { affix: 'feuerball-zusatzgeschosse', wert: 2 },
      { affix: 'feuerschaden', wert: 24 },
      { affix: 'zauberkraft', wert: 15 },
      { affix: 'maximales-mana', wert: 30 },
      { affix: 'brennen-dauer', wert: 40 },
    ],
  },
} as const satisfies Record<EinzigartigId, EinzigartigerStab>;
