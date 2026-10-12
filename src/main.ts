import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya/latin-700.css';
import './style.css';

import { texte } from '@content/texte';
import {
  erzeugeEngine,
  grafikstufeAusAdresse,
  installiereFehlerSammler,
  registriereTexte,
  seedAusAdresse,
  type Engine,
} from '@engine/index';

// Zuerst: Fehler und Warnungen für den F8-Bericht mitschreiben.
installiereFehlerSammler();

// Die Engine darf `content` nicht importieren, deshalb bekommt sie die Texte hier.
registriereTexte(texte);

const leinwand = document.getElementById('spiel');
if (!(leinwand instanceof HTMLCanvasElement)) {
  throw new Error('Das Canvas-Element #spiel fehlt in index.html.');
}

const { seed } = seedAusAdresse(window.location.search);
const engine = erzeugeEngine({
  leinwand,
  seed,
  grafikstufe: grafikstufeAusAdresse(window.location.search) ?? undefined,
  beiErstemBild: () => {
    // Marker für Browsertests: mindestens ein Bild wurde gezeichnet.
    document.body.dataset['bereit'] = 'true';
  },
});

/**
 * Vorschauseiten: Jede Datei `src/vorschau/<name>.ts` ist über `?szene=<name>`
 * erreichbar. So kann jeder Baustein eine eigene Testseite haben, ohne dass
 * parallel arbeitende Agenten diese Datei anfassen müssen.
 *
 * Eine Vorschau exportiert `default (engine) => void | Promise<void>` und
 * optional `titel`. Regeln: `docs/architektur.md`, Abschnitt 10.
 */
interface VorschauModul {
  default: (engine: Engine) => void | Promise<void>;
  titel?: string;
}

const vorschauen = import.meta.glob<VorschauModul>('./vorschau/*.ts');
const STANDARD_SZENE = 'testszene';

async function szeneLaden(): Promise<void> {
  const gewuenscht = new URLSearchParams(window.location.search).get('szene') ?? STANDARD_SZENE;
  let laden = vorschauen[`./vorschau/${gewuenscht}.ts`];
  if (!laden) {
    const vorhanden = Object.keys(vorschauen)
      .map((pfad) => pfad.replace('./vorschau/', '').replace('.ts', ''))
      .join(', ');
    console.warn(`Unbekannte Szene „${gewuenscht}“. Vorhanden: ${vorhanden}`);
    laden = vorschauen[`./vorschau/${STANDARD_SZENE}.ts`];
  }
  if (!laden) throw new Error('Die Standardszene fehlt in src/vorschau/.');

  const modul = await laden();
  await modul.default(engine);
  if (modul.titel) document.title = `${modul.titel} · Zauberstäbe`;
  engine.starten();
}

szeneLaden().catch((fehler: unknown) => {
  console.error('Szene konnte nicht geladen werden:', fehler);
});
