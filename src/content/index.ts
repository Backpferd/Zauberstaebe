/**
 * Sammelstelle für alle Inhaltsdaten von Gebiet 1 (Aufgabe 1.5).
 *
 * Alles Daten, keine Logik. Texte kommen über `texte` (Schlüssel) und werden
 * mit `t()` aus `@engine/index` aufgelöst.
 */
export { AFFIXE, AFFIX_LISTE } from './affixe';
export { BEGEGNUNGEN } from './begegnungen';
export { GOLD, MATERIALIEN } from './beute';
export { HOECHSTE_STUFE, STUFEN } from './fortschritt';
export { GEBIET, ORTE, REGIONEN, WEGWEISER } from './gebiet';
export { GEGNER } from './gegner';
export { QUEST } from './quest';
export { SELTENHEITEN, SELTENHEIT_REIHENFOLGE } from './seltenheiten';
export { texte } from './texte';
export type { TextSchluessel } from './texte';
export { TRANKE } from './tranke';
export { ZAUBER } from './zauber';
export {
  BESCHREIBUNG_EINLEITUNGEN,
  EINZIGARTIGE,
  GUETE_SPANNE,
  HOELZER,
  KERNE,
  LAENGEN,
  MANA_STUFENFAKTOR,
  STAB_LISTE,
  STAB_LISTE_CHANCE,
  ZAUBERKRAFT_STUFENFAKTOR,
} from './zauberstaebe';
export type * from './typen';
