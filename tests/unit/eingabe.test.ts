import { describe, expect, it, vi } from 'vitest';
import {
  AKTIONEN,
  Eingabe,
  erzeugeEingabeSystem,
  MAUS_LINKS,
  MAUS_RECHTS,
  STANDARD_BELEGUNG,
} from '@engine/eingabe';
import { vec3 } from '@engine/vektor';

describe('Eingabe: Belegung', () => {
  it('belegt jede Aktion mit mindestens einer Taste und nutzt KeyboardEvent.code', () => {
    for (const aktion of AKTIONEN) expect(STANDARD_BELEGUNG[aktion].length).toBeGreaterThan(0);
    expect(STANDARD_BELEGUNG['laufen-hoch']).toEqual(['KeyW']);
    expect(STANDARD_BELEGUNG['laufen-links']).toEqual(['KeyA']);
    expect(STANDARD_BELEGUNG['zauber-primaer']).toEqual([MAUS_LINKS]);
    expect(STANDARD_BELEGUNG['zauber-sekundaer']).toEqual([MAUS_RECHTS]);
    expect(STANDARD_BELEGUNG.ausweichen).toEqual(['Space']);
    expect(STANDARD_BELEGUNG.interagieren).toEqual(['KeyE']);
    expect(STANDARD_BELEGUNG.menue).toEqual(['Escape']);
    expect(STANDARD_BELEGUNG['trank-1']).toEqual(['Digit1']);
    expect(STANDARD_BELEGUNG['trank-2']).toEqual(['Digit2']);
    expect(STANDARD_BELEGUNG['debug-anzeige']).toEqual(['F3']);
    expect(STANDARD_BELEGUNG.grafikstufe).toEqual(['F4']);
    expect(STANDARD_BELEGUNG.fehlerbericht).toEqual(['F8']);
  });

  it('keine Taste ist doppelt belegt', () => {
    const tasten = AKTIONEN.flatMap((a) => STANDARD_BELEGUNG[a]);
    expect(new Set(tasten).size).toBe(tasten.length);
  });

  it('lässt sich umbelegen, wirkt sofort und lässt sich zurücksetzen', () => {
    const eingabe = new Eingabe();
    eingabe.belegen('laufen-hoch', ['ArrowUp', 'KeyW', 'ArrowUp']);
    expect(eingabe.tastenFuer('laufen-hoch')).toEqual(['ArrowUp', 'KeyW']);
    expect(eingabe.aktionenFuer('ArrowUp')).toEqual(['laufen-hoch']);

    eingabe.tasteRunter('ArrowUp');
    eingabe.einfrieren();
    expect(eingabe.zustand.gehalten('laufen-hoch')).toBe(true);
    eingabe.tasteHoch('ArrowUp');

    eingabe.belegungZuruecksetzen();
    expect(eingabe.tastenFuer('laufen-hoch')).toEqual(['KeyW']);
    expect(eingabe.aktionenFuer('ArrowUp')).toEqual([]);
  });

  it('gibt die Belegung nur als Kopie heraus', () => {
    const eingabe = new Eingabe();
    const kopie = eingabe.belegung as unknown as Record<string, string[]>;
    kopie['laufen-hoch']?.push('KeyX');
    expect(eingabe.tastenFuer('laufen-hoch')).toEqual(['KeyW']);
    expect(STANDARD_BELEGUNG['laufen-hoch']).toEqual(['KeyW']);
  });

  it('übernimmt eine Teilbelegung, z. B. aus dem Spielstand', () => {
    const eingabe = new Eingabe();
    eingabe.belegungSetzen({ ausweichen: ['ShiftLeft'], interagieren: ['KeyF'] });
    expect(eingabe.tastenFuer('ausweichen')).toEqual(['ShiftLeft']);
    expect(eingabe.tastenFuer('interagieren')).toEqual(['KeyF']);
    expect(eingabe.tastenFuer('laufen-hoch')).toEqual(['KeyW']);
  });

  it('erlaubt dieselbe Taste für mehrere Aktionen', () => {
    const eingabe = new Eingabe();
    eingabe.belegen('interagieren', ['KeyE', 'Space']);
    expect(eingabe.aktionenFuer('Space')).toEqual(['ausweichen', 'interagieren']);
  });
});

describe('Eingabe: Einfrieren pro Schritt', () => {
  it('ein kurzer Tipper zwischen zwei Schritten geht nicht verloren', () => {
    const eingabe = new Eingabe();
    eingabe.tasteRunter('Space');
    eingabe.tasteHoch('Space');
    eingabe.einfrieren();
    expect(eingabe.zustand.gedrueckt('ausweichen')).toBe(true);
    expect(eingabe.zustand.gehalten('ausweichen')).toBe(false);
    expect(eingabe.zustand.losgelassen('ausweichen')).toBe(true);
    eingabe.einfrieren();
    expect(eingabe.zustand.gedrueckt('ausweichen')).toBe(false);
    expect(eingabe.zustand.losgelassen('ausweichen')).toBe(false);
  });

  it('meldet eine gehaltene Taste nur im ersten Schritt als gedrückt', () => {
    const eingabe = new Eingabe();
    eingabe.tasteRunter(MAUS_LINKS);
    eingabe.einfrieren();
    expect(eingabe.zustand.gedrueckt('zauber-primaer')).toBe(true);
    expect(eingabe.zustand.gehalten('zauber-primaer')).toBe(true);
    // Tastenwiederholung des Browsers erzeugt keine neue Flanke.
    eingabe.tasteRunter(MAUS_LINKS);
    eingabe.einfrieren();
    expect(eingabe.zustand.gedrueckt('zauber-primaer')).toBe(false);
    expect(eingabe.zustand.gehalten('zauber-primaer')).toBe(true);
    eingabe.tasteHoch(MAUS_LINKS);
    eingabe.einfrieren();
    expect(eingabe.zustand.losgelassen('zauber-primaer')).toBe(true);
    expect(eingabe.zustand.gehalten('zauber-primaer')).toBe(false);
  });

  it('ändert den eingefrorenen Zustand zwischen zwei Schritten nicht', () => {
    const eingabe = new Eingabe();
    eingabe.einfrieren();
    eingabe.tasteRunter('KeyW');
    expect(eingabe.zustand.gehalten('laufen-hoch')).toBe(false);
    eingabe.einfrieren();
    expect(eingabe.zustand.gehalten('laufen-hoch')).toBe(true);
  });

  it('liefert die Laufrichtung aus WASD, diagonal normiert (W = −z, D = +x)', () => {
    const eingabe = new Eingabe();
    eingabe.tasteRunter('KeyW');
    eingabe.einfrieren();
    expect(eingabe.zustand.bewegung).toEqual({ x: 0, z: -1 });

    eingabe.tasteRunter('KeyD');
    eingabe.einfrieren();
    expect(eingabe.zustand.bewegung.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(eingabe.zustand.bewegung.z).toBeCloseTo(-Math.SQRT1_2, 12);

    eingabe.tasteRunter('KeyS'); // W und S heben sich auf
    eingabe.einfrieren();
    expect(eingabe.zustand.bewegung).toEqual({ x: 1, z: 0 });

    eingabe.allesLoslassen();
    eingabe.einfrieren();
    expect(eingabe.zustand.bewegung).toEqual({ x: 0, z: 0 });
    expect(eingabe.zustand.losgelassen('laufen-hoch')).toBe(true);
  });

  it('meldet keine Aktion für unbelegte Tasten', () => {
    const eingabe = new Eingabe();
    eingabe.tasteRunter('KeyQ');
    eingabe.einfrieren();
    for (const aktion of AKTIONEN) expect(eingabe.zustand.gehalten(aktion)).toBe(false);
  });

  it('System 10 friert die Eingabe ein', () => {
    const eingabe = new Eingabe();
    const system = erzeugeEingabeSystem(eingabe);
    expect(system.reihenfolge).toBe(10);
    eingabe.tasteRunter('KeyE');
    system.schritt({} as never, 1 / 60);
    expect(eingabe.zustand.gedrueckt('interagieren')).toBe(true);
  });
});

describe('Eingabe: Zielpunkt der Maus', () => {
  it('rechnet die Mausposition beim Einfrieren über die Kamera in einen Bodenpunkt um', () => {
    const eingabe = new Eingabe();
    const berechnung = vi.fn((x: number, y: number, hoehe: number) => vec3(x * 10, hoehe, -y * 10));
    eingabe.setzeZielBerechnung(berechnung);
    eingabe.einfrieren();
    expect(eingabe.zustand.zielGueltig).toBe(false);

    eingabe.setzeZeiger(0.5, -0.2);
    eingabe.zielHoehe = 1.5;
    eingabe.einfrieren();
    expect(berechnung).toHaveBeenLastCalledWith(0.5, -0.2, 1.5);
    expect(eingabe.zustand.zielGueltig).toBe(true);
    expect(eingabe.zustand.ziel).toEqual({ x: 5, y: 1.5, z: 2 });
  });

  it('behält den letzten Zielpunkt, wenn der Strahl den Boden verfehlt', () => {
    const eingabe = new Eingabe();
    let trifft = true;
    eingabe.setzeZielBerechnung(() => (trifft ? vec3(1, 0, 2) : null));
    eingabe.setzeZeiger(0, 0);
    eingabe.einfrieren();
    trifft = false;
    eingabe.einfrieren();
    expect(eingabe.zustand.ziel).toEqual({ x: 1, y: 0, z: 2 });
    expect(eingabe.zustand.zielGueltig).toBe(true);
  });

  it('eine Zielvorgabe (Testbot) hat Vorrang vor der Maus', () => {
    const eingabe = new Eingabe();
    eingabe.setzeZielBerechnung(() => vec3(1, 0, 1));
    eingabe.setzeZeiger(0, 0);
    eingabe.setzeZiel(vec3(-4, 0, 7));
    eingabe.einfrieren();
    expect(eingabe.zustand.ziel).toEqual({ x: -4, y: 0, z: 7 });
    eingabe.setzeZiel(null);
    eingabe.einfrieren();
    expect(eingabe.zustand.ziel).toEqual({ x: 1, y: 0, z: 1 });
  });
});

describe('Eingabe: Sofort-Rückrufe', () => {
  it('ruft beiAktion sofort beim Drücken auf, nicht bei Wiederholung, und lässt sich abmelden', () => {
    const eingabe = new Eingabe();
    const rueckruf = vi.fn();
    const abmelden = eingabe.beiAktion('debug-anzeige', rueckruf);
    eingabe.tasteRunter('F3');
    eingabe.tasteRunter('F3');
    expect(rueckruf).toHaveBeenCalledTimes(1);
    eingabe.tasteHoch('F3');
    abmelden();
    eingabe.tasteRunter('F3');
    expect(rueckruf).toHaveBeenCalledTimes(1);
  });

  it('ein Fehler in einem Rückruf hält die Eingabe nicht an', () => {
    const eingabe = new Eingabe();
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
    const zweiter = vi.fn();
    eingabe.beiAktion('menue', () => {
      throw new Error('kaputt');
    });
    eingabe.beiAktion('menue', zweiter);
    eingabe.tasteRunter('Escape');
    expect(zweiter).toHaveBeenCalled();
    eingabe.einfrieren();
    expect(eingabe.zustand.gedrueckt('menue')).toBe(true);
    fehler.mockRestore();
  });
});
