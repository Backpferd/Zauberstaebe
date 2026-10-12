/**
 * Öffentliche Schnittstelle des Engine-Kerns.
 *
 * Alle anderen Ordner importieren ausschließlich von hier:
 *
 *   import { komponente, type System, type Welt } from '@engine/index';
 *
 * Was hier nicht steht, ist intern und kann sich ohne Ankündigung ändern.
 * Anleitung mit Beispielen: `docs/architektur.md`, Abschnitt 9.
 */

// Vektoren und Winkel
export {
  abstandXZ,
  abstandXZQuadrat,
  kopiereVec3,
  mischeVec3,
  mischeWinkel,
  normalisiereWinkel,
  richtungAusWinkel,
  setzeVec3,
  vec3,
  winkelAusRichtung,
  winkelZu,
} from './vektor';
export type { Vec3, VecXZ } from './vektor';

// Ereignisse und Bus
export { EreignisBus, erzeugeBus } from './bus';
export type { Bus, BusOptionen, VerlaufsEintrag } from './bus';
export type {
  Ausruestungsplatz,
  BossAngriff,
  Einstellungswert,
  EreignisName,
  Ereignisse,
  Fehlschlagsgrund,
  Gegenstand,
  GegnerArt,
  GegnerZustand,
  Hoerer,
  Leer,
  NeueWerte,
  Quelle,
  Schadenselement,
  Seltenheit,
  TrankArt,
  WarnForm,
  Zustandseffekt,
} from './ereignisse';

// Zufall
export { erzeugeZufall, seedAusAdresse, textHash, zufaelligerSeed } from './zufall';
export type { SeedZufall, Zufall } from './zufall';

// Welt, Entitäten, Komponenten
export { erzeugeWelt, SCHRITT, SCHRITTE_PRO_SEKUNDE, SpielWelt } from './welt';
export type { System, Welt, WeltOptionen } from './welt';
export {
  brauchtKomponente,
  entferneKomponente,
  hatKomponente,
  holeKomponente,
  interpoliereBlickrichtung,
  interpolierePosition,
  komponente,
  mit,
  setzeKomponente,
  teleportiere,
} from './entitaeten';
export type {
  Entitaet,
  EntitaetId,
  Entitaeten,
  KomponentenEintrag,
  KomponentenTyp,
  Marke,
  NeueEntitaet,
} from './entitaeten';

// Simulation und Spielschleife
export {
  browserUhr,
  dokumentSichtbarkeit,
  ManuelleUhr,
  Simulation,
  Spielschleife,
} from './schleife';
export type {
  BildRueckruf,
  PausenGrund,
  SchleifenOptionen,
  SchleifenStatistik,
  Sichtbarkeit,
  SimulationsOptionen,
  SystemPhase,
  Uhr,
} from './schleife';

// Eingabe
export {
  AKTIONEN,
  Eingabe,
  erzeugeEingabeSystem,
  MAUS_LINKS,
  MAUS_MITTE,
  MAUS_RECHTS,
  STANDARD_BELEGUNG,
} from './eingabe';
export type { Aktion, Belegung, EingabeZustand, Taste, ZielBerechnung } from './eingabe';

// Kamera, Renderer, Grafikstufen
export { Kamera, KAMERA_SICHTWINKEL, KAMERA_VERSATZ } from './kamera';
export { EBENE_EFFEKTE, SpielRenderer } from './renderer';
export type { RendererOptionen, RenderStatistik } from './renderer';
export { SchattenLicht } from './schatten';
export {
  aktuelleGrafikstufe,
  grafikstufeAusAdresse,
  GRAFIKSTUFEN,
  istGrafikstufe,
  naechsteGrafikstufe,
  STANDARD_GRAFIKSTUFE,
  STUFEN_EINSTELLUNGEN,
} from './grafikstufe';
export type { Grafikstufe, StufenEinstellung } from './grafikstufe';

// Texte
export { hatText, registriereTexte, t } from './texte';
export type { Texttabelle, Textwerte } from './texte';

// Audio
export { AudioGrundlage, KANAELE } from './audio';
export type { AudioOptionen, Kanal, KlangErzeuger, KlangKontext, KlangOptionen } from './audio';

// Debug
export { Debug, gesammelteFehler, installiereFehlerSammler, sicheresJson } from './debug';
export type { DebugZugriff, EntitaetsAufnahme, GesammelterFehler } from './debug';

// Zusammenbau
export { erzeugeEngine } from './engine';
export type { Engine, EngineOptionen } from './engine';
