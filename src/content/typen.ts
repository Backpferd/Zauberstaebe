/**
 * Typen für alle Inhaltsdaten von Gebiet 1 (Architektur Abschnitt 5, Aufgabe 1.5).
 *
 * Reine Typen, keine Logik. Die Daten selbst liegen in den Nachbardateien und
 * sind dort als `Record<Id, …>` mit `as const satisfies …` geschrieben: Fehlt
 * ein Eintrag oder stimmt ein Textschlüssel nicht, meldet das der Typprüfer.
 *
 * Aus `@engine/index` werden ausschließlich Typen geholt (`import type`), damit
 * `content` zur Laufzeit von nichts abhängt.
 *
 * Abweichungen von den Skizzen in `docs/architektur.md`, Abschnitt 5:
 * - Sichtbare Namen heißen `nameSchluessel` (Textschlüssel statt Klartext), weil
 *   die Daten beim Laden noch keine Texttabelle kennen. Das passt zu
 *   `Gebiet.nameSchluessel` in `src/world/vertraege.ts`.
 * - `Holz` hat zusätzlich `tempo` (Eiche ist langsam, Birke schnell), `Laenge`
 *   zusätzlich `reichweiteMeter`.
 * - `Kern.effekt` verweist auf ein Affix (`FesterAffix`) statt es auszuschreiben.
 * - `Zauberstab` hat zusätzlich `name` und `guete`.
 */
import type {
  BossAngriff,
  EreignisName,
  GegnerArt,
  Schadenselement,
  Seltenheit,
  TrankArt,
  Zustandseffekt,
} from '@engine/index';
import type { TextSchluessel } from './texte';

export type { GegnerArt, Schadenselement, Seltenheit, TrankArt, Zustandseffekt };

// ---------------------------------------------------------------------------
// Kennungen
// ---------------------------------------------------------------------------

export type HolzId =
  | 'buche'
  | 'ahorn'
  | 'pappel'
  | 'eiche'
  | 'kastanie'
  | 'zypresse'
  | 'birke'
  | 'esche'
  | 'kiefer'
  | 'ulme';

export type KernId =
  | 'eulenfeder'
  | 'einhornhaar'
  | 'zentaurenhaar'
  | 'adlerfeder'
  | 'widdersporn'
  | 'basiliskenhaut'
  | 'spinnenfeder'
  | 'basiliskenklaue'
  | 'wargzahn'
  | 'minotaurhorn';

export type ZauberId = 'feuerball' | 'frostnova' | 'ausweichrolle';
export type BegegnungKennung = 'kampf1' | 'kampf2' | 'kampf3' | 'boss';
export type EinzigartigId = 'aschenfang';
export type MaterialId = 'wargzahn';
export type RegionId = 'wildholz' | 'erlengrund' | 'grauzahn-pass';
export type WegweiserArm = 'dorf' | 'berge' | 'wald';

/** Orte von Gebiet 1. Muss zu `OrtId` in `src/world/vertraege.ts` passen (Datentest). */
export type OrtKennung =
  | 'start'
  | 'lagerfeuer'
  | 'zelt'
  | 'schriftrolle'
  | 'wegekreuz'
  | 'wegweiser'
  | 'bruecke'
  | 'erdrutsch'
  | 'kampf1'
  | 'kampf2'
  | 'kampf3'
  | 'truhe'
  | 'arena-eingang'
  | 'bosslichtung';

export type AffixId =
  | 'feuerschaden'
  | 'frostschaden'
  | 'zauberkraft'
  | 'zauberkraft-flach'
  | 'zaubertempo'
  | 'maximales-mana'
  | 'geschossgeschwindigkeit'
  | 'feuerball-manakosten'
  | 'frostnova-radius'
  | 'reichweite'
  | 'brennen-dauer'
  | 'einfrieren-dauer'
  | 'frostnova-abklingzeit'
  | 'ausweichrolle-abklingzeit'
  | 'ausweichrolle-strecke'
  | 'ausweichrolle-mana'
  | 'kritische-trefferchance'
  | 'kritischer-schaden'
  | 'maximales-leben'
  | 'lebensregeneration'
  | 'manaregeneration'
  | 'laufgeschwindigkeit'
  | 'schaden-gegen-tiere'
  | 'feuerball-durchbohren'
  | 'feuerball-zusatzgeschosse';

// ---------------------------------------------------------------------------
// Zauberstäbe
// ---------------------------------------------------------------------------

/**
 * Was ein Affix bewirkt. Prozentwerte sind Prozentpunkte (`18` = +18 %),
 * Verringerungen stehen positiv (`12` = 12 % weniger), damit nie ein Wert
 * negativ ist.
 */
export type WirkungsArt =
  // Grundwerte
  | 'zauberkraft-prozent'
  | 'zauberkraft-flach'
  | 'zaubertempo-prozent'
  | 'reichweite-prozent'
  | 'maximales-mana'
  | 'maximales-leben'
  | 'manaregeneration-prozent'
  | 'lebensregeneration' // Leben pro Sekunde
  | 'laufgeschwindigkeit-prozent'
  | 'kritische-trefferchance' // Prozentpunkte
  | 'kritischer-schaden-prozent'
  | 'schaden-gegen-tiere-prozent'
  // Feuerball
  | 'feuerschaden-prozent'
  | 'geschossgeschwindigkeit-prozent'
  | 'feuerball-zusatzgeschosse'
  | 'feuerball-durchbohren'
  | 'feuerball-manakosten-senkung-prozent'
  | 'brennen-dauer-prozent'
  // Frostnova
  | 'frostschaden-prozent'
  | 'frostnova-radius-prozent'
  | 'frostnova-abklingzeit-senkung-prozent'
  | 'einfrieren-dauer-prozent'
  // Ausweichrolle
  | 'ausweichrolle-abklingzeit-senkung-prozent'
  | 'ausweichrolle-strecke-prozent'
  | 'ausweichrolle-mana-rueckgewinn';

export interface Wirkung {
  art: WirkungsArt;
  wert: number;
}

/** Ein gewürfeltes oder festes Affix an einem konkreten Stab. `text` ist fertig übersetzt. */
export interface Affix {
  id: AffixId;
  text: string;
  wirkung: Wirkung;
}

/** Verweis auf ein Affix mit festem Wert (Kerneffekt, einzigartige Stäbe). */
export interface FesterAffix {
  affix: AffixId;
  wert: number;
}

export type Reichweite = 'kurz' | 'mittel' | 'lang';

/** Holz bestimmt die Grundwerte. */
export interface Holz {
  id: HolzId;
  nameSchluessel: TextSchluessel;
  /** Name der Waffe, z. B. „Eichenstab“, für zusammengesetzte Stabnamen. */
  stabSchluessel: TextSchluessel;
  charakterSchluessel: TextSchluessel;
  /** Zauberkraft-Spanne (min, max) bei Stufe 1, vor Stufenfaktor und Güte. */
  zauberkraft: readonly [number, number];
  /** Mana, das der Stab bei Stufe 1 liefert. */
  mana: number;
  /** Faktor auf das Zaubertempo der Länge (1 = neutral, Eiche < 1, Birke > 1). */
  tempo: number;
  /** Zwei Charakterzüge für die Flavor-Beschreibung. */
  zuege: readonly [TextSchluessel, TextSchluessel];
}

/** Der Kern bestimmt einen festen Spezialeffekt. */
export interface Kern {
  id: KernId;
  nameSchluessel: TextSchluessel;
  effekt: FesterAffix;
  zuege: readonly [TextSchluessel, TextSchluessel];
}

/** Die Länge bestimmt Tempo und Reichweite. */
export interface Laenge {
  zoll: number;
  /** Zauber pro Sekunde, bevor Holz und Affixe wirken. */
  tempo: number;
  reichweite: Reichweite;
  /** Zielreichweite in Metern. */
  reichweiteMeter: number;
}

/** Ein Zauberstab aus der `Zauberstabliste`, dessen Satz als Beschreibung dient. */
export interface ListenStab {
  holz: HolzId;
  kern: KernId;
  /** Länge laut Liste in Zoll. */
  zoll: number;
  satzSchluessel: TextSchluessel;
}

export type AffixPlatz = 'praefix' | 'suffix';
export type Faehigkeit = 'feuerball' | 'frostnova' | 'ausweichrolle' | 'grundwert';

/** Vorlage eines würfelbaren Affixes mit Wertspannen je Stufe (Index 0 = Stufe 1). */
export interface AffixVorlage {
  id: AffixId;
  art: WirkungsArt;
  platz: AffixPlatz;
  faehigkeit: Faehigkeit;
  /** Gewicht beim Würfeln (größer = häufiger). */
  gewicht: number;
  /** Erst ab dieser Stufe möglich. */
  mindestStufe: number;
  /** Wertspannen [min, max] je Stufe 1 bis 4. Darüber gilt die letzte. */
  spannen: readonly (readonly [number, number])[];
  /** Nachkommastellen des gewürfelten Werts. */
  nachkomma: 0 | 1;
  /** Text mit `{wert}`, z. B. „+{wert} % Feuerschaden“. */
  textSchluessel: TextSchluessel;
  /** Text für den Wert 1, falls die Einzahl anders klingt. */
  textEinzahlSchluessel?: TextSchluessel;
  /** Präfix: Adjektiv („Glühender“). Suffix: Genitivwendung („der Asche“). */
  nameSchluessel: TextSchluessel;
  /** Wortbaustein für Namen seltener Stäbe („Glut“, „dorn“). */
  wortSchluessel: TextSchluessel;
}

export interface SeltenheitDaten {
  id: Seltenheit;
  nameSchluessel: TextSchluessel;
  /** Anzahl zusätzlicher Affixe (min, max), ohne den Kerneffekt. */
  zusatzaffixe: readonly [number, number];
  /** Gewicht beim Würfeln. 0 = wird nie gewürfelt (nur feste Stäbe). */
  gewicht: number;
}

/** Fest definierter Stab mit Namen, im ersten Gebiet nur die Boss-Beute. */
export interface EinzigartigerStab {
  id: EinzigartigId;
  nameSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  holz: HolzId;
  kern: KernId;
  laenge: number;
  stufe: number;
  guete: number;
  affixe: readonly FesterAffix[];
}

/** Ein konkreter Zauberstab, wie ihn Generator, Beute und Inventar herumreichen. */
export interface Zauberstab {
  id: string;
  /** Fertig übersetzter Anzeigename („Glutdorn · Eichenstab“). */
  name: string;
  holz: HolzId;
  kern: KernId;
  /** Länge in Zoll, z. B. 11.5. */
  laenge: number;
  seltenheit: Seltenheit;
  /** Zusatzaffixe. Der Kerneffekt kommt immer dazu (`Kern.effekt`). */
  affixe: Affix[];
  /** Flavor-Satz, bei Stäben der Liste der Originalsatz. */
  beschreibung: string;
  /** Benötigte Spielerstufe. */
  stufe: number;
  /** Faktor auf die Zauberkraft, etwa 0,92 bis 1,08. */
  guete: number;
}

// ---------------------------------------------------------------------------
// Zauber
// ---------------------------------------------------------------------------

/**
 * Schaden = `basis` + `zauberkraftFaktor` × Zauberkraft (ein Wurf aus der
 * Spanne von Spieler und Stab), danach Zuschläge der Affixe.
 */
export interface Schaden {
  basis: number;
  zauberkraftFaktor: number;
}

export interface ZauberEffekt {
  art: Zustandseffekt;
  /** Dauer in Sekunden. */
  dauer: number;
  /** Brennen: Schaden pro Sekunde als Anteil des Trefferschadens. */
  schadenAnteil?: number;
}

interface ZauberGemeinsam {
  id: ZauberId;
  nameSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  /** Taste laut Eingabe-Aktionen aus `@engine/index`. */
  aktion: 'zauber-primaer' | 'zauber-sekundaer' | 'ausweichen';
  manakosten: number;
  /** Sekunden bei Zaubertempo 1. */
  abklingzeit: number;
  /** Teilt das Zaubertempo des Stabs die Abklingzeit? */
  skaliertMitTempo: boolean;
}

export interface GeschossZauber extends ZauberGemeinsam {
  form: 'geschoss';
  element: Schadenselement;
  schaden: Schaden;
  /** Meter pro Sekunde. */
  geschosstempo: number;
  /** Trefferradius des Geschosses in Metern. */
  trefferradius: number;
  /** Radius des Flächenschadens am Einschlag in Metern. */
  radius: number;
  effekt: ZauberEffekt;
}

export interface FlaechenZauber extends ZauberGemeinsam {
  form: 'flaeche';
  element: Schadenselement;
  schaden: Schaden;
  /** Wirkradius um den Zauberer in Metern. */
  radius: number;
  effekt: ZauberEffekt;
}

export interface AusweichZauber extends ZauberGemeinsam {
  form: 'ausweichen';
  /** Strecke in Metern. */
  strecke: number;
  /** Dauer der Rolle in Sekunden. */
  dauer: number;
  /** So lange ist der Zauberer während der Rolle unverwundbar. */
  unverwundbar: number;
}

export type Zauber = GeschossZauber | FlaechenZauber | AusweichZauber;

// ---------------------------------------------------------------------------
// Gegner, Beute, Begegnungen
// ---------------------------------------------------------------------------

export type BeuteEintrag =
  | { art: 'gold'; chance: number; menge: readonly [number, number] }
  | { art: 'trank'; trank: TrankArt; chance: number }
  | { art: 'zauberstab'; chance: number; stufe: number; seltenheit?: Seltenheit }
  | { art: 'material'; material: MaterialId; chance: number; menge: readonly [number, number] }
  | { art: 'einzigartig'; stab: EinzigartigId; chance: number };

export interface BossPhase {
  /** Nummer der Phase, die beginnt (Phase 1 ist der Start). */
  phase: number;
  /** Beginnt, sobald das Leben auf diesen Anteil (0 bis 1) fällt. */
  lebenAnteil: number;
  /** Was beim Wechsel passiert. */
  angriff: BossAngriff;
}

export interface BossDaten {
  titelSchluessel: TextSchluessel;
  phasen: readonly BossPhase[];
  angriffe: {
    prankenhieb: {
      nameSchluessel: TextSchluessel;
      schaden: number;
      abklingzeit: number;
      /** Sekunden, die die Warnmarkierung vor dem Schlag steht. */
      ankuendigung: number;
      laenge: number;
      /** Öffnungswinkel des Kegels in Bogenmaß. */
      oeffnungswinkel: number;
    };
    sprungangriff: {
      nameSchluessel: TextSchluessel;
      schaden: number;
      abklingzeit: number;
      ankuendigung: number;
      /** Sekunden in der Luft nach der Ankündigung. */
      flugdauer: number;
      radius: number;
      maxSprungweite: number;
    };
    rudelruf: {
      nameSchluessel: TextSchluessel;
      ankuendigung: number;
      gegner: readonly { art: GegnerArt; anzahl: number }[];
    };
    raserei: {
      nameSchluessel: TextSchluessel;
      tempoFaktor: number;
      abklingzeitFaktor: number;
      schadenFaktor: number;
    };
  };
}

export interface Gegner {
  id: GegnerArt;
  nameSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  stufe: number;
  leben: number;
  /** Schaden pro Treffer. */
  schaden: number;
  element: Schadenselement;
  /** Sekunden zwischen zwei Angriffen. */
  angriffsabklingzeit: number;
  /** Meter, aus denen er zuschlägt (bei Fernkämpfern: schießt). */
  angriffsreichweite: number;
  /** Meter pro Sekunde bei Verfolgung. */
  tempo: number;
  /** Meter pro Sekunde, wenn er ruhig umherstreift. */
  gehtempo: number;
  sichtweite: number;
  /** Körperradius für Kollision und Treffer. */
  radius: number;
  ep: number;
  beute: readonly BeuteEintrag[];
  /** Name des KI-Profils für Aufgabe 2.2. */
  ki: string;
  /** Faktor auf die Dauer von Zustandseffekten (0 = immun, 1 = normal). */
  effektdauerFaktoren?: Partial<Record<Zustandseffekt, number>>;
  fernkampf?: {
    geschosstempo: number;
    /** Abstand, den das Irrlicht zum Spieler zu halten versucht. */
    bevorzugterAbstand: number;
    schwebehoehe: number;
  };
  ansturm?: {
    tempo: number;
    /** Sekunden Anlauf, in denen der Warg sich duckt und der Ansturm sichtbar wird. */
    anlauf: number;
    schaden: number;
    abklingzeit: number;
  };
  boss?: BossDaten;
}

export interface BegegnungDaten {
  id: BegegnungKennung;
  nameSchluessel: TextSchluessel;
  /** Kurzer Tipp, der beim Start der Begegnung gezeigt werden kann. */
  hinweisSchluessel: TextSchluessel;
  ort: OrtKennung;
  /**
   * Gegner in Wellen. Welle n+1 erscheint, sobald Welle n besiegt ist.
   * Wo sie erscheinen, regelt die Begegnungszone der Welt.
   */
  wellen: readonly (readonly { art: GegnerArt; anzahl: number }[])[];
  /** Truhe, die zur Begegnung gehört (Inhalt wird beim Öffnen vergeben). */
  truhe?: { ort: OrtKennung; inhalt: readonly BeuteEintrag[] };
  /** Schließen Dornenranken die Arena, solange gekämpft wird? */
  schliesstArena?: boolean;
}

// ---------------------------------------------------------------------------
// Quest, Fortschritt, Gebiet, Tränke
// ---------------------------------------------------------------------------

/** Wann ein Questschritt als erfüllt gilt: Ereignisname plus Bedingung. */
export type Ausloeser =
  | { ereignis: 'interaktion:ausgeloest'; objektId: OrtKennung }
  | { ereignis: 'spieler:bewegt'; nahe: OrtKennung; radius: number }
  | { ereignis: 'begegnung:gestartet' | 'begegnung:beendet'; begegnungId: BegegnungKennung }
  | { ereignis: 'gegner:besiegt'; art: GegnerArt };

/** Der Typprüfer stellt hier sicher, dass jeder Auslöser ein echtes Ereignis nennt. */
export type PruefeAusloeser = Ausloeser['ereignis'] extends EreignisName ? true : never;

export interface Belohnung {
  ep?: number;
  gold?: number;
}

export interface QuestSchritt {
  id: string;
  ausloeser: Ausloeser;
  /** Aufgabentext, solange der Schritt offen ist. */
  vorherSchluessel: TextSchluessel;
  /** Meldung, wenn der Schritt erfüllt ist. */
  nachherSchluessel: TextSchluessel;
  belohnung?: Belohnung;
}

export interface QuestDaten {
  id: string;
  titelSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  /** Startet die Quest. */
  start: Ausloeser;
  schritte: readonly QuestSchritt[];
  /** Text nach dem letzten Schritt. */
  abschlussSchluessel: TextSchluessel;
}

export interface StufenDaten {
  stufe: number;
  /** Gesamt-EP, ab denen diese Stufe erreicht ist. */
  epSchwelle: number;
  leben: number;
  mana: number;
  /** Zauberkraft des Zauberers ohne Stab. */
  zauberkraft: number;
  /** Mana pro Sekunde. */
  manaregeneration: number;
  /** Leben pro Sekunde (ohne Affixe). */
  lebensregeneration: number;
}

export interface OrtDaten {
  nameSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  /** Hinweis für `interaktion:verfuegbar`, falls man damit etwas tun kann. */
  hinweisSchluessel?: TextSchluessel;
  /** Meldung, wenn der Weg versperrt ist. */
  sperreSchluessel?: TextSchluessel;
}

export interface RegionDaten {
  nameSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  /** Im ersten Gebiet nur der Wildholz-Weg. */
  zugaenglich: boolean;
}

export interface WegweiserDaten {
  ziel: RegionId;
  nameSchluessel: TextSchluessel;
  /** Was auf dem Schild steht. */
  schildSchluessel: TextSchluessel;
  gesperrt: boolean;
  /** Warum der Weg gesperrt ist. */
  sperrgrundSchluessel?: TextSchluessel;
}

export interface TrankDaten {
  id: TrankArt;
  nameSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  ressource: 'leben' | 'mana';
  /** Sofort wiederhergestellte Menge. */
  menge: number;
  /** Sekunden, bis der nächste Trank dieser Art benutzt werden kann. */
  abklingzeit: number;
  aktion: 'trank-1' | 'trank-2';
  startmenge: number;
  maxStapel: number;
  goldwert: number;
}

export interface MaterialDaten {
  id: MaterialId;
  nameSchluessel: TextSchluessel;
  beschreibungSchluessel: TextSchluessel;
  maxStapel: number;
  goldwert: number;
}
