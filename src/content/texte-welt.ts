/**
 * Texte zu Welt und Ablauf von Gebiet 1 (Aufgabe 1.5): Einstieg, Steuerung,
 * Schriftrolle, Quest, Gebiet und Orte, Wegweiser, Sperren, Lagerfeuer, Truhe,
 * Endbildschirm und Tod.
 *
 * Wird in `texte.ts` eingebunden. Schlüsselpräfixe: `einstieg.`, `steuerung.`,
 * `schriftrolle.`, `quest.`, `gebiet.`, `ort.`, `wegweiser.`, `sperre.`,
 * `interaktion.`, `lagerfeuer.`, `truhe.`, `ende.`, `tod.`.
 *
 * Ton: rau, direkt, kein Kitsch (Gothic).
 */
export const texteWelt = {
  // Einstieg
  'einstieg.1':
    'Du erwachst im Zwielicht. Das Lagerfeuer ist zu einem Glutbett heruntergebrannt, und irgendwo im Wald heult ein Wolf.',
  'einstieg.2':
    'Dein Schädel brummt. Du weißt nur noch, dass du nach Erlengrund wolltest. Dann kam die Schlucht, und dann kam nichts mehr.',
  'einstieg.3': 'Neben dem Feuer liegt etwas, das nicht dir gehört.',
  'einstieg.weiter': 'Weiter',

  // Steuerungshinweise
  'steuerung.titel': 'Steuerung',
  'steuerung.laufen': 'Mit W, A, S und D läufst du.',
  'steuerung.zielen': 'Die Maus bestimmt, wohin du zielst.',
  'steuerung.feuerball': 'Linke Maustaste: Feuerball.',
  'steuerung.frostnova': 'Rechte Maustaste: Frostnova.',
  'steuerung.ausweichen': 'Leertaste: Ausweichrolle.',
  'steuerung.interagieren': 'E: aufheben, lesen, öffnen.',
  'steuerung.traenke': '1 und 2: Heil- und Manatrank.',
  'steuerung.pause': 'Esc: Pause und Menü.',

  // Schriftrolle (Pergament mit Runen, die niemand lesen kann)
  'schriftrolle.titel': 'Alte Schriftrolle',
  'schriftrolle.runen.1': 'ᚠᚢᚦᚨᚱᚲ ᚷᚹᚺᚾᛁ ᛃᛇᛈᛉ',
  'schriftrolle.runen.2': 'ᛊᛏᛒᛖᛗ ᛚᛜᛞᛟ ᚠᚱ ᚲᚨ',
  'schriftrolle.runen.3': 'ᚦᚢᚱᛁᛋ ᚨᛚ ᚷᛖᛟ ᛈᚹᛏ',
  'schriftrolle.runen.4': 'ᛗᛖᚾ ᚲᚨᛉ ᚢᛊ ᚺᛃᛒ ᛞᛟ',
  'schriftrolle.runen.5': 'ᚱᚨᚾ ᛁᛚᛜ ᚦᛖ ᛊᚲᚹ',
  'schriftrolle.runen.6': 'ᛟᛞᛗ ᚾᚢᛏ ᚠᛖᚱᛈ',
  'schriftrolle.hinweis':
    'Du kannst die Zeichen nicht deuten. Nur einzelne glimmen schwach, als würden sie auf etwas warten.',
  'schriftrolle.nach-boss':
    'Eine der Runen glimmt jetzt hell. Mehr kannst du noch nicht entziffern.',
  'schriftrolle.knopf': 'Einstecken',

  // Quest „Die unleserliche Schriftrolle“
  'quest.schriftrolle.titel': 'Die unleserliche Schriftrolle',
  'quest.schriftrolle.beschreibung':
    'Neben dem Lagerfeuer lag eine alte Schriftrolle voller fremder Zeichen. Du kannst sie nicht lesen. Vielleicht kann es jemand im Dorf.',
  'quest.schriftrolle.schritt.wegekreuz.vorher':
    'Finde jemanden, der die alte Schrift entziffern kann – vielleicht im Dorf. Der Weg beginnt am Wegekreuz.',
  'quest.schriftrolle.schritt.wegekreuz.nachher': 'Das Wegekreuz. Drei Wege, drei Schilder.',
  'quest.schriftrolle.schritt.wegweiser.vorher': 'Lies den Wegweiser am Wegekreuz.',
  'quest.schriftrolle.schritt.wegweiser.nachher':
    'Die Brücke nach Erlengrund ist eingestürzt, der Pass verschüttet. Bleibt nur der Wald.',
  'quest.schriftrolle.schritt.umweg.vorher': 'Nimm den Umweg durch den Wald.',
  'quest.schriftrolle.schritt.umweg.nachher':
    'Der Waldweg ist nicht leer. Wölfe haben deine Witterung.',
  'quest.schriftrolle.schritt.waldrand.vorher': 'Kämpfe dich durch Wildholz bis zur Lichtung.',
  'quest.schriftrolle.schritt.waldrand.nachher':
    'Die Lichtung liegt vor dir. Hier hört das Heulen nicht auf.',
  'quest.schriftrolle.schritt.grimmzahn.vorher': 'Besiege Grimmzahn, den Rudelführer.',
  'quest.schriftrolle.schritt.grimmzahn.nachher':
    'Grimmzahn ist gefallen. Auf der Schriftrolle glimmt eine Rune auf.',
  'quest.schriftrolle.abschluss':
    'Eine Rune ist erwacht. Wer die Schrift lesen kann, wartet in Erlengrund.',

  // Gebiet und Regionen
  'gebiet.wildholz.name': 'Wildholz',
  'gebiet.wildholz.beschreibung':
    'Ein dichter Wald aus Eichen und Kiefern. Seit dem Frühjahr heulen die Wölfe hier lauter als sonst.',
  'gebiet.erlengrund.name': 'Erlengrund',
  'gebiet.erlengrund.beschreibung':
    'Das Dorf hinter der Schlucht. Erreichbar nur über die Brücke, und die liegt in Trümmern.',
  'gebiet.grauzahn-pass.name': 'Grauzahn-Pass',
  'gebiet.grauzahn-pass.beschreibung':
    'Der Pfad über die Berge. Ein Erdrutsch hat ihn unter Geröll begraben.',

  // Orte
  'ort.start.name': 'Das Lager',
  'ort.start.beschreibung': 'Dein Schlafplatz zwischen Zelt und Feuer.',
  'ort.lagerfeuer.name': 'Lagerfeuer',
  'ort.lagerfeuer.beschreibung':
    'Die Glut brennt noch. Wer hier rastet, kommt gestärkt auf die Beine.',
  'ort.zelt.name': 'Zelt',
  'ort.zelt.beschreibung': 'Ein geflicktes Zelt. Der Rucksack daneben ist leer bis auf Krümel.',
  'ort.schriftrolle.name': 'Alte Schriftrolle',
  'ort.schriftrolle.beschreibung':
    'Vergilbt, am Rand angesengt und voller Runen, die du noch nie gesehen hast.',
  'ort.wegekreuz.name': 'Wegekreuz',
  'ort.wegekreuz.beschreibung': 'Hier teilt sich der Weg in drei. Moos wächst auf dem Stein.',
  'ort.wegweiser.name': 'Wegweiser',
  'ort.wegweiser.beschreibung': 'Drei Arme aus verwittertem Holz zeigen in drei Richtungen.',
  'ort.bruecke.name': 'Eingestürzte Brücke',
  'ort.bruecke.beschreibung': 'Von der Brücke über die Schlucht stehen nur noch zwei Pfeiler.',
  'ort.erdrutsch.name': 'Erdrutsch',
  'ort.erdrutsch.beschreibung': 'Geröll und entwurzelte Bäume begraben den Pass.',
  'ort.kampf1.name': 'Waldweg',
  'ort.kampf1.beschreibung': 'Der Pfad verengt sich zwischen den Stämmen. Im Gras liegen Knochen.',
  'ort.kampf2.name': 'Nebelsenke',
  'ort.kampf2.beschreibung':
    'Kalter Dunst hängt zwischen den Bäumen. Irgendwo schimmert ein Licht.',
  'ort.kampf3.name': 'Alte Ruine',
  'ort.kampf3.beschreibung': 'Verfallene Mauern unter Efeu. Das Rudel hat sich hier eingenistet.',
  'ort.truhe.name': 'Truhe',
  'ort.truhe.beschreibung':
    'Eine eisenbeschlagene Truhe zwischen den Trümmern. Das Schloss ist längst verrostet.',
  'ort.arena-eingang.name': 'Dornenpforte',
  'ort.arena-eingang.beschreibung': 'Der Weg zur Lichtung. Dahinter wuchert Dorngestrüpp.',
  'ort.bosslichtung.name': 'Grimmzahns Lichtung',
  'ort.bosslichtung.beschreibung':
    'Ein Kreis aus zertrampeltem Gras, von Dornen gesäumt. Hier hat das Rudel sein Lager.',

  // Hinweise zum Interagieren (E)
  'interaktion.lagerfeuer.hinweis': 'Am Feuer rasten',
  'interaktion.schriftrolle.hinweis': 'Schriftrolle aufheben',
  'interaktion.schriftrolle.aufgehoben': 'Du hebst die Schriftrolle auf.',
  'interaktion.wegweiser.hinweis': 'Wegweiser lesen',
  'interaktion.truhe.hinweis': 'Truhe öffnen',

  // Wegweiser mit Sperrgründen
  'wegweiser.titel': 'Wegweiser',
  'wegweiser.dorf.name': 'Erlengrund',
  'wegweiser.dorf.schild': 'Erlengrund',
  'wegweiser.dorf.gesperrt':
    'Die Brücke über die Schlucht ist eingestürzt. Ein Schild daneben rät: „Umweg durch den Wald“.',
  'wegweiser.berge.name': 'Grauzahn-Pass',
  'wegweiser.berge.schild': 'Grauzahn-Pass',
  'wegweiser.berge.gesperrt': 'Ein Erdrutsch versperrt den Pass. Dort geht vorerst nichts.',
  'wegweiser.wald.name': 'Wildholz',
  'wegweiser.wald.schild': 'Wildholz – Umweg',
  'wegweiser.wald.offen': 'Der Waldweg ist frei. Aus der Tiefe des Waldes dringt Heulen.',

  // Versperrte Wege, wenn man dagegenläuft
  'sperre.bruecke': 'Die Brücke ist eingestürzt. Hier kommst du nicht hinüber.',
  'sperre.erdrutsch': 'Geröll versperrt den Pass. Ohne Hilfe kommst du hier nicht durch.',
  'sperre.arena': 'Dornenranken versperren den Rückweg. Erst muss der Rudelführer fallen.',

  // Lagerfeuer und Truhe
  'lagerfeuer.rast': 'Du rastest am Feuer. Leben und Mana sind wieder voll.',
  'lagerfeuer.gespeichert':
    'Der Spielstand ist gesichert. Hier erwachst du wieder, wenn du fällst.',
  'truhe.geoeffnet': 'Das Schloss bricht. In der Truhe liegt ein Zauberstab.',
  'truhe.leer': 'Die Truhe ist leer.',

  // Endbildschirm
  'ende.titel': 'Ende des Testlaufs',
  'ende.fortsetzung': 'Fortsetzung: Das Dorf',
  'ende.zeile': 'Ende des Testlaufs – Fortsetzung: Das Dorf',
  'ende.text':
    'Du hast Grimmzahn bezwungen und Wildholz überlebt. Die Schriftrolle glimmt, und hinter dem Wald wartet Erlengrund.',
  'ende.feedback': 'Rückmeldung geben',
  'ende.neustart': 'Noch einmal spielen',

  // Tod
  'tod.titel': 'Du bist gefallen',
  'tod.text': 'Dunkelheit. Dann Wärme: Das Lagerfeuer holt dich zurück.',
  'tod.knopf': 'Am Lagerfeuer erwachen',
} as const satisfies Record<string, string>;
