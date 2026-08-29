# Feldreferenz `buch.yaml`

Pflicht sind nur `titel` und `autor`. Alles andere hat Vorgaben.

## Kopf

| Feld | Bedeutung |
| --- | --- |
| `titel` | max. 200 Zeichen, keine Werbeaussagen |
| `untertitel` | wichtigstes Suchfeld bei Amazon – nicht leer lassen |
| `autor` | Name wie auf dem Cover |
| `reihe` / `reihennummer` | erzeugt die Reihenzuordnung im EPUB |
| `sprache` | ISO-Code, z. B. `de` |

## `druck`

| Feld | Werte |
| --- | --- |
| `trim` | `8.5x8.5`, `8.25x8.25`, `8.5x11`, `8x10`, `7.5x9.25`, `8.25x6`, `7x10`, `6x9`, `5.5x8.5`, `5x8`, `6.14x9.21`, `8.27x11.69` |
| `papier` | `sw-weiss`, `sw-creme`, `farbe-standard`, `farbe-premium` |
| `anschnitt` | `true` bei randabfallenden Bildern |
| `seiten_soll` | Kontrollwert; weicht der Build ab, gibt es eine Warnung |

## `layout`

| Feld | Vorgabe | Wirkung |
| --- | --- | --- |
| `vorspann` | `[titelseite, impressum]` | Seiten vor der Story |
| `nachspann` | `[]` | Liste aus `{ueberschrift, absaetze}` oder `leer` |
| `schriftgroesse` | 17 | Punkt. 16–20 für Vorlesebücher |
| `zeilenabstand` | 1.45 | Faktor |
| `ausrichtung` | `links` | `links`, `zentriert`, `blocksatz` |
| `bildanteil` | 0.62 | Höhenanteil des Bildes bei `bild-oben`/`bild-unten` |
| `textband_deckkraft` | 0.82 | Deckkraft des Textbandes auf Vollbildern |
| `seitenzahlen` | `false` | bei Bilderbüchern unüblich |
| `raender` | 0.5 | `aussen`, `oben`, `unten` in Zoll; der Bund kommt aus der KDP-Staffel |
| `schrift_text` / `schrift_titel` | – | Familienname oder `.ttf`-Datei aus `assets/schriften/` |

## `illustration`

`stil` mit den Achsen `technik`, `linien`, `palette`, `licht`, `stimmung`,
`perspektive`, `zusatz`. Der Block wird wortgleich in jeden Prompt kopiert.

`figuren` ist eine Liste aus `name`, `beschreibung`, `kleidung`, `merkmal`.
Das `merkmal` ist der Anker für die Wiedererkennbarkeit – ein einzelnes hartes
Detail, kein Charakterzug.

## `cover`

| Feld | Bedeutung |
| --- | --- |
| `front_bild` / `rueck_bild` | Dateien in `illustrationen/` |
| `front_szene` / `rueck_szene` | wandert in den Cover-Prompt |
| `hintergrundfarbe`, `rueckenfarbe`, `schriftfarbe`, `akzentfarbe` | Hex |
| `titelband` / `titelband_deckkraft` | dunkles Band hinter dem Titel |
| `rueck_headline` | eine Zeile über dem Klappentext |
| `blurb` | Klappentext, Absätze durch Leerzeile getrennt |
| `stichpunkte` | Aufzählung unter dem Klappentext |
| `titel_auf_cover` | falls der Cover-Titel vom Buchtitel abweichen soll |

## `marketing`

Speist die Produktbeschreibung. `**fett**` und `*kursiv*` werden in erlaubtes
KDP-HTML übersetzt.

| Feld | Bedeutung |
| --- | --- |
| `hook` | eine Zeile ganz oben (`<h4>`) |
| `beschreibung` | Liste von Absätzen |
| `verkaufsargumente` | Aufzählung |
| `seitenangabe`, `leseart` | erscheinen als Faktenliste |
| `abschluss` | fetter Schlusssatz |
| `keywords` | genau 7, je max. 50 Zeichen |
| `kategorien` | bis zu 3 |

## `preise`

Liste aus `markt`, `waehrung`, `mwst_satz`, `taschenbuch`, `ebook`.
`mwst_satz: 0.07` für Deutschland, damit die Tantieme auf netto rechnet.

## `ebook`

`layout: fest` für Bilderbücher (Fixed Layout), `fliessend` für Kapitelbücher.
`viewport_breite` steuert die Pixelbreite der Fixed-Layout-Seite.

## `impressum`

`jahr`, `rechteinhaber`, `auflage`, `verlagsname`, `illustration`, `isbn`,
`verantwortlich` (GPSR-Pflichtangabe), `hinweis`.

## `ki_einsatz`

`text`, `bilder`, `uebersetzung` – jeweils `KI-generiert`, `KI-unterstützt`
oder `nein`, plus optionale `_hinweis`-Felder. `hinweis_im_buch` erscheint auf
der Impressumsseite.
