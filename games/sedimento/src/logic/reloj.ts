export interface ConfigReloj {
  ticksPorSegundo: number;
  segundosPorDia: number;
  diasPorMes: number;
  mesesPorAnio: number;
  mesInicial: number;
  velocidades: number[];
  maxTicksPorFrame: number;
}

export interface EstadoReloj {
  tick: number;
  acumulado: number;
  velocidad: number;
  pausado: boolean;
}

export type Estacion = 'primavera' | 'verano' | 'otono' | 'invierno';

export function crearReloj(cfg: ConfigReloj): EstadoReloj {
  return { tick: 0, acumulado: 0, velocidad: cfg.velocidades[0], pausado: false };
}

export function avanzar(
  r: EstadoReloj,
  dtReal: number,
  cfg: ConfigReloj
): { reloj: EstadoReloj; ticks: number } {
  if (r.pausado) {
    return { reloj: { ...r }, ticks: 0 };
  }

  let acc = r.acumulado + dtReal * r.velocidad;
  let ticks = Math.floor(acc * cfg.ticksPorSegundo + 1e-9);
  acc -= ticks / cfg.ticksPorSegundo;

  if (ticks > cfg.maxTicksPorFrame) {
    ticks = cfg.maxTicksPorFrame;
    acc = 0;
  }

  return {
    reloj: { ...r, tick: r.tick + ticks, acumulado: acc },
    ticks,
  };
}

export function alternarPausa(r: EstadoReloj): EstadoReloj {
  return { ...r, pausado: !r.pausado };
}

export function fijarVelocidad(r: EstadoReloj, v: number, cfg: ConfigReloj): EstadoReloj {
  if (!cfg.velocidades.includes(v)) {
    throw new Error(`Velocidad ${v} no está en cfg.velocidades`);
  }
  return { ...r, velocidad: v };
}

export function fecha(
  tick: number,
  cfg: ConfigReloj
): { diaTotal: number; anio: number; mes: number; diaDelMes: number; estacion: Estacion } {
  const diaTotal = Math.floor(tick / (cfg.ticksPorSegundo * cfg.segundosPorDia));

  const diaAbsoluto = diaTotal + (cfg.mesInicial - 1) * cfg.diasPorMes;
  const anio = 1 + Math.floor(diaAbsoluto / (cfg.diasPorMes * cfg.mesesPorAnio));
  const diaEnAnio = diaAbsoluto % (cfg.diasPorMes * cfg.mesesPorAnio);
  const mes = 1 + Math.floor(diaEnAnio / cfg.diasPorMes);
  const diaDelMes = 1 + (diaEnAnio % cfg.diasPorMes);

  let estacion: Estacion;
  if (mes >= 1 && mes <= 3) estacion = 'primavera';
  else if (mes >= 4 && mes <= 6) estacion = 'verano';
  else if (mes >= 7 && mes <= 9) estacion = 'otono';
  else estacion = 'invierno';

  return { diaTotal, anio, mes, diaDelMes, estacion };
}
