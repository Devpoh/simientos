// Interfaz HTML/CSS superpuesta al lienzo (R70): lógica pura de la capa y de los marcos 9-slice.
// Sin DOM ni Phaser: devuelve valores y reglas CSS que `src/ui/capa.ts` aplica tal cual.

export interface Tamano {
  ancho: number;
  alto: number;
}

/** Trozo de un sprite que se repite como borde (esquinas fijas, lados y centro estirados). */
export interface Corte {
  arriba: number;
  abajo: number;
  izquierda: number;
  derecha: number;
}

export type Repeticion = 'stretch' | 'repeat' | 'round' | 'space';

/**
 * Ajuste de la capa `#ui` para que sus píxeles coincidan con los del lienzo: mismo tamaño lógico y
 * el mismo factor de escala (el zoom entero sobre píxeles físicos que usa la cámara).
 */
export function ajusteCapa(anchoLogico: number, altoLogico: number, zoom: number): Tamano & { escala: number } {
  return { ancho: anchoLogico, alto: altoLogico, escala: zoom };
}

/**
 * Reglas CSS de un borde 9-slice a partir de su sprite y su corte. El ancho del borde es el del corte
 * en píxeles de arte: al vivir dentro de la capa escalada, cada píxel de arte sigue siendo entero.
 */
export function estiloMarco(ruta: string, corte: Corte, repetir: Repeticion = 'round'): Record<string, string> {
  return {
    'border-image-source': `url(${ruta})`,
    'border-image-slice': `${corte.arriba} ${corte.derecha} ${corte.abajo} ${corte.izquierda} fill`,
    'border-image-width': `${corte.arriba}px ${corte.derecha}px ${corte.abajo}px ${corte.izquierda}px`,
    'border-image-repeat': repetir,
  };
}

/** Ancho en píxeles de arte de un marco (el corte horizontal y el vertical, para el box-sizing). */
export function grosorMarco(corte: Corte): { ancho: number; alto: number } {
  return { ancho: corte.izquierda + corte.derecha, alto: corte.arriba + corte.abajo };
}
