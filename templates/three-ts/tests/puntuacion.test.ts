import { describe, expect, it } from 'vitest';
import { puntuacionInicial, recoger, romperRacha } from '../src/logic/puntuacion';
import tuning from '../src/data/tuning.json';

const reglas = tuning.puntuacion;

describe('puntuacion', () => {
  it('la primera recogida vale el valor base', () => {
    expect(recoger(puntuacionInicial(), reglas)).toEqual({ puntos: reglas.valorBase, racha: 1 });
  });

  it('la racha suma bonus y se limita a rachaMaxima', () => {
    let p = puntuacionInicial();
    for (let i = 0; i < reglas.rachaMaxima + 3; i++) p = recoger(p, reglas);
    expect(p.racha).toBe(reglas.rachaMaxima);
  });

  it('romper la racha conserva los puntos', () => {
    const p = romperRacha(recoger(recoger(puntuacionInicial(), reglas), reglas));
    expect(p.racha).toBe(0);
    expect(p.puntos).toBeGreaterThan(0);
  });
});
