/**
 * Eingabe: Tastatur und Maus als logische Aktionen.
 *
 * - Systeme fragen nie rohe Tasten ab, sondern Aktionen (`'laufen-hoch'`,
 *   `'zauber-primaer'` …). Welche Taste zu welcher Aktion gehört, steht in der
 *   Belegungstabelle und lässt sich zur Laufzeit ändern (Aufgabe 3.2).
 * - Tasten werden über `KeyboardEvent.code` erkannt, also nach ihrer Lage auf
 *   der Tastatur. Auf QWERTZ und QWERTY liegt W damit an derselben Stelle.
 * - Zu Beginn jedes Simulationsschritts friert System 10 den Zustand ein
 *   (`einfrieren`). Ein Druck zwischen zwei Schritten geht dabei nicht verloren:
 *   `gedrueckt()` meldet ihn im nächsten Schritt, auch wenn die Taste schon
 *   wieder losgelassen ist.
 * - Für Aktionen, die sofort und auch in der Pause wirken müssen (Escape, F3,
 *   F4, F8), gibt es `beiAktion`. Diese Rückrufe laufen außerhalb der Simulation.
 */
import type { System } from './welt';
import { kopiereVec3, vec3, type Vec3, type VecXZ } from './vektor';

/** Alle logischen Aktionen. Neue Aktionen hier ergänzen und in `STANDARD_BELEGUNG` belegen. */
export const AKTIONEN = [
  'laufen-hoch',
  'laufen-runter',
  'laufen-links',
  'laufen-rechts',
  'zauber-primaer',
  'zauber-sekundaer',
  'ausweichen',
  'interagieren',
  'menue',
  'trank-1',
  'trank-2',
  'debug-anzeige',
  'grafikstufe',
  'fehlerbericht',
] as const;

export type Aktion = (typeof AKTIONEN)[number];

/**
 * Eine physische Taste: `KeyboardEvent.code` (`'KeyW'`, `'Space'`, `'Digit1'`,
 * `'F3'` …) oder eine Maustaste (`'MausLinks'`, `'MausRechts'`, `'MausMitte'`).
 */
export type Taste = string;

export const MAUS_LINKS: Taste = 'MausLinks';
export const MAUS_RECHTS: Taste = 'MausRechts';
export const MAUS_MITTE: Taste = 'MausMitte';

/** Welche Tasten eine Aktion auslösen. Eine Aktion darf mehrere Tasten haben. */
export type Belegung = Readonly<Record<Aktion, readonly Taste[]>>;

export const STANDARD_BELEGUNG: Belegung = Object.freeze({
  'laufen-hoch': ['KeyW'],
  'laufen-runter': ['KeyS'],
  'laufen-links': ['KeyA'],
  'laufen-rechts': ['KeyD'],
  'zauber-primaer': [MAUS_LINKS],
  'zauber-sekundaer': [MAUS_RECHTS],
  ausweichen: ['Space'],
  interagieren: ['KeyE'],
  menue: ['Escape'],
  'trank-1': ['Digit1'],
  'trank-2': ['Digit2'],
  'debug-anzeige': ['F3'],
  grafikstufe: ['F4'],
  fehlerbericht: ['F8'],
});

/** Der eingefrorene Zustand für einen Simulationsschritt. Nur lesen. */
export interface EingabeZustand {
  /** Mindestens eine Taste der Aktion ist gerade gedrückt. */
  gehalten(aktion: Aktion): boolean;
  /** Seit dem letzten Schritt neu gedrückt (Flanke). Auch kurze Tipper zählen. */
  gedrueckt(aktion: Aktion): boolean;
  /** Seit dem letzten Schritt losgelassen und jetzt nicht mehr gehalten. */
  losgelassen(aktion: Aktion): boolean;
  /**
   * Laufrichtung aus WASD auf der Bodenebene, Länge 0 oder 1 (diagonal
   * normiert). W = −z (vom Betrachter weg), D = +x.
   */
  readonly bewegung: Readonly<VecXZ>;
  /** Punkt unter der Maus auf der Zielebene (Weltkoordinaten). */
  readonly ziel: Readonly<Vec3>;
  /** `false`, solange die Maus noch nie über dem Spielfeld war. `ziel` ist dann veraltet. */
  readonly zielGueltig: boolean;
}

class EingefrorenerZustand implements EingabeZustand {
  readonly gehaltenSet = new Set<Aktion>();
  readonly gedruecktSet = new Set<Aktion>();
  readonly losgelassenSet = new Set<Aktion>();
  readonly bewegung: VecXZ = { x: 0, z: 0 };
  readonly ziel: Vec3 = vec3();
  zielGueltig = false;

  gehalten(aktion: Aktion): boolean {
    return this.gehaltenSet.has(aktion);
  }

  gedrueckt(aktion: Aktion): boolean {
    return this.gedruecktSet.has(aktion);
  }

  losgelassen(aktion: Aktion): boolean {
    return this.losgelassenSet.has(aktion);
  }
}

/**
 * Rechnet einen Bildschirmpunkt (NDC, −1 bis 1, y nach oben) in einen Punkt
 * auf der waagrechten Ebene in Höhe `hoehe` um. `null`, wenn der Strahl die
 * Ebene nicht trifft. Liefert die Kamera (`Kamera.bildschirmZuBoden`).
 */
export type ZielBerechnung = (ndcX: number, ndcY: number, hoehe: number) => Vec3 | null;

export class Eingabe {
  /** Der eingefrorene Zustand. Dasselbe Objekt über die ganze Laufzeit. */
  readonly zustand: EingabeZustand;
  /**
   * Höhe der Ebene, auf die die Maus zielt. Standard 0 (Boden). Mit Gelände
   * setzt die Spielerlogik hier sinnvollerweise die Höhe der Spielfigur.
   */
  zielHoehe = 0;

  private readonly eingefroren = new EingefrorenerZustand();
  private belegungIntern: Record<Aktion, Taste[]>;
  private tasteZuAktionen = new Map<Taste, Aktion[]>();
  private readonly gehaltenRoh = new Set<Taste>();
  private readonly gedruecktRoh = new Set<Taste>();
  private readonly losgelassenRoh = new Set<Taste>();
  private zeiger: { x: number; y: number } | null = null;
  private zielBerechnung: ZielBerechnung | null = null;
  private zielVorgabe: Vec3 | null = null;
  private readonly sofort = new Map<Aktion, Set<() => void>>();

  constructor(belegung: Belegung = STANDARD_BELEGUNG) {
    this.zustand = this.eingefroren;
    this.belegungIntern = belegungKopieren(belegung);
    this.tastenIndexAufbauen();
  }

  /*
   * Belegung
   */

  /** Aktuelle Belegung (Kopie). */
  get belegung(): Belegung {
    return belegungKopieren(this.belegungIntern);
  }

  /** Belegt eine Aktion neu. Eine leere Liste macht die Aktion unerreichbar. */
  belegen(aktion: Aktion, tasten: readonly Taste[]): void {
    this.belegungIntern[aktion] = [...new Set(tasten)];
    this.tastenIndexAufbauen();
  }

  /** Übernimmt eine komplette Belegung, z. B. aus dem Spielstand. */
  belegungSetzen(belegung: Partial<Belegung>): void {
    for (const aktion of AKTIONEN) {
      const tasten = belegung[aktion];
      if (tasten !== undefined) this.belegungIntern[aktion] = [...new Set(tasten)];
    }
    this.tastenIndexAufbauen();
  }

  belegungZuruecksetzen(): void {
    this.belegungIntern = belegungKopieren(STANDARD_BELEGUNG);
    this.tastenIndexAufbauen();
  }

  tastenFuer(aktion: Aktion): readonly Taste[] {
    return [...this.belegungIntern[aktion]];
  }

  aktionenFuer(taste: Taste): readonly Aktion[] {
    return this.tasteZuAktionen.get(taste) ?? [];
  }

  /*
   * Rohe Eingaben. Die DOM-Anbindung ruft diese Methoden auf; Tests und der
   * Testbot dürfen sie direkt benutzen.
   */

  tasteRunter(taste: Taste): void {
    if (this.gehaltenRoh.has(taste)) return; // Tastenwiederholung
    this.gehaltenRoh.add(taste);
    this.gedruecktRoh.add(taste);
    for (const aktion of this.aktionenFuer(taste)) {
      const hoerer = this.sofort.get(aktion);
      if (hoerer === undefined) continue;
      for (const rueckruf of [...hoerer]) {
        try {
          rueckruf();
        } catch (fehler) {
          console.error(`Fehler in einem Rückruf für die Aktion '${aktion}':`, fehler);
        }
      }
    }
  }

  tasteHoch(taste: Taste): void {
    if (!this.gehaltenRoh.delete(taste)) return;
    this.losgelassenRoh.add(taste);
  }

  /** Lässt alle Tasten los, z. B. wenn das Fenster den Fokus verliert. */
  allesLoslassen(): void {
    for (const taste of [...this.gehaltenRoh]) this.tasteHoch(taste);
  }

  /** Mausposition in NDC (−1 bis 1, y nach oben). */
  setzeZeiger(ndcX: number, ndcY: number): void {
    this.zeiger = { x: ndcX, y: ndcY };
  }

  /** Legt fest, wie Mauspositionen in Weltpunkte umgerechnet werden. */
  setzeZielBerechnung(berechnung: ZielBerechnung | null): void {
    this.zielBerechnung = berechnung;
  }

  /**
   * Gibt den Zielpunkt direkt in Weltkoordinaten vor (Tests, Testbot) und
   * übergeht die Maus. `null` schaltet zurück auf die Maus.
   */
  setzeZiel(punkt: Readonly<Vec3> | null): void {
    this.zielVorgabe = punkt === null ? null : kopiereVec3(punkt);
  }

  /**
   * Rückruf sofort beim Drücken (ohne Tastenwiederholung), unabhängig von der
   * Simulation, also auch in der Pause. Liefert eine Abmeldefunktion.
   */
  beiAktion(aktion: Aktion, rueckruf: () => void): () => void {
    let hoerer = this.sofort.get(aktion);
    if (hoerer === undefined) {
      hoerer = new Set();
      this.sofort.set(aktion, hoerer);
    }
    hoerer.add(rueckruf);
    return () => {
      this.sofort.get(aktion)?.delete(rueckruf);
    };
  }

  /** Friert den Zustand für den nächsten Simulationsschritt ein (System 10). */
  einfrieren(): void {
    const z = this.eingefroren;
    z.gehaltenSet.clear();
    z.gedruecktSet.clear();
    z.losgelassenSet.clear();

    for (const aktion of AKTIONEN) {
      let gehalten = false;
      let gedrueckt = false;
      let losgelassen = false;
      for (const taste of this.belegungIntern[aktion]) {
        if (this.gehaltenRoh.has(taste)) gehalten = true;
        if (this.gedruecktRoh.has(taste)) gedrueckt = true;
        if (this.losgelassenRoh.has(taste)) losgelassen = true;
      }
      if (gehalten) z.gehaltenSet.add(aktion);
      if (gedrueckt) z.gedruecktSet.add(aktion);
      if (losgelassen && !gehalten) z.losgelassenSet.add(aktion);
    }
    this.gedruecktRoh.clear();
    this.losgelassenRoh.clear();

    const x = (z.gehalten('laufen-rechts') ? 1 : 0) - (z.gehalten('laufen-links') ? 1 : 0);
    const zRichtung = (z.gehalten('laufen-runter') ? 1 : 0) - (z.gehalten('laufen-hoch') ? 1 : 0);
    const laenge = Math.hypot(x, zRichtung);
    z.bewegung.x = laenge > 0 ? x / laenge : 0;
    z.bewegung.z = laenge > 0 ? zRichtung / laenge : 0;

    if (this.zielVorgabe !== null) {
      z.ziel.x = this.zielVorgabe.x;
      z.ziel.y = this.zielVorgabe.y;
      z.ziel.z = this.zielVorgabe.z;
      z.zielGueltig = true;
    } else if (this.zeiger !== null && this.zielBerechnung !== null) {
      const punkt = this.zielBerechnung(this.zeiger.x, this.zeiger.y, this.zielHoehe);
      if (punkt !== null) {
        z.ziel.x = punkt.x;
        z.ziel.y = punkt.y;
        z.ziel.z = punkt.z;
        z.zielGueltig = true;
      }
    }
  }

  /**
   * Verbindet die Eingabe mit Fenster und Spielfeld. Liefert eine Funktion,
   * die alle Zuhörer wieder entfernt.
   */
  anbinden(fenster: Window, leinwand: HTMLElement): () => void {
    const beiTasteRunter = (ereignis: KeyboardEvent): void => {
      if (istTexteingabe(ereignis.target)) return;
      // Strg/Cmd-Kombinationen gehören dem Browser (Strg+1 wechselt den Tab).
      if (ereignis.ctrlKey || ereignis.metaKey) return;
      const taste = ereignis.code;
      if (taste === '') return;
      if (this.aktionenFuer(taste).length > 0 && !ereignis.altKey) ereignis.preventDefault();
      this.tasteRunter(taste);
    };
    const beiTasteHoch = (ereignis: KeyboardEvent): void => {
      if (ereignis.code !== '') this.tasteHoch(ereignis.code);
    };
    // Bewusst Maus- statt Pointer-Ereignisse: `pointerdown` kommt nicht, wenn
    // schon eine andere Maustaste gedrückt ist (links halten, rechts klicken).
    const beiMausRunter = (ereignis: MouseEvent): void => {
      const taste = mausTaste(ereignis.button);
      if (taste === null) return;
      this.zeigerAktualisieren(ereignis, leinwand);
      // Verhindert Textauswahl, Ziehen und das Scroll-Symbol der mittleren Taste.
      ereignis.preventDefault();
      this.tasteRunter(taste);
    };
    const beiMausHoch = (ereignis: MouseEvent): void => {
      const taste = mausTaste(ereignis.button);
      if (taste !== null) this.tasteHoch(taste);
    };
    const beiMausBewegung = (ereignis: MouseEvent): void => {
      this.zeigerAktualisieren(ereignis, leinwand);
      // Außerhalb des Fensters losgelassene Tasten nachträglich freigeben.
      if ((ereignis.buttons & 1) === 0) this.tasteHoch(MAUS_LINKS);
      if ((ereignis.buttons & 2) === 0) this.tasteHoch(MAUS_RECHTS);
      if ((ereignis.buttons & 4) === 0) this.tasteHoch(MAUS_MITTE);
    };
    const beiKontextmenue = (ereignis: Event): void => ereignis.preventDefault();
    const beiFokusVerlust = (): void => this.allesLoslassen();
    const beiSichtbarkeit = (): void => {
      if (fenster.document.visibilityState === 'hidden') this.allesLoslassen();
    };

    fenster.addEventListener('keydown', beiTasteRunter);
    fenster.addEventListener('keyup', beiTasteHoch);
    leinwand.addEventListener('mousedown', beiMausRunter);
    fenster.addEventListener('mouseup', beiMausHoch);
    fenster.addEventListener('mousemove', beiMausBewegung);
    leinwand.addEventListener('contextmenu', beiKontextmenue);
    fenster.addEventListener('blur', beiFokusVerlust);
    fenster.document.addEventListener('visibilitychange', beiSichtbarkeit);

    return () => {
      fenster.removeEventListener('keydown', beiTasteRunter);
      fenster.removeEventListener('keyup', beiTasteHoch);
      leinwand.removeEventListener('mousedown', beiMausRunter);
      fenster.removeEventListener('mouseup', beiMausHoch);
      fenster.removeEventListener('mousemove', beiMausBewegung);
      leinwand.removeEventListener('contextmenu', beiKontextmenue);
      fenster.removeEventListener('blur', beiFokusVerlust);
      fenster.document.removeEventListener('visibilitychange', beiSichtbarkeit);
    };
  }

  private zeigerAktualisieren(ereignis: MouseEvent, leinwand: HTMLElement): void {
    const rechteck = leinwand.getBoundingClientRect();
    if (rechteck.width <= 0 || rechteck.height <= 0) return;
    this.setzeZeiger(
      ((ereignis.clientX - rechteck.left) / rechteck.width) * 2 - 1,
      -((ereignis.clientY - rechteck.top) / rechteck.height) * 2 + 1,
    );
  }

  private tastenIndexAufbauen(): void {
    const index = new Map<Taste, Aktion[]>();
    for (const aktion of AKTIONEN) {
      for (const taste of this.belegungIntern[aktion]) {
        const liste = index.get(taste);
        if (liste === undefined) index.set(taste, [aktion]);
        else liste.push(aktion);
      }
    }
    this.tasteZuAktionen = index;
  }
}

/** System 10: friert die Eingabe zu Beginn jedes Schritts ein. */
export function erzeugeEingabeSystem(eingabe: Eingabe): System {
  return {
    name: 'eingabe',
    reihenfolge: 10,
    schritt: () => eingabe.einfrieren(),
  };
}

function belegungKopieren(belegung: Belegung): Record<Aktion, Taste[]> {
  const kopie = {} as Record<Aktion, Taste[]>;
  for (const aktion of AKTIONEN) kopie[aktion] = [...(belegung[aktion] ?? [])];
  return kopie;
}

function mausTaste(knopf: number): Taste | null {
  if (knopf === 0) return MAUS_LINKS;
  if (knopf === 1) return MAUS_MITTE;
  if (knopf === 2) return MAUS_RECHTS;
  return null;
}

function istTexteingabe(ziel: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(ziel instanceof HTMLElement)) return false;
  return (
    ziel.isContentEditable ||
    ziel.tagName === 'INPUT' ||
    ziel.tagName === 'TEXTAREA' ||
    ziel.tagName === 'SELECT'
  );
}
