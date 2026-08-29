# Geld verdienen mit Print-on-Demand-Kinderbüchern

Der ehrliche Teil zuerst, weil er die Entscheidungen im Rest bestimmt.

## Wie der Markt aussieht

Kinderbücher sind die am stärksten überfüllte Kategorie bei KDP. Der Grund ist
banal: wenig Text, kein Fachwissen nötig, seit KI-Bildgeneratoren auch keine
Illustrationskosten. Entsprechend fluten sehr viele sehr ähnliche Bücher den
Markt.

Was daraus folgt:

- Ein durchschnittliches Kinderbuch ohne Werbung verkauft sich **einstellig pro
  Monat**. Nicht hundert Exemplare, nicht fünfzig.
- Titel, die laufen, laufen fast immer wegen **Cover und Nische**, nicht wegen
  der Textqualität. Bitter, aber so ist es.
- Einzelne Bücher tragen selten. Es funktioniert als **Katalog**: 10–20 Titel,
  von denen zwei oder drei den Rest mitfinanzieren.
- Die ersten Monate sind ein Zuschussgeschäft. Wer nach drei Büchern aufhört,
  weil nichts passiert, hat den üblichen Verlauf erlebt, nicht Pech gehabt.

Das ist kein Grund, es zu lassen – aber ein guter Grund, die Kalkulation ernst
zu nehmen, statt auf Volumen zu hoffen.

## Die Kalkulation

```bash
python3 tools/kdp kalkulation zauberstab-der-nicht-zaubern-wollte
```

Bei einem 32-seitigen Bilderbuch in Premiumfarbe (Werte aus
`konfig/druckkosten.yaml`, Stand ungeprüft):

| Listenpreis DE | netto | Druck | Tantieme | Marge |
| --- | --- | --- | --- | --- |
| 9,99 € | 9,34 € | 2,84 € | **2,76 €** | 27,6 % |
| 12,99 € | 12,14 € | 2,84 € | **4,44 €** | 34,2 % |
| 14,99 € | 14,01 € | 2,84 € | **5,57 €** | 37,2 % |
| 18,99 € | 17,75 € | 2,84 € | **7,81 €** | 41,1 % |

Die Formel dahinter:

```
Tantieme = (Listenpreis / 1,07) × 0,60 − Druckkosten
```

Drei Dinge, die daraus folgen:

**1. Farbdruck zwingt zu höheren Preisen.** Unter etwa 11 € bleibt bei einem
farbigen Bilderbuch fast nichts übrig. Wer aus Angst vor der Konkurrenz auf
8,99 € geht, arbeitet umsonst.

**2. Jede Seite kostet.** Premiumfarbe kostet ca. 7 Cent pro Seite. Von 32 auf
40 Seiten sind 0,56 € weniger Tantieme – pro verkauftem Exemplar, für immer.
32 Seiten sind bei Bilderbüchern nicht nur Konvention, sondern die
wirtschaftlich sinnvolle Größe.

**3. Das eBook ist die bessere Marge, aber der kleinere Markt.** 4,99 € eBook
bringt 3,26 € – fast so viel wie das Taschenbuch für 12,99 €, ohne Druckkosten.
Nur: Bilderbücher werden überwiegend als Geschenk gekauft, und ein Geschenk ist
ein physisches Buch. Beides anbieten, Erwartung aufs Taschenbuch legen.

### Mindestpreise

```
Mindestpreis für 2,00 € Tantieme: 8,64 €
Mindestpreis für 3,00 € Tantieme: 10,42 €
```

Alles darunter lohnt sich nicht, sobald du auch nur einen Euro Werbung
ausgibst.

## Was tatsächlich über Erfolg entscheidet

### 1. Nische statt Thema

„Kinderbuch über Mut" ist keine Nische, sondern eine Kategorie mit zehntausend
Titeln. Nischen sind spezifisch und haben eine Kaufsituation:

- Buch für Kinder, deren Geschwisterkind gerade geboren wird
- Buch zum ersten Kita-Tag
- Buch über einen Umzug
- Buch über ein Haustier, das gestorben ist
- Buch für Kinder mit Brille / Hörgerät / Diabetes
- Regionale Nischen: eine Geschichte, die im Harz spielt, auf Norderney, im
  Ruhrgebiet

Der gemeinsame Nenner: **Es gibt einen konkreten Anlass, an dem ein Erwachsener
gezielt danach sucht.** Genau diese Suchen fängst du mit Untertitel und
Keywords ab.

### 2. Nachfrage prüfen, bevor du schreibst

Das kann ich dir nicht abnehmen – es braucht Live-Daten. Die Methode:

1. Auf amazon.de nach dem Suchbegriff suchen, den ein Käufer eingeben würde.
2. Die ersten zehn Treffer ansehen: Wie alt sind sie? Wie viele Rezensionen?
   Wie sehen die Cover aus?
3. Bestsellerrang der Nummer 5 notieren. Grobe Orientierung: Rang unter 50.000
   = die Nische bewegt sich. Rang über 300.000 = tot.
4. **Die entscheidende Frage:** Sehen die Top-Titel schlecht aus? Wenn ja, ist
   Platz. Wenn alle zehn professionell illustriert sind, such eine andere Nische.

### 3. Cover

Das Cover ist der einzige Grund, warum jemand klickt. Prüfe es so: Auf
200 px Breite skalieren und aus zwei Metern Entfernung ansehen. Erkennst du,
worum es geht? Wenn nein, ist es falsch – egal wie schön es in groß aussieht.

### 4. Untertitel und Keywords

Der Titel darf poetisch sein. Der **Untertitel muss die Suchbegriffe enthalten**:

> „Der Zauberstab, der nicht zaubern wollte – **Eine Vorlesegeschichte über
> Mut, Geduld und den eigenen Weg**"

Da stecken „Vorlesegeschichte", „Mut", „Geduld" drin. Das sind Wörter, die
Eltern tatsächlich eingeben.

Die sieben Keyword-Felder sind keine Einzelwörter, sondern **Suchphrasen**:
„Kinderbuch ab 4 Jahren zum Vorlesen" ist ein Feld, nicht vier.

### 5. Reihen

Wer Band 1 mag, kauft Band 2. Eine Reihe mit vier Bänden verkauft mehr als vier
Einzeltitel – bei gleichem Aufwand. `buch.yaml` hat dafür `reihe` und
`reihennummer`; das EPUB trägt es korrekt als `belongs-to-collection` ein.

### 6. Beide Ausgaben verknüpfen

Taschenbuch und eBook müssen auf **einer** Produktseite landen. Sonst
verteilen sich Rezensionen und Ranking auf zwei Einträge.

## Werbung

Amazon Ads sind der einzige Hebel, der bei einem neuen Titel überhaupt
funktioniert. Aber: Bei 4,44 € Tantieme darf ein Verkauf höchstens ~1,50 €
Werbung kosten, damit es sich lohnt. Klickpreise in Kinderbuch-Kategorien
liegen oft bei 0,20–0,40 €, und es braucht schnell zehn Klicks pro Verkauf.
Das ist knapp. Erst starten, wenn das Buch organisch schon ein paar Verkäufe
hat – sonst verbrennt man Geld für ein Cover, das ohnehin nicht klickt.

## Ein realistischer Plan für zwölf Monate

| Monat | Ziel |
| --- | --- |
| 1 | Ein Buch komplett durchziehen, inklusive Autorenexemplar. Ziel ist der gelernte Ablauf, nicht der Umsatz. |
| 2–3 | Zwei bis drei weitere Titel, davon zwei in derselben Nische als Reihe. |
| 4–6 | Auf 8–10 Titel gehen. Erste Zahlen ansehen: welcher Titel bewegt sich, warum? |
| 7–9 | Den besten Titel ausbauen: Cover überarbeiten, Keywords nachschärfen, Reihe fortsetzen. |
| 10–12 | 15–20 Titel. Jetzt erst Werbung, und nur auf die zwei bis drei Titel, die organisch laufen. |

Was du nach zwölf Monaten realistisch erwarten kannst, hängt fast vollständig
von der Nischenwahl ab – nicht von der Anzahl der Bücher. Zwanzig Titel in
überfüllten Nischen bringen weniger als drei Titel in einer, in der gesucht und
nichts Gutes gefunden wird.
