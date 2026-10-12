/**
 * Die drei Fähigkeiten von Gebiet 1: Feuerball, Frostnova, Ausweichrolle.
 *
 * Zeiten in Sekunden, Strecken in Metern. Schaden = `basis` + `zauberkraftFaktor`
 * × Zauberkraft (Zauberer plus Stab). Die Abklingzeit gilt bei Zaubertempo 1;
 * wo `skaliertMitTempo` gesetzt ist, teilt das Zaubertempo des Stabs sie
 * (Tempo 1,25 macht aus 1,0 s also 0,8 s). Brennen und Einfrieren sind
 * Zustandseffekte aus der Architektur (`effekt:angewandt`).
 */
import type { Zauber, ZauberId } from './typen';

export const ZAUBER = {
  feuerball: {
    id: 'feuerball',
    nameSchluessel: 'zauber.feuerball.name',
    beschreibungSchluessel: 'zauber.feuerball.beschreibung',
    aktion: 'zauber-primaer',
    form: 'geschoss',
    element: 'feuer',
    manakosten: 8,
    abklingzeit: 1.0,
    skaliertMitTempo: true,
    schaden: { basis: 6, zauberkraftFaktor: 1.0 },
    geschosstempo: 16,
    trefferradius: 0.4,
    radius: 1.4,
    effekt: { art: 'brennen', dauer: 3, schadenAnteil: 0.12 },
  },
  frostnova: {
    id: 'frostnova',
    nameSchluessel: 'zauber.frostnova.name',
    beschreibungSchluessel: 'zauber.frostnova.beschreibung',
    aktion: 'zauber-sekundaer',
    form: 'flaeche',
    element: 'frost',
    manakosten: 18,
    abklingzeit: 7,
    skaliertMitTempo: true,
    schaden: { basis: 4, zauberkraftFaktor: 0.8 },
    radius: 4.5,
    effekt: { art: 'einfrieren', dauer: 2.5 },
  },
  ausweichrolle: {
    id: 'ausweichrolle',
    nameSchluessel: 'zauber.ausweichrolle.name',
    beschreibungSchluessel: 'zauber.ausweichrolle.beschreibung',
    aktion: 'ausweichen',
    form: 'ausweichen',
    manakosten: 0,
    abklingzeit: 1.2,
    skaliertMitTempo: false,
    strecke: 4,
    dauer: 0.35,
    unverwundbar: 0.25,
  },
} as const satisfies Record<ZauberId, Zauber>;
