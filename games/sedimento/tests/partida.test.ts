import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import {
  avanzarPartida, crearPartida, indiceVelocidad, pausarPartida, racionPartida, resumenPartida, velocidadPartida,
} from '../src/logic/partida';

describe('partida: reloj y simulación unidos (P2b, R56)', () => {
  it('arranca con la semilla, la velocidad inicial y sin ticks', () => {
    const p = crearPartida(1234);
    expect(p.ticksTotales).toBe(0);
    expect(p.reloj.tick).toBe(0);
    expect(p.reloj.pausado).toBe(false);
    expect(p.reloj.velocidad).toBe(tuning.reloj.velocidades[0]);
    expect(indiceVelocidad(p)).toBe(0);
  });

  it('avanza ticks a paso fijo: 1 s de tiempo real a x1 = ticksPorSegundo ticks', () => {
    const p = crearPartida(7);
    // 20 fotogramas de 50 ms = 1 s de tiempo real.
    let ticks = 0;
    for (let i = 0; i < 20; i++) ticks += avanzarPartida(p, 50);
    expect(ticks).toBe(tuning.reloj.ticksPorSegundo);
    expect(p.ticksTotales).toBe(tuning.reloj.ticksPorSegundo);
  });

  it('el resultado es el mismo con fotogramas grandes o pequeños (paso fijo, delta acotado)', () => {
    const lento = crearPartida(99);
    const rapido = crearPartida(99);
    for (let i = 0; i < 20; i++) avanzarPartida(lento, 50); // 20 fps
    for (let i = 0; i < 200; i++) avanzarPartida(rapido, 5); // 200 fps
    expect(rapido.ticksTotales).toBe(lento.ticksTotales);
    expect(rapido.sim.tick).toBe(lento.sim.tick);
  });

  it('pausar detiene la simulación y reanudar la continúa', () => {
    const p = crearPartida(3);
    for (let i = 0; i < 20; i++) avanzarPartida(p, 50);
    const antes = p.sim.tick;
    pausarPartida(p);
    for (let i = 0; i < 20; i++) expect(avanzarPartida(p, 50)).toBe(0);
    expect(p.sim.tick).toBe(antes);
    pausarPartida(p);
    for (let i = 0; i < 20; i++) avanzarPartida(p, 50);
    expect(p.sim.tick).toBeGreaterThan(antes);
  });

  it('la velocidad multiplica los ticks sin duplicar ni saltar días', () => {
    const p = crearPartida(11);
    velocidadPartida(p, 2);
    expect(indiceVelocidad(p)).toBe(2);
    let ticks = 0;
    for (let i = 0; i < 20; i++) ticks += avanzarPartida(p, 50);
    expect(ticks).toBe(tuning.reloj.ticksPorSegundo * tuning.reloj.velocidades[2]);
  });

  it('el delta acotado impide que un tirón largo mande la simulación de un salto', () => {
    const p = crearPartida(5);
    const ticks = avanzarPartida(p, 5000);
    expect(ticks).toBeLessThanOrEqual(tuning.reloj.maxTicksPorFrame);
  });

  it('el resumen trae fecha, población y los recursos del HUD', () => {
    const p = crearPartida(20260418);
    const r = resumenPartida(p);
    expect(r.fecha.anio).toBeGreaterThanOrEqual(1);
    expect(r.personas).toBe(tuning.poblacion.personasIniciales);
    expect(r.recursos.map(([k]) => k)).toEqual(['cebada', 'adobe', 'cana', 'arcilla']);
    expect(r.recursos.find(([k]) => k === 'cebada')?.[1]).toBe(tuning.economia.reservaInicial.cebada);
    expect(r.alimento).toBeGreaterThan(0);
  });

  it('fijar la ración cambia la reserva que muestra el HUD', () => {
    const p = crearPartida(42);
    const antes = resumenPartida(p).reservaDias;
    racionPartida(p, 0.5);
    expect(p.sim.racionObjetivo).toBe(0.5);
    expect(resumenPartida(p).reservaDias).toBeGreaterThan(antes);
  });

  it('un día completo de simulación reparte raciones (el almacén baja)', () => {
    const p = crearPartida(8);
    const cebadaInicial = p.sim.almacen.cebada;
    // 1 s de juego = 1 día a x1.
    for (let i = 0; i < 20; i++) avanzarPartida(p, 50);
    expect(p.sim.dia).toBe(1);
    expect(p.sim.almacen.cebada).toBeLessThan(cebadaInicial);
  });
});
