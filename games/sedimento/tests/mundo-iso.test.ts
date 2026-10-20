import { describe, expect, it } from 'vitest';
import { aPantalla, aRejilla, centroHuella, claveOrden, claveOrdenEstructura } from '../src/logic/iso';
import { escalaEntera } from '../src/logic/pantalla';
import { MedidorFotogramas } from '../src/logic/rendimiento';

describe('isometría 2:1 (tile 32×16)', () => {
  it('un tile en u baja a la derecha y uno en v baja a la izquierda', () => {
    expect(aPantalla(1, 0)).toEqual({ x: 16, y: 8 });
    expect(aPantalla(0, 1)).toEqual({ x: -16, y: 8 });
    expect(aPantalla(1, 1)).toEqual({ x: 0, y: 16 });
  });

  it('aRejilla es la inversa exacta de aPantalla', () => {
    for (const [u, v] of [[0, 0], [3.5, 7.25], [64, 64], [12.1, 0.3]]) {
      const p = aPantalla(u, v);
      const r = aRejilla(p.x, p.y);
      expect(r.u).toBeCloseTo(u, 9);
      expect(r.v).toBeCloseTo(v, 9);
    }
  });

  it('el orden de dibujo es u+v: lo más cercano a la cámara se dibuja después', () => {
    expect(claveOrden(5, 5)).toBeLessThan(claveOrden(5, 6));
    expect(claveOrden(2, 9)).toBe(claveOrden(9, 2));
  });

  it('una estructura se ordena por su vértice frontal; una persona delante de ella queda por encima', () => {
    const casa = { w: 2, d: 2 };
    const clave = claveOrdenEstructura(10, 10, casa);
    expect(clave).toBe(24);
    expect(claveOrden(12.5, 12.5)).toBeGreaterThan(clave);
    expect(claveOrden(9, 9)).toBeLessThan(clave);
  });

  it('el centro de la huella es la esquina trasera más media huella', () => {
    expect(centroHuella(10, 20, { w: 5, d: 3 })).toEqual({ u: 12.5, v: 21.5 });
  });
});

describe('escalado entero del lienzo', () => {
  const base = { ancho: 960, alto: 540 };
  it('1080p da ×2 y 4K da ×4', () => {
    expect(escalaEntera({ ancho: 1920, alto: 1080 }, base)).toBe(2);
    expect(escalaEntera({ ancho: 3840, alto: 2160 }, base)).toBe(4);
  });
  it('una ventana de 1900×1000 no llega a ×2 en alto y se queda en ×1', () => {
    expect(escalaEntera({ ancho: 1900, alto: 1000 }, base)).toBe(1);
  });
  it('limita por el lado más justo y nunca baja de ×1', () => {
    expect(escalaEntera({ ancho: 2880, alto: 1100 }, base)).toBe(2);
    expect(escalaEntera({ ancho: 400, alto: 300 }, base)).toBe(1);
  });
});

describe('medidor de fotogramas', () => {
  it('sin datos devuelve ceros', () => {
    const m = new MedidorFotogramas(10);
    expect([m.p95(), m.max(), m.fps()]).toEqual([0, 0, 0]);
  });

  it('a 16,67 ms por fotograma da 60 fps y p95 de 16,67', () => {
    const m = new MedidorFotogramas(100);
    for (let i = 0; i < 100; i++) m.registrar(1000 / 60);
    expect(m.fps()).toBeCloseTo(60, 3);
    expect(m.p95()).toBeCloseTo(1000 / 60, 3);
    expect(m.max()).toBeCloseTo(1000 / 60, 3);
  });

  it('un pico aislado entra en el máximo pero no en el p95', () => {
    const m = new MedidorFotogramas(100);
    for (let i = 0; i < 99; i++) m.registrar(16);
    m.registrar(80);
    expect(m.max()).toBe(80);
    expect(m.p95()).toBe(16);
  });

  it('el anillo olvida lo antiguo, pero el máximo histórico no', () => {
    const m = new MedidorFotogramas(5);
    m.registrar(90);
    for (let i = 0; i < 5; i++) m.registrar(10);
    expect(m.max()).toBe(10);
    expect(m.maxTotal()).toBe(90);
    expect(m.fotogramas).toBe(6);
  });

  it('reiniciar vacía la ventana y los máximos', () => {
    const m = new MedidorFotogramas(5);
    m.registrar(50);
    m.reiniciar();
    expect([m.max(), m.maxTotal(), m.fotogramas]).toEqual([0, 0, 0]);
  });
});
