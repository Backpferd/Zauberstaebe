# Recht und Steuern (Deutschland)

Orientierung, keine Rechts- oder Steuerberatung. Bei Gewerbeanmeldung und
Umsatzsteuer lohnt einmalig ein Steuerberater.

## Beim ersten Buch zu klären

### Gewerbe

Bücher regelmäßig und mit Gewinnerzielungsabsicht zu verkaufen ist in der Regel
eine gewerbliche Tätigkeit. Als Autor **eigener** Werke kann es freiberuflich
sein; sobald überwiegend KI-generierte Inhalte im Vordergrund stehen, wird das
schnell zum Gewerbe. Das gehört zu den Fragen, die ein Steuerberater in
zwanzig Minuten klärt.

### Steuerinterview bei KDP

KDP fragt beim Konto-Setup nach Steuerdaten. Für deutsche Autoren wichtig: Die
Angaben sorgen dafür, dass **keine 30 % US-Quellensteuer** einbehalten wird
(Doppelbesteuerungsabkommen). Ohne korrektes Interview verlierst du fast ein
Drittel der US-Tantiemen.

### Umsatzsteuer

Bei Kleinunternehmerregelung fällt keine Umsatzsteuer an. Amazon führt die
Umsatzsteuer auf den Verkaufspreis selbst ab; du bekommst die Tantieme. Auf
Bücher gilt in Deutschland der ermäßigte Satz von 7 % – die Kalkulation in
diesem Projekt rechnet damit.

## GPSR – seit 13.12.2024 Pflicht

Die EU-Produktsicherheitsverordnung verlangt für jedes in der EU verkaufte
Produkt eine **benannte verantwortliche Person mit Kontaktadresse**. Das gilt
auch für Bücher. Ohne diese Angabe blendet Amazon das Buch in der EU aus.

Im Projekt: `buch.yaml` → `impressum.verantwortlich`. Der Wert landet auf der
Impressumsseite im Buch und im Eingabeblatt. Die Angabe muss zusätzlich im
KDP-Formular gemacht werden.

Eine ladungsfähige Adresse ist nötig – ein Postfach reicht nicht. Wer die
private Adresse nicht im Buch haben will, nutzt einen Impressumsservice.

## KI-Offenlegung bei KDP – Pflichtfeld

KDP fragt beim Upload getrennt nach **Text**, **Bildern** und **Übersetzung**,
ob KI-generierte Inhalte enthalten sind. Unterschieden wird:

- **KI-generiert**: von KI erzeugt, auch wenn du es danach bearbeitet hast
- **KI-unterstützt**: du hast es erstellt, KI hat beim Überarbeiten geholfen

Bei KI-generierten Illustrationen lautet die Antwort **KI-generiert** – auch
wenn du Auswahl und Nachbearbeitung gemacht hast. Falsche Angaben verstoßen
gegen die KDP-Bedingungen und können zur Kontosperrung führen. Die Angabe ist
intern und erscheint nicht auf der Produktseite.

Im Projekt: `buch.yaml` → `ki_einsatz`. Das Eingabeblatt zeigt die Antworten
als Tabelle.

## Urheberrecht an KI-Bildern

Nach derzeitigem Stand in Deutschland und den USA entsteht an rein
KI-generierten Bildern **kein Urheberrecht** – es fehlt die menschliche
Schöpfungshöhe. Praktisch heißt das:

- Du darfst die Bilder im Buch verwenden und verkaufen.
- Du kannst niemandem verbieten, dieselben oder sehr ähnliche Bilder zu nutzen.
- Am **Text** hast du volles Urheberrecht, sofern du ihn geschrieben hast.

Für ein POD-Kinderbuch ist das meist verkraftbar. Wer eine Marke aufbauen will,
sollte über eigene oder beauftragte Illustrationen nachdenken.

Prüfe außerdem die Nutzungsbedingungen des Bildgenerators – die kommerzielle
Nutzung ist bei den großen Anbietern erlaubt, hängt aber teilweise am Abo-Typ.

## Was im Prompt nichts zu suchen hat

- Namen lebender Künstler oder Illustratoren („im Stil von …")
- Geschützte Figuren und Marken (Disney, Harry Potter, Paw Patrol …)
- Erkennbare reale Personen

Das ist der schnellste Weg zu einer Beschwerde und zur Sperrung des Kontos.

## ISBN

KDP stellt eine kostenlose ISBN, dann steht „Independently published" als
Verlag. Eigene ISBNs gibt es in Deutschland über die MVB – kostenpflichtig,
aber dann steht dein Verlagsname drin und die ISBN gilt bei jedem Händler.

Für den Anfang: kostenlose KDP-ISBN. Taschenbuch und eBook brauchen getrennte
ISBNs; das eBook braucht bei KDP gar keine.

## Pflichtexemplare

Bei einer eigenen ISBN mit deutschem Verlagsnamen entsteht eine
Ablieferungspflicht an die Deutsche Nationalbibliothek. Bei der kostenlosen
KDP-ISBN („Independently published") entfällt das in der Regel.
