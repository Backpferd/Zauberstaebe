import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { texte } from '@content/texte';
import { hatText, registriereTexte, t } from '@engine/texte';

describe('t(): Texte holen', () => {
  let warnung: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    registriereTexte(
      {
        'test.gruss': 'Hallo {name}!',
        'test.gold': '+{menge} Gold',
        'test.doppelt': '{a} und {a} und {b}',
        'test.ohne': 'Schlicht',
        'test.umlaute': 'Größe, Übermut, Äste, Spaß',
      },
      { ersetzen: true },
    );
    warnung = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnung.mockRestore();
  });

  it('liefert Texte unverändert, auch mit Umlauten', () => {
    expect(t('test.ohne')).toBe('Schlicht');
    expect(t('test.umlaute')).toBe('Größe, Übermut, Äste, Spaß');
  });

  it('setzt Platzhalter ein, auch mehrfach', () => {
    expect(t('test.gruss', { name: 'Grimmzahn' })).toBe('Hallo Grimmzahn!');
    expect(t('test.doppelt', { a: 'x', b: 'y' })).toBe('x und x und y');
  });

  it('formatiert Zahlen deutsch', () => {
    expect(t('test.gold', { menge: 37 })).toBe('+37 Gold');
    expect(t('test.gold', { menge: 1234.5 })).toBe('+1.234,5 Gold');
    expect(t('test.gold', { menge: 0.125 })).toBe('+0,13 Gold');
  });

  it('liefert bei fehlendem Schlüssel ⟦schluessel⟧ und warnt genau einmal', () => {
    expect(t('gibt.es.nicht')).toBe('⟦gibt.es.nicht⟧');
    expect(t('gibt.es.nicht')).toBe('⟦gibt.es.nicht⟧');
    expect(warnung).toHaveBeenCalledTimes(1);
    expect(String(warnung.mock.calls[0]?.[0])).toContain('gibt.es.nicht');
  });

  it('lässt einen Platzhalter ohne Wert stehen und warnt', () => {
    expect(t('test.gruss')).toBe('Hallo {name}!');
    expect(t('test.gruss', { anderer: 'x' })).toBe('Hallo {name}!');
    expect(warnung).toHaveBeenCalledTimes(1);
  });

  it('stolpert nicht über Schlüssel wie Objekt-Methoden', () => {
    expect(t('toString')).toBe('⟦toString⟧');
    expect(t('__proto__')).toBe('⟦__proto__⟧');
    expect(t('test.gruss', { toString: 'x' } as Record<string, string>)).toBe('Hallo {name}!');
  });

  it('ergänzt mehrere Tabellen, der spätere Eintrag gewinnt', () => {
    registriereTexte({ 'test.neu': 'Neu', 'test.ohne': 'Überschrieben' });
    expect(t('test.neu')).toBe('Neu');
    expect(t('test.ohne')).toBe('Überschrieben');
    expect(t('test.gruss', { name: 'A' })).toBe('Hallo A!');
    expect(hatText('test.neu')).toBe(true);
    expect(hatText('test.fehlt')).toBe(false);
  });
});

describe('Texttabelle in src/content/texte.ts', () => {
  it('enthält alle Texte, die die Debug-Werkzeuge brauchen', () => {
    const benoetigt = [
      'debug.bildrate',
      'debug.drawcalls',
      'debug.dreiecke',
      'debug.entitaeten',
      'debug.schritt',
      'debug.seed',
      'debug.grafikstufe',
      'debug.pausiert',
      'debug.seed-start',
      'debug.bericht.titel',
      'debug.bericht.kopiert',
      'debug.bericht.konsole',
      'debug.bericht.ereignisse',
      'debug.bericht.fehler',
      'grafikstufe.niedrig',
      'grafikstufe.mittel',
      'grafikstufe.hoch',
    ];
    for (const schluessel of benoetigt) expect(texte).toHaveProperty([schluessel]);
  });

  it('besteht nur aus nicht leeren Texten', () => {
    for (const [schluessel, text] of Object.entries(texte)) {
      expect(text.trim().length, schluessel).toBeGreaterThan(0);
    }
  });
});
