"""Was bleibt pro verkauftem Buch uebrig?

Rechnet Druckkosten, Tantieme und Deckungsbeitrag - und sagt, ab welchem
Listenpreis sich ein Titel ueberhaupt lohnt.  Das ist bei Bilderbuechern die
entscheidende Zahl: Farbdruck frisst bei zu niedrigem Preis die ganze Marge.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import yaml

KONFIG = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "konfig", "druckkosten.yaml")


def konfig_laden(pfad: str = KONFIG) -> dict:
    with open(pfad, encoding="utf-8") as f:
        return yaml.safe_load(f)


@dataclass
class Rechnung:
    markt: str
    waehrung: str
    listenpreis: float
    netto: float
    druckkosten: float
    tantieme: float
    marge_prozent: float
    hinweise: list[str]

    def zeile(self) -> str:
        return (f"{self.markt}: Listenpreis {self.listenpreis:.2f} {self.waehrung} | "
                f"netto {self.netto:.2f} | Druck {self.druckkosten:.2f} | "
                f"Tantieme {self.tantieme:.2f} {self.waehrung} ({self.marge_prozent:.1f} %)")


def druckkosten(markt: str, papier: str, seiten: int, konfig: dict | None = None) -> float:
    k = konfig or konfig_laden()
    tabelle = k["druckkosten"].get(markt)
    if not tabelle:
        raise KeyError(f"Keine Druckkosten fuer Markt '{markt}' hinterlegt.")
    staffeln = tabelle.get(papier)
    if not staffeln:
        raise KeyError(f"Keine Druckkosten fuer Papier '{papier}' im Markt '{markt}'.")
    for s in staffeln:
        if seiten <= s["bis_seiten"]:
            return round(s["fix"] + s["pro_seite"] * seiten, 2)
    letzte = staffeln[-1]
    return round(letzte["fix"] + letzte["pro_seite"] * seiten, 2)


def taschenbuch(markt: str, listenpreis: float, papier: str, seiten: int,
                konfig: dict | None = None) -> Rechnung:
    k = konfig or konfig_laden()
    waehrung = k["druckkosten"][markt]["waehrung"]
    mwst = k["mwst"].get(markt, 0.0)
    netto = listenpreis / (1 + mwst)
    kosten = druckkosten(markt, papier, seiten, k)
    satz = k["tantieme"]["taschenbuch"]
    tantieme = round(netto * satz - kosten, 2)
    hinweise = []
    if tantieme <= 0:
        hinweise.append("NEGATIV - KDP wuerde diesen Preis ablehnen. Preis erhoehen "
                        "oder Seitenzahl/Papier senken.")
    elif tantieme < 1.0:
        hinweise.append("Unter 1,00 pro Verkauf - bei Werbekosten praktisch nicht tragfaehig.")
    return Rechnung(markt, waehrung, listenpreis, round(netto, 2), kosten, tantieme,
                    round(tantieme / listenpreis * 100, 1) if listenpreis else 0.0, hinweise)


def mindestpreis(markt: str, papier: str, seiten: int, ziel_tantieme: float = 0.0,
                 konfig: dict | None = None) -> float:
    """Kleinster Listenpreis (inkl. MwSt.), bei dem die Zieltantieme erreicht wird."""
    k = konfig or konfig_laden()
    mwst = k["mwst"].get(markt, 0.0)
    kosten = druckkosten(markt, papier, seiten, k)
    satz = k["tantieme"]["taschenbuch"]
    netto_noetig = (ziel_tantieme + kosten) / satz
    return round(netto_noetig * (1 + mwst) + 0.004, 2)


def ebook(markt: str, listenpreis: float, dateigroesse_mb: float = 0.0,
          konfig: dict | None = None) -> Rechnung:
    k = konfig or konfig_laden()
    waehrung = k["druckkosten"][markt]["waehrung"]
    mwst = k["mwst"].get(markt, 0.0)
    netto = listenpreis / (1 + mwst)
    fenster = k["tantieme"]["ebook_fenster"].get(waehrung, [2.99, 9.99])
    hinweise = []
    if fenster[0] <= listenpreis <= fenster[1]:
        satz = k["tantieme"]["ebook_hoch"]
        uebertragung = round(k["tantieme"]["uebertragung_pro_mb"].get(waehrung, 0.0)
                             * dateigroesse_mb, 2)
    else:
        satz = k["tantieme"]["ebook_niedrig"]
        uebertragung = 0.0
        hinweise.append(f"Ausserhalb {fenster[0]}-{fenster[1]} {waehrung}: nur "
                        f"{satz * 100:.0f} % Tantieme statt 70 %.")
    tantieme = round(netto * satz - uebertragung, 2)
    if dateigroesse_mb > 40:
        hinweise.append(f"{dateigroesse_mb:.1f} MB - bei Fixed-Layout-Bilderbuechern "
                        "fressen die Uebertragungskosten die Marge. Bilder staerker komprimieren.")
    return Rechnung(markt, waehrung, listenpreis, round(netto, 2), uebertragung, tantieme,
                    round(tantieme / listenpreis * 100, 1) if listenpreis else 0.0, hinweise)


def szenario(seiten: int, papier: str, markt: str = "DE",
             preise: list[float] | None = None, konfig: dict | None = None) -> list[Rechnung]:
    k = konfig or konfig_laden()
    preise = preise or [9.99, 11.99, 12.99, 14.99, 16.99, 18.99, 22.99]
    return [taschenbuch(markt, p, papier, seiten, k) for p in preise]
