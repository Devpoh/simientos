// Escalado del lienzo base a la ventana: SOLO factores enteros (×1, ×2 = 1080p, ×3, ×4 = 4K…).
// Nada de píxeles de distinto tamaño. Lógica pura.

export interface Tamano { ancho: number; alto: number }

/** Mayor factor entero (≥ 1) con el que el lienzo base cabe entero en la ventana. */
export function escalaEntera(ventana: Tamano, base: Tamano): number {
  const k = Math.floor(Math.min(ventana.ancho / base.ancho, ventana.alto / base.alto));
  return Math.max(1, k);
}
