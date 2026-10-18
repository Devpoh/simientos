import { crearRng, derivarSemilla, enteroEntre } from '../azar';
import { trabajarObras } from './obras';
import { repartirRaciones } from './raciones';
import { BIENES, type ConfigSim, type EstadoSim, type Existencias, type Hogar } from './tipos';

// Núcleo de la simulación: avanza por ticks fijos y ejecuta los sistemas diarios al cerrar
// cada día. El render nunca llama a los sistemas: solo pide avanzar ticks y lee el estado.

export function crearEstado(cfg: ConfigSim, semilla: number): EstadoSim {
  const almacen = Object.fromEntries(BIENES.map((b) => [b, cfg.economia.reservaInicial[b] ?? 0])) as Existencias;
  return {
    version: 1,
    semilla,
    tick: 0,
    dia: 0,
    almacen,
    hogares: crearHogares(cfg, semilla),
    obras: [],
    edificios: [],
    siguienteId: 1,
    racionObjetivo: 1,
    hechos: [],
    siguienteHecho: 1,
    ultimoHecho: {},
  };
}

/** Reparte las personas iniciales en hogares de 3 a 8 miembros, de forma determinista. */
function crearHogares(cfg: ConfigSim, semilla: number): Hogar[] {
  const { hogaresIniciales: n, personasIniciales: total, fraccionAdultos } = cfg.poblacion;
  const rng = crearRng(derivarSemilla(semilla, 'hogares'));
  const tamanos = Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0));
  for (let k = 0; k < n * 2; k++) {
    const a = enteroEntre(rng, 0, n - 1);
    const b = enteroEntre(rng, 0, n - 1);
    if (a !== b && tamanos[a] > 3 && tamanos[b] < 8) {
      tamanos[a]--;
      tamanos[b]++;
    }
  }
  return tamanos.map((miembros, id) => ({
    id,
    miembros,
    adultos: Math.max(1, Math.round(miembros * fraccionAdultos)),
    casa: null,
    recibidoHoy: 0,
    satisfaccionComida: 1,
    diasHambre: 0,
  }));
}

/** Avanza `ticks` pasos fijos; al completar cada día ejecuta los sistemas diarios en orden. */
export function avanzarTicks(e: EstadoSim, ticks: number, cfg: ConfigSim): void {
  for (let i = 0; i < ticks; i++) {
    e.tick++;
    if (e.tick % cfg.ticksPorDia === 0) {
      repartirRaciones(e, cfg);
      trabajarObras(e, cfg);
      e.dia++;
    }
  }
}

export function avanzarDias(e: EstadoSim, dias: number, cfg: ConfigSim): void {
  avanzarTicks(e, dias * cfg.ticksPorDia, cfg);
}
