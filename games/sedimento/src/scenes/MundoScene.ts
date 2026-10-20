import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import type { AtlasPixel } from '../data/atlas';
import { exponer, marcarListo } from '../core/test-hooks';
import { medidor } from '../core/metricas';
import { aPantalla } from '../logic/iso';
import { ControlCamara } from '../render/controlCamara';
import { CLAVE_REGISTRO_ATLAS, ESTADO_FINAL, colocar, type PedidoSprite } from '../render/sprites';
import { PanelRendimiento } from '../ui/panelRendimiento';

/** Aldea provisional para comprobar el atlas, las anclas y el orden de dibujo (hasta que haya terreno y simulación). */
const ALDEA: PedidoSprite[] = [
  { id: 'templo_jupiter', estado: ESTADO_FINAL, u: 30, v: 24 },
  { id: 'casa_2x2_b', estado: ESTADO_FINAL, ori: 'u', u: 23, v: 24 },
  { id: 'casa_2x2_c', estado: ESTADO_FINAL, ori: 'v', u: 23, v: 28 },
  { id: 'casa_3x2_a', estado: ESTADO_FINAL, ori: 'u', u: 22, v: 32 },
  { id: 'puesto_fruta', u: 31, v: 31 },
  { id: 'puesto_telas', u: 34, v: 31 },
  { id: 'prop_pozo', u: 29, v: 33 },
  { id: 'torre', u: 38, v: 25 },
  { id: 'arbol_encina_1', u: 38.5, v: 30.5 },
  { id: 'arbol_cipres_2', u: 21.5, v: 22.5 },
  { id: 'arbol_olivo_3', u: 36.5, v: 34.5 },
  { id: 'roca_2', u: 27.5, v: 36.5 },
  { id: 'ciudadano_soldado_h', estado: 'idle', ori: 'se', u: 33.5, v: 30.6 },
  { id: 'ciudadano_campesino_m', estado: 'idle', ori: 'sw', u: 28.3, v: 31.6 },
  { id: 'animal_oveja', estado: 'pastar', ori: 'se', u: 25.5, v: 36.2 },
];

export class MundoScene extends Phaser.Scene {
  private panel?: PanelRendimiento;
  private camara?: ControlCamara;

  constructor() {
    super('Mundo');
  }

  create(): void {
    const atlas = this.registry.get(CLAVE_REGISTRO_ATLAS) as AtlasPixel;
    const color = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;
    const cam = this.cameras.main;
    cam.setBackgroundColor(color(tuning.mundo.colorFondo));

    // Suelo provisional: un rombo plano del tamaño del mapa (el terreno horneado llega en el tramo 3).
    const n = tuning.mundo.tiles;
    const esquinas = [aPantalla(0, 0), aPantalla(n, 0), aPantalla(n, n), aPantalla(0, n)];
    this.add
      .graphics()
      .fillStyle(color(tuning.mundo.colorSuelo))
      .fillPoints(esquinas.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true)
      .setDepth(-1e6);

    for (const p of ALDEA) colocar(this, atlas, p);

    this.camara = new ControlCamara(this, aPantalla(n / 2, n / 2));

    this.panel = new PanelRendimiento(() => ({ sprites: this.children.length, escala: this.scale.zoom }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel?.destruir());

    const r1 = (v: number): number => Math.round(v * 10) / 10;
    exponer('fps', () => r1(medidor.fps()));
    exponer('msFotoP95', () => r1(medidor.p95()));
    exponer('msFotoMax', () => r1(medidor.max()));
    exponer('nSprites', () => this.children.length);
    exponer('camara', () => {
      const c = this.camara?.leer();
      return c ? { x: Math.round(c.x), y: Math.round(c.y), zoom: c.zoom } : null;
    });
    exponer('escalaEntera', () => this.scale.zoom);
    this.events.once(Phaser.Scenes.Events.UPDATE, marcarListo);
  }

  update(_tiempo: number, delta: number): void {
    this.camara?.update(delta);
  }
}
