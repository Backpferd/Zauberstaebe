# Zauberstäbe – Projektkontext

Browser-Action-RPG „Zauberstäbe“, isometrisch wie Path of Exile 2, mit Elementen aus Gothic und WoW Classic.
Claude baut das Spiel komplett selbst. Der Nutzer testet, gibt Feedback und übernimmt kleine Aufgaben (Accounts, Einstellungen).

- **Mit dem Nutzer auf Deutsch kommunizieren.** Alle Spieltexte sind ebenfalls auf Deutsch.
- Lieblingsspiele des Nutzers: WoW Classic, Path of Exile 2, Counter-Strike, Dota, Call of Duty, Gothic 1–3.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `PLAN.md` | **Der Plan bis zum ersten spielbaren Gebiet**: Testlauf, Umfang, Technik, Wellen 0–4 mit Agent, Modell und Stufe pro Aufgabe, offene Fragen |
| `konzept/` | Statische 3D-Konzeptszene (Three.js, alles prozedural) mit `screenshot.png`. Sie dient als Referenz für den Grafikstil. Details in `konzept/README.md` |
| `Zauberstabliste` | 10 Zauberstäbe (Holz, Kern, Länge, Charakterzug), die Grundlage des Beute-Systems |

## Stand: 06.10.2026

- Konzeptszene fertig. Rückmeldung des Nutzers: Die Grafik passt. Es gibt aber Schatten-Pixelfehler, und die UI gefällt ihm „absolut nicht“. Beides ist im Plan berücksichtigt (Aufgaben 1.4 und 0.5).
- `PLAN.md` ist geschrieben und **wartet auf Freigabe**. Offen sind die Fragen in Abschnitt 8: Steuerung, UI-Geschmack, Namen, Testlink/Merge-Rechte.
- Es gibt noch keinen Spielcode. Der nächste Schritt ist Welle 0 aus `PLAN.md`.
- Bisher wurde auf dem Branch `ccr-e90d73eb-2cnpu9` gearbeitet, der noch nicht in `main` übernommen ist.

## Konzeptszene neu rendern

```bash
cd konzept
npm install
node render.mjs screenshot.png
```

Das braucht Chromium für Playwright. Lokal geht das mit `npx playwright install chromium`.
