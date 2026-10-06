/**
 * Der Ereignisbus: die einzige Verbindung zwischen Systemen (Architektur Abschnitt 3).
 *
 * - `aus` sendet, `an` hört zu und liefert eine Abmeldefunktion.
 * - Zustellung synchron, in Anmeldereihenfolge.
 * - Ein Zuhörer darf selbst senden. Nach 8 verschachtelten Ebenen bricht die
 *   Kette mit einer Warnung ab (Schutz vor Endlosschleifen).
 * - Wird ein Zuhörer während einer Zustellung abgemeldet, bekommt er ab sofort
 *   nichts mehr, auch nicht den Rest der laufenden Zustellung. Wer während einer
 *   Zustellung neu dazukommt, hört erst ab dem nächsten Senden zu.
 * - Wirft ein Zuhörer einen Fehler, wird er gemeldet (`console.error`), und die
 *   übrigen Zuhörer bekommen das Ereignis trotzdem.
 * - Die letzten Ereignisse liegen in einem Ringpuffer für den F8-Bericht.
 */
import type { EreignisName, Ereignisse, Hoerer } from './ereignisse';

/** Schnittstelle laut Architektur. Systeme kennen nur diese. */
export interface Bus {
  aus<K extends EreignisName>(e: K, nutzlast: Ereignisse[K]): void;
  an<K extends EreignisName>(e: K, hoerer: (n: Ereignisse[K]) => void): () => void;
}

/** Ein Eintrag im Ereignisverlauf. Gleiche Ereignisse direkt hintereinander werden zusammengefasst. */
export interface VerlaufsEintrag {
  readonly name: EreignisName;
  /** Simulationsschritt beim ersten Auftreten. */
  readonly ersterSchritt: number;
  /** Simulationsschritt beim letzten Auftreten. */
  readonly letzterSchritt: number;
  /** Wie oft das Ereignis direkt hintereinander kam. */
  readonly anzahl: number;
  /** Momentaufnahme der letzten Nutzlast. */
  readonly nutzlast: unknown;
}

export interface BusOptionen {
  /** Größe des Ringpuffers. Standard: 50. */
  verlaufGroesse?: number;
  /** Höchste Verschachtelungstiefe. Standard: 8. */
  maxTiefe?: number;
  /** Liefert die aktuelle Schrittnummer für den Verlauf. */
  schrittGeber?: () => number;
  /** Ausgabe für Warnungen. Standard: `console.warn`. */
  warnen?: (text: string) => void;
  /** Meldung für Fehler in Zuhörern. Standard: `console.error`. */
  fehlerMelden?: (fehler: unknown, ereignis: EreignisName) => void;
}

interface Anmeldung {
  readonly hoerer: (nutzlast: unknown) => void;
  aktiv: boolean;
}

interface VeraenderlicherEintrag {
  name: EreignisName;
  ersterSchritt: number;
  letzterSchritt: number;
  anzahl: number;
  nutzlast: unknown;
}

export class EreignisBus implements Bus {
  /** Pro Ereignis eine Liste, die nie verändert, sondern bei jeder (Ab-)Meldung ersetzt wird. */
  private readonly anmeldungen = new Map<EreignisName, readonly Anmeldung[]>();
  private readonly maxTiefe: number;
  private readonly verlaufGroesse: number;
  private readonly warnen: (text: string) => void;
  private readonly fehlerMelden: (fehler: unknown, ereignis: EreignisName) => void;
  private schrittGeber: () => number;
  private tiefe = 0;
  private abbruchGemeldet = false;
  private readonly ring: VeraenderlicherEintrag[] = [];
  private ringStart = 0;

  constructor(optionen: BusOptionen = {}) {
    this.maxTiefe = optionen.maxTiefe ?? 8;
    this.verlaufGroesse = Math.max(1, optionen.verlaufGroesse ?? 50);
    this.schrittGeber = optionen.schrittGeber ?? (() => 0);
    this.warnen = optionen.warnen ?? ((text) => console.warn(text));
    this.fehlerMelden =
      optionen.fehlerMelden ??
      ((fehler, ereignis) => console.error(`Fehler in einem Zuhörer von '${ereignis}':`, fehler));
  }

  /** Legt fest, woher der Verlauf die Schrittnummer bekommt (macht die Welt). */
  setzeSchrittGeber(geber: () => number): void {
    this.schrittGeber = geber;
  }

  aus<K extends EreignisName>(e: K, nutzlast: Ereignisse[K]): void {
    if (this.tiefe >= this.maxTiefe) {
      if (!this.abbruchGemeldet) {
        this.abbruchGemeldet = true;
        this.warnen(
          `Ereigniskette nach ${this.maxTiefe} Ebenen abgebrochen: '${e}' wurde nicht zugestellt. ` +
            'Vermutlich lösen sich Zuhörer gegenseitig endlos aus.',
        );
      }
      return;
    }

    this.protokollieren(e, nutzlast);

    const liste = this.anmeldungen.get(e);
    if (liste === undefined || liste.length === 0) return;

    this.tiefe++;
    try {
      for (const anmeldung of liste) {
        if (!anmeldung.aktiv) continue;
        try {
          anmeldung.hoerer(nutzlast);
        } catch (fehler) {
          this.fehlerMelden(fehler, e);
        }
      }
    } finally {
      this.tiefe--;
      if (this.tiefe === 0) this.abbruchGemeldet = false;
    }
  }

  an<K extends EreignisName>(e: K, hoerer: Hoerer<K>): () => void {
    const anmeldung: Anmeldung = { hoerer: hoerer as (nutzlast: unknown) => void, aktiv: true };
    this.anmeldungen.set(e, [...(this.anmeldungen.get(e) ?? []), anmeldung]);
    return () => {
      if (!anmeldung.aktiv) return;
      anmeldung.aktiv = false;
      const rest = (this.anmeldungen.get(e) ?? []).filter((a) => a !== anmeldung);
      if (rest.length === 0) this.anmeldungen.delete(e);
      else this.anmeldungen.set(e, rest);
    };
  }

  /** Hört genau ein Mal zu und meldet sich danach selbst ab. */
  einmal<K extends EreignisName>(e: K, hoerer: Hoerer<K>): () => void {
    const abmelden = this.an(e, (nutzlast) => {
      abmelden();
      hoerer(nutzlast);
    });
    return abmelden;
  }

  /** Anzahl der angemeldeten Zuhörer, für Tests und gegen Speicherlecks. */
  anzahlHoerer(e?: EreignisName): number {
    if (e !== undefined) return this.anmeldungen.get(e)?.length ?? 0;
    let summe = 0;
    for (const liste of this.anmeldungen.values()) summe += liste.length;
    return summe;
  }

  /** Die letzten Ereignisse, das älteste zuerst. */
  verlauf(): VerlaufsEintrag[] {
    const ergebnis: VerlaufsEintrag[] = [];
    for (let i = 0; i < this.ring.length; i++) {
      const eintrag = this.ring[(this.ringStart + i) % this.ring.length];
      if (eintrag !== undefined) ergebnis.push({ ...eintrag });
    }
    return ergebnis;
  }

  private protokollieren(name: EreignisName, nutzlast: unknown): void {
    const schritt = this.schrittGeber();
    const momentaufnahme = nutzlastKopieren(nutzlast);

    // Gleiches Ereignis direkt hintereinander (z. B. `spieler:bewegt` in jedem
    // Schritt) zusammenfassen, sonst verdrängt es alles andere aus dem Puffer.
    const letzter =
      this.ring.length === 0
        ? undefined
        : this.ring[(this.ringStart + this.ring.length - 1) % this.ring.length];
    if (letzter !== undefined && letzter.name === name) {
      letzter.anzahl++;
      letzter.letzterSchritt = schritt;
      letzter.nutzlast = momentaufnahme;
      return;
    }

    const eintrag: VeraenderlicherEintrag = {
      name,
      ersterSchritt: schritt,
      letzterSchritt: schritt,
      anzahl: 1,
      nutzlast: momentaufnahme,
    };
    if (this.ring.length < this.verlaufGroesse) {
      this.ring.push(eintrag);
    } else {
      this.ring[this.ringStart] = eintrag;
      this.ringStart = (this.ringStart + 1) % this.verlaufGroesse;
    }
  }
}

export function erzeugeBus(optionen?: BusOptionen): EreignisBus {
  return new EreignisBus(optionen);
}

/**
 * Flache Kopie der Nutzlast für den Verlauf. Vektoren (`{x, y, z}`) werden mit
 * kopiert, weil Sender sie oft weiterverwenden (z. B. die Spielerposition).
 */
function nutzlastKopieren(nutzlast: unknown): unknown {
  if (typeof nutzlast !== 'object' || nutzlast === null) return nutzlast;
  const kopie: Record<string, unknown> = {};
  for (const [schluessel, wert] of Object.entries(nutzlast)) {
    kopie[schluessel] = istVektor(wert) ? { x: wert.x, y: wert.y, z: wert.z } : wert;
  }
  return kopie;
}

function istVektor(wert: unknown): wert is { x: number; y: number; z: number } {
  if (typeof wert !== 'object' || wert === null) return false;
  const v = wert as Record<string, unknown>;
  return typeof v['x'] === 'number' && typeof v['y'] === 'number' && typeof v['z'] === 'number';
}
