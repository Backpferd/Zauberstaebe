/**
 * Kamera: schräg von oben wie in der Konzeptszene (Blickwinkel 36°, Versatz
 * 0 / 17,5 / 12,5 m). Sie ist zugleich System 100 und folgt einem Ziel weich.
 *
 * Der Fokus (der Punkt, auf den die Kamera schaut) ist Teil der Simulation und
 * wird pro Schritt nachgeführt. Beim Rendern wird zwischen zwei Schritten
 * interpoliert; das Wackeln kommt nur in der Darstellung dazu und verändert
 * weder den Fokus noch den Zielpunkt der Maus.
 */
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { EntitaetId } from './entitaeten';
import type { System, Welt } from './welt';
import { SCHRITT } from './welt';
import { kopiereVec3, mischeVec3, setzeVec3, vec3, type Vec3 } from './vektor';

export const KAMERA_SICHTWINKEL = 36;
export const KAMERA_VERSATZ: Readonly<Vec3> = Object.freeze({ x: 0, y: 17.5, z: 12.5 });
export const KAMERA_NAH = 0.5;
export const KAMERA_FERN = 250;

/** Obergrenzen, damit ein fehlerhafter Aufruf nicht die Sicht zerreißt. */
const MAX_WACKELSTAERKE = 1.5;
const MAX_WACKELDAUER = 3;

interface Wackler {
  staerke: number;
  dauer: number;
  rest: number;
}

export class Kamera implements System {
  readonly name = 'kamera';
  readonly reihenfolge = 100;

  /** Die Three.js-Kamera zum Rendern. Position und Blick setzt nur diese Klasse. */
  readonly objekt: PerspectiveCamera;
  /** Versatz vom Fokus zur Kamera. Darf verändert werden (z. B. Zoom). */
  readonly versatz: Vec3 = kopiereVec3(KAMERA_VERSATZ);
  /**
   * Wie schnell die Kamera dem Ziel folgt, in 1/s. Größer = straffer.
   * `Infinity` oder 0 und kleiner: sofort, ohne Glättung.
   */
  glaettung = 10;

  private readonly fokusJetzt = vec3();
  private readonly fokusVorher = vec3();
  private readonly fokusSicht = vec3();
  private ziel: EntitaetId | Vec3 | null = null;
  private welt: Welt | null = null;
  private wackler: Wackler[] = [];
  private wackelZeit = 0;
  private abmelden: (() => void) | null = null;

  /** Unverwackelte Kopie für den Mausstrahl. */
  private readonly zielKamera: PerspectiveCamera;
  private readonly strahl = new Raycaster();
  private readonly ebene = new Plane(new Vector3(0, 1, 0), 0);
  private readonly ndc = new Vector2();
  private readonly treffer = new Vector3();

  constructor(seitenverhaeltnis = 16 / 9) {
    this.objekt = new PerspectiveCamera(
      KAMERA_SICHTWINKEL,
      seitenverhaeltnis,
      KAMERA_NAH,
      KAMERA_FERN,
    );
    this.zielKamera = this.objekt.clone();
    this.ausrichten(0);
  }

  /** Simulierter Fokus (Stand des letzten Schritts). */
  get fokus(): Readonly<Vec3> {
    return this.fokusJetzt;
  }

  /** Fokus im zuletzt gerenderten Bild (interpoliert, ohne Wackeln). Für Schatten und Ton. */
  get sichtFokus(): Readonly<Vec3> {
    return this.fokusSicht;
  }

  /** Folgt einer Entität (per ID), einem festen Punkt oder niemandem. */
  folgen(ziel: EntitaetId | Readonly<Vec3> | null): void {
    this.ziel = typeof ziel === 'number' || ziel === null ? ziel : kopiereVec3(ziel);
  }

  /** Springt ohne Glättung auf das Ziel oder auf `position`. */
  springen(position?: Readonly<Vec3>): void {
    const ziel = position ?? this.zielPosition();
    if (ziel === undefined) return;
    setzeVec3(this.fokusJetzt, ziel);
    setzeVec3(this.fokusVorher, ziel);
    setzeVec3(this.fokusSicht, ziel);
    this.ausrichten(0);
  }

  /** Lässt die Kamera wackeln. `staerke` in Metern, `dauer` in Sekunden. */
  wackeln(staerke: number, dauer: number): void {
    if (!(staerke > 0) || !(dauer > 0)) return;
    const s = Math.min(staerke, MAX_WACKELSTAERKE);
    const d = Math.min(dauer, MAX_WACKELDAUER);
    this.wackler.push({ staerke: s, dauer: d, rest: d });
  }

  /** Aktueller Wackelausschlag in Metern (0, wenn ruhig). */
  get wackelStaerke(): number {
    let staerke = 0;
    for (const w of this.wackler) {
      const verlauf = w.rest / w.dauer;
      staerke = Math.max(staerke, w.staerke * verlauf * verlauf);
    }
    return staerke;
  }

  seitenverhaeltnis(wert: number): void {
    if (!(wert > 0)) return;
    this.objekt.aspect = wert;
    this.objekt.updateProjectionMatrix();
    this.zielKamera.aspect = wert;
    this.zielKamera.updateProjectionMatrix();
  }

  /**
   * Schneidet den Strahl durch einen Bildschirmpunkt (NDC) mit der waagrechten
   * Ebene in Höhe `hoehe`. Nutzt die Kamera des zuletzt gerenderten Bilds ohne
   * Wackeln. `null`, wenn der Strahl die Ebene nicht trifft.
   */
  bildschirmZuBoden(ndcX: number, ndcY: number, hoehe = 0): Vec3 | null {
    this.ndc.set(ndcX, ndcY);
    this.strahl.setFromCamera(this.ndc, this.zielKamera);
    this.ebene.constant = -hoehe;
    const punkt = this.strahl.ray.intersectPlane(this.ebene, this.treffer);
    return punkt === null ? null : vec3(punkt.x, punkt.y, punkt.z);
  }

  starten(welt: Welt): void {
    this.welt = welt;
    this.abmelden?.();
    this.abmelden = welt.bus.an('kamera:wackeln', ({ staerke, dauer }) =>
      this.wackeln(staerke, dauer),
    );
  }

  schritt(welt: Welt, dt: number): void {
    this.welt = welt;
    setzeVec3(this.fokusVorher, this.fokusJetzt);
    const ziel = this.zielPosition();
    if (ziel !== undefined) {
      const k =
        this.glaettung > 0 && Number.isFinite(this.glaettung)
          ? 1 - Math.exp(-this.glaettung * dt)
          : 1;
      mischeVec3(this.fokusJetzt, ziel, k, this.fokusJetzt);
    }

    this.wackelZeit += dt;
    if (this.wackler.length > 0) {
      for (const w of this.wackler) w.rest -= dt;
      this.wackler = this.wackler.filter((w) => w.rest > 0);
    }
  }

  rendern(_welt: Welt, anteil: number): void {
    mischeVec3(this.fokusVorher, this.fokusJetzt, anteil, this.fokusSicht);
    this.ausrichten(anteil);
  }

  beenden(): void {
    this.abmelden?.();
    this.abmelden = null;
    this.welt = null;
  }

  private zielPosition(): Readonly<Vec3> | undefined {
    if (this.ziel === null) return undefined;
    if (typeof this.ziel === 'number') return this.welt?.finde(this.ziel)?.position;
    return this.ziel;
  }

  /** Setzt beide Three-Kameras auf den Sichtfokus, die Bildkamera mit Wackeln. */
  private ausrichten(anteil: number): void {
    const f = this.fokusSicht;
    const v = this.versatz;

    this.zielKamera.position.set(f.x + v.x, f.y + v.y, f.z + v.z);
    this.zielKamera.lookAt(f.x, f.y, f.z);
    this.zielKamera.updateMatrixWorld();

    const staerke = this.wackelStaerke;
    let wx = 0;
    let wy = 0;
    let wz = 0;
    if (staerke > 0) {
      // Gleichmäßiges „Rauschen“ aus Sinuswellen: kein Zufall, damit die
      // Darstellung den Zufallsstrom der Spiellogik nie berührt.
      const zeit = this.wackelZeit + anteil * SCHRITT;
      wx = staerke * (Math.sin(zeit * 53.1) * 0.6 + Math.sin(zeit * 97.3 + 1.3) * 0.4);
      wy = staerke * 0.5 * (Math.sin(zeit * 61.7 + 2.1) * 0.6 + Math.sin(zeit * 89.9) * 0.4);
      wz = staerke * (Math.sin(zeit * 47.9 + 0.7) * 0.6 + Math.sin(zeit * 103.1 + 2.9) * 0.4);
    }
    this.objekt.position.set(f.x + v.x + wx, f.y + v.y + wy, f.z + v.z + wz);
    this.objekt.lookAt(f.x + wx, f.y + wy, f.z + wz);
    this.objekt.updateMatrixWorld();
  }
}
