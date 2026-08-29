"""EPUB-3-Erzeugung fuer den KDP-eBook-Upload.

Zwei Modi:

  fest      Fixed-Layout (rendition:layout = pre-paginated).  Richtig fuer
            Bilderbuecher: Bild und Text bleiben auf jeder Seite genau da,
            wo sie hingehoeren.  Amazon zeigt das als "Kindle Kids Book".
  fliessend Reflowable.  Richtig fuer Vorlese- und Kapitelbuecher mit wenig
            Bildern, weil der Leser die Schriftgroesse aendern kann.

Das Ergebnis ist eine .epub-Datei, die direkt in KDP hochgeladen wird.
"""

from __future__ import annotations

import html
import os
import shutil
import uuid
import zipfile
from datetime import date

from PIL import Image

from . import bilder as bildmodul
from .manuskript import Manuskript, Seite

EBOOK_BILDBREITE = 1600
EBOOK_QUALITAET = 85


def _esc(t: str) -> str:
    return html.escape(t, quote=True)


class EpubBauer:
    def __init__(self, buch, manuskript: Manuskript, platzhalter: bool = True):
        self.buch = buch
        self.ms = manuskript
        self.platzhalter = platzhalter
        self.warnungen: list[str] = []
        cfg = buch.daten.get("ebook", {}) or {}
        self.cfg = cfg
        self.modus = cfg.get("layout", "fest")
        if self.modus not in ("fest", "fliessend"):
            raise ValueError("ebook.layout muss 'fest' oder 'fliessend' sein")
        t = buch.trimgroesse
        seite_breite = int(cfg.get("viewport_breite", EBOOK_BILDBREITE))
        self.viewport = (seite_breite, int(round(seite_breite * t.hoehe / t.breite)))
        self.uuid = cfg.get("uuid") or f"urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, buch.slug)}"

    # ------------------------------------------------------------------
    def bauen(self, zielpfad: str | None = None) -> str:
        os.makedirs(self.buch.bauordner, exist_ok=True)
        ziel = zielpfad or os.path.join(self.buch.bauordner, f"{self.buch.slug}.epub")
        arbeit = os.path.join(self.buch.bauordner, "_epub")
        if os.path.exists(arbeit):
            shutil.rmtree(arbeit)
        for u in ("META-INF", "EPUB/text", "EPUB/images", "EPUB/styles"):
            os.makedirs(os.path.join(arbeit, u), exist_ok=True)

        bildliste = self._bilder_kopieren(arbeit)
        cover_datei = self._cover_kopieren(arbeit)
        seitendateien = self._seiten_schreiben(arbeit, cover_datei)

        self._css(arbeit)
        self._container(arbeit)
        self._nav(arbeit, seitendateien)
        self._opf(arbeit, seitendateien, bildliste, cover_datei)

        self._packen(arbeit, ziel)
        return ziel

    # ------------------------------------------------------------------
    def _bild_quelle(self, name: str, breite_zoll: float, hoehe_zoll: float,
                     szene: str) -> str | None:
        pfad = os.path.join(self.buch.bildordner, name)
        if os.path.exists(pfad):
            return pfad
        if not self.platzhalter:
            self.warnungen.append(f"Bild fehlt: {name}")
            return None
        ersatz = os.path.join(self.buch.bauordner, "platzhalter",
                              os.path.splitext(name)[0] + ".png")
        if not os.path.exists(ersatz):
            bildmodul.platzhalter(ersatz, breite_zoll, hoehe_zoll,
                                  os.path.splitext(name)[0], szene)
        return ersatz

    def _bilder_kopieren(self, arbeit: str) -> list[tuple[str, str]]:
        t = self.buch.trimgroesse
        ergebnis: list[tuple[str, str]] = []
        gesehen: set[str] = set()
        for s in self.ms.seiten:
            if not s.bild or s.bild in gesehen:
                continue
            gesehen.add(s.bild)
            quelle = self._bild_quelle(s.bild, t.breite, t.hoehe, s.illu_prompt)
            if not quelle:
                continue
            zielname = os.path.splitext(os.path.basename(s.bild))[0] + ".jpg"
            ziel = os.path.join(arbeit, "EPUB", "images", zielname)
            self._skalieren(quelle, ziel, self.viewport[0])
            ergebnis.append((s.bild, zielname))
        return ergebnis

    def _cover_kopieren(self, arbeit: str) -> str | None:
        kandidat = os.path.join(self.buch.bauordner, f"{self.buch.slug}-ebook-cover.jpg")
        if not os.path.exists(kandidat):
            self.warnungen.append(
                "Kein eBook-Cover gefunden - erst 'kdp cover' laufen lassen. "
                "Das EPUB wird ohne eingebettetes Cover gebaut.")
            return None
        ziel = os.path.join(arbeit, "EPUB", "images", "cover.jpg")
        shutil.copy2(kandidat, ziel)
        return "cover.jpg"

    @staticmethod
    def _skalieren(quelle: str, ziel: str, breite: int) -> None:
        with Image.open(quelle) as im:
            if im.mode in ("RGBA", "LA", "PA"):
                hg = Image.new("RGB", im.size, (255, 255, 255))
                hg.paste(im.convert("RGBA"), mask=im.convert("RGBA").split()[-1])
                im = hg
            elif im.mode != "RGB":
                im = im.convert("RGB")
            if im.width > breite:
                im = im.resize((breite, int(im.height * breite / im.width)), Image.LANCZOS)
            im.save(ziel, "JPEG", quality=EBOOK_QUALITAET, optimize=True, progressive=True)

    # ------------------------------------------------------------------
    def _seiten_schreiben(self, arbeit: str, cover_datei: str | None) -> list[tuple[str, str]]:
        dateien: list[tuple[str, str]] = []

        if cover_datei:
            inhalt = self._xhtml_huelle(
                "Cover",
                f'<div class="ganzbild"><img src="../images/{cover_datei}" alt="Cover"/></div>',
                fest=True, klasse="coverseite")
            self._schreiben(arbeit, "text/cover.xhtml", inhalt)
            dateien.append(("cover.xhtml", "Cover"))

        titel_html = (f'<div class="titelseite"><h1>{_esc(self.buch.titel)}</h1>'
                      + (f'<p class="untertitel">{_esc(self.buch.untertitel)}</p>'
                         if self.buch.untertitel else "")
                      + f'<p class="autor">{_esc(self.buch.autor)}</p></div>')
        self._schreiben(arbeit, "text/titel.xhtml",
                        self._xhtml_huelle("Titel", titel_html, fest=self.modus == "fest"))
        dateien.append(("titel.xhtml", "Titelseite"))

        for i, s in enumerate(self.ms.seiten, start=1):
            name = f"seite-{i:03d}.xhtml"
            self._schreiben(arbeit, f"text/{name}",
                            self._xhtml_huelle(f"Seite {i}", self._seiteninhalt(s),
                                               fest=self.modus == "fest"))
            titel = s.kapitel or s.ueberschrift or f"Seite {i}"
            dateien.append((name, titel))

        imp = self._impressum_html()
        self._schreiben(arbeit, "text/impressum.xhtml",
                        self._xhtml_huelle("Impressum", imp, fest=self.modus == "fest"))
        dateien.append(("impressum.xhtml", "Impressum"))
        return dateien

    def _seiteninhalt(self, s: Seite) -> str:
        bildname = (os.path.splitext(os.path.basename(s.bild))[0] + ".jpg") if s.bild else None
        alt = _esc(s.alt or s.klartext[:110])
        stuecke = []
        for a in s.absaetze:
            klasse = ' class="sprech"' if a.startswith(">") else ""
            stuecke.append(f"<p{klasse}>{_esc(a.lstrip('> ').strip())}</p>")
        absaetze = "".join(stuecke)
        kapitel = f"<h2>{_esc(s.kapitel)}</h2>" if s.kapitel else ""

        if s.layout == "leer":
            return '<div class="leer"></div>'
        if not bildname:
            return f'<div class="textseite">{kapitel}{absaetze}</div>'
        if s.layout == "bild-ganzseitig":
            return (f'<div class="ganzbild"><img src="../images/{bildname}" alt="{alt}"/>'
                    f'<div class="textband pos-{s.textposition}">{kapitel}{absaetze}</div></div>')
        if s.layout == "bild-unten":
            return (f'<div class="geteilt"><div class="text">{kapitel}{absaetze}</div>'
                    f'<div class="bild"><img src="../images/{bildname}" alt="{alt}"/></div></div>')
        return (f'<div class="geteilt"><div class="bild">'
                f'<img src="../images/{bildname}" alt="{alt}"/></div>'
                f'<div class="text">{kapitel}{absaetze}</div></div>')

    def _impressum_html(self) -> str:
        imp = self.buch.impressum
        zeilen = [f"<p><strong>{_esc(self.buch.voller_titel)}</strong><br/>{_esc(self.buch.autor)}</p>",
                  f"<p>Copyright &#169; {_esc(str(imp.get('jahr', date.today().year)))} "
                  f"{_esc(imp.get('rechteinhaber', self.buch.autor))}<br/>"
                  f"Alle Rechte vorbehalten.</p>"]
        if imp.get("verantwortlich"):
            zeilen.append("<p><strong>Verantwortlich f&#252;r den Inhalt / Kontaktadresse:</strong><br/>"
                          + _esc(imp["verantwortlich"]).replace("\n", "<br/>") + "</p>")
        if imp.get("isbn"):
            zeilen.append(f"<p>ISBN: {_esc(imp['isbn'])}</p>")
        if self.buch.ki_einsatz.get("hinweis_im_buch"):
            zeilen.append(f"<p>{_esc(self.buch.ki_einsatz['hinweis_im_buch'])}</p>")
        return '<div class="textseite klein">' + "".join(zeilen) + "</div>"

    # ------------------------------------------------------------------
    def _xhtml_huelle(self, titel: str, koerper: str, fest: bool, klasse: str = "") -> str:
        vp = (f'  <meta name="viewport" content="width={self.viewport[0]}, '
              f'height={self.viewport[1]}"/>\n') if fest else ""
        kl = f' class="{klasse}"' if klasse else ""
        return (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html>\n'
            f'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" '
            f'xml:lang="{self.buch.sprache}" lang="{self.buch.sprache}">\n'
            '<head>\n'
            f'  <title>{_esc(titel)}</title>\n'
            '  <meta charset="utf-8"/>\n'
            f'{vp}'
            '  <link rel="stylesheet" type="text/css" href="../styles/haupt.css"/>\n'
            '</head>\n'
            f'<body{kl}>\n{koerper}\n</body>\n</html>\n'
        )

    @staticmethod
    def _schreiben(arbeit: str, relpfad: str, inhalt: str) -> None:
        pfad = os.path.join(arbeit, "EPUB", relpfad)
        os.makedirs(os.path.dirname(pfad), exist_ok=True)
        with open(pfad, "w", encoding="utf-8") as f:
            f.write(inhalt)

    # ------------------------------------------------------------------
    def _css(self, arbeit: str) -> None:
        b, h = self.viewport
        fest = self.modus == "fest"
        grund = self.buch.layout.get("schriftgroesse", 17)
        css = f"""@charset "utf-8";

html, body {{ margin: 0; padding: 0; }}

body {{
  font-family: "Andika", "Nunito", "Verdana", sans-serif;
  color: {self.buch.layout.get('textfarbe', '#2B2B33')};
  background: {self.buch.layout.get('seitenfarbe', '#FFFFFF')};
  line-height: 1.5;
  {f'width: {b}px; height: {h}px; overflow: hidden;' if fest else 'padding: 0.8em;'}
}}

p {{ margin: 0 0 0.7em 0; text-indent: 0; }}
p.sprech {{ font-style: italic; }}
h1, h2 {{ font-family: "Baloo 2", "Fredoka", "Verdana", sans-serif; font-weight: bold; }}

/* --- ganzseitiges Bild mit Textband --------------------------------- */
.ganzbild {{ position: relative; margin: 0; padding: 0;
  {f'width: {b}px; height: {h}px;' if fest else 'width: 100%;'} }}
.ganzbild img {{ {f'width: {b}px; height: {h}px;' if fest else 'width: 100%; height: auto;'}
  display: block; object-fit: cover; }}
.textband {{ {'position: absolute; left: 4%; right: 4%;' if fest else 'position: static; margin-top: 0.6em;'}
  background: rgba(255,255,255,0.86); border-radius: 12px; padding: 3% 4%;
  font-size: {grund / 17 * 1.05:.2f}em; }}
.textband.pos-unten {{ {'bottom: 4%;' if fest else ''} }}
.textband.pos-oben  {{ {'top: 4%;' if fest else ''} }}
.textband.pos-mitte {{ {'top: 34%;' if fest else ''} }}

/* --- geteilte Seite -------------------------------------------------- */
.geteilt {{ {f'width: {b}px; height: {h}px;' if fest else ''}
  display: flex; flex-direction: column; box-sizing: border-box;
  padding: {'3%' if fest else '0'}; }}
.geteilt .bild {{ flex: 0 0 {self.buch.layout.get('bildanteil', 0.62) * 100:.0f}%;
  overflow: hidden; }}
.geteilt .bild img {{ width: 100%; height: 100%; object-fit: cover; display: block;
  border-radius: 8px; }}
.geteilt .text {{ flex: 1 1 auto; display: flex; flex-direction: column;
  justify-content: center; padding: 3% 1% 0 1%;
  font-size: {grund / 17 * 1.05:.2f}em; }}

/* --- reine Textseiten ------------------------------------------------ */
.textseite {{ {f'width: {b}px; height: {h}px; box-sizing: border-box;' if fest else ''}
  padding: 8%; display: flex; flex-direction: column; justify-content: center; }}
.textseite.klein {{ font-size: 0.78em; justify-content: flex-end; }}
.leer {{ {f'width: {b}px; height: {h}px;' if fest else 'height: 1px;'} }}

/* --- Titel- und Coverseite ------------------------------------------- */
.coverseite {{ margin: 0; padding: 0; }}
.titelseite {{ {f'width: {b}px; height: {h}px; box-sizing: border-box;' if fest else ''}
  padding: 10%; text-align: center; display: flex; flex-direction: column;
  justify-content: center; }}
.titelseite h1 {{ font-size: 2.4em; margin: 0 0 0.3em 0; line-height: 1.15; }}
.titelseite .untertitel {{ font-size: 1.1em; margin-bottom: 1.4em; }}
.titelseite .autor {{ font-size: 1.15em; font-weight: bold; }}
"""
        pfad = os.path.join(arbeit, "EPUB", "styles", "haupt.css")
        with open(pfad, "w", encoding="utf-8") as f:
            f.write(css)

    def _container(self, arbeit: str) -> None:
        pfad = os.path.join(arbeit, "META-INF", "container.xml")
        with open(pfad, "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                    '<container version="1.0" '
                    'xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
                    '  <rootfiles>\n'
                    '    <rootfile full-path="EPUB/package.opf" '
                    'media-type="application/oebps-package+xml"/>\n'
                    '  </rootfiles>\n</container>\n')

    def _nav(self, arbeit: str, dateien: list[tuple[str, str]]) -> None:
        eintraege = "".join(
            f'      <li><a href="text/{d}">{_esc(t)}</a></li>\n'
            for d, t in dateien if not d.startswith("cover"))
        inhalt = (
            '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
            f'<html xmlns="http://www.w3.org/1999/xhtml" '
            f'xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{self.buch.sprache}">\n'
            '<head><title>Inhalt</title><meta charset="utf-8"/></head>\n<body>\n'
            '  <nav epub:type="toc" id="toc">\n    <h1>Inhalt</h1>\n    <ol>\n'
            f'{eintraege}'
            '    </ol>\n  </nav>\n'
            '  <nav epub:type="landmarks" hidden="hidden">\n    <ol>\n'
            '      <li><a epub:type="bodymatter" href="text/titel.xhtml">Anfang</a></li>\n'
            '    </ol>\n  </nav>\n</body>\n</html>\n')
        with open(os.path.join(arbeit, "EPUB", "nav.xhtml"), "w", encoding="utf-8") as f:
            f.write(inhalt)

    def _opf(self, arbeit: str, dateien, bilder, cover_datei) -> None:
        fest = self.modus == "fest"
        items, spine = [], []
        items.append('    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" '
                     'properties="nav"/>')
        items.append('    <item id="css" href="styles/haupt.css" media-type="text/css"/>')
        if cover_datei:
            items.append(f'    <item id="coverbild" href="images/{cover_datei}" '
                         'media-type="image/jpeg" properties="cover-image"/>')
        for i, (_, zielname) in enumerate(bilder):
            items.append(f'    <item id="bild{i}" href="images/{zielname}" media-type="image/jpeg"/>')
        for i, (datei, _) in enumerate(dateien):
            kennung = f"s{i}"
            props = ' properties="svg"' if False else ""
            items.append(f'    <item id="{kennung}" href="text/{datei}" '
                         f'media-type="application/xhtml+xml"{props}/>')
            eigenschaft = ' properties="rendition:layout-pre-paginated"' if fest else ""
            spine.append(f'    <itemref idref="{kennung}"{eigenschaft}/>')

        rendition = ""
        kindle = ""
        if fest:
            rendition = ('    <meta property="rendition:layout">pre-paginated</meta>\n'
                         '    <meta property="rendition:orientation">auto</meta>\n'
                         '    <meta property="rendition:spread">landscape</meta>\n')
            kindle = (f'    <meta name="fixed-layout" content="true"/>\n'
                      f'    <meta name="original-resolution" '
                      f'content="{self.viewport[0]}x{self.viewport[1]}"/>\n'
                      '    <meta name="book-type" content="children"/>\n'
                      '    <meta name="orientation-lock" content="none"/>\n'
                      '    <meta name="RegionMagnification" content="true"/>\n')
        cover_meta = '    <meta name="cover" content="coverbild"/>\n' if cover_datei else ""

        beschreibung = _esc((self.buch.beschreibung_kurz or "").strip()[:900])
        reihe = ""
        if self.buch.reihe:
            reihe = (f'    <meta property="belongs-to-collection" id="reihe">'
                     f'{_esc(self.buch.reihe)}</meta>\n'
                     f'    <meta refines="#reihe" property="collection-type">series</meta>\n')
            if self.buch.reihennummer:
                reihe += (f'    <meta refines="#reihe" property="group-position">'
                          f'{self.buch.reihennummer}</meta>\n')

        opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id"
         prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">{_esc(self.uuid)}</dc:identifier>
    <dc:title>{_esc(self.buch.voller_titel)}</dc:title>
    <dc:creator id="autor">{_esc(self.buch.autor)}</dc:creator>
    <meta refines="#autor" property="role" scheme="marc:relators">aut</meta>
    <dc:language>{_esc(self.buch.sprache)}</dc:language>
    <dc:date>{date.today().isoformat()}</dc:date>
    <dc:publisher>{_esc(self.buch.impressum.get('verlagsname', self.buch.autor))}</dc:publisher>
    <dc:description>{beschreibung}</dc:description>
    <meta property="dcterms:modified">{date.today().isoformat()}T00:00:00Z</meta>
{reihe}{rendition}{kindle}{cover_meta}  </metadata>
  <manifest>
{chr(10).join(items)}
  </manifest>
  <spine>
{chr(10).join(spine)}
  </spine>
</package>
"""
        with open(os.path.join(arbeit, "EPUB", "package.opf"), "w", encoding="utf-8") as f:
            f.write(opf)

    # ------------------------------------------------------------------
    @staticmethod
    def _packen(arbeit: str, ziel: str) -> None:
        if os.path.exists(ziel):
            os.remove(ziel)
        with zipfile.ZipFile(ziel, "w") as z:
            # mimetype MUSS die erste Datei und unkomprimiert sein.
            z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip",
                       compress_type=zipfile.ZIP_STORED)
            for wurzel, _, dateien in os.walk(arbeit):
                for d in sorted(dateien):
                    voll = os.path.join(wurzel, d)
                    rel = os.path.relpath(voll, arbeit).replace(os.sep, "/")
                    if rel == "mimetype":
                        continue
                    z.write(voll, rel, compress_type=zipfile.ZIP_DEFLATED)
