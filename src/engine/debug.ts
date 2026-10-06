/**
 * Debug-Werkzeuge (Architektur Abschnitt 8).
 *
 * - F3: kleine Anzeige mit Bildrate, Draw-Calls, Dreiecken, Entitäten,
 *   Simulationsschritt, Seed und Grafikstufe.
 * - F8: Fehlerbericht in die Zwischenablage (oder in die Konsole, wenn die
 *   Zwischenablage gesperrt ist), mit kurzer Bestätigung auf dem Bildschirm.
 * - `installiereFehlerSammler()` sammelt ab Start Konsolenfehler, Warnungen
 *   und unbehandelte Ausnahmen für den Bericht.
 * - `window.__zauberstaebe`: nur lesender Zugriff für Tests und den Testbot,
 *   nur im Dev-Modus oder mit `?debug`.
 */
import type { EreignisBus, VerlaufsEintrag } from './bus';
import type { Eingabe } from './eingabe';
import { naechsteGrafikstufe, type Grafikstufe } from './grafikstufe';
import type { SpielRenderer } from './renderer';
import type { Simulation, Spielschleife } from './schleife';
import { t } from './texte';
import type { SpielWelt, Welt } from './welt';

/*
 * Fehlersammler
 */

export interface GesammelterFehler {
  /** Millisekunden seit Seitenstart. */
  readonly zeit: number;
  readonly art: 'fehler' | 'warnung' | 'ausnahme';
  readonly text: string;
}

const MAX_GESAMMELT = 40;
const gesammelt: GesammelterFehler[] = [];
let sammlerInstalliert = false;

/**
 * Sammelt ab jetzt `console.error`, `console.warn`, `window.onerror` und
 * unbehandelte Promise-Fehler. So früh wie möglich aufrufen (erste Zeile in
 * `main.ts`). Mehrfacher Aufruf schadet nicht.
 */
export function installiereFehlerSammler(): void {
  if (sammlerInstalliert || typeof window === 'undefined') return;
  sammlerInstalliert = true;

  const originalFehler = console.error.bind(console);
  const originalWarnung = console.warn.bind(console);
  console.error = (...teile: unknown[]) => {
    merken('fehler', teile);
    originalFehler(...teile);
  };
  console.warn = (...teile: unknown[]) => {
    merken('warnung', teile);
    originalWarnung(...teile);
  };
  window.addEventListener('error', (ereignis) => {
    const ort = ereignis.filename
      ? ` (${ereignis.filename}:${ereignis.lineno}:${ereignis.colno})`
      : '';
    merken('ausnahme', [ereignis.error ?? ereignis.message, ort]);
  });
  window.addEventListener('unhandledrejection', (ereignis) => {
    merken('ausnahme', ['Unbehandelte Promise-Ablehnung:', ereignis.reason]);
  });
}

/** Bisher gesammelte Fehler und Warnungen, die ältesten zuerst. */
export function gesammelteFehler(): readonly GesammelterFehler[] {
  return [...gesammelt];
}

function merken(art: GesammelterFehler['art'], teile: readonly unknown[]): void {
  const text = teile.map((teil) => alsText(teil)).join(' ');
  gesammelt.push({ zeit: Math.round(performance.now()), art, text });
  if (gesammelt.length > MAX_GESAMMELT) gesammelt.shift();
}

function alsText(wert: unknown): string {
  if (wert instanceof Error) return wert.stack ?? `${wert.name}: ${wert.message}`;
  if (typeof wert === 'string') return wert;
  return sicheresJson(wert);
}

/**
 * JSON, das nie wirft: Kreise werden abgeschnitten, Zahlen auf drei
 * Nachkommastellen gerundet, Tiefe begrenzt.
 */
export function sicheresJson(wert: unknown, maxTiefe = 4): string {
  const gesehen = new WeakSet<object>();
  const umwandeln = (w: unknown, tiefe: number): unknown => {
    if (typeof w === 'number') return Number.isFinite(w) ? Math.round(w * 1000) / 1000 : String(w);
    if (typeof w === 'bigint') return String(w);
    if (typeof w === 'function') return '[Funktion]';
    if (typeof w !== 'object' || w === null) return w;
    if (gesehen.has(w)) return '[Kreis]';
    if (tiefe >= maxTiefe) return '[…]';
    gesehen.add(w);
    if (Array.isArray(w)) return w.slice(0, 20).map((x) => umwandeln(x, tiefe + 1));
    if (w instanceof Set) return [...w].slice(0, 20).map((x) => umwandeln(x, tiefe + 1));
    if (w instanceof Map) {
      return Object.fromEntries(
        [...w.entries()].slice(0, 20).map(([k, v]) => [String(k), umwandeln(v, tiefe + 1)]),
      );
    }
    const ergebnis: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(w)) ergebnis[k] = umwandeln(v, tiefe + 1);
    return ergebnis;
  };
  try {
    return JSON.stringify(umwandeln(wert, 0)) ?? String(wert);
  } catch {
    return String(wert);
  }
}

/*
 * Nur lesender Zugriff für Tests und Testbot
 */

/** Serialisierbare Momentaufnahme einer Entität. */
export interface EntitaetsAufnahme {
  id: number;
  marken: string[];
  position: { x: number; y: number; z: number };
  blickrichtung: number;
}

/** `window.__zauberstaebe` */
export interface DebugZugriff {
  /** Die Welt. Nur lesen! Wer hier schreibt, bricht die Reproduzierbarkeit. */
  readonly welt: Welt;
  readonly schritt: number;
  readonly seed: number;
  readonly grafikstufe: Grafikstufe;
  readonly pausiert: boolean;
  /** Gezeichnete Bilder seit dem Start, z. B. um auf das nächste Bild zu warten. */
  readonly bilder: number;
  /** Simuliert sofort `n` Schritte (höchstens 3600), unabhängig von der Bildrate. */
  simuliere(n: number): void;
  /** Spielerposition und Blickrichtung oder `null` ohne Spieler. */
  spieler(): EntitaetsAufnahme | null;
  /** Alle lebenden Entitäten als einfache Daten. */
  entitaeten(): EntitaetsAufnahme[];
  /** Die letzten Ereignisse (wie im F8-Bericht). */
  ereignisse(): VerlaufsEintrag[];
  /** Der Fehlerbericht als Text. */
  fehlerbericht(): string;
}

declare global {
  interface Window {
    __zauberstaebe?: DebugZugriff;
  }
}

/*
 * Debug-Anzeige und Fehlerbericht
 */

export interface DebugOptionen {
  welt: SpielWelt;
  bus: EreignisBus;
  simulation: Simulation;
  schleife: Spielschleife;
  renderer: SpielRenderer;
  eingabe: Eingabe;
  /** Hierhin kommen Anzeige und Meldungen. Standard: `document.body`. */
  wurzel?: HTMLElement;
}

const ANZEIGE_TAKT_MS = 250;
const MELDUNG_DAUER_MS = 2500;

export class Debug {
  private readonly o: DebugOptionen;
  private readonly wurzel: HTMLElement;
  private anzeige: HTMLElement | null = null;
  private meldung: HTMLElement | null = null;
  private meldungsTimer: ReturnType<typeof setTimeout> | null = null;
  private letzteAktualisierung = -Infinity;
  private readonly abmelden: (() => void)[] = [];

  constructor(optionen: DebugOptionen) {
    this.o = optionen;
    this.wurzel = optionen.wurzel ?? document.body;
    const { eingabe } = optionen;
    this.abmelden.push(
      eingabe.beiAktion('debug-anzeige', () => this.anzeigeUmschalten()),
      eingabe.beiAktion('grafikstufe', () => this.grafikstufeWeiterschalten()),
      eingabe.beiAktion('fehlerbericht', () => void this.fehlerberichtKopieren()),
    );
  }

  get anzeigeSichtbar(): boolean {
    return this.anzeige !== null && !this.anzeige.hidden;
  }

  anzeigeUmschalten(): void {
    const anzeige = this.anzeigeHolen();
    anzeige.hidden = !anzeige.hidden;
    if (!anzeige.hidden) this.anzeigeAktualisieren();
  }

  /** F4: nächste Grafikstufe mit kurzer Bestätigung. */
  grafikstufeWeiterschalten(): void {
    const renderer = this.o.renderer;
    const naechste = naechsteGrafikstufe(renderer.stufe);
    renderer.setzeStufe(naechste);
    this.melden(t('debug.grafikstufe', { wert: t(`grafikstufe.${naechste}`) }));
  }

  /** Nach jedem gezeichneten Bild aufrufen. Aktualisiert die Anzeige ein paar Mal pro Sekunde. */
  bildGezeichnet(): void {
    if (!this.anzeigeSichtbar) return;
    const jetzt = performance.now();
    if (jetzt - this.letzteAktualisierung < ANZEIGE_TAKT_MS) return;
    this.letzteAktualisierung = jetzt;
    this.anzeigeAktualisieren();
  }

  /** Baut den Fehlerbericht als Text. */
  fehlerbericht(): string {
    const { welt, bus, schleife, renderer } = this.o;
    const spieler = welt.entitaeten.ersteMitMarke('spieler');
    const zeilen: string[] = [];
    const kopf = (schluessel: string, anzahl?: number): void => {
      zeilen.push('', `--- ${t(schluessel, anzahl === undefined ? undefined : { anzahl })} ---`);
    };
    const feld = (schluessel: string, wert: string | number): void => {
      zeilen.push(`${t(schluessel)}: ${wert}`);
    };

    zeilen.push(`=== ${t('debug.bericht.titel')} ===`);
    feld('debug.bericht.zeitpunkt', new Date().toISOString());
    feld('debug.bericht.adresse', location.href);
    feld('debug.bericht.seed', welt.seed);
    feld('debug.bericht.schritt', `${welt.schritt} (${welt.zeit.toFixed(2)} s)`);
    feld(
      'debug.bericht.position',
      spieler === undefined
        ? '–'
        : `${spieler.position.x.toFixed(2)} / ${spieler.position.y.toFixed(2)} / ${spieler.position.z.toFixed(2)}`,
    );
    feld('debug.bericht.entitaeten', welt.entitaeten.anzahl);
    feld('debug.bericht.grafikstufe', renderer.stufe);
    feld('debug.bericht.bildrate', Math.round(schleife.statistik.bildrate));
    feld('debug.bericht.pause', schleife.pausiert ? schleife.pausenGruende.join(', ') : '–');
    feld('debug.bericht.browser', navigator.userAgent);
    feld('debug.bericht.grafikkarte', this.grafikkarteSicher());
    feld(
      'debug.bericht.bildschirm',
      `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}`,
    );

    const verlauf = bus.verlauf();
    kopf('debug.bericht.ereignisse', verlauf.length);
    for (const e of verlauf) {
      const schritte =
        e.ersterSchritt === e.letzterSchritt
          ? `${e.ersterSchritt}`
          : `${e.ersterSchritt}–${e.letzterSchritt}`;
      const anzahl = e.anzahl > 1 ? ` ×${e.anzahl}` : '';
      zeilen.push(`[${schritte}] ${e.name}${anzahl} ${sicheresJson(e.nutzlast)}`);
    }

    const fehler = gesammelteFehler();
    kopf('debug.bericht.fehler', fehler.length);
    if (fehler.length === 0) zeilen.push('–');
    for (const f of fehler) zeilen.push(`[${(f.zeit / 1000).toFixed(1)} s] ${f.art}: ${f.text}`);

    return zeilen.join('\n');
  }

  /** F8: Bericht in die Zwischenablage, sonst in die Konsole. */
  async fehlerberichtKopieren(): Promise<void> {
    const bericht = this.fehlerbericht();
    try {
      if (navigator.clipboard?.writeText === undefined) throw new Error('keine Zwischenablage');
      await navigator.clipboard.writeText(bericht);
      this.melden(t('debug.bericht.kopiert'));
    } catch {
      console.info(bericht);
      this.melden(t('debug.bericht.konsole'));
    }
  }

  /** Kurze Bestätigung oben in der Mitte. */
  melden(text: string): void {
    if (this.meldung === null) {
      const meldung = document.createElement('div');
      meldung.className = 'debug-meldung';
      meldung.setAttribute('role', 'status');
      this.wurzel.append(meldung);
      this.meldung = meldung;
    }
    const meldung = this.meldung;
    meldung.textContent = text;
    meldung.hidden = false;
    if (this.meldungsTimer !== null) clearTimeout(this.meldungsTimer);
    this.meldungsTimer = setTimeout(() => {
      meldung.hidden = true;
    }, MELDUNG_DAUER_MS);
  }

  /** Legt `window.__zauberstaebe` an (nur lesend). */
  zugriffAnlegen(): void {
    const { welt, simulation, schleife, renderer, bus } = this.o;
    const aufnahme = (e: {
      id: number;
      marken: Set<string>;
      position: { x: number; y: number; z: number };
      blickrichtung: number;
    }): EntitaetsAufnahme => ({
      id: e.id,
      marken: [...e.marken],
      position: { x: e.position.x, y: e.position.y, z: e.position.z },
      blickrichtung: e.blickrichtung,
    });
    const zugriff: DebugZugriff = {
      get welt() {
        return welt;
      },
      get schritt() {
        return welt.schritt;
      },
      get seed() {
        return welt.seed;
      },
      get grafikstufe() {
        return renderer.stufe;
      },
      get pausiert() {
        return schleife.pausiert;
      },
      get bilder() {
        return schleife.statistik.bilder;
      },
      simuliere(n: number) {
        const anzahl = Math.max(0, Math.min(3600, Math.floor(Number(n) || 0)));
        simulation.schritte(anzahl);
      },
      spieler() {
        const spieler = welt.entitaeten.ersteMitMarke('spieler');
        return spieler === undefined ? null : aufnahme(spieler);
      },
      entitaeten() {
        return welt.entitaeten.alle().map(aufnahme);
      },
      ereignisse() {
        return bus.verlauf();
      },
      fehlerbericht: () => this.fehlerbericht(),
    };
    Object.defineProperty(window, '__zauberstaebe', {
      value: Object.freeze(zugriff),
      configurable: true,
      enumerable: false,
      writable: false,
    });
  }

  entsorgen(): void {
    for (const abmelden of this.abmelden) abmelden();
    this.abmelden.length = 0;
    this.anzeige?.remove();
    this.meldung?.remove();
    if (this.meldungsTimer !== null) clearTimeout(this.meldungsTimer);
  }

  private anzeigeHolen(): HTMLElement {
    if (this.anzeige === null) {
      const anzeige = document.createElement('div');
      anzeige.id = 'debug-anzeige';
      anzeige.hidden = true;
      anzeige.setAttribute('aria-live', 'off');
      this.wurzel.append(anzeige);
      this.anzeige = anzeige;
    }
    return this.anzeige;
  }

  private anzeigeAktualisieren(): void {
    const anzeige = this.anzeigeHolen();
    const { welt, schleife, renderer } = this.o;
    const statistik = renderer.statistik;
    const zeilen = [
      t('debug.bildrate', { wert: Math.round(schleife.statistik.bildrate) }),
      t('debug.drawcalls', { wert: statistik.drawCalls }),
      t('debug.dreiecke', { wert: statistik.dreiecke }),
      t('debug.entitaeten', { wert: welt.entitaeten.anzahl }),
      t('debug.schritt', { wert: welt.schritt }),
      t('debug.seed', { wert: String(welt.seed) }),
      t('debug.grafikstufe', { wert: t(`grafikstufe.${renderer.stufe}`) }),
    ];
    if (schleife.pausiert) zeilen.push(t('debug.pausiert'));
    anzeige.textContent = zeilen.join('\n');
  }

  private grafikkarteSicher(): string {
    try {
      return this.o.renderer.grafikkarte();
    } catch {
      return '?';
    }
  }
}
