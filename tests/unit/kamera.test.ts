import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Kamera, KAMERA_VERSATZ } from '@engine/kamera';
import { Simulation } from '@engine/schleife';
import { erzeugeWelt } from '@engine/welt';
import { vec3 } from '@engine/vektor';

function aufbau() {
  const welt = erzeugeWelt({ seed: 1 });
  const simulation = new Simulation(welt);
  const kamera = new Kamera(16 / 9);
  simulation.hinzufuegen(kamera);
  simulation.starten();
  return { welt, simulation, kamera };
}

describe('Kamera', () => {
  it('ist System 100 und steht wie in der Konzeptszene', () => {
    const { kamera } = aufbau();
    expect(kamera.reihenfolge).toBe(100);
    expect(kamera.objekt.fov).toBe(36);
    expect(KAMERA_VERSATZ).toEqual({ x: 0, y: 17.5, z: 12.5 });
    kamera.rendern({} as never, 0);
    expect(kamera.objekt.position.toArray()).toEqual([0, 17.5, 12.5]);
  });

  it('folgt einer Entität weich und kommt ihr beliebig nahe', () => {
    const { welt, simulation, kamera } = aufbau();
    const spieler = welt.entitaeten.anlegen({ position: vec3(10, 0, -5) });
    kamera.folgen(spieler.id);
    simulation.schritt();
    // Nach einem Schritt noch nicht da, aber unterwegs.
    expect(kamera.fokus.x).toBeGreaterThan(0);
    expect(kamera.fokus.x).toBeLessThan(10);
    simulation.schritte(300);
    expect(kamera.fokus.x).toBeCloseTo(10, 4);
    expect(kamera.fokus.z).toBeCloseTo(-5, 4);
  });

  it('springen() setzt den Fokus sofort und ohne Zwischenbilder', () => {
    const { welt, kamera } = aufbau();
    const spieler = welt.entitaeten.anlegen({ position: vec3(3, 0, 4) });
    kamera.folgen(spieler.id);
    kamera.springen();
    expect(kamera.fokus).toEqual({ x: 3, y: 0, z: 4 });
    kamera.rendern(welt, 0.3);
    expect(kamera.sichtFokus).toEqual({ x: 3, y: 0, z: 4 });
    kamera.springen(vec3(-1, 0, -1));
    expect(kamera.fokus).toEqual({ x: -1, y: 0, z: -1 });
  });

  it('interpoliert den Sichtfokus zwischen zwei Schritten', () => {
    const { welt, simulation, kamera } = aufbau();
    kamera.glaettung = Infinity; // ohne Glättung: Fokus = Ziel
    kamera.folgen(vec3(0, 0, 0));
    simulation.schritt();
    kamera.folgen(vec3(6, 0, 0));
    simulation.schritt();
    kamera.rendern(welt, 0.5);
    expect(kamera.sichtFokus.x).toBeCloseTo(3, 10);
    expect(kamera.objekt.position.x).toBeCloseTo(3, 10);
  });

  it('wackelt auf kamera:wackeln, klingt ab und verschiebt den Mauspunkt nicht', () => {
    const { welt, simulation, kamera } = aufbau();
    kamera.rendern(welt, 0);
    const ruhig = kamera.bildschirmZuBoden(0.3, -0.2);

    welt.bus.aus('kamera:wackeln', { staerke: 0.3, dauer: 0.5 });
    expect(kamera.wackelStaerke).toBeCloseTo(0.3, 10);
    simulation.schritte(3);
    kamera.rendern(welt, 0.5);
    expect(kamera.objekt.position.distanceTo(new Vector3(0, 17.5, 12.5))).toBeGreaterThan(0);
    expect(kamera.bildschirmZuBoden(0.3, -0.2)).toEqual(ruhig);

    simulation.schritte(60);
    expect(kamera.wackelStaerke).toBe(0);
    kamera.rendern(welt, 0);
    expect(kamera.objekt.position.toArray()).toEqual([0, 17.5, 12.5]);
  });

  it('ignoriert unsinnige Wackelwerte und begrenzt zu starke', () => {
    const { kamera } = aufbau();
    kamera.wackeln(-1, 1);
    kamera.wackeln(1, 0);
    kamera.wackeln(Number.NaN, 1);
    expect(kamera.wackelStaerke).toBe(0);
    kamera.wackeln(100, 100);
    expect(kamera.wackelStaerke).toBeLessThanOrEqual(1.5);
  });

  it('hört nach beenden() nicht mehr auf den Bus', () => {
    const { welt, simulation, kamera } = aufbau();
    simulation.beenden();
    welt.bus.aus('kamera:wackeln', { staerke: 0.3, dauer: 0.5 });
    expect(kamera.wackelStaerke).toBe(0);
    expect(welt.bus.anzahlHoerer('kamera:wackeln')).toBe(0);
  });

  it('trifft mit der Bildmitte genau den Fokus auf dem Boden', () => {
    const { welt, kamera } = aufbau();
    kamera.springen(vec3(4, 0, -2));
    kamera.rendern(welt, 0);
    const mitte = kamera.bildschirmZuBoden(0, 0);
    expect(mitte?.x).toBeCloseTo(4, 6);
    expect(mitte?.y).toBeCloseTo(0, 6);
    expect(mitte?.z).toBeCloseTo(-2, 6);
    // Oben im Bild liegt weiter hinten (−z), rechts liegt +x.
    const oben = kamera.bildschirmZuBoden(0, 0.8);
    const rechts = kamera.bildschirmZuBoden(0.8, 0);
    expect(oben?.z).toBeLessThan(-2);
    expect(rechts?.x).toBeGreaterThan(4);
    // Auf einer erhöhten Ebene liegt der Punkt entsprechend höher.
    expect(kamera.bildschirmZuBoden(0, 0, 1.2)?.y).toBeCloseTo(1.2, 6);
  });
});
