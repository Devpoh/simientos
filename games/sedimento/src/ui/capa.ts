// Capa de interfaz HTML/CSS superpuesta al lienzo (R70, P2b).
// Presentación: vive en el DOM, encima del canvas de Phaser, y se escala con el MISMO factor entero
// (el zoom de la cámara), así el texto y los marcos son pixel art exacto.
// `pointer-events: none` en la raíz: el ratón llega al juego; solo los paneles lo capturan.
import { ajusteCapa, estiloMarco, grosorMarco, type Corte, type Repeticion } from '../logic/ui';

export interface CapaUi {
  readonly raiz: HTMLElement;
  /** Ajusta tamaño lógico y escala al del lienzo (se llama al arrancar y al redimensionar). */
  ajustar(anchoLogico: number, altoLogico: number, zoom: number): void;
  /** Crea un panel con borde 9-slice del atlas. */
  panel(marco: MarcoUi, extra?: Partial<CSSStyleDeclaration>): HTMLElement;
  liberar(): void;
}

export interface MarcoUi {
  /** Ruta del sprite del borde (p. ej. `recursos/pixel/ui/marco-madera.png`). */
  ruta: string;
  corte: Corte;
  repetir?: Repeticion;
}

/**
 * Crea la capa `#ui` dentro del contenedor del juego. Devuelve también el constructor de paneles,
 * para que el resto de la interfaz comparta el mismo aspecto sin repetir reglas.
 */
export function crearCapaUi(contenedor: HTMLElement): CapaUi {
  const raiz = document.createElement('div');
  raiz.id = 'ui';
  raiz.dataset.ui = 'raiz';
  contenedor.appendChild(raiz);

  return {
    raiz,
    ajustar(anchoLogico, altoLogico, zoom) {
      const a = ajusteCapa(anchoLogico, altoLogico, zoom);
      raiz.style.width = `${a.ancho}px`;
      raiz.style.height = `${a.alto}px`;
      raiz.style.transform = `scale(${a.escala})`;
    },
    panel(marco, extra = {}) {
      const el = document.createElement('div');
      el.className = 'panel';
      const reglas = estiloMarco(marco.ruta, marco.corte, marco.repetir);
      for (const [clave, valor] of Object.entries(reglas)) el.style.setProperty(clave, valor);
      const g = grosorMarco(marco.corte);
      el.style.padding = `${g.alto / 2 + 2}px ${g.ancho / 2 + 4}px`;
      Object.assign(el.style, extra);
      raiz.appendChild(el);
      return el;
    },
    liberar() {
      raiz.remove();
    },
  };
}
