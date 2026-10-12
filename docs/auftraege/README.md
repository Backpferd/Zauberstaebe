# Aufträge an die Agenten

Jede Aufgabe aus `PLAN.md` bekommt hier eine eigene Datei. Ein Agent arbeitet **nur** mit seinem Auftrag und der Doku im Repo, ohne Rückfragen.

| Welle         | Ordner                 |
| ------------- | ---------------------- |
| 1 – Bausteine | [`welle-1/`](welle-1/) |

## Gemeinsame Regeln für jeden Auftrag

Diese Regeln gelten zusätzlich zu dem, was in deinem Auftrag steht.

### Vor dem Start lesen

1. `CLAUDE.md`
2. `PLAN.md`: Abschnitt 1 (Testlauf aus Spielersicht) und deine Zeile in Abschnitt 4
3. **`docs/architektur.md` vollständig.** Sie ist verbindlich, besonders Abschnitt 2 (Ordner), 3 (Ereignisse), 7 (Regeln), 9 (Engine benutzen) und 10 (Vorschauseiten).
4. Deinen Auftrag in diesem Ordner
5. `konzept/screenshot.png` und den Code unter `konzept/src/`. **Der Nutzer liebt diese Grafik.** Sie ist der Maßstab für Stil und Qualität: stilisiert, low-poly, prozedural, warmes Licht gegen kühle Nacht, kräftige Silhouetten.

### Sprache

Alle Texte, Kommentare, Commit-Nachrichten und Berichte auf **Deutsch** mit echten Umlauten (ä, ö, ü, ß). Bezeichner im Code sind ASCII (`abklingzeit`, `waehle`). Dateien mit Umlauten schreibst du mit dem Write- oder Edit-Werkzeug, **nie** per Shell-Heredoc oder PowerShell `Set-Content`. Beides zerstört Umlaute oder bricht an Sonderzeichen ab.

### Arbeitsbereich

- Du änderst **nur** die Dateien, die dein Auftrag unter „Deine Dateien" nennt. Alles andere liest du nur.
- `src/main.ts`, `src/models/figur.ts`, `src/world/vertraege.ts`, `docs/` (außer wo erlaubt), `.github/`, `.claude/`, `konzept/`, `ui-stile/`, `PLAN.md`, `CLAUDE.md` fasst du nicht an.
- Fehlt dir etwas aus einem fremden Bereich: Baue dir in **deiner** Vorschauseite einen einfachen Ersatz und melde den Bedarf im Bericht.
- Neue npm-Abhängigkeiten nur, wenn es wirklich nicht anders geht, mit Begründung im Bericht.

### Testen

- Dein Dev-Server und deine Browsertests laufen auf **deinem eigenen Port** (steht im Auftrag), damit du nicht den Server eines anderen Agenten testest:
  `PORT=<dein Port> npm run dev` und `PORT=<dein Port> npx playwright test tests/e2e/<deine-datei>.spec.ts tests/e2e/start.spec.ts`
- Lass nur **deine eigenen** Browsertests plus `start.spec.ts` laufen. Die Gesamtsuite fährt die Hauptsitzung nach dem Zusammenführen.
- Echtzeit-Prüfungen im Browser immer mit `&grafik=niedrig` (Architektur Abschnitt 10).
- Logiktests heißen `tests/unit/<baustein>-*.test.ts`, Browsertests `tests/e2e/<baustein>.spec.ts`, Screenshots `tests/e2e/screenshots/<baustein>-*.png`.
- **Sieh dir deine Screenshots selbst an** (Read-Werkzeug). Ein grüner Test mit hässlichem Bild ist nicht fertig.

### Abnahme

Vor dem Commit müssen alle diese Befehle fehlerfrei durchlaufen:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
PORT=<dein Port> npx playwright test tests/e2e/<deine-datei>.spec.ts tests/e2e/start.spec.ts
```

`npm run format` formatiert vorher alles. Committe mit einer deutschen Nachricht und der Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Bericht

Kurz und in dieser Gliederung:

1. **Gebaut:** was, in welchen Dateien
2. **Schnittstelle:** was andere Bausteine von dir benutzen (Funktionen, Typen, Ereignisse, Klangnamen …)
3. **Vorschau:** Adresse (`?szene=…`), Steuerung, was man dort sieht
4. **Tests:** Anzahl Logik- und Browsertests, alle Abnahmebefehle mit Ergebnis
5. **Screenshots:** Pfade
6. **Offen und Bedarf:** was fehlt, was du von anderen Bereichen brauchst, Abweichungen von der Architektur
