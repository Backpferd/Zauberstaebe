import { describe, expect, it } from 'vitest';
import { erzeugeZufall, seedAusAdresse, textHash } from '@engine/zufall';

const folge = (n: number, zieher: () => number): number[] => Array.from({ length: n }, zieher);

describe('Zufall (Seed-Generator)', () => {
  it('liefert bei gleichem Seed dieselbe Folge', () => {
    const a = erzeugeZufall(42);
    const b = erzeugeZufall(42);
    expect(folge(50, () => a.zahl())).toEqual(folge(50, () => b.zahl()));
  });

  it('liefert bei verschiedenen Seeds verschiedene Folgen', () => {
    expect(erzeugeZufall(1).zahl()).not.toBe(erzeugeZufall(2).zahl());
  });

  it('ist über feste Werte reproduzierbar (Regressionsanker)', () => {
    // Ändert sich einer dieser Werte, lässt sich kein bisher gemeldeter Seed mehr nachstellen.
    // Der erste Wert ist identisch mit dem alten `createRng(1)()` aus Aufgabe 0.1.
    expect(erzeugeZufall(1).zahl()).toBe(0.6270739405881613);
    expect(erzeugeZufall(1).abzweig('beute').zahl()).toBe(0.25326916109770536);
    expect(erzeugeZufall(1).abzweig('beute').seed).toBe(2646670433);
  });

  it('hält den Seed als vorzeichenlose 32-Bit-Zahl', () => {
    expect(erzeugeZufall(-1).seed).toBe(4294967295);
    expect(erzeugeZufall(2 ** 32 + 5).seed).toBe(5);
  });

  it('zahl() liegt in [0, 1)', () => {
    const z = erzeugeZufall(7);
    for (let i = 0; i < 2000; i++) {
      const wert = z.zahl();
      expect(wert).toBeGreaterThanOrEqual(0);
      expect(wert).toBeLessThan(1);
    }
  });

  it('bereich() hält die Grenzen ein', () => {
    const z = erzeugeZufall(5);
    for (let i = 0; i < 1000; i++) {
      const wert = z.bereich(-2, 3);
      expect(wert).toBeGreaterThanOrEqual(-2);
      expect(wert).toBeLessThan(3);
    }
  });

  it('ganzzahl() trifft beide Grenzen und nichts außerhalb', () => {
    const z = erzeugeZufall(123);
    const gesehen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const wert = z.ganzzahl(3, 6);
      expect(Number.isInteger(wert)).toBe(true);
      gesehen.add(wert);
    }
    expect([...gesehen].sort()).toEqual([3, 4, 5, 6]);
    expect(z.ganzzahl(4, 4)).toBe(4);
  });

  it('ganzzahl() rundet Kommagrenzen nach innen und wirft bei leerem Bereich', () => {
    const z = erzeugeZufall(9);
    for (let i = 0; i < 200; i++) {
      const wert = z.ganzzahl(0.5, 2.5);
      expect([1, 2]).toContain(wert);
    }
    expect(() => z.ganzzahl(5, 4)).toThrow(RangeError);
    expect(() => z.ganzzahl(0.2, 0.8)).toThrow(RangeError);
    expect(() => z.ganzzahl(Number.NaN, 3)).toThrow(RangeError);
  });

  it('waehle() liefert nur Elemente der Liste, alle davon, und wirft bei leerer Liste', () => {
    const z = erzeugeZufall(11);
    const liste = ['Eiche', 'Esche', 'Holunder'] as const;
    const gesehen = new Set<string>();
    for (let i = 0; i < 300; i++) gesehen.add(z.waehle(liste));
    expect([...gesehen].sort()).toEqual(['Eiche', 'Esche', 'Holunder']);
    expect(() => z.waehle([])).toThrow(RangeError);
  });

  it('verteilt grob gleichmäßig', () => {
    const z = erzeugeZufall(99);
    let unterHaelfte = 0;
    for (let i = 0; i < 10000; i++) if (z.zahl() < 0.5) unterHaelfte++;
    expect(unterHaelfte / 10000).toBeCloseTo(0.5, 1);
  });
});

describe('Zufall.abzweig', () => {
  it('ist reproduzierbar: gleicher Seed und Name ergeben dieselbe Folge', () => {
    const a = erzeugeZufall(77).abzweig('beute');
    const b = erzeugeZufall(77).abzweig('beute');
    expect(folge(30, () => a.zahl())).toEqual(folge(30, () => b.zahl()));
  });

  it('hängt nicht davon ab, wie viel der Elternstrom schon gezogen hat', () => {
    const frisch = erzeugeZufall(77);
    const benutzt = erzeugeZufall(77);
    for (let i = 0; i < 123; i++) benutzt.zahl();
    expect(folge(30, () => benutzt.abzweig('beute').zahl())).toEqual(
      folge(30, () => frisch.abzweig('beute').zahl()),
    );
  });

  it('beeinflusst den Elternstrom nicht', () => {
    const ohne = erzeugeZufall(5);
    const mitAbzweig = erzeugeZufall(5);
    const abzweig = mitAbzweig.abzweig('kampf');
    for (let i = 0; i < 50; i++) abzweig.zahl();
    expect(folge(20, () => mitAbzweig.zahl())).toEqual(folge(20, () => ohne.zahl()));
  });

  it('liefert für verschiedene Namen verschiedene Ströme', () => {
    const z = erzeugeZufall(5);
    const beute = folge(10, () => z.abzweig('beute').zahl());
    const kampf = folge(10, () => z.abzweig('kampf').zahl());
    expect(beute).not.toEqual(kampf);
    expect(beute).not.toEqual(folge(10, () => erzeugeZufall(5).zahl()));
  });

  it('liefert für denselben Namen dasselbe Objekt (kein doppelter Strom)', () => {
    const z = erzeugeZufall(5);
    expect(z.abzweig('beute')).toBe(z.abzweig('beute'));
  });

  it('lässt sich verschachteln', () => {
    const a = erzeugeZufall(3).abzweig('welt').abzweig('baeume');
    const b = erzeugeZufall(3).abzweig('welt').abzweig('baeume');
    expect(a.zahl()).toBe(b.zahl());
    expect(erzeugeZufall(3).abzweig('baeume').zahl()).not.toBe(
      erzeugeZufall(3).abzweig('welt').abzweig('baeume').zahl(),
    );
  });
});

describe('seedAusAdresse', () => {
  it('übernimmt Zahlen aus ?seed=', () => {
    expect(seedAusAdresse('?seed=12345')).toEqual({ seed: 12345, ausAdresse: true });
    expect(seedAusAdresse('?debug&seed=7')).toEqual({ seed: 7, ausAdresse: true });
  });

  it('macht aus Text über einen Hash einen festen Seed', () => {
    expect(seedAusAdresse('?seed=wolfsrudel')).toEqual({ seed: 2447954484, ausAdresse: true });
    expect(textHash('wolfsrudel')).toBe(2447954484);
  });

  it('wählt ohne Angabe einen zufälligen 32-Bit-Seed', () => {
    const ergebnis = seedAusAdresse('');
    expect(ergebnis.ausAdresse).toBe(false);
    expect(Number.isInteger(ergebnis.seed)).toBe(true);
    expect(ergebnis.seed).toBeGreaterThanOrEqual(0);
    expect(ergebnis.seed).toBeLessThan(2 ** 32);
    expect(seedAusAdresse('?seed=').ausAdresse).toBe(false);
  });
});
