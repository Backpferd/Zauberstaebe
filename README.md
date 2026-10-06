# Zauberstäbe

Browser-Action-RPG im isometrischen Stil (Vorbilder: Path of Exile 2, Gothic, WoW Classic). Das Spiel läuft komplett im Browser mit Three.js, alle Modelle, Effekte und Texturen entstehen prozedural im Code. Alle Spieltexte sind auf Deutsch.

Aktueller Stand: **Projektgerüst** (Aufgabe 0.1 aus `PLAN.md`). Der Testlink zeigt eine leere 3D-Szene mit Boden, Licht und der Kamera der Konzeptszene. Spiellogik, HUD und Gegner folgen in den nächsten Wellen.

**Testlink:** <https://backpferd.github.io/Zauberstaebe/>

> Der Link funktioniert, sobald in den Repository-Einstellungen unter _Settings → Pages → Source_ „GitHub Actions“ gewählt ist und ein Stand auf `main` liegt.

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

Danach im Browser <http://localhost:5173/Zauberstaebe/> öffnen. Der Pfad `/Zauberstaebe/` ist Absicht: Er entspricht der Adresse auf GitHub Pages.

## Befehle

| Befehl                 | Wirkung                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Startet den Vite-Dev-Server mit Hot Reload                           |
| `npm run build`        | Prüft die Typen und baut die Auslieferung nach `dist/`               |
| `npm run preview`      | Zeigt den gebauten Stand aus `dist/` lokal an                        |
| `npm run typecheck`    | TypeScript-Prüfung ohne Ausgabe (`tsc --noEmit`)                     |
| `npm run lint`         | ESLint über das ganze Projekt                                        |
| `npm run format`       | Formatiert alle Dateien mit Prettier                                 |
| `npm run format:check` | Prüft die Formatierung, ohne etwas zu ändern (läuft in der CI)       |
| `npm test`             | Logiktests mit Vitest, einmalig                                      |
| `npm run test:watch`   | Vitest im Watch-Modus                                                |
| `npm run test:e2e`     | Browsertest mit Playwright (Chromium), startet den Dev-Server selbst |

Beim ersten Mal braucht Playwright den Browser: `npx playwright install chromium`.
Der Browsertest legt seinen Screenshot nach `tests/e2e/screenshots/`.

## Ordnerstruktur

```
src/
  engine/   Spielschleife, Renderer, Licht & Schatten, Kamera, Eingabe, Audio-Grundlage
  game/     Spiellogik: Spieler, Kampf, Zauber, Gegner-KI, Beute, Quests, Fortschritt
  world/    Gelände, Wege, Vegetation, Kollision, Wegfindung, Gebiet 1
  models/   prozedurale 3D-Modelle und Animationen
  fx/       Partikel und Effekte
  ui/       HUD, Fenster, Menüs (HTML/CSS)
  content/  Daten: Zauberstäbe, Affixe, Zauber, Gegner, Quests, alle Texte (Deutsch)
tests/
  unit/     Logiktests (Vitest)
  e2e/      Browsertests (Playwright)
docs/       Architektur und Spieldesign
konzept/    die fertige Konzeptszene (Referenz, bleibt unverändert)
```

Für Importe gibt es pro Ordner einen Alias, der in `tsconfig.json` und `vite.config.ts` eingetragen ist:

```ts
import { createRng } from '@engine/random';
```

Verfügbar sind `@engine/*`, `@game/*`, `@world/*`, `@models/*`, `@fx/*`, `@ui/*` und `@content/*`.

## Auslieferung und CI

- `.github/workflows/ci.yml` läuft bei jedem Push und Pull Request: Lint, Formatierung, Typen, Vitest, Build, Playwright. Die Screenshots hängen als Artefakt am Lauf.
- `.github/workflows/pages.yml` baut bei jedem Push auf `main` und veröffentlicht `dist/` über GitHub Pages.
