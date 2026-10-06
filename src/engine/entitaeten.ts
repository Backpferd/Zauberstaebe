/**
 * Entitäten: alles, was in der Welt existiert (Architektur Abschnitt 4).
 *
 * Eine Entität ist nur ein Behälter mit ID, Marken, Position, Blickrichtung und
 * Komponenten. Was sie kann, entscheiden die Systeme, die sie über Marken und
 * Komponenten finden.
 *
 * Entfernen wirkt verzögert: `entfernen()` merkt die Entität nur vor. Sie
 * verschwindet erst am Ende des laufenden Simulationsschritts, damit Schleifen
 * über Entitäten nicht brechen. Vorgemerkte Entitäten tauchen in Abfragen
 * (`alle`, `mitMarke`, `inUmkreis`) sofort nicht mehr auf; `finde` liefert sie
 * bis zum Schrittende noch, mit `entfernt === true`.
 */
import { kopiereVec3, mischeVec3, mischeWinkel, setzeVec3, vec3, type Vec3 } from './vektor';

/** Fortlaufende Nummer, eindeutig innerhalb einer Welt. Beginnt bei 1. */
export type EntitaetId = number;

/**
 * Marken ordnen Entitäten grob ein.
 * KONFLIKTZONE wie `ereignisse.ts`: Neue Marken nur ergänzen und im Bericht nennen.
 */
export type Marke =
  'spieler' | 'gegner' | 'boss' | 'geschoss' | 'beute' | 'interaktiv' | 'hindernis' | 'effekt';

/** Schnittstelle laut Architektur, ergänzt um `vorher` und `entfernt`. */
export interface Entitaet {
  readonly id: EntitaetId;
  readonly marken: Set<Marke>;
  position: Vec3;
  /** Bogenmaß, 0 = Blick entlang +z (siehe `vektor.ts`). */
  blickrichtung: number;
  readonly komponenten: Map<string, unknown>;
  /**
   * Position und Blickrichtung zu Beginn des laufenden (bzw. letzten)
   * Simulationsschritts. Zum Interpolieren beim Rendern, siehe
   * `interpolierePosition`. Wird von der Simulation gepflegt.
   */
  readonly vorher: { readonly position: Readonly<Vec3>; readonly blickrichtung: number };
  /** Zum Entfernen vorgemerkt; verschwindet am Ende des Schritts. */
  readonly entfernt: boolean;
}

/** Was beim Anlegen angegeben werden kann. Alles ist optional. */
export interface NeueEntitaet {
  marken?: Iterable<Marke>;
  /** Wird kopiert, das übergebene Objekt bleibt unverändert. */
  position?: Readonly<Vec3>;
  blickrichtung?: number;
  /** Erzeugt mit `mit(KOMPONENTE, wert)`. */
  komponenten?: Iterable<KomponentenEintrag>;
}

/** Verwaltung aller Entitäten einer Welt. */
export interface Entitaeten {
  /** Anzahl der lebenden (nicht vorgemerkten) Entitäten. */
  readonly anzahl: number;
  anlegen(daten?: NeueEntitaet): Entitaet;
  /** Merkt zum Entfernen am Schrittende vor. Mehrfaches Entfernen schadet nicht. */
  entfernen(ziel: EntitaetId | Entitaet): void;
  finde(id: EntitaetId): Entitaet | undefined;
  /** Alle lebenden Entitäten in Anlegereihenfolge (neue Liste). */
  alle(): Entitaet[];
  /** Alle lebenden Entitäten mit dieser Marke in Anlegereihenfolge (neue Liste). */
  mitMarke(marke: Marke): Entitaet[];
  /** Die zuerst angelegte lebende Entität mit dieser Marke, z. B. der Spieler. */
  ersteMitMarke(marke: Marke): Entitaet | undefined;
  /** Lebende Entitäten im Umkreis auf der XZ-Ebene (Rand eingeschlossen). */
  inUmkreis(position: Readonly<Vec3>, radius: number, marke?: Marke): Entitaet[];
}

class EntitaetObjekt implements Entitaet {
  readonly marken: Set<Marke>;
  position: Vec3;
  blickrichtung: number;
  readonly komponenten: Map<string, unknown>;
  readonly vorher: { position: Vec3; blickrichtung: number };
  entfernt = false;

  constructor(
    readonly id: EntitaetId,
    daten: NeueEntitaet,
  ) {
    this.marken = new Set(daten.marken ?? []);
    this.position = daten.position ? kopiereVec3(daten.position) : vec3();
    this.blickrichtung = daten.blickrichtung ?? 0;
    this.komponenten = new Map(daten.komponenten ?? []);
    this.vorher = { position: kopiereVec3(this.position), blickrichtung: this.blickrichtung };
  }
}

/** Implementierung von `Entitaeten`. Die Welt besitzt genau eine davon. */
export class EntitaetenVerwaltung implements Entitaeten {
  private readonly liste = new Map<EntitaetId, EntitaetObjekt>();
  private naechsteId = 1;
  private lebende = 0;
  private vorgemerkt: EntitaetObjekt[] = [];

  get anzahl(): number {
    return this.lebende;
  }

  anlegen(daten: NeueEntitaet = {}): Entitaet {
    const entitaet = new EntitaetObjekt(this.naechsteId++, daten);
    this.liste.set(entitaet.id, entitaet);
    this.lebende++;
    return entitaet;
  }

  entfernen(ziel: EntitaetId | Entitaet): void {
    const id = typeof ziel === 'number' ? ziel : ziel.id;
    const entitaet = this.liste.get(id);
    if (entitaet === undefined || entitaet.entfernt) return;
    entitaet.entfernt = true;
    this.lebende--;
    this.vorgemerkt.push(entitaet);
  }

  finde(id: EntitaetId): Entitaet | undefined {
    return this.liste.get(id);
  }

  alle(): Entitaet[] {
    const ergebnis: Entitaet[] = [];
    for (const e of this.liste.values()) if (!e.entfernt) ergebnis.push(e);
    return ergebnis;
  }

  mitMarke(marke: Marke): Entitaet[] {
    const ergebnis: Entitaet[] = [];
    for (const e of this.liste.values()) if (!e.entfernt && e.marken.has(marke)) ergebnis.push(e);
    return ergebnis;
  }

  ersteMitMarke(marke: Marke): Entitaet | undefined {
    for (const e of this.liste.values()) if (!e.entfernt && e.marken.has(marke)) return e;
    return undefined;
  }

  inUmkreis(position: Readonly<Vec3>, radius: number, marke?: Marke): Entitaet[] {
    const ergebnis: Entitaet[] = [];
    if (!(radius >= 0)) return ergebnis;
    const r2 = radius * radius;
    for (const e of this.liste.values()) {
      if (e.entfernt) continue;
      if (marke !== undefined && !e.marken.has(marke)) continue;
      const dx = e.position.x - position.x;
      const dz = e.position.z - position.z;
      if (dx * dx + dz * dz <= r2) ergebnis.push(e);
    }
    return ergebnis;
  }

  /** Merkt für alle Entitäten Position und Blickrichtung vor dem Schritt (Interpolation). */
  vorherMerken(): void {
    for (const e of this.liste.values()) {
      setzeVec3(e.vorher.position, e.position);
      e.vorher.blickrichtung = e.blickrichtung;
    }
  }

  /** Entfernt alle vorgemerkten Entitäten endgültig. Läuft am Ende jedes Schritts. */
  aufraeumen(): void {
    if (this.vorgemerkt.length === 0) return;
    for (const e of this.vorgemerkt) this.liste.delete(e.id);
    this.vorgemerkt = [];
  }
}

/*
 * Komponenten
 *
 * Eine Komponente wird einmal als Konstante definiert und trägt ihren Typ mit:
 *
 *   export const LEBEN = komponente<{ aktuell: number; maximum: number }>('leben');
 *   setzeKomponente(gegner, LEBEN, { aktuell: 30, maximum: 30 });
 *   const leben = holeKomponente(gegner, LEBEN); // Typ: { aktuell; maximum } | undefined
 *
 * Namen müssen über alle Ordner eindeutig sein. Empfehlung: kurze deutsche
 * Namen, bei Verwechslungsgefahr mit Ordnerpräfix (`'game.leben'`).
 */

/** Schlüssel für eine Komponente vom Typ `T`. */
export interface KomponentenTyp<T> {
  readonly name: string;
  /** Nur für den Typprüfer, zur Laufzeit nicht vorhanden. */
  readonly __typ?: (wert: T) => T;
}

/** Eintrag für `NeueEntitaet.komponenten`, erzeugt mit `mit()`. */
export type KomponentenEintrag = readonly [string, unknown];

export function komponente<T>(name: string): KomponentenTyp<T> {
  return Object.freeze({ name });
}

/** Typsicherer Eintrag für `anlegen({ komponenten: [mit(LEBEN, …)] })`. */
export function mit<T>(typ: KomponentenTyp<T>, wert: T): KomponentenEintrag {
  return [typ.name, wert];
}

export function holeKomponente<T>(entitaet: Entitaet, typ: KomponentenTyp<T>): T | undefined {
  return entitaet.komponenten.get(typ.name) as T | undefined;
}

/** Wie `holeKomponente`, wirft aber einen klaren Fehler, wenn die Komponente fehlt. */
export function brauchtKomponente<T>(entitaet: Entitaet, typ: KomponentenTyp<T>): T {
  if (!entitaet.komponenten.has(typ.name)) {
    throw new Error(`Entität ${entitaet.id} fehlt die Komponente '${typ.name}'.`);
  }
  return entitaet.komponenten.get(typ.name) as T;
}

export function setzeKomponente<T>(entitaet: Entitaet, typ: KomponentenTyp<T>, wert: T): void {
  entitaet.komponenten.set(typ.name, wert);
}

export function hatKomponente<T>(entitaet: Entitaet, typ: KomponentenTyp<T>): boolean {
  return entitaet.komponenten.has(typ.name);
}

export function entferneKomponente<T>(entitaet: Entitaet, typ: KomponentenTyp<T>): void {
  entitaet.komponenten.delete(typ.name);
}

/*
 * Interpolation beim Rendern
 */

/** Position zwischen letztem und aktuellem Schritt, für `rendern(welt, anteil)`. */
export function interpolierePosition(
  entitaet: Entitaet,
  anteil: number,
  ziel: Vec3 = vec3(),
): Vec3 {
  return mischeVec3(entitaet.vorher.position, entitaet.position, anteil, ziel);
}

/** Blickrichtung zwischen letztem und aktuellem Schritt, über den kürzeren Weg. */
export function interpoliereBlickrichtung(entitaet: Entitaet, anteil: number): number {
  return mischeWinkel(entitaet.vorher.blickrichtung, entitaet.blickrichtung, anteil);
}

/**
 * Setzt eine Entität ohne Zwischenbilder an eine neue Stelle (Wiederbeleben,
 * Rast). Ohne diesen Aufruf würde das Rendern einen Bildschritt lang durch die
 * Welt „gleiten“.
 */
export function teleportiere(entitaet: Entitaet, position: Readonly<Vec3>): void {
  setzeVec3(entitaet.position, position);
  setzeVec3(entitaet.vorher.position as Vec3, position);
}
