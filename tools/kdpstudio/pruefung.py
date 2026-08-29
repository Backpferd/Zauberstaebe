"""Preflight: alles pruefen, was KDP beim Upload beanstanden wuerde.

Besser hier scheitern als nach 72 Stunden Pruefzeit im KDP-Dashboard.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from . import bilder as bildmodul
from . import kalkulation as kal
from . import metadaten as meta
from . import spezifikation as spez
from .manuskript import Manuskript


@dataclass
class Ergebnis:
    fehler: list[str] = field(default_factory=list)
    warnungen: list[str] = field(default_factory=list)
    hinweise: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.fehler

    def bericht(self) -> str:
        z = []
        for f in self.fehler:
            z.append(f"  FEHLER   {f}")
        for w in self.warnungen:
            z.append(f"  WARNUNG  {w}")
        for h in self.hinweise:
            z.append(f"  Hinweis  {h}")
        if not z:
            z.append("  Alles in Ordnung.")
        return "\n".join(z)


def pruefen(buch, ms: Manuskript, seiten: int) -> Ergebnis:
    e = Ergebnis()
    papier = spez.PAPIERSORTEN[buch.papier]
    mindest = spez.MIN_SEITEN_FARBE if papier.farbe else spez.MIN_SEITEN_SW

    # --- Umfang -----------------------------------------------------------
    if seiten < mindest:
        e.fehler.append(f"{seiten} Seiten - KDP verlangt mindestens {mindest}.")
    if seiten > spez.MAX_SEITEN:
        e.fehler.append(f"{seiten} Seiten - KDP erlaubt hoechstens {spez.MAX_SEITEN}.")
    if seiten % 2:
        e.fehler.append(f"{seiten} Seiten - die Seitenzahl muss gerade sein.")

    # --- Manuskript -------------------------------------------------------
    if not ms.seiten:
        e.fehler.append("Manuskript enthaelt keine Seiten.")
    leer = [s.nummer for s in ms.seiten if s.layout != "leer" and not s.hat_text and not s.bild]
    if leer:
        e.warnungen.append(f"Seiten ohne Inhalt: {leer}")

    a, b = buch.altersgruppe
    schnitt = ms.wortzahl / max(1, len([s for s in ms.seiten if s.hat_text]))
    if b <= 6 and schnitt > 60:
        e.warnungen.append(
            f"Durchschnittlich {schnitt:.0f} Woerter pro Textseite. Fuer {a}-{b} Jahre "
            "sind 20-50 ueblich - laengere Texte verlieren die Zielgruppe.")
    if b <= 8 and ms.wortzahl > 1500:
        e.hinweise.append(f"{ms.wortzahl} Woerter gesamt - fuer ein Bilderbuch viel. "
                          "500-1000 ist der uebliche Korridor.")

    # --- Bilder -----------------------------------------------------------
    t = buch.trimgroesse
    fehlend: list[str] = []
    for s in ms.seiten:
        if not s.bild:
            continue
        pfad = os.path.join(buch.bildordner, s.bild)
        if not os.path.exists(pfad):
            fehlend.append(s.bild)
            continue
        if s.layout == "bild-ganzseitig":
            bz, hz = t.breite + spez.ANSCHNITT, t.hoehe + 2 * spez.ANSCHNITT
        else:
            geo = buch.geometrie(seiten)
            _, _, bb, hh = geo.satzspiegel(s.nummer, buch.rand("aussen", 0.5),
                                           buch.rand("oben", 0.5), buch.rand("unten", 0.5))
            bz, hz = bb, hh * float(buch.layout.get("bildanteil", 0.62))
        befund = bildmodul.pruefen(pfad, bz, hz)
        for p in befund.probleme:
            e.fehler.append(f"Seite {s.nummer} ({s.bild}): {p}")
        for h in befund.hinweise:
            e.hinweise.append(f"Seite {s.nummer} ({s.bild}): {h}")
    if fehlend:
        e.warnungen.append(f"{len(fehlend)} Illustration(en) fehlen noch, es werden "
                           f"Platzhalter gedruckt: {', '.join(fehlend[:6])}"
                           + (" ..." if len(fehlend) > 6 else ""))

    # --- Cover ------------------------------------------------------------
    cover = buch.daten.get("cover", {}) or {}
    geo = buch.covergeometrie(seiten)
    if not cover.get("front_bild"):
        e.warnungen.append("Kein cover.front_bild gesetzt - das Cover entsteht rein aus "
                           "Farbflaeche und Text. Bei Kinderbuechern verkauft das schlecht.")
    else:
        pfad = os.path.join(buch.bildordner, cover["front_bild"])
        if not os.path.exists(pfad):
            e.warnungen.append(f"Coverbild fehlt noch: {cover['front_bild']}")
        else:
            befund = bildmodul.pruefen(pfad, geo.trim_breite + spez.ANSCHNITT,
                                       geo.gesamt_hoehe, spez.COVER_DPI_MIN)
            for p in befund.probleme:
                e.fehler.append(f"Coverbild: {p}")
    if not geo.ruecken_text_erlaubt:
        e.hinweise.append(
            f"Ruecken ({spez.mm(geo.ruecken):.1f} mm) bleibt unbeschriftet - "
            f"KDP erlaubt Ruecken-Text erst ab {spez.MIN_SEITEN_FUER_RUECKENTEXT} Seiten.")

    # --- Metadaten --------------------------------------------------------
    beschreibung = meta.beschreibung_bauen(buch)
    for name, bf in (("Beschreibung", meta.beschreibung_pruefen(beschreibung)),
                     ("Keywords", meta.keywords_pruefen(buch.keywords)),
                     ("Titel", meta.titel_pruefen(buch))):
        e.fehler.extend(f"{name}: {x}" for x in bf.fehler)
        e.warnungen.extend(f"{name}: {x}" for x in bf.warnungen)
    if len(buch.kategorien) < 3:
        e.warnungen.append(f"Nur {len(buch.kategorien)} von 3 Kategorien gesetzt.")

    # --- Rechtliches ------------------------------------------------------
    if not buch.impressum.get("verantwortlich"):
        e.warnungen.append(
            "impressum.verantwortlich fehlt. Fuer den Verkauf in der EU verlangt die "
            "GPSR seit 13.12.2024 eine benannte verantwortliche Person mit "
            "Kontaktadresse - ohne die wird das Buch in der EU ausgeblendet.")
    if not buch.ki_einsatz:
        e.warnungen.append(
            "Abschnitt ki_einsatz fehlt. KDP fragt beim Upload verpflichtend nach "
            "KI-generiertem Text, Bildern und Uebersetzungen.")

    # --- Preis / Marge ----------------------------------------------------
    try:
        k = kal.konfig_laden()
        for p in buch.preise:
            if p.taschenbuch:
                r = kal.taschenbuch(p.markt, p.taschenbuch, buch.papier, seiten, k)
                for hw in r.hinweise:
                    e.fehler.append(f"Preis {p.markt}: {hw}")
                e.hinweise.append(r.zeile())
                mp = kal.mindestpreis(p.markt, buch.papier, seiten, 0.0, k)
                if p.taschenbuch < mp:
                    e.fehler.append(f"Preis {p.markt} {p.taschenbuch:.2f} liegt unter dem "
                                    f"Mindestpreis {mp:.2f} {r.waehrung}.")
            if p.ebook:
                r = kal.ebook(p.markt, p.ebook, 0.0, k)
                for hw in r.hinweise:
                    e.warnungen.append(f"eBook {p.markt}: {hw}")
                e.hinweise.append("eBook " + r.zeile())
        e.hinweise.append(f"Druckkosten-Tabelle Stand {k.get('stand')} "
                          f"({k.get('geprueft_von')}).")
    except Exception as ex:  # noqa: BLE001
        e.warnungen.append(f"Kalkulation nicht moeglich: {ex}")

    return e
