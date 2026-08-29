"""Kommandozeile: python3 tools/kdp <befehl> <buch>"""

from __future__ import annotations

import argparse
import os
import shutil
import sys

from . import illustration, kalkulation, metadaten, pruefung
from .cover import CoverBauer
from .epub import EpubBauer
from .interior import InnenteilBauer
from .manuskript import datei_parsen
from .modelle import Buch, BuchFehler
from . import spezifikation as spez

WURZEL = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUECHER = os.path.join(WURZEL, "buecher")
VORLAGE = os.path.join(WURZEL, "vorlage")


def _pfad(slug: str) -> str:
    p = slug if os.path.isdir(slug) else os.path.join(BUECHER, slug)
    if not os.path.isdir(p):
        raise SystemExit(f"Kein Buch unter '{p}'. Vorhanden: {', '.join(_slugs()) or '(keins)'}")
    return p


def _slugs() -> list[str]:
    if not os.path.isdir(BUECHER):
        return []
    return sorted(d for d in os.listdir(BUECHER)
                  if os.path.exists(os.path.join(BUECHER, d, "buch.yaml")))


def _laden(slug: str):
    buch = Buch.laden(_pfad(slug))
    if not os.path.exists(buch.manuskriptpfad):
        raise SystemExit(f"Kein manuskript.md unter {buch.pfad}")
    return buch, datei_parsen(buch.manuskriptpfad)


def _warnungen(titel: str, warnungen: list[str]) -> None:
    if not warnungen:
        return
    print(f"  {titel}:")
    gesehen = set()
    for w in warnungen:
        if w in gesehen:
            continue
        gesehen.add(w)
        print(f"    - {w}")


# ---------------------------------------------------------------------------

def befehl_liste(args) -> int:
    slugs = _slugs()
    if not slugs:
        print("Noch keine Buecher. Anlegen mit:  python3 tools/kdp neu mein-buch")
        return 0
    for s in slugs:
        try:
            b = Buch.laden(os.path.join(BUECHER, s))
            print(f"{s:28} {b.voller_titel}  [{b.trim}, {b.papier}]")
        except BuchFehler as e:
            print(f"{s:28} FEHLERHAFT: {e}")
    return 0


def befehl_neu(args) -> int:
    ziel = os.path.join(BUECHER, args.slug)
    if os.path.exists(ziel):
        raise SystemExit(f"{ziel} existiert bereits.")
    if not os.path.isdir(VORLAGE):
        raise SystemExit(f"Vorlage fehlt unter {VORLAGE}")
    shutil.copytree(VORLAGE, ziel)
    os.makedirs(os.path.join(ziel, "illustrationen"), exist_ok=True)
    print(f"Angelegt: {ziel}")
    print("Naechste Schritte:")
    print(f"  1. {ziel}/buch.yaml ausfuellen (Titel, Autor, Zielgruppe, Preise)")
    print(f"  2. {ziel}/manuskript.md schreiben")
    print(f"  3. python3 tools/kdp prompts {args.slug}")
    return 0


def befehl_innenteil(args) -> int:
    buch, ms = _laden(args.slug)
    bauer = InnenteilBauer(buch, ms, platzhalter=not args.ohne_platzhalter)
    erg = bauer.bauen()
    print(f"Innenteil: {erg.pdf}  ({erg.seiten} Seiten)")
    geo = buch.geometrie(erg.seiten)
    print(f"  Dokumentgroesse {geo.dokument_breite:.3f} x {geo.dokument_hoehe:.3f} Zoll "
          f"({spez.mm(geo.dokument_breite):.1f} x {spez.mm(geo.dokument_hoehe):.1f} mm), "
          f"Bundsteg {spez.mm(geo.bundsteg):.1f} mm")
    _warnungen("Warnungen", erg.warnungen)
    return 0


def befehl_cover(args) -> int:
    buch, ms = _laden(args.slug)
    seiten = args.seiten or InnenteilBauer(buch, ms).seitenplan().__len__()
    bauer = CoverBauer(buch, seiten, platzhalter=not args.ohne_platzhalter)
    pdf = bauer.print_cover()
    jpg = bauer.ebook_cover()
    g = bauer.geo
    print(f"Print-Cover: {pdf}")
    print(f"  {g.gesamt_breite:.3f} x {g.gesamt_hoehe:.3f} Zoll "
          f"({spez.mm(g.gesamt_breite):.1f} x {spez.mm(g.gesamt_hoehe):.1f} mm), "
          f"Ruecken {spez.mm(g.ruecken):.2f} mm bei {seiten} Seiten")
    print(f"eBook-Cover: {jpg}")
    _warnungen("Warnungen", bauer.warnungen)
    return 0


def befehl_epub(args) -> int:
    buch, ms = _laden(args.slug)
    bauer = EpubBauer(buch, ms, platzhalter=not args.ohne_platzhalter)
    pfad = bauer.bauen()
    mb = os.path.getsize(pfad) / 1024 / 1024
    print(f"EPUB: {pfad}  ({mb:.2f} MB, Layout: {bauer.modus})")
    _warnungen("Warnungen", bauer.warnungen)
    return 0


def befehl_prompts(args) -> int:
    buch, ms = _laden(args.slug)
    pfad = illustration.briefing_schreiben(buch, ms)
    anzahl = len([s for s in ms.seiten if s.bild])
    print(f"Illustrations-Briefing: {pfad}")
    print(f"  {len(buch.figuren)} Figurenblatt/-blaetter + {anzahl} Seitenbilder")
    return 0


def befehl_metadaten(args) -> int:
    buch, ms = _laden(args.slug)
    seiten = args.seiten or len(InnenteilBauer(buch, ms).seitenplan())
    zeilen = []
    try:
        k = kalkulation.konfig_laden()
        for p in buch.preise:
            if p.taschenbuch:
                zeilen.append(kalkulation.taschenbuch(p.markt, p.taschenbuch,
                                                      buch.papier, seiten, k).zeile())
            if p.ebook:
                zeilen.append("eBook " + kalkulation.ebook(p.markt, p.ebook, 0.0, k).zeile())
    except Exception:  # noqa: BLE001
        pass
    erg = metadaten.paket_schreiben(buch, seiten, zeilen)
    print(f"Eingabeblatt:  {erg['blatt']}")
    print(f"Beschreibung:  {erg['beschreibung']}")
    print(f"JSON:          {erg['json']}")
    for name, bf in erg["befunde"].items():
        _warnungen(f"{name} - Fehler", bf.fehler)
        _warnungen(f"{name} - Hinweise", bf.warnungen)
    return 0


def befehl_kalkulation(args) -> int:
    k = kalkulation.konfig_laden()
    if args.slug:
        buch, ms = _laden(args.slug)
        seiten = args.seiten or len(InnenteilBauer(buch, ms).seitenplan())
        papier = buch.papier
        maerkte = [p.markt for p in buch.preise] or ["DE"]
        print(f"{buch.voller_titel} - {seiten} Seiten, {papier}\n")
    else:
        seiten = args.seiten or 32
        papier = args.papier
        maerkte = [args.markt]
        print(f"{seiten} Seiten, {papier}\n")

    for markt in maerkte:
        print(f"--- Markt {markt} ---")
        for r in kalkulation.szenario(seiten, papier, markt, konfig=k):
            marke = "  <-- negativ" if r.tantieme <= 0 else ""
            print("  " + r.zeile() + marke)
        for ziel in (1.0, 2.0, 3.0):
            print(f"  Mindestpreis fuer {ziel:.2f} Tantieme: "
                  f"{kalkulation.mindestpreis(markt, papier, seiten, ziel, k):.2f}")
        print()
    print(f"Datenstand: {k.get('stand')} - {k.get('geprueft_von')}")
    return 0


def befehl_pruefen(args) -> int:
    buch, ms = _laden(args.slug)
    seiten = args.seiten or len(InnenteilBauer(buch, ms).seitenplan())
    erg = pruefung.pruefen(buch, ms, seiten)
    print(f"Pruefung {buch.voller_titel} ({seiten} Seiten)")
    print(erg.bericht())
    return 0 if erg.ok else 1


def befehl_vorschau(args) -> int:
    """HTML-Vorschau: Seite fuer Seite Bild + Text nebeneinander."""
    buch, ms = _laden(args.slug)
    os.makedirs(buch.bauordner, exist_ok=True)
    ziel = os.path.join(buch.bauordner, "vorschau.html")
    t = buch.trimgroesse
    plan = InnenteilBauer(buch, ms).seitenplan()
    versatz = sum(1 for d in plan if d.quelle is None and d.art in ("titel", "impressum", "leer")
                  and plan.index(d) < (plan.index(next((x for x in plan if x.quelle), plan[0]))))

    karten = []
    for s in ms.seiten:
        physisch = next((i for i, d in enumerate(plan, 1) if d.quelle is s), None)
        seitenlage = "rechts" if physisch and physisch % 2 else "links"
        bildpfad = ""
        if s.bild:
            echt = os.path.join(buch.bildordner, s.bild)
            ersatz = os.path.join(buch.bauordner, "platzhalter",
                                  os.path.splitext(s.bild)[0] + ".png")
            quelle = echt if os.path.exists(echt) else (ersatz if os.path.exists(ersatz) else "")
            if quelle:
                bildpfad = os.path.relpath(quelle, buch.bauordner).replace(os.sep, "/")
        absaetze = "".join(f"<p>{a.lstrip('> ')}</p>" for a in s.absaetze)
        fehlt = "" if bildpfad else '<div class="fehlt">Bild fehlt</div>'
        karten.append(f"""
    <figure class="seite {seitenlage}">
      <div class="rahmen">{f'<img src="{bildpfad}" alt=""/>' if bildpfad else fehlt}</div>
      <figcaption>
        <span class="nr">Manuskriptseite {s.nummer} &middot; Druckseite {physisch or '?'}
        &middot; {seitenlage} &middot; {s.layout}</span>
        {absaetze}
        <span class="woerter">{s.wortzahl} W&ouml;rter</span>
      </figcaption>
    </figure>""")

    html = f"""<!doctype html><html lang="de"><meta charset="utf-8">
<title>Vorschau: {buch.voller_titel}</title>
<style>
 body{{font:15px/1.55 system-ui,sans-serif;margin:0;padding:24px;background:#f4f4f2;color:#23232b}}
 h1{{margin:0 0 4px}} .meta{{color:#666;margin-bottom:24px}}
 .raster{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}}
 .seite{{margin:0;background:#fff;border-radius:10px;overflow:hidden;
   box-shadow:0 1px 3px rgba(0,0,0,.14)}}
 .seite.links .rahmen{{border-left:4px solid #c8b6e2}}
 .seite.rechts .rahmen{{border-right:4px solid #a8d5c2}}
 .rahmen{{aspect-ratio:{t.breite}/{t.hoehe};background:#eceae6;display:flex;
   align-items:center;justify-content:center}}
 .rahmen img{{width:100%;height:100%;object-fit:cover;display:block}}
 .fehlt{{color:#a33;font-weight:600}}
 figcaption{{padding:12px 14px}} figcaption p{{margin:.4em 0}}
 .nr{{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#777;
   margin-bottom:6px}}
 .woerter{{display:block;margin-top:8px;font-size:11px;color:#999}}
</style>
<h1>{buch.voller_titel}</h1>
<div class="meta">{buch.autor} &middot; {t.bezeichnung} &middot; {len(plan)} Druckseiten &middot;
{ms.wortzahl} W&ouml;rter gesamt</div>
<div class="raster">{''.join(karten)}</div>
</html>"""
    with open(ziel, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Vorschau: {ziel}")
    return 0


def befehl_bauen(args) -> int:
    buch, ms = _laden(args.slug)
    ohne = args.ohne_platzhalter
    print(f"== {buch.voller_titel} ==\n")

    bauer = InnenteilBauer(buch, ms, platzhalter=not ohne)
    erg = bauer.bauen()
    print(f"[1/5] Innenteil  {erg.pdf}  ({erg.seiten} Seiten)")
    _warnungen("Warnungen", erg.warnungen)

    cb = CoverBauer(buch, erg.seiten, platzhalter=not ohne)
    print(f"[2/5] Cover      {cb.print_cover()}")
    print(f"                 {cb.ebook_cover()}")
    _warnungen("Warnungen", cb.warnungen)

    eb = EpubBauer(buch, ms, platzhalter=not ohne)
    pfad = eb.bauen()
    print(f"[3/5] EPUB       {pfad}  ({os.path.getsize(pfad) / 1024 / 1024:.2f} MB)")
    _warnungen("Warnungen", eb.warnungen)

    args.seiten = erg.seiten
    print("[4/5] Metadaten")
    befehl_metadaten(args)
    print("[5/5] Vorschau")
    befehl_vorschau(args)

    print("\n== Preflight ==")
    p = pruefung.pruefen(buch, ms, erg.seiten)
    print(p.bericht())
    print("\nBereit zum Upload." if p.ok else "\nBitte erst die FEHLER oben beheben.")
    return 0 if p.ok else 1


# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="kdp", description="Kinderbuecher fuer Amazon KDP bauen.")
    u = p.add_subparsers(dest="befehl", required=True)

    def mit_buch(sp, seiten: bool = False, platzhalter: bool = False):
        sp.add_argument("slug", help="Ordnername unter buecher/")
        if seiten:
            sp.add_argument("--seiten", type=int, default=None,
                            help="Seitenzahl ueberschreiben")
        if platzhalter:
            sp.add_argument("--ohne-platzhalter", action="store_true",
                            help="keine Platzhalterbilder erzeugen - fehlende Bilder melden")
        return sp

    u.add_parser("liste", help="alle Buecher auflisten").set_defaults(fn=befehl_liste)
    sp = u.add_parser("neu", help="neues Buch aus der Vorlage anlegen")
    sp.add_argument("slug")
    sp.set_defaults(fn=befehl_neu)

    mit_buch(u.add_parser("innenteil", help="Innenteil-PDF bauen"), True, True).set_defaults(fn=befehl_innenteil)
    mit_buch(u.add_parser("cover", help="Print-Cover-PDF und eBook-Cover bauen"), True, True).set_defaults(fn=befehl_cover)
    mit_buch(u.add_parser("epub", help="EPUB fuer den Kindle-Upload bauen"), True, True).set_defaults(fn=befehl_epub)
    mit_buch(u.add_parser("prompts", help="Illustrations-Briefing erzeugen"), True).set_defaults(fn=befehl_prompts)
    mit_buch(u.add_parser("metadaten", help="KDP-Eingabeblatt + Beschreibung erzeugen"), True).set_defaults(fn=befehl_metadaten)
    mit_buch(u.add_parser("vorschau", help="HTML-Vorschau Seite fuer Seite"), True).set_defaults(fn=befehl_vorschau)
    mit_buch(u.add_parser("pruefen", help="Preflight gegen die KDP-Regeln"), True).set_defaults(fn=befehl_pruefen)
    mit_buch(u.add_parser("bauen", help="alles bauen und pruefen"), True, True).set_defaults(fn=befehl_bauen)

    sp = u.add_parser("kalkulation", help="Tantiemen und Mindestpreise rechnen")
    sp.add_argument("slug", nargs="?", default=None)
    sp.add_argument("--seiten", type=int, default=None)
    sp.add_argument("--papier", default="farbe-premium",
                    choices=list(spez.PAPIERSORTEN))
    sp.add_argument("--markt", default="DE")
    sp.set_defaults(fn=befehl_kalkulation)

    args = p.parse_args(argv)
    for feld, standard in (("seiten", None), ("ohne_platzhalter", False)):
        if not hasattr(args, feld):
            setattr(args, feld, standard)
    try:
        return args.fn(args)
    except (BuchFehler, SystemExit) as e:
        print(f"Fehler: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
