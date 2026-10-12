/**
 * Vertrag für alle animierten Figuren: Zauberer (Aufgabe 1.1) und Gegner (1.3).
 *
 * Eine Figur ist reine Darstellung. Position und Blickrichtung setzt der
 * Aufrufer auf `wurzel` (aus dem interpolierten Spielzustand), die Figur
 * kümmert sich nur um Aussehen und Animation.
 *
 * Diese Datei gehört der Hauptsitzung. Änderungswünsche bitte im Bericht melden.
 */
import type { Object3D, Vector3 } from 'three';

/** Alle Animationen, die eine Figur kennen kann. Nicht jede Figur braucht alle. */
export type Animation =
  'stehen' | 'laufen' | 'zaubern' | 'ausweichen' | 'angreifen' | 'getroffen' | 'sterben';

/** Benannte Punkte an der Figur, z. B. für Geschosse, Namensschilder, Effekte. */
export type Anker = 'mitte' | 'kopf' | 'stabspitze' | 'maul';

export interface AnimationsOptionen {
  /**
   * Abspieltempo, 1 = normal. Bei `laufen` die Laufgeschwindigkeit in m/s,
   * damit die Schritte zum Boden passen und nichts rutscht.
   */
  tempo?: number;
  /** Bei Einmal-Animationen (`zaubern`, `angreifen`, `getroffen`): Dauer in Sekunden. */
  dauer?: number;
}

export interface Figur {
  /** In die Szene hängen. Position und Drehung um Y setzt der Aufrufer. */
  readonly wurzel: Object3D;
  /** Höhe in Metern, z. B. für Lebensbalken und Namensschilder darüber. */
  readonly hoehe: number;
  /** Radius in Metern, passend zur Kollision der Spiellogik. */
  readonly radius: number;
  /** Die gerade laufende Animation. */
  readonly animation: Animation;

  /**
   * Wechselt die Animation mit kurzer Überblendung. Einmal-Animationen
   * (`zaubern`, `angreifen`, `getroffen`, `ausweichen`) kehren danach von
   * selbst zur vorherigen Dauer-Animation zurück. `sterben` bleibt stehen.
   */
  spiele(animation: Animation, optionen?: AnimationsOptionen): void;

  /** Pro gerendertem Bild mit der Echtzeit-Dauer in Sekunden. Reine Darstellung. */
  aktualisiere(dt: number): void;

  /** Kurzes Aufleuchten bei einem Treffer. */
  trefferBlitz(): void;

  /**
   * Schreibt die Weltposition eines Ankers in `ziel` und gibt `ziel` zurück.
   * Unbekannte Anker liefern die Mitte.
   */
  anker(name: Anker, ziel: Vector3): Vector3;

  /** Gibt Geometrien und Materialien frei, die nur diese Figur nutzt. */
  entsorgen(): void;
}
