/**
 * Alle sichtbaren Texte des Spiels (Architektur Abschnitt 5).
 *
 * KONFLIKTZONE: Diese Datei teilen sich alle Agenten. Nur ergänzen, nie
 * umsortieren oder umformatieren. Jeder Bereich bekommt einen eigenen Block
 * mit Schlüsselpräfix (`debug.`, `quest.`, `hud.` …).
 *
 * Platzhalter in geschweiften Klammern (`{wert}`) füllt `t()` aus `@engine/index`.
 */
import { texteKampf } from './texte-kampf';
import { texteStab } from './texte-stab';
import { texteWelt } from './texte-welt';

export const texte = {
  // Inhalte von Gebiet 1 (Aufgabe 1.5), aufgeteilt in eigene Dateien:
  // Zauberstäbe und Affixe, Kampf und Beute, Welt und Ablauf.
  ...texteStab,
  ...texteKampf,
  ...texteWelt,

  // Debug-Werkzeuge (Engine, F3/F4/F8)
  'debug.bildrate': 'Bildrate: {wert} FPS',
  'debug.drawcalls': 'Draw-Calls: {wert}',
  'debug.dreiecke': 'Dreiecke: {wert}',
  'debug.entitaeten': 'Entitäten: {wert}',
  'debug.schritt': 'Schritt: {wert}',
  'debug.seed': 'Seed: {wert}',
  'debug.grafikstufe': 'Grafikstufe: {wert}',
  'debug.pausiert': 'Pausiert',
  'debug.seed-start':
    'Zauberstäbe gestartet mit Seed {seed}. Nachstellen mit ?seed={seed} in der Adresszeile.',
  'debug.bericht.titel': 'Zauberstäbe – Fehlerbericht',
  'debug.bericht.zeitpunkt': 'Zeitpunkt',
  'debug.bericht.adresse': 'Adresse',
  'debug.bericht.seed': 'Seed',
  'debug.bericht.schritt': 'Simulationsschritt',
  'debug.bericht.position': 'Spielerposition (x / y / z)',
  'debug.bericht.entitaeten': 'Entitäten',
  'debug.bericht.grafikstufe': 'Grafikstufe',
  'debug.bericht.bildrate': 'Bildrate',
  'debug.bericht.pause': 'Pause',
  'debug.bericht.browser': 'Browser',
  'debug.bericht.grafikkarte': 'Grafikkarte',
  'debug.bericht.bildschirm': 'Fenster',
  'debug.bericht.ereignisse': 'Letzte Ereignisse ({anzahl})',
  'debug.bericht.fehler': 'Konsolenfehler und Warnungen ({anzahl})',
  'debug.bericht.kopiert': 'Fehlerbericht in die Zwischenablage kopiert',
  'debug.bericht.konsole': 'Zwischenablage gesperrt – der Fehlerbericht steht in der Konsole (F12)',

  // Grafikstufen (Debug-Anzeige, später auch Einstellungsmenü)
  'grafikstufe.niedrig': 'Niedrig',
  'grafikstufe.mittel': 'Mittel',
  'grafikstufe.hoch': 'Hoch',
} as const satisfies Record<string, string>;

/** Alle bekannten Textschlüssel. */
export type TextSchluessel = keyof typeof texte;
