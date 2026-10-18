import * as THREE from 'three';
import type { ConfigRender } from './config';

/** Pasos de la búsqueda binaria de la distancia que encuadra el mapa entero. */
const PASOS_ENCUADRE = 40;
/** El mapa entero nunca se encuadra más allá de esta fracción del plano lejano de la cámara. */
const FRACCION_PLANO_LEJANO = 0.9;
/** Margen para decidir que la cámara estaba en el zoom máximo. */
const EPSILON_ZOOM = 0.01;
const DISTANCIA_MAXIMA_BUSQUEDA = 2000;
/** Un giro menor que esto (rad) no obliga a recalcular el encuadre. */
const UMBRAL_RECALCULO_GIRO = 0.002;
/** Píxeles que equivale una "línea" de rueda en navegadores que informan por líneas. */
const PIXELES_POR_LINEA = 16;
const PIXELES_POR_PAGINA = 100;

const TECLAS_ARRIBA = ['KeyW', 'ArrowUp'];
const TECLAS_ABAJO = ['KeyS', 'ArrowDown'];
const TECLAS_IZQUIERDA = ['KeyA', 'ArrowLeft'];
const TECLAS_DERECHA = ['KeyD', 'ArrowRight'];
const TECLAS_GIRO_IZQUIERDA = ['KeyQ'];
const TECLAS_GIRO_DERECHA = ['KeyE'];
/** Seno mínimo del cabeceo al convertir arrastre vertical en metros: evita dividir por cero. */
const SENO_MINIMO_CABECEO = 0.1;
const TECLAS_CAMARA = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export interface EstadoCamara {
  x: number;
  z: number;
  distancia: number;
  cabeceoGrados: number;
  guinoGrados: number;
}

export interface ControlCamara {
  readonly camara: THREE.PerspectiveCamera;
  actualizar(dt: number): void;
  redimensionar(ancho: number, alto: number): void;
  estado(): EstadoCamara;
  /** Distancia del punto de mira a la cámara, para colocar la niebla. */
  readonly distancia: number;
  liberar(): void;
}

const suavizar = (t: number) => t * t * (3 - 2 * t);
const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Cámara de estrategia: la distancia (zoom) define también la inclinación, casi cenital de lejos
 * y ~45° de cerca. El estado "deseado" (objetivo) lo mueven las entradas; el estado real lo
 * persigue con suavizado exponencial, que no depende de los FPS.
 */
export function crearControlCamara(dom: HTMLElement, cfg: ConfigRender, caja: THREE.Box3): ControlCamara {
  const c = cfg.camara;
  const camara = new THREE.PerspectiveCamera(c.fov, 1, c.cerca, c.lejos);
  const centro = caja.getCenter(new THREE.Vector3());
  const mitadX = (caja.max.x - caja.min.x) / 2;
  const mitadZ = (caja.max.z - caja.min.z) / 2;
  const cabeceoCerca = THREE.MathUtils.degToRad(c.cabeceoCercaGrados);
  const cabeceoLejos = THREE.MathUtils.degToRad(c.cabeceoLejosGrados);
  const tanMitadFov = Math.tan(THREE.MathUtils.degToRad(c.fov) / 2);

  const esquinas: THREE.Vector3[] = [];
  for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));
  const punto = new THREE.Vector3();
  const direccion = new THREE.Vector3();

  const colocar = (x: number, z: number, distancia: number, cabeceo: number, guino: number) => {
    direccion.set(Math.sin(guino) * Math.cos(cabeceo), Math.sin(cabeceo), Math.cos(guino) * Math.cos(cabeceo));
    camara.position.set(x, 0, z).addScaledVector(direccion, distancia);
    camara.lookAt(x, 0, z);
    camara.updateMatrixWorld();
  };

  // Distancia mínima con la que las 8 esquinas del mapa caben en pantalla (con margen) a ese giro.
  const distanciaMaxima = (guino: number): number => {
    const limite = 1 / c.margen;
    const cabe = (d: number) => {
      colocar(centro.x, centro.z, d, cabeceoLejos, guino);
      for (const e of esquinas) {
        punto.copy(e).project(camara);
        if (Math.abs(punto.x) > limite || Math.abs(punto.y) > limite) return false;
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
    return Math.min(lejos, c.lejos * FRACCION_PLANO_LEJANO);
  };

  let distMax = distanciaMaxima(0);
  let guinoDeMax = 0;
  // Deseado (obj) y real (act). Empieza viendo el mapa entero.
  const obj = { x: centro.x, z: centro.z, dist: distMax, guino: 0 };
  const act = { x: centro.x, z: centro.z, dist: distMax, guino: 0 };
  let alto = 1;

  const zoomRelativo = (d: number) => acotar((d - c.distanciaMin) / Math.max(1e-6, distMax - c.distanciaMin), 0, 1);
  const cabeceoPara = (d: number) => cabeceoCerca + (cabeceoLejos - cabeceoCerca) * suavizar(zoomRelativo(d));

  // Cuanto más cerca, más libertad para desplazarse; lejos, solo un poco, para no perder el mapa.
  const limitar = () => {
    const libertad = 1 - (1 - c.limitePanLejos) * zoomRelativo(obj.dist);
    obj.x = acotar(obj.x, centro.x - mitadX * libertad, centro.x + mitadX * libertad);
    obj.z = acotar(obj.z, centro.z - mitadZ * libertad, centro.z + mitadZ * libertad);
  };

  // --- Entradas ---
  // Tiempo que cada tecla ha estado pulsada desde el último frame. Se mide con el reloj real (no con
  // los frames): una pulsación breve entre dos frames lentos no se pierde.
  const pulsadas = new Map<string, number>();
  const acumulado = new Map<string, number>();
  let ultimoFrame = performance.now();
  const alPulsar = (e: KeyboardEvent) => {
    // Ctrl +/-/0 hacen zoom del navegador, que pixela el canvas: el zoom del juego es la rueda.
    if ((e.ctrlKey || e.metaKey) && ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(e.code)) e.preventDefault();
    if (!TECLAS_CAMARA.includes(e.code) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!pulsadas.has(e.code)) pulsadas.set(e.code, performance.now());
    e.preventDefault();
  };
  const soltar = (codigo: string) => {
    const inicio = pulsadas.get(codigo);
    if (inicio === undefined) return;
    acumulado.set(codigo, (acumulado.get(codigo) ?? 0) + (performance.now() - Math.max(inicio, ultimoFrame)) / 1000);
    pulsadas.delete(codigo);
  };
  const alSoltar = (e: KeyboardEvent) => soltar(e.code);
  const alPerderFoco = () => [...pulsadas.keys()].forEach(soltar);
  /** Segundos que alguna de estas teclas ha estado pulsada desde el último frame. */
  const segundosPulsada = (codigos: readonly string[], ahora: number): number => {
    let mejor = 0;
    for (const k of codigos) {
      const inicio = pulsadas.get(k);
      const s = (acumulado.get(k) ?? 0) + (inicio === undefined ? 0 : (ahora - Math.max(inicio, ultimoFrame)) / 1000);
      if (s > mejor) mejor = s;
    }
    // Tras un tirón largo no se recupera todo el tiempo perdido de golpe.
    return Math.min(mejor, c.topeTeclaFrame);
  };

  const alRodar = (e: WheelEvent) => {
    e.preventDefault(); // también anula el zoom del navegador con Ctrl+rueda o el pellizco del touchpad
    const px = e.deltaMode === 1 ? PIXELES_POR_LINEA : e.deltaMode === 2 ? PIXELES_POR_PAGINA : 1;
    const fuerza = e.ctrlKey ? c.factorPellizco : 1;
    obj.dist = acotar(obj.dist * Math.exp(e.deltaY * px * c.sensibilidadZoom * fuerza), c.distanciaMin, distMax);
    limitar();
  };

  let arrastrando = false;
  const alBajar = (e: PointerEvent) => {
    if (e.button !== 1 && e.button !== 2) return;
    arrastrando = true;
    dom.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const alMover = (e: PointerEvent) => {
    if (!arrastrando) return;
    // El suelo sigue al cursor: metros del mundo por píxel en el punto de mira.
    const porPixel = (2 * act.dist * tanMitadFov) / Math.max(1, alto);
    const cabeceo = cabeceoPara(act.dist);
    const sen = Math.sin(act.guino);
    const cos = Math.cos(act.guino);
    const dx = -e.movementX * porPixel;
    const dz = (e.movementY * porPixel) / Math.max(SENO_MINIMO_CABECEO, Math.sin(cabeceo));
    // derecha = (cos, -sin); delante (hacia donde mira) = (-sin, -cos)
    const mx = cos * dx - sen * dz;
    const mz = -sen * dx - cos * dz;
    obj.x += mx;
    obj.z += mz;
    limitar();
    act.x = obj.x;
    act.z = obj.z;
  };
  const alSubir = (e: PointerEvent) => {
    if (!arrastrando) return;
    arrastrando = false;
    if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
  };
  const sinMenu = (e: Event) => e.preventDefault();

  dom.style.touchAction = 'none';
  window.addEventListener('keydown', alPulsar);
  window.addEventListener('keyup', alSoltar);
  window.addEventListener('blur', alPerderFoco);
  dom.addEventListener('wheel', alRodar, { passive: false });
  dom.addEventListener('pointerdown', alBajar);
  dom.addEventListener('pointermove', alMover);
  dom.addEventListener('pointerup', alSubir);
  dom.addEventListener('pointercancel', alSubir);
  dom.addEventListener('contextmenu', sinMenu);

  const aplicar = () => {
    colocar(act.x, act.z, act.dist, cabeceoPara(act.dist), act.guino);
  };
  aplicar();

  return {
    camara,
    get distancia() {
      return act.dist;
    },
    actualizar(dt) {
      const sen = Math.sin(act.guino);
      const cos = Math.cos(act.guino);
      const ahora = performance.now();
      const adelante = segundosPulsada(TECLAS_ARRIBA, ahora) - segundosPulsada(TECLAS_ABAJO, ahora);
      const lateral = segundosPulsada(TECLAS_DERECHA, ahora) - segundosPulsada(TECLAS_IZQUIERDA, ahora);
      const paso = c.velocidadPan * act.dist;
      obj.x += (-sen * adelante + cos * lateral) * paso;
      obj.z += (-cos * adelante - sen * lateral) * paso;
      obj.guino += (segundosPulsada(TECLAS_GIRO_IZQUIERDA, ahora) - segundosPulsada(TECLAS_GIRO_DERECHA, ahora)) * c.velocidadRotacion;
      acumulado.clear();
      ultimoFrame = ahora;

      // Al girar cambia la forma del mapa en pantalla: el zoom máximo se recalcula.
      if (Math.abs(act.guino - guinoDeMax) > UMBRAL_RECALCULO_GIRO) {
        const estabaAlejado = obj.dist >= distMax - EPSILON_ZOOM;
        distMax = distanciaMaxima(act.guino);
        guinoDeMax = act.guino;
        obj.dist = estabaAlejado ? distMax : Math.min(obj.dist, distMax);
      }
      limitar();

      const k = 1 - Math.exp(-c.suavizado * dt);
      act.x += (obj.x - act.x) * k;
      act.z += (obj.z - act.z) * k;
      act.dist += (obj.dist - act.dist) * k;
      act.guino += (obj.guino - act.guino) * k;
      aplicar();
    },
    redimensionar(ancho, altoNuevo) {
      alto = altoNuevo;
      camara.aspect = ancho / altoNuevo;
      camara.updateProjectionMatrix();
      const estabaAlejado = obj.dist >= distMax - EPSILON_ZOOM;
      distMax = distanciaMaxima(act.guino);
      guinoDeMax = act.guino;
      obj.dist = estabaAlejado ? distMax : Math.min(obj.dist, distMax);
      act.dist = estabaAlejado ? distMax : Math.min(act.dist, distMax);
      aplicar();
    },
    estado() {
      return {
        x: act.x,
        z: act.z,
        distancia: act.dist,
        cabeceoGrados: THREE.MathUtils.radToDeg(cabeceoPara(act.dist)),
        guinoGrados: THREE.MathUtils.radToDeg(act.guino),
      };
    },
    liberar() {
      window.removeEventListener('keydown', alPulsar);
      window.removeEventListener('keyup', alSoltar);
      window.removeEventListener('blur', alPerderFoco);
      dom.removeEventListener('wheel', alRodar);
      dom.removeEventListener('pointerdown', alBajar);
      dom.removeEventListener('pointermove', alMover);
      dom.removeEventListener('pointerup', alSubir);
      dom.removeEventListener('pointercancel', alSubir);
      dom.removeEventListener('contextmenu', sinMenu);
    },
  };
}
