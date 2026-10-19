import * as THREE from 'three';
import { acotar, cabeceoAutomatico, cabeceoMinimo, factorSuavizado, suavizarEstado, zoomRelativo } from '../../logic/camara';
import type { ConfigRender } from '../config';
import type { PreferenciasCamara } from './preferencias';

/** Pasos de la búsqueda binaria de la distancia que encuadra el mapa entero. */
const PASOS_ENCUADRE = 40;
/** El mapa entero nunca se encuadra más allá de esta fracción del plano lejano de la cámara. */
const FRACCION_PLANO_LEJANO = 0.9;
/** Margen para decidir que la cámara estaba en el zoom máximo. */
const EPSILON_ZOOM = 0.01;
const DISTANCIA_MAXIMA_BUSQUEDA = 2000;
/** Un giro menor que esto (rad) no obliga a recalcular el encuadre. */
const UMBRAL_RECALCULO_GIRO = 0.002;

/** Altura del terreno en un punto del mundo. La da el terreno continuo (`campo.alturaEn`) cuando existe. */
export type AlturaEn = (x: number, z: number) => number;

export interface EstadoCamara {
  x: number;
  y: number;
  z: number;
  distancia: number;
  cabeceoGrados: number;
  guinoGrados: number;
  /** Lo que el jugador está haciendo con el ratón: ninguno, desplazar, girar o inclinar. */
  modo: string;
  bordes: boolean;
  zoomAlCursor: boolean;
}

/**
 * El rig es el «cuerpo» de la cámara: un punto de mira (x, y, z), una distancia, un giro y una
 * inclinación. La entrada solo modifica el estado deseado (`obj`); el real (`act`) lo persigue con
 * suavizado exponencial independiente de los FPS, y la cámara se coloca a partir del real.
 */
export class RigCamara {
  readonly camara: THREE.PerspectiveCamera;
  /** Cámara auxiliar para razonar sobre «qué hay bajo el cursor» sin mover la real. */
  private readonly aux: THREE.PerspectiveCamera;
  private readonly c: ConfigRender['camara'];
  private readonly caja: THREE.Box3;
  private readonly centro = new THREE.Vector3();
  private readonly cabeceoCerca: number;
  private readonly cabeceoLejos: number;
  private readonly cabeceoMinCerca: number;
  private readonly cabeceoMinLejos: number;
  private readonly cabeceoMax: number;
  private readonly esquinas: THREE.Vector3[] = [];
  private readonly punto = new THREE.Vector3();
  private readonly direccion = new THREE.Vector3();
  private readonly origen = new THREE.Vector3();
  private readonly pa = new THREE.Vector3();
  private readonly pb = new THREE.Vector3();

  private distMax = 1;
  private guinoDeMax = 0;
  private ancho = 1;
  private alto = 1;
  private alturaEn: AlturaEn | null = null;
  /** Estado deseado y real. `incl` es la inclinación que suma el jugador a la automática del zoom. */
  readonly obj = { x: 0, z: 0, dist: 0, guino: 0, incl: 0 };
  readonly act = { x: 0, y: 0, z: 0, dist: 0, guino: 0, incl: 0 };

  constructor(
    cfg: ConfigRender,
    caja: THREE.Box3,
    private readonly prefs: PreferenciasCamara,
  ) {
    this.c = cfg.camara;
    this.caja = caja;
    const c = this.c;
    this.camara = new THREE.PerspectiveCamera(c.fov, 1, c.cerca, c.lejos);
    this.aux = new THREE.PerspectiveCamera(c.fov, 1, c.cerca, c.lejos);
    caja.getCenter(this.centro);
    this.cabeceoCerca = THREE.MathUtils.degToRad(c.cabeceoCercaGrados);
    this.cabeceoLejos = THREE.MathUtils.degToRad(c.cabeceoLejosGrados);
    this.cabeceoMinCerca = THREE.MathUtils.degToRad(c.cabeceoMinCercaGrados);
    this.cabeceoMinLejos = THREE.MathUtils.degToRad(c.cabeceoMinLejosGrados);
    this.cabeceoMax = THREE.MathUtils.degToRad(c.cabeceoMaxGrados);
    for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) this.esquinas.push(new THREE.Vector3(x, y, z));
    this.distMax = this.distanciaMaxima(0);
    this.obj.x = this.act.x = this.centro.x;
    this.obj.z = this.act.z = this.centro.z;
    this.obj.dist = this.act.dist = this.distMax;
    this.aplicar();
  }

  get distancia(): number {
    return this.act.dist;
  }

  get distanciaMinima(): number {
    return this.c.distanciaMin;
  }

  get alturaMapa(): number {
    return this.act.y;
  }

  /** Terreno continuo: el punto de mira sigue las colinas. Sin función, el suelo está a y = 0. */
  fijarAlturaEn(fn: AlturaEn | null): void {
    this.alturaEn = fn;
  }

  // ---------- Geometría ----------

  private colocar(cam: THREE.PerspectiveCamera, x: number, y: number, z: number, distancia: number, cabeceo: number, guino: number): void {
    this.direccion.set(Math.sin(guino) * Math.cos(cabeceo), Math.sin(cabeceo), Math.cos(guino) * Math.cos(cabeceo));
    cam.position.set(x, y, z).addScaledVector(this.direccion, distancia);
    cam.lookAt(x, y, z);
    cam.updateMatrixWorld();
  }

  /** Distancia con la que las 8 esquinas del mapa caben en pantalla (con margen) a ese giro. */
  private distanciaMaxima(guino: number): number {
    const limite = 1 / this.c.margen;
    const cabe = (d: number) => {
      this.colocar(this.aux, this.centro.x, 0, this.centro.z, d, this.cabeceoLejos, guino);
      for (const e of this.esquinas) {
        this.punto.copy(e).project(this.aux);
        if (Math.abs(this.punto.x) > limite || Math.abs(this.punto.y) > limite) return false;
      }
      return true;
    };
    let cerca = 0;
    let lejos = DISTANCIA_MAXIMA_BUSQUEDA;
    for (let k = 0; k < PASOS_ENCUADRE; k++) {
      const medio = (cerca + lejos) / 2;
      if (cabe(medio)) lejos = medio;
      else cerca = medio;
    }
    return Math.min(lejos, this.c.lejos * FRACCION_PLANO_LEJANO);
  }

  private zoom(d: number): number {
    return zoomRelativo(d, this.c.distanciaMin, this.distMax);
  }

  private cabeceoAuto(d: number): number {
    return cabeceoAutomatico(this.zoom(d), this.cabeceoCerca, this.cabeceoLejos);
  }

  private cabeceoMin(d: number): number {
    return cabeceoMinimo(this.zoom(d), this.cabeceoMinCerca, this.cabeceoMinLejos);
  }

  /** Elevación final: la automática por zoom más el ajuste del jugador, dentro de los límites. */
  private cabeceoPara(d: number, incl: number): number {
    return acotar(this.cabeceoAuto(d) + incl, this.cabeceoMin(d), this.cabeceoMax);
  }

  /** Elevación real de la cámara ahora mismo, en radianes. */
  get cabeceo(): number {
    return this.cabeceoPara(this.act.dist, this.act.incl);
  }

  /** Metros del mundo por píxel de pantalla en el punto de mira. */
  get metrosPorPixel(): number {
    return (2 * this.act.dist * Math.tan(THREE.MathUtils.degToRad(this.c.fov) / 2)) / Math.max(1, this.alto);
  }

  /** Punto del plano horizontal `planoY` que se ve en el píxel NDC (nx, ny) con la cámara indicada. */
  private suelo(nx: number, ny: number, x: number, z: number, dist: number, incl: number, guino: number, planoY: number, salida: THREE.Vector3): boolean {
    this.colocar(this.aux, x, planoY, z, dist, this.cabeceoPara(dist, incl), guino);
    this.origen.copy(this.aux.position);
    salida.set(nx, ny, 0.5).unproject(this.aux).sub(this.origen);
    if (salida.y >= -1e-6) return false;
    salida.multiplyScalar((planoY - this.origen.y) / salida.y).add(this.origen);
    return true;
  }

  /** Solo se impide salir del mapa y pasarse de los ángulos permitidos: se puede ir a cualquier punto con cualquier zoom. */
  private limitar(): void {
    const o = this.obj;
    o.x = acotar(o.x, this.caja.min.x, this.caja.max.x);
    o.z = acotar(o.z, this.caja.min.z, this.caja.max.z);
    o.dist = acotar(o.dist, this.c.distanciaMin, this.distMax);
    const auto = this.cabeceoAuto(o.dist);
    o.incl = acotar(o.incl, this.cabeceoMin(o.dist) - auto, this.cabeceoMax - auto);
  }

  // ---------- Órdenes de la entrada ----------

  /** Desplaza el punto de mira (mundo). `directo` salta el suavizado: el arrastre debe pegarse al cursor. */
  mover(dx: number, dz: number, directo = false): void {
    this.obj.x += dx;
    this.obj.z += dz;
    this.limitar();
    if (directo) {
      this.act.x = this.obj.x;
      this.act.z = this.obj.z;
    }
  }

  girar(delta: number, directo = false): void {
    this.obj.guino += delta;
    if (directo) this.act.guino = this.obj.guino;
  }

  inclinar(delta: number, directo = false): void {
    this.obj.incl += delta;
    this.limitar();
    if (directo) this.act.incl = this.obj.incl;
  }

  /** Multiplica la distancia; con `cursor` (NDC) el punto del suelo bajo el ratón se queda quieto. */
  zoomPor(factor: number, cursor?: { nx: number; ny: number }): void {
    const nueva = acotar(this.obj.dist * factor, this.c.distanciaMin, this.distMax);
    const o = this.obj;
    const planoY = this.act.y;
    const habia = cursor && this.prefs.zoomAlCursor ? this.suelo(cursor.nx, cursor.ny, o.x, o.z, o.dist, o.incl, o.guino, planoY, this.pa) : false;
    o.dist = nueva;
    if (habia && cursor && this.suelo(cursor.nx, cursor.ny, 0, 0, nueva, o.incl, o.guino, planoY, this.pb)) {
      o.x = this.pa.x - this.pb.x;
      o.z = this.pa.z - this.pb.z;
    }
    this.limitar();
  }

  /** Mueve el punto de mira (con suavizado) al punto (x, z) del mundo. */
  irA(x: number, z: number): void {
    this.obj.x = x;
    this.obj.z = z;
    this.limitar();
  }

  // ---------- Bucle ----------

  actualizar(dt: number): void {
    const o = this.obj;
    const a = this.act;
    // Al girar cambia la forma del mapa en pantalla: el zoom máximo se recalcula.
    if (Math.abs(a.guino - this.guinoDeMax) > UMBRAL_RECALCULO_GIRO) this.recalcularEncuadre(a.guino, false);
    this.limitar();

    suavizarEstado(a, o, this.c, dt);
    // El punto de mira sigue el relieve (si lo hay) sin brincos: la altura también se suaviza.
    const objetivoY = this.alturaEn ? this.alturaEn(a.x, a.z) : 0;
    a.y += (objetivoY - a.y) * factorSuavizado(this.c.suavizado, dt);
    this.aplicar();
  }

  redimensionar(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;
    this.camara.aspect = ancho / alto;
    this.aux.aspect = this.camara.aspect;
    this.aux.updateProjectionMatrix();
    this.recalcularEncuadre(this.act.guino, true);
    this.aplicar();
  }

  private recalcularEncuadre(guino: number, ajustarReal: boolean): void {
    const estabaAlejado = this.obj.dist >= this.distMax - EPSILON_ZOOM;
    this.distMax = this.distanciaMaxima(guino);
    this.guinoDeMax = guino;
    this.obj.dist = estabaAlejado ? this.distMax : Math.min(this.obj.dist, this.distMax);
    if (ajustarReal) this.act.dist = estabaAlejado ? this.distMax : Math.min(this.act.dist, this.distMax);
  }

  get anchoPantalla(): number {
    return this.ancho;
  }

  get altoPantalla(): number {
    return this.alto;
  }

  private aplicar(): void {
    const a = this.act;
    // El plano cercano crece con la distancia: con near fijo y far enorme se pierde precisión de
    // profundidad y las superficies casi coplanares parpadean.
    this.camara.near = Math.max(this.c.cerca, a.dist * this.c.cercaRelativa);
    this.camara.updateProjectionMatrix();
    this.colocar(this.camara, a.x, a.y, a.z, a.dist, this.cabeceoPara(a.dist, a.incl), a.guino);
  }

  estado(modo: string, bordes: boolean): EstadoCamara {
    return {
      x: this.act.x,
      y: this.act.y,
      z: this.act.z,
      distancia: this.act.dist,
      cabeceoGrados: THREE.MathUtils.radToDeg(this.cabeceo),
      guinoGrados: THREE.MathUtils.radToDeg(this.act.guino),
      modo,
      bordes,
      zoomAlCursor: this.prefs.zoomAlCursor,
    };
  }
}
