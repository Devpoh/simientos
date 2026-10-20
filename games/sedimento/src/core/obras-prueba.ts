import { puedeConstruir, colocarObra, materialesHastaEtapa, type Mundo } from '../logic/sim/obras';
import { ETAPAS_OBRA, type ConfigSim, type EstadoSim, type EtapaObra, type TipoEdificio, type Ubicacion } from '../logic/sim/tipos';

interface Muestra {
  tipo: TipoEdificio;
  etapa: EtapaObra;
  /** Progreso dentro de la etapa (0..1). */
  progreso: number;
}

/** Una obra en cada etapa, con distintos progresos: para verificar con `shot` (?obrasPrueba=1) cómo se ven. */
const MUESTRAS: readonly Muestra[] = [
  { tipo: 'choza', etapa: 'plano', progreso: 0 },
  { tipo: 'casa', etapa: 'preparacion', progreso: 0.6 },
  { tipo: 'casa', etapa: 'cimientos', progreso: 0.7 },
  { tipo: 'almacen', etapa: 'estructura', progreso: 0.5 },
  { tipo: 'casa', etapa: 'estructura', progreso: 0.95 },
  { tipo: 'casa', etapa: 'cubierta', progreso: 0.6 },
];

/**
 * Siembra obras de prueba en espiral alrededor de `centro`, ya en su etapa y con el material entregado.
 * Solo se usa con el parámetro de test `?obrasPrueba=1`: nunca en una partida normal.
 */
export function sembrarObrasDePrueba(e: EstadoSim, t: Mundo, cfg: ConfigSim, centro: Ubicacion): void {
  for (const m of MUESTRAS) {
    let sitio: Ubicacion | null = null;
    for (let r = 1.6; r < 12 && !sitio; r += 0.25) {
      for (let a = 0; a < Math.PI * 2 && !sitio; a += 0.3) {
        const u = { x: centro.x + Math.cos(a) * r, z: centro.z + Math.sin(a) * r, giro: a * 0.5 };
        if (puedeConstruir(e, t, m.tipo, u, cfg)) sitio = u;
      }
    }
    if (!sitio) continue;
    const r = colocarObra(e, t, m.tipo, sitio, cfg);
    if (!('id' in r)) continue;
    const o = e.obras.find((x) => x.id === r.id);
    if (!o) continue;
    const def = cfg.edificios[m.tipo];
    const antes = ETAPAS_OBRA.slice(0, ETAPAS_OBRA.indexOf(m.etapa)).reduce((s, et) => s + cfg.obras.fraccionTrabajo[et], 0);
    o.etapa = m.etapa;
    o.trabajoEtapa = def.trabajo * cfg.obras.fraccionTrabajo[m.etapa] * m.progreso;
    o.trabajoHecho = def.trabajo * (antes + cfg.obras.fraccionTrabajo[m.etapa] * m.progreso);
    o.entregado = { ...materialesHastaEtapa(cfg, m.tipo, m.etapa) };
  }
}
