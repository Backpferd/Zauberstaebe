"""Schriftauswahl fuer die PDF-Erzeugung.

KDP verlangt eingebettete Schriften.  ReportLab bettet TrueType-Schriften
automatisch ein; die eingebauten Base-14-Schriften (Helvetica & Co.) sind der
Notnagel, wenn nichts anderes gefunden wird - die sind zwar nicht eingebettet,
werden von KDP bei reinem Fliesstext aber akzeptiert.  Fuer eine
Veroeffentlichung immer eine echte TTF hinterlegen (assets/schriften/).
"""

from __future__ import annotations

import os

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Ordner, in denen nach Schriften gesucht wird - Projektordner zuerst.
SUCHPFADE = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))), "assets", "schriften"),
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/truetype/liberation",
    "/usr/share/fonts/truetype/noto",
    "C:/Windows/Fonts",
    "/Library/Fonts",
    "/System/Library/Fonts/Supplemental",
    os.path.expanduser("~/Library/Fonts"),
]

# Wunschreihenfolge: (interner Name, [Dateikandidaten regular, bold, italic, bolditalic])
FAMILIEN = {
    "text": [
        ("Andika", ["Andika-Regular.ttf", "Andika-Bold.ttf", "Andika-Italic.ttf", "Andika-BoldItalic.ttf"]),
        ("Nunito", ["Nunito-Regular.ttf", "Nunito-Bold.ttf", "Nunito-Italic.ttf", "Nunito-BoldItalic.ttf"]),
        ("Quicksand", ["Quicksand-Regular.ttf", "Quicksand-Bold.ttf", "Quicksand-Regular.ttf", "Quicksand-Bold.ttf"]),
        ("DejaVuSans", ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans-Oblique.ttf", "DejaVuSans-BoldOblique.ttf"]),
        ("LiberationSans", ["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf", "LiberationSans-Italic.ttf", "LiberationSans-BoldItalic.ttf"]),
        ("Verdana", ["verdana.ttf", "verdanab.ttf", "verdanai.ttf", "verdanaz.ttf"]),
    ],
    "titel": [
        ("Baloo2", ["Baloo2-Bold.ttf", "Baloo2-ExtraBold.ttf", "Baloo2-Bold.ttf", "Baloo2-ExtraBold.ttf"]),
        ("Fredoka", ["Fredoka-Bold.ttf", "Fredoka-SemiBold.ttf", "Fredoka-Bold.ttf", "Fredoka-SemiBold.ttf"]),
        ("Nunito", ["Nunito-Bold.ttf", "Nunito-ExtraBold.ttf", "Nunito-Bold.ttf", "Nunito-ExtraBold.ttf"]),
        ("DejaVuSans", ["DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"]),
        ("LiberationSans", ["LiberationSans-Bold.ttf", "LiberationSans-Bold.ttf", "LiberationSans-Bold.ttf", "LiberationSans-Bold.ttf"]),
    ],
}

_registriert: dict[str, str] = {}
_eingebettet: dict[str, bool] = {}


def _finde(dateiname: str) -> str | None:
    for ordner in SUCHPFADE:
        pfad = os.path.join(ordner, dateiname)
        if os.path.exists(pfad):
            return pfad
    return None


def _registriere_familie(basisname: str, dateien: list[str]) -> str | None:
    pfade = [_finde(d) for d in dateien]
    if not pfade[0]:
        return None
    namen = []
    for suffix, pfad in zip(["", "-Bold", "-Italic", "-BoldItalic"], pfade):
        name = basisname + suffix
        quelle = pfad or pfade[0]
        if name not in pdfmetrics.getRegisteredFontNames():
            try:
                pdfmetrics.registerFont(TTFont(name, quelle))
            except Exception:
                return None
        namen.append(name)
    pdfmetrics.registerFontFamily(basisname, normal=namen[0], bold=namen[1],
                                  italic=namen[2], boldItalic=namen[3])
    return basisname


def schrift(rolle: str = "text", wunsch: str | None = None) -> str:
    """Liefert einen registrierten Schriftfamiliennamen fuer 'text' oder 'titel'."""
    schluessel = f"{rolle}:{wunsch or ''}"
    if schluessel in _registriert:
        return _registriert[schluessel]

    kandidaten = list(FAMILIEN.get(rolle, FAMILIEN["text"]))
    if wunsch:
        # Explizit gewuenschte Familie nach vorne ziehen bzw. als Datei behandeln.
        if wunsch.lower().endswith(".ttf"):
            pfad = wunsch if os.path.exists(wunsch) else _finde(os.path.basename(wunsch))
            if pfad:
                name = os.path.splitext(os.path.basename(pfad))[0]
                basis = _registriere_familie(name, [os.path.basename(pfad)] * 4)
                if basis:
                    _registriert[schluessel] = basis
                    _eingebettet[basis] = True
                    return basis
        else:
            kandidaten.sort(key=lambda k: 0 if k[0].lower() == wunsch.lower() else 1)

    for basis, dateien in kandidaten:
        name = _registriere_familie(basis, dateien)
        if name:
            _registriert[schluessel] = name
            _eingebettet[name] = True
            return name

    _registriert[schluessel] = "Helvetica"
    _eingebettet["Helvetica"] = False
    return "Helvetica"


def ist_eingebettet(name: str) -> bool:
    return _eingebettet.get(name, False)


def fett(familie: str) -> str:
    return "Helvetica-Bold" if familie == "Helvetica" else f"{familie}-Bold"


def kursiv(familie: str) -> str:
    return "Helvetica-Oblique" if familie == "Helvetica" else f"{familie}-Italic"
