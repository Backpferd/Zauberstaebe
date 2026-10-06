import { describe, expect, it, vi } from 'vitest';
import { AudioGrundlage } from '@engine/audio';
import { EreignisBus } from '@engine/bus';

/** Minimaler Ersatz für AudioContext: zeichnet nur auf, was verbunden wird. */
function falscherKontext() {
  const knoten: { art: string; gain?: { value: number }; pan?: { value: number } }[] = [];
  const param = () => ({
    value: 1,
    setTargetAtTime: vi.fn(function (this: { value: number }, v: number) {
      this.value = v;
    }),
  });
  const kontext = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createGain() {
      const k = { art: 'gain', gain: param(), connect: vi.fn() };
      knoten.push(k);
      return k;
    },
    createStereoPanner() {
      const k = { art: 'panner', pan: { value: 0 }, connect: vi.fn() };
      knoten.push(k);
      return k;
    },
  };
  return { kontext: kontext as unknown as AudioContext, knoten };
}

describe('Audio-Grundlage', () => {
  it('spielt vor der Freischaltung nichts und danach registrierte Klänge über den Bus', () => {
    const bus = new EreignisBus();
    const { kontext } = falscherKontext();
    const audio = new AudioGrundlage({ bus, kontextFabrik: () => kontext });
    const erzeuger = vi.fn();
    audio.registriereKlang('test', erzeuger);

    bus.aus('audio:abspielen', { name: 'test', position: null, lautstaerke: 1 });
    expect(erzeuger).not.toHaveBeenCalled();
    expect(audio.bereit).toBe(false);

    audio.freischalten();
    expect(audio.bereit).toBe(true);
    bus.aus('audio:abspielen', { name: 'test', position: null, lautstaerke: 0.5 });
    expect(erzeuger).toHaveBeenCalledTimes(1);
    expect(erzeuger.mock.calls[0]?.[0]).toMatchObject({ lautstaerke: 0.5, position: null });
    audio.entsorgen();
  });

  it('warnt bei unbekannten Klängen genau einmal', () => {
    const { kontext } = falscherKontext();
    const audio = new AudioGrundlage({ kontextFabrik: () => kontext });
    const warnung = vi.spyOn(console, 'warn').mockImplementation(() => {});
    audio.freischalten();
    audio.abspielen('gibt-es-nicht');
    audio.abspielen('gibt-es-nicht');
    expect(warnung).toHaveBeenCalledTimes(1);
    warnung.mockRestore();
  });

  it('begrenzt Lautstärken auf 0 bis 1 und übernimmt sie beim Freischalten', () => {
    const { kontext, knoten } = falscherKontext();
    const audio = new AudioGrundlage({ kontextFabrik: () => kontext });
    audio.setzeLautstaerke('effekte', 1.7);
    audio.setzeLautstaerke('umgebung', 0.25);
    audio.setzeLautstaerke('gesamt', Number.NaN);
    expect(audio.lautstaerke('effekte')).toBe(1);
    expect(audio.lautstaerke('umgebung')).toBe(0.25);
    expect(audio.lautstaerke('gesamt')).toBe(0);
    audio.freischalten();
    // Reihenfolge der Kanalknoten: gesamt, effekte, umgebung.
    expect(knoten.slice(0, 3).map((k) => k.gain?.value)).toEqual([0, 1, 0.25]);
  });

  it('macht entfernte Klänge leiser und legt sie seitlich ins Stereobild', () => {
    const { kontext, knoten } = falscherKontext();
    const audio = new AudioGrundlage({ kontextFabrik: () => kontext });
    audio.registriereKlang('nah', () => {});
    audio.freischalten();
    audio.setzeHoerer({ x: 0, y: 0, z: 0 });
    audio.abspielen('nah', { position: { x: 32, y: 0, z: 0 }, lautstaerke: 1 });
    const panorama = knoten.find((k) => k.art === 'panner');
    const verstaerker = knoten.filter((k) => k.art === 'gain').at(-1);
    expect(panorama?.pan?.value).toBe(1);
    expect(verstaerker?.gain?.value).toBeLessThan(0.5);
  });
});
