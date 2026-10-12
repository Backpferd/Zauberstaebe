/**
 * Renderer: WebGL, Tonemapping, Nebel, Licht und Nachbearbeitung (AO, Bloom)
 * wie in der Konzeptszene, dazu die Grafikstufen.
 *
 * Ebenen: Transparente Effekte (Partikel, Sprites, Leuchtflächen) gehören auf
 * `EBENE_EFFEKTE`. Die Kamera sieht sie, die Umgebungsverdeckung (GTAO) nicht.
 * Sonst entstehen dunkle Ränder um jeden Funken.
 */
import {
  ACESFilmicToneMapping,
  Color,
  FogExp2,
  HalfFloatType,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Pass } from 'three/addons/postprocessing/Pass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Bus } from './bus';
import {
  merkeGrafikstufe,
  STANDARD_GRAFIKSTUFE,
  STUFEN_EINSTELLUNGEN,
  type Grafikstufe,
} from './grafikstufe';
import type { Kamera } from './kamera';
import { SchattenLicht } from './schatten';

/** Ebene für transparente Effekte, die nicht in die Umgebungsverdeckung sollen. */
export const EBENE_EFFEKTE = 1;

/** Farben und Werte aus der Konzeptszene. */
const NEBEL_FARBE = 0x0e1a20;
const NEBEL_DICHTE = 0.021;
const BELICHTUNG = 1.3;
const HIMMEL_FARBE = 0x5f74a0;
const BODEN_FARBE = 0x221a12;
const HEMISPHAERE_STAERKE = 1.25;

/** HDR-Spitzen begrenzen, sonst „explodiert“ der Bloom bei vielen überlagerten Partikeln. */
const BEGRENZER = {
  uniforms: { tDiffuse: { value: null }, uMax: { value: 2.5 } },
  vertexShader:
    'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float m = max(max(c.r, c.g), c.b);
      if (m > uMax) c.rgb *= uMax / m;
      gl_FragColor = c;
    }`,
};

export interface RendererOptionen {
  leinwand: HTMLCanvasElement;
  kamera: Kamera;
  /** Für `grafikstufe:geaendert` (senden und empfangen). */
  bus?: Bus;
  stufe?: Grafikstufe;
}

export interface RenderStatistik {
  /** Draw-Calls im letzten Bild, Nachbearbeitung eingeschlossen. */
  drawCalls: number;
  /** Dreiecke im letzten Bild. */
  dreiecke: number;
}

export class SpielRenderer {
  readonly three: WebGLRenderer;
  readonly szene: Scene;
  readonly hemisphaere: HemisphereLight;
  readonly schatten: SchattenLicht;
  readonly kamera: Kamera;

  private stufeIntern: Grafikstufe;
  private composer: EffectComposer | null = null;
  private passes: Pass[] = [];
  /** Kopie der Kamera, die nur Ebene 0 sieht (für GTAO). */
  private readonly aoKamera = new PerspectiveCamera();
  private readonly bus: Bus | undefined;
  private readonly abmelden: (() => void)[] = [];
  private readonly groesse = new Vector2();

  constructor(optionen: RendererOptionen) {
    this.kamera = optionen.kamera;
    this.bus = optionen.bus;
    this.stufeIntern = optionen.stufe ?? STANDARD_GRAFIKSTUFE;
    merkeGrafikstufe(this.stufeIntern);

    const three = new WebGLRenderer({
      canvas: optionen.leinwand,
      antialias: true,
      powerPreference: 'high-performance',
    });
    three.shadowMap.enabled = true;
    three.shadowMap.type = PCFShadowMap;
    three.toneMapping = ACESFilmicToneMapping;
    three.toneMappingExposure = BELICHTUNG;
    // Statistik über alle Durchgänge eines Bilds sammeln, nicht nur den letzten.
    three.info.autoReset = false;
    this.three = three;

    const szene = new Scene();
    const nebelFarbe = new Color(NEBEL_FARBE);
    szene.background = nebelFarbe;
    szene.fog = new FogExp2(nebelFarbe, NEBEL_DICHTE);
    this.szene = szene;

    this.hemisphaere = new HemisphereLight(HIMMEL_FARBE, BODEN_FARBE, HEMISPHAERE_STAERKE);
    szene.add(this.hemisphaere);
    this.schatten = new SchattenLicht(STUFEN_EINSTELLUNGEN[this.stufeIntern].schattenAufloesung);
    this.schatten.hinzufuegen(szene);

    this.kamera.objekt.layers.enable(EBENE_EFFEKTE);

    const beiKontextVerlust = (ereignis: Event): void => {
      // Erlaubt dem Browser, den Kontext wiederherzustellen.
      ereignis.preventDefault();
      console.warn('WebGL-Kontext verloren, warte auf Wiederherstellung.');
    };
    optionen.leinwand.addEventListener('webglcontextlost', beiKontextVerlust);
    this.abmelden.push(() =>
      optionen.leinwand.removeEventListener('webglcontextlost', beiKontextVerlust),
    );

    const beiGroesse = (): void => this.groesseAnpassen();
    window.addEventListener('resize', beiGroesse);
    this.abmelden.push(() => window.removeEventListener('resize', beiGroesse));

    if (this.bus !== undefined) {
      this.abmelden.push(
        this.bus.an('grafikstufe:geaendert', ({ stufe }) => this.setzeStufe(stufe)),
      );
    }

    this.stufeAnwenden();
  }

  get stufe(): Grafikstufe {
    return this.stufeIntern;
  }

  /** Wechselt die Grafikstufe und meldet das mit `grafikstufe:geaendert`. */
  setzeStufe(stufe: Grafikstufe): void {
    if (stufe === this.stufeIntern) return;
    this.stufeIntern = stufe;
    merkeGrafikstufe(stufe);
    this.stufeAnwenden();
    this.bus?.aus('grafikstufe:geaendert', { stufe });
  }

  /** Passt Zeichenfläche, Nachbearbeitung und Kamera an die Fenstergröße an. */
  groesseAnpassen(): void {
    const leinwand = this.three.domElement;
    const breite = Math.max(1, leinwand.clientWidth || window.innerWidth);
    const hoehe = Math.max(1, leinwand.clientHeight || window.innerHeight);
    this.three.setSize(breite, hoehe, false);
    this.composer?.setSize(breite, hoehe);
    this.kamera.seitenverhaeltnis(breite / hoehe);
  }

  /** Zeichnet ein Bild. Vorher müssen die Systeme gerendert haben (Kamera!). */
  zeichnen(): void {
    this.three.info.reset();
    this.schatten.nachfuehren(this.kamera.sichtFokus);
    const composer = this.composer;
    if (composer === null) {
      this.three.render(this.szene, this.kamera.objekt);
      return;
    }
    this.aoKamera.copy(this.kamera.objekt, false);
    this.aoKamera.layers.set(0);
    composer.render();
  }

  get statistik(): RenderStatistik {
    return {
      drawCalls: this.three.info.render.calls,
      dreiecke: this.three.info.render.triangles,
    };
  }

  /** Name der Grafikkarte für den Fehlerbericht. */
  grafikkarte(): string {
    const gl = this.three.getContext();
    const standard = String(gl.getParameter(gl.RENDERER));
    // Chrome nennt die echte Karte nur über die Debug-Erweiterung.
    if (!/webkit|mozilla/i.test(standard)) return standard;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info === null ? standard : String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }

  entsorgen(): void {
    for (const abmelden of this.abmelden) abmelden();
    this.abmelden.length = 0;
    this.nachbearbeitungEntsorgen();
    this.three.dispose();
  }

  private stufeAnwenden(): void {
    const einstellung = STUFEN_EINSTELLUNGEN[this.stufeIntern];
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    this.three.setPixelRatio(Math.min(dpr, einstellung.pixelVerhaeltnisMax));
    this.schatten.setzeAufloesung(einstellung.schattenAufloesung);
    this.nachbearbeitungAufbauen();
    this.groesseAnpassen();
  }

  private nachbearbeitungAufbauen(): void {
    this.nachbearbeitungEntsorgen();
    const einstellung = STUFEN_EINSTELLUNGEN[this.stufeIntern];
    // Ohne AO und Bloom direkt zeichnen: spart Zwischenbilder und Speicher.
    if (!einstellung.ao && !einstellung.bloom) return;

    const pixel = this.three.getPixelRatio();
    this.three.getSize(this.groesse);
    const breite = Math.max(1, this.groesse.x);
    const hoehe = Math.max(1, this.groesse.y);
    const ziel = new WebGLRenderTarget(breite * pixel, hoehe * pixel, {
      type: HalfFloatType,
      samples: einstellung.msaa,
    });
    const composer = new EffectComposer(this.three, ziel);
    composer.setPixelRatio(pixel);
    composer.setSize(breite, hoehe);

    const passes: Pass[] = [new RenderPass(this.szene, this.kamera.objekt)];
    if (einstellung.ao) {
      const ao = new GTAOPass(this.szene, this.aoKamera, breite * pixel, hoehe * pixel);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 0.85;
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1, thickness: 1, scale: 1 });
      passes.push(ao);
    }
    passes.push(new ShaderPass(BEGRENZER));
    if (einstellung.bloom) {
      passes.push(new UnrealBloomPass(new Vector2(breite * pixel, hoehe * pixel), 0.5, 0.4, 0.92));
    }
    passes.push(new OutputPass());
    for (const pass of passes) composer.addPass(pass);

    this.composer = composer;
    this.passes = passes;
  }

  private nachbearbeitungEntsorgen(): void {
    for (const pass of this.passes) pass.dispose();
    this.passes = [];
    this.composer?.dispose();
    this.composer = null;
  }
}
