import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import type { AtlasPixel } from '../data/atlas';
import { exponer, exponerAccion, marcarListo } from '../core/test-hooks';
import { medidor } from '../core/metricas';
import { aPantalla } from '../logic/iso';
import type { Aldea } from '../logic/aldeaReferencia';
import { escalaFisica } from '../logic/pantalla';
import { alturaPx, crearMundo, hornearMundo } from '../logic/mundo';
import { generarAldea } from '../logic/aldeaReferencia';
import { crearTrozos } from '../render/terrenoHorneado';
import { params } from '../core/test-hooks';
import { ControlCamara } from '../render/controlCamara';
import { CLAVE_REGISTRO_ATLAS } from '../render/sprites';
import { AldeaVista } from '../render/aldeaVista';
import { PanelRendimiento } from '../ui/panelRendimiento';

export class MundoScene extends Phaser.Scene {
  private panel?: PanelRendimiento;
  private camara?: ControlCamara;
  private medidas: Record<string, number> = {};
  private aldea?: Aldea;
  private vista?: AldeaVista;

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

    // Aldea de referencia: la escena por defecto y la que usa el bench de 60 fps (P2 tramo 4).
    const elevacion = (u: number, v: number): number => alturaPx(mundo.superficie, mundo.cfg, u, v);
    const t4 = performance.now();
    const aldea = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, semilla);
    this.aldea = aldea;
    this.vista = new AldeaVista(this, atlas, aldea, elevacion);
    this.medidas.msAldea = Math.round(performance.now() - t4);

    const c = aPantalla(aldea.centro.u, aldea.centro.v);
    this.camara = new ControlCamara(
      this,
      { x: c.x, y: c.y - elevacion(aldea.centro.u, aldea.centro.v) },
      { tilesU: mundo.tilesU, tilesV: mundo.tilesV, alturaPx: -imagen.origenY },
    );

    const alRedimensionar = (tam: Phaser.Structs.Size): void => this.camara?.redimensionar(tam.width, tam.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, alRedimensionar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alRedimensionar));

    this.panel = new PanelRendimiento(() => ({ sprites: this.vista?.activos ?? 0, escala: escalaFisica(this.scale.zoom, window.devicePixelRatio) }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel?.destruir());

    const r1 = (v: number): number => Math.round(v * 10) / 10;
    exponerAccion('reiniciarMedidas', () => medidor.reiniciar());
    exponer('fps', () => r1(medidor.fps()));
    exponer('msFotoP95', () => r1(medidor.p95()));
    exponer('msFotoMax', () => r1(medidor.max()));
    exponer('fotogramas', () => ({ n: medidor.fotogramas, perdidos: medidor.perdidos, fpsMedio: Math.round(medidor.fpsMedio() * 10) / 10, maxTotal: Math.round(medidor.maxTotal() * 10) / 10 }));
    exponer('nSprites', () => this.vista?.activos ?? 0);
    exponer('nObjetos', () => this.children.length);
    exponer('nEdificios', () => aldea.edificios.length);
    exponer('nArboles', () => aldea.arboles.length);
    exponer('nProps', () => aldea.props.length);
    exponer('nUnidades', () => aldea.unidades.length);
    exponer('solapesAldea', () => this.vista?.solapes ?? -1);
    exponer('camara', () => {
      const c = this.camara?.leer();
      return c ? { x: Math.round(c.x), y: Math.round(c.y), zoom: c.zoom } : null;
    });
    exponer('terreno', () => ({ ...this.medidas, centroAldea: this.aldea?.centro }));
    exponer('lienzo', () => ({ ancho: this.scale.gameSize.width, alto: this.scale.gameSize.height, zoom: this.scale.zoom }));
    exponer('escalaEntera', () => escalaFisica(this.scale.zoom, window.devicePixelRatio));
    this.events.once(Phaser.Scenes.Events.UPDATE, marcarListo);
  }

  update(tiempo: number, delta: number): void {
    this.camara?.update(delta);
    this.vista?.actualizar(tiempo);
  }
}
