# Kinderbuch-Werkstatt für Amazon KDP

Ein Projekt, das Kinderbücher schreibt, illustrieren lässt und **druckfertig
für Amazon KDP** ausgibt: Innenteil-PDF, Print-Cover-PDF, EPUB, eBook-Cover,
Produktbeschreibung und Preiskalkulation – aus einer einzigen Textdatei plus
einer Konfiguration.

```bash
python3 tools/kdp bauen zauberstab-der-nicht-zaubern-wollte
```

Ergebnis: ein `build/`-Ordner, aus dem direkt hochgeladen wird.

---

## Schnellstart

```bash
pip install -r requirements.txt

python3 tools/kdp liste                                   # was da ist
python3 tools/kdp bauen zauberstab-der-nicht-zaubern-wollte   # Beispielbuch bauen
python3 tools/kdp neu mein-buch                           # eigenes Buch anlegen
```

Danach `buecher/mein-buch/buch.yaml` ausfüllen und `manuskript.md` schreiben.
Der komplette Ablauf steht in **[docs/01-workflow.md](docs/01-workflow.md)**.

---

## Was im Karton ist

```
tools/kdp                 Kommandozeile
tools/kdpstudio/          das Werkzeug
  spezifikation.py        KDP-Maße: Anschnitt, Bundsteg, Rücken, Cover
  modelle.py              buch.yaml einlesen
  manuskript.py           Manuskript-Parser
  interior.py             Innenteil-PDF
  cover.py                Print-Cover-PDF + eBook-Cover
  epub.py                 EPUB 3, Fixed Layout und Reflowable
  bilder.py               Bildprüfung, 300-dpi-Kontrolle, Platzhalter
  illustration.py         Prompt-Briefing für die Bildgenerierung
  metadaten.py            KDP-Eingabeblatt, Beschreibung, JSON
  kalkulation.py          Druckkosten, Tantiemen, Mindestpreise
  pruefung.py             Preflight gegen die KDP-Regeln

buecher/<slug>/
  buch.yaml               alles über das Buch
  manuskript.md           der Text
  illustrationen/         die Bilder + generiertes prompts.md
  build/                  die Upload-Dateien

vorlage/                  Grundgerüst für neue Bücher
konfig/druckkosten.yaml   Druckkosten und Tantiemensätze
docs/                     Ablauf, Spezifikationen, Recht, Kalkulation
```

---

## Der Ablauf in einem Bild

```
buch.yaml ──┐
            ├──> kdp prompts ──> illustrationen/prompts.md ──> [ChatGPT: Bilder]
manuskript ─┘                                                        │
            ┌────────────────────────────────────────────────────────┘
            v
   illustrationen/*.png
            │
            v
      kdp bauen ──┬──> <slug>-innenteil.pdf     ──> KDP Taschenbuch: Manuskript
                  ├──> <slug>-cover.pdf         ──> KDP Taschenbuch: Cover
                  ├──> <slug>.epub              ──> KDP eBook: Manuskript
                  ├──> <slug>-ebook-cover.jpg   ──> KDP eBook: Cover
                  ├──> kdp-eingabe.md           ──> alle Formularfelder
                  ├──> beschreibung.html        ──> Feld "Beschreibung"
                  └──> vorschau.html            ──> Kontrolle im Browser
```

Der Trick daran: **`kdp bauen` läuft auch ohne fertige Illustrationen.** Es
setzt druckfähige Platzhalter ein, die Format und Auflösung anzeigen. So prüft
man das ganze Layout, bevor auch nur ein Bild generiert wird.

---

## Was das Werkzeug automatisch richtig macht

Das sind die Punkte, an denen KDP-Uploads üblicherweise scheitern:

- **Anschnitt** nur an Ober-, Unter- und Außenkante, nie am Bund
  (8,5 × 8,5" → Dokument 8,625 × 8,75")
- **Bundsteg** nach der KDP-Seitenzahl-Staffel, seitenweise wechselnd
- **Rückenbreite** aus Seitenzahl × Papierfaktor
  (32 Seiten Premiumfarbe → 1,9 mm) und Rückentext erst ab 79 Seiten
- **Gesamtcover** als eine PDF-Seite mit freigehaltener Barcode-Fläche
- **300 dpi** – geprüft auf der tatsächlichen Platzierungsfläche, nicht am
  nackten Bild; die Fehlermeldung nennt die benötigte Pixelzahl
- **gerade Seitenzahl**, Mindestumfang 24, automatisch aufgefüllt
- **EPUB 3 Fixed Layout** mit den Kindle-Kids-Metadaten, ohne die Amazon das
  Layout auflöst
- **Beschreibung** nur mit den von KDP erlaubten HTML-Tags, Längenprüfung
  inklusive Tags
- **Keywords**: 7 Felder, 50 Zeichen, Warnung bei Wortdopplung und bei von
  Amazon verbotenen Werbebegriffen
- **GPSR-Kontaktangabe** und **KI-Offenlegung** – beides seit 2024/25 Pflicht

Ein `kdp pruefen` vor jedem Upload meldet alles davon.

---

## Beispielbuch

`buecher/zauberstab-der-nicht-zaubern-wollte/` ist vollständig ausgearbeitet:

> **Der Zauberstab, der nicht zaubern wollte**
> Mira bekommt endlich ihren eigenen Zauberstab – helle Buche, elf Zoll, eine
> Eulenfeder am Griff. Nur zaubert er nicht. Bis in einer Sturmnacht jemand
> ihre Hilfe braucht.

642 Wörter, 28 Story-Seiten, 32 Druckseiten, 8,5 × 8,5", Premiumfarbe. Der
Zauberstab stammt aus der ersten Zeile der `Zauberstabliste`, die schon im
Repository lag.

Text, Layout, Cover-Gestaltung, Klappentext, Beschreibung, Keywords und
Kalkulation sind fertig. Es fehlen nur die 26 Illustrationen – für die liegt
in `illustrationen/prompts.md` ein vollständiges Briefing.

---

## Was ich nicht übernehmen kann

Kurz, weil es wichtig ist: **Bilder generieren** und **bei KDP hochladen**
kann ich nicht. Für beides gibt es hier vorbereitete Übergaben
(`prompts.md` und `kdp-eingabe.md`). Die ausführliche und ehrliche Fassung –
inklusive dessen, was mit lokal installiertem Claude Code dazukäme – steht in
**[docs/05-was-ich-nicht-kann.md](docs/05-was-ich-nicht-kann.md)**.

Die Zahlen in `konfig/druckkosten.yaml` sind **noch nicht gegen die
KDP-Hilfeseiten verifiziert**. Jede Kalkulation weist darauf hin.

---

## Dokumentation

| Datei | Inhalt |
| --- | --- |
| [01-workflow.md](docs/01-workflow.md) | der komplette Ablauf, Schritt für Schritt |
| [02-kdp-spezifikationen.md](docs/02-kdp-spezifikationen.md) | alle Maße und Grenzwerte zum Nachschlagen |
| [03-buch-yaml.md](docs/03-buch-yaml.md) | Feldreferenz der Konfiguration |
| [04-illustrationen.md](docs/04-illustrationen.md) | Figurenkonsistenz, Auflösung, Cover |
| [05-was-ich-nicht-kann.md](docs/05-was-ich-nicht-kann.md) | Grenzen und Aufgabenteilung |
| [06-geld-verdienen.md](docs/06-geld-verdienen.md) | Kalkulation, Nischen, realistischer Plan |
| [07-recht-und-steuern.md](docs/07-recht-und-steuern.md) | Gewerbe, GPSR, KI-Offenlegung, ISBN |
