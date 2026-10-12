/**
 * Zauberstab-Generator und Wertberechnung (Aufgabe 1.5).
 *
 * ```ts
 * const stab = erzeugeZauberstab(welt.zufall.abzweig('beute'), { stufe: 2 });
 * const werte = berechneWerte(stab);
 * ```
 */
import type { Zauberstab } from '@content/typen';
import type { Gegenstand } from '@engine/index';

export { erzeugeZauberstab, wuerfleSeltenheit } from './erzeugen';
export type { StabOptionen } from './erzeugen';
export {
  baueFestesAffix,
  berechneWerte,
  findeLaenge,
  formatiereAffix,
  kernAffix,
  tabellenWert,
} from './werte';
export type { StabWerte } from './werte';

/** Ist dieser Gegenstand ein Zauberstab? Engt den schmalen `Gegenstand` aus der Engine ein. */
export function istZauberstab(gegenstand: Gegenstand): gegenstand is Gegenstand & Zauberstab {
  return 'holz' in gegenstand && 'kern' in gegenstand && 'affixe' in gegenstand;
}
