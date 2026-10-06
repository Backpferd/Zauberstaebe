import { describe, expect, it } from 'vitest';
import { createRng } from '@engine/random';

describe('createRng (Seed-Zufall)', () => {
  it('liefert bei gleichem Seed dieselbe Folge', () => {
    const a = createRng(42);
    const b = createRng(42);
    const folgeA = Array.from({ length: 20 }, () => a());
    const folgeB = Array.from({ length: 20 }, () => b());
    expect(folgeA).toEqual(folgeB);
  });

  it('liefert bei verschiedenen Seeds verschiedene Folgen', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it('liefert Zahlen im Bereich [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const wert = rng();
      expect(wert).toBeGreaterThanOrEqual(0);
      expect(wert).toBeLessThan(1);
    }
  });

  it('hält die Grenzen von int() ein und trifft beide Enden', () => {
    const rng = createRng(123);
    const gesehen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const wert = rng.int(3, 6);
      expect(Number.isInteger(wert)).toBe(true);
      expect(wert).toBeGreaterThanOrEqual(3);
      expect(wert).toBeLessThanOrEqual(6);
      gesehen.add(wert);
    }
    expect([...gesehen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('hält die Grenzen von range() ein', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      const wert = rng.range(-2, 2);
      expect(wert).toBeGreaterThanOrEqual(-2);
      expect(wert).toBeLessThan(2);
    }
  });

  it('chance() folgt grob der Wahrscheinlichkeit', () => {
    const rng = createRng(99);
    let treffer = 0;
    const durchgaenge = 10000;
    for (let i = 0; i < durchgaenge; i++) {
      if (rng.chance(0.25)) treffer++;
    }
    expect(treffer / durchgaenge).toBeCloseTo(0.25, 1);
    expect(createRng(1).chance(0)).toBe(false);
    expect(createRng(1).chance(1)).toBe(true);
  });

  it('pick() liefert nur Elemente der Liste und wirft bei leerer Liste', () => {
    const rng = createRng(11);
    const liste = ['Eiche', 'Esche', 'Holunder'] as const;
    for (let i = 0; i < 100; i++) {
      expect(liste).toContain(rng.pick(liste));
    }
    expect(() => rng.pick([])).toThrow();
  });

  it('ist über einen festen Wert reproduzierbar (Regressionsanker)', () => {
    // Fester Referenzwert: Ändert sich dieser Test, ändert sich jeder gemeldete Seed.
    expect(createRng(1)()).toBeCloseTo(0.6270739405881613, 12);
  });
});
