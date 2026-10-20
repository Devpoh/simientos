// Escalado del lienzo base a la ventana: SOLO factores enteros (×1, ×2 = 1080p, ×3, ×4 = 4K…).
// Nada de píxeles de distinto tamaño. Lógica pura.

export interface Tamano { ancho: number; alto: number }

/** Mayor factor entero (≥ 1) con el que el lienzo base cabe entero en la ventana. */
export function escalaEntera(ventana: Tamano, base: Tamano): number {
  const k = Math.floor(Math.min(ventana.ancho / base.ancho, ventana.alto / base.alto));
  return Math.max(1, k);
}

/**
 * Zoom CSS del lienzo para que cada píxel del arte ocupe un número ENTERO de píxeles físicos del monitor.
 * Con el zoom de Windows/Chrome (devicePixelRatio 1,25 o 1,5) un factor entero en píxeles CSS no lo es en píxeles
 * físicos y el pixel art se ve borroso o con píxeles de distinto tamaño. Se calcula el factor sobre píxeles físicos
 * y se devuelve en CSS: zoom = k / dpr.
 */
export function zoomCss(ventanaCss: Tamano, dpr: number, base: Tamano): number {
  const d = dpr > 0 ? dpr : 1;
  const k = escalaEntera({ ancho: ventanaCss.ancho * d, alto: ventanaCss.alto * d }, base);
  return k / d;
}

/** Factor entero en píxeles físicos que corresponde a un zoom CSS (lo que ve el jugador como ×1, ×2…). */
export function escalaFisica(zoom: number, dpr: number): number {
  return Math.round(zoom * (dpr > 0 ? dpr : 1));
}

export interface PantallaCompleta {
  /** Factor entero de píxeles físicos por píxel de arte. */
  k: number;
  /** Tamaño lógico del lienzo (píxeles de arte): cubre la ventana entera, sin bandas. */
  ancho: number;
  alto: number;
  /** Zoom CSS (k / dpr) que deja cada píxel de arte en k píxeles físicos exactos. */
  zoom: number;
}

/**
 * Pantalla completa con píxel entero (R83): el lienzo llena la ventana y cada píxel de arte mide k píxeles físicos.
 * k = el entero más cercano a (alto físico / alto de referencia), mínimo 1; el lienzo lógico es ceil(físico / k), así que
 * puede sobrar como mucho k − 1 píxeles físicos que el navegador recorta (overflow oculto) en vez de dejar bandas.
 */
export function pantallaCompleta(ventanaCss: Tamano, dpr: number, altoReferencia: number): PantallaCompleta {
  const d = dpr > 0 ? dpr : 1;
  const fisicoAncho = Math.max(1, Math.round(ventanaCss.ancho * d));
  const fisicoAlto = Math.max(1, Math.round(ventanaCss.alto * d));
  const k = Math.max(1, Math.round(fisicoAlto / altoReferencia));
  return { k, ancho: Math.ceil(fisicoAncho / k), alto: Math.ceil(fisicoAlto / k), zoom: k / d };
}
