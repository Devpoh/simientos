import { distanciaPuntoPolilinea, longitudPolilinea, suavizarPolilinea, type Punto } from './geometria2d';

// Caminos trazados con puntos y curvas (R21), sin three.js: la lógica de trazado, validación y
// coste vive aquí; cablearlo a la escena y al mapa de celdas es trabajo de render (A6c).

/** Lo que el trazado necesita saber del terreno. Mismo patrón que `Mundo` en `logic/sim/obras.ts`. */
export interface MundoCaminos {
  /** Altura del suelo continuo. */
  alturaEn(x: number, z: number): number;
  /** Cota del agua, o NaN si está seco. */
  aguaEn(x: number, z: number): number;
}

export interface ConfigCaminos {
  /** Ancho de la cinta del camino (unidades de mundo). */
  ancho: number;
  /** Pasos de Catmull-Rom por tramo al suavizar (ver `suavizarPolilinea`). */
  pasosCurva: number;
  /** Desnivel máximo tolerado entre dos muestras consecutivas, por unidad de distancia. */
  pendienteMax: number;
  /** Longitud mínima del trazado para que valga la pena como camino. */
  longitudMin: number;
  /** Separación entre las muestras con las que se comprueba agua y pendiente a lo largo del trazado. */
  pasoMuestras: number;
  /** Cuánto más rápido se avanza sobre el camino (1 = igual que a pie). */
  multiplicadorVelocidad: number;
}

export interface Camino {
  /** Los puntos que el jugador marcó. */
  clave: Punto[];
  /** Curva suavizada que de verdad se recorre y se dibuja (pasa por `clave[0]` y `clave.at(-1)`). */
  trazado: Punto[];
  /** Altura del suelo en cada punto de `trazado` (mismo índice), para la malla y el render. */
  alturas: number[];
  longitud: number;
  ancho: number;
}

export type MotivoNoTrazable = 'pocos-puntos' | 'agua' | 'pendiente' | 'muy-corto';

/** Puntos a intervalos regulares de `paso` sobre la longitud del trazado (incluye el primero y el último). */
function muestrasCada(trazado: Punto[], paso: number): Punto[] {
  const muestras: Punto[] = [trazado[0]];
  let acumulado = 0;
  let objetivo = 0;
  for (let i = 0; i + 1 < trazado.length; i++) {
    const a = trazado[i];
    const b = trazado[i + 1];
    const largo = Math.hypot(b.x - a.x, b.z - a.z);
    while (objetivo + paso <= acumulado + largo) {
      objetivo += paso;
      const f = (objetivo - acumulado) / largo;
      muestras.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f });
    }
    acumulado += largo;
  }
  const ultimo = trazado[trazado.length - 1];
  const fin = muestras[muestras.length - 1];
  if (Math.hypot(fin.x - ultimo.x, fin.z - ultimo.z) > 1e-9) muestras.push(ultimo);
  return muestras;
}

/**
 * Traza un camino a partir de los puntos clave que marcó el jugador, o explica por qué no se puede.
 * Comprobaciones, en este orden: número de puntos, longitud mínima, agua bajo el trazado y pendiente
 * entre muestras consecutivas.
 */
export function trazarCamino(puntosClave: Punto[], t: MundoCaminos, cfg: ConfigCaminos): { ok: true; camino: Camino } | { ok: false; motivo: MotivoNoTrazable } {
  if (puntosClave.length < 2) return { ok: false, motivo: 'pocos-puntos' };
  const trazado = suavizarPolilinea(puntosClave, cfg.pasosCurva);
  const longitud = longitudPolilinea(trazado);
  if (longitud < cfg.longitudMin) return { ok: false, motivo: 'muy-corto' };

  const muestras = muestrasCada(trazado, cfg.pasoMuestras);
  if (muestras.some((p) => !Number.isNaN(t.aguaEn(p.x, p.z)))) return { ok: false, motivo: 'agua' };
  for (let i = 0; i + 1 < muestras.length; i++) {
    const a = muestras[i];
    const b = muestras[i + 1];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    if (dist === 0) continue;
    const dAltura = Math.abs(t.alturaEn(b.x, b.z) - t.alturaEn(a.x, a.z));
    if (dAltura / dist > cfg.pendienteMax) return { ok: false, motivo: 'pendiente' };
  }

  const alturas = trazado.map((p) => t.alturaEn(p.x, p.z));
  return { ok: true, camino: { clave: puntosClave.map((p) => ({ ...p })), trazado, alturas, longitud, ancho: cfg.ancho } };
}

/** Multiplicador de velocidad en `p`: el del camino si está a menos de media cinta de alguno, si no 1 (a pie). */
export function velocidadEn(p: Punto, caminos: Camino[], cfg: ConfigCaminos): number {
  for (const c of caminos) if (distanciaPuntoPolilinea(p, c.trazado).dist <= c.ancho / 2) return cfg.multiplicadorVelocidad;
  return 1;
}

/** Coste en personas-día de construir el camino: 2 personas-día por unidad de largo (cavar, nivelar
 * y afirmar la cinta), una cifra de diseño — no mide el volumen de tierra movido todavía. */
export function costeCamino(c: Camino): number {
  return Math.ceil(c.longitud * 2);
}
