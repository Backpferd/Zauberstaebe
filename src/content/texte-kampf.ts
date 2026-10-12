/**
 * Texte zu Kampf und Beute (Aufgabe 1.5): Zauber, Gegner, Boss, Begegnungen,
 * Tränke und sonstige Gegenstände.
 *
 * Wird in `texte.ts` eingebunden. Schlüsselpräfixe: `zauber.`, `gegner.`, `boss.`,
 * `begegnung.`, `trank.`, `gegenstand.`.
 */
export const texteKampf = {
  // Zauber
  'zauber.feuerball.name': 'Feuerball',
  'zauber.feuerball.beschreibung':
    'Schleudert einen Feuerball zum Zielpunkt. Beim Aufprall explodiert er und setzt Getroffene in Brand.',
  'zauber.frostnova.name': 'Frostnova',
  'zauber.frostnova.beschreibung':
    'Eine Welle aus Frost bricht rings um dich aus, verletzt alle in der Nähe und friert sie für kurze Zeit fest.',
  'zauber.ausweichrolle.name': 'Ausweichrolle',
  'zauber.ausweichrolle.beschreibung':
    'Eine schnelle Rolle in Laufrichtung. Während du abrollst, kann dich nichts treffen.',

  // Gegner
  'gegner.wolf.name': 'Wolf',
  'gegner.wolf.beschreibung':
    'Hungrig und schnell. Wölfe jagen im Rudel und kreisen ihre Beute ein, bevor sie zubeißen.',
  'gegner.warg.name': 'Warg',
  'gegner.warg.beschreibung':
    'Ein Wolf von der Größe eines Kalbs. Er duckt sich kurz und stürmt dann mit voller Wucht heran.',
  'gegner.irrlicht.name': 'Irrlicht',
  'gegner.irrlicht.beschreibung':
    'Ein kaltes Licht über dem Moor. Es hält Abstand und schleudert Funken aus der Ferne.',
  'gegner.grimmzahn.name': 'Grimmzahn',
  'gegner.grimmzahn.titel': 'der Rudelführer',
  'gegner.grimmzahn.beschreibung':
    'Der Leitwolf von Wildholz. Das Rudel gehorcht seinem Ruf, und wer seinen Zähnen zu nahe kommt, bleibt nicht lange stehen.',

  // Bossangriffe und Meldungen
  'boss.prankenhieb.name': 'Prankenhieb',
  'boss.sprungangriff.name': 'Sprungangriff',
  'boss.rudelruf.name': 'Rudelruf',
  'boss.rudelruf.meldung': 'Grimmzahn heult. Das Rudel antwortet.',
  'boss.raserei.name': 'Raserei',
  'boss.raserei.meldung': 'Grimmzahn verfällt in Raserei.',
  'boss.besiegt': 'Grimmzahn ist gefallen.',

  // Begegnungen: Name des Orts und ein Tipp für den Spieler
  'begegnung.kampf1.name': 'Wölfe am Waldweg',
  'begegnung.kampf1.hinweis':
    'Zwei Wölfe haben deine Witterung. Ziele mit der Maus und halte die linke Maustaste für Feuerbälle.',
  'begegnung.kampf2.name': 'Das Irrlicht im Nebel',
  'begegnung.kampf2.hinweis':
    'Das Irrlicht schießt aus der Ferne. Weiche mit der Leertaste aus und halte die Wölfe mit der Frostnova auf Abstand.',
  'begegnung.kampf3.name': 'Das Rudel an der Ruine',
  'begegnung.kampf3.hinweis':
    'Ein ganzes Rudel und ein Warg. Duckt er sich, stürmt er gleich los: Dann ausweichen. Die Truhe bei der Ruine lohnt sich.',
  'begegnung.boss.name': 'Grimmzahn, der Rudelführer',
  'begegnung.boss.hinweis':
    'Achte auf die roten Markierungen am Boden. Wo sie erscheinen, schlägt er gleich zu.',

  // Tränke
  'trank.leben.name': 'Heiltrank',
  'trank.leben.beschreibung':
    'Ein bitterer Absud aus Wurzeln und Harz. Stellt sofort Leben wieder her.',
  'trank.mana.name': 'Manatrank',
  'trank.mana.beschreibung':
    'Schimmert bläulich und schmeckt nach Eisen. Stellt sofort Mana wieder her.',

  // Sonstige Gegenstände
  'gegenstand.gold.name': 'Gold',
  'gegenstand.wargzahn.name': 'Wargzahn',
  'gegenstand.wargzahn.beschreibung':
    'Ein gelber Fangzahn, lang wie ein Finger. Jäger zahlen gut dafür.',
} as const satisfies Record<string, string>;
