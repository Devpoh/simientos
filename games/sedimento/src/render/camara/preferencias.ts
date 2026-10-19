import type { ConfigRender } from '../config';

type ConfigCamara = ConfigRender['camara'];

export type AccionTecla = 'adelante' | 'atras' | 'izquierda' | 'derecha' | 'girarIzquierda' | 'girarDerecha' | 'subir' | 'bajar';

/** Lo que el jugador puede cambiar en las opciones: se guarda en el navegador y manda sobre tuning.json. */
export interface PreferenciasCamara {
  velocidadPan: number;
  velocidadAdaptativa: boolean;
  sensibilidadGiro: number;
  sensibilidadInclinacion: number;
  sensibilidadZoom: number;
  zoomAlCursor: boolean;
  invertirRueda: boolean;
  invertirGiro: boolean;
  invertirInclinacion: boolean;
  bordesActivos: boolean;
  teclas: Record<AccionTecla, string[]>;
}

const CLAVE = 'sedimento.camara';

/** Valores por defecto (los de tuning.json). */
export function preferenciasPorDefecto(c: ConfigCamara): PreferenciasCamara {
  return {
    velocidadPan: c.velocidadPan,
    velocidadAdaptativa: c.velocidadAdaptativa,
    sensibilidadGiro: c.sensibilidadGiro,
    sensibilidadInclinacion: c.sensibilidadInclinacion,
    sensibilidadZoom: c.sensibilidadZoom,
    zoomAlCursor: c.zoomAlCursor,
    invertirRueda: c.invertirRueda,
    invertirGiro: c.invertirGiro,
    invertirInclinacion: c.invertirInclinacion,
    bordesActivos: c.bordePantalla.activo,
    teclas: {
      adelante: [...c.teclas.adelante],
      atras: [...c.teclas.atras],
      izquierda: [...c.teclas.izquierda],
      derecha: [...c.teclas.derecha],
      girarIzquierda: [...c.teclas.girarIzquierda],
      girarDerecha: [...c.teclas.girarDerecha],
      subir: [...c.teclas.subir],
      bajar: [...c.teclas.bajar],
    },
  };
}

const esNumeroPositivo = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const esLista = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((t) => typeof t === 'string');

/**
 * Mezcla lo guardado con los valores por defecto, campo a campo y validando el tipo: un dato
 * corrupto o de una versión anterior no rompe la cámara, simplemente se ignora.
 */
export function mezclarPreferencias(base: PreferenciasCamara, guardado: unknown): PreferenciasCamara {
  if (typeof guardado !== 'object' || guardado === null) return base;
  const g = guardado as Record<string, unknown>;
  const res: PreferenciasCamara = { ...base, teclas: { ...base.teclas } };
  for (const k of ['velocidadPan', 'sensibilidadGiro', 'sensibilidadInclinacion', 'sensibilidadZoom'] as const) {
    if (esNumeroPositivo(g[k])) res[k] = g[k];
  }
  for (const k of ['velocidadAdaptativa', 'zoomAlCursor', 'invertirRueda', 'invertirGiro', 'invertirInclinacion', 'bordesActivos'] as const) {
    if (typeof g[k] === 'boolean') res[k] = g[k];
  }
  const teclas = g.teclas;
  if (typeof teclas === 'object' && teclas !== null) {
    for (const accion of Object.keys(res.teclas) as AccionTecla[]) {
      const t = (teclas as Record<string, unknown>)[accion];
      if (esLista(t)) res.teclas[accion] = t;
    }
  }
  return res;
}

/** Carga las preferencias; si localStorage no está disponible (modo privado, tests) usa las de tuning. */
export function cargarPreferencias(c: ConfigCamara): PreferenciasCamara {
  const base = preferenciasPorDefecto(c);
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo === null ? base : mezclarPreferencias(base, JSON.parse(crudo));
  } catch {
    return base;
  }
}

export function guardarPreferencias(p: PreferenciasCamara): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // Sin almacenamiento: las preferencias solo duran esta sesión.
  }
}
