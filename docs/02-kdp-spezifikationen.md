# KDP-Spezifikationen – die Zahlen, an denen Uploads scheitern

Alle Werte sind in `tools/kdpstudio/spezifikation.py` hinterlegt und werden von
`kdp bauen` und `kdp pruefen` automatisch angewendet. Diese Seite ist zum
Nachschlagen, wenn man ein Cover extern gestalten lässt.

## Taschenbuch (Print on Demand)

| Regel | Wert |
| --- | --- |
| Mindestseitenzahl | 24 |
| Höchstseitenzahl | 828 |
| Seitenzahl | muss **gerade** sein |
| Auflösung Bilder | mindestens 300 dpi **auf der Platzierungsfläche** |
| Anschnitt (Bleed) | 0,125" (3,2 mm) an Ober-, Unter- und Außenkante – nie am Bund |
| Rückentext erlaubt ab | 79 Seiten |

### Dokumentgröße Innenteil

```
Breite = Trimbreite + 0,125"        (nur Außenkante, der Bund wird nicht beschnitten)
Höhe   = Trimhöhe   + 2 × 0,125"
```

Beispiel 8,5 × 8,5" mit Anschnitt → **8,625 × 8,75"** = 219,1 × 222,3 mm.

### Bundsteg (innerer Rand) nach Seitenzahl

| Seiten | Mindest-Bundsteg |
| --- | --- |
| 24 – 150 | 0,375" (9,5 mm) |
| 151 – 300 | 0,5" (12,7 mm) |
| 301 – 500 | 0,625" (15,9 mm) |
| 501 – 700 | 0,75" (19,1 mm) |
| 701 – 828 | 0,875" (22,2 mm) |

Außenrand: mindestens 0,25" ohne Anschnitt, 0,375" mit Anschnitt. Der Bundsteg
wechselt die Seite: auf ungeraden (rechten) Seiten links, auf geraden (linken)
Seiten rechts. Genau das macht `Innenteilgeometrie.satzspiegel()`.

### Rückenbreite

```
Rücken = Seitenzahl × Faktor
```

| Papier | Faktor pro Seite |
| --- | --- |
| S/W auf weiß | 0,002252" |
| S/W auf creme | 0,0025" |
| Standardfarbe | 0,002252" |
| Premiumfarbe | 0,002347" |

32 Seiten Premiumfarbe → 0,0751" = **1,9 mm**.

### Gesamtcover (Rückseite + Rücken + Front in **einer** PDF-Seite)

```
Breite = 0,125" + Trimbreite + Rücken + Trimbreite + 0,125"
Höhe   = 0,125" + Trimhöhe + 0,125"
```

8,5 × 8,5" bei 32 Seiten Premiumfarbe → **17,325 × 8,75"** = 440,1 × 222,3 mm
= 5197 × 2625 px bei 300 dpi.

Unten rechts auf der Rückseite bleiben 2 × 1,2" (ca. 51 × 30 mm) frei – dort
druckt Amazon den Barcode. `kdp cover` legt dort automatisch ein weißes Feld an.

## eBook

| Regel | Wert |
| --- | --- |
| Format | EPUB (KDP nimmt auch DOCX, aber EPUB ist verlässlicher) |
| Cover | JPG/TIFF, ideal 1600 × 2560 px, Verhältnis 1 : 1,6 |
| Cover-Mindestmaß | 1000 px an der langen Seite |
| Bilderbuch | Fixed Layout (`ebook.layout: fest`) |
| Kapitelbuch | Reflowable (`ebook.layout: fliessend`) |

Bei Fixed Layout schreibt `kdp epub` die Kindle-Metadaten `fixed-layout`,
`book-type: children`, `original-resolution` und `RegionMagnification` in die
OPF – ohne die behandelt Amazon das Buch als normales Reflow-eBook und das
Layout zerfällt.

## Metadaten

| Feld | Grenze |
| --- | --- |
| Titel | 200 Zeichen |
| Beschreibung | 4000 Zeichen **inklusive HTML-Tags** |
| Erlaubte HTML-Tags | `<br> <p> <b> <em> <i> <u> <h4> <h5> <h6> <ol> <ul> <li>` |
| Keywords | 7 Felder, je 50 Zeichen |
| Kategorien | bis zu 3 |

Verboten in Titel und Keywords: Werbeaussagen („Bestseller", „gratis",
„kostenlos", Prozentangaben). Amazon blockiert Bücher dafür.
