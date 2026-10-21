import { describe, expect, it } from 'vitest';
import { claveOrden, claveOrdenEstructura } from '../src/logic/iso';
import {
  compararUnidadHuella, DELANTE, DETRAS, INDIFERENTE, huellasDe, IndiceHuellas, profundidadUnidad, type HuellaColocada,
} from '../src/logic/orden';

const casa2x2: HuellaColocada = { u: 10, v: 10, w: 2, d: 2 };

describe('orden de dibujo con una sola regla (D017, §4.5)', () => {
  it('una persona pegada a la cara derecha se dibuja delante (el caso (12,5; 11) de D017)', () => {
    expect(compararUnidadHuella(12.5, 11, casa2x2)).toBe(DELANTE);
    const casa = claveOrdenEstructura(10, 10, casa2x2);
    expect(profundidadUnidad(12.5, 11, [casa2x2])).toBeGreaterThan(casa);
  });

  it('una persona pegada a la cara frontal se dibuja delante', () => {
    expect(compararUnidadHuella(11, 12.5, casa2x2)).toBe(DELANTE);
  });

  it('una persona pegada a la cara trasera se dibuja detrás, aunque su u+v sea mayor que el de la casa', () => {
    // (10,5; 9,5) tiene u+v = 20 y la casa 24: sin la regla de huellas quedaría delante por error.
    expect(compararUnidadHuella(10.5, 9.5, casa2x2)).toBe(DETRAS);
    expect(profundidadUnidad(10.5, 9.5, [casa2x2])).toBeLessThan(claveOrdenEstructura(10, 10, casa2x2));
  });

  it('una persona lejos de la huella conserva la clave u+v', () => {
    // `compararUnidadHuella` es geométrico puro: lejos también diría DELANTE. El margen lo aplica `profundidadUnidad`.
    expect(profundidadUnidad(30, 30, [casa2x2])).toBe(claveOrden(30, 30));
    expect(profundidadUnidad(0, 0, [casa2x2])).toBe(claveOrden(0, 0));
  });

  it('en la esquina delantera gana DELANTE (la cara frontal manda)', () => {
    expect(compararUnidadHuella(12, 12, casa2x2)).toBe(DELANTE);
  });

  it('entre dos casas con un tile de calle en medio, el hueco manda sobre las dos', () => {
    const norte: HuellaColocada = { u: 10, v: 8, w: 2, d: 2 };
    const sur: HuellaColocada = { u: 10, v: 11, w: 2, d: 2 };
    // (11; 10) está en la calle entre las dos: delante de la del norte y detrás de la del sur.
    const p = profundidadUnidad(11, 10, [norte, sur]);
    expect(p).toBeGreaterThan(claveOrdenEstructura(10, 8, norte));
    expect(p).toBeLessThan(claveOrdenEstructura(10, 11, sur));
  });

  it('`compararUnidadHuella` solo mira las caras: dentro de la huella no decide nada', () => {
    expect(compararUnidadHuella(11, 11, casa2x2)).toBe(INDIFERENTE);
    // Por debajo de vmin es DETRAS aunque esté lejos: el recorte espacial lo hace `profundidadUnidad`.
    expect(compararUnidadHuella(11, 9.5, casa2x2)).toBe(DETRAS);
  });

  it('el resultado no depende del orden en que se pasen las huellas', () => {
    const norte: HuellaColocada = { u: 10, v: 8, w: 2, d: 2 };
    const sur: HuellaColocada = { u: 10, v: 11, w: 2, d: 2 };
    expect(profundidadUnidad(11, 10, [norte, sur])).toBe(profundidadUnidad(11, 10, [sur, norte]));
  });

  it('es determinista: el mismo punto da siempre la misma profundidad', () => {
    const huellas = huellasDe([{ u: 10, v: 10, w: 2, d: 2 }, { u: 14, v: 9, w: 3, d: 2 }]);
    const a = profundidadUnidad(12.5, 11, huellas);
    const b = profundidadUnidad(12.5, 11, huellas);
    expect(a).toBe(b);
  });

  it('una unidad dentro de una huella no debería existir, pero no rompe el orden', () => {
    const p = profundidadUnidad(11, 11, [casa2x2]);
    expect(Number.isFinite(p)).toBe(true);
  });
});

describe('índice espacial de huellas (coste por fotograma)', () => {
  const huellas = huellasDe([
    { u: 10, v: 10, w: 2, d: 2 }, { u: 14, v: 9, w: 3, d: 2 }, { u: 4, v: 20, w: 2, d: 3 }, { u: 30, v: 30, w: 1, d: 1 },
  ]);

  it('da la misma profundidad que el barrido lineal', () => {
    const indice = new IndiceHuellas(huellas);
    for (let u = 0; u < 40; u += 0.5) {
      for (let v = 0; v < 40; v += 0.5) {
        expect(indice.profundidad(u, v)).toBe(profundidadUnidad(u, v, huellas));
      }
    }
  });

  it('no repite una huella que cae en dos celdas de la consulta', () => {
    const grande = huellasDe([{ u: 0, v: 0, w: 12, d: 12 }]);
    const indice = new IndiceHuellas(grande, 4);
    expect(indice.consultar(6, 6).length).toBe(1);
  });

  it('un punto lejos de todo conserva su clave u+v', () => {
    const indice = new IndiceHuellas(huellas);
    expect(indice.profundidad(25, 2)).toBe(claveOrden(25, 2));
  });
});
