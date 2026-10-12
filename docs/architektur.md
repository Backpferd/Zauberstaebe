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

| Ordner          | Inhalt                                                                                                                                               | Darf importieren aus                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `src/engine/`   | Spielschleife, Zeit, Ereignisbus, Entitäten, Eingabe, Kamera, Renderer, Licht und Schatten, Audio-Grundlage, Seed-Zufall, Texttabelle, Debug (F3/F8) | – (nur Three.js und eigene Dateien) |
| `src/content/`  | Alle Daten und Texte: Zauberstäbe, Affixe, Seltenheiten, Zauber, Gegner, Quest, Begegnungen, Stufenkurven                                            | – (reine Daten, keine Logik)        |
| `src/models/`   | Prozedurale 3D-Modelle und ihre Animationen: Zauberer, Wolf, Warg, Irrlicht, Grimmzahn, Requisiten                                                   | `engine`                            |
| `src/fx/`       | Partikel, Zauber- und Treffereffekte, Warnmarkierungen am Boden, Bildschirmwackeln                                                                   | `engine`                            |
| `src/world/`    | Gelände, Wege, Vegetation, Kollision, Wegfindung, Aufbau von Gebiet 1, Begegnungszonen                                                               | `engine`, `content`, `models`       |
| `src/game/`     | Spiellogik: Spieler, Kampf, Zauber, Gegner-KI, Boss, Beute, Inventar, Quests, Fortschritt, Spielstand                                                | `engine`, `content`, `world`        |
| `src/ui/`       | HUD, Fenster, Menüs als HTML/CSS über der 3D-Ebene                                                                                                   | `engine`, `content`                 |
| `src/vorschau/` | Vorschauseiten zum Testen einzelner Bausteine, je Agent **eine eigene Datei** (Abschnitt 10)                                                         | alles                               |
| `tests/unit/`   | Logiktests (Vitest)                                                                                                                                  | alles                               |
| `tests/e2e/`    | Browsertests und Testbot (Playwright)                                                                                                                | –                                   |
| `docs/`         | Architektur und Spieldesign                                                                                                                          | –                                   |
| `konzept/`      | **Eingefroren.** Die Konzeptszene bleibt als Referenz, wird nicht mehr geändert.                                                                     | –                                   |
| `ui-stile/`     | **Eingefroren** nach Aufgabe 0.5. Die drei Stilentwürfe bleiben als Referenz.                                                                        | –                                   |

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
3. **Vor der Abgabe müssen laufen:** `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build` und `npm run test:e2e`. Bei sichtbaren Änderungen zusätzlich Screenshots.
4. **`src/main.ts` fasst in Welle 1 und 2 niemand an.** Dein Baustein wird über eine eigene Vorschauseite gezeigt (Abschnitt 10). Das Zusammenstecken zum Spiel macht die Hauptsitzung.
5. **Keine neuen Abhängigkeiten** ohne Nennung im Bericht, mit Begründung.
6. **Kein `Math.random()`, kein `Date.now()`** in der Spiellogik — nur `welt.zufall` und `welt.zeit`.
7. **Kein fest verdrahteter deutscher Text** in `src/engine/`, `src/game/`, `src/world/`, `src/fx/` — alles über `t()` aus `src/content/texte.ts`.
8. Beim Umgang mit Three.js: Geometrien und Materialien wiederverwenden, bei vielen gleichen Objekten `InstancedMesh`. Das Leistungsbudget legt Aufgabe 3.5 fest.

---

## 8. Debug-Werkzeuge

| Taste | Wirkung                                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| `F3`  | Bildrate, Draw-Calls, Dreiecke, Entitätenzahl, Simulationsschritt                                                                |
| `F4`  | Grafikstufe durchschalten (niedrig / mittel / hoch)                                                                              |
| `F8`  | Fehlerbericht in die Zwischenablage: Seed, Schritt, Position, die letzten 50 Ereignisse, Konsolenfehler, Browser und Grafikkarte |

Der Startwert des Zufallsgenerators steht beim Spielstart in der Konsole und lässt sich über `?seed=…` in der Adresszeile vorgeben.

---

## 9. Engine-Kern: so benutzt du ihn

> Stand: 06.10.2026 · Aufgabe 0.3

Alles kommt aus **einer** Datei. Was dort nicht exportiert wird, ist intern.

```ts
import { komponente, t, type System, type Welt } from '@engine/index';
```

| Datei            | Inhalt                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| `ereignisse.ts`  | Alle Ereignisse mit Nutzlasten (Konfliktzone: nur ergänzen)                |
| `bus.ts`         | Ereignisbus mit Tiefenbegrenzung und Verlauf der letzten 50 Ereignisse     |
| `zufall.ts`      | Seed-Zufall, `seedAusAdresse`                                              |
| `welt.ts`        | `Welt`, `System`, `SCHRITT = 1/60`                                         |
| `entitaeten.ts`  | Entitäten, Marken (Konfliktzone), Komponenten, Interpolation               |
| `schleife.ts`    | `Simulation` (Schritte), `Spielschleife` (Bildwiederholung), `ManuelleUhr` |
| `eingabe.ts`     | Aktionen, Belegung, eingefrorener Zustand (System 10)                      |
| `kamera.ts`      | Kamera der Konzeptszene, folgt weich (System 100), Wackeln, Mausstrahl     |
| `renderer.ts`    | WebGL, Nebel, Licht, AO, Bloom, Grafikstufen                               |
| `schatten.ts`    | Mondlicht mit Schatten, folgt dem Fokus (Feinabstimmung: Aufgabe 1.4)      |
| `grafikstufe.ts` | Stufen `niedrig`/`mittel`/`hoch` und was sie einstellen                    |
| `texte.ts`       | `t()` und `registriereTexte()`                                             |
| `audio.ts`       | AudioContext, Kanäle `gesamt`/`effekte`/`umgebung`, Klangerzeuger          |
| `debug.ts`       | F3, F8, Fehlersammler, `window.__zauberstaebe`                             |
| `engine.ts`      | `erzeugeEngine()`: baut alles zusammen; `main.ts` hängt die Systeme daran  |

### 9.1 Ein System anlegen

Systeme sind schlichte Objekte. Was sie von außen brauchen (Eingabe, Szene), bekommen sie über eine Fabrikfunktion, nie über Importe anderer Systeme. Eingehängt werden sie in `main.ts` mit `engine.systemHinzufuegen(…)`.

```ts
import { type Eingabe, type System } from '@engine/index';

export function erzeugeSpielerSystem(eingabe: Eingabe): System {
  return {
    name: 'spieler',
    reihenfolge: 20, // Tabelle in Abschnitt 4
    starten(welt) {
      /* einmalig: Entitäten anlegen, Zuhörer anmelden */
    },
    schritt(welt, dt) {
      // dt ist immer 1/60. Zeit nur über welt.zeit, Zufall nur über welt.zufall.
      const { bewegung } = eingabe.zustand;
      // …
    },
    beenden(welt) {
      /* Zuhörer abmelden */
    },
  };
}
```

- `schritt` ändert den Zustand, `rendern(welt, anteil)` zeichnet ihn nur. Reine Darstellungssysteme (Modelle, Effekte) haben ein leeres `schritt() {}`.
- Wirft ein System, meldet die Engine den Fehler einmal in der Konsole und läuft weiter.
- Zufall für einen eigenen Bereich: `welt.zufall.abzweig('beute')`. Der Strom hängt nur vom Seed und vom Namen ab, nicht davon, wie viel andere Systeme ziehen.

### 9.2 Eine Entität mit Komponente erzeugen

```ts
import { brauchtKomponente, komponente, mit, vec3 } from '@engine/index';

// Einmal pro Komponente, als Konstante im eigenen Ordner. Der Name muss eindeutig sein.
export const LEBEN = komponente<{ aktuell: number; maximum: number }>('leben');

const wolf = welt.entitaeten.anlegen({
  marken: ['gegner'],
  position: vec3(4, 0, -2), // wird kopiert
  blickrichtung: Math.PI,
  komponenten: [mit(LEBEN, { aktuell: 30, maximum: 30 })],
});

for (const gegner of welt.entitaeten.mitMarke('gegner')) {
  const leben = brauchtKomponente(gegner, LEBEN); // wirft, wenn sie fehlt
  if (leben.aktuell <= 0) welt.entitaeten.entfernen(gegner);
}
const nah = welt.inUmkreis(spieler.position, 6, 'gegner'); // XZ-Ebene, Rand eingeschlossen
```

- **Entfernen wirkt am Schrittende.** Bis dahin fehlt die Entität schon in `alle`, `mitMarke` und `inUmkreis`, `finde(id)` liefert sie aber noch (mit `entfernt === true`).
- IDs sind fortlaufende Zahlen ab 1 und werden nie wiederverwendet.
- `holeKomponente` liefert `undefined`, wenn die Komponente fehlt; `setzeKomponente`, `hatKomponente` und `entferneKomponente` ergänzen das.
- **Blickrichtung**: Bogenmaß wie `rotation.y` in Three.js. 0 schaut nach +z (zur Kamera), π/2 nach +x. Helfer: `winkelZu(von, nach)`, `richtungAusWinkel(winkel)`.
- Neue Marken werden wie Ereignisse nur ergänzt (`Marke` in `entitaeten.ts`) und im Bericht genannt.

### 9.3 Ein Ereignis senden und empfangen

```ts
// Senden: beschreibt, was passiert ist.
welt.bus.aus('gegner:besiegt', { gegnerId: wolf.id, art: 'wolf', position: wolf.position, ep: 12 });

// Empfangen: im starten() anmelden, im beenden() abmelden.
let abmelden = (): void => {};
const system: System = {
  name: 'beute',
  reihenfolge: 80,
  starten(welt) {
    abmelden = welt.bus.an('gegner:besiegt', ({ position, art }) => {
      /* Beute würfeln … */
    });
  },
  schritt() {},
  beenden() {
    abmelden();
  },
};
```

- Zustellung ist synchron. Positionen in Nutzlasten sind Momentaufnahmen: Wer sie aufbewahrt, kopiert sie mit `kopiereVec3`.
- Anzeigetexte in Nutzlasten (`titel`, `text`, `hinweis`) sind schon übersetzt, also Ergebnisse von `t()`.
- `absicht:*`-Ereignisse kommen aus der Oberfläche, also außerhalb eines Schritts. Spiellogik merkt sie sich im Zuhörer und führt sie im nächsten `schritt` aus, damit alles reproduzierbar bleibt.
- Die Spielschleife sendet `spiel:pausiert` und `spiel:fortgesetzt` selbst, wenn sie anhält oder weiterläuft (Tab verborgen, Pausenmenü). Auf `absicht:spiel-pausieren` pausiert sie mit dem Grund `'menue'`; fortgesetzt wird mit `engine.schleife.fortsetzen('menue')`.

### 9.4 Einen Text holen

```ts
// src/content/texte.ts (nur ergänzen):
'beute.gold': '+{menge} Gold',

// irgendwo in game, ui, fx:
import { t } from '@engine/index';
t('beute.gold', { menge: 37 }); // „+37 Gold“, Zahlen deutsch formatiert („1.234,5“)
```

Ein fehlender Schlüssel ergibt `⟦beute.gold⟧` und eine Warnung in der Konsole, nie einen Absturz. `main.ts` registriert die Tabelle beim Start; Tests rufen selbst `registriereTexte(texte)` auf.

### 9.5 Die Grafikstufe abfragen

```ts
import { aktuelleGrafikstufe } from '@engine/index';

let funkenProTreffer = aktuelleGrafikstufe() === 'niedrig' ? 8 : 24;
welt.bus.an('grafikstufe:geaendert', ({ stufe }) => {
  funkenProTreffer = stufe === 'niedrig' ? 8 : 24;
});
```

Umschalten: Taste F4, `engine.renderer.setzeStufe('hoch')` oder `bus.aus('grafikstufe:geaendert', { stufe: 'hoch' })`. Was jede Stufe einstellt, steht in `STUFEN_EINSTELLUNGEN`. Startstufe für Tests: `?grafik=niedrig`.

### 9.6 Rendern und Interpolieren

```ts
rendern(welt, anteil) {
  for (const gegner of welt.entitaeten.mitMarke('gegner')) {
    const mesh = meshes.get(gegner.id); // eigene Map<EntitaetId, Mesh>
    interpolierePosition(gegner, anteil, ort); // zwischen letztem und aktuellem Schritt
    mesh.position.set(ort.x, ort.y, ort.z);
    mesh.rotation.y = interpoliereBlickrichtung(gegner, anteil);
  }
  // Meshes, deren ID nicht mehr vorkommt, aus der Szene nehmen.
}
```

- Die Szene ist `engine.renderer.szene`, die Kamera `engine.kamera`.
- Wer eine Entität versetzt (Wiederbeleben, Rast), nutzt `teleportiere(entitaet, position)`, sonst gleitet sie ein Bild lang durch die Welt.
- Transparente Effekte (Partikel, Sprites) kommen auf `EBENE_EFFEKTE`: `objekt.layers.set(EBENE_EFFEKTE)`. Dann zeichnet die Umgebungsverdeckung keine dunklen Ränder darum.
- Kamera wackeln lassen: `bus.aus('kamera:wackeln', { staerke: 0.2, dauer: 0.3 })` (Meter, Sekunden).
- Lichter nicht pro Geschoss anlegen und entfernen: Jede Änderung der Lichtzahl kompiliert alle Shader neu und ruckelt.

### 9.7 Eingabe

- `eingabe.zustand` ist pro Schritt eingefroren: `gehalten('ausweichen')`, `gedrueckt('zauber-primaer')` (Flanke, geht auch bei kurzen Tippern nicht verloren), `losgelassen(…)`.
- `zustand.bewegung` ist die WASD-Richtung auf dem Boden (W = −z, D = +x, diagonal normiert), `zustand.ziel` der Punkt unter der Maus auf der Ebene in Höhe `eingabe.zielHoehe` (Standard 0).
- Für Dinge, die auch in der Pause wirken müssen (Escape-Menü): `eingabe.beiAktion('menue', () => …)`.
- Umbelegen (Aufgabe 3.2): `eingabe.belegen('ausweichen', ['ShiftLeft'])`, `eingabe.belegung`, `belegungZuruecksetzen()`. Tasten sind `KeyboardEvent.code`-Werte, Maustasten `MausLinks`, `MausRechts`, `MausMitte`.

### 9.8 Testen ohne Browser

```ts
const welt = erzeugeWelt({ seed: 42 });
const simulation = new Simulation(welt);
const eingabe = new Eingabe();
simulation.hinzufuegen(erzeugeEingabeSystem(eingabe));
simulation.hinzufuegen(erzeugeSpielerSystem(eingabe));
eingabe.tasteRunter('KeyW');
eingabe.setzeZiel(vec3(5, 0, 0)); // statt Maus
simulation.schritte(60); // genau eine Sekunde Spielzeit
```

Mit `ManuelleUhr` lässt sich auch die `Spielschleife` bildgenau treiben (`uhr.bild(16.7)`). Im Browser (Dev-Modus oder `?debug`) gibt es `window.__zauberstaebe` mit `welt`, `schritt`, `bilder`, `seed`, `grafikstufe`, `spieler()`, `entitaeten()`, `ereignisse()`, `fehlerbericht()` und `simuliere(n)`. Nur lesen: Wer dort Zustand ändert, macht den Lauf unreproduzierbar.

---

## 10. Vorschauseiten

Damit jeder Baustein im Browser prüfbar ist, ohne dass parallel arbeitende Agenten dieselbe Datei ändern, gibt es Vorschauseiten.

- Jede Datei `src/vorschau/<name>.ts` ist über `?szene=<name>` erreichbar, zum Beispiel `http://localhost:5173/Zauberstaebe/?szene=spieler`.
- Ohne `?szene=` startet `testszene`. Ein unbekannter Name fällt mit einer Warnung in der Konsole auf `testszene` zurück.
- Eine Vorschau exportiert eine Standardfunktion und optional einen Titel:

```ts
import type { Engine } from '@engine/index';

export const titel = 'Spielerfigur (1.1)';

export default function (engine: Engine): void {
  // Szene aufbauen, Systeme mit engine.systemHinzufuegen(…) anmelden.
  // engine.starten() ruft main.ts danach selbst auf.
}
```

- **Jeder Agent legt nur seine eigene Datei an** und benennt sie nach seinem Baustein. Fremde Vorschauen werden nicht geändert.
- Vorschauseiten sind Entwicklerwerkzeuge. Sie dürfen aus allen Ordnern importieren und fest verdrahtete deutsche Texte enthalten. Spiellogik gehört aber nicht hierher, sondern in den zuständigen Ordner.
- Vite lädt jede Vorschau als eigene Datei nach. Im fertigen Spiel kosten sie deshalb nichts.
- Browsertests laden eine Vorschau mit `page.goto('./?szene=<name>&grafik=niedrig')`. **Echtzeit-Prüfungen immer mit `grafik=niedrig`**: Der Software-Renderer der Tests schafft mit AO und Bloom weniger als ein Bild pro Sekunde.
