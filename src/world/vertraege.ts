/**
 * Verträge zwischen der Welt (Aufgabe 1.2) und der Spiellogik (1.1, 2.2, 2.5, 3.1).
 *
 * Die Welt liefert ein `Gebiet` mit statischer Kollision, Wegfindung und
 * benannten Orten. Bewegliche Dinge (Spieler, Gegner, Geschosse) kennt die
 * Welt nicht. Deren Abstände zueinander regelt die Spiellogik.
 *
 * Diese Datei gehört der Hauptsitzung. Änderungswünsche bitte im Bericht melden.
 */
import type { Vec3, VecXZ } from '@engine/index';

/** Statische Kollision gegen Gelände, Felsen, Bäume, Ruinen, Wasser und Sperren. */
export interface Kollision {
  /**
   * Bewegt einen Kreis mit `radius` von `von` um `versatz` auf der XZ-Ebene.
   * An Hindernissen gleitet er entlang statt hängen zu bleiben. Liefert die
   * neue Position, `y` ist die Bodenhöhe dort. Muss auch bei großen Versätzen
   * (Ausweichrolle) sicher sein: Niemand darf durch dünne Hindernisse tunneln.
   */
  bewege(von: Vec3, versatz: VecXZ, radius: number): Vec3;
  /** Ist an dieser Stelle Platz für einen Kreis mit `radius`? */
  istFrei(position: VecXZ, radius: number): boolean;
  /** Bodenhöhe in Metern an dieser Stelle. */
  bodenhoehe(x: number, z: number): number;
  /** Freie Sicht zwischen zwei Punkten (für Fernkampf und Gegner-KI)? */
  sichtlinie(von: Vec3, nach: Vec3): boolean;
}

export interface Wegfindung {
  /**
   * Weg als Liste von Wegpunkten (ohne den Startpunkt, mit dem Ziel), passend
   * für eine Figur mit `radius`. Ist das Ziel unerreichbar, führt der Weg so
   * nah wie möglich heran. Muss schnell genug sein für 20 Anfragen pro Sekunde.
   */
  finde(von: Vec3, nach: Vec3, radius: number): Vec3[];
}

/** Benannte Orte in Gebiet 1 (siehe Gebietsskizze in PLAN.md, Abschnitt 1). */
export type OrtId =
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

export interface Ort {
  readonly id: OrtId;
  readonly position: Vec3;
  /** Blickrichtung in Bogenmaß, z. B. für den Startpunkt. */
  readonly blickrichtung: number;
  /** Interaktionsradius bzw. Ausdehnung in Metern. */
  readonly radius: number;
}

export type BegegnungId = 'kampf1' | 'kampf2' | 'kampf3' | 'boss';

/** Wo eine Begegnung stattfindet. Wer dort kämpft, steht in `src/content/`. */
export interface Begegnungszone {
  readonly id: BegegnungId;
  readonly mitte: Vec3;
  /** Betritt der Spieler diesen Radius, beginnt die Begegnung. */
  readonly ausloeseRadius: number;
  /** Verlässt der Spieler diesen Radius, setzt sie sich zurück. */
  readonly leinenRadius: number;
  /** Erscheinungspunkte der Gegner, mindestens 6 je Zone. */
  readonly erscheinungspunkte: readonly Vec3[];
}

export interface Gebiet {
  /** Textschlüssel des Gebietsnamens, z. B. `gebiet.wildholz.name`. */
  readonly nameSchluessel: string;
  /** Begehbarer Bereich als Rechteck auf der XZ-Ebene. */
  readonly grenzen: {
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
  readonly kollision: Kollision;
  readonly wegfindung: Wegfindung;
  readonly orte: Readonly<Record<OrtId, Ort>>;
  readonly begegnungen: readonly Begegnungszone[];
  /** Schließt oder öffnet die Dornenranken um die Bosslichtung (Kollision inklusive). */
  arenaSchliessen(geschlossen: boolean): void;
  /** Pro Bild für Wind in Gras und Bäumen, flackerndes Lagerfeuer usw. Reine Darstellung. */
  aktualisiere(dt: number): void;
  entsorgen(): void;
}
