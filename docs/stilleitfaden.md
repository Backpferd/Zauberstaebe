# Stilleitfaden Oberfläche: Variante C „Wildholz"

> Gewählt vom Nutzer am 12.10.2026 · **verbindlich für alle UI-Aufgaben** (2.3 HUD, 2.4 Beute und Inventar, 2.5 Interaktion und Quest, 3.2 Menüs)

**Referenz:** Entwurf `ui-stile/c-wildholz/`, besonders die Screenshots in `ui-stile/c-wildholz/screenshots/` und die CSS-Variablen ganz oben in `ui-stile/c-wildholz/style.css`. Der Entwurf ist eingefroren. Übernommen wird in `src/ui/`, nicht dort geändert.

## Die zwei Grundregeln

1. **Sechseck heißt anklickbar.** Alles, was man drücken oder auslösen kann (Zauber, Trank, Stufe, Minikarte, Zustandsmarke, die Taste im Interaktionshinweis), ist ein Sechseck (`--wabe`). Alles, was nur einen Zustand anzeigt (Leben, Mana, EP, Boss-Leiste), ist ein Balken mit abgeschrägten Enden (`--schraeg`).
2. **Dunkel heißt kämpfen, Pergament heißt lesen.** Das HUD ist dunkel (Moos und Tinte). Jedes Fenster zum Lesen (Inventar, Tooltip, Schriftrolle, Wegweiser, Aufgabennotiz, Menüs) ist helles Pergament mit dunkler Tinte.

## Farben

- **Genau zwei Akzente:** **Glut** (`--glut`, warm: Feuer, Beute, aktiv) und **Rune** (`--rune`, kalt: Magie, Frost, Mana). Auf Pergament jeweils die dunkle Fassung `--glut-tinte` bzw. `--rune-tinte`. **Kein Gold** als Rahmen- oder Flächenfarbe.
- **Zwei Seltenheitssätze:** `--selt-*` auf dunklem Grund (Beuteschilder in der Welt), `--selt-p-*` auf Pergament (Inventar, Tooltip). Es gibt genau vier Seltenheiten: gewöhnlich, magisch, selten, einzigartig.
- **Vergleiche:** `--besser` und `--schlechter` auf Pergament, `--besser-hell` auf dunklem Grund.
- **Kontrast:** Jeder Text mindestens **4,5:1** (BFSG). Die Werte stehen als Kommentar an jeder Variablen. Neue Farbpaare werden vor dem Einsatz nachgemessen.

## Schriften

| Rolle                                    | Schrift                 | Hinweis                                                                 |
| ---------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| Namen, Überschriften                     | **Fraunces** (variabel) | immer mit `font-variation-settings: var(--schnitzen)` (SOFT 40, WONK 1) |
| Alles, was im Kampf schnell gelesen wird | **Public Sans**         | Zahlen, Tasten, Zustände, Tooltip-Werte                                 |
| Runen auf der Schriftrolle               | **Noto Sans Runic**     | echte Unicode-Runen                                                     |

Alle drei stehen unter der SIL Open Font License und werden über `@fontsource` geladen. Cinzel und Alegreya aus der Konzeptszene **entfallen** für die Oberfläche. Aufgabe 2.3 stellt das in `src/main.ts` und `src/style.css` um.

Schriftgrößen, Abstandsraster (Vielfache von 4 px), Schatten und Größen stehen als Variablen in der Referenz-CSS und werden unverändert übernommen.

## Aufbau des HUD (aus dem Entwurf)

| Bereich      | Inhalt                                                                            |
| ------------ | --------------------------------------------------------------------------------- |
| unten links  | Stufe als Sechseck, daneben Leben, Mana und EP als schlanke Balken mit Zahlen     |
| darüber      | aktive Zustände als kleine Sechsecke mit Beschriftung                             |
| unten Mitte  | Zauberleiste: LMT, RMT, Leer, dann Q, E, R, mit Abklingzeit als Zahl im Feld      |
| unten rechts | Tränke (Tasten 1 und 2)                                                           |
| oben Mitte   | Boss-Leiste mit Name, Stufe, Zahlen und Zustandsplaketten                         |
| oben rechts  | Minikarte als Sechseck, darunter Gebietsname und die Aufgabennotiz auf Pergament  |
| in der Welt  | Gegnernamen mit Stufe und Lebensbalken, Schadenszahlen in Fraunces, Beuteschilder |

## Bei der Übernahme zu beheben

Diese Punkte sind im Entwurf noch unsauber und werden in `src/ui/` richtig gemacht:

1. **Kein Umbruch in Kopfzeilen:** Im Tooltip bricht „10 Zoll" in eine eigene Zeile. Längenangaben bleiben zusammen (`white-space: nowrap` bzw. geschütztes Leerzeichen).
2. **Taschenplätze einheitlich:** Der Entwurf zeigt 45 Plätze. Die Zahl kommt aus den Daten (`src/content/`), nicht aus dem Markup.
3. **Seltenheitslegende** im Inventar zeigt genau die vier Seltenheiten der Architektur, in der Reihenfolge gewöhnlich, magisch, selten, einzigartig.
4. **Alle Texte** über `t()` aus `src/content/texte.ts`, auch in der Oberfläche.
