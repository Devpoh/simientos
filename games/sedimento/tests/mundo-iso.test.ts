import { describe, expect, it } from 'vitest';
import { aPantalla, aRejilla, centroHuella, claveOrden, claveOrdenEstructura } from '../src/logic/iso';
import { escalaEntera, escalaFisica, pantallaCompleta, zoomCss } from '../src/logic/pantalla';
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

describe('escalado con el zoom de pantalla de Windows (devicePixelRatio)', () => {
  const base = { ancho: 960, alto: 540 };
  it('sin zoom de pantalla coincide con el escalado entero normal', () => {
    expect(zoomCss({ ancho: 1920, alto: 1080 }, 1, base)).toBe(2);
  });
  it('al 125 % (1536×864 CSS = 1920×1080 físicos) el zoom CSS es 1,6 y equivale a ×2 físico', () => {
    const z = zoomCss({ ancho: 1536, alto: 864 }, 1.25, base);
    expect(z).toBeCloseTo(1.6, 9);
    expect(escalaFisica(z, 1.25)).toBe(2);
  });
  it('al 150 % el píxel del arte ocupa siempre un número entero de píxeles físicos', () => {
    for (const [w, h] of [[1280, 720], [1100, 700], [1707, 960], [800, 400]]) {
      const z = zoomCss({ ancho: w, alto: h }, 1.5, base);
      const fisico = z * 1.5;
      expect(Number.isInteger(Math.round(fisico * 1e6) / 1e6), `${w}×${h}`).toBe(true);
      expect(fisico).toBeGreaterThanOrEqual(1);
    }
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

describe('pantalla completa con píxel entero (R83)', () => {
  it('1920×969 → k 2 y lienzo de 960×485', () => {
    expect(pantallaCompleta({ ancho: 1920, alto: 969 }, 1, 540)).toEqual({ k: 2, ancho: 960, alto: 485, zoom: 2 });
  });

  it('3840×2160 → k 4 y lienzo de 960×540', () => {
    const p = pantallaCompleta({ ancho: 3840, alto: 2160 }, 1, 540);
    expect([p.k, p.ancho, p.alto]).toEqual([4, 960, 540]);
  });

  it('1366×768 → k 1 y lienzo del tamaño de la ventana', () => {
    const p = pantallaCompleta({ ancho: 1366, alto: 768 }, 1, 540);
    expect([p.k, p.ancho, p.alto, p.zoom]).toEqual([1, 1366, 768, 1]);
  });

  it('con dpr 1,25 se calcula sobre píxeles físicos y el zoom CSS es k/dpr', () => {
    // 1536×730 CSS = 1920×913 físicos (redondeado)
    const p = pantallaCompleta({ ancho: 1536, alto: 730 }, 1.25, 540);
    expect([p.k, p.ancho, p.alto]).toEqual([2, 960, 457]);
    expect(p.zoom).toBeCloseTo(1.6, 9);
    expect(escalaFisica(p.zoom, 1.25)).toBe(2);
  });

  it('el lienzo siempre cubre la ventana: sobra menos de k píxeles físicos', () => {
    for (const [w, h, d] of [[1280, 720, 1], [1707, 960, 1.5], [2560, 1297, 1], [800, 600, 1], [3000, 1100, 2]]) {
      const p = pantallaCompleta({ ancho: w, alto: h }, d, 540);
      const fisicoAncho = Math.round(w * d);
      const fisicoAlto = Math.round(h * d);
      expect(p.ancho * p.k).toBeGreaterThanOrEqual(fisicoAncho);
      expect(p.ancho * p.k - fisicoAncho).toBeLessThan(p.k);
      expect(p.alto * p.k).toBeGreaterThanOrEqual(fisicoAlto);
      expect(p.alto * p.k - fisicoAlto).toBeLessThan(p.k);
    }
  });
});

describe('medidor de fotogramas: criterio D034', () => {
  it('cuenta los fotogramas perdidos (más lentos que el umbral) y da el fps medio', () => {
    const m = new MedidorFotogramas(10, 25);
    for (const ms of [16, 17, 16, 30, 16, 40, 16, 16, 16, 16]) m.registrar(ms);
    expect(m.perdidos).toBe(2);
    expect(m.fpsMedio()).toBeCloseTo((1000 * 10) / 199, 6);
  });

  it('reiniciar vuelve a cero los contadores', () => {
    const m = new MedidorFotogramas(10, 25);
    m.registrar(50);
    m.reiniciar();
    expect([m.perdidos, m.fpsMedio(), m.maxTotal()]).toEqual([0, 0, 0]);
  });
});
