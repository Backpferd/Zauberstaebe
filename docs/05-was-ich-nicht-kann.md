# Was ich übernehmen kann – und was nicht

Du hast angeboten, mir vollen Zugriff auf deinen Rechner, auf ChatGPT und auf
das KDP-Menü über Claude in Chrome zu geben. Das geht in dieser Session **nicht**,
und zwar aus einem technischen Grund, nicht aus Zurückhaltung.

## Wo ich gerade laufe

Diese Session läuft in einem **abgeschotteten Cloud-Container**, nicht auf
deinem Rechner. Ich sehe ausschließlich dieses Git-Repository. Der Container
wird nach der Session gelöscht. Ich habe:

- keinen Zugriff auf deine Dateien, deinen Bildschirm oder deine Zwischenablage
- keinen Browser und keine Verbindung zu „Claude in Chrome" auf deinem Rechner
- keinen Zugang zu ChatGPT oder einem Bildgenerator
- keine Möglichkeit, mich irgendwo einzuloggen

Das ändert sich auch nicht dadurch, dass du mir Zugriff gibst – es ist eine
Eigenschaft dieser Umgebung. Was hilft: **Claude Code lokal auf deinem Rechner**
installieren. Dann sehe ich echte Ordner, kann Dateien schreiben und Programme
starten. Der Browser-Teil bleibt trotzdem separat (siehe unten).

---

## Was vollständig automatisiert ist – hier und jetzt fertig

| Schritt | Status |
| --- | --- |
| Manuskript strukturieren, Seitenaufteilung, Wortzahl-Kontrolle | **fertig** |
| Innenteil-PDF mit korrektem Anschnitt, Bundsteg, Satzspiegel | **fertig** |
| Print-Cover-PDF inkl. Rückenberechnung und Barcode-Freifläche | **fertig** |
| eBook-Cover 1600 × 2560 px | **fertig** |
| EPUB 3, Fixed Layout mit Kindle-Kids-Metadaten | **fertig** |
| Bildprüfung auf 300 dpi je Platzierungsfläche | **fertig** |
| Illustrations-Prompts inkl. Stil-Bibel und Figurenblättern | **fertig** |
| Produktbeschreibung als KDP-taugliches HTML | **fertig** |
| Keywords, Kategorien, Altersangaben, KI-Erklärung | **fertig** |
| Tantiemen- und Mindestpreis-Rechnung | **fertig** |
| Preflight gegen die KDP-Regeln | **fertig** |
| HTML-Vorschau Seite für Seite | **fertig** |

Ergebnis pro Buch: ein `build/`-Ordner, aus dem du direkt hochlädst.

---

## Was ich grundsätzlich nicht kann

### 1. Bilder erzeugen

Ich habe hier kein Bildmodell. Ich schreibe die Prompts, du erzeugst die Bilder.

**Ersatz im Projekt:** `kdp prompts` erzeugt ein vollständiges Briefing –
Stil-Bibel, Figurenblätter, ein Prompt je Seite mit exakter Zielauflösung.
`kdp bauen` setzt so lange druckfähige Platzhalter ein, dass du das komplette
Layout prüfen kannst, bevor du ein einziges Bild generierst.

**Dein Teil:** Prompts in ChatGPT einfügen, Bilder unter den vorgegebenen
Dateinamen in `illustrationen/` ablegen. Etwa 30–60 Minuten pro Buch.

### 2. Mich bei Amazon KDP einloggen und hochladen

Weder Browser noch Zugangsdaten – und selbst mit lokalem Claude Code wäre der
KDP-Upload kein Fall für Automatisierung: Anmeldung mit Zwei-Faktor, das
Steuerinterview, Bankverbindung und die Erklärung „Ich bin Inhaber der
Urheberrechte" sind rechtlich verbindliche Handlungen, die von dir kommen
müssen, nicht von einem Agenten.

**Ersatz im Projekt:** `build/kdp-eingabe.md` – jedes Feld des KDP-Assistenten
in der richtigen Reihenfolge, fertig zum Kopieren. Zusätzlich
`build/kdp-eingabe.json` für den Fall, dass du das später mit Claude in Chrome
ausfüllen lassen willst.

**Dein Teil:** Etwa 20–30 Minuten pro Buch beim ersten Mal, danach 10.

### 3. Prüfen, ob eine Nische schon zu ist

Dafür bräuchte ich Live-Daten von Amazon: aktuelle Bestsellerränge,
Rezensionszahlen, Preise der Konkurrenz. Ich kann dir die Methode geben
(`docs/06-geld-verdienen.md`), aber nicht die Zahlen.

### 4. Die Druckkosten-Tabelle garantieren

`konfig/druckkosten.yaml` enthält Werte, die Amazon gelegentlich ändert. Sie
sind **nicht gegengeprüft**, und jede Kalkulation weist darauf hin. Einmal mit
dem KDP-Rechner abgleichen, dann `stand:` hochsetzen.

Wenn du willst, prüfe ich die Werte in der nächsten Runde gegen die
KDP-Hilfeseiten – dafür brauche ich nur dein Ok.

### 5. Die Druckqualität beurteilen

Farbstich, Papierton, Bindung, wie satt das Nachtblau wirklich kommt – das
sieht man erst am gedruckten Buch. **Bestell immer ein Autorenexemplar**, bevor
du Werbung schaltest.

### 6. Rechts- und Steuerberatung

`docs/07-recht-und-steuern.md` fasst zusammen, worum es geht (Gewerbe,
Steuernummer, GPSR-Kontaktangabe, KI-Offenlegung, Urheberrecht an KI-Bildern).
Das ist eine Orientierung, keine Beratung. Bei den Punkten Gewerbeanmeldung und
Umsatzsteuer lohnt ein Steuerberater – das ist überschaubar teuer und erspart
Ärger.

---

## Was mit lokalem Claude Code dazukäme

Wenn du Claude Code auf deinem Rechner installierst (`npm i -g
@anthropic-ai/claude-code`) und dieses Repository klonst:

- Ich kann Bilder direkt in `illustrationen/` einsortieren und umbenennen
- Ich kann Bilder automatisch hochskalieren, zuschneiden, auf 300 dpi bringen
- Ich kann die PDFs bei dir bauen und du siehst sie sofort
- Ich kann mehrere Bücher in einem Rutsch durchbauen

Was auch dann **nicht** dazukommt: Bildgenerierung und der KDP-Login.

Claude in Chrome ist ein eigenes Produkt, das in deinem Browser läuft. Es kann
dir beim Ausfüllen der KDP-Formulare helfen – aber es ist nicht diese Session
und kann von hier aus nicht gesteuert werden. Die `kdp-eingabe.json` ist genau
dafür gedacht: Du gibst sie Claude in Chrome als Vorlage.

---

## Ehrlicher Aufwand pro Buch

| Schritt | Wer | Zeit |
| --- | --- | --- |
| Story entwickeln und schreiben | du + ich | 2–4 h |
| Layout prüfen (Platzhalter-Build) | ich | 1 min |
| Bilder generieren | du | 30–60 min |
| Bilder einsortieren, neu bauen, prüfen | ich | 5 min |
| Preis und Metadaten | ich | 5 min |
| Upload bei KDP | du | 20–30 min |
| Autorenexemplar prüfen | du | 1 Woche Wartezeit |

Realistisch: **ein Buch pro Woche** bei nebenberuflicher Arbeit, ohne dass die
Qualität leidet.
