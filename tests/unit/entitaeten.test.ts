import { describe, expect, it } from 'vitest';
import {
  brauchtKomponente,
  entferneKomponente,
  hatKomponente,
  holeKomponente,
  interpoliereBlickrichtung,
  interpolierePosition,
  komponente,
  mit,
  setzeKomponente,
  teleportiere,
} from '@engine/entitaeten';
import { Simulation } from '@engine/schleife';
import { erzeugeWelt, SCHRITT } from '@engine/welt';
import { vec3 } from '@engine/vektor';

const LEBEN = komponente<{ aktuell: number; maximum: number }>('leben');
const TEMPO = komponente<number>('tempo');

describe('Entitäten: Anlegen und Finden', () => {
  it('vergibt fortlaufende IDs ab 1 und findet Entitäten wieder', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const a = welt.entitaeten.anlegen();
    const b = welt.entitaeten.anlegen({ marken: ['gegner'] });
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(welt.finde(2)).toBe(b);
    expect(welt.finde(99)).toBeUndefined();
    expect(welt.entitaeten.anzahl).toBe(2);
  });

  it('kopiert die Startposition statt sie zu teilen', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const start = vec3(1, 2, 3);
    const e = welt.entitaeten.anlegen({ position: start, blickrichtung: 0.5 });
    start.x = 99;
    expect(e.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(e.blickrichtung).toBe(0.5);
    expect(e.vorher.position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('filtert nach Marken in Anlegereihenfolge', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const w1 = welt.entitaeten.anlegen({ marken: ['gegner'] });
    welt.entitaeten.anlegen({ marken: ['spieler'] });
    const w2 = welt.entitaeten.anlegen({ marken: ['gegner', 'boss'] });
    expect(welt.entitaeten.mitMarke('gegner')).toEqual([w1, w2]);
    expect(welt.entitaeten.mitMarke('boss')).toEqual([w2]);
    expect(welt.entitaeten.ersteMitMarke('gegner')).toBe(w1);
    expect(welt.entitaeten.ersteMitMarke('beute')).toBeUndefined();
  });
});

describe('Entitäten: verzögertes Entfernen', () => {
  it('entfernt erst am Schrittende; Schleifen über Entitäten brechen nicht', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    for (let i = 0; i < 5; i++) welt.entitaeten.anlegen({ marken: ['geschoss'] });

    const besucht: number[] = [];
    let imSchrittNochDa = false;
    simulation.hinzufuegen({
      name: 'entferner',
      reihenfolge: 40,
      schritt(w) {
        for (const e of w.entitaeten.mitMarke('geschoss')) {
          besucht.push(e.id);
          w.entitaeten.entfernen(e);
        }
      },
    });
    simulation.hinzufuegen({
      name: 'beobachter',
      reihenfolge: 50,
      schritt(w) {
        // Vorgemerkt: aus Abfragen verschwunden, über die ID aber noch auffindbar.
        expect(w.entitaeten.mitMarke('geschoss')).toEqual([]);
        expect(w.entitaeten.anzahl).toBe(0);
        const erste = w.finde(1);
        imSchrittNochDa = erste !== undefined && erste.entfernt;
      },
    });

    simulation.schritt();
    expect(besucht).toEqual([1, 2, 3, 4, 5]);
    expect(imSchrittNochDa).toBe(true);
    expect(welt.finde(1)).toBeUndefined();
    expect(welt.entitaeten.alle()).toEqual([]);
  });

  it('mehrfaches Entfernen und Entfernen unbekannter IDs schadet nicht', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const e = welt.entitaeten.anlegen();
    welt.entitaeten.entfernen(e);
    welt.entitaeten.entfernen(e.id);
    welt.entitaeten.entfernen(12345);
    expect(welt.entitaeten.anzahl).toBe(0);
    welt.schrittBeenden();
    expect(welt.finde(e.id)).toBeUndefined();
    expect(welt.entitaeten.anzahl).toBe(0);
  });

  it('im Schritt neu angelegte Entitäten sind sofort für spätere Systeme sichtbar', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    let gesehen = 0;
    simulation.hinzufuegen({
      name: 'erzeuger',
      reihenfolge: 30,
      schritt: (w) => void w.entitaeten.anlegen({ marken: ['geschoss'] }),
    });
    simulation.hinzufuegen({
      name: 'zaehler',
      reihenfolge: 40,
      schritt: (w) => void (gesehen = w.entitaeten.mitMarke('geschoss').length),
    });
    simulation.schritt();
    expect(gesehen).toBe(1);
  });

  it('vergibt IDs nach dem Entfernen nicht erneut', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const a = welt.entitaeten.anlegen();
    welt.entitaeten.entfernen(a);
    welt.schrittBeenden();
    expect(welt.entitaeten.anlegen().id).toBe(2);
  });
});

describe('Entitäten: inUmkreis (XZ-Ebene)', () => {
  it('findet Entitäten im Radius, ignoriert die Höhe und schließt den Rand ein', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const nah = welt.entitaeten.anlegen({ marken: ['gegner'], position: vec3(1, 50, 1) });
    const rand = welt.entitaeten.anlegen({ marken: ['gegner'], position: vec3(3, 0, 4) });
    welt.entitaeten.anlegen({ marken: ['gegner'], position: vec3(3.01, 0, 4) });
    const beute = welt.entitaeten.anlegen({ marken: ['beute'], position: vec3(0, 0, 0) });

    expect(welt.inUmkreis(vec3(0, 0, 0), 5)).toEqual([nah, rand, beute]);
    expect(welt.inUmkreis(vec3(0, 0, 0), 5, 'gegner')).toEqual([nah, rand]);
    expect(welt.inUmkreis(vec3(0, 0, 0), 5, 'spieler')).toEqual([]);
    expect(welt.inUmkreis(vec3(0, 0, 0), 0)).toEqual([beute]);
    expect(welt.inUmkreis(vec3(0, 0, 0), -1)).toEqual([]);
    expect(welt.inUmkreis(vec3(0, 0, 0), Number.NaN)).toEqual([]);
  });

  it('lässt zum Entfernen vorgemerkte Entitäten weg', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const e = welt.entitaeten.anlegen({ marken: ['gegner'] });
    welt.entitaeten.entfernen(e);
    expect(welt.inUmkreis(vec3(), 10)).toEqual([]);
  });
});

describe('Komponenten', () => {
  it('setzt und liest typsicher', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const e = welt.entitaeten.anlegen({ komponenten: [mit(LEBEN, { aktuell: 30, maximum: 30 })] });
    expect(holeKomponente(e, LEBEN)).toEqual({ aktuell: 30, maximum: 30 });
    expect(holeKomponente(e, TEMPO)).toBeUndefined();
    expect(hatKomponente(e, TEMPO)).toBe(false);

    setzeKomponente(e, TEMPO, 4.5);
    expect(brauchtKomponente(e, TEMPO)).toBe(4.5);
    entferneKomponente(e, TEMPO);
    expect(() => brauchtKomponente(e, TEMPO)).toThrow(/tempo/);
  });

  it('Komponentenwerte sind Referenzen und lassen sich direkt ändern', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const e = welt.entitaeten.anlegen({ komponenten: [mit(LEBEN, { aktuell: 30, maximum: 30 })] });
    brauchtKomponente(e, LEBEN).aktuell -= 12;
    expect(holeKomponente(e, LEBEN)?.aktuell).toBe(18);
  });
});

describe('Interpolation', () => {
  it('mischt zwischen dem Stand vor und nach dem Schritt', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    const e = welt.entitaeten.anlegen({ position: vec3(0, 0, 0) });
    simulation.hinzufuegen({
      name: 'laufen',
      reihenfolge: 20,
      schritt: (_w, dt) => {
        e.position.x += 6 * dt;
        e.blickrichtung = 3;
      },
    });
    simulation.schritt();
    expect(e.vorher.position.x).toBe(0);
    expect(e.position.x).toBeCloseTo(6 * SCHRITT, 12);
    expect(interpolierePosition(e, 0.5).x).toBeCloseTo(3 * SCHRITT, 12);
    expect(interpolierePosition(e, 0)).toEqual({ x: 0, y: 0, z: 0 });

    simulation.schritt();
    expect(e.vorher.position.x).toBeCloseTo(6 * SCHRITT, 12);
    expect(e.vorher.blickrichtung).toBe(3);
  });

  it('nimmt beim Blick den kürzeren Weg über ±π', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const e = welt.entitaeten.anlegen({ blickrichtung: 3 });
    welt.schrittBeginnen();
    e.blickrichtung = -3;
    const mitte = interpoliereBlickrichtung(e, 0.5);
    // Von 3 nach −3 sind es über π nur 0,28 rad, nicht 6.
    expect(Math.abs(Math.cos(mitte) - Math.cos(Math.PI))).toBeLessThan(1e-9);
  });

  it('teleportiere() setzt auch den Vorher-Stand, damit nichts gleitet', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const e = welt.entitaeten.anlegen({ position: vec3(0, 0, 0) });
    teleportiere(e, vec3(10, 0, -4));
    expect(interpolierePosition(e, 0)).toEqual({ x: 10, y: 0, z: -4 });
    expect(interpolierePosition(e, 1)).toEqual({ x: 10, y: 0, z: -4 });
  });
});

describe('Welt', () => {
  it('zählt Schritte und Zeit exakt', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    const zeiten: number[] = [];
    simulation.hinzufuegen({
      name: 'uhr',
      reihenfolge: 1,
      schritt: (w) => void zeiten.push(w.schritt),
    });
    simulation.schritte(120);
    expect(zeiten[0]).toBe(0);
    expect(welt.schritt).toBe(120);
    expect(welt.zeit).toBe(2);
  });

  it('stempelt Ereignisse im Verlauf mit der Schrittnummer', () => {
    const welt = erzeugeWelt({ seed: 1 });
    const simulation = new Simulation(welt);
    simulation.hinzufuegen({
      name: 'sender',
      reihenfolge: 1,
      schritt: (w) => {
        if (w.schritt === 3) w.bus.aus('quest:abgeschlossen', { questId: 'q' });
      },
    });
    simulation.schritte(5);
    expect(welt.bus.verlauf()[0]?.ersterSchritt).toBe(3);
  });

  it('hat einen Zufall mit dem Seed der Welt', () => {
    const welt = erzeugeWelt({ seed: 4242 });
    expect(welt.seed).toBe(4242);
    expect(welt.zufall.zahl()).toBe(erzeugeWelt({ seed: 4242 }).zufall.zahl());
  });
});
