import { BIENES, TIPOS_EDIFICIO, type Bien, type ConfigSim, type DefEdificio, type Existencias, type TipoEdificio } from './tipos';

interface TuningSim {
  reloj: { ticksPorSegundo: number; segundosPorDia: number };
  poblacion: ConfigSim['poblacion'];
  economia: Omit<ConfigSim['economia'], 'ordenAlimentos' | 'reservaInicial'> & {
    ordenAlimentos: string[];
    reservaInicial: Record<string, number>;
  };
  obras: ConfigSim['obras'];
  edificios: Record<string, { terrenos: string[]; materiales: Record<string, number>; trabajo: number; puestos?: number; vivienda?: number; fertilidadMin?: number; distAguaMax?: number; junto?: string }>;
}

const esBien = (b: string): b is Bien => (BIENES as readonly string[]).includes(b);

function existencias(origen: Record<string, number>, donde: string): Partial<Existencias> {
  const res: Partial<Existencias> = {};
  for (const [b, v] of Object.entries(origen)) {
    if (!esBien(b)) throw new Error(`tuning.${donde}: bien desconocido «${b}»`);
    res[b] = v;
  }
  return res;
}

function edificios(t: TuningSim['edificios']): Record<TipoEdificio, DefEdificio> {
  const res = {} as Record<TipoEdificio, DefEdificio>;
  for (const tipo of TIPOS_EDIFICIO) {
    const d = t[tipo];
    if (!d) throw new Error(`tuning.edificios: falta «${tipo}»`);
    if (d.junto !== undefined && d.junto !== 'agua' && d.junto !== 'arcilla') throw new Error(`tuning.edificios.${tipo}.junto inválido`);
    res[tipo] = { ...d, materiales: existencias(d.materiales, `edificios.${tipo}.materiales`), junto: d.junto };
  }
  return res;
}

/** Valida tuning.json y lo convierte en la configuración tipada de la simulación. */
export function configDesdeTuning(t: TuningSim): ConfigSim {
  const orden = t.economia.ordenAlimentos.map((b) => {
    if (!esBien(b)) throw new Error(`tuning.economia.ordenAlimentos: bien desconocido «${b}»`);
    return b;
  });
  return {
    ticksPorDia: t.reloj.ticksPorSegundo * t.reloj.segundosPorDia,
    poblacion: t.poblacion,
    economia: { ...t.economia, ordenAlimentos: orden, reservaInicial: existencias(t.economia.reservaInicial, 'economia.reservaInicial') },
    obras: t.obras,
    edificios: edificios(t.edificios),
  };
}
