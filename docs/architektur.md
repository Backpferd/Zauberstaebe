# Architektur „Zauberstäbe"

> Stand: 06.10.2026 · Aufgabe 0.2 aus `PLAN.md` · **verbindlich für alle Agenten**

Dieses Dokument legt fest, wie das Spiel aufgebaut ist, wer welchen Ordner besitzt und wie die Bausteine miteinander reden. Es ist die Grundlage dafür, dass sechs Agenten gleichzeitig arbeiten können, ohne sich zu überschreiben.

**Wenn dein Auftrag etwas anderes sagt als dieses Dokument, gilt dieses Dokument.** Fehlt hier etwas, das du brauchst: nicht raten, sondern im Abschlussbericht ausdrücklich nachfragen.

---

## 1. Grundprinzipien

1. **Feste Simulationsrate.** Die Spiellogik läuft mit genau 60 Schritten pro Sekunde (`SCHRITT = 1/60`), unabhängig von der Bildrate. Gerendert wird so oft wie möglich, mit Zwischenwerten (Interpolation). Keine Spiellogik darf von der Bildrate abhängen.
2. **Reproduzierbarer Zufall.** Jeder Zufall kommt aus einem Generator mit Startwert (Seed), nie aus `Math.random()`. So lässt sich jeder gemeldete Fehler exakt nachstellen.
3. **Inhalte sind Daten, kein Code.** Werte, Texte, Gegnerstatistiken, Affixe und Questschritte liegen als typisierte Daten unter `src/content/`. Spiellogik liest sie, enthält sie aber nie.
4. **Systeme kennen sich nicht.** Sie reden ausschließlich über den Ereignisbus und über die Welt-Abfrage. Kein System importiert ein anderes System direkt.
5. **Darstellung ist vom Zustand getrennt.** 3D-Modelle, Effekte und Oberfläche lesen den Spielzustand und reagieren auf Ereignisse. Sie ändern ihn nie selbst.
6. **Alles auf Deutsch.** Spieltexte, Kommentare, Commit-Nachrichten, Berichte. Umlaute korrekt (ä, ö, ü, ß), niemals ae/oe/ue/ss.

---

## 2. Ordner und Zuständigkeiten

Jeder Ordner hat **genau einen** zuständigen Agenten pro Welle. Fremde Ordner werden nicht angefasst — auch nicht „nur kurz".

| Ordner         | Inhalt                                                                                                                                               | Darf importieren aus                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `src/engine/`  | Spielschleife, Zeit, Ereignisbus, Entitäten, Eingabe, Kamera, Renderer, Licht und Schatten, Audio-Grundlage, Seed-Zufall, Texttabelle, Debug (F3/F8) | – (nur Three.js und eigene Dateien) |
| `src/content/` | Alle Daten und Texte: Zauberstäbe, Affixe, Seltenheiten, Zauber, Gegner, Quest, Begegnungen, Stufenkurven                                            | – (reine Daten, keine Logik)        |
| `src/models/`  | Prozedurale 3D-Modelle und ihre Animationen: Zauberer, Wolf, Warg, Irrlicht, Grimmzahn, Requisiten                                                   | `engine`                            |
| `src/fx/`      | Partikel, Zauber- und Treffereffekte, Warnmarkierungen am Boden, Bildschirmwackeln                                                                   | `engine`                            |
| `src/world/`   | Gelände, Wege, Vegetation, Kollision, Wegfindung, Aufbau von Gebiet 1, Begegnungszonen                                                               | `engine`, `content`, `models`       |
| `src/game/`    | Spiellogik: Spieler, Kampf, Zauber, Gegner-KI, Boss, Beute, Inventar, Quests, Fortschritt, Spielstand                                                | `engine`, `content`, `world`        |
| `src/ui/`      | HUD, Fenster, Menüs als HTML/CSS über der 3D-Ebene                                                                                                   | `engine`, `content`                 |
| `tests/unit/`  | Logiktests (Vitest)                                                                                                                                  | alles                               |
| `tests/e2e/`   | Browsertests und Testbot (Playwright)                                                                                                                | –                                   |
| `docs/`        | Architektur und Spieldesign                                                                                                                          | –                                   |
| `konzept/`     | **Eingefroren.** Die Konzeptszene bleibt als Referenz, wird nicht mehr geändert.                                                                     | –                                   |
| `ui-stile/`    | **Eingefroren** nach Aufgabe 0.5. Die drei Stilentwürfe bleiben als Referenz.                                                                        | –                                   |

**Abhängigkeitsrichtung** (nur von links nach rechts):

```
content ──┐
          ├──► engine ──► models ──► world ──► game
fx ───────┘                                      │
                                                 │
ui liest den Zustand und sendet ausschließlich ──┘
„absicht:*"-Ereignisse zurück
```

Ein Import entgegen dieser Richtung ist ein Fehler. Braucht ein unteres Paket etwas von oben, läuft das über ein **Ereignis** oder über einen in `engine` definierten Vertrag.

---

## 3. Der Ereignisbus

Die einzige Verbindung zwischen Systemen. Typisiert, synchron, ohne Zwischenspeicher.

```ts
// src/engine/ereignisse.ts
export interface Ereignisse {
  'spieler:bewegt': { position: Vec3; geschwindigkeit: number };
  // … siehe vollständige Liste unten
}

export interface Bus {
  aus<K extends keyof Ereignisse>(e: K, nutzlast: Ereignisse[K]): void;
  an<K extends keyof Ereignisse>(e: K, hoerer: (n: Ereignisse[K]) => void): () => void;
}
```

- `aus` sendet, `an` hört zu und gibt eine Funktion zum Abmelden zurück.
- Ereignisse werden **synchron** zugestellt, noch im selben Simulationsschritt.
- Ein Zuhörer darf senden, aber die Kette bricht nach 8 Ebenen mit einer Warnung ab (Schutz vor Endlosschleifen).
- **Ereignisse beschreiben, was passiert ist, nicht was passieren soll.** Einzige Ausnahme: die `absicht:*`-Ereignisse der Oberfläche.

### Vollständige Ereignisliste

Diese Namen sind verbindlich. Wer ein neues Ereignis braucht, trägt es hier nach **und** nennt es im Abschlussbericht.

**Spieler**

| Ereignis                     | Nutzlast                               |
| ---------------------------- | -------------------------------------- |
| `spieler:bewegt`             | `{ position, geschwindigkeit }`        |
| `spieler:schaden`            | `{ menge, quelle, element, kritisch }` |
| `spieler:geheilt`            | `{ menge, quelle }`                    |
| `spieler:leben-geaendert`    | `{ aktuell, maximum }`                 |
| `spieler:mana-geaendert`     | `{ aktuell, maximum }`                 |
| `spieler:gestorben`          | `{ quelle }`                           |
| `spieler:wiederbelebt`       | `{ position }`                         |
| `spieler:ep-erhalten`        | `{ menge, gesamt }`                    |
| `spieler:stufe-aufgestiegen` | `{ stufe, neueWerte }`                 |
| `spieler:ausgewichen`        | `{ richtung }`                         |

**Kampf und Zauber**

| Ereignis                       | Nutzlast                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `zauber:gewirkt`               | `{ zauberId, wirker, ziel, position }`                                       |
| `zauber:fehlgeschlagen`        | `{ zauberId, grund }` — Grund: `mana`, `abklingzeit` oder `reichweite`       |
| `zauber:abklingzeit-gestartet` | `{ zauberId, dauer }`                                                        |
| `zauber:abklingzeit-beendet`   | `{ zauberId }`                                                               |
| `geschoss:erzeugt`             | `{ geschossId, zauberId, position, richtung }`                               |
| `geschoss:getroffen`           | `{ geschossId, zielId, position }`                                           |
| `geschoss:verfallen`           | `{ geschossId }`                                                             |
| `treffer:gelandet`             | `{ angreifer, ziel, menge, element, kritisch, position }`                    |
| `effekt:angewandt`             | `{ zielId, effekt, dauer }` — Effekt: `brennen`, `einfrieren` oder `raserei` |
| `effekt:abgelaufen`            | `{ zielId, effekt }`                                                         |

**Gegner und Begegnungen**

| Ereignis                    | Nutzlast                              |
| --------------------------- | ------------------------------------- |
| `gegner:erschienen`         | `{ gegnerId, art, position }`         |
| `gegner:schaden`            | `{ gegnerId, menge, leben, maximum }` |
| `gegner:besiegt`            | `{ gegnerId, art, position, ep }`     |
| `gegner:zustand-gewechselt` | `{ gegnerId, von, nach }`             |
| `begegnung:gestartet`       | `{ begegnungId }`                     |
| `begegnung:beendet`         | `{ begegnungId, dauer }`              |
| `begegnung:zurueckgesetzt`  | `{ begegnungId }`                     |
| `boss:phase-gewechselt`     | `{ phase, lebenAnteil }`              |
| `boss:angriff-angekuendigt` | `{ angriff, dauer, form }`            |
| `boss:angriff-ausgefuehrt`  | `{ angriff }`                         |

**Beute und Gegenstände**

| Ereignis                  | Nutzlast                            |
| ------------------------- | ----------------------------------- |
| `beute:gefallen`          | `{ beuteId, gegenstand, position }` |
| `beute:aufgehoben`        | `{ beuteId, gegenstand }`           |
| `gegenstand:ausgeruestet` | `{ gegenstand, platz, vorher }`     |
| `gegenstand:abgelegt`     | `{ gegenstand, platz }`             |
| `trank:benutzt`           | `{ art, menge }`                    |
| `gold:erhalten`           | `{ menge, gesamt }`                 |

**Quest und Interaktion**

| Ereignis                 | Nutzlast                       |
| ------------------------ | ------------------------------ |
| `quest:gestartet`        | `{ questId, titel }`           |
| `quest:schritt-erfuellt` | `{ questId, schrittId }`       |
| `quest:aktualisiert`     | `{ questId, text }`            |
| `quest:abgeschlossen`    | `{ questId }`                  |
| `interaktion:verfuegbar` | `{ objektId, hinweis, taste }` |
| `interaktion:entfallen`  | `{ objektId }`                 |
| `interaktion:ausgeloest` | `{ objektId }`                 |
| `rast:begonnen`          | `{ position }`                 |

**Spielablauf**

| Ereignis                               | Nutzlast                                      |
| -------------------------------------- | --------------------------------------------- |
| `spiel:gestartet`                      | `{ seed }`                                    |
| `spiel:pausiert` / `spiel:fortgesetzt` | `{}`                                          |
| `spiel:gespeichert` / `spiel:geladen`  | `{ zeitpunkt }`                               |
| `spiel:beendet`                        | `{ grund }` — `sieg` oder `abbruch`           |
| `grafikstufe:geaendert`                | `{ stufe }` — `niedrig`, `mittel` oder `hoch` |

**Darstellung und Ton** (nur `fx`, `ui` und die Audio-Grundlage hören zu)

| Ereignis                                          | Nutzlast                          |
| ------------------------------------------------- | --------------------------------- |
| `fx:abspielen`                                    | `{ name, position, dauer }`       |
| `audio:abspielen`                                 | `{ name, position, lautstaerke }` |
| `kamera:wackeln`                                  | `{ staerke, dauer }`              |
| `ui:fenster-geoeffnet` / `ui:fenster-geschlossen` | `{ fenster }`                     |
| `ui:hinweis`                                      | `{ text, dauer }`                 |

**Absichten der Oberfläche** (der einzige Weg von `ui` zurück in die Spiellogik)

| Ereignis                        | Nutzlast               |
| ------------------------------- | ---------------------- |
| `absicht:gegenstand-ausruesten` | `{ gegenstandId }`     |
| `absicht:gegenstand-ablegen`    | `{ platz }`            |
| `absicht:trank-benutzen`        | `{ art }`              |
| `absicht:spiel-pausieren`       | `{}`                   |
| `absicht:einstellung-geaendert` | `{ schluessel, wert }` |

---

## 4. Kernschnittstellen

Alle in `src/engine/` definiert, von dort importieren.

```ts
// Weltzustand — die eine Quelle der Wahrheit
export interface Welt {
  readonly zeit: number; // Sekunden seit Spielstart (Simulationszeit)
  readonly schritt: number; // Nummer des Simulationsschritts
  readonly bus: Bus;
  readonly zufall: Zufall; // Generator mit Startwert
  readonly entitaeten: Entitaeten;

  finde(id: EntitaetId): Entitaet | undefined;
  inUmkreis(position: Vec3, radius: number, marke?: Marke): Entitaet[];
}

// System — jeder Baustein, der pro Schritt rechnet
export interface System {
  readonly name: string;
  readonly reihenfolge: number; // kleiner = früher, siehe Tabelle unten
  starten?(welt: Welt): void;
  schritt(welt: Welt, dt: number): void; // dt ist IMMER 1/60
  rendern?(welt: Welt, anteil: number): void; // anteil zwischen 0 und 1, zum Interpolieren
  beenden?(welt: Welt): void;
}

// Entität — alles, was in der Welt existiert
export interface Entitaet {
  readonly id: EntitaetId;
  readonly marken: Set<Marke>; // spieler, gegner, geschoss, beute, interaktiv, …
  position: Vec3;
  blickrichtung: number; // Bogenmaß
  readonly komponenten: Map<string, unknown>;
}

// Zufall — reproduzierbar
export interface Zufall {
  zahl(): number; // zwischen 0 und 1
  bereich(min: number, max: number): number;
  ganzzahl(min: number, max: number): number;
  waehle<T>(aus: readonly T[]): T;
  abzweig(name: string): Zufall; // eigener Strom, z. B. für Beute
}
```

### Reihenfolge der Systeme pro Schritt

| #   | System                          | Ordner   |
| --- | ------------------------------- | -------- |
| 10  | Eingabe einlesen                | `engine` |
| 20  | Spielerbewegung, Kollision      | `game`   |
| 30  | Zauber wirken, Abklingzeiten    | `game`   |
| 40  | Geschosse bewegen und auswerten | `game`   |
| 50  | Gegner-KI und Wegfindung        | `game`   |
| 60  | Boss-Phasen und Angriffe        | `game`   |
| 70  | Schaden, Zustandseffekte, Tod   | `game`   |
| 80  | Beute, Quest, Fortschritt       | `game`   |
| 90  | Begegnungszonen prüfen          | `world`  |
| 100 | Kamera nachführen               | `engine` |
| 110 | Partikel und Effekte            | `fx`     |
| 120 | Oberfläche aktualisieren        | `ui`     |

---

## 5. Datenformate

Alles unter `src/content/`, als TypeScript mit `as const satisfies …`, damit Tippfehler sofort auffallen.

```ts
// Zauberstab: Holz bestimmt die Grundwerte, Kern den Spezialeffekt,
// die Länge Tempo und Reichweite
export interface Holz {
  id: string;
  name: string;
  zauberkraft: [number, number];
  mana: number;
}
export interface Kern {
  id: string;
  name: string;
  effekt: Affix;
}
export interface Laenge {
  zoll: number;
  tempo: number;
  reichweite: 'kurz' | 'mittel' | 'lang';
}

export interface Zauberstab {
  id: string;
  holz: HolzId;
  kern: KernId;
  laenge: number; // Zoll, z. B. 11.5
  seltenheit: Seltenheit; // gewoehnlich, magisch, selten, einzigartig
  affixe: Affix[];
  beschreibung: string; // der Satz aus der Datei `Zauberstabliste`
  stufe: number; // benötigte Stufe
}

export interface Affix {
  id: string;
  text: string; // „+18 % Feuerschaden"
  wirkung: { art: WirkungsArt; wert: number };
}
```

- **Gegner** (`gegner.ts`): Leben, Schaden, Tempo, Sichtweite, Angriffsreichweite, EP, Beutetabelle, KI-Profil.
- **Zauber** (`zauber.ts`): Manakosten, Abklingzeit, Schaden, Element, Form (Geschoss oder Fläche), Wirkradius, Effekt.
- **Quest** (`quest.ts`): Schritte mit Auslöser, Text vorher und nachher, Belohnung.
- **Texte** (`texte.ts`): **jeder** sichtbare Text als Schlüssel-Wert-Paar. Kein deutscher Satz steht fest im Code. Zugriff über `t('quest.schriftrolle.titel')`.
- **Fortschritt** (`fortschritt.ts`): Kurven für Leben, Mana und Zauberkraft, EP-Schwellen für die Stufen 1 bis 4.

---

## 6. Namen und Schreibweisen

- Dateien: `kleinbuchstaben-mit-bindestrich.ts`
- Typen und Klassen: `GrossSchreibung`, Funktionen und Variablen: `kleinCamelCase`
- **Fachbegriffe auf Deutsch**: `zauberkraft`, `abklingzeit`, `seltenheit`, `begegnung`. Technische Begriffe dürfen englisch bleiben, wenn es keine gute Entsprechung gibt (`Renderer`, `Shader`, `Mesh`).
- Ereignisnamen und Bezeichner im Code sind ASCII, Umlaute dort als `ae`, `oe`, `ue` (`abklingzeit-geaendert`). In **allen sichtbaren Texten** stehen echte Umlaute.
- IDs: `wolf`, `warg`, `irrlicht`, `grimmzahn`, `feuerball`, `frostnova`, `ausweichrolle`.

---

## 7. Regeln für parallel arbeitende Agenten

1. **Nur den eigenen Ordner ändern.** Brauchst du etwas in einem fremden Ordner: nicht selbst bauen, sondern im Abschlussbericht melden.
2. **Gemeinsame Dateien** (`src/engine/ereignisse.ts`, `src/content/texte.ts`, `package.json`) sind Konfliktzonen. Dort nur ergänzen, nie umsortieren oder umformatieren.
3. **Vor der Abgabe müssen laufen:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Bei sichtbaren Änderungen zusätzlich Screenshots.
4. **Keine neuen Abhängigkeiten** ohne Nennung im Bericht, mit Begründung.
5. **Kein `Math.random()`, kein `Date.now()`** in der Spiellogik — nur `welt.zufall` und `welt.zeit`.
6. **Kein fest verdrahteter deutscher Text** in `src/engine/`, `src/game/`, `src/world/`, `src/fx/` — alles über `t()` aus `src/content/texte.ts`.
7. Beim Umgang mit Three.js: Geometrien und Materialien wiederverwenden, bei vielen gleichen Objekten `InstancedMesh`. Das Leistungsbudget legt Aufgabe 3.5 fest.

---

## 8. Debug-Werkzeuge

| Taste | Wirkung                                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| `F3`  | Bildrate, Draw-Calls, Dreiecke, Entitätenzahl, Simulationsschritt                                                                |
| `F4`  | Grafikstufe durchschalten (niedrig / mittel / hoch)                                                                              |
| `F8`  | Fehlerbericht in die Zwischenablage: Seed, Schritt, Position, die letzten 50 Ereignisse, Konsolenfehler, Browser und Grafikkarte |

Der Startwert des Zufallsgenerators steht beim Spielstart in der Konsole und lässt sich über `?seed=…` in der Adresszeile vorgeben.
