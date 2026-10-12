/**
 * Hauptquest „Die unleserliche Schriftrolle“ mit fünf Schritten (`PLAN.md`,
 * Abschnitt 1).
 *
 * Jeder Auslöser nennt ein Ereignis aus `docs/architektur.md`, Abschnitt 3,
 * und die Bedingung dazu:
 * - `interaktion:ausgeloest`: `objektId` ist ein Ort (zum Beispiel `wegweiser`)
 * - `spieler:bewegt`: der Spieler ist näher als `radius` Meter am Ort `nahe`
 * - `begegnung:gestartet` und `begegnung:beendet`: `begegnungId` stimmt
 * - `gegner:besiegt`: `art` stimmt
 *
 * Die Quest startet, wenn der Spieler die Schriftrolle aufhebt. Mit dem
 * letzten Schritt endet der Testlauf; die Fortsetzung („Das Dorf“) gehört
 * zu einem späteren Gebiet.
 */
import type { QuestDaten } from './typen';

export const QUEST = {
  id: 'schriftrolle',
  titelSchluessel: 'quest.schriftrolle.titel',
  beschreibungSchluessel: 'quest.schriftrolle.beschreibung',
  start: { ereignis: 'interaktion:ausgeloest', objektId: 'schriftrolle' },
  schritte: [
    {
      id: 'wegekreuz',
      ausloeser: { ereignis: 'spieler:bewegt', nahe: 'wegekreuz', radius: 6 },
      vorherSchluessel: 'quest.schriftrolle.schritt.wegekreuz.vorher',
      nachherSchluessel: 'quest.schriftrolle.schritt.wegekreuz.nachher',
    },
    {
      id: 'wegweiser',
      ausloeser: { ereignis: 'interaktion:ausgeloest', objektId: 'wegweiser' },
      vorherSchluessel: 'quest.schriftrolle.schritt.wegweiser.vorher',
      nachherSchluessel: 'quest.schriftrolle.schritt.wegweiser.nachher',
      belohnung: { ep: 10 },
    },
    {
      id: 'umweg',
      ausloeser: { ereignis: 'begegnung:gestartet', begegnungId: 'kampf1' },
      vorherSchluessel: 'quest.schriftrolle.schritt.umweg.vorher',
      nachherSchluessel: 'quest.schriftrolle.schritt.umweg.nachher',
    },
    {
      id: 'waldrand',
      ausloeser: { ereignis: 'spieler:bewegt', nahe: 'arena-eingang', radius: 5 },
      vorherSchluessel: 'quest.schriftrolle.schritt.waldrand.vorher',
      nachherSchluessel: 'quest.schriftrolle.schritt.waldrand.nachher',
      belohnung: { ep: 20 },
    },
    {
      id: 'grimmzahn',
      ausloeser: { ereignis: 'gegner:besiegt', art: 'grimmzahn' },
      vorherSchluessel: 'quest.schriftrolle.schritt.grimmzahn.vorher',
      nachherSchluessel: 'quest.schriftrolle.schritt.grimmzahn.nachher',
      belohnung: { gold: 50 },
    },
  ],
  abschlussSchluessel: 'quest.schriftrolle.abschluss',
} as const satisfies QuestDaten;
