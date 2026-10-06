/**
 * Mondlicht mit Schatten, das dem Kamerafokus folgt.
 *
 * GRUNDGERÜST aus Aufgabe 0.3. Die Feinabstimmung (Texel-Raster gegen
 * Flimmern, Bias, weiche Kanten, engerer Ausschnitt) übernimmt Aufgabe 1.4.
 * Sie ändert dafür nur das Innere dieser Klasse; die Schnittstelle
 * (`licht`, `nachfuehren`, `setzeAufloesung`, `hinzufuegen`) bleibt.
 */
import { DirectionalLight, type Scene } from 'three';
import { kopiereVec3, type Vec3 } from './vektor';

/** Werte aus der Konzeptszene. */
const MOND_FARBE = 0xaec0ff;
const MOND_STAERKE = 2.1;

export class SchattenLicht {
  readonly licht: DirectionalLight;
  /** Lage des Lichts relativ zum Fokus (Mond links oben hinten). */
  readonly versatz: Vec3 = kopiereVec3({ x: -10, y: 24, z: 9 });

  constructor(aufloesung = 2048) {
    const licht = new DirectionalLight(MOND_FARBE, MOND_STAERKE);
    licht.castShadow = true;
    const kamera = licht.shadow.camera;
    kamera.left = -30;
    kamera.right = 30;
    kamera.top = 26;
    kamera.bottom = -26;
    kamera.near = 1;
    kamera.far = 80;
    kamera.updateProjectionMatrix();
    licht.shadow.bias = -0.0004;
    licht.shadow.normalBias = 0.03;
    this.licht = licht;
    this.setzeAufloesung(aufloesung);
    this.nachfuehren({ x: 0, y: 0, z: 0 });
  }

  /** Fügt Licht und Lichtziel der Szene hinzu. */
  hinzufuegen(szene: Scene): void {
    szene.add(this.licht, this.licht.target);
  }

  /** Setzt die Kantenlänge der Schattenkarte; die Karte wird neu angelegt. */
  setzeAufloesung(pixel: number): void {
    const schatten = this.licht.shadow;
    if (schatten.mapSize.x === pixel && schatten.mapSize.y === pixel) return;
    schatten.mapSize.set(pixel, pixel);
    schatten.map?.dispose();
    schatten.map = null;
  }

  /** Richtet Licht und Schattenausschnitt auf den Fokus aus. Jedes Bild aufrufen. */
  nachfuehren(fokus: Readonly<Vec3>): void {
    const v = this.versatz;
    this.licht.position.set(fokus.x + v.x, fokus.y + v.y, fokus.z + v.z);
    this.licht.target.position.set(fokus.x, fokus.y, fokus.z);
    this.licht.target.updateMatrixWorld();
  }
}
