import { describe, expect, it } from 'vitest';
import {
  abstandXZ,
  mischeWinkel,
  normalisiereWinkel,
  richtungAusWinkel,
  winkelAusRichtung,
  winkelZu,
} from '@engine/vektor';

describe('Vektoren und Blickrichtung', () => {
  it('folgt der Three.js-Konvention: 0 = +z, π/2 = +x', () => {
    const vorne = richtungAusWinkel(0);
    expect(vorne.x).toBeCloseTo(0, 12);
    expect(vorne.z).toBeCloseTo(1, 12);
    const rechts = richtungAusWinkel(Math.PI / 2);
    expect(rechts.x).toBeCloseTo(1, 12);
    expect(rechts.z).toBeCloseTo(0, 12);
    expect(winkelAusRichtung(0, -1)).toBeCloseTo(Math.PI, 12);
  });

  it('winkelZu und richtungAusWinkel passen zusammen', () => {
    const von = { x: 1, z: 1 };
    const nach = { x: 4, z: 5 };
    const r = richtungAusWinkel(winkelZu(von, nach));
    expect(r.x).toBeCloseTo(3 / 5, 12);
    expect(r.z).toBeCloseTo(4 / 5, 12);
    expect(abstandXZ(von, nach)).toBe(5);
  });

  it('normalisiert Winkel nach (−π, π]', () => {
    expect(normalisiereWinkel(0)).toBe(0);
    expect(normalisiereWinkel(Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalisiereWinkel(-Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalisiereWinkel(3 * Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalisiereWinkel(7)).toBeCloseTo(7 - 2 * Math.PI, 12);
    expect(normalisiereWinkel(-7)).toBeCloseTo(-7 + 2 * Math.PI, 12);
  });

  it('mischt Winkel über den kürzeren Weg', () => {
    expect(mischeWinkel(0, 1, 0.5)).toBeCloseTo(0.5, 12);
    const ueberPi = mischeWinkel(3, -3, 0.5);
    expect(Math.cos(ueberPi)).toBeCloseTo(-1, 9);
  });
});
