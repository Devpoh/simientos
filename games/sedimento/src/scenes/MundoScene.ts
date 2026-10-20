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
import { crearCapaUi, type CapaUi } from '../ui/capa';
import { crearHud, type DatosHud, type Hud } from '../ui/hud';
import { crearAtajosReloj } from '../ui/atajos';
import { resolverMarcos } from '../logic/marcos';
import {
  avanzarPartida, crearPartida, indiceVelocidad, pausarPartida, resumenPartida, velocidadPartida,
  type Partida,
} from '../logic/partida';

export class MundoScene extends Phaser.Scene {
  private panel?: PanelRendimiento;
  private camara?: ControlCamara;
  private medidas: Record<string, number> = {};
  private aldea?: Aldea;
  private vista?: AldeaVista;
  private partida?: Partida;
  private hud?: Hud;
  private quitarAtajos?: () => void;
  private capa?: CapaUi;

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

    // Interfaz HTML/CSS superpuesta (R70, P2b): capa #ui escalada con el mismo factor entero que el lienzo,
    // HUD con la fecha y los recursos (solo se redibuja cuando cambian) y el reloj (pausa y velocidades).
    this.partida = crearPartida(semilla);
    this.crearInterfaz(atlas);

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
      const cam = this.camara?.leer();
      return cam ? { x: Math.round(cam.x), y: Math.round(cam.y), zoom: cam.zoom } : null;
    });
    exponer('terreno', () => ({ ...this.medidas, centroAldea: this.aldea?.centro }));
    exponer('lienzo', () => ({ ancho: this.scale.gameSize.width, alto: this.scale.gameSize.height, zoom: this.scale.zoom }));
    exponer('escalaEntera', () => escalaFisica(this.scale.zoom, window.devicePixelRatio));
    // Estado de la interfaz y del reloj, para que shot lo compruebe sin captura.
    exponer('reloj', () => {
      const p = this.partida;
      if (!p) return null;
      return {
        tick: p.reloj.tick, dia: p.sim.dia, pausado: p.reloj.pausado, velocidad: p.reloj.velocidad,
        indiceVelocidad: indiceVelocidad(p), racion: p.sim.racionObjetivo,
      };
    });
    exponer('hud', () => {
      const p = this.partida;
      if (!p) return null;
      const r = resumenPartida(p);
      return {
        texto: this.hud?.texto ?? '',
        redibujados: this.hud?.redibujados ?? -1,
        personas: r.personas,
        alimento: Math.floor(r.alimento),
        recursos: r.recursos.map(([k, v]) => [k, Math.floor(v)] as const),
      };
    });
    exponer('ui', () => {
      const capa = this.capa?.raiz;
      if (!capa) return null;
      const r = capa.getBoundingClientRect();
      const m = /^matrix\(([^,]+),/.exec(getComputedStyle(capa).transform);
      // Elemento bajo el ratón en el centro del lienzo (juego) y sobre un panel: la capa no debe robarlo.
      const cx = this.scale.gameSize.width / 2;
      const cy = this.scale.gameSize.height / 2;
      const enCentro = document.elementFromPoint(cx, cy);
      const panelFecha = capa.querySelector<HTMLElement>('.panel');
      const rp = panelFecha?.getBoundingClientRect();
      const enPanel = rp ? document.elementFromPoint(rp.left + rp.width / 2, rp.top + rp.height / 2) : null;
      return {
        existe: true,
        paneles: capa.querySelectorAll('.panel').length,
        retrato: capa.querySelectorAll('canvas.retrato').length,
        ancho: Math.round(r.width), alto: Math.round(r.height),
        escala: m ? Number(m[1]) : 1,
        marcos: Object.keys(resolverMarcos(atlas.ui, 'recursos/pixel/')),
        ratonEnCentro: enCentro ? enCentro.tagName.toLowerCase() : null,
        ratonEnPanel: enPanel ? enPanel.tagName.toLowerCase() : null,
        fuenteCargada: document.fonts ? document.fonts.check('9px Silkscreen') : null,
      };
    });
    this.events.once(Phaser.Scenes.Events.UPDATE, marcarListo);
  }

  /** Monta la capa #ui, el HUD y los atajos del reloj; todo se desmonta en shutdown. */
  private crearInterfaz(atlas: AtlasPixel): void {
    const contenedor = document.getElementById('juego');
    if (!contenedor) return;
    const capa = crearCapaUi(contenedor);
    this.capa = capa;
    const ajustar = (): void => capa.ajustar(this.scale.gameSize.width, this.scale.gameSize.height, this.scale.zoom);
    ajustar();
    const alRedimensionar = (): void => ajustar();
    this.scale.on(Phaser.Scale.Events.RESIZE, alRedimensionar);

    const marcos = resolverMarcos(atlas.ui, 'recursos/pixel/');
    const porDefecto = { ruta: 'recursos/pixel/ui/marco-madera.png', corte: { arriba: 6, abajo: 6, izquierda: 6, derecha: 6 }, repetir: 'round' as const };
    const marcoFecha = marcos.marco_piedra ?? marcos.marco_madera ?? porDefecto;
    const marcoRecursos = marcos.marco_madera ?? porDefecto;

    // Retrato del HUD: la cabeza de un ciudadano del atlas ampliada x2 (R52 lo reutilizara a 48x48).
    const ciudadano = atlas.sprites.ciudadano_campesino_m ?? atlas.sprites.ciudadano_campesino_h;
    const claveIdle = ciudadano && Object.values(ciudadano.estados)[0]?.orientaciones.se?.[0];
    const frameRetrato = claveIdle ? atlas.frames[claveIdle] : undefined;
    const imagenAtlas = frameRetrato ? this.textures.get(`atlas-${frameRetrato.atlas}`).getSourceImage() : undefined;

    this.hud = crearHud({
      capa,
      marcoFecha,
      marcoRecursos,
      velocidades: tuning.reloj.velocidades,
      acciones: {
        alternarPausa: () => this.partida && pausarPartida(this.partida),
        fijarVelocidad: (i) => this.partida && velocidadPartida(this.partida, i),
      },
      retrato: frameRetrato && imagenAtlas
        ? { imagen: imagenAtlas as CanvasImageSource, frame: { x: frameRetrato.x, y: frameRetrato.y, w: frameRetrato.w, h: frameRetrato.h }, escala: 2 }
        : undefined,
    });
    this.pintarHud();
    this.quitarAtajos = crearAtajosReloj({
      alternarPausa: () => this.partida && pausarPartida(this.partida),
      fijarVelocidad: (i) => this.partida && velocidadPartida(this.partida, i),
    }, tuning.reloj.velocidades.length);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, alRedimensionar);
      this.quitarAtajos?.();
      this.hud?.liberar();
      capa.liberar();
    });
  }

  /** Refresca el HUD con el estado actual (barato: crearHud no toca el DOM si nada cambio). */
  private pintarHud(): void {
    if (!this.hud || !this.partida) return;
    const r = resumenPartida(this.partida);
    const d: DatosHud = {
      fecha: r.fecha,
      pausado: this.partida.reloj.pausado,
      indiceVelocidad: indiceVelocidad(this.partida),
      recursos: r.recursos,
    };
    this.hud.actualizar(d);
  }

  update(tiempo: number, delta: number): void {
    this.camara?.update(delta);
    this.vista?.actualizar(tiempo);
    if (this.partida) {
      avanzarPartida(this.partida, delta);
      this.pintarHud();
    }
  }
}
