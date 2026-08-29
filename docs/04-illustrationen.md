# Illustrationen: 26 Bilder, auf denen dieselbe Figur dieselbe bleibt

Ein hübsches Einzelbild bekommt jeder hin. Das Problem bei KI-illustrierten
Kinderbüchern ist die **Konsistenz**: Auf Seite 3 hat Mira Zöpfe, auf Seite 11
offene Haare, auf Seite 19 ist sie plötzlich zehn. Für Käufer ist das der
sichtbarste Unterschied zwischen einem echten Buch und einem lieblosen
KI-Produkt – und der häufigste Grund für Ein-Stern-Rezensionen.

## Was dagegen hilft

### 1. Stil-Bibel – ein Textblock, wortgleich in jedem Prompt

`kdp prompts` baut ihn aus `buch.yaml` → `illustration.stil`. Sechs Achsen:
Technik, Linienführung, Palette, Licht, Stimmung, Perspektive. Nicht
umformulieren, nicht kürzen, nicht „variieren".

### 2. Figurenblätter zuerst

Für jede Figur ein Character Sheet: eine Figur, fünf Ansichten, neutraler
Hintergrund. Das Blatt wird ab dann als **Referenzbild an jeden Seitenprompt
angehängt**. Ohne Referenzbild würfelt jeder Generator die Figur neu.

In `buch.yaml` bekommt jede Figur ein `merkmal` – ein einzelnes, hartes Detail
(„grünes Haarband am linken Zopf", „Bleistift hinter dem rechten Ohr").
Solche Anker halten wesentlich besser als Beschreibungen wie „freundlich".

### 3. Im selben Chat bleiben

Bei ChatGPT hält der Bildkontext innerhalb einer Unterhaltung die Figur
erstaunlich stabil. Ein neuer Chat = eine neue Figur. Wenn ein Bild missrät:
im selben Chat nachbessern („gleiche Figur, gleiche Kleidung, andere Pose"),
nicht neu anfangen.

### 4. Das richtige Seitenverhältnis anfordern

Jeder Prompt im Briefing nennt Verhältnis **und** Zielauflösung in Pixeln. Wird
das Bild im falschen Verhältnis erzeugt, schneidet der Builder mittig zu – und
dann fehlen Köpfe. Lieber im richtigen Verhältnis generieren und notfalls
hochskalieren.

## Auflösung – die harte Grenze

KDP verlangt 300 dpi **auf der Fläche, auf der das Bild landet**. Bei einem
randabfallenden Bild auf 8,5 × 8,5" sind das **2587 × 2625 px**. Die meisten
Bildgeneratoren liefern 1024 × 1024 oder 1536 × 1536 – das reicht **nicht**.

Drei Auswege:

1. Die Upscale-/HD-Funktion des Generators nutzen (ChatGPT, Midjourney und
   Co. bieten das).
2. Separat hochskalieren – z. B. mit einem KI-Upscaler. Reines Vergrößern in
   einem Bildprogramm hilft nicht: es erzeugt Pixel, aber keine Details.
3. Layout ändern: `bild-oben`/`bild-unten` statt `bild-ganzseitig`. Die
   Bildfläche ist dann kleiner, die geforderte Pixelzahl niedriger
   (2272 × 1376 statt 2587 × 2625).

`kdp pruefen` rechnet das für jedes Bild aus und nennt die benötigte Pixelzahl,
falls es nicht reicht.

## Text gehört nicht ins Bild

Alle Prompts enthalten „kein Text, keine Buchstaben, keine Schrift". Grund:
Bildgeneratoren schreiben unzuverlässig, und der Text muss ohnehin aus dem
Manuskript kommen – sonst kann man ihn nicht korrigieren, nicht übersetzen und
das eBook nicht vorlesen lassen.

## Platz für den Text freihalten

Bei `bild-ganzseitig` liegt der Text in einem halbtransparenten Band auf dem
Bild. Der Prompt fordert deshalb „im unteren Drittel ruhige, kontrastarme
Fläche". Ein Gesicht genau dort ist ärgerlich, weil das Band es verdeckt.

## Cover

Das Cover verkauft das Buch, nicht der Text. Drei Dinge entscheiden:

- **Erkennbar als Daumennagel bei 200 px Breite.** Wenn man bei dieser Größe
  nicht sieht, was passiert, ist das Cover falsch.
- **Ruhige Zonen oben und unten** für Titel und Autorenname – der Prompt
  fordert das explizit.
- **Eine Figur, ein Blick, eine Handlung.** Wimmelbilder funktionieren auf
  Cover-Daumennägeln nicht.

Auf der Rückseite bleibt unten rechts ein Feld von etwa 5 × 3 cm frei – dort
druckt Amazon den Barcode. `kdp cover` legt es automatisch weiß an.

## Rechtliches zu KI-Bildern

Kurz und unangenehm: Nach derzeitigem Stand in Deutschland und den USA sind
rein KI-generierte Bilder **nicht** urheberrechtlich geschützt. Du darfst sie
im Buch verwenden und verkaufen, aber du kannst niemandem verbieten, dieselben
Bilder zu nutzen. Für ein POD-Kinderbuch ist das meist verschmerzbar, für einen
Markenaufbau nicht. Mehr in `docs/07-recht-und-steuern.md`.

**Nie** einen lebenden Illustrator oder eine geschützte Marke im Prompt
nennen („im Stil von …"). Das ist der schnellste Weg zu einer Beschwerde und
zur Sperrung des KDP-Kontos.
