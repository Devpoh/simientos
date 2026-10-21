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
import { AguaVista } from '../render/aguaVista';
import { HumoVista } from '../render/humoVista';
import { focosDeAldea } from '../logic/humo';
import { cobertura, generarMontanas, reservaAldea } from '../logic/montanas';
import { MontanasVista } from '../render/montanasVista';
import { crearOcupacion, colocarEstructura, colocarObjeto, colisionesViolaciones, type Ocupacion } from '../logic/ocupacion';
import { OcupacionVista } from '../render/ocupacionVista';
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

/** Celda de acceso, en tiles relativos a la esquina trasera de la huella. Mismo dato que el atlas. */
interface PuertaLocal {
  i: number;
  j: number;
}

/**
 * Rejilla de ocupación única (P3, R50). La aldea de referencia se registra en la rejilla para que esta sea
 * la fuente de verdad de colocación, navegación y F3. `rechazados` debería ser 0: si no lo es, el colocador
 * de la aldea y la rejilla no están de acuerdo y hay que arreglarlo (no se fuerza nada).
 */
export function poblarOcupacion(
  oc: Ocupacion, atlas: AtlasPixel, aldea: Aldea,
): { estructuras: number; objetos: number; rechazados: string[] } {
  let estructuras = 0;
  let objetos = 0;
  const rechazados: string[] = [];
  for (const e of aldea.edificios) {
    const puertas: PuertaLocal[] = atlas.sprites[e.id]?.puertas ?? [];
    if (colocarEstructura(oc, e.id, { w: e.w, d: e.d }, e.u, e.v, 0, puertas)) estructuras++;
    else rechazados.push(`${e.id}@${e.u},${e.v}`);
  }
  for (const e of [...aldea.props, ...aldea.arboles]) {
    colocarObjeto(oc, { w: e.w, d: e.d }, e.u, e.v);
    objetos++;
  }
  return { estructuras, objetos, rechazados };
}

export class MundoScene extends Phaser.Scene {
  private panel?: PanelRendimiento;
  private camara?: ControlCamara;
  private medidas: Record<string, number> = {};
  private aldea?: Aldea;
  private vista?: AldeaVista;
  private agua?: AguaVista;
  private montanasVista?: MontanasVista;
  private ocupacion?: Ocupacion;
  private ocupacionVista?: OcupacionVista;
  private poblado?: { estructuras: number; objetos: number; rechazados: string[] };
  private elevacion?: (u: number, v: number) => number;
  private depurar = false;
  private humo?: HumoVista;
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
    // Aldea de referencia primero (P2 tramo 4): es la que decide dónde puede haber montaña, no al revés.
    const elevacion = (u: number, v: number): number => alturaPx(mundo.superficie, mundo.cfg, u, v);
    this.elevacion = elevacion;
    const aldea = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, semilla);
    const t1b = performance.now();
    // Montañas (P2c3, R84): la reserva de la aldea impide que una pieza tape una casa o un prop; su máscara
    // de cobertura hace que el horneado no pinte nieve ni roca debajo.
    const montanas = generarMontanas(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, semilla,
      tuning.horneado.montanas, reservaAldea(aldea, mundo.tilesU, mundo.tilesV));
    const cubierto = cobertura(montanas, mundo.tilesU, mundo.tilesV);
    const imagen = hornearMundo(mundo, cubierto);
    const t2 = performance.now();
    const trozos = crearTrozos(this, imagen, tuning.mundo.lado);
    const t3 = performance.now();
    // Agua viva (R65, R87): 4 texturas por trozo con agua, horneadas una vez; en el bucle solo cambia la textura.
    this.agua = new AguaVista(this, imagen, tuning.mundo.lado, semilla);
    const t3b = performance.now();

    this.medidas = {
      semilla, tilesU: mundo.tilesU, tilesV: mundo.tilesV, pxAncho: imagen.ancho, pxAlto: imagen.alto, trozos: trozos.length,
      msGenerar: Math.round(t1 - t0), msAldea: Math.round(t1b - t1), msHornear: Math.round(t2 - t1b),
      msTexturas: Math.round(t3 - t2), msAgua: Math.round(t3b - t3), trozosAgua: this.agua.nTrozos,
    };

    this.aldea = aldea;
    this.vista = new AldeaVista(this, atlas, aldea, elevacion);

    // Rejilla de ocupación única (P3, R50): terreno + huellas de la aldea. `rechazados` debe ser 0.
    const t4 = performance.now();
    this.ocupacion = crearOcupacion(mundo.superficie, mundo.tilesU, mundo.tilesV);
    this.poblado = poblarOcupacion(this.ocupacion, atlas, aldea);
    this.medidas.msOcupacion = Math.round(performance.now() - t4);

    // Montañas (P2c3, R84): las piezas que colocó logic/montanas.ts, dibujadas con y-sort y culling.
    const t5a = performance.now();
    this.montanasVista = new MontanasVista(this, atlas, montanas.piezas, elevacion);
    this.medidas.msMontanas = Math.round(performance.now() - t5a);
    this.medidas.piezasMontana = montanas.piezas.length;

    // Humo (R87, D037): una bocanada por chimenea de casa terminada y por brasero; sube y se recicla.
    const t5 = performance.now();
    this.humo = new HumoVista(this, atlas);
    const focos = focosDeAldea([...aldea.edificios, ...aldea.props], atlas, elevacion);
    this.humo.enfocar(focos);
    this.medidas.msHumo = Math.round(performance.now() - t5);
    this.medidas.focosHumo = focos.length;

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
    // F3: pinta encima la rejilla de ocupación (bloqueadas, puertas, huellas). También se puede forzar por
    // `?depurar=1` o llamando a la acción `depurarOcupacion` desde `shot`.
    exponerAccion('depurarOcupacion', (on) => this.alternarDepuracion(typeof on === 'boolean' ? on : undefined));
    this.input.keyboard?.on('keydown-F3', (ev: KeyboardEvent) => { ev.preventDefault(); this.alternarDepuracion(); });
    if (params.get('depurar') === '1') this.alternarDepuracion(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.ocupacionVista?.destruir());
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
    // Rejilla de ocupación (P3, R50): fuente de verdad de colocación y navegación. `colisionesViolaciones`
    // debe ser 0 siempre; `rechazados` (edificios que la rejilla no acepta donde los puso la aldea) también.
    exponer('ocupacion', () => ({
      tiles: { u: this.ocupacion?.tilesU ?? 0, v: this.ocupacion?.tilesV ?? 0 },
      estructuras: this.ocupacion ? this.ocupacion.estructuras.size : 0,
      objetos: this.poblado?.objetos ?? 0,
      rechazados: this.poblado?.rechazados ?? [],
      violaciones: this.ocupacion ? colisionesViolaciones(this.ocupacion) : -1,
      ms: this.medidas.msOcupacion ?? 0,
    }));
    exponer('camara', () => {
      const cam = this.camara?.leer();
      return cam ? { x: Math.round(cam.x), y: Math.round(cam.y), zoom: cam.zoom } : null;
    });
    exponer('terreno', () => ({ ...this.medidas, centroAldea: this.aldea?.centro }));
    // Agua viva y humo (R65, R87): lo que se mueve, para que `shot` lo compruebe sin captura.
    exponer('agua', () => ({ trozos: this.agua?.nTrozos ?? 0, fotograma: this.agua?.fotogramaActual ?? -1 }));
    exponer('montanas', () => ({ piezas: this.montanasVista?.nPiezas ?? 0, visibles: this.montanasVista?.activos ?? 0 }));
    exponer('humo', () => ({
      bocanadas: this.humo?.nBocanadas ?? 0,
      visibles: this.humo?.nVisibles ?? 0,
      subida: this.humo?.subidaMedia ?? 0,
    }));
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

  /** Enciende o apaga la capa F3 y la redibuja al encender. `on` indefinido alterna. */
  private alternarDepuracion(on?: boolean): void {
    this.depurar = on ?? !this.depurar;
    if (this.depurar && this.ocupacion) {
      if (!this.ocupacionVista) this.ocupacionVista = new OcupacionVista(this);
      const elevacion = this.elevacion ?? (() => 0);
      this.ocupacionVista.redibujar(this.ocupacion, elevacion);
    } else {
      this.ocupacionVista?.graficos.clear();
    }
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
    this.agua?.actualizar(tiempo);
    this.montanasVista?.actualizar();
    this.humo?.actualizar(delta);
    if (this.partida) {
      avanzarPartida(this.partida, delta);
      this.pintarHud();
    }
  }
}
