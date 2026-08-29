# Schriften

Hier `.ttf`-Dateien ablegen, die in die PDFs eingebettet werden sollen.
Ohne eigene Schrift greift das Werkzeug auf Systemschriften zurück und
zuletzt auf Helvetica.

Bewährt für Kinderbücher (alle kostenlos und kommerziell nutzbar):

| Schrift | Rolle | Warum |
| --- | --- | --- |
| **Andika** (SIL) | Fließtext | für Leseanfänger entworfen, eindeutiges a, g, l/I |
| **Nunito** | Fließtext | rund, freundlich, sehr gut lesbar |
| **Baloo 2** | Titel | kräftig und verspielt, ohne kindisch zu wirken |
| **Fredoka** | Titel | kompakte Alternative zu Baloo |

Erwartete Dateinamen (Regular, Bold, Italic, BoldItalic), z. B.:

```
Andika-Regular.ttf  Andika-Bold.ttf  Andika-Italic.ttf  Andika-BoldItalic.ttf
Baloo2-Bold.ttf     Baloo2-ExtraBold.ttf
```

Danach in `buch.yaml`:

```yaml
layout:
  schrift_text: Andika
  schrift_titel: Baloo2
```

Beim Bauen meldet das Werkzeug, welche Familie tatsächlich genommen wurde.
Vor einer Veröffentlichung immer eine echte TTF hinterlegen – Helvetica wird
nicht eingebettet.
