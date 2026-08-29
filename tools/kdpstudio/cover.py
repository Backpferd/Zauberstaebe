"""Cover-Erzeugung: durchgehendes Print-Cover (PDF) und eBook-Cover (JPG).

Print-Cover-Aufbau (von links nach rechts), alles in einem PDF, eine Seite:

  |<-0.125" Anschnitt->|<- Rueckseite ->|<- Ruecken ->|<- Frontcover ->|<-0.125"->|

Der Barcode-Bereich unten rechts auf der Rueckseite (2 x 1.2 Zoll) wird
freigehalten - dort druckt Amazon die ISBN.
"""

from __future__ import annotations

import os

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import Paragraph
from PIL import Image, ImageDraw, ImageFont

from . import bilder as bildmodul
from . import spezifikation as spez
from . import typografie

PT = spez.ZOLL_IN_PUNKT


class CoverBauer:
    def __init__(self, buch, seiten: int, platzhalter: bool = True):
        self.buch = buch
        self.seiten = seiten
        self.platzhalter = platzhalter
        self.warnungen: list[str] = []
        self.geo = buch.covergeometrie(seiten)

        c = buch.daten.get("cover", {}) or {}
        self.cfg = c
        self.hintergrund = HexColor(c.get("hintergrundfarbe", "#1F3A5F"))
        self.schriftfarbe = HexColor(c.get("schriftfarbe", "#FFFFFF"))
        self.akzent = HexColor(c.get("akzentfarbe", "#F5C451"))
        self.titelschrift = typografie.schrift("titel", buch.layout.get("schrift_titel"))
        self.textschrift = typografie.schrift("text", buch.layout.get("schrift_text"))

    # ------------------------------------------------------------------
    def _bild(self, schluessel: str, breite_zoll: float, hoehe_zoll: float,
              beschriftung: str, szene: str) -> str | None:
        name = self.cfg.get(schluessel)
        if not name:
            return None
        pfad = os.path.join(self.buch.bildordner, name)
        if os.path.exists(pfad):
            befund = bildmodul.pruefen(pfad, breite_zoll, hoehe_zoll, spez.COVER_DPI_MIN)
            for p in befund.probleme:
                self.warnungen.append(f"Cover {schluessel} ({name}): {p}")
            return pfad
        if not self.platzhalter:
            self.warnungen.append(f"Coverbild fehlt: {name}")
            return None
        ersatz = os.path.join(self.buch.bauordner, "platzhalter",
                              os.path.splitext(name)[0] + ".png")
        bildmodul.platzhalter(ersatz, breite_zoll, hoehe_zoll, beschriftung, szene)
        self.warnungen.append(f"Platzhalter verwendet fuer Coverbild {name}")
        return ersatz

    @staticmethod
    def _escape(t: str) -> str:
        return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def _bild_cover_fit(self, c, pfad, x, y, b, h) -> None:
        with Image.open(pfad) as im:
            iw, ih = im.width, im.height
        soll, ist = b / h, iw / ih
        c.saveState()
        p = c.beginPath()
        p.rect(x, y, b, h)
        c.clipPath(p, stroke=0, fill=0)
        if ist > soll:
            zh, zb = h, h * ist
            zx, zy = x - (zb - b) / 2, y
        else:
            zb, zh = b, b / ist
            zx, zy = x, y - (zh - h) / 2
        c.drawImage(pfad, zx, zy, zb, zh, mask=None)
        c.restoreState()

    # ------------------------------------------------------------------
    def print_cover(self, zielpfad: str | None = None) -> str:
        g = self.geo
        os.makedirs(self.buch.bauordner, exist_ok=True)
        ziel = zielpfad or os.path.join(self.buch.bauordner, f"{self.buch.slug}-cover.pdf")

        c = rl_canvas.Canvas(ziel, pagesize=(g.gesamt_breite * PT, g.gesamt_hoehe * PT))
        c.setTitle(f"{self.buch.voller_titel} - Cover")
        c.setAuthor(self.buch.autor)

        c.setFillColor(self.hintergrund)
        c.rect(0, 0, g.gesamt_breite * PT, g.gesamt_hoehe * PT, stroke=0, fill=1)

        self._frontcover(c)
        self._rueckseite(c)
        self._ruecken(c)

        c.save()
        return ziel

    # ------------------------------------------------------------------
    def _frontcover(self, c) -> None:
        g = self.geo
        x0 = g.front_links * PT
        # Front reicht bis zur rechten Anschnittkante
        breite = (g.trim_breite + spez.ANSCHNITT) * PT
        hoehe = g.gesamt_hoehe * PT

        pfad = self._bild("front_bild", g.trim_breite + spez.ANSCHNITT, g.gesamt_hoehe,
                          "FRONTCOVER", self.cfg.get("front_szene", ""))
        if pfad:
            self._bild_cover_fit(c, pfad, x0, 0, breite, hoehe)

        # Sicherer Bereich: 0.25" innerhalb des Trims
        sicher = 0.3 * PT
        sx = x0 + sicher
        sb = g.trim_breite * PT - 2 * sicher

        titel = self.cfg.get("titel_auf_cover", self.buch.titel)
        untertitel = self.cfg.get("untertitel_auf_cover", self.buch.untertitel)

        band = bool(self.cfg.get("titelband", True))
        gr = float(self.cfg.get("titelgroesse", min(52.0, g.trim_breite * 7.2)))
        stil = ParagraphStyle("ct", fontName=typografie.fett(self.titelschrift), fontSize=gr,
                              leading=gr * 1.1, textColor=self.schriftfarbe, alignment=TA_CENTER)
        p = Paragraph(self._escape(titel), stil)
        _, ph = p.wrap(sb, hoehe)

        oben_y = hoehe - (spez.ANSCHNITT + 0.55) * PT - ph
        gesamt_h = ph
        pu = None
        if untertitel:
            gu = gr * 0.36
            su = ParagraphStyle("cu", fontName=self.textschrift, fontSize=gu, leading=gu * 1.25,
                                textColor=self.schriftfarbe, alignment=TA_CENTER)
            pu = Paragraph(self._escape(untertitel), su)
            _, puh = pu.wrap(sb, hoehe)
            gesamt_h += puh + 0.12 * PT

        if band:
            c.saveState()
            c.setFillColor(Color(0, 0, 0, alpha=float(self.cfg.get("titelband_deckkraft", 0.38))))
            c.roundRect(sx - 0.12 * PT, oben_y - (gesamt_h - ph) - 0.18 * PT,
                        sb + 0.24 * PT, gesamt_h + 0.36 * PT, radius=0.14 * PT,
                        stroke=0, fill=1)
            c.restoreState()

        p.drawOn(c, sx, oben_y)
        if pu is not None:
            _, puh = pu.wrap(sb, hoehe)
            pu.drawOn(c, sx, oben_y - 0.12 * PT - puh)

        # Autor unten
        ga = gr * 0.34
        sa = ParagraphStyle("ca", fontName=typografie.fett(self.textschrift), fontSize=ga,
                            leading=ga * 1.2, textColor=self.schriftfarbe, alignment=TA_CENTER)
        pa = Paragraph(self._escape(self.buch.autor), sa)
        _, pah = pa.wrap(sb, hoehe)
        autor_y = (spez.ANSCHNITT + 0.5) * PT
        c.saveState()
        c.setFillColor(Color(0, 0, 0, alpha=0.32))
        c.roundRect(sx + sb * 0.15, autor_y - 0.1 * PT, sb * 0.7, pah + 0.2 * PT,
                    radius=0.1 * PT, stroke=0, fill=1)
        c.restoreState()
        pa.drawOn(c, sx, autor_y)

        if self.buch.reihe:
            gr2 = gr * 0.26
            sr = ParagraphStyle("cr", fontName=self.textschrift, fontSize=gr2, leading=gr2 * 1.2,
                                textColor=self.akzent, alignment=TA_CENTER)
            nr = f" - Band {self.buch.reihennummer}" if self.buch.reihennummer else ""
            pr = Paragraph(self._escape(self.buch.reihe + nr), sr)
            _, prh = pr.wrap(sb, hoehe)
            pr.drawOn(c, sx, autor_y + pah + 0.28 * PT)

    # ------------------------------------------------------------------
    def _rueckseite(self, c) -> None:
        g = self.geo
        x0 = 0.0
        breite = (spez.ANSCHNITT + g.trim_breite) * PT
        hoehe = g.gesamt_hoehe * PT

        pfad = self._bild("rueck_bild", spez.ANSCHNITT + g.trim_breite, g.gesamt_hoehe,
                          "RUECKSEITE", self.cfg.get("rueck_szene", ""))
        if pfad:
            self._bild_cover_fit(c, pfad, x0, 0, breite, hoehe)

        sicher = 0.4 * PT
        sx = spez.ANSCHNITT * PT + sicher
        sb = g.trim_breite * PT - 2 * sicher

        blurb = self.cfg.get("blurb") or self.buch.beschreibung_kurz
        absaetze = [a.strip() for a in (blurb or "").split("\n\n") if a.strip()]

        gr = float(self.cfg.get("blurbgroesse", 12.5))
        y = hoehe - (spez.ANSCHNITT + 0.9) * PT

        if self.cfg.get("rueck_headline"):
            gh = gr * 1.45
            sh = ParagraphStyle("rh", fontName=typografie.fett(self.titelschrift), fontSize=gh,
                                leading=gh * 1.15, textColor=self.akzent, alignment=TA_CENTER)
            ph_ = Paragraph(self._escape(self.cfg["rueck_headline"]), sh)
            _, hh = ph_.wrap(sb, hoehe)
            ph_.drawOn(c, sx, y - hh)
            y -= hh + 0.25 * PT

        stil = ParagraphStyle("rb", fontName=self.textschrift, fontSize=gr, leading=gr * 1.45,
                              textColor=self.schriftfarbe, alignment=TA_LEFT, spaceAfter=gr * 0.6)
        # Optional halbtransparente Textflaeche, damit der Text auf Bild lesbar bleibt
        if pfad and self.cfg.get("blurb_band", True):
            hoehe_schaetz = 0.0
            for a in absaetze:
                _, ah = Paragraph(self._escape(a), stil).wrap(sb, hoehe)
                hoehe_schaetz += ah + stil.spaceAfter
            c.saveState()
            c.setFillColor(Color(0, 0, 0, alpha=0.45))
            c.roundRect(sx - 0.18 * PT, y - hoehe_schaetz - 0.2 * PT,
                        sb + 0.36 * PT, hoehe_schaetz + 0.42 * PT,
                        radius=0.12 * PT, stroke=0, fill=1)
            c.restoreState()

        for a in absaetze:
            p = Paragraph(self._escape(a), stil)
            _, ah = p.wrap(sb, hoehe)
            y -= ah
            p.drawOn(c, sx, y)
            y -= stil.spaceAfter

        for punkt in (self.cfg.get("stichpunkte") or self.buch.verkaufsargumente or [])[:5]:
            p = Paragraph("&bull; " + self._escape(punkt), stil)
            _, ah = p.wrap(sb, hoehe)
            y -= ah
            p.drawOn(c, sx, y)
            y -= stil.spaceAfter * 0.4

        # Barcode-Freifläche sichtbar aussparen (weisses Feld, wie von KDP empfohlen)
        bx, by, bb, bh = g.barcode_bereich()
        c.setFillColor(HexColor("#FFFFFF"))
        c.rect(bx * PT, by * PT, bb * PT, bh * PT, stroke=0, fill=1)

        if self.buch.impressum.get("verlagsname"):
            c.setFont(self.textschrift, 8)
            c.setFillColor(self.schriftfarbe)
            c.drawString(sx, (spez.ANSCHNITT + 0.32) * PT, self.buch.impressum["verlagsname"])

    # ------------------------------------------------------------------
    def _ruecken(self, c) -> None:
        g = self.geo
        c.setFillColor(HexColor(self.cfg.get("rueckenfarbe", self.cfg.get("hintergrundfarbe", "#1F3A5F"))))
        c.rect(g.ruecken_links * PT, 0, g.ruecken * PT, g.gesamt_hoehe * PT, stroke=0, fill=1)

        if not g.ruecken_text_erlaubt:
            self.warnungen.append(
                f"Ruecken bleibt ohne Text: KDP erlaubt Ruecken-Beschriftung erst ab "
                f"{spez.MIN_SEITEN_FUER_RUECKENTEXT} Seiten (aktuell {self.seiten}).")
            return

        verfuegbar = g.ruecken_text_breite * PT
        groesse = min(verfuegbar * 0.62, 18.0)
        text = f"{self.buch.titel}   \u2022   {self.buch.autor}"
        c.saveState()
        c.translate((g.ruecken_links + g.ruecken / 2) * PT, g.gesamt_hoehe * PT / 2)
        c.rotate(-90)
        c.setFont(typografie.fett(self.titelschrift), groesse)
        c.setFillColor(self.schriftfarbe)
        c.drawCentredString(0, -groesse * 0.35, text)
        c.restoreState()

    # ------------------------------------------------------------------
    def ebook_cover(self, zielpfad: str | None = None,
                    groesse: tuple[int, int] = spez.EBOOK_COVER_IDEAL) -> str:
        """eBook-Cover als JPG, 1600x2560 px (Verhaeltnis 1:1.6)."""
        os.makedirs(self.buch.bauordner, exist_ok=True)
        ziel = zielpfad or os.path.join(self.buch.bauordner, f"{self.buch.slug}-ebook-cover.jpg")
        b, h = groesse

        name = self.cfg.get("ebook_bild") or self.cfg.get("front_bild")
        quelle = None
        if name:
            p = os.path.join(self.buch.bildordner, name)
            if os.path.exists(p):
                quelle = p
            elif self.platzhalter:
                quelle = os.path.join(self.buch.bauordner, "platzhalter",
                                      os.path.splitext(name)[0] + ".png")
                if not os.path.exists(quelle):
                    bildmodul.platzhalter(quelle, b / 300, h / 300, "EBOOK-COVER",
                                          self.cfg.get("front_szene", ""))

        if quelle:
            with Image.open(quelle) as im:
                im = im.convert("RGB")
                soll, ist = b / h, im.width / im.height
                if ist > soll:
                    nb = int(im.height * soll)
                    links = (im.width - nb) // 2
                    im = im.crop((links, 0, links + nb, im.height))
                else:
                    nh = int(im.width / soll)
                    oben = int((im.height - nh) * 0.25)
                    im = im.crop((0, oben, im.width, oben + nh))
                cover = im.resize((b, h), Image.LANCZOS)
        else:
            cover = Image.new("RGB", (b, h), tuple(int(self.hintergrund.hexval()[2:][i:i+2], 16)
                                                   for i in (0, 2, 4)))

        z = ImageDraw.Draw(cover, "RGBA")
        z.rectangle([0, 0, b, int(h * 0.34)], fill=(0, 0, 0, 105))
        z.rectangle([0, int(h * 0.80), b, h], fill=(0, 0, 0, 105))

        def font(px: int, fett: bool = True):
            for k in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
                      if fett else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                      "C:/Windows/Fonts/arialbd.ttf", "/Library/Fonts/Arial Bold.ttf"):
                if os.path.exists(k):
                    return ImageFont.truetype(k, px)
            return ImageFont.load_default()

        def umbruch(text: str, f, maxbreite: int) -> list[str]:
            worte, zeilen, akt = text.split(), [], ""
            for w in worte:
                probe = f"{akt} {w}".strip()
                if z.textlength(probe, font=f) > maxbreite and akt:
                    zeilen.append(akt)
                    akt = w
                else:
                    akt = probe
            if akt:
                zeilen.append(akt)
            return zeilen

        tf = font(int(b * 0.115))
        zeilen = umbruch(self.cfg.get("titel_auf_cover", self.buch.titel), tf, int(b * 0.86))
        while len(zeilen) > 3 and tf.size > 40:
            tf = font(int(tf.size * 0.88))
            zeilen = umbruch(self.cfg.get("titel_auf_cover", self.buch.titel), tf, int(b * 0.86))
        y = int(h * 0.06)
        for zl in zeilen:
            z.text((b // 2, y), zl, font=tf, fill=(255, 255, 255), anchor="ma")
            y += int(tf.size * 1.12)

        if self.buch.untertitel:
            uf = font(int(b * 0.042), fett=False)
            for zl in umbruch(self.buch.untertitel, uf, int(b * 0.8))[:2]:
                z.text((b // 2, y + int(b * 0.012)), zl, font=uf, fill=(245, 240, 225), anchor="ma")
                y += int(uf.size * 1.25)

        af = font(int(b * 0.05))
        z.text((b // 2, int(h * 0.895)), self.buch.autor, font=af,
               fill=(255, 255, 255), anchor="mm")

        cover.save(ziel, "JPEG", quality=92, subsampling=0, optimize=True)
        return ziel
