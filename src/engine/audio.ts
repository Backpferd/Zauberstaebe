/**
 * Audio-Grundlage: AudioContext, Lautstärkekanäle und Klangerzeuger.
 *
 * - Der AudioContext entsteht erst nach der ersten Nutzereingabe
 *   (Autoplay-Regeln der Browser). Klänge davor werden still übergangen.
 * - Kanäle: `gesamt` → Lautsprecher, `effekte` und `umgebung` → `gesamt`.
 * - Klänge sind Funktionen, die mit der Web-Audio-API Töne erzeugen
 *   (Aufgabe 1.6). Sie werden per Name registriert und über das Ereignis
 *   `audio:abspielen` abgespielt.
 */
import type { Bus } from './bus';
import type { Vec3 } from './vektor';

export type Kanal = 'gesamt' | 'effekte' | 'umgebung';

export const KANAELE: readonly Kanal[] = ['gesamt', 'effekte', 'umgebung'];

/** Was ein Klangerzeuger zum Abspielen bekommt. */
export interface KlangKontext {
  readonly kontext: AudioContext;
  /**
   * Hier hinein verbinden. Lautstärke, Entfernung und Stereo-Lage sind darin
   * schon eingerechnet.
   */
  readonly ausgang: AudioNode;
  /** Startzeit in `kontext.currentTime`. */
  readonly zeit: number;
  /** Gewünschte Lautstärke (0 bis 1), zur Information; `ausgang` berücksichtigt sie bereits. */
  readonly lautstaerke: number;
  /** Ort des Klangs oder `null` für Oberflächenklänge. */
  readonly position: Readonly<Vec3> | null;
}

/** Erzeugt einen Klang. Läuft synchron; geplante Töne nutzen `kontext.zeit`. */
export type KlangErzeuger = (k: KlangKontext) => void;

export interface KlangOptionen {
  /** Standard: `effekte`. */
  kanal?: Exclude<Kanal, 'gesamt'>;
}

export interface AudioOptionen {
  bus?: Bus;
  /** Für Tests: eigener Kontext statt `new AudioContext()`. */
  kontextFabrik?: () => AudioContext;
  /** Fenster, dessen erste Eingabe den Ton freischaltet. Standard: `window`. */
  fenster?: Window;
}

/** Ab dieser Entfernung (m) wird ein Klang leiser. */
const VOLL_HOERBAR_BIS = 8;
/** Auf dieser Strecke (m) halbiert sich die Lautstärke jenseits von `VOLL_HOERBAR_BIS`. */
const HALBWERT_STRECKE = 12;
/** Bei diesem seitlichen Abstand (m) liegt ein Klang ganz links oder rechts. */
const STEREO_BREITE = 16;

interface Eintrag {
  erzeuger: KlangErzeuger;
  kanal: Exclude<Kanal, 'gesamt'>;
}

export class AudioGrundlage {
  private kontextIntern: AudioContext | null = null;
  private readonly kanalKnoten = new Map<Kanal, GainNode>();
  private readonly pegel: Record<Kanal, number> = { gesamt: 1, effekte: 1, umgebung: 1 };
  private readonly klaenge = new Map<string, Eintrag>();
  private readonly unbekanntGemeldet = new Set<string>();
  private readonly hoerer: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly kontextFabrik: () => AudioContext;
  private readonly abmelden: (() => void)[] = [];

  constructor(optionen: AudioOptionen = {}) {
    this.kontextFabrik = optionen.kontextFabrik ?? (() => new AudioContext());
    if (optionen.bus !== undefined) {
      this.abmelden.push(
        optionen.bus.an('audio:abspielen', ({ name, position, lautstaerke }) =>
          this.abspielen(name, { position, lautstaerke }),
        ),
      );
    }
    const fenster = optionen.fenster ?? (typeof window === 'undefined' ? undefined : window);
    if (fenster !== undefined) {
      const freischalten = (): void => this.freischalten();
      const ereignisse = ['pointerdown', 'mousedown', 'keydown', 'touchstart'] as const;
      for (const name of ereignisse) fenster.addEventListener(name, freischalten, true);
      this.abmelden.push(() => {
        for (const name of ereignisse) fenster.removeEventListener(name, freischalten, true);
      });
    }
  }

  /** Der AudioContext, sobald er freigeschaltet ist. */
  get kontext(): AudioContext | null {
    return this.kontextIntern;
  }

  get bereit(): boolean {
    return this.kontextIntern !== null && this.kontextIntern.state === 'running';
  }

  /**
   * Legt den AudioContext an oder weckt ihn auf. Wird bei der ersten
   * Nutzereingabe automatisch aufgerufen.
   */
  freischalten(): void {
    if (this.kontextIntern === null) {
      let kontext: AudioContext;
      try {
        kontext = this.kontextFabrik();
      } catch (fehler) {
        console.warn('Audio nicht verfügbar:', fehler);
        return;
      }
      this.kontextIntern = kontext;
      const gesamt = kontext.createGain();
      gesamt.connect(kontext.destination);
      this.kanalKnoten.set('gesamt', gesamt);
      for (const kanal of ['effekte', 'umgebung'] as const) {
        const knoten = kontext.createGain();
        knoten.connect(gesamt);
        this.kanalKnoten.set(kanal, knoten);
      }
      for (const kanal of KANAELE) this.pegelAnwenden(kanal, true);
    }
    if (this.kontextIntern.state === 'suspended') {
      this.kontextIntern.resume().catch(() => {
        // Ohne Nutzereingabe darf der Browser ablehnen; die nächste Eingabe versucht es erneut.
      });
    }
  }

  /** Registriert einen Klangerzeuger unter einem Namen (überschreibt einen gleichnamigen). */
  registriereKlang(name: string, erzeuger: KlangErzeuger, optionen: KlangOptionen = {}): void {
    this.klaenge.set(name, { erzeuger, kanal: optionen.kanal ?? 'effekte' });
  }

  hatKlang(name: string): boolean {
    return this.klaenge.has(name);
  }

  /** Lautstärke eines Kanals, 0 bis 1. */
  lautstaerke(kanal: Kanal): number {
    return this.pegel[kanal];
  }

  setzeLautstaerke(kanal: Kanal, wert: number): void {
    this.pegel[kanal] = Number.isFinite(wert) ? Math.min(1, Math.max(0, wert)) : 0;
    this.pegelAnwenden(kanal, false);
  }

  /** Position des Zuhörers (meist der Kamerafokus), für Entfernung und Stereo-Lage. */
  setzeHoerer(position: Readonly<Vec3>): void {
    this.hoerer.x = position.x;
    this.hoerer.y = position.y;
    this.hoerer.z = position.z;
  }

  /** Spielt einen Klang ab. Normalerweise über das Ereignis `audio:abspielen`. */
  abspielen(
    name: string,
    optionen: { position?: Readonly<Vec3> | null; lautstaerke?: number } = {},
  ): void {
    const eintrag = this.klaenge.get(name);
    if (eintrag === undefined) {
      if (!this.unbekanntGemeldet.has(name)) {
        this.unbekanntGemeldet.add(name);
        console.warn(`Unbekannter Klang '${name}' (noch nicht registriert).`);
      }
      return;
    }
    const kontext = this.kontextIntern;
    const kanal = this.kanalKnoten.get(eintrag.kanal);
    if (kontext === null || kanal === undefined || kontext.state !== 'running') return;

    const position = optionen.position ?? null;
    const lautstaerke = Math.max(0, optionen.lautstaerke ?? 1);
    let pegel = lautstaerke;
    let ausgang: AudioNode = kanal;

    const verstaerker = kontext.createGain();
    if (position !== null) {
      const dx = position.x - this.hoerer.x;
      const dz = position.z - this.hoerer.z;
      const entfernung = Math.hypot(dx, dz);
      const jenseits = Math.max(0, entfernung - VOLL_HOERBAR_BIS);
      pegel *= Math.pow(0.5, jenseits / HALBWERT_STRECKE);
      if (typeof kontext.createStereoPanner === 'function') {
        const panorama = kontext.createStereoPanner();
        panorama.pan.value = Math.max(-1, Math.min(1, dx / STEREO_BREITE));
        panorama.connect(kanal);
        ausgang = panorama;
      }
    }
    verstaerker.gain.value = pegel;
    verstaerker.connect(ausgang);

    try {
      eintrag.erzeuger({
        kontext,
        ausgang: verstaerker,
        zeit: kontext.currentTime,
        lautstaerke,
        position,
      });
    } catch (fehler) {
      console.error(`Fehler im Klang '${name}':`, fehler);
    }
  }

  entsorgen(): void {
    for (const abmelden of this.abmelden) abmelden();
    this.abmelden.length = 0;
    const kontext = this.kontextIntern;
    this.kontextIntern = null;
    this.kanalKnoten.clear();
    kontext?.close().catch(() => undefined);
  }

  private pegelAnwenden(kanal: Kanal, sofort: boolean): void {
    const knoten = this.kanalKnoten.get(kanal);
    const kontext = this.kontextIntern;
    if (knoten === undefined || kontext === null) return;
    if (sofort) knoten.gain.value = this.pegel[kanal];
    else knoten.gain.setTargetAtTime(this.pegel[kanal], kontext.currentTime, 0.02);
  }
}
