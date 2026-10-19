// Reglas puras de la cámara de estrategia: sin three ni DOM, para poder probarlas con tests.
// Convención del mundo: la cámara con giro 0 mira hacia -z; con el giro crece, rota hacia -x.
//   «delante» = (-sin(giro), -cos(giro))   ·   «derecha» = (cos(giro), -sin(giro))

export interface Plano {
  x: number;
  z: number;
}

export interface ConfigVelocidad {
  /** Velocidad base: fracción de la distancia de referencia que se recorre por segundo. */
  velocidadPan: number;
  /** Si es false la velocidad no depende del zoom: siempre la de la distancia de referencia. */
  velocidadAdaptativa: boolean;
  /** La velocidad crece como distancia^exponente (1 = proporcional, 0,9 = algo menos que proporcional). */
  exponenteVelocidad: number;
  distanciaReferencia: number;
}

/** Ritmos de suavizado (1/s): cuanto mayor, más rápido alcanza el valor real al deseado. */
export interface ConfigSuavizado {
  suavizado: number;
  suavizadoGiro: number;
  suavizadoZoom: number;
}

/** Los cinco grados de libertad de la cámara que se suavizan. `incl` es la inclinación que suma el jugador. */
export interface EstadoSuavizable {
  x: number;
  z: number;
  dist: number;
  guino: number;
  incl: number;
}

export const acotar = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Fracción del camino que se recorre en `dt` segundos: 1 − e^(−k·dt). No depende de los FPS. */
export const factorSuavizado = (k: number, dt: number): number => 1 - Math.exp(-Math.max(0, k) * Math.max(0, dt));

/** Segundos que tarda en quedar solo la fracción `residuo` del recorrido (0,05 = ya ha hecho el 95 %). */
export const tiempoAsentamiento = (k: number, residuo: number): number => (k > 0 ? -Math.log(acotar(residuo, 1e-9, 1)) / k : Infinity);

/**
 * Acerca el estado real (`act`) al deseado (`obj`) un paso `dt`. Posición, giro y zoom tienen cada uno su
 * ritmo: el giro suele ir algo más rápido que la posición y el zoom más lento, que se nota menos.
 */
export function suavizarEstado(act: EstadoSuavizable, obj: EstadoSuavizable, cfg: ConfigSuavizado, dt: number): void {
  const kPos = factorSuavizado(cfg.suavizado, dt);
  const kGiro = factorSuavizado(cfg.suavizadoGiro, dt);
  const kZoom = factorSuavizado(cfg.suavizadoZoom, dt);
  act.x += (obj.x - act.x) * kPos;
  act.z += (obj.z - act.z) * kPos;
  act.dist += (obj.dist - act.dist) * kZoom;
  act.guino += (obj.guino - act.guino) * kGiro;
  act.incl += (obj.incl - act.incl) * kGiro;
}

export const suavizar = (t: number): number => {
  const c = acotar(t, 0, 1);
  return c * c * (3 - 2 * c);
};

/**
 * Movimiento en el plano a partir de una entrada relativa a la cámara. `adelante` y `lateral` son
 * «cantidad de entrada» (segundos de tecla pulsada, o dt × intensidad en el borde de pantalla).
 * La diagonal se normaliza: con dos ejes a la vez no se avanza más que con uno, así que
 * (1, 1) mueve lo mismo que (1, 0).
 */
export function movimientoRelativo(adelante: number, lateral: number, giro: number, salida: Plano = { x: 0, z: 0 }): Plano {
  const largo = Math.hypot(adelante, lateral);
  if (largo < 1e-12) {
    salida.x = 0;
    salida.z = 0;
    return salida;
  }
  const escala = Math.max(Math.abs(adelante), Math.abs(lateral)) / largo;
  const a = adelante * escala;
  const l = lateral * escala;
  const sen = Math.sin(giro);
  const cos = Math.cos(giro);
  salida.x = -sen * a + cos * l;
  salida.z = -cos * a - sen * l;
  return salida;
}

/** Metros por segundo (con entrada 1) a una distancia de cámara dada, sin saltos al cruzar umbrales. */
export function velocidadPorDistancia(distancia: number, cfg: ConfigVelocidad): number {
  const ref = Math.max(1e-6, cfg.distanciaReferencia);
  if (!cfg.velocidadAdaptativa) return cfg.velocidadPan * ref;
  return cfg.velocidadPan * ref * Math.pow(Math.max(distancia, 1e-6) / ref, cfg.exponenteVelocidad);
}

/** 0 con la cámara a la distancia mínima y 1 con el mapa entero a la vista. */
export function zoomRelativo(distancia: number, distMin: number, distMax: number): number {
  return acotar((distancia - distMin) / Math.max(1e-6, distMax - distMin), 0, 1);
}

/** Inclinación (elevación sobre el horizonte, rad) que corresponde a un zoom: oblicua de cerca, alta de lejos. */
export function cabeceoAutomatico(zoom: number, cabeceoCerca: number, cabeceoLejos: number): number {
  return cabeceoCerca + (cabeceoLejos - cabeceoCerca) * suavizar(zoom);
}

/** Cabeceo mínimo permitido: de cerca no se baja de ese ángulo (para no atravesar el suelo ni perder el objetivo). */
export function cabeceoMinimo(zoom: number, minCerca: number, minLejos: number): number {
  return minCerca + (minLejos - minCerca) * zoom;
}

/** Intensidad (0–1) y dirección del empuje del cursor en el borde: x positivo = derecha, y positivo = abajo. */
export function empujeBorde(px: number, py: number, ancho: number, alto: number, margen: number, salida: Plano = { x: 0, z: 0 }): Plano {
  const eje = (p: number, tam: number) => {
    if (margen <= 0 || tam <= 2 * margen) return 0;
    if (p < margen) return -acotar((margen - p) / margen, 0, 1);
    if (p > tam - margen) return acotar((p - (tam - margen)) / margen, 0, 1);
    return 0;
  };
  salida.x = eje(px, ancho);
  salida.z = eje(py, alto);
  return salida;
}

/**
 * Desplazamiento del punto de mira al arrastrar con el ratón, de modo que el suelo «sigue» al cursor.
 * `porPixel` son metros del mundo por píxel en el punto de mira y `cabeceo` la elevación actual.
 */
export function arrastreAPlano(movX: number, movY: number, porPixel: number, cabeceo: number, giro: number, salida: Plano = { x: 0, z: 0 }): Plano {
  const senCabeceo = Math.max(0.1, Math.sin(cabeceo));
  const dx = -movX * porPixel;
  const dz = (movY * porPixel) / senCabeceo;
  const sen = Math.sin(giro);
  const cos = Math.cos(giro);
  salida.x = cos * dx - sen * dz;
  salida.z = -sen * dx - cos * dz;
  return salida;
}

/** Multiplicador de distancia para un paso de rueda: hacia arriba aleja, hacia abajo acerca (o al revés si se invierte). */
export function factorZoomRueda(deltaY: number, pixelesPorUnidad: number, sensibilidad: number, fuerza: number, invertir: boolean): number {
  const signo = invertir ? -1 : 1;
  return Math.exp(signo * deltaY * pixelesPorUnidad * sensibilidad * fuerza);
}

// ---------- Terreno y oclusión (C3) ----------

export interface Punto3 {
  x: number;
  y: number;
  z: number;
}

/** Altura de la superficie (terreno o agua) en un punto del plano. */
export type AlturaFn = (x: number, z: number) => number;

/** Metros de margen que se exigen por metro de rayo cerca del objetivo (sin(20°) ≈ 0,34 es lo mínimo que sube un rayo). */
const PENDIENTE_MARGEN = 0.3;

/**
 * Hasta qué distancia se puede alejar la cámara del objetivo, siguiendo la dirección `dir` (unitaria,
 * del objetivo a la cámara), sin que el rayo se meta bajo la superficie más `margen`. Muestrea el rayo
 * `muestras` veces y afina el primer choque por bisección; si no hay choque devuelve `distancia`.
 * El resultado es el punto libre más lejano antes del primer obstáculo: la cámara se queda delante del cerro.
 */
export function distanciaLibre(alturaEn: AlturaFn, objetivo: Punto3, dir: Punto3, distancia: number, margen: number, muestras: number): number {
  // El objetivo está en el suelo: exigir el margen entero desde el primer metro bloquearía siempre. El margen crece
  // con la distancia hasta su valor completo, con una pendiente menor que la del rayo más tumbado permitido (20°).
  const bloqueado = (t: number) => objetivo.y + dir.y * t < alturaEn(objetivo.x + dir.x * t, objetivo.z + dir.z * t) + Math.min(margen, PENDIENTE_MARGEN * t);
  const paso = distancia / Math.max(1, muestras);
  let libre = 0;
  for (let i = 1; i <= muestras; i++) {
    const t = i * paso;
    if (!bloqueado(t)) {
      libre = t;
      continue;
    }
    let lo = libre;
    let hi = t;
    for (let k = 0; k < 10; k++) {
      const medio = (lo + hi) / 2;
      if (bloqueado(medio)) hi = medio;
      else lo = medio;
    }
    return lo;
  }
  return distancia;
}

/** Cuerpo aproximado de un edificio: cilindro vertical con la base en (x, y, z). */
export interface CuerpoEdificio {
  x: number;
  y: number;
  z: number;
  radio: number;
  alto: number;
}

/** ¿El segmento a→b atraviesa el cilindro? Recorta el segmento al círculo en planta y mira si, en ese tramo, pasa a la altura del cuerpo. */
export function segmentoTocaCilindro(a: Punto3, b: Punto3, c: CuerpoEdificio, margen = 0): boolean {
  const radio = c.radio + margen;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const fx = a.x - c.x;
  const fz = a.z - c.z;
  const A = dx * dx + dz * dz;
  let t0 = 0;
  let t1 = 1;
  if (A < 1e-12) {
    if (fx * fx + fz * fz > radio * radio) return false;
  } else {
    const B = 2 * (fx * dx + fz * dz);
    const C = fx * fx + fz * fz - radio * radio;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return false;
    const raiz = Math.sqrt(disc);
    t0 = Math.max(0, (-B - raiz) / (2 * A));
    t1 = Math.min(1, (-B + raiz) / (2 * A));
    if (t0 > t1) return false;
  }
  const ya = a.y + (b.y - a.y) * t0;
  const yb = a.y + (b.y - a.y) * t1;
  return Math.max(ya, yb) >= c.y && Math.min(ya, yb) <= c.y + c.alto;
}

/**
 * Marca (1) los edificios que tapan la vista entre la cámara y el objetivo. El edificio sobre el que está
 * el objetivo no cuenta: es lo que se mira. `margen` ensancha el cuerpo para atenuar un poco antes de rozarlo.
 */
export function edificiosQueTapan(camara: Punto3, objetivo: Punto3, cuerpos: readonly CuerpoEdificio[], margen: number, salida: Uint8Array): Uint8Array {
  for (let i = 0; i < cuerpos.length; i++) {
    const c = cuerpos[i];
    const sobreElObjetivo = Math.hypot(objetivo.x - c.x, objetivo.z - c.z) <= c.radio;
    salida[i] = !sobreElObjetivo && segmentoTocaCilindro(camara, objetivo, c, margen) ? 1 : 0;
  }
  return salida;
}

/** Acerca la opacidad actual a la deseada con el mismo suavizado exponencial que la cámara (no depende de los FPS). */
export const avanzarOpacidad = (actual: number, deseada: number, k: number, dt: number): number => actual + (deseada - actual) * factorSuavizado(k, dt);

export interface ConfigColision {
  /** Ritmo (1/s) con el que la cámara se acerca cuando el terreno estorba: rápido para no atravesarlo. */
  suavizadoAcortar: number;
  /** Ritmo (1/s) con el que recupera la distancia cuando el estorbo desaparece: lento para que no rebote. */
  suavizadoLiberar: number;
  /** La cámara nunca se acerca más que esto al objetivo. */
  distanciaMinima: number;
}

/**
 * Distancia a la que se dibuja la cámara. `deseada` es la que pide el zoom; `limiteBlando` (con holgura)
 * decide hacia dónde se mueve con suavizado, y `limiteDuro` (el suelo justo) se respeta siempre en el
 * mismo fotograma: así la cámara no atraviesa el terreno aunque el suavizado vaya un poco detrás.
 */
export function distanciaDeVista(actual: number, deseada: number, limiteBlando: number, limiteDuro: number, cfg: ConfigColision, dt: number): number {
  const meta = Math.min(deseada, Math.max(limiteBlando, cfg.distanciaMinima));
  const k = meta < actual ? cfg.suavizadoAcortar : cfg.suavizadoLiberar;
  const nueva = actual + (meta - actual) * factorSuavizado(k, dt);
  return Math.min(nueva, Math.max(limiteDuro, cfg.distanciaMinima), deseada);
}
