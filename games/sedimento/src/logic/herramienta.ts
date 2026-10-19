import type { TipoEdificio } from './sim/tipos';

// Máquina de estados de la herramienta de construcción (sin DOM ni three): qué edificio se está
// colocando y con qué giro. La UI y la entrada solo envían eventos; aquí se decide la transición.

export type Herramienta = { modo: 'ninguna' } | { modo: 'colocar'; tipo: TipoEdificio; giro: number };

export type EventoHerramienta =
  | { tipo: 'elegir'; edificio: TipoEdificio }
  | { tipo: 'girar'; pasos: number }
  | { tipo: 'cancelar' }
  /** Tras colocar con éxito: se sigue colocando el mismo tipo (como en los city builders), salvo que se pida soltar. */
  | { tipo: 'colocado'; soltar: boolean };

export const SIN_HERRAMIENTA: Herramienta = { modo: 'ninguna' };

/** Normaliza un ángulo a [0, 2π). */
const VUELTA = Math.PI * 2;
const normalizar = (a: number) => {
  const n = ((a % VUELTA) + VUELTA) % VUELTA;
  // El redondeo puede dejar 6,2831853… en vez de 0 tras dar la vuelta entera.
  return VUELTA - n < 1e-9 ? 0 : n;
};

export function transicion(h: Herramienta, ev: EventoHerramienta, pasoGiro: number): Herramienta {
  switch (ev.tipo) {
    case 'elegir':
      // Elegir el mismo edificio otra vez lo suelta (el botón actúa como interruptor).
      if (h.modo === 'colocar' && h.tipo === ev.edificio) return SIN_HERRAMIENTA;
      return { modo: 'colocar', tipo: ev.edificio, giro: h.modo === 'colocar' ? h.giro : 0 };
    case 'girar':
      return h.modo === 'colocar' ? { ...h, giro: normalizar(h.giro + ev.pasos * pasoGiro) } : h;
    case 'cancelar':
      return SIN_HERRAMIENTA;
    case 'colocado':
      return ev.soltar ? SIN_HERRAMIENTA : h;
  }
}

/** Texto para el jugador de cada motivo por el que no se puede construir. */
export const TEXTO_MOTIVO: Record<string, string> = {
  'fuera-del-mapa': 'Fuera del mapa',
  ocupado: 'Choca con otra construcción',
  agua: 'No se puede construir sobre el agua',
  pendiente: 'El terreno es demasiado empinado',
  terreno: 'Este terreno no sirve para esto',
  'poco-fertil': 'La tierra es poco fértil',
  'lejos-del-agua': 'Demasiado lejos del agua',
  'sin-agua-al-lado': 'Necesita agua al lado',
  'sin-arcilla-al-lado': 'Necesita arcilla cerca',
};
