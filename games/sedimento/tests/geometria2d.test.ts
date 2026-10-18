import { describe, expect, it } from 'vitest';
import {
  distanciaPuntoPolilinea,
  distanciaPuntoRect,
  distanciaPuntoSegmento,
  esquinasRect,
  longitudPolilinea,
  muestrasRect,
  puntoEnRect,
  rectTocaPolilinea,
  rectsSolapan,
  suavizarPolilinea,
} from '../src/logic/geometria2d';
import type { Punto, Rect } from '../src/logic/geometria2d';

describe('geometria2d', () => {
  it('esquinasRect sin giro da la caja axis-aligned esperada', () => {
    const r: Rect = { cx: 1, cz: 2, ancho: 4, fondo: 2, giro: 0 };
    const es = esquinasRect(r);
    expect(es).toEqual([
      { x: -1, z: 1 },
      { x: 3, z: 1 },
      { x: 3, z: 3 },
      { x: -1, z: 3 },
    ]);
  });

  it('dos rects girados 45° que sí se solapan', () => {
    const a: Rect = { cx: 0, cz: 0, ancho: 4, fondo: 4, giro: Math.PI / 4 };
    const b: Rect = { cx: 3, cz: 0, ancho: 4, fondo: 4, giro: Math.PI / 4 };
    expect(rectsSolapan(a, b)).toBe(true);
  });

  it('dos rects girados 45° cuyas cajas alineadas se solapan pero ellos no', () => {
    // Cuadrado de lado s girado 45° = rombo (bola L1) de radio s/√2. Centros en diagonal
    // separados (2,2): distancia L1 entre centros = 4, mayor que 2·radio ≈ 2,83 → no se tocan,
    // aunque sus AABB (semieje ≈1,41 cada uno) sí se solapan en ambos ejes.
    const a: Rect = { cx: 0, cz: 0, ancho: 2, fondo: 2, giro: Math.PI / 4 };
    const b: Rect = { cx: 2, cz: 2, ancho: 2, fondo: 2, giro: Math.PI / 4 };
    expect(rectsSolapan(a, b)).toBe(false);
  });

  it('el margen hace que dos rects separados se consideren solapados', () => {
    const a: Rect = { cx: 0, cz: 0, ancho: 2, fondo: 2, giro: 0 };
    const b: Rect = { cx: 2.5, cz: 0, ancho: 2, fondo: 2, giro: 0 };
    expect(rectsSolapan(a, b)).toBe(false);
    expect(rectsSolapan(a, b, 0.3)).toBe(true);
  });

  it('un punto exactamente en una esquina cuenta como dentro', () => {
    const r: Rect = { cx: 0, cz: 0, ancho: 2, fondo: 2, giro: 0 };
    expect(puntoEnRect({ x: 1, z: 1 }, r)).toBe(true);
    expect(puntoEnRect({ x: 1.01, z: 1 }, r)).toBe(false);
  });

  it('distanciaPuntoSegmento se recorta a los extremos fuera del tramo', () => {
    const a: Punto = { x: 0, z: 0 };
    const b: Punto = { x: 10, z: 0 };
    const masAlla = distanciaPuntoSegmento({ x: 15, z: 0 }, a, b);
    expect(masAlla.t).toBe(1);
    expect(masAlla.dist).toBe(5);
    expect(masAlla.punto).toEqual({ x: 10, z: 0 });

    const antes = distanciaPuntoSegmento({ x: -5, z: 0 }, a, b);
    expect(antes.t).toBe(0);
    expect(antes.dist).toBe(5);
    expect(antes.punto).toEqual({ x: 0, z: 0 });
  });

  it('distanciaPuntoPolilinea en una polilínea en L da el tramo y la tangente correctos', () => {
    const puntos: Punto[] = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
    ];
    const r = distanciaPuntoPolilinea({ x: 12, z: 5 }, puntos);
    expect(r.tramo).toBe(1);
    expect(r.dist).toBeCloseTo(2, 10);
    expect(r.direccion).toEqual({ x: 0, z: 1 });
  });

  it('distanciaPuntoRect es 0 dentro y la distancia al borde más cercano fuera', () => {
    const r: Rect = { cx: 0, cz: 0, ancho: 2, fondo: 2, giro: 0 };
    expect(distanciaPuntoRect({ x: 0, z: 0 }, r)).toBe(0);
    expect(distanciaPuntoRect({ x: 3, z: 0 }, r)).toBeCloseTo(2, 10);
  });

  it('un rect que cruza la carretera la toca', () => {
    const puntos: Punto[] = [
      { x: 0, z: 0 },
      { x: 20, z: 0 },
    ];
    const r: Rect = { cx: 10, cz: 0, ancho: 4, fondo: 4, giro: 0 };
    expect(rectTocaPolilinea(r, puntos, 1)).toBe(true);
  });

  it('un rect paralelo a la carretera más lejos que anchoMedio no la toca', () => {
    const puntos: Punto[] = [
      { x: 0, z: 0 },
      { x: 20, z: 0 },
    ];
    const r: Rect = { cx: 10, cz: 5, ancho: 2, fondo: 2, giro: 0 };
    expect(rectTocaPolilinea(r, puntos, 1)).toBe(false);
  });

  it('suavizarPolilinea con menos de 3 puntos devuelve una copia', () => {
    const puntos: Punto[] = [{ x: 0, z: 0 }, { x: 5, z: 5 }];
    const suave = suavizarPolilinea(puntos, 8);
    expect(suave).toEqual(puntos);
    expect(suave).not.toBe(puntos);
  });

  it('suavizarPolilinea pasa por todos los puntos originales, sin NaN', () => {
    const puntos: Punto[] = [
      { x: 0, z: 0 },
      { x: 5, z: 2 },
      { x: 10, z: 0 },
      { x: 15, z: -2 },
    ];
    const pasos = 8;
    const suave = suavizarPolilinea(puntos, pasos);
    expect(suave[0].x).toBeCloseTo(puntos[0].x, 6);
    expect(suave[0].z).toBeCloseTo(puntos[0].z, 6);
    expect(suave[pasos].x).toBeCloseTo(puntos[1].x, 6);
    expect(suave[pasos].z).toBeCloseTo(puntos[1].z, 6);
    expect(suave[2 * pasos].x).toBeCloseTo(puntos[2].x, 6);
    expect(suave[2 * pasos].z).toBeCloseTo(puntos[2].z, 6);
    const ultimo = suave[suave.length - 1];
    expect(ultimo.x).toBeCloseTo(puntos[3].x, 6);
    expect(ultimo.z).toBeCloseTo(puntos[3].z, 6);
    for (const p of suave) {
      expect(Number.isNaN(p.x)).toBe(false);
      expect(Number.isNaN(p.z)).toBe(false);
    }
  });

  it('longitudPolilinea suma las distancias de cada tramo', () => {
    const puntos: Punto[] = [
      { x: 0, z: 0 },
      { x: 3, z: 4 },
      { x: 3, z: 0 },
    ];
    expect(longitudPolilinea(puntos)).toBe(9);
  });

  it('muestrasRect con giro cae siempre dentro del rect y cubre los bordes', () => {
    const r: Rect = { cx: 5, cz: -3, ancho: 2, fondo: 2, giro: Math.PI / 4 };
    const muestras = muestrasRect(r, 0.5);
    expect(muestras.length).toBeGreaterThan(1);
    for (const p of muestras) {
      expect(puntoEnRect(p, r, 1e-6)).toBe(true);
    }
    const esquina = esquinasRect(r)[0];
    const hayEsquina = muestras.some((p) => Math.abs(p.x - esquina.x) < 1e-9 && Math.abs(p.z - esquina.z) < 1e-9);
    expect(hayEsquina).toBe(true);
  });
});
