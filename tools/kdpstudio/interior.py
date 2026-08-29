"""Innenteil-PDF fuer KDP-Taschenbuecher (Print on Demand).

Erzeugt ein PDF, das exakt der KDP-Vorgabe entspricht:
  * Dokumentgroesse = Trim + Anschnitt (oben/unten/aussen), nie am Bund
  * Bundsteg nach Seitenzahl-Staffel, wechselnd links/rechts
  * Bilder mit >= 300 dpi auf der tatsaechlichen Platzierungsflaeche
  * gerade Gesamtseitenzahl, Mindestumfang beachtet
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import Paragraph

from . import bilder as bildmodul
from . import spezifikation as spez
from . import typografie
from .manuskript import Manuskript, Seite

PT = spez.ZOLL_IN_PUNKT


@dataclass
class Druckseite:
    art: str                     # titel | impressum | story | text | leer
    quelle: Seite | None = None
    ueberschrift: str = ""
    absaetze: list[str] = field(default_factory=list)


@dataclass
class Bauergebnis:
    pdf: str
    seiten: int
    seitenplan: list[Druckseite]
    warnungen: list[str] = field(default_factory=list)
    bildbefunde: list = field(default_factory=list)


class InnenteilBauer:
    def __init__(self, buch, manuskript: Manuskript, platzhalter: bool = True):
        self.buch = buch
        self.ms = manuskript
        self.platzhalter = platzhalter
        self.warnungen: list[str] = []
        self.bildbefunde: list = []

        L = buch.layout
        self.textschrift = typografie.schrift("text", L.get("schrift_text"))
        self.titelschrift = typografie.schrift("titel", L.get("schrift_titel"))
        self.grundgroesse = float(L.get("schriftgroesse", 17))
        self.zeilenabstand = float(L.get("zeilenabstand", 1.45))
        self.textfarbe = HexColor(L.get("textfarbe", "#2B2B33"))
        self.seitenfarbe = HexColor(L.get("seitenfarbe", "#FFFFFF")) if L.get("seitenfarbe") else None
        self.seitenzahlen = bool(L.get("seitenzahlen", False))
        self.ausrichtung = {"links": TA_LEFT, "zentriert": TA_CENTER,
                            "blocksatz": TA_JUSTIFY}.get(L.get("ausrichtung", "links"), TA_LEFT)

        self.rand_aussen = buch.rand("aussen", 0.5)
        self.rand_oben = buch.rand("oben", 0.5)
        self.rand_unten = buch.rand("unten", 0.5)

    # ------------------------------------------------------------------
    def seitenplan(self) -> list[Druckseite]:
        plan: list[Druckseite] = []
        for eintrag in self.buch.layout.get("vorspann", ["titelseite", "impressum"]):
            if eintrag == "titelseite":
                plan.append(Druckseite(art="titel"))
            elif eintrag == "impressum":
                plan.append(Druckseite(art="impressum"))
            elif eintrag == "leer":
                plan.append(Druckseite(art="leer"))
            else:
                self.warnungen.append(f"Unbekannter Vorspann-Eintrag '{eintrag}' - ignoriert.")

        for s in self.ms.seiten:
            plan.append(Druckseite(art="leer" if s.layout == "leer" else "story", quelle=s))

        for eintrag in self.buch.layout.get("nachspann", []):
            if isinstance(eintrag, dict):
                plan.append(Druckseite(art="text",
                                       ueberschrift=eintrag.get("ueberschrift", ""),
                                       absaetze=list(eintrag.get("absaetze", []))))
            elif eintrag == "leer":
                plan.append(Druckseite(art="leer"))

        # Auf gerade Seitenzahl und Mindestumfang auffuellen
        mindest = spez.MIN_SEITEN_FARBE if spez.PAPIERSORTEN[self.buch.papier].farbe else spez.MIN_SEITEN_SW
        while len(plan) < mindest or len(plan) % 2 != 0:
            plan.append(Druckseite(art="leer"))
        if len(plan) > spez.MAX_SEITEN:
            self.warnungen.append(f"{len(plan)} Seiten - KDP erlaubt maximal {spez.MAX_SEITEN}.")
        return plan

    # ------------------------------------------------------------------
    def bauen(self, zielpfad: str | None = None) -> Bauergebnis:
        plan = self.seitenplan()
        seiten = len(plan)
        geo = self.buch.geometrie(seiten)

        if self.buch.seiten_soll and self.buch.seiten_soll != seiten:
            self.warnungen.append(
                f"druck.seiten_soll = {self.buch.seiten_soll}, gebaut werden aber {seiten} Seiten.")

        os.makedirs(self.buch.bauordner, exist_ok=True)
        ziel = zielpfad or os.path.join(self.buch.bauordner, f"{self.buch.slug}-innenteil.pdf")

        c = rl_canvas.Canvas(ziel, pagesize=(geo.dokument_breite * PT, geo.dokument_hoehe * PT))
        c.setTitle(self.buch.voller_titel)
        c.setAuthor(self.buch.autor)
        c.setSubject(f"Innenteil - {self.buch.trimgroesse.bezeichnung}")

        for i, ds in enumerate(plan, start=1):
            self._seite_zeichnen(c, geo, i, ds, seiten)
            c.showPage()
        c.save()

        return Bauergebnis(pdf=ziel, seiten=seiten, seitenplan=plan,
                           warnungen=self.warnungen, bildbefunde=self.bildbefunde)

    # ------------------------------------------------------------------
    def _seite_zeichnen(self, c, geo, nr: int, ds: Druckseite, gesamt: int) -> None:
        if self.seitenfarbe:
            c.setFillColor(self.seitenfarbe)
            c.rect(0, 0, geo.dokument_breite * PT, geo.dokument_hoehe * PT, stroke=0, fill=1)

        if ds.art == "leer":
            return
        if ds.art == "titel":
            self._titelseite(c, geo, nr)
        elif ds.art == "impressum":
            self._impressumseite(c, geo, nr)
        elif ds.art == "text":
            self._textseite(c, geo, nr, ds.ueberschrift, ds.absaetze)
        else:
            self._storyseite(c, geo, nr, ds.quelle)

        if self.seitenzahlen and ds.art in ("story", "text"):
            self._seitenzahl(c, geo, nr)

    # ------------------------------------------------------------------
    def _rahmen(self, geo, nr: int) -> tuple[float, float, float, float]:
        x, y, b, h = geo.satzspiegel(nr, self.rand_aussen, self.rand_oben, self.rand_unten)
        return x * PT, y * PT, b * PT, h * PT

    def _stil(self, groesse: float, ausrichtung=None, schrift=None, farbe=None,
              zeilenabstand=None) -> ParagraphStyle:
        return ParagraphStyle(
            "s", fontName=schrift or self.textschrift, fontSize=groesse,
            leading=groesse * (zeilenabstand or self.zeilenabstand),
            textColor=farbe or self.textfarbe,
            alignment=self.ausrichtung if ausrichtung is None else ausrichtung,
            spaceAfter=groesse * 0.45,
        )

    @staticmethod
    def _escape(t: str) -> str:
        return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

    def _absatz_markup(self, roh: str) -> tuple[str, bool]:
        kursiv = roh.startswith(">")
        text = roh.lstrip("> ").strip()
        text = self._escape(text)
        # **fett** und *kursiv* uebersetzen
        import re
        text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
        text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", text)
        if kursiv:
            text = f"<i>{text}</i>"
        return text, kursiv

    def _text_zeichnen(self, c, absaetze: list[str], x: float, y: float, b: float, h: float,
                       groesse: float, min_groesse: float = 9.0,
                       ausrichtung=None, vertikal: str = "unten") -> float:
        """Zeichnet Absaetze in den Kasten, verkleinert bei Bedarf. Gibt genutzte Hoehe."""
        if not absaetze:
            return 0.0
        g = groesse
        while g >= min_groesse:
            stil = self._stil(g, ausrichtung)
            teile, gesamt = [], 0.0
            for roh in absaetze:
                markup, _ = self._absatz_markup(roh)
                p = Paragraph(markup, stil)
                pw, ph = p.wrap(b, h)
                teile.append((p, ph))
                gesamt += ph + stil.spaceAfter
            gesamt -= stil.spaceAfter
            if gesamt <= h:
                if vertikal == "unten":
                    cursor = y + gesamt
                elif vertikal == "mitte":
                    cursor = y + (h + gesamt) / 2
                else:
                    cursor = y + h
                for p, ph in teile:
                    cursor -= ph
                    p.drawOn(c, x, cursor)
                    cursor -= stil.spaceAfter
                return gesamt
            g -= 0.5
        self.warnungen.append(
            f"Text passt selbst bei {min_groesse} pt nicht in den Kasten - bitte kuerzen.")
        stil = self._stil(min_groesse, ausrichtung)
        cursor = y + h
        for roh in absaetze:
            markup, _ = self._absatz_markup(roh)
            p = Paragraph(markup, stil)
            _, ph = p.wrap(b, h)
            cursor -= ph
            p.drawOn(c, x, cursor)
            cursor -= stil.spaceAfter
        return h

    # ------------------------------------------------------------------
    def _bildpfad(self, dateiname: str, breite_zoll: float, hoehe_zoll: float,
                  szene: str = "") -> str | None:
        pfad = os.path.join(self.buch.bildordner, dateiname)
        if not os.path.exists(pfad):
            if not self.platzhalter:
                self.warnungen.append(f"Bild fehlt: {dateiname}")
                return None
            ordner = os.path.join(self.buch.bauordner, "platzhalter")
            ersatz = os.path.join(ordner, os.path.splitext(dateiname)[0] + ".png")
            bildmodul.platzhalter(ersatz, breite_zoll, hoehe_zoll,
                                  os.path.splitext(dateiname)[0], szene)
            self.warnungen.append(f"Platzhalter verwendet fuer {dateiname}")
            return ersatz
        befund = bildmodul.pruefen(pfad, breite_zoll, hoehe_zoll)
        self.bildbefunde.append(befund)
        for p in befund.probleme:
            self.warnungen.append(f"{dateiname}: {p}")
        return pfad

    def _bild_zeichnen(self, c, pfad: str, x: float, y: float, b: float, h: float) -> None:
        """Zeichnet cover-fit: fuellt den Kasten vollstaendig, beschneidet mittig."""
        from PIL import Image as PILImage
        with PILImage.open(pfad) as im:
            iw, ih = im.width, im.height
        soll = b / h
        ist = iw / ih
        c.saveState()
        p = c.beginPath()
        p.rect(x, y, b, h)
        c.clipPath(p, stroke=0, fill=0)
        if ist > soll:      # Bild breiter -> Hoehe fuellen, links/rechts beschneiden
            zh, zb = h, h * ist
            zx, zy = x - (zb - b) / 2, y
        else:               # Bild hoeher -> Breite fuellen, oben/unten beschneiden
            zb, zh = b, b / ist
            zx, zy = x, y - (zh - h) / 2
        c.drawImage(pfad, zx, zy, zb, zh, mask=None)
        c.restoreState()

    # ------------------------------------------------------------------
    def _storyseite(self, c, geo, nr: int, s: Seite) -> None:
        x, y, b, h = self._rahmen(geo, nr)
        dok_b, dok_h = geo.dokument_breite * PT, geo.dokument_hoehe * PT

        if s.layout == "bild-ganzseitig" and s.bild:
            pfad = self._bildpfad(s.bild, geo.dokument_breite, geo.dokument_hoehe, s.illu_prompt)
            if pfad:
                self._bild_zeichnen(c, pfad, 0, 0, dok_b, dok_h)
            if s.hat_text:
                self._text_auf_bild(c, geo, nr, s, x, y, b, h)
            return

        if s.layout in ("bild-oben", "bild-unten") and s.bild:
            anteil = float(self.buch.layout.get("bildanteil", 0.62))
            luft = 0.18 * PT * 2
            bildhoehe = h * anteil
            texthoehe = h - bildhoehe - luft
            if s.layout == "bild-oben":
                bild_y = y + texthoehe + luft
                text_y = y
            else:
                bild_y = y
                text_y = y + bildhoehe + luft
            pfad = self._bildpfad(s.bild, b / PT, bildhoehe / PT, s.illu_prompt)
            if pfad:
                self._bild_zeichnen(c, pfad, x, bild_y, b, bildhoehe)
            if s.kapitel:
                text_y, texthoehe = self._kapitel(c, s.kapitel, x, text_y, b, texthoehe)
            self._text_zeichnen(c, s.absaetze, x, text_y, b, texthoehe, self.grundgroesse,
                                vertikal="mitte" if s.layout == "bild-oben" else "unten")
            return

        # nur-text
        if s.kapitel:
            y, h = self._kapitel(c, s.kapitel, x, y, b, h)
        self._text_zeichnen(c, s.absaetze, x, y, b, h, self.grundgroesse, vertikal="mitte")

    def _text_auf_bild(self, c, geo, nr: int, s: Seite, x, y, b, h) -> None:
        """Textband auf dem randabfallenden Bild - halbtransparent hinterlegt."""
        deckkraft = float(self.buch.layout.get("textband_deckkraft", 0.82))
        stil_groesse = self.grundgroesse
        # Hoehe des Bandes schaetzen
        stil = self._stil(stil_groesse)
        gesamt = 0.0
        for roh in s.absaetze:
            markup, _ = self._absatz_markup(roh)
            p = Paragraph(markup, stil)
            _, ph = p.wrap(b - 0.4 * PT, h)
            gesamt += ph + stil.spaceAfter
        gesamt = max(0.0, gesamt - stil.spaceAfter)
        polster = 0.22 * PT
        band_h = min(h, gesamt + 2 * polster)

        if s.textposition == "oben":
            band_y = y + h - band_h
        elif s.textposition == "mitte":
            band_y = y + (h - band_h) / 2
        else:
            band_y = y

        c.saveState()
        c.setFillColor(Color(1, 1, 1, alpha=deckkraft))
        c.roundRect(x - polster * 0.6, band_y, b + polster * 1.2, band_h,
                    radius=0.12 * PT, stroke=0, fill=1)
        c.restoreState()
        self._text_zeichnen(c, s.absaetze, x, band_y + polster, b, band_h - 2 * polster,
                            stil_groesse, vertikal="mitte")

    def _kapitel(self, c, titel: str, x, y, b, h) -> tuple[float, float]:
        g = self.grundgroesse * 1.6
        stil = ParagraphStyle("k", fontName=typografie.fett(self.titelschrift), fontSize=g,
                              leading=g * 1.2, textColor=self.textfarbe, alignment=TA_CENTER,
                              spaceAfter=g * 0.5)
        p = Paragraph(self._escape(titel), stil)
        _, ph = p.wrap(b, h)
        p.drawOn(c, x, y + h - ph)
        verbraucht = ph + stil.spaceAfter
        return y, h - verbraucht

    # ------------------------------------------------------------------
    def _titelseite(self, c, geo, nr: int) -> None:
        x, y, b, h = self._rahmen(geo, nr)
        buch = self.buch
        g = min(34.0, b / PT * 7.0)
        stil = ParagraphStyle("t", fontName=typografie.fett(self.titelschrift), fontSize=g,
                              leading=g * 1.18, textColor=self.textfarbe, alignment=TA_CENTER)
        p = Paragraph(self._escape(buch.titel), stil)
        _, ph = p.wrap(b, h)
        oben = y + h * 0.72
        p.drawOn(c, x, oben - ph)
        cursor = oben - ph - 0.22 * PT

        if buch.untertitel:
            gs = g * 0.42
            su = ParagraphStyle("u", fontName=self.textschrift, fontSize=gs, leading=gs * 1.3,
                                textColor=self.textfarbe, alignment=TA_CENTER)
            pu = Paragraph(self._escape(buch.untertitel), su)
            _, puh = pu.wrap(b, h)
            cursor -= puh
            pu.drawOn(c, x, cursor)
            cursor -= 0.2 * PT

        c.setFillColor(self.textfarbe)
        c.setStrokeColor(self.textfarbe)
        c.setLineWidth(0.8)
        c.line(x + b * 0.35, cursor, x + b * 0.65, cursor)

        ga = g * 0.4
        sa = ParagraphStyle("a", fontName=self.textschrift, fontSize=ga, leading=ga * 1.3,
                            textColor=self.textfarbe, alignment=TA_CENTER)
        pa = Paragraph(self._escape(buch.autor), sa)
        _, pah = pa.wrap(b, h)
        pa.drawOn(c, x, cursor - 0.35 * PT - pah)

    def _impressumseite(self, c, geo, nr: int) -> None:
        x, y, b, h = self._rahmen(geo, nr)
        imp = self.buch.impressum
        zeilen: list[str] = []
        zeilen.append(f"**{self.buch.voller_titel}**")
        zeilen.append(self.buch.autor)
        if imp.get("auflage"):
            zeilen.append(imp["auflage"])
        jahr = imp.get("jahr", "")
        rechteinhaber = imp.get("rechteinhaber", self.buch.autor)
        zeilen.append(f"Copyright © {jahr} {rechteinhaber}".strip())
        zeilen.append("Alle Rechte vorbehalten. Nachdruck, auch auszugsweise, "
                      "sowie Verbreitung durch Film, Funk, Fernsehen und Internet, "
                      "durch fotomechanische Wiedergabe, Tontraeger und Datenverarbeitungs-"
                      "systeme jeglicher Art nur mit schriftlicher Genehmigung.")
        if imp.get("verantwortlich"):
            zeilen.append("**Verantwortlich fuer den Inhalt / Kontaktadresse nach EU-GPSR:**")
            zeilen.append(imp["verantwortlich"].replace("\n", "<br/>"))
        if imp.get("illustration"):
            zeilen.append(f"Illustrationen: {imp['illustration']}")
        if imp.get("isbn"):
            zeilen.append(f"ISBN: {imp['isbn']}")
        if imp.get("hinweis"):
            zeilen.append(imp["hinweis"])
        if self.buch.ki_einsatz.get("hinweis_im_buch"):
            zeilen.append(self.buch.ki_einsatz["hinweis_im_buch"])

        self._text_zeichnen(c, zeilen, x, y, b, h, 8.5, min_groesse=6.5,
                            ausrichtung=TA_LEFT, vertikal="unten")

    def _textseite(self, c, geo, nr: int, ueberschrift: str, absaetze: list[str]) -> None:
        x, y, b, h = self._rahmen(geo, nr)
        if ueberschrift:
            y2, h2 = self._kapitel(c, ueberschrift, x, y, b, h)
            y, h = y2, h2
        self._text_zeichnen(c, absaetze, x, y, b, h, self.grundgroesse * 0.85, vertikal="oben")

    def _seitenzahl(self, c, geo, nr: int) -> None:
        c.setFont(self.textschrift, 9)
        c.setFillColor(self.textfarbe)
        x, y, b, _ = self._rahmen(geo, nr)
        c.drawCentredString(x + b / 2, (geo.anschnitt + self.rand_unten * 0.45) * PT, str(nr))
