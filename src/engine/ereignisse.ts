/**
 * Alle Ereignisse des Spiels mit ihren Nutzlasten (Architektur Abschnitt 3).
 *
 * KONFLIKTZONE: Diese Datei teilen sich alle Agenten. Nur ergänzen, nie
 * umsortieren oder umformatieren. Wer ein neues Ereignis braucht, trägt es hier
 * und in `docs/architektur.md` ein und nennt es im Abschlussbericht.
 *
 * Regeln für Nutzlasten:
 * - Positionen sind Momentaufnahmen. Wer eine Position über den Aufruf hinaus
 *   aufbewahrt, kopiert sie (`kopiereVec3`), denn der Sender darf sein Objekt
 *   danach weiter verändern.
 * - Anzeigetexte (`titel`, `text`, `hinweis`) sind bereits fertig übersetzt,
 *   also das Ergebnis von `t(…)`. Empfänger zeigen sie unverändert an.
 * - Zeiten und Dauern in Sekunden, Strecken in Metern.
 */
import type { Aktion } from './eingabe';
import type { EntitaetId } from './entitaeten';
import type { Grafikstufe } from './grafikstufe';
import type { Vec3 } from './vektor';

/*
 * Schmale Hilfstypen. Was hier als Vereinigung steht, ist bewusst erweiterbar:
 * Neue Werte werden ergänzt, bestehende nie umbenannt.
 */

/** Schadensart. Erweiterbar, falls neue Zauber oder Gegner neue Elemente bringen. */
export type Schadenselement = 'physisch' | 'feuer' | 'frost' | 'arkan' | 'natur';

/**
 * Woher Schaden oder Heilung kommt.
 * `art` ist eine Inhalts-ID (`wolf`, `feuerball`, `trank`, `lagerfeuer` …),
 * `id` die verursachende Entität oder `null`, wenn es keine gibt.
 */
export interface Quelle {
  id: EntitaetId | null;
  art: string;
}

/** Zustandseffekte laut Architektur. */
export type Zustandseffekt = 'brennen' | 'einfrieren' | 'raserei';

/** Gründe, warum ein Zauber nicht gewirkt werden konnte. */
export type Fehlschlagsgrund = 'mana' | 'abklingzeit' | 'reichweite';

/** Gegnerarten (IDs aus Architektur Abschnitt 6). Erweiterbar. */
export type GegnerArt = 'wolf' | 'warg' | 'irrlicht' | 'grimmzahn';

/**
 * Name eines KI-Zustands (`ruhe`, `jagen`, `angreifen`, `fliehen` …).
 * Die Zustände legt die Gegner-KI (Aufgabe 2.2) fest, deshalb hier nur `string`.
 */
export type GegnerZustand = string;

/** Angriffe von Grimmzahn (PLAN.md Abschnitt 1). Erweiterbar. */
export type BossAngriff = 'prankenhieb' | 'sprungangriff' | 'rudelruf' | 'raserei';

/**
 * Form einer Warnmarkierung am Boden. Winkel und Richtungen folgen der
 * Blickrichtungs-Konvention aus `vektor.ts` (0 = +z). Weitere Formen ergänzen.
 */
export type WarnForm =
  | { art: 'kreis'; mitte: Vec3; radius: number }
  | { art: 'kegel'; spitze: Vec3; richtung: number; oeffnungswinkel: number; laenge: number }
  | { art: 'linie'; start: Vec3; richtung: number; laenge: number; breite: number };

/** Seltenheiten (Architektur Abschnitt 5). */
export type Seltenheit = 'gewoehnlich' | 'magisch' | 'selten' | 'einzigartig';

/**
 * Schmaler Vertrag für Gegenstände in Ereignissen.
 *
 * Die vollständigen Typen (Zauberstab, Trank, Wargzahn …) entstehen in
 * `src/content/` (Aufgabe 1.5). `engine` darf `content` nicht importieren,
 * deshalb steht hier nur, was jeder Gegenstand mindestens hat. Die echten
 * Objekte passen strukturell hinein; Empfänger engen den Typ mit einer
 * Typprüfung aus `content` ein (z. B. `istZauberstab(gegenstand)`).
 */
export interface Gegenstand {
  readonly id: string;
  readonly seltenheit?: Seltenheit;
}

/** Ausrüstungsplätze. Im ersten Gebiet gibt es nur den Zauberstab. Erweiterbar. */
export type Ausruestungsplatz = 'zauberstab';

/** Tränke (Tasten 1 und 2). Erweiterbar. */
export type TrankArt = 'leben' | 'mana';

/**
 * Neue Werte nach einem Stufenaufstieg. Die drei Grundwerte sind fest,
 * weitere Werte (z. B. `tempo`) dürfen dazukommen.
 */
export interface NeueWerte {
  leben: number;
  mana: number;
  zauberkraft: number;
  [wert: string]: number;
}

/** Wert einer Einstellung aus dem Einstellungsmenü. */
export type Einstellungswert = string | number | boolean;

/** Leere Nutzlast, z. B. für `spiel:pausiert`. Gesendet wird `{}`. */
export type Leer = Record<string, never>;

export interface Ereignisse {
  // Spieler
  'spieler:bewegt': { position: Vec3; geschwindigkeit: number };
  'spieler:schaden': {
    menge: number;
    quelle: Quelle;
    element: Schadenselement;
    kritisch: boolean;
  };
  'spieler:geheilt': { menge: number; quelle: Quelle };
  'spieler:leben-geaendert': { aktuell: number; maximum: number };
  'spieler:mana-geaendert': { aktuell: number; maximum: number };
  'spieler:gestorben': { quelle: Quelle };
  'spieler:wiederbelebt': { position: Vec3 };
  'spieler:ep-erhalten': { menge: number; gesamt: number };
  'spieler:stufe-aufgestiegen': { stufe: number; neueWerte: NeueWerte };
  /** `richtung`: Einheitsvektor auf der Bodenebene (y = 0). */
  'spieler:ausgewichen': { richtung: Vec3 };

  // Kampf und Zauber
  /**
   * `wirker`: wer zaubert. `ziel`: Zielpunkt am Boden (meist die Maus).
   * `position`: Ursprung des Zaubers (z. B. die Stabspitze).
   */
  'zauber:gewirkt': { zauberId: string; wirker: EntitaetId; ziel: Vec3; position: Vec3 };
  'zauber:fehlgeschlagen': { zauberId: string; grund: Fehlschlagsgrund };
  'zauber:abklingzeit-gestartet': { zauberId: string; dauer: number };
  'zauber:abklingzeit-beendet': { zauberId: string };
  /** `richtung`: Einheitsvektor der Flugrichtung. */
  'geschoss:erzeugt': {
    geschossId: EntitaetId;
    zauberId: string;
    position: Vec3;
    richtung: Vec3;
  };
  'geschoss:getroffen': { geschossId: EntitaetId; zielId: EntitaetId; position: Vec3 };
  'geschoss:verfallen': { geschossId: EntitaetId };
  'treffer:gelandet': {
    angreifer: EntitaetId;
    ziel: EntitaetId;
    menge: number;
    element: Schadenselement;
    kritisch: boolean;
    position: Vec3;
  };
  'effekt:angewandt': { zielId: EntitaetId; effekt: Zustandseffekt; dauer: number };
  'effekt:abgelaufen': { zielId: EntitaetId; effekt: Zustandseffekt };

  // Gegner und Begegnungen
  'gegner:erschienen': { gegnerId: EntitaetId; art: GegnerArt; position: Vec3 };
  'gegner:schaden': { gegnerId: EntitaetId; menge: number; leben: number; maximum: number };
  'gegner:besiegt': { gegnerId: EntitaetId; art: GegnerArt; position: Vec3; ep: number };
  'gegner:zustand-gewechselt': { gegnerId: EntitaetId; von: GegnerZustand; nach: GegnerZustand };
  'begegnung:gestartet': { begegnungId: string };
  'begegnung:beendet': { begegnungId: string; dauer: number };
  'begegnung:zurueckgesetzt': { begegnungId: string };
  /** `phase` zählt ab 1, `lebenAnteil` zwischen 0 und 1. */
  'boss:phase-gewechselt': { phase: number; lebenAnteil: number };
  /** `dauer`: Zeit bis zur Ausführung, also wie lange die Warnung steht. */
  'boss:angriff-angekuendigt': { angriff: BossAngriff; dauer: number; form: WarnForm };
  'boss:angriff-ausgefuehrt': { angriff: BossAngriff };

  // Beute und Gegenstände
  'beute:gefallen': { beuteId: EntitaetId; gegenstand: Gegenstand; position: Vec3 };
  'beute:aufgehoben': { beuteId: EntitaetId; gegenstand: Gegenstand };
  'gegenstand:ausgeruestet': {
    gegenstand: Gegenstand;
    platz: Ausruestungsplatz;
    vorher: Gegenstand | null;
  };
  'gegenstand:abgelegt': { gegenstand: Gegenstand; platz: Ausruestungsplatz };
  'trank:benutzt': { art: TrankArt; menge: number };
  'gold:erhalten': { menge: number; gesamt: number };

  // Quest und Interaktion
  'quest:gestartet': { questId: string; titel: string };
  'quest:schritt-erfuellt': { questId: string; schrittId: string };
  'quest:aktualisiert': { questId: string; text: string };
  'quest:abgeschlossen': { questId: string };
  /** `taste`: die logische Aktion; die Oberfläche zeigt die belegte Taste dazu an. */
  'interaktion:verfuegbar': { objektId: EntitaetId; hinweis: string; taste: Aktion };
  'interaktion:entfallen': { objektId: EntitaetId };
  'interaktion:ausgeloest': { objektId: EntitaetId };
  'rast:begonnen': { position: Vec3 };

  // Spielablauf
  'spiel:gestartet': { seed: number };
  'spiel:pausiert': Leer;
  'spiel:fortgesetzt': Leer;
  /** `zeitpunkt`: Wanduhr in Millisekunden (`Date.now()`), nur zur Anzeige. */
  'spiel:gespeichert': { zeitpunkt: number };
  'spiel:geladen': { zeitpunkt: number };
  'spiel:beendet': { grund: 'sieg' | 'abbruch' };
  'grafikstufe:geaendert': { stufe: Grafikstufe };

  // Darstellung und Ton (nur fx, ui und die Audio-Grundlage hören zu)
  'fx:abspielen': { name: string; position: Vec3; dauer: number };
  /**
   * `position: null` spielt den Klang ohne Raumwirkung (Oberflächenklänge).
   * `lautstaerke`: 1 = normal, 0 = stumm.
   */
  'audio:abspielen': { name: string; position: Vec3 | null; lautstaerke: number };
  /** `staerke`: Ausschlag in Metern (0,05 leicht bis 0,5 heftig), `dauer` in Sekunden. */
  'kamera:wackeln': { staerke: number; dauer: number };
  'ui:fenster-geoeffnet': { fenster: string };
  'ui:fenster-geschlossen': { fenster: string };
  'ui:hinweis': { text: string; dauer: number };

  // Absichten der Oberfläche (der einzige Weg von ui zurück in die Spiellogik)
  'absicht:gegenstand-ausruesten': { gegenstandId: string };
  'absicht:gegenstand-ablegen': { platz: Ausruestungsplatz };
  'absicht:trank-benutzen': { art: TrankArt };
  'absicht:spiel-pausieren': Leer;
  'absicht:einstellung-geaendert': { schluessel: string; wert: Einstellungswert };
}

/** Name eines Ereignisses, z. B. `'spieler:bewegt'`. */
export type EreignisName = keyof Ereignisse;

/** Zuhörer für ein bestimmtes Ereignis. */
export type Hoerer<K extends EreignisName> = (nutzlast: Ereignisse[K]) => void;
