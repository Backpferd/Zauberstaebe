/**
 * Vorschau für Aufgabe 1.5 (Inhalte als Daten): 24 gewürfelte Zauberstäbe als
 * Karten, darunter Tabellen der Gegner, Zauber, Begegnungen, Quest, Stufen und Affixe.
 *
 * Aufruf: ?szene=inhalte (mit `?seed=…` ist der Wurf reproduzierbar).
 * Bedienung: Stufe und Seltenheit wählen, „Neu würfeln“ zieht einen neuen Seed,
 * im Seed-Feld lässt sich ein bestimmter Seed eintragen.
 *
 * Entwicklerwerkzeug: schlicht, mit fest verdrahteten deutschen Texten für die
 * Beschriftung. Alle Inhalte kommen aus `src/content/` und über `t()`.
 */
import {
  AFFIX_LISTE,
  BEGEGNUNGEN,
  GEGNER,
  HOELZER,
  KERNE,
  QUEST,
  SELTENHEIT_REIHENFOLGE,
  SELTENHEITEN,
  STUFEN,
  ZAUBER,
} from '@content/index';
import type { BeuteEintrag, Seltenheit, Zauberstab } from '@content/typen';
import { erzeugeZufall, t, zufaelligerSeed, type Engine } from '@engine/index';
import { berechneWerte, erzeugeZauberstab } from '@game/zauberstab';

export const titel = 'Inhalte und Zauberstäbe (1.5)';

const ANZAHL_STAEBE = 24;

const STIL = `
#inhalte-vorschau {
  position: fixed; inset: 0; z-index: 10; overflow: auto;
  background: #141a17; color: #e9e4d4;
  font: 15px/1.45 system-ui, 'Segoe UI', sans-serif;
  padding: 16px 24px 48px;
}
#inhalte-vorschau h1 { margin: 0 0 4px; font-size: 22px; }
#inhalte-vorschau h2 { margin: 32px 0 8px; font-size: 18px; border-bottom: 1px solid #3a463f; padding-bottom: 4px; }
#inhalte-vorschau .leiste { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: end; margin: 12px 0 16px; }
#inhalte-vorschau label { display: grid; gap: 2px; font-size: 13px; color: #b9b4a2; }
#inhalte-vorschau select, #inhalte-vorschau input, #inhalte-vorschau button {
  font: inherit; color: #e9e4d4; background: #232c27; border: 1px solid #55645b;
  border-radius: 4px; padding: 5px 10px;
}
#inhalte-vorschau input { width: 130px; }
#inhalte-vorschau button { cursor: pointer; background: #7a3a1c; border-color: #b55a2c; font-weight: 600; }
#inhalte-vorschau button:hover { background: #8f4522; }
#inhalte-vorschau :focus-visible { outline: 2px solid #f0b36a; outline-offset: 2px; }
#inhalte-vorschau .seed { font: 14px ui-monospace, Consolas, monospace; color: #f0b36a; align-self: center; }
#inhalte-vorschau .karten { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
#inhalte-vorschau .stab-karte {
  background: #1f2823; border: 1px solid #3a463f; border-top-width: 4px;
  border-radius: 6px; padding: 10px 12px 12px;
}
#inhalte-vorschau .stab-karte[data-seltenheit='gewoehnlich'] { border-top-color: #9a9a90; }
#inhalte-vorschau .stab-karte[data-seltenheit='magisch'] { border-top-color: #5b9bd5; }
#inhalte-vorschau .stab-karte[data-seltenheit='selten'] { border-top-color: #d9a441; }
#inhalte-vorschau .stab-karte[data-seltenheit='einzigartig'] { border-top-color: #e0743c; }
#inhalte-vorschau .stab-karte h3 { margin: 0; font-size: 17px; }
#inhalte-vorschau .stab-karte[data-seltenheit='magisch'] h3 { color: #8fc0ee; }
#inhalte-vorschau .stab-karte[data-seltenheit='selten'] h3 { color: #ecc069; }
#inhalte-vorschau .stab-karte[data-seltenheit='einzigartig'] h3 { color: #f09062; }
#inhalte-vorschau .unterzeile { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: #b9b4a2; margin: 2px 0 8px; }
#inhalte-vorschau .werte { display: grid; grid-template-columns: 1fr auto; gap: 1px 12px; margin: 0 0 8px; }
#inhalte-vorschau .werte dt { color: #b9b4a2; }
#inhalte-vorschau .werte dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
#inhalte-vorschau ul.affixe { margin: 0 0 8px; padding: 0; list-style: none; }
#inhalte-vorschau ul.affixe li { padding: 1px 0; color: #cfd9c6; }
#inhalte-vorschau ul.affixe li.kern { color: #f0b36a; }
#inhalte-vorschau .flavor { margin: 0; font-style: italic; color: #b9b4a2; font-size: 13px; }
#inhalte-vorschau table { border-collapse: collapse; width: 100%; font-size: 13px; }
#inhalte-vorschau th, #inhalte-vorschau td { border: 1px solid #3a463f; padding: 4px 8px; text-align: left; vertical-align: top; }
#inhalte-vorschau th { background: #232c27; color: #f0b36a; font-weight: 600; white-space: nowrap; }
#inhalte-vorschau td.zahl { text-align: right; font-variant-numeric: tabular-nums; }
#inhalte-vorschau details { margin-top: 12px; }
#inhalte-vorschau summary { cursor: pointer; font-size: 16px; font-weight: 600; padding: 4px 0; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  eigenschaften: { klasse?: string; text?: string; id?: string } = {},
  kinder: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const knoten = document.createElement(tag);
  if (eigenschaften.klasse !== undefined) knoten.className = eigenschaften.klasse;
  if (eigenschaften.id !== undefined) knoten.id = eigenschaften.id;
  if (eigenschaften.text !== undefined) knoten.textContent = eigenschaften.text;
  for (const kind of kinder) knoten.append(kind);
  return knoten;
}

const zahl = (wert: number, stellen = 0): string =>
  wert.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

function tabelle(kopf: string[], zeilen: (string | number)[][]): HTMLTableElement {
  const tabellenKnoten = el('table');
  const kopfZeile = el(
    'tr',
    {},
    kopf.map((k) => el('th', { text: k })),
  );
  tabellenKnoten.append(el('thead', {}, [kopfZeile]));
  tabellenKnoten.append(
    el(
      'tbody',
      {},
      zeilen.map((zeile) =>
        el(
          'tr',
          {},
          zeile.map((zelle) =>
            el('td', {
              text:
                typeof zelle === 'number'
                  ? zelle.toLocaleString('de-DE', { maximumFractionDigits: 2 })
                  : zelle,
              klasse: typeof zelle === 'number' ? 'zahl' : '',
            }),
          ),
        ),
      ),
    ),
  );
  return tabellenKnoten;
}

function stabKarte(stab: Zauberstab): HTMLElement {
  const werte = berechneWerte(stab);
  const kern = KERNE[stab.kern];
  const zeilen: [string, string][] = [
    ['Zauberkraft', `${werte.zauberkraftMin} – ${werte.zauberkraftMax}`],
    ['Zaubertempo', `${zahl(werte.zaubertempo, 2)} / s`],
    [
      'Reichweite',
      `${zahl(werte.reichweite, 1)} m (${t(`stab.reichweite.${werte.reichweiteKlasse}`)})`,
    ],
    ['Mana', `+${werte.maximalesMana}`],
  ];
  const affixListe = el(
    'ul',
    { klasse: 'affixe' },
    werte.affixe.map((affix, index) =>
      el('li', { text: affix.text, klasse: index === 0 ? 'kern' : '' }),
    ),
  );
  const unterzeile = [
    t(SELTENHEITEN[stab.seltenheit].nameSchluessel),
    t(HOELZER[stab.holz].nameSchluessel),
    t(kern.nameSchluessel),
    t('stab.laenge', { zoll: stab.laenge }),
    `Stufe ${stab.stufe}`,
  ].join(' · ');

  const karte = el('article', { klasse: 'stab-karte' }, [
    el('h3', { text: stab.name }),
    el('div', { klasse: 'unterzeile', text: unterzeile }),
    el(
      'dl',
      { klasse: 'werte' },
      zeilen.flatMap(([name, wert]) => [el('dt', { text: name }), el('dd', { text: wert })]),
    ),
    affixListe,
    el('p', { klasse: 'flavor', text: `„${stab.beschreibung}“` }),
  ]);
  karte.dataset['seltenheit'] = stab.seltenheit;
  return karte;
}

function beuteText(eintrag: BeuteEintrag): string {
  const prozent = `${zahl(eintrag.chance * 100)} %`;
  switch (eintrag.art) {
    case 'gold':
      return `${t('gegenstand.gold.name')} ${eintrag.menge[0]}–${eintrag.menge[1]} (${prozent})`;
    case 'trank':
      return `${t(`trank.${eintrag.trank}.name`)} (${prozent})`;
    case 'zauberstab':
      return `Zauberstab St. ${eintrag.stufe}${eintrag.seltenheit === undefined ? '' : `, ${eintrag.seltenheit}`} (${prozent})`;
    case 'material':
      return `${t(`gegenstand.${eintrag.material}.name`)} (${prozent})`;
    case 'einzigartig':
      return `einzigartig: ${t(`stab.einzigartig.${eintrag.stab}.name`)} (${prozent})`;
  }
}

function gegnerTabelle(): HTMLTableElement {
  return tabelle(
    [
      'Name',
      'Stufe',
      'Leben',
      'Schaden',
      'Tempo',
      'Sicht',
      'Reichweite',
      'EP',
      'KI-Profil',
      'Beute',
    ],
    Object.values(GEGNER).map((g) => [
      g.id === 'grimmzahn'
        ? `${t(g.nameSchluessel)}, ${t('gegner.grimmzahn.titel')}`
        : t(g.nameSchluessel),
      g.stufe,
      g.leben,
      g.schaden,
      g.tempo,
      g.sichtweite,
      g.angriffsreichweite,
      g.ep,
      g.ki,
      g.beute.map(beuteText).join(', '),
    ]),
  );
}

function zauberTabelle(): HTMLTableElement {
  return tabelle(
    [
      'Zauber',
      'Taste',
      'Form',
      'Element',
      'Mana',
      'Abklingzeit (s)',
      'Schaden',
      'Radius / Strecke',
      'Effekt',
      'Tempo',
    ],
    Object.values(ZAUBER).map((z) => {
      if (z.form === 'ausweichen') {
        return [
          t(z.nameSchluessel),
          z.aktion,
          'Ausweichen',
          '–',
          z.manakosten,
          z.abklingzeit,
          '–',
          `${z.strecke} m in ${zahl(z.dauer, 2)} s`,
          `unverwundbar ${zahl(z.unverwundbar, 2)} s`,
          '–',
        ];
      }
      return [
        t(z.nameSchluessel),
        z.aktion,
        z.form === 'geschoss' ? 'Geschoss' : 'Fläche',
        z.element,
        z.manakosten,
        z.abklingzeit,
        `${z.schaden.basis} + ${zahl(z.schaden.zauberkraftFaktor, 1)} × Zauberkraft`,
        `${zahl(z.radius, 1)} m`,
        `${z.effekt.art}, ${zahl(z.effekt.dauer, 1)} s`,
        z.form === 'geschoss' ? `${z.geschosstempo} m/s` : '–',
      ];
    }),
  );
}

function begegnungenTabelle(): HTMLTableElement {
  return tabelle(
    ['Kennung', 'Name', 'Ort', 'Wellen', 'Besonderes'],
    Object.values(BEGEGNUNGEN).map((b) => [
      b.id,
      t(b.nameSchluessel),
      b.ort,
      b.wellen
        .map((welle) =>
          welle.map((g) => `${g.anzahl} × ${t(GEGNER[g.art].nameSchluessel)}`).join(' + '),
        )
        .join('  →  '),
      [
        'truhe' in b ? `Truhe: ${b.truhe.inhalt.map(beuteText).join(', ')}` : '',
        'schliesstArena' in b ? 'Dornenranken schließen die Arena' : '',
      ]
        .filter((s) => s.length > 0)
        .join('; '),
    ]),
  );
}

function questTabelle(): HTMLTableElement {
  const beschreibe = (
    a: (typeof QUEST.schritte)[number]['ausloeser'] | typeof QUEST.start,
  ): string =>
    Object.entries(a)
      .map(([name, wert]) => (name === 'ereignis' ? String(wert) : `${name}=${String(wert)}`))
      .join(', ');
  return tabelle(
    ['Schritt', 'Auslöser', 'Text vorher', 'Text nachher', 'Belohnung'],
    [
      ['Start', beschreibe(QUEST.start), t(QUEST.beschreibungSchluessel), '', ''],
      ...QUEST.schritte.map((s, index) => [
        `${index + 1}. ${s.id}`,
        beschreibe(s.ausloeser),
        t(s.vorherSchluessel),
        t(s.nachherSchluessel),
        'belohnung' in s ? JSON.stringify(s.belohnung) : '',
      ]),
    ],
  );
}

function stufenTabelle(): HTMLTableElement {
  return tabelle(
    [
      'Stufe',
      'EP ab',
      'Leben',
      'Mana',
      'Zauberkraft',
      'Manaregeneration / s',
      'Lebensregeneration / s',
    ],
    STUFEN.map((s) => [
      s.stufe,
      s.epSchwelle,
      s.leben,
      s.mana,
      s.zauberkraft,
      s.manaregeneration,
      s.lebensregeneration,
    ]),
  );
}

function affixTabelle(): HTMLTableElement {
  return tabelle(
    [
      'Affix',
      'Platz',
      'Fähigkeit',
      'Gewicht',
      'ab Stufe',
      'Stufe 1',
      'Stufe 2',
      'Stufe 3',
      'Stufe 4',
    ],
    AFFIX_LISTE.map((a) => [
      t(a.textSchluessel, { wert: '…' }),
      a.platz === 'praefix' ? 'Präfix' : 'Suffix',
      a.faehigkeit,
      a.gewicht,
      a.mindestStufe,
      ...a.spannen.map(([min, max]) => `${zahl(min, a.nachkomma)}–${zahl(max, a.nachkomma)}`),
    ]),
  );
}

function aufklappbar(titelText: string, inhalt: HTMLElement): HTMLDetailsElement {
  return el('details', {}, [el('summary', { text: titelText }), inhalt]);
}

export default function (engine: Engine): void {
  const stil = el('style', { text: STIL });
  document.head.append(stil);

  const wurzel = el('main', { id: 'inhalte-vorschau' });

  // Bedienleiste
  const stufeWahl = el('select', { id: 'stufe' });
  for (const stufe of [1, 2, 3, 4]) {
    stufeWahl.append(new Option(`Stufe ${stufe}`, String(stufe), false, stufe === 2));
  }
  const seltenheitWahl = el('select', { id: 'seltenheit' });
  seltenheitWahl.append(new Option('Zufällig (nach Gewichten)', 'zufall'));
  for (const seltenheit of SELTENHEIT_REIHENFOLGE) {
    seltenheitWahl.append(new Option(t(SELTENHEITEN[seltenheit].nameSchluessel), seltenheit));
  }
  const seedFeld = el('input', { id: 'seed-feld' });
  seedFeld.type = 'text';
  seedFeld.inputMode = 'numeric';
  seedFeld.autocomplete = 'off';
  const wuerfeln = el('button', { id: 'wuerfeln', text: 'Neu würfeln' });
  wuerfeln.type = 'button';
  const seedAnzeige = el('span', { id: 'seed-anzeige', klasse: 'seed' });

  const leiste = el('div', { klasse: 'leiste' }, [
    el('label', {}, ['Stufe', stufeWahl]),
    el('label', {}, ['Seltenheit', seltenheitWahl]),
    el('label', {}, ['Seed', seedFeld]),
    wuerfeln,
    seedAnzeige,
  ]);

  const karten = el('section', { klasse: 'karten', id: 'stab-karten' });

  let seed = engine.seed;

  const aktualisieren = (): void => {
    const stufe = Number(stufeWahl.value);
    const gewaehlt = seltenheitWahl.value;
    const seltenheit = gewaehlt === 'zufall' ? undefined : (gewaehlt as Seltenheit);
    // Ein Strom für alle 24 Stäbe: derselbe Seed ergibt dieselbe Seite.
    const zufall = erzeugeZufall(seed).abzweig('vorschau');
    karten.replaceChildren(
      ...Array.from({ length: ANZAHL_STAEBE }, () =>
        stabKarte(erzeugeZauberstab(zufall, { stufe, seltenheit })),
      ),
    );
    seedFeld.value = String(seed);
    seedAnzeige.textContent = `Seed: ${seed}`;
  };

  wuerfeln.addEventListener('click', () => {
    seed = zufaelligerSeed();
    aktualisieren();
  });
  seedFeld.addEventListener('change', () => {
    const eingabe = Number(seedFeld.value.trim());
    if (Number.isInteger(eingabe) && eingabe >= 0) seed = eingabe >>> 0;
    aktualisieren();
  });
  stufeWahl.addEventListener('change', aktualisieren);
  seltenheitWahl.addEventListener('change', aktualisieren);

  wurzel.append(
    el('h1', { text: 'Inhalte und Zauberstäbe (Aufgabe 1.5)' }),
    el('p', {
      text: 'Gebiet 1 als Daten. Oben der Zauberstab-Generator mit 24 gewürfelten Stäben (der erste Eintrag jeder Karte ist der feste Kerneffekt), darunter Gegner, Zauber und weitere Tabellen.',
    }),
    leiste,
    karten,
    el('h2', { text: 'Gegner' }),
    gegnerTabelle(),
    el('h2', { text: 'Zauber' }),
    zauberTabelle(),
    aufklappbar('Begegnungen', begegnungenTabelle()),
    aufklappbar('Quest „Die unleserliche Schriftrolle“', questTabelle()),
    aufklappbar('Stufen und Fortschritt', stufenTabelle()),
    aufklappbar('Affixe (25 Vorlagen)', affixTabelle()),
  );
  document.body.append(wurzel);
  aktualisieren();
}
