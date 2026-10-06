/**
 * Simulation und Spielschleife (Architektur Abschnitt 1, Punkt 1).
 *
 * - `Simulation` führt einzelne Schritte aus: alle Systeme nach `reihenfolge`,
 *   immer mit `dt = 1/60`. Sie kennt keine echte Zeit und lässt sich in Tests
 *   und vom Testbot schrittgenau treiben.
 * - `Spielschleife` verbindet die Simulation mit der Bildwiederholung: Sie
 *   sammelt die echte Zeit in einem Akkumulator, rechnet daraus feste Schritte
 *   und rendert danach mit dem Rest als `anteil` zum Interpolieren.
 */
import type { Bus } from './bus';
import { SCHRITT, type SpielWelt, type System } from './welt';

/** Phase, in der ein System einen Fehler geworfen hat. */
export type SystemPhase = 'starten' | 'schritt' | 'rendern' | 'beenden';

export interface SimulationsOptionen {
  /**
   * Fängt Fehler einzelner Systeme ab, damit ein fehlerhaftes System nicht das
   * ganze Spiel anhält. Ohne Angabe werden Fehler weitergeworfen (gut für Tests).
   */
  beiFehler?: (fehler: unknown, system: System, phase: SystemPhase) => void;
}

export class Simulation {
  /** Nach `reihenfolge` sortiert. Wird bei Änderungen ersetzt, nie verändert. */
  private liste: readonly System[] = [];
  private gestartet = false;

  constructor(
    readonly welt: SpielWelt,
    private readonly optionen: SimulationsOptionen = {},
  ) {}

  /** Alle Systeme in Ausführungsreihenfolge. */
  get systeme(): readonly System[] {
    return this.liste;
  }

  get laeuft(): boolean {
    return this.gestartet;
  }

  /**
   * Fügt ein System hinzu. Gleiche `reihenfolge` läuft in Hinzufügereihenfolge.
   * Ist die Simulation schon gestartet, wird `starten` sofort aufgerufen.
   * Liefert eine Funktion zum Entfernen.
   */
  hinzufuegen(system: System): () => void {
    if (this.liste.includes(system)) {
      throw new Error(`Das System '${system.name}' ist bereits hinzugefügt.`);
    }
    if (!Number.isFinite(system.reihenfolge)) {
      throw new Error(`Das System '${system.name}' hat keine gültige Reihenfolge.`);
    }
    // Array.prototype.sort ist stabil: gleiche Reihenfolge bleibt in Einfügeordnung.
    this.liste = [...this.liste, system].sort((a, b) => a.reihenfolge - b.reihenfolge);
    if (this.gestartet) this.aufrufen(system, 'starten', () => system.starten?.(this.welt));
    return () => this.entfernen(system);
  }

  entfernen(system: System): void {
    if (!this.liste.includes(system)) return;
    this.liste = this.liste.filter((s) => s !== system);
    if (this.gestartet) this.aufrufen(system, 'beenden', () => system.beenden?.(this.welt));
  }

  /** Ruft `starten` aller Systeme auf. Mehrfacher Aufruf schadet nicht. */
  starten(): void {
    if (this.gestartet) return;
    this.gestartet = true;
    for (const system of this.liste) {
      this.aufrufen(system, 'starten', () => system.starten?.(this.welt));
    }
  }

  /** Ein Simulationsschritt. Startet die Systeme bei Bedarf vorher. */
  schritt(): void {
    if (!this.gestartet) this.starten();
    const welt = this.welt;
    const liste = this.liste;
    welt.schrittBeginnen();
    try {
      for (const system of liste) {
        this.aufrufen(system, 'schritt', () => system.schritt(welt, SCHRITT));
      }
    } finally {
      welt.schrittBeenden();
    }
  }

  /** Mehrere Schritte am Stück. */
  schritte(anzahl: number): void {
    for (let i = 0; i < anzahl; i++) this.schritt();
  }

  /** Ruft `rendern` aller Systeme auf. `anteil` wird auf [0, 1] begrenzt. */
  rendern(anteil: number): void {
    const welt = this.welt;
    const a = Math.min(1, Math.max(0, anteil));
    for (const system of this.liste) {
      if (system.rendern !== undefined) {
        this.aufrufen(system, 'rendern', () => system.rendern?.(welt, a));
      }
    }
  }

  /** Ruft `beenden` aller Systeme in umgekehrter Reihenfolge auf. */
  beenden(): void {
    if (!this.gestartet) return;
    this.gestartet = false;
    for (const system of [...this.liste].reverse()) {
      this.aufrufen(system, 'beenden', () => system.beenden?.(this.welt));
    }
  }

  private aufrufen(system: System, phase: SystemPhase, aufruf: () => void): void {
    const beiFehler = this.optionen.beiFehler;
    if (beiFehler === undefined) {
      aufruf();
      return;
    }
    try {
      aufruf();
    } catch (fehler) {
      beiFehler(fehler, system, phase);
    }
  }
}

/*
 * Uhr und Sichtbarkeit sind austauschbar, damit Tests die Schleife ohne
 * Browser bildgenau treiben können.
 */

export type BildRueckruf = (zeitMs: number) => void;

/** Liefert Bilder samt Zeitstempel in Millisekunden. */
export interface Uhr {
  /** Fordert das nächste Bild an. Liefert eine Funktion zum Abbrechen. */
  naechstesBild(rueckruf: BildRueckruf): () => void;
}

/** Die echte Uhr: `requestAnimationFrame`. */
export const browserUhr: Uhr = {
  naechstesBild(rueckruf) {
    const griff = requestAnimationFrame(rueckruf);
    return () => cancelAnimationFrame(griff);
  },
};

/** Uhr für Tests: Bilder kommen nur, wenn `bild(ms)` aufgerufen wird. */
export class ManuelleUhr implements Uhr {
  /** Aktuelle Zeit in Millisekunden. */
  zeit = 0;
  private wartend: BildRueckruf | null = null;

  naechstesBild(rueckruf: BildRueckruf): () => void {
    this.wartend = rueckruf;
    return () => {
      if (this.wartend === rueckruf) this.wartend = null;
    };
  }

  /** Ob die Schleife gerade auf ein Bild wartet. */
  get wartet(): boolean {
    return this.wartend !== null;
  }

  /** Lässt `ms` Millisekunden vergehen und liefert dann ein Bild. */
  bild(ms: number): void {
    this.zeit += ms;
    const rueckruf = this.wartend;
    this.wartend = null;
    rueckruf?.(this.zeit);
  }
}

/** Ob der Tab sichtbar ist. */
export interface Sichtbarkeit {
  istVerborgen(): boolean;
  /** Meldet Änderungen. Liefert eine Abmeldefunktion. */
  beiAenderung(rueckruf: () => void): () => void;
}

export function dokumentSichtbarkeit(dokument: Document = document): Sichtbarkeit {
  return {
    istVerborgen: () => dokument.visibilityState === 'hidden',
    beiAenderung(rueckruf) {
      dokument.addEventListener('visibilitychange', rueckruf);
      return () => dokument.removeEventListener('visibilitychange', rueckruf);
    },
  };
}

/**
 * Grund für eine Pause. Bekannt: `'verborgen'` (Tab nicht sichtbar, setzt die
 * Schleife selbst), `'menue'` (Pausenmenü), `'debug'`. Weitere sind erlaubt.
 * Die Schleife läuft erst weiter, wenn alle Gründe aufgehoben sind.
 */
export type PausenGrund = string;

export interface SchleifenStatistik {
  /** Bilder pro Sekunde, über etwa eine Sekunde gemittelt. */
  bildrate: number;
  /** Gezeichnete Bilder seit dem Start. */
  bilder: number;
  /** Simulationsschritte im letzten Bild. */
  schritteImLetztenBild: number;
  /** Schritte, die der Todesspiralen-Schutz seit dem Start verworfen hat. */
  verworfeneSchritte: number;
}

export interface SchleifenOptionen {
  simulation: Simulation;
  /** Zeichnet das Bild nach dem Rendern der Systeme (z. B. der Renderer). */
  zeichnen?: (anteil: number) => void;
  uhr?: Uhr;
  /** `null` schaltet die automatische Pause bei verborgenem Tab ab. */
  sichtbarkeit?: Sichtbarkeit | null;
  /** Schutz gegen die Todesspirale: höchstens so viele Schritte pro Bild. Standard: 5. */
  maxSchritteProBild?: number;
  /** Für `spiel:pausiert` und `spiel:fortgesetzt`. */
  bus?: Bus;
}

/** Rundungspuffer, damit 16,667 ms nicht knapp unter einem Schritt landen. */
const TOLERANZ = 1e-6;

export class Spielschleife {
  readonly simulation: Simulation;
  readonly statistik: SchleifenStatistik = {
    bildrate: 0,
    bilder: 0,
    schritteImLetztenBild: 0,
    verworfeneSchritte: 0,
  };
  private readonly zeichnen: ((anteil: number) => void) | undefined;
  private readonly uhr: Uhr;
  private readonly sichtbarkeit: Sichtbarkeit | null;
  private readonly maxSchritte: number;
  private readonly bus: Bus | undefined;

  private aktiv = false;
  private akku = 0;
  private letzteZeit: number | null = null;
  private letzterAnteil = 0;
  private abbrechen: (() => void) | null = null;
  private sichtAbmelden: (() => void) | null = null;
  private readonly gruende = new Set<PausenGrund>();
  private bildrateStart: number | null = null;
  private bildrateBilder = 0;

  constructor(optionen: SchleifenOptionen) {
    this.simulation = optionen.simulation;
    this.zeichnen = optionen.zeichnen;
    this.uhr = optionen.uhr ?? browserUhr;
    this.sichtbarkeit =
      optionen.sichtbarkeit === undefined
        ? typeof document === 'undefined'
          ? null
          : dokumentSichtbarkeit()
        : optionen.sichtbarkeit;
    this.maxSchritte = Math.max(1, Math.floor(optionen.maxSchritteProBild ?? 5));
    this.bus = optionen.bus;
  }

  get laeuft(): boolean {
    return this.aktiv;
  }

  get pausiert(): boolean {
    return this.gruende.size > 0;
  }

  get pausenGruende(): readonly PausenGrund[] {
    return [...this.gruende];
  }

  /** Anteil des letzten gerenderten Bilds zwischen zwei Schritten. */
  get anteil(): number {
    return this.letzterAnteil;
  }

  /** Startet Systeme und Bildwiederholung. */
  starten(): void {
    if (this.aktiv) return;
    this.aktiv = true;
    this.letzteZeit = null;
    this.simulation.starten();
    if (this.sichtbarkeit !== null) {
      const sicht = this.sichtbarkeit;
      this.sichtAbmelden = sicht.beiAenderung(() => {
        if (sicht.istVerborgen()) this.pausieren('verborgen');
        else this.fortsetzen('verborgen');
      });
      if (sicht.istVerborgen()) this.pausieren('verborgen');
    }
    this.planen();
  }

  /** Hält die Bildwiederholung an. Die Systeme bleiben gestartet. */
  stoppen(): void {
    this.aktiv = false;
    this.abbrechen?.();
    this.abbrechen = null;
    this.sichtAbmelden?.();
    this.sichtAbmelden = null;
  }

  pausieren(grund: PausenGrund = 'manuell'): void {
    const warPausiert = this.pausiert;
    this.gruende.add(grund);
    if (!warPausiert) this.bus?.aus('spiel:pausiert', {});
  }

  fortsetzen(grund: PausenGrund = 'manuell'): void {
    if (!this.gruende.delete(grund)) return;
    if (this.gruende.size > 0) return;
    // Die Pausenzeit darf nicht als aufgelaufene Spielzeit nachgeholt werden.
    this.letzteZeit = null;
    this.bus?.aus('spiel:fortgesetzt', {});
  }

  /**
   * Verarbeitet ein Bild zum Zeitpunkt `zeitMs`. Wird von der Uhr aufgerufen;
   * Tests dürfen es auch direkt aufrufen.
   */
  bild(zeitMs: number): void {
    if (!this.aktiv) return;
    // Zuerst das nächste Bild anfordern: Ein Fehler weiter unten hält die
    // Schleife so nicht an. Ein noch offenes Bild wird vorher abgebrochen,
    // damit nie zwei Ketten parallel laufen.
    this.abbrechen?.();
    this.planen();

    const delta = this.letzteZeit === null ? 0 : Math.max(0, (zeitMs - this.letzteZeit) / 1000);
    this.letzteZeit = zeitMs;

    let schritte = 0;
    if (!this.pausiert) {
      this.akku += delta;
      while (this.akku + TOLERANZ >= SCHRITT && schritte < this.maxSchritte) {
        this.simulation.schritt();
        this.akku -= SCHRITT;
        schritte++;
      }
      if (this.akku + TOLERANZ >= SCHRITT) {
        // Todesspirale: Rückstand verwerfen statt ihn ewig vor sich herzuschieben.
        const ueberschuss = Math.floor((this.akku + TOLERANZ) / SCHRITT);
        this.statistik.verworfeneSchritte += ueberschuss;
        this.akku -= ueberschuss * SCHRITT;
      }
      if (this.akku < 0) this.akku = 0;
      this.letzterAnteil = Math.min(1, Math.max(0, this.akku / SCHRITT));
    }

    this.statistik.schritteImLetztenBild = schritte;
    this.statistik.bilder++;
    this.bildrateMessen(zeitMs);

    this.simulation.rendern(this.letzterAnteil);
    this.zeichnen?.(this.letzterAnteil);
  }

  private planen(): void {
    this.abbrechen = this.uhr.naechstesBild((zeit) => this.bild(zeit));
  }

  private bildrateMessen(zeitMs: number): void {
    if (this.bildrateStart === null) {
      this.bildrateStart = zeitMs;
      this.bildrateBilder = 0;
      return;
    }
    this.bildrateBilder++;
    const vergangen = zeitMs - this.bildrateStart;
    if (vergangen >= 1000) {
      this.statistik.bildrate = (this.bildrateBilder * 1000) / vergangen;
      this.bildrateStart = zeitMs;
      this.bildrateBilder = 0;
    }
  }
}
