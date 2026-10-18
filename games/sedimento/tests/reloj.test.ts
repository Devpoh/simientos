import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import {
  alternarPausa,
  avanzar,
  crearReloj,
  fecha,
  fijarVelocidad,
} from '../src/logic/reloj';

const cfg = tuning.reloj;

describe('reloj', () => {
  it('1 s a ×1 simulado como 10 frames de dt 0.1 produce 20 ticks', () => {
    let r = crearReloj(cfg);
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const paso = avanzar(r, 0.1, cfg);
      r = paso.reloj;
      total += paso.ticks;
    }
    expect(total).toBe(20);
  });

  it('60 frames de 1/60 s producen exactamente 20 ticks', () => {
    let r = crearReloj(cfg);
    let total = 0;
    for (let i = 0; i < 60; i++) {
      const paso = avanzar(r, 1 / 60, cfg);
      r = paso.reloj;
      total += paso.ticks;
    }
    expect(total).toBe(20);
  });

  it('en pausa no avanza', () => {
    let r = crearReloj(cfg);
    r = alternarPausa(r);
    const { ticks, reloj } = avanzar(r, 1, cfg);
    expect(ticks).toBe(0);
    expect(reloj.acumulado).toBe(r.acumulado);
  });

  it('×4 con dt 0.1 s produce 8 ticks', () => {
    let r = crearReloj(cfg);
    r = fijarVelocidad(r, 4, cfg);
    const { ticks } = avanzar(r, 0.1, cfg);
    expect(ticks).toBe(8);
  });

  it('dt grande a ×4 se topa en maxTicksPorFrame y vacía el acumulado', () => {
    let r = crearReloj(cfg);
    r = fijarVelocidad(r, 4, cfg);
    const { ticks, reloj } = avanzar(r, 2, cfg);
    expect(ticks).toBe(16);
    expect(reloj.acumulado).toBe(0);
  });

  it('fecha(0) es año 1, mes 4, día 1, verano', () => {
    const f = fecha(0, cfg);
    expect(f).toEqual({ diaTotal: 0, anio: 1, mes: 4, diaDelMes: 1, estacion: 'verano' });
  });

  it('el día 90 cae en mes 7, otoño', () => {
    const tick = 90 * cfg.ticksPorSegundo * cfg.segundosPorDia;
    const f = fecha(tick, cfg);
    expect(f.mes).toBe(7);
    expect(f.estacion).toBe('otono');
  });

  it('el día 270 cae en año 2, mes 1, primavera', () => {
    const tick = 270 * cfg.ticksPorSegundo * cfg.segundosPorDia;
    const f = fecha(tick, cfg);
    expect(f.anio).toBe(2);
    expect(f.mes).toBe(1);
    expect(f.estacion).toBe('primavera');
  });

  it('fijarVelocidad con un valor no permitido lanza error', () => {
    const r = crearReloj(cfg);
    expect(() => fijarVelocidad(r, 3, cfg)).toThrow();
  });
});
