/**
 * Stufen 1 bis 4: EP-Schwellen und Grundwerte des Zauberers ohne Stab.
 *
 * Die EP-Schwellen sind Gesamt-EP. Ziel: In 10 bis 15 Minuten Spielzeit
 * führen die Gegner und Questschritte ungefähr bis Stufe 4.
 *
 * EP-Bilanz (siehe Datentest `inhalte-balance`):
 *
 * | Quelle                              | EP    | Summe |
 * | ----------------------------------- | ----- | ----- |
 * | Questschritt Wegweiser              | 10    | 10    |
 * | Kampf 1: 2 Wölfe à 15               | 30    | 40    |
 * | Kampf 2: 2 Wölfe à 15, Irrlicht 25  | 55    | 95    |
 * | Kampf 3: 3 Wölfe à 15, Warg 45      | 90    | 185   |
 * | Questschritt Waldrand               | 20    | 205   |
 * | Grimmzahn                           | 300   | 505   |
 *
 * Stufe 2 fällt also in Kampf 1, Stufe 3 in Kampf 3 und Stufe 4 mit dem Sieg
 * über Grimmzahn (vor dem Boss fehlen 55 EP zur Schwelle). Der Zauberer
 * ohne Stab hat wenig Zauberkraft; sie kommt vor allem vom Stab
 * (`ZAUBERKRAFT_STUFENFAKTOR` in `zauberstaebe.ts`).
 */
import type { StufenDaten } from './typen';

export const STUFEN = [
  {
    stufe: 1,
    epSchwelle: 0,
    leben: 100,
    mana: 60,
    zauberkraft: 4,
    manaregeneration: 3,
    lebensregeneration: 0.5,
  },
  {
    stufe: 2,
    epSchwelle: 30,
    leben: 130,
    mana: 75,
    zauberkraft: 6,
    manaregeneration: 3.5,
    lebensregeneration: 0.7,
  },
  {
    stufe: 3,
    epSchwelle: 100,
    leben: 165,
    mana: 92,
    zauberkraft: 8,
    manaregeneration: 4,
    lebensregeneration: 0.9,
  },
  {
    stufe: 4,
    epSchwelle: 260,
    leben: 205,
    mana: 112,
    zauberkraft: 10,
    manaregeneration: 4.5,
    lebensregeneration: 1.1,
  },
] as const satisfies readonly StufenDaten[];

export const HOECHSTE_STUFE = 4;
