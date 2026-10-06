import { describe, expect, it, vi } from 'vitest';
import { ManuelleUhr, Simulation, Spielschleife, type Sichtbarkeit } from '@engine/schleife';
import { erzeugeWelt, SCHRITT, type System } from '@engine/welt';

function aufbau(optionen: { maxSchritte?: number; sichtbarkeit?: Sichtbarkeit | null } = {}) {
  const welt = erzeugeWelt({ seed: 1 });
  const simulation = new Simulation(welt);
  const uhr = new ManuelleUhr();
  const gerendert: number[] = [];
  const dts: number[] = [];
  simulation.hinzufuegen({
    name: 'messer',
    reihenfolge: 50,
    schritt: (_w, dt) => void dts.push(dt),
    rendern: (_w, anteil) => void gerendert.push(anteil),
  });
  const schleife = new Spielschleife({
    simulation,
    uhr,
    sichtbarkeit: optionen.sichtbarkeit ?? null,
    maxSchritteProBild: optionen.maxSchritte,
    bus: welt.bus,
  });
  return { welt, simulation, uhr, schleife, gerendert, dts };
}

class TestSichtbarkeit implements Sichtbarkeit {
  verborgen = false;
  private rueckruf: (() => void) | null = null;
  istVerborgen(): boolean {
    return this.verborgen;
  }
  beiAenderung(rueckruf: () => void): () => void {
    this.rueckruf = rueckruf;
    return () => (this.rueckruf = null);
  }
  setzen(verborgen: boolean): void {
    this.verborgen = verborgen;
    this.rueckruf?.();
  }
}

describe('Spielschleife: fester Schritt', () => {
  it('rechnet bei unregelmäßigen Bildzeiten genau so viele Schritte, wie Zeit vergangen ist', () => {
    const { uhr, schleife, welt, dts } = aufbau({ maxSchritte: 100 });
    schleife.starten();
    uhr.bild(0); // erstes Bild: Startzeitpunkt, noch kein Schritt
    const abstaende = [7, 33, 16.6, 2, 50, 16.7, 16.7, 9, 1, 120, 30, 4.3];
    let summe = 0;
    for (const ms of abstaende) {
      uhr.bild(ms);
      summe += ms;
      expect(welt.schritt).toBe(Math.floor(summe / 1000 / SCHRITT + 1e-6));
    }
    // dt ist immer exakt 1/60.
    expect(new Set(dts)).toEqual(new Set([SCHRITT]));
  });

  it('läuft bei genau 60 Bildern pro Sekunde mit genau einem Schritt pro Bild', () => {
    const { uhr, schleife, welt } = aufbau();
    schleife.starten();
    uhr.bild(0);
    for (let i = 0; i < 600; i++) {
      uhr.bild(1000 / 60);
      expect(schleife.statistik.schritteImLetztenBild).toBe(1);
    }
    expect(welt.schritt).toBe(600);
  });

  it('macht bei 144 Hz Bilder ohne Schritt und liefert einen Anteil zum Interpolieren', () => {
    const { uhr, schleife, welt, gerendert } = aufbau();
    schleife.starten();
    uhr.bild(0);
    for (let i = 0; i < 144; i++) uhr.bild(1000 / 144);
    expect(welt.schritt).toBe(60);
    expect(gerendert.every((a) => a >= 0 && a <= 1)).toBe(true);
    expect(new Set(gerendert.map((a) => a.toFixed(2))).size).toBeGreaterThan(3);
  });

  it('ruft rendern und zeichnen in jedem Bild auf, auch ohne Schritt', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    const uhr = new ManuelleUhr();
    const zeichnen = vi.fn();
    const schleife = new Spielschleife({ simulation, uhr, zeichnen, sichtbarkeit: null });
    schleife.starten();
    uhr.bild(0);
    uhr.bild(1);
    uhr.bild(1);
    expect(zeichnen).toHaveBeenCalledTimes(3);
    expect(schleife.statistik.bilder).toBe(3);
  });

  it('misst die Bildrate', () => {
    const { uhr, schleife } = aufbau();
    schleife.starten();
    uhr.bild(0);
    for (let i = 0; i < 70; i++) uhr.bild(1000 / 30);
    expect(schleife.statistik.bildrate).toBeCloseTo(30, 0);
  });
});

describe('Spielschleife: Todesspiralen-Schutz', () => {
  it('rechnet pro Bild höchstens die erlaubte Zahl Schritte und verwirft den Rest', () => {
    const { uhr, schleife, welt, gerendert } = aufbau({ maxSchritte: 5 });
    schleife.starten();
    uhr.bild(0);
    uhr.bild(1000); // eine Sekunde Hänger
    expect(welt.schritt).toBe(5);
    expect(schleife.statistik.verworfeneSchritte).toBe(55);
    expect(gerendert.at(-1)).toBeGreaterThanOrEqual(0);
    expect(gerendert.at(-1)).toBeLessThan(1);
    // Danach läuft alles normal weiter, ohne Nachholen.
    uhr.bild(1000 / 60);
    expect(welt.schritt).toBe(6);
  });

  it('übersteht einen riesigen Zeitsprung ohne Hängen', () => {
    const { uhr, schleife, welt } = aufbau({ maxSchritte: 5 });
    schleife.starten();
    uhr.bild(0);
    uhr.bild(1e9);
    expect(welt.schritt).toBe(5);
  });

  it('ignoriert rückwärts laufende Zeitstempel', () => {
    const { uhr, schleife, welt } = aufbau();
    schleife.starten();
    uhr.bild(0);
    uhr.bild(100);
    const vorher = welt.schritt;
    schleife.bild(50);
    expect(welt.schritt).toBe(vorher);
  });
});

describe('Spielschleife: Pause', () => {
  it('rechnet in der Pause keine Schritte, rendert aber weiter, und holt nichts nach', () => {
    const { uhr, schleife, welt, gerendert } = aufbau();
    schleife.starten();
    uhr.bild(0);
    uhr.bild(100);
    const vorPause = welt.schritt;
    schleife.pausieren('menue');
    const bilderVorher = gerendert.length;
    for (let i = 0; i < 30; i++) uhr.bild(100);
    expect(welt.schritt).toBe(vorPause);
    expect(gerendert.length).toBe(bilderVorher + 30);

    schleife.fortsetzen('menue');
    uhr.bild(1000 / 60);
    // Das erste Bild nach der Pause setzt nur den Zeitpunkt; danach geht es normal weiter.
    expect(welt.schritt).toBe(vorPause);
    uhr.bild(1000 / 60);
    expect(welt.schritt).toBe(vorPause + 1);
  });

  it('läuft erst weiter, wenn alle Pausengründe aufgehoben sind, und meldet das über den Bus', () => {
    const { schleife, welt } = aufbau();
    const protokoll: string[] = [];
    welt.bus.an('spiel:pausiert', () => protokoll.push('pausiert'));
    welt.bus.an('spiel:fortgesetzt', () => protokoll.push('fortgesetzt'));
    schleife.pausieren('menue');
    schleife.pausieren('verborgen');
    schleife.fortsetzen('menue');
    expect(schleife.pausiert).toBe(true);
    schleife.fortsetzen('unbekannt');
    schleife.fortsetzen('verborgen');
    expect(schleife.pausiert).toBe(false);
    expect(protokoll).toEqual(['pausiert', 'fortgesetzt']);
  });

  it('pausiert automatisch, solange der Tab verborgen ist', () => {
    const sicht = new TestSichtbarkeit();
    const { uhr, schleife, welt } = aufbau({ sichtbarkeit: sicht });
    schleife.starten();
    uhr.bild(0);
    uhr.bild(1000 / 60);
    expect(welt.schritt).toBe(1);

    sicht.setzen(true);
    expect(schleife.pausenGruende).toEqual(['verborgen']);
    uhr.bild(5000);
    expect(welt.schritt).toBe(1);

    sicht.setzen(false);
    expect(schleife.pausiert).toBe(false);
    uhr.bild(60_000); // Lange verborgen: Diese Zeit darf nicht nachgeholt werden.
    expect(welt.schritt).toBe(1);
    uhr.bild(1000 / 60);
    expect(welt.schritt).toBe(2);
  });

  it('startet pausiert, wenn der Tab beim Start schon verborgen ist', () => {
    const sicht = new TestSichtbarkeit();
    sicht.verborgen = true;
    const { schleife } = aufbau({ sichtbarkeit: sicht });
    schleife.starten();
    expect(schleife.pausiert).toBe(true);
  });

  it('stoppen() hält die Bildwiederholung an', () => {
    const { uhr, schleife, welt } = aufbau();
    schleife.starten();
    uhr.bild(0);
    schleife.stoppen();
    expect(uhr.wartet).toBe(false);
    schleife.bild(1000);
    expect(welt.schritt).toBe(0);
  });

  it('fordert nie zwei Bilder gleichzeitig an, auch wenn bild() direkt aufgerufen wird', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    let offen = 0;
    const uhr = {
      naechstesBild: () => {
        offen++;
        return () => void offen--;
      },
    };
    const schleife = new Spielschleife({ simulation, uhr, sichtbarkeit: null });
    schleife.starten();
    schleife.bild(0);
    schleife.bild(16);
    schleife.bild(32);
    expect(offen).toBe(1);
  });
});

describe('Simulation: Systeme', () => {
  it('führt Systeme nach reihenfolge aus, bei Gleichstand in Hinzufügereihenfolge', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    const protokoll: string[] = [];
    const system = (name: string, reihenfolge: number): System => ({
      name,
      reihenfolge,
      schritt: () => void protokoll.push(name),
    });
    simulation.hinzufuegen(system('kamera', 100));
    simulation.hinzufuegen(system('eingabe', 10));
    simulation.hinzufuegen(system('zauber', 30));
    simulation.hinzufuegen(system('spieler', 20));
    simulation.hinzufuegen(system('geschosse-a', 40));
    simulation.hinzufuegen(system('geschosse-b', 40));
    simulation.schritt();
    expect(protokoll).toEqual([
      'eingabe',
      'spieler',
      'zauber',
      'geschosse-a',
      'geschosse-b',
      'kamera',
    ]);
    expect(simulation.systeme.map((s) => s.name)).toEqual(protokoll);
  });

  it('ruft starten, rendern und beenden auf, auch für spät hinzugefügte Systeme', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    const protokoll: string[] = [];
    const system = (name: string): System => ({
      name,
      reihenfolge: 1,
      starten: () => void protokoll.push(`${name}:starten`),
      schritt: () => {},
      rendern: (_w, anteil) => void protokoll.push(`${name}:rendern:${anteil}`),
      beenden: () => void protokoll.push(`${name}:beenden`),
    });
    simulation.hinzufuegen(system('a'));
    simulation.starten();
    simulation.starten();
    const entfernenB = simulation.hinzufuegen(system('b'));
    simulation.rendern(1.5);
    entfernenB();
    simulation.beenden();
    expect(protokoll).toEqual([
      'a:starten',
      'b:starten',
      'a:rendern:1',
      'b:rendern:1',
      'b:beenden',
      'a:beenden',
    ]);
  });

  it('lehnt doppelte Systeme und ungültige Reihenfolgen ab', () => {
    const simulation = new Simulation(erzeugeWelt({ seed: 1 }));
    const system: System = { name: 'x', reihenfolge: 5, schritt: () => {} };
    simulation.hinzufuegen(system);
    expect(() => simulation.hinzufuegen(system)).toThrow();
    expect(() =>
      simulation.hinzufuegen({ name: 'y', reihenfolge: Number.NaN, schritt: () => {} }),
    ).toThrow();
  });

  it('ein während des Schritts hinzugefügtes System läuft erst ab dem nächsten Schritt', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    const spaet = vi.fn();
    simulation.hinzufuegen({
      name: 'anbauer',
      reihenfolge: 10,
      schritt: () => {
        if (welt.schritt === 0)
          simulation.hinzufuegen({ name: 'spaet', reihenfolge: 20, schritt: spaet });
      },
    });
    simulation.schritt();
    expect(spaet).not.toHaveBeenCalled();
    simulation.schritt();
    expect(spaet).toHaveBeenCalledTimes(1);
  });

  it('fängt Fehler eines Systems ab, wenn ein Handler gesetzt ist, und schließt den Schritt ab', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const beiFehler = vi.fn();
    const simulation = new Simulation(welt, { beiFehler });
    const danach = vi.fn();
    simulation.hinzufuegen({
      name: 'kaputt',
      reihenfolge: 1,
      schritt: () => {
        throw new Error('kaputt');
      },
    });
    simulation.hinzufuegen({ name: 'danach', reihenfolge: 2, schritt: danach });
    simulation.schritt();
    expect(danach).toHaveBeenCalled();
    expect(beiFehler).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ name: 'kaputt' }),
      'schritt',
    );
    expect(welt.schritt).toBe(1);
  });

  it('wirft Fehler ohne Handler weiter, zählt den Schritt aber trotzdem', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    simulation.hinzufuegen({
      name: 'kaputt',
      reihenfolge: 1,
      schritt: () => {
        throw new Error('kaputt');
      },
    });
    expect(() => simulation.schritt()).toThrow('kaputt');
    expect(welt.schritt).toBe(1);
  });
});
