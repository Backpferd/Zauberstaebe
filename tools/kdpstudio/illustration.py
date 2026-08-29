"""Erzeugt das Illustrations-Briefing fuer die Bildgenerierung.

Das eigentliche Problem bei KI-illustrierten Kinderbuechern ist nicht, ein
huebsches Bild zu bekommen - sondern 30 Bilder zu bekommen, auf denen die
gleiche Figur gleich aussieht.  Deshalb erzeugt dieses Modul:

  1. eine Stil-Bibel (einmal generieren, immer wortgleich mitschicken)
  2. Figurenblaetter (Character Sheets) - zuerst generieren, dann als
     Referenzbild in jeden Folgeprompt haengen
  3. pro Buchseite einen fertigen Prompt inkl. Seitenverhaeltnis und
     Freiraum-Vorgabe fuer den Text

Ausgabe: illustrationen/prompts.md
"""

from __future__ import annotations

import os
import re
import unicodedata

from . import spezifikation as spez
from .manuskript import Manuskript


def dateiname(text: str) -> str:
    """Umlautsichere Ableitung eines Dateinamens aus einem Figurennamen."""
    ersatz = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
              "Ä": "Ae", "Ö": "Oe", "Ü": "Ue"}
    for a, b in ersatz.items():
        text = text.replace(a, b)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return text or "figur"


NEGATIV = ("kein Text, keine Buchstaben, keine Schrift, keine Sprechblasen, "
           "keine Wasserzeichen, keine Rahmen, keine Collage, keine Panels, "
           "keine zusaetzlichen Finger, keine verzerrten Gesichter")


def stilbibel(buch) -> str:
    s = buch.stil or {}
    teile = [
        s.get("technik", "handgemalte Kinderbuchillustration, weiche Aquarellfarben "
                         "mit leichter Buntstiftstruktur"),
        s.get("linien", "weiche, unregelmaessige Konturlinien, keine harten Vektorkanten"),
        s.get("palette", "warme Palette: Honiggelb, Moosgruen, Abendblau, Terrakotta, "
                         "gebrochenes Weiss"),
        s.get("licht", "weiches, seitliches Nachmittagslicht mit langen Schatten"),
        s.get("stimmung", "freundlich, geborgen, leicht magisch"),
        s.get("perspektive", "Augenhoehe eines Kindes, viel Umgebung sichtbar"),
    ]
    extra = s.get("zusatz")
    if extra:
        teile.append(extra)
    return ", ".join(t for t in teile if t)


def figurenblatt(buch, figur: dict) -> str:
    beschreibung = figur.get("beschreibung", "")
    kleidung = figur.get("kleidung", "")
    merkmal = figur.get("merkmal", "")
    return (
        f"Figurenblatt (Character Sheet) fuer ein Kinderbuch. "
        f"Eine einzige Figur, auf neutralem hellem Hintergrund, in fuenf Ansichten "
        f"nebeneinander: Vorderansicht ganzer Koerper, Seitenansicht, Rueckansicht, "
        f"Kopf-Nahaufnahme neutral, Kopf-Nahaufnahme laechelnd.\n"
        f"Figur: {figur.get('name', 'Figur')} - {beschreibung}. "
        f"Kleidung: {kleidung}. Unverwechselbares Merkmal: {merkmal}.\n"
        f"Stil: {stilbibel(buch)}.\n"
        f"Seitenverhaeltnis 16:9. {NEGATIV}."
    )


def _flaeche(buch, layout: str) -> tuple[float, float, str]:
    """Zielflaeche (Zoll) und Textfreiraum-Hinweis fuer ein Seitenlayout."""
    t = buch.trimgroesse
    anschnitt = spez.ANSCHNITT if buch.mit_anschnitt else 0.0
    if layout == "bild-ganzseitig":
        return (t.breite + anschnitt, t.hoehe + 2 * anschnitt,
                "Das Bild laeuft randabfallend ueber die ganze Seite. Im unteren Drittel "
                "ruhige, kontrastarme Flaeche lassen - dort steht der Text. Wichtige "
                "Bildinhalte mindestens 1,5 cm von allen Kanten entfernt halten, weil "
                "beschnitten wird.")
    anteil = float(buch.layout.get("bildanteil", 0.62))
    aussen = buch.rand("aussen", 0.5)
    oben = buch.rand("oben", 0.5)
    unten = buch.rand("unten", 0.5)
    seiten = buch.seiten_soll or 32
    bund = spez.bundsteg(seiten)
    breite = t.breite + anschnitt - (aussen + anschnitt) - bund
    hoehe = (t.hoehe + 2 * anschnitt - oben - unten - 2 * anschnitt) * anteil
    return breite, hoehe, "Bild steht als Block auf der Seite, Text darunter bzw. darueber."


def seitenprompt(buch, seite, breite: float, hoehe: float, hinweis: str) -> str:
    verhaeltnis = f"{breite:.2f}:{hoehe:.2f}"
    px = f"{int(breite * 300)} x {int(hoehe * 300)} px bei 300 dpi"
    szene = seite.illu_prompt or seite.alt or seite.klartext[:200]
    return (
        f"Kinderbuchillustration. Szene: {szene}\n"
        f"Stil (unveraendert uebernehmen): {stilbibel(buch)}.\n"
        f"Figuren wie im beigefuegten Figurenblatt - Gesicht, Haarfarbe, Kleidung und "
        f"Koerperbau muessen exakt uebereinstimmen.\n"
        f"Format: Seitenverhaeltnis {verhaeltnis}, Zielaufloesung {px}.\n"
        f"{hinweis}\n"
        f"{NEGATIV}."
    )


def briefing_schreiben(buch, ms: Manuskript, zielpfad: str | None = None) -> str:
    ziel = zielpfad or os.path.join(buch.bildordner, "prompts.md")
    os.makedirs(os.path.dirname(ziel), exist_ok=True)

    z: list[str] = []
    A = z.append
    A(f"# Illustrations-Briefing: {buch.voller_titel}\n")
    A("Erzeugt von `kdp prompts`. Nicht von Hand aendern - stattdessen "
      "`buch.yaml` (Abschnitt `illustration`) und `manuskript.md` (`[szene: ...]`) "
      "anpassen und neu erzeugen.\n")

    A("## Reihenfolge - genau so abarbeiten\n")
    A("1. **Stil-Testbild**: den Stilblock unten mit einer beliebigen Szene generieren, "
      "bis der Stil sitzt. Erst dann weiter.")
    A("2. **Figurenblaetter**: fuer jede Figur einmal generieren, Ergebnis speichern "
      "als `illustrationen/figur-<name>.png`.")
    A("3. **Seitenbilder**: pro Seite den Prompt unten benutzen und das passende "
      "Figurenblatt als Referenzbild anhaengen. In ChatGPT/DALL-E im selben Chat "
      "bleiben - der Bildkontext haelt die Figur stabil.")
    A("4. Bild unter dem angegebenen Dateinamen in `illustrationen/` ablegen.")
    A("5. `kdp bauen` erneut laufen lassen - `kdp pruefen` meldet, wenn die "
      "Aufloesung fuer den Druck nicht reicht.\n")

    A("## Stil-Bibel (in JEDEN Prompt kopieren)\n")
    A("```")
    A(stilbibel(buch))
    A("```\n")

    A("## Figurenblaetter\n")
    if not buch.figuren:
        A("_Keine Figuren in buch.yaml hinterlegt (`illustration.figuren`). "
          "Ohne Figurenblatt sehen die Figuren auf jeder Seite anders aus._\n")
    for f in buch.figuren:
        name = f.get("name", "figur")
        A(f"### {name}  ->  `illustrationen/figur-{dateiname(name)}.png`\n")
        A("```")
        A(figurenblatt(buch, f))
        A("```\n")

    A("## Seitenbilder\n")
    A(f"| Seite | Datei | Layout | Zielgroesse (px @300dpi) |")
    A("| --- | --- | --- | --- |")
    for s in ms.seiten:
        if not s.bild:
            continue
        b, h, _ = _flaeche(buch, s.layout)
        A(f"| {s.nummer} | `{s.bild}` | {s.layout} | {int(b * 300)} x {int(h * 300)} |")
    A("")

    for s in ms.seiten:
        if not s.bild:
            continue
        b, h, hinweis = _flaeche(buch, s.layout)
        A(f"### Seite {s.nummer}  ->  `illustrationen/{s.bild}`\n")
        if s.absaetze:
            A(f"> Buchtext dieser Seite: {s.klartext[:300]}\n")
        A("```")
        A(seitenprompt(buch, s, b, h, hinweis))
        A("```\n")

    cover = buch.daten.get("cover", {}) or {}
    if cover.get("front_bild"):
        geo = buch.covergeometrie(buch.seiten_soll or 32)
        b = geo.trim_breite + spez.ANSCHNITT
        h = geo.gesamt_hoehe
        A(f"### Frontcover  ->  `illustrationen/{cover['front_bild']}`\n")
        A("```")
        A(f"Buchcover-Illustration fuer ein Kinderbuch. Szene: "
          f"{cover.get('front_szene', 'die Hauptfigur in der zentralen Szene des Buches')}\n"
          f"Stil: {stilbibel(buch)}.\n"
          f"Format: {b:.2f}:{h:.2f}, Zielaufloesung {int(b * 300)} x {int(h * 300)} px "
          f"bei 300 dpi.\n"
          f"Oberes Drittel und unteres Fuenftel ruhig und kontrastarm halten - dort "
          f"liegen Titel und Autorenname. Hauptfigur mittig, Blick zum Betrachter, "
          f"auch als Daumennagel bei 200 px Breite noch erkennbar.\n"
          f"{NEGATIV}.")
        A("```\n")
    if cover.get("rueck_bild"):
        A(f"### Rueckseite  ->  `illustrationen/{cover['rueck_bild']}`\n")
        A("```")
        A(f"Hintergrundillustration fuer die Rueckseite eines Kinderbuchs. Szene: "
          f"{cover.get('rueck_szene', 'ruhiger Ausschnitt der Buchwelt, ohne Figuren im Zentrum')}\n"
          f"Stil: {stilbibel(buch)}.\n"
          f"Sehr ruhig und kontrastarm - darauf liegt der Klappentext. "
          f"Unten rechts ein Bereich von etwa 5 x 3 cm frei und hell halten "
          f"(dort druckt Amazon den Barcode).\n"
          f"{NEGATIV}.")
        A("```\n")

    with open(ziel, "w", encoding="utf-8") as f:
        f.write("\n".join(z))
    return ziel
