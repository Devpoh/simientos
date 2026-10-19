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

export const acotar = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

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
