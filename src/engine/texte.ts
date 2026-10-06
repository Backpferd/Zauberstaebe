/**
 * Texttabelle und `t()` (Architektur Abschnitt 5 und Regel 6).
 *
 * Jeder sichtbare Text kommt über `t('schluessel')`. Die Tabelle selbst liegt in
 * `src/content/texte.ts`. Weil `engine` nichts aus `content` importieren darf,
 * übergibt `main.ts` die Tabelle beim Start mit `registriereTexte`.
 */

/** Flache Tabelle: Schlüssel mit Punkten (`'quest.schriftrolle.titel'`) → Text. */
export type Texttabelle = Readonly<Record<string, string>>;

/** Werte für Platzhalter wie `{name}`. Zahlen werden deutsch formatiert. */
export type Textwerte = Readonly<Record<string, string | number>>;

let tabelle: Record<string, string> = {};
const gewarnt = new Set<string>();
const zahlFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const PLATZHALTER = /\{([A-Za-z0-9_]+)\}/g;

/**
 * Registriert Texte. Mehrere Aufrufe ergänzen sich; bei gleichem Schlüssel
 * gewinnt der spätere. Mit `ersetzen: true` wird die Tabelle vorher geleert.
 */
export function registriereTexte(neu: Texttabelle, optionen: { ersetzen?: boolean } = {}): void {
  if (optionen.ersetzen === true) {
    tabelle = {};
    gewarnt.clear();
  }
  Object.assign(tabelle, neu);
}

/** Ob es zu einem Schlüssel einen Text gibt. */
export function hatText(schluessel: string): boolean {
  return Object.hasOwn(tabelle, schluessel);
}

/**
 * Holt einen Text und setzt Platzhalter ein: `t('beute.gold', { menge: 37 })`.
 *
 * Ein fehlender Schlüssel liefert `⟦schluessel⟧` und eine Warnung, ein
 * fehlender Wert lässt `{platzhalter}` stehen. Beides stürzt nie ab und wird
 * pro Schlüssel nur einmal gemeldet.
 */
export function t(schluessel: string, werte?: Textwerte): string {
  const vorlage = Object.hasOwn(tabelle, schluessel) ? tabelle[schluessel] : undefined;
  if (vorlage === undefined) {
    einmalWarnen(schluessel, `Text fehlt: '${schluessel}' (in src/content/texte.ts ergänzen).`);
    return `⟦${schluessel}⟧`;
  }
  if (!vorlage.includes('{')) return vorlage;
  return vorlage.replace(PLATZHALTER, (ganz, name: string) => {
    const wert = werte !== undefined && Object.hasOwn(werte, name) ? werte[name] : undefined;
    if (wert === undefined) {
      einmalWarnen(`${schluessel}#${name}`, `Text '${schluessel}': Wert für {${name}} fehlt.`);
      return ganz;
    }
    return typeof wert === 'number' ? zahlFormat.format(wert) : wert;
  });
}

function einmalWarnen(kennung: string, text: string): void {
  if (gewarnt.has(kennung)) return;
  gewarnt.add(kennung);
  console.warn(text);
}
