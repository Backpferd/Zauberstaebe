/**
 * WEGWERFCODE: Testszene für den Engine-Kern (Aufgabe 0.3).
 *
 * Boden, ein paar Steinblöcke und eine Kapsel als Spielerfigur. WASD läuft,
 * die Figur blickt zur Maus, die Kamera folgt, ein Linksklick schießt eine
 * leuchtende Kugel. Es gibt bewusst keine Kollision (Aufgabe 1.1).
 *
 * Ab Welle 1 ersetzen Spieler (1.1) und Gebiet (1.2) diese Datei.
 */
import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  GridHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
} from 'three';
import {
  EBENE_EFFEKTE,
  holeKomponente,
  interpoliereBlickrichtung,
  interpolierePosition,
  komponente,
  mit,
  richtungAusWinkel,
  vec3,
  winkelZu,
  abstandXZ,
  type Engine,
  type EntitaetId,
  type VecXZ,
} from '@engine/index';

/** Laufgeschwindigkeit in m/s. */
const LAUFTEMPO = 5;
const GESCHOSS_TEMPO = 14;
const GESCHOSS_LEBENSDAUER = 1.2;

const GESCHOSS = komponente<{ richtung: VecXZ; rest: number }>('testszene.geschoss');

/** Steinblöcke: x, z, Breite, Höhe, Tiefe, Drehung. */
const BLOECKE: readonly (readonly [number, number, number, number, number, number])[] = [
  [-4.5, -3, 1.6, 1.2, 1.4, 0.3],
  [5, -6, 2.4, 1.8, 1.6, -0.5],
  [3.5, 3.5, 1.2, 0.8, 1.2, 0.9],
  [-7, 4.5, 1.8, 2.6, 1.8, 0.1],
  [8.5, 1, 1.4, 1, 3, 0],
  [-1, -10, 4, 1.4, 1.2, 0.2],
  [-10, -6, 1.5, 3.2, 1.5, 0.7],
];

export function baueTestszene(engine: Engine): void {
  const { renderer, welt, kamera, eingabe, audio } = engine;
  const szene = renderer.szene;

  // Boden mit Raster (1 Feld = 1 Meter) zur Orientierung.
  const boden = new Mesh(
    new PlaneGeometry(200, 200),
    new MeshStandardMaterial({ color: 0x4f6b3e, roughness: 1 }),
  );
  boden.rotation.x = -Math.PI / 2;
  boden.receiveShadow = true;
  szene.add(boden);
  const raster = new GridHelper(60, 60, 0x88a872, 0x3d5530);
  raster.position.y = 0.01;
  szene.add(raster);

  // Steinblöcke
  const steinMaterial = new MeshStandardMaterial({
    color: 0x77716a,
    roughness: 0.9,
    flatShading: true,
  });
  const wuerfel = new BoxGeometry(1, 1, 1);
  for (const [x, z, breite, hoehe, tiefe, drehung] of BLOECKE) {
    const block = new Mesh(wuerfel, steinMaterial);
    block.scale.set(breite, hoehe, tiefe);
    block.position.set(x, hoehe / 2, z);
    block.rotation.y = drehung;
    block.castShadow = true;
    block.receiveShadow = true;
    szene.add(block);
  }

  // Spielerfigur: Kapsel mit Stab, der in Blickrichtung (+z) zeigt.
  const figur = new Group();
  const koerper = new Mesh(
    new CapsuleGeometry(0.38, 1.0, 6, 14),
    new MeshStandardMaterial({ color: 0x3b4f8a, roughness: 0.7 }),
  );
  koerper.position.y = 0.88;
  koerper.castShadow = true;
  const stab = new Mesh(
    new ConeGeometry(0.07, 0.9, 8),
    new MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 }),
  );
  stab.rotation.x = Math.PI / 2;
  stab.position.set(0.25, 1.05, 0.55);
  stab.castShadow = true;
  figur.add(koerper, stab);
  szene.add(figur);
  // Warmes Licht über der Figur wie in der Konzeptszene.
  const figurenLicht = new PointLight(0xffd8a8, 14, 10, 1.6);
  szene.add(figurenLicht);

  const spieler = welt.entitaeten.anlegen({ marken: ['spieler'], position: vec3(0, 0, 0) });
  kamera.folgen(spieler.id);
  kamera.springen(spieler.position);

  // Ein kurzer Testklang, damit die Audio-Grundlage etwas zu tun hat.
  audio.registriereKlang('testszene.schuss', ({ kontext, ausgang, zeit }) => {
    const ton = kontext.createOscillator();
    const huelle = kontext.createGain();
    ton.type = 'triangle';
    ton.frequency.setValueAtTime(620, zeit);
    ton.frequency.exponentialRampToValueAtTime(160, zeit + 0.14);
    huelle.gain.setValueAtTime(0.0001, zeit);
    huelle.gain.exponentialRampToValueAtTime(0.25, zeit + 0.01);
    huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + 0.16);
    ton.connect(huelle).connect(ausgang);
    ton.start(zeit);
    ton.stop(zeit + 0.18);
  });

  // System 20: Laufen, Blicken, Schießen.
  engine.systemHinzufuegen({
    name: 'testszene-spieler',
    reihenfolge: 20,
    schritt(w, dt) {
      const z = eingabe.zustand;
      if (z.bewegung.x !== 0 || z.bewegung.z !== 0) {
        spieler.position.x += z.bewegung.x * LAUFTEMPO * dt;
        spieler.position.z += z.bewegung.z * LAUFTEMPO * dt;
        w.bus.aus('spieler:bewegt', { position: spieler.position, geschwindigkeit: LAUFTEMPO });
      }
      if (z.zielGueltig && abstandXZ(spieler.position, z.ziel) > 0.05) {
        spieler.blickrichtung = winkelZu(spieler.position, z.ziel);
      }
      if (z.gedrueckt('zauber-primaer')) {
        const richtung = richtungAusWinkel(spieler.blickrichtung);
        const start = vec3(
          spieler.position.x + richtung.x * 0.7,
          1.1,
          spieler.position.z + richtung.z * 0.7,
        );
        const geschoss = w.entitaeten.anlegen({
          marken: ['geschoss'],
          position: start,
          blickrichtung: spieler.blickrichtung,
          komponenten: [mit(GESCHOSS, { richtung, rest: GESCHOSS_LEBENSDAUER })],
        });
        w.bus.aus('geschoss:erzeugt', {
          geschossId: geschoss.id,
          zauberId: 'testkugel',
          position: geschoss.position,
          richtung: vec3(richtung.x, 0, richtung.z),
        });
        w.bus.aus('audio:abspielen', {
          name: 'testszene.schuss',
          position: geschoss.position,
          lautstaerke: 1,
        });
        w.bus.aus('kamera:wackeln', { staerke: 0.06, dauer: 0.15 });
      }
    },
  });

  // System 40: Kugeln fliegen und verfallen.
  engine.systemHinzufuegen({
    name: 'testszene-geschosse',
    reihenfolge: 40,
    schritt(w, dt) {
      for (const geschoss of w.entitaeten.mitMarke('geschoss')) {
        const daten = holeKomponente(geschoss, GESCHOSS);
        if (daten === undefined) continue;
        geschoss.position.x += daten.richtung.x * GESCHOSS_TEMPO * dt;
        geschoss.position.z += daten.richtung.z * GESCHOSS_TEMPO * dt;
        daten.rest -= dt;
        if (daten.rest <= 0) {
          w.entitaeten.entfernen(geschoss);
          w.bus.aus('geschoss:verfallen', { geschossId: geschoss.id });
        }
      }
    },
  });

  // Darstellung: liest nur den Zustand und interpoliert zwischen zwei Schritten.
  const kugelForm = new SphereGeometry(0.16, 12, 8);
  const kugelMaterial = new MeshBasicMaterial({ color: new Color(4, 1.6, 0.3) });
  const kugeln = new Map<EntitaetId, Mesh>();
  const ort = vec3();
  engine.systemHinzufuegen({
    name: 'testszene-darstellung',
    reihenfolge: 115,
    schritt() {},
    rendern(w, anteil) {
      interpolierePosition(spieler, anteil, ort);
      figur.position.set(ort.x, ort.y, ort.z);
      figur.rotation.y = interpoliereBlickrichtung(spieler, anteil);
      figurenLicht.position.set(ort.x + 0.4, ort.y + 3.4, ort.z + 0.8);

      const lebend = new Set<EntitaetId>();
      for (const geschoss of w.entitaeten.mitMarke('geschoss')) {
        lebend.add(geschoss.id);
        let kugel = kugeln.get(geschoss.id);
        if (kugel === undefined) {
          kugel = new Mesh(kugelForm, kugelMaterial);
          kugel.layers.set(EBENE_EFFEKTE);
          szene.add(kugel);
          kugeln.set(geschoss.id, kugel);
        }
        interpolierePosition(geschoss, anteil, ort);
        kugel.position.set(ort.x, ort.y, ort.z);
      }
      for (const [id, kugel] of kugeln) {
        if (lebend.has(id)) continue;
        szene.remove(kugel);
        kugeln.delete(id);
      }
    },
  });
}
