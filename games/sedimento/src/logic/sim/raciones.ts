import { registrar, registrarEstado } from './hechos';
import type { ConfigSim, EstadoSim } from './tipos';

// Economía de templo (v0.1): el templo guarda la comida y reparte raciones cada día.
// Si no llega para todos, recorta a todos por igual y deja constancia de por qué.
// En F06 el reparto pasa a ser físico (porteadores); la contabilidad será la misma.

export const personas = (e: EstadoSim) => e.hogares.reduce((s, h) => s + h.miembros, 0);

export function alimentoDisponible(e: EstadoSim, cfg: ConfigSim): number {
  return cfg.economia.ordenAlimentos.reduce((s, b) => s + e.almacen[b], 0);
}

/** Lo que el templo reparte al día con la política de ración actual. */
export function consumoDiario(e: EstadoSim, cfg: ConfigSim): number {
  return personas(e) * cfg.economia.racionPorPersona * e.racionObjetivo;
}

/** Días que duran las reservas al ritmo actual (Infinity si no hay consumo). */
export function reservaDias(e: EstadoSim, cfg: ConfigSim): number {
  const c = consumoDiario(e, cfg);
  return c > 0 ? alimentoDisponible(e, cfg) / c : Infinity;
}

export function fijarRacion(e: EstadoSim, fraccion: number, cfg: ConfigSim): void {
  if (!cfg.economia.racionesPermitidas.includes(fraccion)) throw new Error(`Ración no permitida: ${fraccion}`);
  if (fraccion === e.racionObjetivo) return;
  registrarEstado(e, cfg.economia.maxHechos, {
    tipo: 'politica-racion',
    sujeto: 'templo',
    datos: { antes: e.racionObjetivo, despues: fraccion },
  });
  e.racionObjetivo = fraccion;
}

/** Sistema diario de raciones. Muta el estado (por rendimiento) y registra hechos. */
export function repartirRaciones(e: EstadoSim, cfg: ConfigSim): void {
  const eco = cfg.economia;
  const reservaAntes = reservaDias(e, cfg);
  const necesario = consumoDiario(e, cfg);
  const disponible = alimentoDisponible(e, cfg);
  const reparto = Math.min(necesario, disponible);
  const cuota = necesario > 0 ? reparto / necesario : 1;

  // Se gasta en el orden configurado: primero lo que peor se conserva va al final.
  let pendiente = reparto;
  for (const b of eco.ordenAlimentos) {
    const usado = Math.min(pendiente, e.almacen[b]);
    e.almacen[b] -= usado;
    pendiente -= usado;
  }

  let causaRecorte: number | undefined;
  if (cuota < 1) {
    causaRecorte =
      e.ultimoHecho['reserva-agotada'] ??
      registrarEstado(e, eco.maxHechos, { tipo: 'reserva-agotada', sujeto: 'almacen', datos: { dia: e.dia } });
    registrar(e, eco.maxHechos, {
      tipo: 'racion-recortada',
      sujeto: 'ciudad',
      datos: { cuota: redondear(cuota) },
      causa: causaRecorte,
    });
  } else if (e.racionObjetivo < 1) {
    causaRecorte = e.ultimoHecho['politica-racion'];
  }

  for (const h of e.hogares) {
    const completo = h.miembros * eco.racionPorPersona;
    const recibido = h.miembros * eco.racionPorPersona * e.racionObjetivo * cuota;
    h.recibidoHoy = recibido;
    const ratio = completo > 0 ? recibido / completo : 1;
    h.satisfaccionComida += (ratio - h.satisfaccionComida) / eco.diasMediaMovil;
    const antes = h.diasHambre;
    h.diasHambre = ratio < eco.umbralHambre ? h.diasHambre + 1 : 0;
    if (antes === 0 && h.diasHambre === 1)
      registrar(e, eco.maxHechos, { tipo: 'hambre-inicio', sujeto: `hogar:${h.id}`, datos: { ratio: redondear(ratio) }, causa: causaRecorte });
    else if (antes > 0 && h.diasHambre === 0)
      registrar(e, eco.maxHechos, { tipo: 'hambre-fin', sujeto: `hogar:${h.id}`, datos: { dias: antes } });
  }

  // Avisos de reserva al cruzar umbrales (una sola vez por cruce, no cada día).
  const reservaDespues = reservaDias(e, cfg);
  if (reservaAntes >= eco.diasReservaBaja && reservaDespues < eco.diasReservaBaja)
    registrarEstado(e, eco.maxHechos, { tipo: 'reserva-baja', sujeto: 'almacen', datos: { dias: Math.floor(reservaDespues) } });
  // Si hoy se repartió completo, el agotamiento anterior ya no es causa de nada nuevo.
  if (cuota === 1) delete e.ultimoHecho['reserva-agotada'];
}

const redondear = (x: number) => Math.round(x * 100) / 100;
