// P3b1: máscara de caminos por subcelda y su pintor por distancia con signo (R85, D035, D039).
import { describe, expect, it } from 'vitest';
import { RAMPAS } from '../src/data/paleta';
import {
  borrar, contarMaterial, crearMascaraCaminos, limpiar, materialEn, ROCA, sdf, SIN_CAMINO, SUB, TIERRA, trazar,
  type MascaraCaminos, type MaterialCamino,
} from '../src/logic/caminosMascara';
import { pintarRegión, prepararSdf, type PintorCaminos } from '../src/logic/caminosPintor';



/** Recta horizontal por el centro de una máscara de `n` tiles, radio 0,5 tiles (1 tile de ancho). */
function recta(m: MascaraCaminos, material: MaterialCamino, v: number, u0: number, u1: number, radio: number): number {
  return trazar(m, material, [{ u: u0, v }, { u: u1, v }], radio);
}

/** Coloca la imagen de modo que el centro de una máscara de `n` tiles caiga en el centro de la región. */
function cfgCentrado(n: number, ancho: number, alto: number): PintorCaminos {
  const cx = ((n / 2) - (n / 2)) * (32 / 2);
  const cy = ((n / 2) + (n / 2)) * (16 / 2);
  return { origenX: cx - ancho / 2, origenY: cy - alto / 2, tileAncho: 32, tileAlto: 16, semilla: 7 };
}

describe('máscara de caminos (P3b1, R85)', () => {
  it('trazar marca las subceldas alrededor del trazado y contarMaterial las cuenta', () => {
    const m = crearMascaraCaminos(8, 8);
    const cambios = recta(m, TIERRA, 4, 1, 7, 0.5);
    expect(cambios).toBeGreaterThan(0);
    const { tierra, roca } = contarMaterial(m);
    expect(tierra).toBe(cambios);
    expect(roca).toBe(0);
    // Una subcelda en el eje del trazado es tierra; una lejana, no.
    expect(materialEn(m, Math.round(4 * SUB), Math.round(4 * SUB))).toBe(TIERRA);
    expect(materialEn(m, 0, 0)).toBe(SIN_CAMINO);
  });

  it('borrar devuelve a SIN_CAMINO solo las subceldas del trazado', () => {
    const m = crearMascaraCaminos(8, 8);
    recta(m, ROCA, 2, 0, 8, 0.5);
    recta(m, TIERRA, 6, 0, 8, 0.5);
    const antes = contarMaterial(m);
    borrar(m, [{ u: 0, v: 2 }, { u: 8, v: 2 }], 0.5);
    const despues = contarMaterial(m);
    expect(despues.roca).toBe(0);
    expect(despues.tierra).toBe(antes.tierra);   // la tierra no se toca
    expect(materialEn(m, Math.round(2 * SUB), Math.round(2 * SUB))).toBe(SIN_CAMINO);
  });

  it('cruzar dos caminos: en el cruce manda el material trazado después', () => {
    const m = crearMascaraCaminos(8, 8);
    recta(m, TIERRA, 4, 0, 8, 0.5);
    const cruce = Math.round(4 * SUB);
    expect(materialEn(m, cruce, cruce)).toBe(TIERRA);
    recta(m, ROCA, 4, 0, 8, 0.5);
    expect(materialEn(m, cruce, cruce)).toBe(ROCA);
    recta(m, TIERRA, 4, 4, 4, 0.5);   // un disco de tierra justo en el cruce
    expect(materialEn(m, cruce, cruce)).toBe(TIERRA);
  });

  it('limpiar vacía la máscara entera', () => {
    const m = crearMascaraCaminos(4, 4);
    recta(m, ROCA, 1, 0, 4, 0.5);
    expect(contarMaterial(m).roca).toBeGreaterThan(0);
    limpiar(m);
    expect(contarMaterial(m)).toEqual({ roca: 0, tierra: 0 });
  });

  it('el SDF es positivo dentro del material y negativo fuera', () => {
    const m = crearMascaraCaminos(8, 8);
    recta(m, ROCA, 4, 1, 7, 1);
    const d = sdf(m, ROCA);
    const centro = Math.round(4 * SUB) * m.subU + Math.round(4 * SUB);
    const esquina = 0;
    expect(d[centro]).toBeGreaterThan(0);
    expect(d[esquina]).toBeLessThan(0);
  });
});

describe('pintor de caminos (P3b1, D039)', () => {
  const ancho = 160;
  const alto = 120;
  const CFG16 = cfgCentrado(16, ancho, alto);

  it('estampa índices de las rampas de tierra y roca, nunca fuera de la paleta de 59', () => {
    const m = crearMascaraCaminos(16, 16);
    recta(m, ROCA, 8, 2, 14, 1);
    recta(m, TIERRA, 11, 2, 14, 0.5);
    const datos = new Uint8Array(ancho * alto);
    const cambios = pintarRegión(datos, ancho, alto, { x: 0, y: 0, ancho, alto }, prepararSdf(m), CFG16);
    expect(cambios).toBeGreaterThan(0);
    const permitidos = new Set<number>([...RAMPAS.tierra, ...RAMPAS.roca, ...RAMPAS.hierba]);
    for (const idx of datos) if (idx !== 0) expect(permitidos.has(idx)).toBe(true);
  });

  it('la roca usa la rampa de roca y la tierra la de tierra (no se confunden)', () => {
    const m = crearMascaraCaminos(16, 16);
    // Solo tierra, en el centro de la imagen de modo que el trazado caiga dentro.
    recta(m, TIERRA, 8, 6, 10, 1);
    const datos = new Uint8Array(ancho * alto);
    pintarRegión(datos, ancho, alto, { x: 0, y: 0, ancho, alto }, prepararSdf(m), CFG16);
    const soloRoca = new Set(RAMPAS.roca);
    let hayTierra = false;
    let hayRoca = false;
    for (const idx of datos) {
      if (idx === 0) continue;
      if (soloRoca.has(idx)) hayRoca = true;
      if (RAMPAS.tierra.includes(idx)) hayTierra = true;
    }
    expect(hayTierra).toBe(true);
    expect(hayRoca).toBe(false);   // sin roca trazada, ningún píxel de la rampa roca
  });

  it('determinista: misma máscara y semilla dan exactamente los mismos índices', () => {
    const m = crearMascaraCaminos(16, 16);
    recta(m, ROCA, 8, 3, 13, 1);
    recta(m, TIERRA, 10, 3, 13, 0.5);
    const a = new Uint8Array(ancho * alto);
    const b = new Uint8Array(ancho * alto);
    pintarRegión(a, ancho, alto, { x: 0, y: 0, ancho, alto }, prepararSdf(m), CFG16);
    pintarRegión(b, ancho, alto, { x: 0, y: 0, ancho, alto }, prepararSdf(m), CFG16);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('bordes irregulares: la frontera de la roca no es una línea recta de píxeles', () => {
    const m = crearMascaraCaminos(16, 16);
    recta(m, ROCA, 8, 2, 14, 1);
    const datos = new Uint8Array(ancho * alto);
    pintarRegión(datos, ancho, alto, { x: 0, y: 0, ancho, alto }, prepararSdf(m), CFG16);
    const soloRoca = new Set(RAMPAS.roca);
    // Cuenta el primer píxel de roca de cada columna: un borde recto daría el mismo en todas.
    const bordes = new Set<number>();
    for (let i = 0; i < ancho; i++) {
      for (let j = 0; j < alto; j++) {
        if (soloRoca.has(datos[j * ancho + i])) { bordes.add(j); break; }
      }
    }
    expect(bordes.size).toBeGreaterThan(1);
  });

  it('rendimiento: pintar un trozo de 128×128 px tarda menos de 8 ms (D034)', () => {
    const m = crearMascaraCaminos(24, 24);
    recta(m, ROCA, 12, 2, 22, 1);
    recta(m, TIERRA, 16, 2, 22, 0.5);
    const datos = new Uint8Array(256 * 256);
    const sdfC = prepararSdf(m);
    const cfg = cfgCentrado(24, 256, 256);
    const t0 = performance.now();
    pintarRegión(datos, 256, 256, { x: 64, y: 128, ancho: 128, alto: 128 }, sdfC, cfg);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(8);
  });
});
