/**
 * Reproduzierbarer Zufall (Mulberry32).
 *
 * Gleicher Startwert (Seed) ergibt immer dieselbe Zahlenfolge. So lassen sich
 * gemeldete Fehler genau nachstellen. Spiellogik darf deshalb nie `Math.random()`
 * verwenden, sondern immer einen `Rng` aus dieser Datei.
 *
 * Die Methodennamen entsprechen bewusst `makeRng` aus der Konzeptszene.
 */
export interface Rng {
  /** Nächste Zufallszahl im Bereich [0, 1). */
  (): number;
  /** Kommazahl im Bereich [min, max). */
  range(min: number, max: number): number;
  /** Ganzzahl im Bereich [min, max], beide Grenzen eingeschlossen. */
  int(min: number, max: number): number;
  /** Zufälliges Element einer nicht leeren Liste. */
  pick<T>(liste: readonly T[]): T;
  /** Wahr mit der Wahrscheinlichkeit `p` (0 bis 1). */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let zustand = seed >>> 0;

  const naechste = (): number => {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = (() => naechste()) as Rng;
  rng.range = (min, max) => min + (max - min) * naechste();
  rng.int = (min, max) => Math.floor(min + (max - min + 1) * naechste());
  rng.chance = (p) => naechste() < p;
  rng.pick = <T>(liste: readonly T[]): T => {
    if (liste.length === 0) {
      throw new Error('createRng.pick: Die Liste ist leer.');
    }
    // Index liegt durch die Prüfung oben immer im gültigen Bereich.
    return liste[Math.floor(naechste() * liste.length)] as T;
  };
  return rng;
}
