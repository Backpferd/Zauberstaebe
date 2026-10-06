/**
 * Der Weltzustand: die eine Quelle der Wahrheit (Architektur Abschnitt 4).
 */
import { EreignisBus, type Bus } from './bus';
import {
  EntitaetenVerwaltung,
  type Entitaet,
  type EntitaetId,
  type Entitaeten,
  type Marke,
} from './entitaeten';
import type { Vec3 } from './vektor';
import { erzeugeZufall, type SeedZufall, type Zufall } from './zufall';

/** Simulationsschritte pro Sekunde. */
export const SCHRITTE_PRO_SEKUNDE = 60;

/** Dauer eines Simulationsschritts in Sekunden. `dt` in `System.schritt` ist immer genau dieser Wert. */
export const SCHRITT = 1 / SCHRITTE_PRO_SEKUNDE;

/** Schnittstelle laut Architektur. */
export interface Welt {
  /** Sekunden seit Spielstart (Simulationszeit, genau `schritt / 60`). */
  readonly zeit: number;
  /** Nummer des laufenden Simulationsschritts, beginnt bei 0. */
  readonly schritt: number;
  readonly bus: Bus;
  /** Generator mit Startwert. */
  readonly zufall: Zufall;
  readonly entitaeten: Entitaeten;

  finde(id: EntitaetId): Entitaet | undefined;
  inUmkreis(position: Vec3, radius: number, marke?: Marke): Entitaet[];
}

/** System: jeder Baustein, der pro Schritt rechnet. Schnittstelle laut Architektur. */
export interface System {
  readonly name: string;
  /** Kleiner = früher, siehe Tabelle in Architektur Abschnitt 4. */
  readonly reihenfolge: number;
  starten?(welt: Welt): void;
  /** `dt` ist IMMER 1/60. */
  schritt(welt: Welt, dt: number): void;
  /** `anteil` zwischen 0 und 1, zum Interpolieren. */
  rendern?(welt: Welt, anteil: number): void;
  beenden?(welt: Welt): void;
}

export interface WeltOptionen {
  seed: number;
  /** Eigener Bus, sonst wird einer angelegt. */
  bus?: EreignisBus;
}

/** Implementierung von `Welt`. Die Schrittverwaltung ruft nur die `Simulation` auf. */
export class SpielWelt implements Welt {
  readonly seed: number;
  readonly bus: EreignisBus;
  readonly zufall: SeedZufall;
  readonly entitaeten: EntitaetenVerwaltung;
  private schrittNummer = 0;

  constructor(optionen: WeltOptionen) {
    this.zufall = erzeugeZufall(optionen.seed);
    this.seed = this.zufall.seed;
    this.bus = optionen.bus ?? new EreignisBus();
    this.bus.setzeSchrittGeber(() => this.schrittNummer);
    this.entitaeten = new EntitaetenVerwaltung();
  }

  get schritt(): number {
    return this.schrittNummer;
  }

  get zeit(): number {
    // Division statt `schritt * SCHRITT`: ganze Sekunden bleiben so exakt (120 → 2).
    return this.schrittNummer / SCHRITTE_PRO_SEKUNDE;
  }

  finde(id: EntitaetId): Entitaet | undefined {
    return this.entitaeten.finde(id);
  }

  inUmkreis(position: Vec3, radius: number, marke?: Marke): Entitaet[] {
    return this.entitaeten.inUmkreis(position, radius, marke);
  }

  /** Nur für die Simulation: Beginn eines Schritts. */
  schrittBeginnen(): void {
    this.entitaeten.vorherMerken();
  }

  /** Nur für die Simulation: Ende eines Schritts. Entfernt Vorgemerktes und zählt weiter. */
  schrittBeenden(): void {
    this.entitaeten.aufraeumen();
    this.schrittNummer++;
  }
}

export function erzeugeWelt(optionen: WeltOptionen): SpielWelt {
  return new SpielWelt(optionen);
}
