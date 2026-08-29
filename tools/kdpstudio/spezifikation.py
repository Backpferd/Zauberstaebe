"""KDP-Spezifikationen und die Rechnerei drumherum.

Alle Masse werden intern in Zoll (inch) gefuehrt, weil KDP seine Vorgaben so
veroeffentlicht.  Die Umrechnung nach Millimeter bzw. PDF-Punkten passiert erst
an der Oberflaeche.

WICHTIG: Die Zahlen hier bilden den Stand ab, der in konfig/kdp-regeln.yaml
dokumentiert ist.  Amazon aendert Trimgroessen und vor allem Druckkosten
gelegentlich.  Vor der ersten Veroeffentlichung einmal gegenpruefen:
https://kdp.amazon.com/help/topic/G201834180  (Druckkosten)
https://kdp.amazon.com/help/topic/G201834180  (Trimgroessen / Raender)
"""

from __future__ import annotations

from dataclasses import dataclass, field

ZOLL_IN_MM = 25.4
ZOLL_IN_PUNKT = 72.0


def mm(zoll: float) -> float:
    return zoll * ZOLL_IN_MM


def pt(zoll: float) -> float:
    return zoll * ZOLL_IN_PUNKT


# --------------------------------------------------------------------------
# Trimgroessen
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class Trimgroesse:
    name: str
    breite: float          # Zoll
    hoehe: float           # Zoll
    standard: bool = True  # Standardgroesse = guenstiger + alle Marktplaetze
    hinweis: str = ""

    @property
    def bezeichnung(self) -> str:
        return f"{self.breite}\" x {self.hoehe}\" ({mm(self.breite):.1f} x {mm(self.hoehe):.1f} mm)"


TRIMGROESSEN: dict[str, Trimgroesse] = {
    t.name: t
    for t in [
        # Klassische Bilderbuch-Formate
        Trimgroesse("8.5x8.5", 8.5, 8.5, True, "Quadrat - Klassiker fuer Bilderbuecher 3-6 Jahre"),
        Trimgroesse("8.25x8.25", 8.25, 8.25, True, "Quadrat, etwas kompakter"),
        Trimgroesse("8.5x11", 8.5, 11.0, True, "Gross, Hochformat - Mal- und Aktivitaetsbuecher"),
        Trimgroesse("8x10", 8.0, 10.0, True, "Hochformat Bilderbuch"),
        Trimgroesse("7.5x9.25", 7.5, 9.25, True, "Hochformat, guenstiger Druck"),
        Trimgroesse("8.25x6", 8.25, 6.0, True, "Querformat - Bilderbuch"),
        Trimgroesse("7x10", 7.0, 10.0, True, "Hochformat"),
        # Erstleser / Vorlesebuecher / Kapitelbuecher
        Trimgroesse("6x9", 6.0, 9.0, True, "Standard-Taschenbuch, Kapitelbuecher ab 7 Jahren"),
        Trimgroesse("5.5x8.5", 5.5, 8.5, True, "Kompaktes Taschenbuch"),
        Trimgroesse("5x8", 5.0, 8.0, True, "Klein, Erstleser"),
        Trimgroesse("6.14x9.21", 6.14, 9.21, True, "Royal"),
        Trimgroesse("8.27x11.69", 8.27, 11.69, True, "A4"),
    ]
}


# --------------------------------------------------------------------------
# Papier / Tinte
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class Papier:
    name: str
    ruecken_pro_seite: float   # Zoll Ruecken pro Buchseite
    farbe: bool
    beschreibung: str


PAPIERSORTEN: dict[str, Papier] = {
    p.name: p
    for p in [
        Papier("sw-weiss", 0.002252, False, "Schwarz-weiss auf weissem Papier"),
        Papier("sw-creme", 0.0025, False, "Schwarz-weiss auf cremefarbenem Papier"),
        Papier("farbe-standard", 0.002252, True, "Standardfarbe auf weissem Papier"),
        Papier("farbe-premium", 0.002347, True, "Premiumfarbe auf weissem Papier - fuer Bilderbuecher"),
    ]
}


# --------------------------------------------------------------------------
# Harte KDP-Regeln
# --------------------------------------------------------------------------

MIN_SEITEN_SW = 24
MIN_SEITEN_FARBE = 24
MAX_SEITEN = 828
MIN_SEITEN_FUER_RUECKENTEXT = 79
RUECKENTEXT_ABSTAND = 0.0625      # Zoll Freiraum links/rechts vom Ruecken
ANSCHNITT = 0.125                 # Zoll Bleed pro angeschnittener Kante
COVER_DPI_MIN = 300
INNENTEIL_DPI_MIN = 300
EBOOK_COVER_IDEAL = (1600, 2560)
EBOOK_COVER_MIN_LANGE_SEITE = 1000
EBOOK_COVER_SEITENVERHAELTNIS = 1.6
BESCHREIBUNG_MAX_ZEICHEN = 4000
KEYWORD_ANZAHL = 7
KEYWORD_MAX_ZEICHEN = 50

# Bundsteg (innerer Rand) nach Seitenzahl - KDP-Mindestwerte in Zoll
BUNDSTEG_STAFFEL: list[tuple[int, int, float]] = [
    (24, 150, 0.375),
    (151, 300, 0.5),
    (301, 500, 0.625),
    (501, 700, 0.75),
    (701, 828, 0.875),
]

AUSSENRAND_MIN_OHNE_ANSCHNITT = 0.25
AUSSENRAND_MIN_MIT_ANSCHNITT = 0.375


def bundsteg(seiten: int) -> float:
    """Mindest-Bundsteg in Zoll fuer eine Seitenzahl."""
    for von, bis, wert in BUNDSTEG_STAFFEL:
        if von <= seiten <= bis:
            return wert
    if seiten < 24:
        return 0.375
    return 0.875


def aussenrand_min(mit_anschnitt: bool) -> float:
    return AUSSENRAND_MIN_MIT_ANSCHNITT if mit_anschnitt else AUSSENRAND_MIN_OHNE_ANSCHNITT


def ruecken_breite(seiten: int, papier: str) -> float:
    """Ruecken-Breite in Zoll."""
    p = PAPIERSORTEN[papier]
    return seiten * p.ruecken_pro_seite


# --------------------------------------------------------------------------
# Abgeleitete Seitengeometrie
# --------------------------------------------------------------------------

@dataclass
class Innenteilgeometrie:
    """Alle Masse fuer eine Innenteil-Seite, in Zoll."""
    trim_breite: float
    trim_hoehe: float
    mit_anschnitt: bool
    seiten: int

    # gefuellt in __post_init__
    dokument_breite: float = field(init=False)
    dokument_hoehe: float = field(init=False)
    anschnitt: float = field(init=False)
    bundsteg: float = field(init=False)

    def __post_init__(self) -> None:
        self.anschnitt = ANSCHNITT if self.mit_anschnitt else 0.0
        # Anschnitt kommt oben, unten und an der Aussenkante dazu - nie am Bund.
        self.dokument_breite = self.trim_breite + self.anschnitt
        self.dokument_hoehe = self.trim_hoehe + 2 * self.anschnitt
        self.bundsteg = bundsteg(self.seiten)

    def satzspiegel(self, seitennummer: int, aussenrand: float, kopfrand: float,
                    fussrand: float) -> tuple[float, float, float, float]:
        """Textrahmen (x, y, breite, hoehe) in Zoll, Ursprung unten links im Dokument.

        seitennummer ist 1-basiert.  Ungerade Seiten sind rechte Seiten
        (Bund links), gerade Seiten sind linke Seiten (Bund rechts).
        """
        rechte_seite = seitennummer % 2 == 1
        if rechte_seite:
            # Bund links, Aussenkante (mit Anschnitt) rechts
            links = self.bundsteg
            rechts = aussenrand + self.anschnitt
        else:
            links = aussenrand + self.anschnitt
            rechts = self.bundsteg
        breite = self.dokument_breite - links - rechts
        x = links
        y = fussrand + self.anschnitt
        hoehe = self.dokument_hoehe - (kopfrand + self.anschnitt) - y
        return x, y, breite, hoehe

    def trim_versatz(self, seitennummer: int) -> tuple[float, float]:
        """Position der unteren linken Trim-Ecke im Dokument (Zoll)."""
        rechte_seite = seitennummer % 2 == 1
        x = 0.0 if rechte_seite else self.anschnitt
        return x, self.anschnitt


@dataclass
class Covergeometrie:
    """Masse fuer das durchgehende Print-Cover (Rueck + Ruecken + Front)."""
    trim_breite: float
    trim_hoehe: float
    seiten: int
    papier: str

    ruecken: float = field(init=False)
    gesamt_breite: float = field(init=False)
    gesamt_hoehe: float = field(init=False)

    def __post_init__(self) -> None:
        self.ruecken = ruecken_breite(self.seiten, self.papier)
        self.gesamt_breite = 2 * ANSCHNITT + 2 * self.trim_breite + self.ruecken
        self.gesamt_hoehe = 2 * ANSCHNITT + self.trim_hoehe

    @property
    def ruecken_links(self) -> float:
        return ANSCHNITT + self.trim_breite

    @property
    def ruecken_rechts(self) -> float:
        return self.ruecken_links + self.ruecken

    @property
    def front_links(self) -> float:
        return self.ruecken_rechts

    @property
    def rueckseite_links(self) -> float:
        return ANSCHNITT

    @property
    def ruecken_text_erlaubt(self) -> bool:
        return self.seiten >= MIN_SEITEN_FUER_RUECKENTEXT

    @property
    def ruecken_text_breite(self) -> float:
        return max(0.0, self.ruecken - 2 * RUECKENTEXT_ABSTAND)

    def barcode_bereich(self) -> tuple[float, float, float, float]:
        """Von Amazon fuer den Barcode reservierte Flaeche auf der Rueckseite.

        2" x 1.2", unten rechts auf der Rueckseite, 0.25" vom Trimrand.
        Dort darf nichts Wichtiges liegen.
        """
        b, h = 2.0, 1.2
        x = self.rueckseite_links + self.trim_breite - 0.25 - b
        y = ANSCHNITT + 0.25
        return x, y, b, h
