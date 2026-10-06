/**
 * Grafikstufen: niedrig, mittel, hoch.
 *
 * Der Renderer setzt die Stufe um. Andere Bausteine (z. B. Partikel in `fx`)
 * fragen sie mit `aktuelleGrafikstufe()` ab und hören auf
 * `grafikstufe:geaendert`, um ihren Aufwand anzupassen.
 */

export type Grafikstufe = 'niedrig' | 'mittel' | 'hoch';

export const GRAFIKSTUFEN: readonly Grafikstufe[] = ['niedrig', 'mittel', 'hoch'];

export const STANDARD_GRAFIKSTUFE: Grafikstufe = 'mittel';

/** Was eine Stufe am Renderer einstellt. Feinabstimmung: Aufgaben 1.4 und 3.5. */
export interface StufenEinstellung {
  /** Obergrenze für `devicePixelRatio`. */
  pixelVerhaeltnisMax: number;
  /** Kantenlänge der Schattenkarte in Pixeln. */
  schattenAufloesung: number;
  /** Umgebungsverdeckung (GTAO). */
  ao: boolean;
  /** Leuchten heller Stellen (Bloom). */
  bloom: boolean;
  /** Kantenglättung der Nachbearbeitung (MSAA-Samples, 0 = aus). */
  msaa: number;
}

export const STUFEN_EINSTELLUNGEN: Readonly<Record<Grafikstufe, Readonly<StufenEinstellung>>> =
  Object.freeze({
    niedrig: { pixelVerhaeltnisMax: 1, schattenAufloesung: 1024, ao: false, bloom: false, msaa: 0 },
    mittel: { pixelVerhaeltnisMax: 1.5, schattenAufloesung: 2048, ao: true, bloom: true, msaa: 2 },
    hoch: { pixelVerhaeltnisMax: 2, schattenAufloesung: 4096, ao: true, bloom: true, msaa: 4 },
  });

export function istGrafikstufe(wert: unknown): wert is Grafikstufe {
  return wert === 'niedrig' || wert === 'mittel' || wert === 'hoch';
}

/** Die nächste Stufe im Kreis: niedrig → mittel → hoch → niedrig (Taste F4). */
export function naechsteGrafikstufe(stufe: Grafikstufe): Grafikstufe {
  const index = GRAFIKSTUFEN.indexOf(stufe);
  return GRAFIKSTUFEN[(index + 1) % GRAFIKSTUFEN.length] ?? STANDARD_GRAFIKSTUFE;
}

/** Liest `?grafik=niedrig|mittel|hoch` aus der Adresszeile. */
export function grafikstufeAusAdresse(suche: string): Grafikstufe | null {
  const wert = new URLSearchParams(suche).get('grafik');
  return istGrafikstufe(wert) ? wert : null;
}

let aktuelle: Grafikstufe = STANDARD_GRAFIKSTUFE;

/** Die Stufe, die der Renderer gerade verwendet. */
export function aktuelleGrafikstufe(): Grafikstufe {
  return aktuelle;
}

/** Nur für den Renderer. */
export function merkeGrafikstufe(stufe: Grafikstufe): void {
  aktuelle = stufe;
}
