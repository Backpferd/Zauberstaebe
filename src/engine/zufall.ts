/**
 * Reproduzierbarer Zufall (Mulberry32), Architektur Abschnitt 4.
 *
 * Gleicher Startwert (Seed) ergibt immer dieselbe Zahlenfolge. So lassen sich
 * gemeldete Fehler genau nachstellen. Spiellogik nutzt deshalb nie
 * `Math.random()`, sondern immer `welt.zufall` oder einen Abzweig davon.
 */

/** Schnittstelle laut Architektur. */
export interface Zufall {
  /** Kommazahl im Bereich [0, 1). */
  zahl(): number;
  /** Kommazahl im Bereich [min, max). */
  bereich(min: number, max: number): number;
  /** Ganzzahl im Bereich [min, max], beide Grenzen eingeschlossen. */
  ganzzahl(min: number, max: number): number;
  /** Zufälliges Element einer nicht leeren Liste. */
  waehle<T>(aus: readonly T[]): T;
  /**
   * Eigener, unabhängiger Strom, z. B. `abzweig('beute')`.
   *
   * Er hängt nur vom Seed und vom Namen ab, nicht davon, wie viele Zahlen
   * vorher gezogen wurden. Ein neuer Zufallsaufruf in einem anderen System
   * verschiebt die Beute also nicht. Gleicher Name liefert denselben Strom
   * (dasselbe Objekt).
   */
  abzweig(name: string): Zufall;
}

/** Zufallsgenerator mit sichtbarem Startwert. */
export interface SeedZufall extends Zufall {
  readonly seed: number;
  abzweig(name: string): SeedZufall;
}

class Mulberry32 implements SeedZufall {
  readonly seed: number;
  private zustand: number;
  private readonly abzweige = new Map<string, Mulberry32>();

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.zustand = this.seed;
  }

  zahl(): number {
    this.zustand = (this.zustand + 0x6d2b79f5) >>> 0;
    let t = this.zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  bereich(min: number, max: number): number {
    return min + (max - min) * this.zahl();
  }

  ganzzahl(min: number, max: number): number {
    const unten = Math.ceil(min);
    const oben = Math.floor(max);
    if (!Number.isFinite(unten) || !Number.isFinite(oben) || oben < unten) {
      throw new RangeError(`Zufall.ganzzahl: Ungültiger Bereich [${min}, ${max}].`);
    }
    return unten + Math.floor(this.zahl() * (oben - unten + 1));
  }

  waehle<T>(aus: readonly T[]): T {
    if (aus.length === 0) {
      throw new RangeError('Zufall.waehle: Die Liste ist leer.');
    }
    // Der Index liegt durch die Prüfung oben immer im gültigen Bereich.
    return aus[Math.floor(this.zahl() * aus.length)] as T;
  }

  abzweig(name: string): SeedZufall {
    let abzweig = this.abzweige.get(name);
    if (abzweig === undefined) {
      abzweig = new Mulberry32(mischen(this.seed, textHash(name)));
      this.abzweige.set(name, abzweig);
    }
    return abzweig;
  }
}

export function erzeugeZufall(seed: number): SeedZufall {
  return new Mulberry32(seed);
}

/** FNV-1a über die UTF-16-Zeichen eines Textes, 32 Bit. */
export function textHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Verrührt Seed und Namens-Hash zu einem neuen Seed (Murmur3-Finalizer). */
function mischen(seed: number, hash: number): number {
  let h = (seed ^ Math.imul(hash, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Liest den Seed aus der Adresszeile (`?seed=…`).
 *
 * Zahlen werden direkt übernommen (auf 32 Bit gebracht), beliebiger Text über
 * einen Hash, damit auch `?seed=wolfsrudel` reproduzierbar ist. Ohne Angabe
 * entsteht ein zufälliger Seed.
 */
export function seedAusAdresse(suche: string): { seed: number; ausAdresse: boolean } {
  const wert = new URLSearchParams(suche).get('seed')?.trim();
  if (wert === undefined || wert === '') {
    return { seed: zufaelligerSeed(), ausAdresse: false };
  }
  return { seed: /^-?\d+$/.test(wert) ? Number(wert) >>> 0 : textHash(wert), ausAdresse: true };
}

/**
 * Zufälliger Startwert für ein neues Spiel. Der einzige erlaubte Zugriff auf
 * echten Zufall: Er entscheidet nur den Seed, nie die Spiellogik.
 */
export function zufaelligerSeed(): number {
  const krypto = globalThis.crypto as Crypto | undefined;
  if (krypto?.getRandomValues !== undefined) {
    return krypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
  }
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
