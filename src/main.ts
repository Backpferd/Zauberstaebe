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
} from '@engine/index';
import { baueTestszene } from './testszene';

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

// Wegwerf-Testszene, bis Spieler (1.1) und Gebiet (1.2) stehen.
baueTestszene(engine);

engine.starten();
