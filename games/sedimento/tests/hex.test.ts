import { describe, expect, it } from 'vitest';
import { axialAMundo, axialAOffset, distancia, mundoAAxial, offsetAAxial, Rejilla } from '../src/logic/hex';

describe('hex', () => {
  it('offset ↔ axial ida y vuelta', () => {
    for (let fila = 0; fila < 7; fila++)
      for (let col = 0; col < 7; col++) {
        const a = offsetAAxial(col, fila);
        expect(axialAOffset(a.q, a.r)).toEqual({ col, fila });
      }
  });

  it('mundo ↔ axial exacto en el centro y cerca del borde de cada hexágono', () => {
    const rej = new Rejilla(48, 40);
    for (let i = 0; i < rej.total; i++) {
      const a = rej.axial(i);
      const { x, z } = axialAMundo(a.q, a.r, 1);
      expect(mundoAAxial(x, z, 1)).toEqual(a);
      expect(mundoAAxial(x + 0.7, z + 0.2, 1)).toEqual(a);
      expect(mundoAAxial(x - 0.3, z - 0.75, 1)).toEqual(a);
    }
  });

  it('vecinos: 6 en el interior, menos en las esquinas, y todos a distancia 1', () => {
    const rej = new Rejilla(10, 10);
    const centro = rej.indice(5, 5);
    expect(rej.vecinos(centro)).toHaveLength(6);
    expect(rej.vecinos(rej.indice(0, 0)).length).toBeLessThanOrEqual(3);
    for (const v of rej.vecinos(centro)) expect(rej.distancia(centro, v)).toBe(1);
  });

  it('distancia axial', () => {
    expect(distancia({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3);
    expect(distancia({ q: 1, r: 2 }, { q: -2, r: 4 })).toBe(3);
  });

  it('distanciasDesde respeta lo intransitable', () => {
    const rej = new Rejilla(5, 1);
    const d = rej.distanciasDesde([0], (i) => i !== 2);
    expect(d.slice(0, 2)).toEqual([0, 1]);
    expect(d[3]).toBe(Infinity);
  });
});
