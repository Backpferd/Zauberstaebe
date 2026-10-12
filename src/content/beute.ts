/**
 * Sonstige Gegenstände der Beute: Gold und Materialien (der Wargzahn).
 *
 * Zauberstäbe stehen in `zauberstaebe.ts`, Tränke in `tranke.ts`. Welcher Gegner
 * was fallen lässt, steht bei den Gegnern (`gegner.ts`, Feld `beute`).
 */
import type { MaterialDaten, MaterialId } from './typen';

export const GOLD = {
  nameSchluessel: 'gegenstand.gold.name',
} as const;

export const MATERIALIEN = {
  wargzahn: {
    id: 'wargzahn',
    nameSchluessel: 'gegenstand.wargzahn.name',
    beschreibungSchluessel: 'gegenstand.wargzahn.beschreibung',
    maxStapel: 20,
    goldwert: 8,
  },
} as const satisfies Record<MaterialId, MaterialDaten>;
