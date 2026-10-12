/**
 * Heil- und Manatrank (Tasten 1 und 2). Trank-IDs wie `TrankArt` in der
 * Architektur: `leben` und `mana`.
 *
 * Beide Tränke wirken sofort. Die Abklingzeit gilt je Trankart.
 */
import type { TrankArt, TrankDaten } from './typen';

export const TRANKE = {
  leben: {
    id: 'leben',
    nameSchluessel: 'trank.leben.name',
    beschreibungSchluessel: 'trank.leben.beschreibung',
    ressource: 'leben',
    menge: 60,
    abklingzeit: 15,
    aktion: 'trank-1',
    startmenge: 2,
    maxStapel: 5,
    goldwert: 12,
  },
  mana: {
    id: 'mana',
    nameSchluessel: 'trank.mana.name',
    beschreibungSchluessel: 'trank.mana.beschreibung',
    ressource: 'mana',
    menge: 40,
    abklingzeit: 15,
    aktion: 'trank-2',
    startmenge: 1,
    maxStapel: 5,
    goldwert: 12,
  },
} as const satisfies Record<TrankArt, TrankDaten>;
