"""Datenmodell: ein Buch = ein Ordner unter buecher/ mit buch.yaml."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import yaml

from . import spezifikation as spez


class BuchFehler(Exception):
    pass


def _hole(d: dict, pfad: str, standard: Any = None, pflicht: bool = False) -> Any:
    teile = pfad.split(".")
    wert: Any = d
    for t in teile:
        if not isinstance(wert, dict) or t not in wert:
            if pflicht:
                raise BuchFehler(f"Pflichtfeld fehlt in buch.yaml: {pfad}")
            return standard
        wert = wert[t]
    return wert


@dataclass
class Preis:
    markt: str          # z.B. "DE", "US"
    waehrung: str
    taschenbuch: float | None = None
    ebook: float | None = None
    mwst_satz: float = 0.0   # Buch-MwSt im Markt (DE 7 %); 0 = Preis ist netto


@dataclass
class Buch:
    slug: str
    pfad: str
    daten: dict

    # Kern
    titel: str = ""
    untertitel: str = ""
    autor: str = ""
    reihe: str = ""
    reihennummer: int | None = None
    sprache: str = "de"

    # Physik
    trim: str = "8.5x8.5"
    papier: str = "farbe-premium"
    mit_anschnitt: bool = True
    seiten_soll: int | None = None

    # Zielgruppe / Marketing
    altersgruppe: tuple[int, int] = (3, 6)
    klassenstufe: str = ""
    kategorien: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    beschreibung_kurz: str = ""
    verkaufsargumente: list[str] = field(default_factory=list)

    # Illustration
    stil: dict = field(default_factory=dict)
    figuren: list[dict] = field(default_factory=list)

    # Layout
    layout: dict = field(default_factory=dict)

    # Preise
    preise: list[Preis] = field(default_factory=list)

    # Rechtliches
    impressum: dict = field(default_factory=dict)
    ki_einsatz: dict = field(default_factory=dict)

    # ----------------------------------------------------------------
    @classmethod
    def laden(cls, pfad: str) -> "Buch":
        yamlpfad = os.path.join(pfad, "buch.yaml")
        if not os.path.exists(yamlpfad):
            raise BuchFehler(f"Keine buch.yaml unter {pfad}")
        with open(yamlpfad, encoding="utf-8") as f:
            d = yaml.safe_load(f) or {}

        b = cls(slug=os.path.basename(os.path.abspath(pfad)), pfad=os.path.abspath(pfad), daten=d)
        b.titel = _hole(d, "titel", pflicht=True)
        b.untertitel = _hole(d, "untertitel", "")
        b.autor = _hole(d, "autor", pflicht=True)
        b.reihe = _hole(d, "reihe", "")
        b.reihennummer = _hole(d, "reihennummer")
        b.sprache = _hole(d, "sprache", "de")

        b.trim = _hole(d, "druck.trim", "8.5x8.5")
        b.papier = _hole(d, "druck.papier", "farbe-premium")
        b.mit_anschnitt = bool(_hole(d, "druck.anschnitt", True))
        b.seiten_soll = _hole(d, "druck.seiten_soll")

        alter = _hole(d, "zielgruppe.alter", [3, 6])
        b.altersgruppe = (int(alter[0]), int(alter[1]))
        b.klassenstufe = _hole(d, "zielgruppe.klassenstufe", "")
        b.kategorien = list(_hole(d, "marketing.kategorien", []) or [])
        b.keywords = list(_hole(d, "marketing.keywords", []) or [])
        b.beschreibung_kurz = _hole(d, "marketing.kurzbeschreibung", "")
        b.verkaufsargumente = list(_hole(d, "marketing.verkaufsargumente", []) or [])

        b.stil = dict(_hole(d, "illustration.stil", {}) or {})
        b.figuren = list(_hole(d, "illustration.figuren", []) or [])
        b.layout = dict(_hole(d, "layout", {}) or {})

        for p in _hole(d, "preise", []) or []:
            b.preise.append(Preis(
                markt=p.get("markt", "DE"),
                waehrung=p.get("waehrung", "EUR"),
                taschenbuch=p.get("taschenbuch"),
                ebook=p.get("ebook"),
                mwst_satz=float(p.get("mwst_satz", 0.0)),
            ))

        b.impressum = dict(_hole(d, "impressum", {}) or {})
        b.ki_einsatz = dict(_hole(d, "ki_einsatz", {}) or {})

        if b.trim not in spez.TRIMGROESSEN:
            raise BuchFehler(
                f"Unbekannte Trimgroesse '{b.trim}'. Bekannt: {', '.join(spez.TRIMGROESSEN)}")
        if b.papier not in spez.PAPIERSORTEN:
            raise BuchFehler(
                f"Unbekannte Papiersorte '{b.papier}'. Bekannt: {', '.join(spez.PAPIERSORTEN)}")
        return b

    # ----------------------------------------------------------------
    @property
    def trimgroesse(self) -> spez.Trimgroesse:
        return spez.TRIMGROESSEN[self.trim]

    @property
    def bauordner(self) -> str:
        return os.path.join(self.pfad, "build")

    @property
    def bildordner(self) -> str:
        return os.path.join(self.pfad, "illustrationen")

    @property
    def manuskriptpfad(self) -> str:
        return os.path.join(self.pfad, "manuskript.md")

    @property
    def voller_titel(self) -> str:
        return f"{self.titel}: {self.untertitel}" if self.untertitel else self.titel

    def rand(self, name: str, standard: float) -> float:
        return float(self.layout.get("raender", {}).get(name, standard))

    def geometrie(self, seiten: int) -> spez.Innenteilgeometrie:
        t = self.trimgroesse
        return spez.Innenteilgeometrie(t.breite, t.hoehe, self.mit_anschnitt, seiten)

    def covergeometrie(self, seiten: int) -> spez.Covergeometrie:
        t = self.trimgroesse
        return spez.Covergeometrie(t.breite, t.hoehe, seiten, self.papier)
