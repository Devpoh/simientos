// Clima y biomas. El bioma no se elige a mano: sale de la temperatura media anual y de la
// precipitación, como en el diagrama de Whittaker (ecología). La temperatura baja con la
// altitud (gradiente térmico) y la lluvia sube en las montañas (efecto orográfico), así que
// en un mismo mapa aparecen bandas lógicas: desierto en el valle → bosque → tundra → nieve.
// El mapa mundial (v0.4) usará esta misma función, añadiendo la latitud a la temperatura.

export type Bioma =
  | 'desierto'
  | 'estepa'
  | 'sabana'
  | 'selva'
  | 'mediterraneo'
  | 'pradera'
  | 'bosqueTemplado'
  | 'taiga'
  | 'tundra'
  | 'nieve';

/** Orden de frío a cálido-húmedo, útil para leyendas y tests. */
export const BIOMAS: readonly Bioma[] = ['nieve', 'tundra', 'taiga', 'bosqueTemplado', 'pradera', 'mediterraneo', 'estepa', 'desierto', 'sabana', 'selva'];

export interface ConfigClima {
  /** Temperatura media anual a nivel del mar (°C). Sumer, hoy en día: unos 24 °C. */
  temperaturaBase: number;
  /** Precipitación anual en el valle (mm). Sur de Mesopotamia: unos 150 mm. */
  precipitacionBase: number;
  /** Altitud (m) de la cumbre más alta del mapa. */
  alturaMaxMetros: number;
  /** °C que se pierden por cada 1000 m (media atmosférica: 6,5). */
  gradienteTermico: number;
  /** mm de lluvia extra por cada metro de altitud (efecto orográfico). */
  lluviaPorMetro: number;
  /** Variación de la temperatura y la lluvia base entre partidas (± °C y ± fracción). */
  variacionTemperatura: number;
  variacionLluvia: number;
}

export interface Clima {
  temperatura: number;
  precipitacion: number;
}

export function climaEnAltitud(cfg: ConfigClima, metros: number): Clima {
  return {
    temperatura: cfg.temperaturaBase - (cfg.gradienteTermico * metros) / 1000,
    precipitacion: cfg.precipitacionBase + cfg.lluviaPorMetro * metros,
  };
}

/** Clasificación de Whittaker simplificada a 10 biomas. */
export function clasificarBioma(temperatura: number, precipitacion: number): Bioma {
  if (temperatura < -4) return 'nieve';
  if (temperatura < 0) return 'tundra';
  if (temperatura < 5) return precipitacion >= 300 ? 'taiga' : 'tundra';
  if (temperatura < 18) {
    if (precipitacion < 250) return 'estepa';
    if (temperatura >= 12 && precipitacion < 800) return 'mediterraneo';
    if (precipitacion < 500) return 'pradera';
    return 'bosqueTemplado';
  }
  if (precipitacion < 250) return 'desierto';
  if (precipitacion < 500) return 'estepa';
  if (precipitacion < 1200) return 'sabana';
  return 'selva';
}

/** Fertilidad natural del suelo según el bioma (sin riego). */
export const FERTILIDAD_BIOMA: Record<Bioma, number> = {
  desierto: 0.05,
  estepa: 0.2,
  sabana: 0.45,
  selva: 0.4,
  mediterraneo: 0.45,
  pradera: 0.6,
  bosqueTemplado: 0.5,
  taiga: 0.2,
  tundra: 0.05,
  nieve: 0,
};
