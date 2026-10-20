import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import type { AtlasPixel } from '../data/atlas';
import { exponer, marcarListo } from '../core/test-hooks';
import { medidor } from '../core/metricas';
import { aPantalla } from '../logic/iso';
import { escalaFisica } from '../logic/pantalla';
import { alturaPx, buscarLlano, crearMundo, hornearMundo } from '../logic/mundo';
import { crearTrozos } from '../render/terrenoHorneado';
import { params } from '../core/test-hooks';
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
  private medidas: Record<string, number> = {};
  private llano?: { u: number; v: number; desnivel: number };

  constructor() {
    super('Mundo');
  }

  create(): void {
    const atlas = this.registry.get(CLAVE_REGISTRO_ATLAS) as AtlasPixel;
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.HexStringToColor(tuning.mundo.colorFondo).color);

    // Terreno procedural horneado una sola vez (R59): semilla → mapa → alturas → imagen de paleta → trozos.
    const semilla = Number(params.get('semilla')) || tuning.mapa.semilla;
    const t0 = performance.now();
    const mundo = crearMundo(semilla);
    const t1 = performance.now();
    const imagen = hornearMundo(mundo);
    const t2 = performance.now();
    const trozos = crearTrozos(this, imagen, tuning.mundo.lado);
    const t3 = performance.now();

    this.medidas = {
      semilla, tilesU: mundo.tilesU, tilesV: mundo.tilesV, pxAncho: imagen.ancho, pxAlto: imagen.alto, trozos: trozos.length,
      msGenerar: Math.round(t1 - t0), msHornear: Math.round(t2 - t1), msTexturas: Math.round(t3 - t2),
    };

    // Aldea provisional sobre la zona más llana y seca cerca del centro del mapa (la colocación real llega en P3).
    const ancho = 20;
    const alto = 18;
    const llano = buscarLlano(mundo.superficie, ancho, alto, { u: mundo.tilesU * 0.5, v: mundo.tilesV * 0.5 }, Math.min(mundo.tilesU, mundo.tilesV) * 0.4, { u: mundo.tilesU, v: mundo.tilesV });
    const origen = llano ?? { u: mundo.tilesU / 2 - ancho / 2, v: mundo.tilesV / 2 - alto / 2, desnivel: NaN };
    this.llano = origen;
    const elevacion = (u: number, v: number): number => alturaPx(mundo.superficie, mundo.cfg, u, v);
    for (const p of ALDEA) colocar(this, atlas, { ...p, u: p.u - 20 + origen.u, v: p.v - 20 + origen.v }, elevacion);

    const c = aPantalla(origen.u + ancho / 2, origen.v + alto / 2);
    this.camara = new ControlCamara(
      this,
      { x: c.x, y: c.y - elevacion(origen.u + ancho / 2, origen.v + alto / 2) },
      { tilesU: mundo.tilesU, tilesV: mundo.tilesV, alturaPx: -imagen.origenY },
    );

    this.panel = new PanelRendimiento(() => ({ sprites: this.children.length, escala: escalaFisica(this.scale.zoom, window.devicePixelRatio) }));
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
    exponer('terreno', () => ({ ...this.medidas, llano: this.llano }));
    exponer('escalaEntera', () => escalaFisica(this.scale.zoom, window.devicePixelRatio));
    this.events.once(Phaser.Scenes.Events.UPDATE, marcarListo);
  }

  update(_tiempo: number, delta: number): void {
    this.camara?.update(delta);
  }
}
