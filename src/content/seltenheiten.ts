/**
 * Die vier Seltenheiten (Architektur Abschnitt 5).
 *
 * - gewöhnlich: nur der Kerneffekt, keine Zusatzaffixe
 * - magisch: 1 bis 2 Zusatzaffixe
 * - selten: 3 bis 4 Zusatzaffixe, mit zusammengesetztem Namen („Glutdorn · Eichenstab“)
 * - einzigartig: feste Stäbe mit Namen, werden nie gewürfelt (Gewicht 0)
 *
 * Die Gewichte gelten für den Zufallswurf des Generators: Von 100 gewürfelten
 * Stäben sind im Mittel 62 gewöhnlich, 30 magisch und 8 selten.
 */
import type { Seltenheit, SeltenheitDaten } from './typen';

export const SELTENHEITEN = {
  gewoehnlich: {
    id: 'gewoehnlich',
    nameSchluessel: 'seltenheit.gewoehnlich.name',
    zusatzaffixe: [0, 0],
    gewicht: 62,
  },
  magisch: {
    id: 'magisch',
    nameSchluessel: 'seltenheit.magisch.name',
    zusatzaffixe: [1, 2],
    gewicht: 30,
  },
  selten: {
    id: 'selten',
    nameSchluessel: 'seltenheit.selten.name',
    zusatzaffixe: [3, 4],
    gewicht: 8,
  },
  einzigartig: {
    id: 'einzigartig',
    nameSchluessel: 'seltenheit.einzigartig.name',
    zusatzaffixe: [0, 0],
    gewicht: 0,
  },
} as const satisfies Record<Seltenheit, SeltenheitDaten>;

/** Reihenfolge von schwach nach stark, z. B. für Legenden und Sortierung. */
export const SELTENHEIT_REIHENFOLGE = [
  'gewoehnlich',
  'magisch',
  'selten',
  'einzigartig',
] as const satisfies readonly Seltenheit[];
