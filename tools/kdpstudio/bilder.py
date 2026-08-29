"""Bildpruefung, -aufbereitung und Platzhalter.

Der Platzhalter-Generator ist kein Spielzeug: er erlaubt, die komplette
Produktionskette (Innenteil-PDF, Cover-PDF, EPUB, Vorschau) durchzurechnen,
bevor auch nur eine einzige echte Illustration existiert.  Man sieht damit
sofort, ob Text und Bild auf jeder Seite zusammenpassen, und tauscht die
Platzhalter spaeter 1:1 gegen die fertigen Bilder.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

from . import spezifikation as spez

Image.MAX_IMAGE_PIXELS = None


@dataclass
class Bildbefund:
    pfad: str
    vorhanden: bool
    breite_px: int = 0
    hoehe_px: int = 0
    modus: str = ""
    format: str = ""
    dpi_breite: float = 0.0
    dpi_hoehe: float = 0.0
    hat_alpha: bool = False
    icc: bool = False
    probleme: list[str] = None
    hinweise: list[str] = None

    def __post_init__(self) -> None:
        if self.probleme is None:
            self.probleme = []
        if self.hinweise is None:
            self.hinweise = []

    @property
    def ok(self) -> bool:
        return self.vorhanden and not self.probleme


def pruefen(pfad: str, ziel_breite_zoll: float, ziel_hoehe_zoll: float,
            min_dpi: int = spez.INNENTEIL_DPI_MIN) -> Bildbefund:
    """Prueft ein Bild gegen die Flaeche, auf der es landen soll."""
    if not os.path.exists(pfad):
        return Bildbefund(pfad=pfad, vorhanden=False, probleme=["Datei fehlt"])

    with Image.open(pfad) as im:
        b = Bildbefund(
            pfad=pfad, vorhanden=True, breite_px=im.width, hoehe_px=im.height,
            modus=im.mode, format=im.format or "",
            hat_alpha=im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info,
            icc=bool(im.info.get("icc_profile")),
        )
        dpi = im.info.get("dpi", (0, 0))
        b.dpi_breite, b.dpi_hoehe = float(dpi[0] or 0), float(dpi[1] or 0)

    # Effektive Aufloesung auf der Zielflaeche - das ist die Zahl, die KDP zaehlt.
    eff_x = b.breite_px / ziel_breite_zoll if ziel_breite_zoll else 0
    eff_y = b.hoehe_px / ziel_hoehe_zoll if ziel_hoehe_zoll else 0
    eff = min(eff_x, eff_y)
    if eff < min_dpi:
        b.probleme.append(
            f"Nur {eff:.0f} dpi auf {ziel_breite_zoll:.2f}x{ziel_hoehe_zoll:.2f} Zoll "
            f"(noetig: {min_dpi}). Benoetigt: mind. "
            f"{int(ziel_breite_zoll * min_dpi)}x{int(ziel_hoehe_zoll * min_dpi)} px.")
    elif eff < min_dpi * 1.15:
        b.hinweise.append(f"Knapp ueber der Grenze ({eff:.0f} dpi) - kein Spielraum zum Beschneiden.")

    if b.modus == "CMYK":
        b.hinweise.append("CMYK - KDP akzeptiert das, empfiehlt aber RGB/sRGB.")
    elif b.modus not in ("RGB", "L", "CMYK"):
        b.hinweise.append(f"Farbmodus {b.modus} wird beim Einbetten nach RGB gewandelt.")

    if b.hat_alpha:
        b.hinweise.append("Transparenz vorhanden - wird beim Druck auf Weiss gelegt.")

    ziel_verhaeltnis = ziel_breite_zoll / ziel_hoehe_zoll if ziel_hoehe_zoll else 1
    ist_verhaeltnis = b.breite_px / b.hoehe_px if b.hoehe_px else 1
    if abs(ziel_verhaeltnis - ist_verhaeltnis) / ziel_verhaeltnis > 0.02:
        b.hinweise.append(
            f"Seitenverhaeltnis weicht ab (Bild {ist_verhaeltnis:.3f} vs. Flaeche "
            f"{ziel_verhaeltnis:.3f}) - wird mittig beschnitten.")
    return b


def fuer_druck_aufbereiten(quelle: str, ziel: str, breite_zoll: float, hoehe_zoll: float,
                           dpi: int = 300) -> str:
    """Auf Zielflaeche zuschneiden, Alpha auf Weiss legen, mit DPI-Tag speichern."""
    ziel_b = max(1, int(round(breite_zoll * dpi)))
    ziel_h = max(1, int(round(hoehe_zoll * dpi)))
    with Image.open(quelle) as im:
        if im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info:
            hintergrund = Image.new("RGB", im.size, (255, 255, 255))
            hintergrund.paste(im.convert("RGBA"), mask=im.convert("RGBA").split()[-1])
            im = hintergrund
        elif im.mode != "RGB":
            im = im.convert("RGB")

        # Mittig auf Zielverhaeltnis beschneiden (cover-fit), dann skalieren.
        soll = ziel_b / ziel_h
        ist = im.width / im.height
        if ist > soll:
            neue_breite = int(round(im.height * soll))
            links = (im.width - neue_breite) // 2
            im = im.crop((links, 0, links + neue_breite, im.height))
        elif ist < soll:
            neue_hoehe = int(round(im.width / soll))
            oben = (im.height - neue_hoehe) // 2
            im = im.crop((0, oben, im.width, oben + neue_hoehe))

        im = im.resize((ziel_b, ziel_h), Image.LANCZOS)
        os.makedirs(os.path.dirname(ziel) or ".", exist_ok=True)
        im.save(ziel, "JPEG", quality=92, dpi=(dpi, dpi), subsampling=0, optimize=True)
    return ziel


# ---------------------------------------------------------------------------
# Platzhalter
# ---------------------------------------------------------------------------

_PALETTE = [
    (247, 226, 199), (214, 232, 219), (223, 219, 240), (250, 226, 226),
    (219, 234, 245), (240, 236, 210), (232, 222, 238), (212, 235, 232),
]


def _schrift(groesse: int):
    for kandidat in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ):
        if os.path.exists(kandidat):
            try:
                return ImageFont.truetype(kandidat, groesse)
            except OSError:
                pass
    return ImageFont.load_default()


def platzhalter(ziel: str, breite_zoll: float, hoehe_zoll: float, beschriftung: str,
                szene: str = "", dpi: int = 300) -> str:
    """Erzeugt ein druckfaehiges Platzhalterbild mit Szenennotiz."""
    b = max(1, int(round(breite_zoll * dpi)))
    h = max(1, int(round(hoehe_zoll * dpi)))
    seed = int(hashlib.md5(beschriftung.encode()).hexdigest()[:8], 16)
    grund = _PALETTE[seed % len(_PALETTE)]

    im = Image.new("RGB", (b, h), grund)
    z = ImageDraw.Draw(im)

    # sanfter Verlauf, damit man Beschnitt und Ausrichtung erkennt
    for i in range(h):
        f = i / max(1, h - 1)
        z.line([(0, i), (b, i)],
               fill=tuple(int(c * (1 - 0.18 * f)) for c in grund))

    rahmen = max(4, b // 220)
    z.rectangle([rahmen, rahmen, b - rahmen, h - rahmen],
                outline=(120, 120, 130), width=rahmen)
    z.line([(0, 0), (b, h)], fill=(170, 170, 180), width=max(2, rahmen // 2))
    z.line([(b, 0), (0, h)], fill=(170, 170, 180), width=max(2, rahmen // 2))

    titel_font = _schrift(max(18, b // 16))
    klein_font = _schrift(max(12, b // 34))

    z.text((b // 2, int(h * 0.40)), beschriftung, font=titel_font,
           fill=(60, 60, 70), anchor="mm")
    z.text((b // 2, int(h * 0.52)), f"{b} x {h} px @ {dpi} dpi", font=klein_font,
           fill=(110, 110, 120), anchor="mm")

    if szene:
        worte, zeilen, aktuell = szene.split(), [], ""
        grenze = max(20, b // (klein_font.size // 2 + 1))
        for w in worte:
            if len(aktuell) + len(w) + 1 > grenze:
                zeilen.append(aktuell)
                aktuell = w
            else:
                aktuell = f"{aktuell} {w}".strip()
        if aktuell:
            zeilen.append(aktuell)
        y = int(h * 0.62)
        for zl in zeilen[:6]:
            z.text((b // 2, y), zl, font=klein_font, fill=(95, 95, 105), anchor="mm")
            y += int(klein_font.size * 1.35)

    os.makedirs(os.path.dirname(ziel) or ".", exist_ok=True)
    im.save(ziel, "PNG", dpi=(dpi, dpi))
    return ziel
