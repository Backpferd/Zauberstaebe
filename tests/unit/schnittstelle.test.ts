/**
 * Die öffentliche Schnittstelle `@engine/index` lädt auch ohne Browser und
 * enthält alles, was Welle 1 braucht.
 */
import { describe, expect, it } from 'vitest';
import * as engine from '@engine/index';
import { naechsteGrafikstufe, STUFEN_EINSTELLUNGEN, GRAFIKSTUFEN } from '@engine/index';

describe('@engine/index', () => {
  it('exportiert die Kernbausteine', () => {
    const erwartet = [
      'erzeugeWelt',
      'erzeugeBus',
      'erzeugeZufall',
      'Simulation',
      'Spielschleife',
      'ManuelleUhr',
      'Eingabe',
      'erzeugeEingabeSystem',
      'Kamera',
      'SpielRenderer',
      'SchattenLicht',
      'AudioGrundlage',
      'Debug',
      'erzeugeEngine',
      't',
      'registriereTexte',
      'komponente',
      'mit',
      'holeKomponente',
      'setzeKomponente',
      'interpolierePosition',
      'aktuelleGrafikstufe',
      'EBENE_EFFEKTE',
      'SCHRITT',
    ];
    for (const name of erwartet) expect(engine, name).toHaveProperty(name);
    expect(engine.SCHRITT).toBe(1 / 60);
  });

  it('schaltet die Grafikstufen im Kreis durch, jede Stufe ist sparsamer als die nächste', () => {
    expect(naechsteGrafikstufe('niedrig')).toBe('mittel');
    expect(naechsteGrafikstufe('mittel')).toBe('hoch');
    expect(naechsteGrafikstufe('hoch')).toBe('niedrig');
    for (let i = 1; i < GRAFIKSTUFEN.length; i++) {
      const vorher = STUFEN_EINSTELLUNGEN[GRAFIKSTUFEN[i - 1] ?? 'niedrig'];
      const jetzt = STUFEN_EINSTELLUNGEN[GRAFIKSTUFEN[i] ?? 'hoch'];
      expect(jetzt.schattenAufloesung).toBeGreaterThan(vorher.schattenAufloesung);
      expect(jetzt.pixelVerhaeltnisMax).toBeGreaterThan(vorher.pixelVerhaeltnisMax);
    }
    expect(STUFEN_EINSTELLUNGEN.niedrig.ao).toBe(false);
    expect(STUFEN_EINSTELLUNGEN.hoch.ao && STUFEN_EINSTELLUNGEN.hoch.bloom).toBe(true);
  });

  it('sicheresJson übersteht Kreise, Maps und Sets und rundet Zahlen', () => {
    const kreis: Record<string, unknown> = { wert: 1.23456 };
    kreis['selbst'] = kreis;
    expect(engine.sicheresJson(kreis)).toBe('{"wert":1.235,"selbst":"[Kreis]"}');
    expect(engine.sicheresJson(new Map([['a', new Set([1, 2])]]))).toBe('{"a":[1,2]}');
    expect(engine.sicheresJson(undefined)).toBe('undefined');
  });
});
