/**
 * Baut alle Engine-Teile zusammen: Welt, Simulation, Spielschleife, Kamera,
 * Renderer, Eingabe, Audio und Debug. `main.ts` ruft das einmal beim Start auf
 * und hängt danach die Systeme aus `game`, `world`, `models`, `fx` und `ui` an.
 */
import { AudioGrundlage } from './audio';
import type { EreignisBus } from './bus';
import { Debug } from './debug';
import { Eingabe, erzeugeEingabeSystem } from './eingabe';
import type { Grafikstufe } from './grafikstufe';
import { Kamera } from './kamera';
import { SpielRenderer } from './renderer';
import { Simulation, Spielschleife } from './schleife';
import { t } from './texte';
import { erzeugeWelt, type SpielWelt, type System } from './welt';

export interface EngineOptionen {
  leinwand: HTMLCanvasElement;
  seed: number;
  /** Startstufe. Standard: `mittel`. */
  grafikstufe?: Grafikstufe;
  /**
   * `window.__zauberstaebe` anlegen. Standard: im Dev-Modus oder mit `?debug`
   * in der Adresszeile.
   */
  debugZugriff?: boolean;
  /** Wird nach dem ersten gezeichneten Bild einmal aufgerufen. */
  beiErstemBild?: () => void;
}

export interface Engine {
  readonly seed: number;
  readonly welt: SpielWelt;
  readonly bus: EreignisBus;
  readonly simulation: Simulation;
  readonly schleife: Spielschleife;
  readonly kamera: Kamera;
  readonly renderer: SpielRenderer;
  readonly eingabe: Eingabe;
  readonly audio: AudioGrundlage;
  readonly debug: Debug;
  /** Fügt ein System hinzu. Liefert eine Funktion zum Entfernen. */
  systemHinzufuegen(system: System): () => void;
  /** Startet Systeme und Spielschleife und gibt den Seed in der Konsole aus. */
  starten(): void;
  /** Hält die Spielschleife an. */
  stoppen(): void;
  /** Räumt alles ab (Zuhörer, WebGL, Audio). Danach ist die Engine unbrauchbar. */
  entsorgen(): void;
}

export function erzeugeEngine(optionen: EngineOptionen): Engine {
  const { leinwand } = optionen;
  const welt = erzeugeWelt({ seed: optionen.seed });
  const bus = welt.bus;

  const kamera = new Kamera(window.innerWidth / Math.max(1, window.innerHeight));
  const renderer = new SpielRenderer({ leinwand, kamera, bus, stufe: optionen.grafikstufe });

  const eingabe = new Eingabe();
  eingabe.setzeZielBerechnung((x, y, hoehe) => kamera.bildschirmZuBoden(x, y, hoehe));
  const eingabeLoesen = eingabe.anbinden(window, leinwand);

  const audio = new AudioGrundlage({ bus });

  // Ein fehlerhaftes System soll das Spiel nicht anhalten, aber auch nicht
  // 60-mal pro Sekunde dieselbe Meldung werfen.
  const gemeldet = new Set<string>();
  const simulation = new Simulation(welt, {
    beiFehler: (fehler, system, phase) => {
      const kennung = `${system.name}|${phase}|${String(fehler)}`;
      if (gemeldet.has(kennung)) return;
      gemeldet.add(kennung);
      console.error(`Fehler im System '${system.name}' (${phase}):`, fehler);
    },
  });
  simulation.hinzufuegen(erzeugeEingabeSystem(eingabe));
  simulation.hinzufuegen(kamera);

  let erstesBild = true;
  const schleife: Spielschleife = new Spielschleife({
    simulation,
    bus,
    zeichnen: () => {
      renderer.zeichnen();
      audio.setzeHoerer(kamera.sichtFokus);
      debug.bildGezeichnet();
      if (erstesBild) {
        erstesBild = false;
        optionen.beiErstemBild?.();
      }
    },
  });

  const debug = new Debug({ welt, bus, simulation, schleife, renderer, eingabe });
  const zugriff =
    optionen.debugZugriff ??
    (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug'));
  if (zugriff) debug.zugriffAnlegen();

  // Die Oberfläche bittet um eine Pause (Pausenmenü). Fortsetzen: `schleife.fortsetzen('menue')`.
  const pauseAbmelden = bus.an('absicht:spiel-pausieren', () => schleife.pausieren('menue'));

  return {
    seed: welt.seed,
    welt,
    bus,
    simulation,
    schleife,
    kamera,
    renderer,
    eingabe,
    audio,
    debug,
    systemHinzufuegen: (system) => simulation.hinzufuegen(system),
    starten() {
      console.info(t('debug.seed-start', { seed: String(welt.seed) }));
      schleife.starten();
    },
    stoppen() {
      schleife.stoppen();
    },
    entsorgen() {
      schleife.stoppen();
      simulation.beenden();
      pauseAbmelden();
      eingabeLoesen();
      debug.entsorgen();
      audio.entsorgen();
      renderer.entsorgen();
    },
  };
}
