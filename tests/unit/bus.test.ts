import { describe, expect, it, vi } from 'vitest';
import { EreignisBus } from '@engine/bus';

const stillerBus = (optionen: ConstructorParameters<typeof EreignisBus>[0] = {}) =>
  new EreignisBus({ warnen: vi.fn(), fehlerMelden: vi.fn(), ...optionen });

describe('Ereignisbus: Zustellung', () => {
  it('stellt synchron und in Anmeldereihenfolge zu', () => {
    const bus = stillerBus();
    const protokoll: string[] = [];
    bus.an('ui:hinweis', (n) => protokoll.push(`a:${n.text}`));
    bus.an('ui:hinweis', (n) => protokoll.push(`b:${n.text}`));
    bus.aus('ui:hinweis', { text: 'Hallo', dauer: 1 });
    // Synchron: Direkt nach `aus` ist alles zugestellt.
    expect(protokoll).toEqual(['a:Hallo', 'b:Hallo']);
  });

  it('stellt nur an Zuhörer des passenden Ereignisses zu', () => {
    const bus = stillerBus();
    const hoerer = vi.fn();
    bus.an('spiel:pausiert', hoerer);
    bus.aus('spiel:fortgesetzt', {});
    expect(hoerer).not.toHaveBeenCalled();
  });

  it('übergibt die Nutzlast unverändert', () => {
    const bus = stillerBus();
    const nutzlast = { menge: 37, gesamt: 100 };
    let erhalten: unknown;
    bus.an('gold:erhalten', (n) => (erhalten = n));
    bus.aus('gold:erhalten', nutzlast);
    expect(erhalten).toBe(nutzlast);
  });

  it('meldet sich mit der zurückgegebenen Funktion ab, auch doppelt ohne Schaden', () => {
    const bus = stillerBus();
    const hoerer = vi.fn();
    const abmelden = bus.an('spiel:pausiert', hoerer);
    bus.aus('spiel:pausiert', {});
    abmelden();
    abmelden();
    bus.aus('spiel:pausiert', {});
    expect(hoerer).toHaveBeenCalledTimes(1);
    expect(bus.anzahlHoerer('spiel:pausiert')).toBe(0);
  });

  it('meldet dieselbe Funktion zweimal getrennt an und ab', () => {
    const bus = stillerBus();
    const hoerer = vi.fn();
    const ab1 = bus.an('spiel:pausiert', hoerer);
    bus.an('spiel:pausiert', hoerer);
    bus.aus('spiel:pausiert', {});
    expect(hoerer).toHaveBeenCalledTimes(2);
    ab1();
    bus.aus('spiel:pausiert', {});
    expect(hoerer).toHaveBeenCalledTimes(3);
  });

  it('einmal() hört genau einmal zu', () => {
    const bus = stillerBus();
    const hoerer = vi.fn();
    bus.einmal('spiel:pausiert', hoerer);
    bus.aus('spiel:pausiert', {});
    bus.aus('spiel:pausiert', {});
    expect(hoerer).toHaveBeenCalledTimes(1);
    expect(bus.anzahlHoerer()).toBe(0);
  });
});

describe('Ereignisbus: Abmelden während der Zustellung', () => {
  it('ein Zuhörer meldet einen späteren ab: Der bekommt nichts mehr', () => {
    const bus = stillerBus();
    const protokoll: string[] = [];
    let abmeldenB = (): void => {};
    bus.an('spiel:pausiert', () => {
      protokoll.push('a');
      abmeldenB();
    });
    abmeldenB = bus.an('spiel:pausiert', () => protokoll.push('b'));
    bus.an('spiel:pausiert', () => protokoll.push('c'));
    bus.aus('spiel:pausiert', {});
    expect(protokoll).toEqual(['a', 'c']);
    bus.aus('spiel:pausiert', {});
    expect(protokoll).toEqual(['a', 'c', 'a', 'c']);
  });

  it('ein Zuhörer meldet sich selbst ab: Die anderen bekommen das Ereignis trotzdem', () => {
    const bus = stillerBus();
    const protokoll: string[] = [];
    const abmeldenA = bus.an('spiel:pausiert', () => {
      protokoll.push('a');
      abmeldenA();
    });
    bus.an('spiel:pausiert', () => protokoll.push('b'));
    bus.aus('spiel:pausiert', {});
    bus.aus('spiel:pausiert', {});
    expect(protokoll).toEqual(['a', 'b', 'b']);
  });

  it('ein früherer Zuhörer wird abgemeldet, nachdem er schon dran war', () => {
    const bus = stillerBus();
    const protokoll: string[] = [];
    const abmeldenA = bus.an('spiel:pausiert', () => protokoll.push('a'));
    bus.an('spiel:pausiert', () => {
      protokoll.push('b');
      abmeldenA();
    });
    bus.an('spiel:pausiert', () => protokoll.push('c'));
    bus.aus('spiel:pausiert', {});
    expect(protokoll).toEqual(['a', 'b', 'c']);
  });

  it('wer während der Zustellung dazukommt, hört erst ab dem nächsten Senden zu', () => {
    const bus = stillerBus();
    const spaeter = vi.fn();
    bus.an('spiel:pausiert', () => {
      if (bus.anzahlHoerer('spiel:pausiert') === 1) bus.an('spiel:pausiert', spaeter);
    });
    bus.aus('spiel:pausiert', {});
    expect(spaeter).not.toHaveBeenCalled();
    bus.aus('spiel:pausiert', {});
    expect(spaeter).toHaveBeenCalledTimes(1);
  });

  it('alle Zuhörer melden sich in derselben Zustellung ab', () => {
    const bus = stillerBus();
    const ab: (() => void)[] = [];
    const hoerer = vi.fn(() => ab.forEach((f) => f()));
    ab.push(bus.an('spiel:pausiert', hoerer), bus.an('spiel:pausiert', hoerer));
    bus.aus('spiel:pausiert', {});
    expect(hoerer).toHaveBeenCalledTimes(1);
    expect(bus.anzahlHoerer()).toBe(0);
  });
});

describe('Ereignisbus: Fehler in Zuhörern', () => {
  it('meldet den Fehler und stellt an die übrigen trotzdem zu', () => {
    const fehlerMelden = vi.fn();
    const bus = stillerBus({ fehlerMelden });
    const danach = vi.fn();
    bus.an('spiel:pausiert', () => {
      throw new Error('kaputt');
    });
    bus.an('spiel:pausiert', danach);
    bus.aus('spiel:pausiert', {});
    expect(danach).toHaveBeenCalledTimes(1);
    expect(fehlerMelden).toHaveBeenCalledWith(expect.any(Error), 'spiel:pausiert');
  });
});

describe('Ereignisbus: Tiefenbegrenzung', () => {
  it('bricht eine endlose Kette nach 8 Ebenen mit genau einer Warnung ab', () => {
    const warnen = vi.fn();
    const bus = stillerBus({ warnen });
    let aufrufe = 0;
    bus.an('spiel:pausiert', () => {
      aufrufe++;
      bus.aus('spiel:pausiert', {});
    });
    bus.aus('spiel:pausiert', {});
    expect(aufrufe).toBe(8);
    expect(warnen).toHaveBeenCalledTimes(1);
    expect(warnen.mock.calls[0]?.[0]).toContain('8 Ebenen');
  });

  it('lässt eine Kette mit genau 8 Ebenen ohne Warnung durch', () => {
    const warnen = vi.fn();
    const bus = stillerBus({ warnen });
    let tiefe = 0;
    bus.an('spiel:pausiert', () => {
      tiefe++;
      if (tiefe < 8) bus.aus('spiel:pausiert', {});
    });
    bus.aus('spiel:pausiert', {});
    expect(tiefe).toBe(8);
    expect(warnen).not.toHaveBeenCalled();
  });

  it('funktioniert nach einem Abbruch wieder normal und warnt erneut', () => {
    const warnen = vi.fn();
    const bus = stillerBus({ warnen });
    let aufrufe = 0;
    bus.an('spiel:pausiert', () => {
      aufrufe++;
      bus.aus('spiel:pausiert', {});
    });
    bus.aus('spiel:pausiert', {});
    bus.aus('spiel:pausiert', {});
    expect(aufrufe).toBe(16);
    expect(warnen).toHaveBeenCalledTimes(2);
  });

  it('zählt Ebenen über verschiedene Ereignisse hinweg', () => {
    const bus = stillerBus();
    let aufrufe = 0;
    bus.an('spiel:pausiert', () => {
      aufrufe++;
      bus.aus('spiel:fortgesetzt', {});
    });
    bus.an('spiel:fortgesetzt', () => {
      aufrufe++;
      bus.aus('spiel:pausiert', {});
    });
    bus.aus('spiel:pausiert', {});
    expect(aufrufe).toBe(8);
  });

  it('stellt nach einer Ausnahme tief in der Kette wieder auf Ebene 0 zurück', () => {
    const bus = stillerBus();
    bus.an('spiel:pausiert', () => {
      throw new Error('kaputt');
    });
    for (let i = 0; i < 20; i++) bus.aus('spiel:pausiert', {});
    const hoerer = vi.fn();
    bus.an('spiel:fortgesetzt', hoerer);
    bus.aus('spiel:fortgesetzt', {});
    expect(hoerer).toHaveBeenCalledTimes(1);
  });
});

describe('Ereignisbus: Ringpuffer', () => {
  it('behält die letzten 50 Ereignisse, das älteste zuerst', () => {
    let schritt = 0;
    const bus = stillerBus({ schrittGeber: () => schritt });
    for (let i = 0; i < 60; i++) {
      schritt = i;
      // Abwechselnd, damit nichts zusammengefasst wird.
      if (i % 2 === 0) bus.aus('gold:erhalten', { menge: i, gesamt: i });
      else bus.aus('trank:benutzt', { art: 'leben', menge: i });
    }
    const verlauf = bus.verlauf();
    expect(verlauf).toHaveLength(50);
    expect(verlauf[0]?.ersterSchritt).toBe(10);
    expect(verlauf[49]?.ersterSchritt).toBe(59);
    expect(verlauf[0]?.nutzlast).toEqual({ menge: 10, gesamt: 10 });
  });

  it('protokolliert auch Ereignisse ohne Zuhörer', () => {
    const bus = stillerBus();
    bus.aus('spiel:gestartet', { seed: 5 });
    expect(bus.verlauf().map((e) => e.name)).toEqual(['spiel:gestartet']);
  });

  it('fasst gleiche Ereignisse direkt hintereinander zusammen', () => {
    let schritt = 0;
    const bus = stillerBus({ schrittGeber: () => schritt });
    const position = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 120; i++) {
      schritt = i;
      position.x = i;
      bus.aus('spieler:bewegt', { position, geschwindigkeit: 5 });
    }
    bus.aus('gold:erhalten', { menge: 1, gesamt: 1 });
    const verlauf = bus.verlauf();
    expect(verlauf).toHaveLength(2);
    expect(verlauf[0]).toMatchObject({
      name: 'spieler:bewegt',
      anzahl: 120,
      ersterSchritt: 0,
      letzterSchritt: 119,
    });
  });

  it('kopiert Vektoren der Nutzlast, damit spätere Änderungen den Verlauf nicht verfälschen', () => {
    const bus = stillerBus();
    const position = { x: 1, y: 2, z: 3 };
    bus.aus('rast:begonnen', { position });
    position.x = 99;
    expect(bus.verlauf()[0]?.nutzlast).toEqual({ position: { x: 1, y: 2, z: 3 } });
  });

  it('respektiert eine eigene Puffergröße', () => {
    const bus = stillerBus({ verlaufGroesse: 3 });
    bus.aus('quest:abgeschlossen', { questId: 'a' });
    bus.aus('spiel:pausiert', {});
    bus.aus('quest:abgeschlossen', { questId: 'b' });
    bus.aus('spiel:fortgesetzt', {});
    expect(bus.verlauf().map((e) => e.name)).toEqual([
      'spiel:pausiert',
      'quest:abgeschlossen',
      'spiel:fortgesetzt',
    ]);
  });
});
