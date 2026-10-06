# Zauberstäbe – Projektkontext

Browser-Action-RPG „Zauberstäbe“, isometrisch wie Path of Exile 2, mit Elementen aus Gothic und WoW Classic.
Claude baut das Spiel komplett selbst. Der Nutzer testet, gibt Feedback und übernimmt kleine Aufgaben (Accounts, Einstellungen).

- **Mit dem Nutzer auf Deutsch kommunizieren.** Alle Spieltexte sind ebenfalls auf Deutsch.
- Lieblingsspiele des Nutzers: WoW Classic, Path of Exile 2, Counter-Strike, Dota, Call of Duty, Gothic 1–3.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `PLAN.md` | **Der Plan bis zum ersten spielbaren Gebiet**: Testlauf, Umfang, Technik, Wellen 0–4 mit Agent, Modell und Stufe pro Aufgabe |
| `docs/architektur.md` | **Verbindlich für alle Agenten**: Ordner-Zuständigkeiten, Ereignisliste, Kernschnittstellen, Datenformate, Regeln fürs parallele Arbeiten |
| `konzept/` | Statische 3D-Konzeptszene (Three.js, alles prozedural) mit `screenshot.png`. Sie dient als Referenz für den Grafikstil. Details in `konzept/README.md`. **Eingefroren.** |
| `ui-stile/` | Drei Stilentwürfe für die Oberfläche aus Aufgabe 0.5, mit Screenshots und Stilleitfaden |
| `Zauberstabliste` | 10 Zauberstäbe (Holz, Kern, Länge, Charakterzug), die Grundlage des Beute-Systems |
| `.claude/agents/` | Agent-Definitionen mit festem Modell und fester Stufe (`opus-xhigh`, `opus-high`, `opus-medium`, `sonnet-high`, `sonnet-medium`, `haiku-low`) |

## Entscheidungen des Nutzers (06.10.2026)

| Frage | Entscheidung |
| --- | --- |
| **Steuerung** | **WASD + Maus zielen**, Leertaste für die Ausweichrolle. Kein Klicken zum Laufen. |
| **Oberfläche** | Vorbilder sind **WoW Classic** und **Diablo 4**. Daraus entstehen in Aufgabe 0.5 drei Varianten: A „Classic“, B „Modern“, C „Wildholz“ (eigene Mischung). Der Nutzer wählt eine aus. |
| **Namen** | Übernommen wie geplant: Dorf **Erlengrund**, Berge **Grauzahn-Pass**, Wald **Wildholz**, Boss **Grimmzahn**. |
| **Veröffentlichen & Merge** | Claude macht das **komplett selbst**, volle Berechtigung: GitHub Pages, Merge nach `main`, keine Rückfrage pro Welle nötig. |

## Stand: 06.10.2026

- Konzeptszene fertig. Rückmeldung des Nutzers: Die Grafik passt. Es gibt aber Schatten-Pixelfehler, und die UI gefällt ihm „absolut nicht“. Beides ist im Plan berücksichtigt (Aufgaben 1.4 und 0.5).
- **`PLAN.md` ist freigegeben.** Alle Fragen aus Abschnitt 8 sind beantwortet (siehe Tabelle oben).
- **Welle 0 läuft.** Fertig: 0.1 (Setup, CI und Pages grün), 0.2 (Architektur), 0.4 (Agent-Definitionen). In Arbeit: 0.3 (Engine-Kern), 0.5 (UI-Stilfindung).
- **Testlink:** https://backpferd.github.io/Zauberstaebe/ (wird bei jedem Push auf `main` neu veröffentlicht, über `.github/workflows/pages.yml`)
- Gearbeitet wird auf dem Branch `ccr-e90d73eb-2cnpu9`. Geprüfte Stände werden per Fast-Forward nach `main` übernommen.

## Hinweise für neue Sitzungen

- Neu angelegte Agent-Definitionen unter `.claude/agents/` greifen **erst ab der nächsten Sitzung**. In der Sitzung, in der sie entstehen, muss man `general-purpose` mit `model`-Override aufrufen; die Stufe lässt sich dann nicht setzen und wird über den Auftragstext ausgeglichen.
- **Arbeitskopien der Agenten zweigen von `main` ab**, nicht vom aktuellen Branch. Vor jeder Welle muss `main` deshalb auf dem neuesten geprüften Stand sein, sonst fehlen dem Agenten Gerüst, Architektur und Vorarbeiten.
- Die Arbeitskopien liegen unter `.claude/worktrees/`. Sie sind in `.gitignore` und `eslint.config.js` ausgenommen.
- Kein `gh` auf dem Rechner. GitHub-API-Aufrufe laufen per `curl` mit dem Token aus `git credential fill`. Den Token nie ausgeben.
- Dateien mit Umlauten **nicht** über PowerShell `Set-Content` oder ein Bash-Heredoc schreiben, sondern mit dem Write-/Edit-Werkzeug oder über Node.
- Vor jedem Commit: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`.

## Konzeptszene neu rendern

```bash
cd konzept
npm install
node render.mjs screenshot.png
```

Das braucht Chromium für Playwright. Lokal geht das mit `npx playwright install chromium`.
