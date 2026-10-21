// Marcos 9-slice de los paneles de la interfaz (R70): lee la sección `ui` del atlas y la resuelve a
// reglas listas para CSS. Lógica pura: no toca el DOM; `src/ui/capa.ts` las aplica.
import type { Corte, Repeticion } from './ui';

/** Metadatos de un marco tal como los escribe `tools/arte-pixel/ui.py` en `atlas.json` (sección `ui`). */
export interface MarcoPixel {
  ancho: number;
  alto: number;
  corte: { arriba: number; abajo: number; izquierda: number; derecha: number };
  /** Estado → ruta relativa del PNG (p. ej. `ui/marco-madera.png`). */
  estados: Record<string, string>;
  origen: string;
  relleno: boolean;
  repetir?: string;
}

export interface MarcoResuelto {
  /** Ruta del sprite de borde, ya con la base de recursos delante. */
  ruta: string;
  corte: Corte;
  repetir: Repeticion;
  /** Si el sprite trae el centro relleno (el `fill` de border-image lo pinta). */
  relleno: boolean;
}

const REPETICIONES: readonly string[] = ['stretch', 'repeat', 'round', 'space'];

/**
 * Convierte la sección `ui` del atlas en marcos utilizables. `base` es la carpeta de recursos
 * (p. ej. `recursos/pixel/`); `estado` elige la variante (normal por defecto, resaltado al pasar el ratón).
 * Los marcos sin estados o con corte inválido se descartan en silencio: la interfaz usa su estilo por defecto.
 */
export function resolverMarcos(
  ui: Record<string, MarcoPixel> | undefined, base: string, estado = 'normal',
): Record<string, MarcoResuelto> {
  const salida: Record<string, MarcoResuelto> = {};
  if (!ui) return salida;
  for (const [nombre, m] of Object.entries(ui)) {
    const ruta = m.estados?.[estado] ?? m.estados?.normal;
    if (!ruta) continue;
    const c = m.corte;
    if (!c || [c.arriba, c.abajo, c.izquierda, c.derecha].some((v) => !Number.isFinite(v) || v < 0)) continue;
    const repetir = REPETICIONES.includes(m.repetir ?? '') ? (m.repetir as Repeticion) : 'round';
    salida[nombre] = {
      ruta: `${base}${ruta}`,
      corte: { arriba: c.arriba, abajo: c.abajo, izquierda: c.izquierda, derecha: c.derecha },
      repetir,
      relleno: m.relleno === true,
    };
  }
  return salida;
}
