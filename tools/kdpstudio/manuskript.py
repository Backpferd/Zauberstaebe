"""Parser fuer manuskript.md.

Format (bewusst simpel, damit man es auch ohne Werkzeug schreiben kann):

    ## Seite 1
    [layout: bild-ganzseitig]
    [bild: 01-werkstatt.png]
    [alt: Lena in der Werkstatt ihres Grossvaters]
    [text-position: unten]

    Es war einmal ein Maedchen namens Lena.
    Sie wohnte ueber der Werkstatt ihres Grossvaters.

Alles zwischen den Direktiven in eckigen Klammern und der naechsten
`## Seite`-Ueberschrift ist Flauftext.  Leerzeilen trennen Absaetze.
Zeilen, die mit `>` beginnen, sind Sprechertext / Zitat (kursiv gesetzt).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

LAYOUTS = {
    "bild-ganzseitig",   # Bild randabfallend ueber die ganze Seite, Text darauf
    "bild-oben",         # Bild oben, Text darunter
    "bild-unten",        # Text oben, Bild darunter
    "nur-text",
    "leer",
}

TEXTPOSITIONEN = {"oben", "mitte", "unten"}

_SEITE_RE = re.compile(r"^##\s+Seite\s+(\d+)\s*(?:[-–—]\s*(.*))?$", re.IGNORECASE)
_DIREKTIVE_RE = re.compile(r"^\[([a-zA-Z0-9_-]+)\s*:\s*(.*?)\]\s*$")
_FLAG_RE = re.compile(r"^\[([a-zA-Z0-9_-]+)\]\s*$")


class ManuskriptFehler(Exception):
    pass


@dataclass
class Seite:
    nummer: int
    ueberschrift: str = ""
    layout: str = "bild-oben"
    bild: str | None = None
    alt: str = ""
    textposition: str = "unten"
    absaetze: list[str] = field(default_factory=list)
    kapitel: str = ""          # optionale Kapitelueberschrift auf der Seite
    notiz: str = ""            # interne Notiz, wird nie gesetzt
    illu_prompt: str = ""      # Szenenbeschreibung fuer die Bildgenerierung

    @property
    def hat_text(self) -> bool:
        return bool(self.absaetze) or bool(self.kapitel)

    @property
    def wortzahl(self) -> int:
        return sum(len(a.split()) for a in self.absaetze)

    @property
    def klartext(self) -> str:
        return "\n\n".join(a.lstrip("> ").strip() for a in self.absaetze)


@dataclass
class Manuskript:
    seiten: list[Seite] = field(default_factory=list)

    @property
    def wortzahl(self) -> int:
        return sum(s.wortzahl for s in self.seiten)

    @property
    def bilder(self) -> list[str]:
        return [s.bild for s in self.seiten if s.bild]

    def seite(self, nummer: int) -> Seite | None:
        for s in self.seiten:
            if s.nummer == nummer:
                return s
        return None


def parsen(text: str) -> Manuskript:
    m = Manuskript()
    aktuell: Seite | None = None
    puffer: list[str] = []

    def absatz_leeren() -> None:
        if aktuell is None:
            return
        roh = "\n".join(puffer).strip()
        puffer.clear()
        if not roh:
            return
        for teil in re.split(r"\n\s*\n", roh):
            teil = " ".join(z.strip() for z in teil.strip().splitlines() if z.strip())
            if teil:
                aktuell.absaetze.append(teil)

    for rohzeile in text.splitlines():
        zeile = rohzeile.rstrip()
        treffer = _SEITE_RE.match(zeile.strip())
        if treffer:
            absatz_leeren()
            aktuell = Seite(nummer=int(treffer.group(1)),
                            ueberschrift=(treffer.group(2) or "").strip())
            m.seiten.append(aktuell)
            continue

        if aktuell is None:
            continue  # alles vor der ersten Seite ist Vorspann-Kommentar

        d = _DIREKTIVE_RE.match(zeile.strip())
        if d:
            absatz_leeren()
            schluessel, wert = d.group(1).lower(), d.group(2).strip()
            if schluessel == "layout":
                if wert not in LAYOUTS:
                    raise ManuskriptFehler(
                        f"Seite {aktuell.nummer}: unbekanntes Layout '{wert}'. "
                        f"Erlaubt: {', '.join(sorted(LAYOUTS))}")
                aktuell.layout = wert
            elif schluessel == "bild":
                aktuell.bild = wert or None
            elif schluessel == "alt":
                aktuell.alt = wert
            elif schluessel in ("text-position", "textposition"):
                if wert not in TEXTPOSITIONEN:
                    raise ManuskriptFehler(
                        f"Seite {aktuell.nummer}: text-position '{wert}' unbekannt. "
                        f"Erlaubt: {', '.join(sorted(TEXTPOSITIONEN))}")
                aktuell.textposition = wert
            elif schluessel == "kapitel":
                aktuell.kapitel = wert
            elif schluessel in ("szene", "illu", "prompt"):
                aktuell.illu_prompt = wert
            elif schluessel == "notiz":
                aktuell.notiz = wert
            else:
                raise ManuskriptFehler(
                    f"Seite {aktuell.nummer}: unbekannte Direktive '[{schluessel}: ...]'")
            continue

        f = _FLAG_RE.match(zeile.strip())
        if f and f.group(1).lower() in LAYOUTS:
            absatz_leeren()
            aktuell.layout = f.group(1).lower()
            continue

        puffer.append(zeile)

    absatz_leeren()

    nummern = [s.nummer for s in m.seiten]
    if nummern != sorted(nummern):
        raise ManuskriptFehler(f"Seitennummern nicht aufsteigend: {nummern}")
    if len(set(nummern)) != len(nummern):
        doppelt = [n for n in set(nummern) if nummern.count(n) > 1]
        raise ManuskriptFehler(f"Doppelte Seitennummern: {doppelt}")
    return m


def datei_parsen(pfad: str) -> Manuskript:
    with open(pfad, encoding="utf-8") as f:
        return parsen(f.read())
