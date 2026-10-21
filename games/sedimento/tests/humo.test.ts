import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import {
  avanzarHumo, crearHumo, crearPostura, posturas, type Bocanada, type FocoHumo, type PosturaBocanada,
} from '../src/logic/humo';

const FOCOS: FocoHumo[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 120, fuego: true }];

describe('humo: lógica pura (P2d, R87, D037)', () => {
  it('crea una bocanada por foco, con el mismo largo que focos', () => {
    const b = crearHumo(FOCOS);
    expect(b.length).toBe(FOCOS.length);
    expect(b[0].x).toBe(0);
    expect(b[2].fuego).toBe(true);
    expect(b[0].fuego).toBe(false);
  });

  it('es determinista: la misma semilla da exactamente las mismas bocanadas', () => {
    const a = crearHumo(FOCOS);
    const b = crearHumo(FOCOS);
    expect(a).toEqual(b);
  });

  it('todas las bocanadas empiezan dentro de [0,1) de vida y con fotograma válido', () => {
    for (const b of crearHumo(FOCOS)) {
      expect(b.vida).toBeGreaterThanOrEqual(0);
      expect(b.vida).toBeLessThan(1);
      expect(b.fotograma).toBeGreaterThanOrEqual(0);
      expect(b.fotograma).toBeLessThan(tuning.humo.fotogramas);
    }
  });

  it('avanzar no asigna: reutiliza el mismo array y el mismo largo', () => {
    const b = crearHumo(FOCOS);
    const antes = b[0];
    avanzarHumo(b, 1 / 60);
    expect(b.length).toBe(FOCOS.length);
    expect(b[0]).toBe(antes);              // mismo objeto, cero asignaciones
  });

  it('el humo sube: la vida crece con el tiempo', () => {
    const b = crearHumo(FOCOS);
    const v0 = b[0].vida;
    avanzarHumo(b, 0.2);
    expect(b[0].vida).toBeGreaterThan(v0);
  });

  it('al llegar arriba se recicla abajo en vez de desaparecer (el pool no crece)', () => {
    const b = crearHumo([{ x: 5, y: 5 }]);
    // Suficiente tiempo para dar más de una vuelta completa.
    for (let i = 0; i < 400; i++) avanzarHumo(b, 1 / 30);
    expect(b.length).toBe(1);
    expect(b[0].vida).toBeGreaterThanOrEqual(0);
    expect(b[0].vida).toBeLessThan(1);
  });

  it('el delta va acotado: un parón largo no teletransporta el humo ni lo saca de rango', () => {
    const b = crearHumo(FOCOS);
    avanzarHumo(b, 1000);
    for (const x of b) {
      expect(x.vida).toBeGreaterThanOrEqual(0);
      expect(x.vida).toBeLessThan(1);
    }
  });

  it('el fotograma es coherente con la vida y nunca se sale del rango del atlas', () => {
    const b = crearHumo(FOCOS);
    for (let i = 0; i < 200; i++) {
      avanzarHumo(b, 1 / 60);
      for (const x of b) {
        expect(x.fotograma).toBeGreaterThanOrEqual(0);
        expect(x.fotograma).toBeLessThan(tuning.humo.fotogramas);
        expect(x.fotograma).toBe(Math.min(tuning.humo.fotogramas - 1, Math.floor(x.vida * tuning.humo.fotogramas)));
      }
    }
  });

  it('las posturas suben y se desplazan: la y decrece con la vida', () => {
    const b = crearHumo([{ x: 10, y: 40 }]);
    const dst: PosturaBocanada[] = [crearPostura()];
    posturas(b, dst);
    const yAbajo = dst[0].y;
    avanzarHumo(b, 1.0);
    posturas(b, dst);
    expect(dst[0].y).toBeLessThan(yAbajo);
    expect(dst[0].x).not.toBe(10);          // la deriva lateral se nota
  });

  it('la hoguera sube menos que la chimenea con la misma vida', () => {
    const b: Bocanada[] = [
      { ...crearHumo([{ x: 0, y: 0 }])[0], vida: 0.5, deriva: 0, subida: tuning.humo.subidaPx, fuego: false },
      { ...crearHumo([{ x: 0, y: 0 }])[0], vida: 0.5, deriva: 0, subida: tuning.humo.subidaPx, fuego: true },
    ];
    const dst: PosturaBocanada[] = [crearPostura(), crearPostura()];
    posturas(b, dst);
    expect(dst[1].y).toBeGreaterThan(dst[0].y);   // la de fuego queda más baja
  });

  it('sin focos no hay nada que dibujar', () => {
    expect(crearHumo([])).toEqual([]);
    expect(avanzarHumo([], 1 / 60)).toBe(0);
  });

  it('el humo nunca se sale del presupuesto de focos del tuning', () => {
    const muchos: FocoHumo[] = Array.from({ length: tuning.humo.maxFocos + 50 }, (_, i) => ({ x: i, y: i }));
    const b = crearHumo(muchos);
    expect(b.length).toBe(muchos.length);
  });
});
