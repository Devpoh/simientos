// Panel de grupo (P5, R51, §5): lista de miniaturas de lo seleccionado, con clic en una miniatura para
// dejar solo esa. Presentación ligera: solo toca el DOM cuando cambia la selección, nunca cada fotograma.
import type { CapaUi, MarcoUi } from './capa';

/** Una entrada del panel: un retrato recortado del atlas y su id. */
export interface Miniatura {
  id: string;
  imagen: CanvasImageSource;
  frame: { x: number; y: number; w: number; h: number };
  /** Escala entera del recorte (el panel vive ya en píxeles de arte escalados por la capa). */
  escala: number;
  etiqueta: string;
}

export interface AccionesGrupo {
  /** Se pidió «dejar solo» esa miniatura. */
  solo(id: string): void;
}

export interface PanelGrupo {
  mostrar(miniaturas: readonly Miniatura[]): void;
  ocultar(): void;
  readonly visible: boolean;
  readonly nMiniaturas: number;
  liberar(): void;
}

const LADO = 20;

/**
 * Crea el panel de grupo dentro de la capa `#ui`. Sin miniaturas se oculta; con dos o más muestra la fila.
 * Solo se redibuja cuando cambia la lista de ids (comparación barata por longitud y orden).
 */
export function crearPanelGrupo(capa: CapaUi, marco: MarcoUi, acciones: AccionesGrupo): PanelGrupo {
  const panel = capa.panel(marco, {
    position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
    display: 'none', gap: '4px', alignItems: 'center', padding: '4px 6px',
  });
  const fila = document.createElement('div');
  fila.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;max-width:520px;justify-content:center';
  panel.appendChild(fila);

  let idsActuales: string[] = [];
  let visibles = false;

  const redibujar = (miniaturas: readonly Miniatura[]): void => {
    fila.textContent = '';
    for (const m of miniaturas) {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = m.etiqueta;
      b.style.cssText = 'padding:0;border:1px solid rgba(255,230,170,.4);background:rgba(0,0,0,.2);cursor:pointer;width:22px;height:22px';
      const cv = document.createElement('canvas');
      cv.className = 'retrato';
      cv.width = Math.max(1, Math.round(m.frame.w * m.escala));
      cv.height = Math.max(1, Math.round(m.frame.h * m.escala));
      cv.style.cssText = `image-rendering:pixelated;width:${LADO}px;height:${LADO}px;display:block`;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(m.imagen, m.frame.x, m.frame.y, m.frame.w, m.frame.h, 0, 0, cv.width, cv.height);
      }
      const id = m.id;
      b.addEventListener('click', (ev) => { ev.stopPropagation(); acciones.solo(id); });
      b.appendChild(cv);
      fila.appendChild(b);
    }
  };

  return {
    mostrar(miniaturas) {
      const ids = miniaturas.map((m) => m.id);
      const cambio = ids.length !== idsActuales.length || ids.some((id, i) => id !== idsActuales[i]);
      if (ids.length <= 1) {
        if (visibles) { panel.style.display = 'none'; visibles = false; }
        idsActuales = ids;
        return;
      }
      if (cambio) { redibujar(miniaturas); idsActuales = ids; }
      if (!visibles) { panel.style.display = 'flex'; visibles = true; }
    },
    ocultar() {
      if (!visibles) return;
      panel.style.display = 'none';
      visibles = false;
      idsActuales = [];
    },
    get visible() { return visibles; },
    get nMiniaturas() { return idsActuales.length; },
    liberar() { panel.remove(); },
  };
}
