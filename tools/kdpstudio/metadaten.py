"""Erzeugt das komplette KDP-Eintragspaket.

Ausgabe:
  build/kdp-eingabe.md    Feld fuer Feld zum Abtippen/Kopieren in KDP
  build/beschreibung.html Produktbeschreibung mit dem HTML, das KDP erlaubt
  build/kdp-eingabe.json  maschinenlesbar - Futter fuer Browser-Automatisierung

KDP erlaubt in der Beschreibung nur eine kleine HTML-Untermenge:
  <br> <p> <b> <em> <i> <u> <h4> <h5> <h6> <ol> <ul> <li>
Alles andere wird verworfen oder als Text angezeigt.
"""

from __future__ import annotations

import html
import json
import os
import re
from dataclasses import dataclass, field

from . import spezifikation as spez

ERLAUBTE_TAGS = {"br", "p", "b", "em", "i", "u", "h4", "h5", "h6", "ol", "ul", "li"}


@dataclass
class Befund:
    fehler: list[str] = field(default_factory=list)
    warnungen: list[str] = field(default_factory=list)


def beschreibung_bauen(buch) -> str:
    """Baut die Produktbeschreibung aus buch.yaml zusammen."""
    m = buch.daten.get("marketing", {}) or {}
    teile: list[str] = []

    if m.get("hook"):
        teile.append(f"<h4>{html.escape(m['hook'])}</h4>")

    for absatz in (m.get("beschreibung") or []):
        teile.append(f"<p>{_inline(absatz)}</p>")

    argumente = m.get("verkaufsargumente") or []
    if argumente:
        if m.get("argumente_ueberschrift"):
            teile.append(f"<h5>{html.escape(m['argumente_ueberschrift'])}</h5>")
        punkte = "".join(f"<li>{_inline(a)}</li>" for a in argumente)
        teile.append(f"<ul>{punkte}</ul>")

    fakten: list[str] = []
    a, b = buch.altersgruppe
    fakten.append(f"Fuer Kinder von {a} bis {b} Jahren")
    if m.get("seitenangabe"):
        fakten.append(m["seitenangabe"])
    if m.get("leseart"):
        fakten.append(m["leseart"])
    if fakten:
        teile.append("<ul>" + "".join(f"<li>{_inline(f)}</li>" for f in fakten) + "</ul>")

    if m.get("abschluss"):
        teile.append(f"<p><b>{_inline(m['abschluss'])}</b></p>")

    return "\n".join(teile)


def _inline(text: str) -> str:
    """Erlaubt **fett** und *kursiv* im YAML, escaped den Rest."""
    t = html.escape(text)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", t)
    return t


def beschreibung_pruefen(html_text: str) -> Befund:
    b = Befund()
    nur_text = re.sub(r"<[^>]+>", "", html_text)
    if len(html_text) > spez.BESCHREIBUNG_MAX_ZEICHEN:
        b.fehler.append(f"Beschreibung {len(html_text)} Zeichen - KDP erlaubt "
                        f"{spez.BESCHREIBUNG_MAX_ZEICHEN} (HTML zaehlt mit).")
    if len(nur_text.strip()) < 200:
        b.warnungen.append(f"Nur {len(nur_text.strip())} Zeichen Text - kurze Beschreibungen "
                           "verkaufen messbar schlechter. 800-2000 Zeichen sind ueblich.")
    for tag in set(re.findall(r"</?([a-zA-Z0-9]+)", html_text)):
        if tag.lower() not in ERLAUBTE_TAGS:
            b.fehler.append(f"<{tag}> ist in der KDP-Beschreibung nicht erlaubt.")
    return b


def keywords_pruefen(keywords: list[str]) -> Befund:
    b = Befund()
    if len(keywords) > spez.KEYWORD_ANZAHL:
        b.fehler.append(f"{len(keywords)} Keywords - KDP nimmt genau "
                        f"{spez.KEYWORD_ANZAHL} Felder.")
    if len(keywords) < spez.KEYWORD_ANZAHL:
        b.warnungen.append(f"Nur {len(keywords)} von {spez.KEYWORD_ANZAHL} Keyword-Feldern "
                           "genutzt - jedes leere Feld ist verschenkte Sichtbarkeit.")
    gesehen: set[str] = set()
    for k in keywords:
        if len(k) > spez.KEYWORD_MAX_ZEICHEN:
            b.fehler.append(f"Keyword zu lang ({len(k)} Zeichen): {k!r}")
        for wort in k.lower().split():
            if wort in gesehen:
                b.warnungen.append(f"'{wort}' kommt in mehreren Keywords vor - "
                                   "Wiederholung bringt keinen zusaetzlichen Treffer.")
                break
            gesehen.add(wort)
        if any(z in k.lower() for z in ("bestseller", "gratis", "kostenlos", "neu ")):
            b.warnungen.append(f"Keyword {k!r} enthaelt einen von Amazon verbotenen Begriff "
                               "(Ranking-/Werbeaussagen sind untersagt).")
    return b


def titel_pruefen(buch) -> Befund:
    b = Befund()
    if len(buch.titel) > 200:
        b.fehler.append("Titel laenger als 200 Zeichen.")
    verboten = ["bestseller", "kostenlos", "gratis", "%", "sale"]
    for v in verboten:
        if v in (buch.titel + " " + buch.untertitel).lower():
            b.warnungen.append(f"'{v}' im Titel/Untertitel - Amazon untersagt Werbeaussagen "
                               "im Titelfeld und blockiert Buecher dafuer.")
    if not buch.untertitel:
        b.warnungen.append("Kein Untertitel - der Untertitel ist eines der staerksten "
                           "Suchfelder bei Amazon. Unbedingt nutzen.")
    return b


# ---------------------------------------------------------------------------

def paket_schreiben(buch, seiten: int, kalk_zeilen: list[str] | None = None) -> dict:
    os.makedirs(buch.bauordner, exist_ok=True)
    beschreibung = beschreibung_bauen(buch)

    befunde = {
        "beschreibung": beschreibung_pruefen(beschreibung),
        "keywords": keywords_pruefen(buch.keywords),
        "titel": titel_pruefen(buch),
    }

    html_pfad = os.path.join(buch.bauordner, "beschreibung.html")
    with open(html_pfad, "w", encoding="utf-8") as f:
        f.write(beschreibung + "\n")

    geo = buch.covergeometrie(seiten)
    daten = {
        "buch": buch.slug,
        "sprache": buch.sprache,
        "titel": buch.titel,
        "untertitel": buch.untertitel,
        "reihe": buch.reihe,
        "reihennummer": buch.reihennummer,
        "autor": buch.autor,
        "beschreibung_html": beschreibung,
        "keywords": buch.keywords,
        "kategorien": buch.kategorien,
        "altersgruppe": {"von": buch.altersgruppe[0], "bis": buch.altersgruppe[1]},
        "klassenstufe": buch.klassenstufe,
        "ki_einsatz": buch.ki_einsatz,
        "taschenbuch": {
            "trim": buch.trimgroesse.bezeichnung,
            "trim_schluessel": buch.trim,
            "papier": buch.papier,
            "anschnitt": buch.mit_anschnitt,
            "seiten": seiten,
            "ruecken_zoll": round(geo.ruecken, 4),
            "ruecken_mm": round(spez.mm(geo.ruecken), 2),
            "cover_zoll": [round(geo.gesamt_breite, 3), round(geo.gesamt_hoehe, 3)],
            "cover_mm": [round(spez.mm(geo.gesamt_breite), 1), round(spez.mm(geo.gesamt_hoehe), 1)],
            "cover_px_300dpi": [int(geo.gesamt_breite * 300), int(geo.gesamt_hoehe * 300)],
        },
        "preise": [{"markt": p.markt, "waehrung": p.waehrung,
                    "taschenbuch": p.taschenbuch, "ebook": p.ebook} for p in buch.preise],
        "dateien": {
            "innenteil_pdf": f"{buch.slug}-innenteil.pdf",
            "cover_pdf": f"{buch.slug}-cover.pdf",
            "epub": f"{buch.slug}.epub",
            "ebook_cover": f"{buch.slug}-ebook-cover.jpg",
        },
    }
    json_pfad = os.path.join(buch.bauordner, "kdp-eingabe.json")
    with open(json_pfad, "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=2)

    md_pfad = os.path.join(buch.bauordner, "kdp-eingabe.md")
    with open(md_pfad, "w", encoding="utf-8") as f:
        f.write(_eingabeblatt(buch, seiten, beschreibung, befunde, kalk_zeilen or []))

    return {"beschreibung": html_pfad, "json": json_pfad, "blatt": md_pfad, "befunde": befunde}


def _eingabeblatt(buch, seiten: int, beschreibung: str, befunde: dict,
                  kalk_zeilen: list[str]) -> str:
    geo = buch.covergeometrie(seiten)
    z: list[str] = []
    A = z.append
    A(f"# KDP-Eingabeblatt: {buch.voller_titel}\n")
    A("Jeder Abschnitt entspricht einem Schritt im KDP-Assistenten. "
      "Werte von hier kopieren, nichts frei erfinden - sonst weichen Buch und "
      "Produktseite voneinander ab.\n")

    A("## Schritt 1 - Angaben zum Buch (Taschenbuch UND eBook identisch)\n")
    A("| Feld | Wert |")
    A("| --- | --- |")
    A(f"| Sprache | {buch.sprache} |")
    A(f"| Buchtitel | `{buch.titel}` |")
    A(f"| Untertitel | `{buch.untertitel}` |")
    A(f"| Reihe | `{buch.reihe}`" + (f" (Band {buch.reihennummer})" if buch.reihennummer else "") + " |")
    A(f"| Autor | `{buch.autor}` |")
    A(f"| Ausgabennummer | {buch.impressum.get('auflage', '-')} |")
    A(f"| Altersempfehlung | {buch.altersgruppe[0]} bis {buch.altersgruppe[1]} Jahre |")
    if buch.klassenstufe:
        A(f"| Klassenstufe | {buch.klassenstufe} |")
    A("")

    A("### Beschreibung (in das Feld 'Beschreibung' einfuegen)\n")
    A("KDP akzeptiert dort HTML. Kompletten Block inkl. Tags kopieren:\n")
    A("```html")
    A(beschreibung)
    A("```")
    nur_text = re.sub(r"<[^>]+>", "", beschreibung)
    A(f"\nLaenge: {len(beschreibung)} Zeichen inkl. HTML "
      f"(Limit {spez.BESCHREIBUNG_MAX_ZEICHEN}), {len(nur_text.strip())} Zeichen reiner Text.\n")

    A("### Keywords (7 Felder)\n")
    for i in range(spez.KEYWORD_ANZAHL):
        wert = buch.keywords[i] if i < len(buch.keywords) else ""
        A(f"{i + 1}. `{wert}`" + ("" if wert else "  <-- LEER, unbedingt fuellen"))
    A("")

    A("### Kategorien (bis zu 3)\n")
    for i, k in enumerate(buch.kategorien[:3], 1):
        A(f"{i}. `{k}`")
    if len(buch.kategorien) < 3:
        A(f"\n{3 - len(buch.kategorien)} Kategorie(n) noch offen - alle drei nutzen.")
    A("")

    ki = buch.ki_einsatz
    A("### KI-Erklaerung (Pflichtfeld bei KDP)\n")
    A("KDP fragt beim Upload getrennt nach Text, Bildern und Uebersetzung. "
      "Antworten fuer dieses Buch:\n")
    A("| Bereich | KI-generiert? | Angabe |")
    A("| --- | --- | --- |")
    for bereich, feld in (("Text", "text"), ("Bilder", "bilder"), ("Uebersetzung", "uebersetzung")):
        wert = ki.get(feld, "nicht gesetzt")
        A(f"| {bereich} | {wert} | {ki.get(feld + '_hinweis', '')} |")
    A("\n> Falsche Angaben hier sind ein Verstoss gegen die KDP-Bedingungen und "
      "koennen zur Kontosperrung fuehren. Im Zweifel 'KI-unterstuetzt' angeben.\n")

    A("## Schritt 2 - Inhalt Taschenbuch\n")
    A("| Feld | Wert |")
    A("| --- | --- |")
    A(f"| ISBN | {buch.impressum.get('isbn') or 'kostenlose KDP-ISBN waehlen'} |")
    A("| Druck | Taschenbuch |")
    A(f"| Tinte und Papier | {spez.PAPIERSORTEN[buch.papier].beschreibung} |")
    A(f"| Trimgroesse | {buch.trimgroesse.bezeichnung} |")
    A(f"| Anschnitt | {'Randabfallend (Bleed)' if buch.mit_anschnitt else 'Ohne Anschnitt'} |")
    A("| Coverausfuehrung | Matt (bei Kinderbuechern ueblich) |")
    A(f"| Seitenzahl | {seiten} |")
    A(f"| Manuskriptdatei | `build/{buch.slug}-innenteil.pdf` |")
    A(f"| Coverdatei | `build/{buch.slug}-cover.pdf` |")
    A("")
    A("**Cover-Masse zur Kontrolle (falls extern gestaltet):**\n")
    A(f"- Ruecken: {geo.ruecken:.4f} Zoll = {spez.mm(geo.ruecken):.2f} mm")
    A(f"- Gesamtcover: {geo.gesamt_breite:.3f} x {geo.gesamt_hoehe:.3f} Zoll "
      f"= {spez.mm(geo.gesamt_breite):.1f} x {spez.mm(geo.gesamt_hoehe):.1f} mm")
    A(f"- bei 300 dpi: {int(geo.gesamt_breite * 300)} x {int(geo.gesamt_hoehe * 300)} px")
    A(f"- Ruecken-Beschriftung erlaubt: "
      f"{'ja' if geo.ruecken_text_erlaubt else f'nein (erst ab {spez.MIN_SEITEN_FUER_RUECKENTEXT} Seiten)'}")
    A("")

    A("## Schritt 3 - Rechte und Preis\n")
    A("| Feld | Wert |")
    A("| --- | --- |")
    A("| Verlagsrechte | Ich bin Inhaber der Urheberrechte |")
    for p in buch.preise:
        if p.taschenbuch:
            A(f"| Taschenbuch {p.markt} | {p.taschenbuch:.2f} {p.waehrung} |")
        if p.ebook:
            A(f"| eBook {p.markt} | {p.ebook:.2f} {p.waehrung} |")
    A("")
    if kalk_zeilen:
        A("### Kalkulation\n")
        A("```")
        for zl in kalk_zeilen:
            A(zl)
        A("```")
        A("")

    A("## Schritt 4 - eBook\n")
    A("| Feld | Wert |")
    A("| --- | --- |")
    A(f"| Manuskript | `build/{buch.slug}.epub` |")
    A(f"| Cover | `build/{buch.slug}-ebook-cover.jpg` |")
    A(f"| Layout | {(buch.daten.get('ebook', {}) or {}).get('layout', 'fest')} |")
    A("| DRM | nach eigener Entscheidung |")
    A("| KDP Select | 90 Tage Exklusivitaet - nur waehlen, wenn das eBook nirgends sonst laeuft |")
    A("")

    alle: list[str] = []
    for name, bf in befunde.items():
        for x in bf.fehler:
            alle.append(f"- FEHLER [{name}] {x}")
        for x in bf.warnungen:
            alle.append(f"- Hinweis [{name}] {x}")
    A("## Pruefergebnis Metadaten\n")
    if alle:
        z.extend(alle)
    else:
        A("Keine Beanstandungen.")
    A("")
    return "\n".join(z)
