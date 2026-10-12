/**
 * Determinismus-Probe: Gleicher Seed und gleiche Eingaben ergeben über 600
 * Schritte exakt denselben Zustand, egal mit welcher Bildrate gerechnet wird.
 */
import { describe, expect, it } from 'vitest';
import {
  Eingabe,
  erzeugeEingabeSystem,
  erzeugeWelt,
  holeKomponente,
  Kamera,
  komponente,
  ManuelleUhr,
  mit,
  richtungAusWinkel,
  Simulation,
  Spielschleife,
  vec3,
  winkelZu,
  type System,
  type Vec3,
} from '@engine/index';

const GESCHOSS = komponente<{ vx: number; vz: number; rest: number }>('test.geschoss');
const KI = komponente<{ ziel: Vec3; wartezeit: number }>('test.ki');

type Skriptschritt =
  | { schritt: number; runter: string }
  | { schritt: number; hoch: string }
  | { schritt: number; ziel: Vec3 };

/** Feste Eingabefolge für 600 Schritte: laufen, zielen, schießen, ausweichen. */
const SKRIPT: Skriptschritt[] = [
  { schritt: 0, ziel: vec3(5, 0, -5) },
  { schritt: 3, runter: 'KeyW' },
  { schritt: 40, runter: 'KeyD' },
  { schritt: 41, runter: 'MausLinks' },
  { schritt: 42, hoch: 'MausLinks' },
  { schritt: 90, hoch: 'KeyW' },
  { schritt: 120, ziel: vec3(-8, 0, 3) },
  { schritt: 121, runter: 'MausLinks' },
  { schritt: 200, hoch: 'MausLinks' },
  { schritt: 250, runter: 'Space' },
  { schritt: 251, hoch: 'Space' },
  { schritt: 300, runter: 'KeyS' },
  { schritt: 301, hoch: 'KeyD' },
  { schritt: 302, runter: 'KeyA' },
  { schritt: 420, runter: 'MausLinks' },
  { schritt: 421, hoch: 'MausLinks' },
  { schritt: 480, hoch: 'KeyS' },
  { schritt: 481, hoch: 'KeyA' },
  { schritt: 500, ziel: vec3(0, 0, 0) },
  { schritt: 510, runter: 'MausLinks' },
];

function baueSimulation(seed: number) {
  const welt = erzeugeWelt({ seed });
  const simulation = new Simulation(welt);
  const eingabe = new Eingabe();
  const kamera = new Kamera(16 / 9);

  // Reihenfolge 5: spielt das Skript schrittgenau ein, unabhängig von der Bildrate.
  const skript: System = {
    name: 'skript',
    reihenfolge: 5,
    schritt(w) {
      for (const s of SKRIPT) {
        if (s.schritt !== w.schritt) continue;
        if ('runter' in s) eingabe.tasteRunter(s.runter);
        else if ('hoch' in s) eingabe.tasteHoch(s.hoch);
        else eingabe.setzeZiel(s.ziel);
      }
    },
  };

  const spieler = welt.entitaeten.anlegen({ marken: ['spieler'] });
  kamera.folgen(spieler.id);

  const spielerSystem: System = {
    name: 'spieler',
    reihenfolge: 20,
    schritt(w, dt) {
      const z = eingabe.zustand;
      const tempo = z.gehalten('ausweichen') ? 12 : 5;
      spieler.position.x += z.bewegung.x * tempo * dt;
      spieler.position.z += z.bewegung.z * tempo * dt;
      if (z.zielGueltig) spieler.blickrichtung = winkelZu(spieler.position, z.ziel);
      if (z.gedrueckt('ausweichen')) w.bus.aus('spieler:ausgewichen', { richtung: vec3(1, 0, 0) });
      if (z.gehalten('zauber-primaer') && w.schritt % 6 === 0) {
        // Streuung aus dem Zufall: macht die Probe empfindlich für jede Abweichung.
        const winkel = spieler.blickrichtung + w.zufall.bereich(-0.2, 0.2);
        const r = richtungAusWinkel(winkel);
        const g = w.entitaeten.anlegen({
          marken: ['geschoss'],
          position: spieler.position,
          komponenten: [
            mit(GESCHOSS, { vx: r.x * 14, vz: r.z * 14, rest: w.zufall.bereich(0.5, 1.5) }),
          ],
        });
        w.bus.aus('geschoss:erzeugt', {
          geschossId: g.id,
          zauberId: 'probe',
          position: g.position,
          richtung: vec3(r.x, 0, r.z),
        });
      }
    },
  };

  const geschossSystem: System = {
    name: 'geschosse',
    reihenfolge: 40,
    schritt(w, dt) {
      for (const g of w.entitaeten.mitMarke('geschoss')) {
        const daten = holeKomponente(g, GESCHOSS);
        if (daten === undefined) continue;
        g.position.x += daten.vx * dt;
        g.position.z += daten.vz * dt;
        daten.rest -= dt;
        const treffer = w.inUmkreis(g.position, 0.8, 'gegner')[0];
        if (treffer !== undefined) {
          w.bus.aus('geschoss:getroffen', {
            geschossId: g.id,
            zielId: treffer.id,
            position: g.position,
          });
          w.entitaeten.entfernen(g);
        } else if (daten.rest <= 0) {
          w.bus.aus('geschoss:verfallen', { geschossId: g.id });
          w.entitaeten.entfernen(g);
        }
      }
    },
  };

  const kiSystem: System = {
    name: 'ki',
    reihenfolge: 50,
    starten(w) {
      const ki = w.zufall.abzweig('ki');
      for (let i = 0; i < 6; i++) {
        w.entitaeten.anlegen({
          marken: ['gegner'],
          position: vec3(ki.bereich(-10, 10), 0, ki.bereich(-10, 10)),
          komponenten: [mit(KI, { ziel: vec3(), wartezeit: 0 })],
        });
      }
    },
    schritt(w, dt) {
      const ki = w.zufall.abzweig('ki');
      for (const g of w.entitaeten.mitMarke('gegner')) {
        const daten = holeKomponente(g, KI);
        if (daten === undefined) continue;
        daten.wartezeit -= dt;
        if (daten.wartezeit <= 0) {
          daten.ziel = vec3(ki.bereich(-12, 12), 0, ki.bereich(-12, 12));
          daten.wartezeit = ki.bereich(0.5, 2);
        }
        g.blickrichtung = winkelZu(g.position, daten.ziel);
        const r = richtungAusWinkel(g.blickrichtung);
        g.position.x += r.x * 3 * dt;
        g.position.z += r.z * 3 * dt;
      }
    },
  };

  for (const s of [
    skript,
    erzeugeEingabeSystem(eingabe),
    spielerSystem,
    geschossSystem,
    kiSystem,
    kamera,
  ]) {
    simulation.hinzufuegen(s);
  }
  return { welt, simulation, kamera };
}

/** Vollständiger, vergleichbarer Zustand. */
function zustand(aufbau: ReturnType<typeof baueSimulation>) {
  const { welt, kamera } = aufbau;
  return {
    schritt: welt.schritt,
    zeit: welt.zeit,
    entitaeten: welt.entitaeten.alle().map((e) => ({
      id: e.id,
      marken: [...e.marken],
      position: { ...e.position },
      blickrichtung: e.blickrichtung,
      komponenten: JSON.stringify([...e.komponenten]),
    })),
    kamera: { ...kamera.fokus },
    ereignisse: welt.bus.verlauf(),
    naechsteZufallszahl: welt.zufall.zahl(),
  };
}

describe('Determinismus', () => {
  it('gleicher Seed und gleiche Eingaben ergeben nach 600 Schritten exakt denselben Zustand', () => {
    const a = baueSimulation(20261006);
    const b = baueSimulation(20261006);
    a.simulation.schritte(600);
    b.simulation.schritte(600);
    const zustandA = zustand(a);
    expect(zustandA.schritt).toBe(600);
    // Die Probe muss auch etwas tun: Geschosse, Treffer oder Verfall, bewegte Gegner.
    expect(zustandA.ereignisse.some((e) => e.name === 'geschoss:erzeugt')).toBe(true);
    expect(zustandA.entitaeten.filter((e) => e.marken.includes('gegner'))).toHaveLength(6);
    expect(zustand(b)).toEqual(zustandA);
  });

  it('die Bildrate ändert nichts: unregelmäßige Bilder ergeben denselben Zustand', () => {
    const direkt = baueSimulation(77);
    direkt.simulation.schritte(600);

    const mitSchleife = baueSimulation(77);
    const uhr = new ManuelleUhr();
    const schleife = new Spielschleife({
      simulation: mitSchleife.simulation,
      uhr,
      sichtbarkeit: null,
      maxSchritteProBild: 1000,
    });
    schleife.starten();
    uhr.bild(0);
    const abstaende = [3, 41, 16.7, 7, 100, 16.6, 1, 33.3, 250, 12];
    let i = 0;
    while (mitSchleife.welt.schritt < 600) {
      const ms = abstaende[i++ % abstaende.length] ?? 16;
      // Nicht über Schritt 600 hinausrechnen.
      const rest = (600 - mitSchleife.welt.schritt) * (1000 / 60);
      uhr.bild(Math.min(ms, rest));
    }
    schleife.stoppen();
    expect(zustand(mitSchleife)).toEqual(zustand(direkt));
  });

  it('ein anderer Seed ergibt einen anderen Zustand (die Probe ist empfindlich)', () => {
    const a = baueSimulation(1);
    const b = baueSimulation(2);
    a.simulation.schritte(600);
    b.simulation.schritte(600);
    expect(zustand(b)).not.toEqual(zustand(a));
  });
});
