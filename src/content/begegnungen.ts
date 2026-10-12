/**
 * Die vier Begegnungen von Gebiet 1. Die IDs `kampf1`, `kampf2`, `kampf3` und
 * `boss` entsprechen `BegegnungId` in `src/world/vertraege.ts`.
 *
 * Jede Begegnung bringt dem Spieler etwas bei:
 * - Kampf 1: zwei Wölfe, der Feuerball genügt
 * - Kampf 2: Wölfe und ein Irrlicht, das aus der Ferne schießt (Ausweichrolle, Frostnova)
 * - Kampf 3: ein Rudel an der Ruine mit einem Warg, danach die Truhe mit dem ersten magischen Stab
 * - Boss: Grimmzahn auf der Lichtung, Dornenranken schließen die Arena
 */
import type { BegegnungDaten, BegegnungKennung } from './typen';

export const BEGEGNUNGEN = {
  kampf1: {
    id: 'kampf1',
    nameSchluessel: 'begegnung.kampf1.name',
    hinweisSchluessel: 'begegnung.kampf1.hinweis',
    ort: 'kampf1',
    wellen: [[{ art: 'wolf', anzahl: 2 }]],
  },
  kampf2: {
    id: 'kampf2',
    nameSchluessel: 'begegnung.kampf2.name',
    hinweisSchluessel: 'begegnung.kampf2.hinweis',
    ort: 'kampf2',
    wellen: [
      [
        { art: 'wolf', anzahl: 2 },
        { art: 'irrlicht', anzahl: 1 },
      ],
    ],
  },
  kampf3: {
    id: 'kampf3',
    nameSchluessel: 'begegnung.kampf3.name',
    hinweisSchluessel: 'begegnung.kampf3.hinweis',
    ort: 'kampf3',
    wellen: [[{ art: 'wolf', anzahl: 3 }], [{ art: 'warg', anzahl: 1 }]],
    truhe: {
      ort: 'truhe',
      inhalt: [
        { art: 'zauberstab', chance: 1, stufe: 2, seltenheit: 'magisch' },
        { art: 'gold', chance: 1, menge: [15, 25] },
        { art: 'trank', trank: 'leben', chance: 1 },
      ],
    },
  },
  boss: {
    id: 'boss',
    nameSchluessel: 'begegnung.boss.name',
    hinweisSchluessel: 'begegnung.boss.hinweis',
    ort: 'bosslichtung',
    wellen: [[{ art: 'grimmzahn', anzahl: 1 }]],
    schliesstArena: true,
  },
} as const satisfies Record<BegegnungKennung, BegegnungDaten>;
