# Der komplette Ablauf – von der Idee zum verkaufsfertigen Buch

Ein Buch durchläuft neun Schritte. Die Schritte 1–6 laufen vollständig hier im
Projekt; 7–9 passieren zwingend an deinem Rechner in deinem KDP-Konto.

---

## 1. Buch anlegen

```bash
python3 tools/kdp neu mein-buch
```

Legt `buecher/mein-buch/` aus der Vorlage an. Danach `buch.yaml` ausfüllen:
Titel, Untertitel, Autor, Zielgruppe, Format, Preise.

**Wichtig zuerst entscheiden:**

| Entscheidung | Empfehlung Bilderbuch 3–7 | Empfehlung Kapitelbuch 7–10 |
| --- | --- | --- |
| `trim` | `8.5x8.5` (quadratisch) | `6x9` |
| `papier` | `farbe-premium` | `sw-creme` |
| `anschnitt` | `true` | `false` |
| `seiten_soll` | 32 | 80–120 |
| `ebook.layout` | `fest` | `fliessend` |

## 2. Manuskript schreiben

`buecher/mein-buch/manuskript.md`. Eine `## Seite N` pro Doppel-Seite-Slot.

Faustregeln, die `kdp pruefen` auch kontrolliert:

- 3–6 Jahre: 20–50 Wörter pro Seite, 400–800 Wörter gesamt
- 6–8 Jahre: 50–100 Wörter pro Seite, 800–1500 Wörter gesamt
- 32 Druckseiten = 2 Vorspann + 28 Story + 1 Nachspann + 1 leer

Jede Seite bekommt neben dem Text eine `[szene: ...]`-Beschreibung. Die ist der
Rohstoff für Schritt 4 – je konkreter, desto brauchbarer das Bild.

## 3. Layout prüfen, bevor ein einziges Bild existiert

```bash
python3 tools/kdp bauen mein-buch
```

Baut alles mit **Platzhalterbildern** durch: Innenteil-PDF, Cover, EPUB,
Metadaten, Vorschau. `build/vorschau.html` im Browser öffnen – dort steht Seite
für Seite, welcher Text auf welche Druckseite fällt, ob sie links oder rechts
liegt und ob der Text zur Bildfläche passt.

Erst wenn das stimmt, lohnt sich die Illustration. Andersherum malt man 26
Bilder für ein Layout, das nicht aufgeht.

## 4. Illustrieren

```bash
python3 tools/kdp prompts mein-buch
```

Erzeugt `illustrationen/prompts.md` mit Stil-Bibel, Figurenblättern und einem
fertigen Prompt je Seite (inklusive Zielauflösung in Pixeln).

Ablauf im Bildgenerator (ChatGPT/DALL-E, Midjourney, was du nutzt):

1. **Stil festnageln.** Stilblock mit einer beliebigen Szene generieren, bis der
   Look sitzt. Erst dann weiter.
2. **Figurenblätter erzeugen** – eine Figur, fünf Ansichten, neutraler
   Hintergrund. Speichern als `illustrationen/figur-<name>.png`.
3. **Seitenbilder erzeugen.** Pro Seite den Prompt benutzen und das Figurenblatt
   als Referenzbild anhängen. **Im selben Chat bleiben** – der Bildkontext hält
   die Figur stabil. Ein neuer Chat = eine neue Figur.
4. Bilder unter den im Briefing genannten Dateinamen in `illustrationen/`
   ablegen.

Details und Fallstricke: `docs/04-illustrationen.md`.

## 5. Neu bauen und prüfen

```bash
python3 tools/kdp bauen mein-buch
```

Jetzt mit echten Bildern. `kdp pruefen` meldet als **FEHLER**, wenn ein Bild auf
seiner Platzierungsfläche unter 300 dpi liegt – genau das lehnt KDP ab. Die
Meldung nennt die benötigte Pixelzahl.

## 6. Preis festlegen

```bash
python3 tools/kdp kalkulation mein-buch
```

Zeigt für jeden Markt Druckkosten, Tantieme und Mindestpreise. Bei Farbdruck ist
das die wichtigste Zahl des ganzen Projekts – siehe `docs/06-geld-verdienen.md`.

## 7. Hochladen (an deinem Rechner)

`build/kdp-eingabe.md` öffnen. Das Blatt ist Feld für Feld nach dem
KDP-Assistenten sortiert. Nichts frei erfinden – sonst weichen Buch und
Produktseite voneinander ab.

Reihenfolge in KDP:

1. **Taschenbuch erstellen** → Angaben → Inhalt → Rechte und Preis
   - Manuskript: `build/<slug>-innenteil.pdf`
   - Cover: `build/<slug>-cover.pdf` („Cover hochladen", nicht Cover Creator)
2. **Vorschau prüfen.** Der KDP-Previewer zeigt Beschnittlinien. Jede Warnung
   ernst nehmen.
3. **eBook erstellen** – dasselbe Buch, getrennter Eintrag
   - Manuskript: `build/<slug>.epub`
   - Cover: `build/<slug>-ebook-cover.jpg`
4. Nach Freischaltung beide Ausgaben auf der Produktseite verknüpfen lassen
   (passiert meist automatisch über identischen Titel + Autor; sonst über den
   KDP-Support).

## 8. Beschreibung, A+ Content, Autorenprofil

- Beschreibung: kompletten HTML-Block aus `build/beschreibung.html` in das
  KDP-Feld „Beschreibung" einfügen.
- Keywords: die sieben Felder aus dem Eingabeblatt.
- Autorenprofil bei Amazon Author Central anlegen und die Bücher zuordnen.

## 9. Nachhalten

Nach Veröffentlichung: Rangliste, erste Rezensionen, Klickzahlen. Wenn sich
nach vier Wochen nichts bewegt, liegt es fast immer am Cover oder am Titel –
nicht am Text. Beides lässt sich hier ändern und neu hochladen.

---

## Alle Befehle

| Befehl | Was er tut |
| --- | --- |
| `kdp liste` | alle Bücher im Projekt |
| `kdp neu <slug>` | neues Buch aus der Vorlage |
| `kdp prompts <slug>` | Illustrations-Briefing erzeugen |
| `kdp innenteil <slug>` | Innenteil-PDF |
| `kdp cover <slug>` | Print-Cover-PDF + eBook-Cover |
| `kdp epub <slug>` | EPUB |
| `kdp metadaten <slug>` | KDP-Eingabeblatt, Beschreibung, JSON |
| `kdp vorschau <slug>` | HTML-Vorschau Seite für Seite |
| `kdp kalkulation [slug]` | Tantiemen und Mindestpreise |
| `kdp pruefen <slug>` | Preflight gegen die KDP-Regeln |
| `kdp bauen <slug>` | alles zusammen + Preflight |

`--ohne-platzhalter` unterdrückt Platzhalterbilder und meldet fehlende Dateien
stattdessen als Warnung – für den finalen Build vor dem Upload.
