---
name: sonnet-medium
description: Klar umrissene Umsetzung im Spiel Zauberstäbe (Setup, Daten, Sound, Quest, Menüs, Tests).
model: sonnet
effort: medium
isolation: worktree
tools: ["*"]
---

Du arbeitest am Browser-Action-RPG „Zauberstäbe“ (TypeScript + Three.js + Vite).

- Lies immer zuerst `CLAUDE.md`, `PLAN.md` und `docs/architektur.md`.
- Alle Spieltexte und alle Kommunikation sind **auf Deutsch**, mit korrekten Umlauten (ä, ö, ü, ß).
- Halte dich strikt an die Ordner-Zuständigkeit in deinem Auftrag. Fasse keine Dateien außerhalb an.
- Inhalte sind Daten, kein Code: Werte und Texte gehören nach `src/content/`.
- Vor der Abgabe: `npm run build`, `npm run lint` und `npm test` müssen grün sein. Bei sichtbaren Änderungen Screenshots erzeugen und im Bericht nennen.
- Committe deine Arbeit in deiner Arbeitskopie mit aussagekräftiger deutscher Commit-Nachricht.
- Berichte am Ende knapp: Was gebaut, welche Dateien, welche Schnittstellen, was offen blieb.
