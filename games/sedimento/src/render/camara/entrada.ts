import { arrastreAPlano, empujeBorde, factorZoomRueda, movimientoRelativo, velocidadPorDistancia, type ConfigVelocidad, type Plano } from '../../logic/camara';
import type { ConfigRender } from '../config';
import type { AccionTecla, PreferenciasCamara } from './preferencias';
import type { RigCamara } from './rig';

/** Píxeles que equivale una «línea» de rueda en navegadores que informan por líneas. */
const PIXELES_POR_LINEA = 16;
const PIXELES_POR_PAGINA = 100;
/** Teclas con las que el navegador haría zoom de página, que pixelaría el canvas. */
const TECLAS_ZOOM_NAVEGADOR = ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0'];

/** Lo que hace el ratón ahora: `pendiente` es un clic izquierdo que aún puede ser un clic normal. */
export type ModoArrastre = 'ninguno' | 'pendiente' | 'desplazar' | 'girar' | 'inclinar';

export interface OpcionesEntrada {
  /** Si devuelve true (hay una herramienta activa, p. ej. construir) el botón izquierdo NO mueve la cámara. */
  hayHerramienta: () => boolean;
}

export interface Entrada {
  readonly modo: ModoArrastre;
  readonly bordesActivos: boolean;
  /** Aplica la entrada continua (teclas y bordes de pantalla) de este frame. */
  actualizar(dt: number): void;
  liberar(): void;
}

const ACCIONES: AccionTecla[] = ['adelante', 'atras', 'izquierda', 'derecha', 'girarIzquierda', 'girarDerecha', 'subir', 'bajar'];

/**
 * Traduce teclado y ratón a órdenes del rig. Prioridades:
 *  · Botón central → desplazar. Botón derecho → girar (horizontal) e inclinar (vertical).
 *  · Botón izquierdo → desplazar SOLO si no hay herramienta activa y el ratón se mueve más del umbral
 *    (un clic o doble clic normal no mueve la cámara). Alt + izquierdo → inclinar.
 *  · Rueda → zoom hacia el cursor (si está activo). Bordes de pantalla → desplazar, opcional.
 */
export function crearEntrada(dom: HTMLElement, rig: RigCamara, cfg: ConfigRender, prefs: PreferenciasCamara, opciones: OpcionesEntrada): Entrada {
  const c = cfg.camara;
  let modo: ModoArrastre = 'ninguno';
  let inicioX = 0;
  let inicioY = 0;
  let cursor: { x: number; y: number } | null = null;

  // Tiempo que cada tecla ha estado pulsada desde el último frame, medido con el reloj real (no con
  // los frames): una pulsación breve entre dos frames lentos no se pierde.
  const pulsadas = new Map<string, number>();
  const acumulado = new Map<string, number>();
  let ultimoFrame = performance.now();

  const enCampoDeTexto = (e: Event) => {
    const t = e.target;
    return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
  };
  const esTeclaDeCamara = (codigo: string) => ACCIONES.some((a) => prefs.teclas[a].includes(codigo));

  const alPulsar = (e: KeyboardEvent) => {
    // Ctrl +/-/0 hacen zoom del navegador, que pixela el canvas: el zoom del juego es la rueda.
    if ((e.ctrlKey || e.metaKey) && TECLAS_ZOOM_NAVEGADOR.includes(e.code)) e.preventDefault();
    if (enCampoDeTexto(e) || e.ctrlKey || e.metaKey || e.altKey || !esTeclaDeCamara(e.code)) return;
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
  const alPerderFoco = () => {
    [...pulsadas.keys()].forEach(soltar);
    modo = 'ninguno';
  };

  /** Segundos que alguna de las teclas asignadas a la acción ha estado pulsada desde el último frame. */
  const segundos = (accion: AccionTecla, ahora: number): number => {
    let mejor = 0;
    for (const k of prefs.teclas[accion]) {
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
    const factor = factorZoomRueda(e.deltaY, px, prefs.sensibilidadZoom, fuerza, prefs.invertirRueda);
    rig.zoomPor(factor, { nx: (e.offsetX / rig.anchoPantalla) * 2 - 1, ny: -(e.offsetY / rig.altoPantalla) * 2 + 1 });
  };

  const alBajar = (e: PointerEvent) => {
    if (e.button === 1) modo = 'desplazar';
    else if (e.button === 2) modo = 'girar';
    else if (e.button === 0 && e.altKey) modo = 'inclinar';
    else if (e.button === 0 && !opciones.hayHerramienta()) {
      modo = 'pendiente';
      inicioX = e.clientX;
      inicioY = e.clientY;
    } else return;
    dom.setPointerCapture(e.pointerId);
    if (modo !== 'pendiente') e.preventDefault();
  };

  const temp: Plano = { x: 0, z: 0 };
  const alMover = (e: PointerEvent) => {
    const r = dom.getBoundingClientRect();
    cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (modo === 'ninguno') return;
    if (modo === 'pendiente') {
      // Solo es un arrastre si se aleja más que el umbral: así el clic normal sigue siendo clic.
      if (Math.hypot(e.clientX - inicioX, e.clientY - inicioY) < c.umbralArrastrePx) return;
      modo = 'desplazar';
    }
    if (modo === 'desplazar') {
      arrastreAPlano(e.movementX, e.movementY, rig.metrosPorPixel, rig.cabeceo, rig.act.guino, temp);
      rig.mover(temp.x, temp.z, true);
      return;
    }
    if (modo === 'girar') {
      rig.girar(-e.movementX * prefs.sensibilidadGiro * (prefs.invertirGiro ? -1 : 1), true);
    }
    rig.inclinar(e.movementY * prefs.sensibilidadInclinacion * (prefs.invertirInclinacion ? -1 : 1), true);
  };
  const alSubir = (e: PointerEvent) => {
    if (modo === 'ninguno') return;
    modo = 'ninguno';
    if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
  };
  const alSalir = () => {
    cursor = null;
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
  dom.addEventListener('pointerleave', alSalir);
  dom.addEventListener('contextmenu', sinMenu);

  const cfgVelocidad: ConfigVelocidad = { velocidadPan: prefs.velocidadPan, velocidadAdaptativa: prefs.velocidadAdaptativa, exponenteVelocidad: c.exponenteVelocidad, distanciaReferencia: c.distanciaReferencia };
  const empuje: Plano = { x: 0, z: 0 };
  const movimiento: Plano = { x: 0, z: 0 };

  return {
    get modo() {
      return modo;
    },
    get bordesActivos() {
      return prefs.bordesActivos && c.bordePantalla.activo;
    },
    actualizar(dt) {
      const ahora = performance.now();
      let adelante = segundos('adelante', ahora) - segundos('atras', ahora);
      let lateral = segundos('derecha', ahora) - segundos('izquierda', ahora);
      // Bordes de pantalla: solo con el ratón dentro del lienzo y sin arrastrar. Empuje gradual: más cerca del borde, más rápido.
      if (this.bordesActivos && cursor && modo === 'ninguno' && document.hasFocus()) {
        empujeBorde(cursor.x, cursor.y, rig.anchoPantalla, rig.altoPantalla, c.bordePantalla.margen, empuje);
        adelante -= empuje.z * dt * c.bordePantalla.velocidad;
        lateral += empuje.x * dt * c.bordePantalla.velocidad;
      }
      cfgVelocidad.velocidadPan = prefs.velocidadPan;
      cfgVelocidad.velocidadAdaptativa = prefs.velocidadAdaptativa;
      const velocidad = velocidadPorDistancia(rig.distancia, cfgVelocidad);
      movimientoRelativo(adelante, lateral, rig.act.guino, movimiento);
      rig.mover(movimiento.x * velocidad, movimiento.z * velocidad);
      rig.girar((segundos('girarIzquierda', ahora) - segundos('girarDerecha', ahora)) * c.velocidadRotacion);
      rig.inclinar((segundos('subir', ahora) - segundos('bajar', ahora)) * c.velocidadInclinacion);
      acumulado.clear();
      ultimoFrame = ahora;
      rig.actualizar(dt);
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
      dom.removeEventListener('pointerleave', alSalir);
      dom.removeEventListener('contextmenu', sinMenu);
    },
  };
}
