/**
 * Dreidimensionaler Vektor als schlichtes Objekt.
 *
 * Bewusst kein Three.js-Typ: Die Simulation bleibt so ohne Grafik testbar, und
 * Zustände lassen sich einfach kopieren und vergleichen. Ein `THREE.Vector3`
 * passt strukturell trotzdem überall hinein, wo ein `Vec3` erwartet wird.
 *
 * Koordinaten in Metern: x = nach rechts, y = nach oben, z = zur Kamera hin.
 * Die Bodenebene ist die XZ-Ebene.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Eine Richtung oder Position auf der Bodenebene. */
export interface VecXZ {
  x: number;
  z: number;
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

/** Neue, unabhängige Kopie. */
export function kopiereVec3(quelle: Readonly<Vec3>): Vec3 {
  return { x: quelle.x, y: quelle.y, z: quelle.z };
}

/** Überschreibt `ziel` mit den Werten aus `quelle` und gibt `ziel` zurück. */
export function setzeVec3(ziel: Vec3, quelle: Readonly<Vec3>): Vec3 {
  ziel.x = quelle.x;
  ziel.y = quelle.y;
  ziel.z = quelle.z;
  return ziel;
}

/** Lineare Mischung von `a` nach `b` (t = 0 → a, t = 1 → b), Ergebnis in `ziel`. */
export function mischeVec3(
  a: Readonly<Vec3>,
  b: Readonly<Vec3>,
  t: number,
  ziel: Vec3 = vec3(),
): Vec3 {
  ziel.x = a.x + (b.x - a.x) * t;
  ziel.y = a.y + (b.y - a.y) * t;
  ziel.z = a.z + (b.z - a.z) * t;
  return ziel;
}

/** Abstand auf der Bodenebene (Höhe wird ignoriert). */
export function abstandXZ(a: Readonly<VecXZ>, b: Readonly<VecXZ>): number {
  return Math.sqrt(abstandXZQuadrat(a, b));
}

/** Quadrat des Abstands auf der Bodenebene. Schneller, wenn nur verglichen wird. */
export function abstandXZQuadrat(a: Readonly<VecXZ>, b: Readonly<VecXZ>): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/*
 * Blickrichtung (Winkel im Bogenmaß)
 *
 * Gleiche Konvention wie `Object3D.rotation.y` in Three.js: Winkel 0 schaut
 * entlang +z (zur Kamera), π/2 entlang +x (nach rechts), ±π entlang −z (vom
 * Betrachter weg). Ein Modell mit `rotation.y = entitaet.blickrichtung` schaut
 * also genau in die Blickrichtung, wenn seine Vorderseite entlang +z zeigt.
 */

/** Einheitsrichtung auf der Bodenebene zu einem Blickwinkel. */
export function richtungAusWinkel(winkel: number): VecXZ {
  return { x: Math.sin(winkel), z: Math.cos(winkel) };
}

/** Blickwinkel zu einer Richtung auf der Bodenebene. */
export function winkelAusRichtung(x: number, z: number): number {
  return Math.atan2(x, z);
}

/** Blickwinkel, unter dem man von `von` nach `nach` schaut. */
export function winkelZu(von: Readonly<VecXZ>, nach: Readonly<VecXZ>): number {
  return Math.atan2(nach.x - von.x, nach.z - von.z);
}

/** Bringt einen Winkel in den Bereich (−π, π]. */
export function normalisiereWinkel(winkel: number): number {
  const voll = Math.PI * 2;
  let w = winkel % voll;
  if (w <= -Math.PI) w += voll;
  else if (w > Math.PI) w -= voll;
  return w;
}

/** Mischt zwei Winkel über den kürzeren Weg. */
export function mischeWinkel(a: number, b: number, t: number): number {
  return a + normalisiereWinkel(b - a) * t;
}
