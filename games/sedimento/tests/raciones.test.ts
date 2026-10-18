import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { configDesdeTuning } from '../src/logic/sim/config';
import { consumoDiario, fijarRacion, personas, reservaDias } from '../src/logic/sim/raciones';
import { avanzarDias, crearEstado } from '../src/logic/sim/simulacion';

const cfg = configDesdeTuning(tuning);
const conCebada = (cebada: number) => {
  const e = crearEstado(cfg, 42);
  e.almacen.cebada = cebada;
  return e;
};

describe('raciones del templo', () => {
  it('con 300 raciones y 30 personas: reserva de 10 días y baja 30 al día', () => {
    const e = conCebada(300);
    expect(personas(e)).toBe(30);
    expect(reservaDias(e, cfg)).toBe(10);
    avanzarDias(e, 1, cfg);
    expect(e.almacen.cebada).toBe(270);
    expect(reservaDias(e, cfg)).toBe(9);
  });

  it('con el almacén vacío los hogares pasan hambre y su satisfacción de comida baja', () => {
    const e = conCebada(0);
    avanzarDias(e, 10, cfg);
    for (const h of e.hogares) {
      expect(h.diasHambre).toBe(10);
      expect(h.satisfaccionComida).toBeLessThan(0.75);
    }
  });

  it('si no llega para todos, recorta a todos por igual y deja la causa encadenada', () => {
    const e = conCebada(15); // la mitad de lo necesario
    avanzarDias(e, 1, cfg);
    const agotada = e.hechos.find((h) => h.tipo === 'reserva-agotada');
    const recorte = e.hechos.find((h) => h.tipo === 'racion-recortada');
    expect(agotada).toBeDefined();
    expect(recorte?.causa).toBe(agotada?.id);
    expect(recorte?.datos?.cuota).toBe(0.5);
    for (const h of e.hogares) expect(h.recibidoHoy).toBeCloseTo(h.miembros * 0.5, 6);
    // El hambre de cada hogar apunta a la misma causa.
    const hambres = e.hechos.filter((h) => h.tipo === 'hambre-inicio');
    expect(hambres).toHaveLength(0); // 0,5 no está por debajo del umbral de hambre (0,5)
  });

  it('racionar al 75 % alarga las reservas un tercio y queda registrado como decisión', () => {
    const e = conCebada(300);
    fijarRacion(e, 0.75, cfg);
    expect(consumoDiario(e, cfg)).toBe(22.5);
    expect(reservaDias(e, cfg)).toBeCloseTo(13.33, 2);
    expect(e.hechos.at(-1)?.tipo).toBe('politica-racion');
    expect(() => fijarRacion(e, 0.6, cfg)).toThrow();
  });

  it('avisa una sola vez al bajar de 30 días de reserva', () => {
    const e = conCebada(30 * 31);
    avanzarDias(e, 5, cfg);
    expect(e.hechos.filter((h) => h.tipo === 'reserva-baja')).toHaveLength(1);
  });

  it('el hambre empieza y termina con hechos que la explican', () => {
    const e = conCebada(0);
    avanzarDias(e, 3, cfg);
    expect(e.hechos.filter((h) => h.tipo === 'hambre-inicio')).toHaveLength(6);
    expect(e.hechos.find((h) => h.tipo === 'hambre-inicio')?.causa).toBeDefined();
    e.almacen.cebada = 1000;
    avanzarDias(e, 1, cfg);
    expect(e.hechos.filter((h) => h.tipo === 'hambre-fin')).toHaveLength(6);
  });
});
