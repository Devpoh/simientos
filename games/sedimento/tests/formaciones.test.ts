import { describe, expect, it } from 'vitest';
import {
  ajustarHueco, CFG_FORMACION, destinosFormacion, FORMACIONES, hueco, marcoDe, sinSolapes, todosPisables,
} from '../src/logic/formaciones';
import { colocarEstructura, crearOcupacionVacia } from '../src/logic/ocupacion';

/** Rejilla limpia: todo pisable salvo lo que se coloque. */
const limpia = (columnas = 60, filas = 60) => crearOcupacionVacia(columnas, filas);

describe('formaciones (P5, R51, §5)', () => {
  it('el marco apunta del centro del grupo al destino y se normaliza', () => {
    const m = marcoDe({ u: 10, v: 10 }, { u: 20, v: 10 });
    expect(m.du).toBeCloseTo(1);
    expect(m.dv).toBeCloseTo(0);
    // Sin desplazamiento, la dirección por defecto es la diagonal (1/√2, 1/√2).
    const q = marcoDe({ u: 10, v: 10 }, { u: 10, v: 10 });
    expect(q.du).toBeCloseTo(1 / Math.SQRT2);
    expect(q.dv).toBeCloseTo(1 / Math.SQRT2);
  });

  it('la columna alinea a todos detrás del líder sobre la marcha', () => {
    const oc = limpia();
    const destinos = destinosFormacion(oc, 'columna', { u: 10, v: 10 }, { u: 30, v: 10 }, 5);
    expect(destinos).toHaveLength(5);
    // Marcha en +u: todos comparten v = 10, y la u decrece de uno en uno.
    for (const d of destinos) expect(d.v).toBe(10);
    expect(destinos.map((d) => d.u)).toEqual([30, 29, 28, 27, 26]);
  });

  it('la línea es perpendicular a la marcha y centrada en el destino', () => {
    const oc = limpia();
    const destinos = destinosFormacion(oc, 'linea', { u: 10, v: 10 }, { u: 30, v: 10 }, 5);
    expect(destinos).toHaveLength(5);
    // Marcha en +u ⇒ lateral en v. Todos con u = 30, centrados en v = 10.
    for (const d of destinos) expect(d.u).toBe(30);
    expect(destinos.map((d) => d.v).sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12]);
  });

  it('la cuña abre filas hacia atrás y el vértice va al frente', () => {
    const oc = limpia();
    const destinos = destinosFormacion(oc, 'cuna', { u: 10, v: 10 }, { u: 30, v: 10 }, 5);
    expect(destinos).toHaveLength(5);
    // El primero es el vértice (en el destino); los demás se reparten delante/detrás en filas.
    expect(destinos[0]).toEqual({ u: 30, v: 10 });
    const minU = Math.min(...destinos.map((d) => d.u));
    expect(minU).toBeLessThan(30);
  });

  it('el cuadro es una rejilla casi cuadrada', () => {
    const oc = limpia();
    const destinos = destinosFormacion(oc, 'cuadro', { u: 10, v: 10 }, { u: 30, v: 10 }, 9);
    expect(destinos).toHaveLength(9);
    const us = new Set(destinos.map((d) => d.u));
    const vs = new Set(destinos.map((d) => d.v));
    expect(us.size).toBe(3);
    expect(vs.size).toBe(3);
  });

  it('ninguna formación deja dos unidades en el mismo tile ni en una celda bloqueada', () => {
    const oc = limpia();
    // Rodeamos el destino con muros para forzar el ajuste a huecos libres.
    for (const [u, v] of [[31, 9], [31, 10], [31, 11], [29, 9], [29, 11]] as const) {
      colocarEstructura(oc, `m${u}_${v}`, { w: 1, d: 1 }, u, v);
    }
    for (const f of FORMACIONES) {
      for (const n of [1, 2, 3, 5, 8, 13, 21]) {
        const destinos = destinosFormacion(oc, f, { u: 10, v: 10 }, { u: 30, v: 10 }, n);
        expect(sinSolapes(destinos)).toBe(true);
        expect(todosPisables(oc, destinos)).toBe(true);
        expect(destinos.length).toBeLessThanOrEqual(n);
      }
    }
  });

  it('ajustarHueco esquiva un tile ocupado y devuelve null si no hay hueco en el radio', () => {
    const oc = limpia();
    colocarEstructura(oc, 'bloque', { w: 1, d: 1 }, 5, 5);
    const t = ajustarHueco(oc, 5, 5, new Set([6 * oc.tilesU + 5]));
    expect(t).not.toBeNull();
    expect(t).not.toEqual({ u: 5, v: 5 });
    // Con un radio diminuto y el centro y todo su anillo ocupados no hay hueco.
    for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) {
      colocarEstructura(oc, `m${du}_${dv}`, { w: 1, d: 1 }, 6 + du, 5 + dv);
    }
    expect(ajustarHueco(oc, 6, 5, new Set(), 1)).toBeNull();
  });

  it('una unidad cabe siempre: con n = 1 cualquier formación devuelve un destino pisable', () => {
    const oc = limpia();
    for (const f of FORMACIONES) {
      const d = destinosFormacion(oc, f, { u: 3, v: 3 }, { u: 10, v: 10 }, 1);
      expect(d).toHaveLength(1);
      expect(todosPisables(oc, d)).toBe(true);
    }
  });

  it('la separación se respeta entre huecos contiguos', () => {
    const oc = limpia();
    const d = destinosFormacion(oc, 'columna', { u: 0, v: 0 }, { u: 20, v: 0 }, 3);
    for (let i = 0; i + 1 < d.length; i++) {
      const dist = Math.hypot(d[i + 1].u - d[i].u, d[i + 1].v - d[i].v);
      expect(dist).toBeGreaterThanOrEqual(1);
    }
  });

  it('hueco() no devuelve NaN con n = 1 en ninguna formación', () => {
    const m = marcoDe({ u: 0, v: 0 }, { u: 5, v: 5 });
    for (const f of FORMACIONES) {
      const h = hueco(f, 0, 1, m, CFG_FORMACION);
      expect(Number.isFinite(h.u)).toBe(true);
      expect(Number.isFinite(h.v)).toBe(true);
    }
  });
});
