// Partida: une el reloj (tiempo real → ticks fijos) con la simulación. Lógica pura, sin motor.
// La presentación solo llama a `avanzar(ms)` y lee el estado; así el juego da el mismo resultado
// en un PC rápido y en uno lento (R56: lógica a paso fijo, dibujo interpolado).
import { configDesdeTuning } from './sim/config';
import { crearEstado, avanzarTicks } from './sim/simulacion';
import { alimentoDisponible, reservaDias, personas, fijarRacion } from './sim/raciones';
import { crearReloj, alternarPausa, fijarVelocidad, fecha, avanzar, type ConfigReloj, type EstadoReloj } from './reloj';
import type { ConfigSim, EstadoSim } from './sim/tipos';
import tuning from '../data/tuning.json';

export interface Partida {
  reloj: EstadoReloj;
  sim: EstadoSim;
  readonly cfgReloj: ConfigReloj;
  readonly cfgSim: ConfigSim;
  /** Ticks simulados desde el arranque (acumulado, no por fotograma). */
  ticksTotales: number;
}

export function crearPartida(semilla: number = tuning.mapa.semilla): Partida {
  const cfgReloj: ConfigReloj = tuning.reloj;
  const cfgSim = configDesdeTuning(tuning);
  return { reloj: crearReloj(cfgReloj), sim: crearEstado(cfgSim, semilla), cfgReloj, cfgSim, ticksTotales: 0 };
}

/** Avanza la partida `msReal` milisegundos de tiempo real (acotado) y devuelve los ticks ejecutados. */
export function avanzarPartida(p: Partida, msReal: number): number {
  const dt = Math.min(Math.max(msReal, 0), tuning.camara.deltaMaxMs) / 1000;
  const { reloj, ticks } = avanzar(p.reloj, dt, p.cfgReloj);
  p.reloj = reloj;
  if (ticks > 0) {
    avanzarTicks(p.sim, ticks, p.cfgSim);
    p.ticksTotales += ticks;
  }
  return ticks;
}

export function pausarPartida(p: Partida): void {
  p.reloj = alternarPausa(p.reloj);
}

/** Cambia la velocidad por índice de `tuning.reloj.velocidades`. Devuelve la velocidad aplicada. */
export function velocidadPartida(p: Partida, indice: number): number {
  const v = p.cfgReloj.velocidades[Math.max(0, Math.min(indice, p.cfgReloj.velocidades.length - 1))];
  p.reloj = fijarVelocidad(p.reloj, v, p.cfgReloj);
  return v;
}

export function indiceVelocidad(p: Partida): number {
  const i = p.cfgReloj.velocidades.indexOf(p.reloj.velocidad);
  return i === -1 ? 0 : i;
}

export function racionPartida(p: Partida, fraccion: number): void {
  fijarRacion(p.sim, fraccion, p.cfgSim);
}

export interface ResumenPartida {
  fecha: ReturnType<typeof fecha>;
  personas: number;
  alimento: number;
  reservaDias: number;
  /** Recursos del almacén que enseña el HUD, en orden. */
  recursos: readonly (readonly [string, number])[];
}

const ORDEN_HUD: readonly string[] = ['cebada', 'adobe', 'cana', 'arcilla'];

/** Resumen para el HUD: fecha, población y los recursos que se muestran. */
export function resumenPartida(p: Partida): ResumenPartida {
  const almacen = p.sim.almacen as unknown as Record<string, number>;
  return {
    fecha: fecha(p.reloj.tick, p.cfgReloj),
    personas: personas(p.sim),
    alimento: alimentoDisponible(p.sim, p.cfgSim),
    reservaDias: reservaDias(p.sim, p.cfgSim),
    recursos: ORDEN_HUD.map((b) => [b, almacen[b] ?? 0] as const),
  };
}
