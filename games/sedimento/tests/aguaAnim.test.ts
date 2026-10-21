import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { AGUA_DULCE, AGUA_MAR } from '../src/logic/horneado';
import {
  campoOrilla, diferencias, faseDe, mapaAguaDe, N_FASES_AGUA, pintarAgua, tonoAgua,
} from '../src/logic/aguaAnim';
import { crearMundo, hornearMundo } from '../src/logic/mundo';

const mundo = crearMundo(tuning.mapa.semilla);
const img = hornearMundo(mundo);
const mapa = mapaAguaDe(img)!;

describe('agua animada: máscara y distancias (P2d, R65, R87)', () => {
  it('el horneado marca cada píxel de agua como mar o agua dulce', () => {
    expect(img.agua).toBeDefined();
    let mar = 0;
    let dulce = 0;
    for (const v of img.agua!) {
      if (v === AGUA_MAR) mar++;
      else if (v === AGUA_DULCE) dulce++;
    }
    expect(mar).toBeGreaterThan(1000);
    expect(dulce).toBeGreaterThan(100);
  });

  it('la marca de agua solo aparece donde el terreno es agua de la rampa de agua', () => {
    let mal = 0;
    for (let p = 0; p < img.datos.length; p++) {
      if (img.agua![p] !== 0 && img.datos[p] > 6) mal++;
    }
    expect(mal).toBe(0);
  });

  it('el campo de orilla es 0 en tierra y >0 en el agua', () => {
    let malTierra = 0;
    let aguaConOrilla = 0;
    for (let p = 0; p < img.datos.length; p++) {
      if (mapa.agua[p] === 0) { if (mapa.orilla[p] !== 0) malTierra++; } else if (mapa.orilla[p] > 0) aguaConOrilla++;
    }
    expect(malTierra).toBe(0);
    expect(aguaConOrilla).toBeGreaterThan(1000);
  });

  it('la distancia a la orilla crece hacia dentro del agua', () => {
    // Coge el píxel de agua más profundo y comprueba que está más lejos de tierra que uno de la costa.
    let profundo = -1;
    let profundoD = -1;
    for (let p = 0; p < mapa.orilla.length; p++) {
      if (mapa.agua[p] !== 0 && mapa.orilla[p] > profundoD) { profundoD = mapa.orilla[p]; profundo = p; }
    }
    expect(profundoD).toBeGreaterThan(4);
    expect(mapa.orilla[profundo]).toBe(profundoD);
  });
});

describe('agua animada: fotogramas (R65, R87, §13)', () => {
  it('hay 4 fotogramas y la fase va de 0 a 1 en bucle', () => {
    expect(N_FASES_AGUA).toBe(4);
    expect(faseDe(0)).toBe(0);
    expect(faseDe(4)).toBe(0);
    expect(faseDe(5)).toBeCloseTo(0.25, 5);
    expect(faseDe(-1)).toBeCloseTo(0.75, 5);
  });

  it('pintarAgua deja intactos los píxeles de tierra', () => {
    const destino = new Uint8Array(img.datos.length);
    pintarAgua(destino, img.datos, mapa, mundo.semilla, 0);
    let mal = 0;
    for (let p = 0; p < img.datos.length; p++) {
      if (mapa.agua[p] === 0 && destino[p] !== img.datos[p]) mal++;
    }
    expect(mal).toBe(0);
  });

  it('los píxeles de agua siempre quedan dentro de la rampa de agua', () => {
    const destino = new Uint8Array(img.datos.length);
    let mal = 0;
    for (let f = 0; f < N_FASES_AGUA; f++) {
      pintarAgua(destino, img.datos, mapa, mundo.semilla, f);
      for (let p = 0; p < img.datos.length; p++) {
        if (mapa.agua[p] !== 0 && destino[p] > 6) mal++;
      }
    }
    expect(mal).toBe(0);
  });

  it('los fotogramas se diferencian entre sí: el agua se mueve de verdad', () => {
    const a = new Uint8Array(img.datos.length);
    const b = new Uint8Array(img.datos.length);
    pintarAgua(a, img.datos, mapa, mundo.semilla, 0);
    pintarAgua(b, img.datos, mapa, mundo.semilla, 1);
    const d = diferencias(a, b, mapa);
    expect(d).toBeGreaterThan(2000);
  });

  it('el bucle cierra: el fotograma 4 es idéntico al 0', () => {
    const a = new Uint8Array(img.datos.length);
    const b = new Uint8Array(img.datos.length);
    pintarAgua(a, img.datos, mapa, mundo.semilla, 0);
    pintarAgua(b, img.datos, mapa, mundo.semilla, N_FASES_AGUA);
    expect(diferencias(a, b, mapa)).toBe(0);
  });

  it('es determinista: dos pasadas del mismo fotograma coinciden píxel a píxel', () => {
    const a = new Uint8Array(img.datos.length);
    const b = new Uint8Array(img.datos.length);
    pintarAgua(a, img.datos, mapa, mundo.semilla, 2);
    pintarAgua(b, img.datos, mapa, mundo.semilla, 2);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('el agua dulce y el mar se animan distinto (río con hebras, mar con olas)', () => {
    const dulce = new Uint8Array(img.datos.length);
    const mar = new Uint8Array(img.datos.length);
    pintarAgua(dulce, img.datos, mapa, mundo.semilla, 0);
    pintarAgua(mar, img.datos, mapa, mundo.semilla, 0);
    // Cuenta cambios respecto a la base en cada tipo de agua.
    let cambiosDulce = 0;
    let cambiosMar = 0;
    for (let p = 0; p < img.datos.length; p++) {
      if (mapa.agua[p] === AGUA_DULCE && dulce[p] !== img.datos[p]) cambiosDulce++;
      if (mapa.agua[p] === AGUA_MAR && mar[p] !== img.datos[p]) cambiosMar++;
    }
    expect(cambiosDulce).toBeGreaterThan(0);
    expect(cambiosMar).toBeGreaterThan(0);
  });

  it('la espuma marca la orilla: hay píxeles claros pegados a la costa', () => {
    const destino = new Uint8Array(img.datos.length);
    pintarAgua(destino, img.datos, mapa, mundo.semilla, 0);
    let espuma = 0;
    for (let p = 0; p < img.datos.length; p++) {
      if (mapa.agua[p] !== 0 && mapa.orilla[p] > 0 && mapa.orilla[p] <= 3 && destino[p] === 6) espuma++;
    }
    expect(espuma).toBeGreaterThan(50);
  });

  it('fuera de la imagen o en tierra no hay tono de agua', () => {
    expect(tonoAgua(img.datos, mapa, mundo.semilla, 0, -1, 0)).toBe(-1);
    expect(tonoAgua(img.datos, mapa, mundo.semilla, 0, 0, -1)).toBe(-1);
    expect(tonoAgua(img.datos, mapa, mundo.semilla, 0, mapa.ancho, 0)).toBe(-1);
    // Un píxel de tierra cualquiera.
    for (let p = 0; p < mapa.agua.length; p++) {
      if (mapa.agua[p] === 0) {
        const x = p % mapa.ancho;
        const y = (p - x) / mapa.ancho;
        expect(tonoAgua(img.datos, mapa, mundo.semilla, 0, x, y)).toBe(-1);
        break;
      }
    }
  });
});

describe('agua animada: campoOrilla por BFS', () => {
  it('con una sola isla de tierra, la distancia es la de Manhattan al bloque', () => {
    // Imagen 5x5: tierra en (2,2), agua en el resto.
    const ancho = 5;
    const alto = 5;
    const agua = new Uint8Array(ancho * alto).fill(1);
    agua[2 * ancho + 2] = 0;
    const d = campoOrilla(agua, ancho, alto);
    expect(d[2 * ancho + 2]).toBe(0);
    expect(d[2 * ancho + 1]).toBe(1);
    expect(d[1 * ancho + 2]).toBe(1);
    expect(d[1 * ancho + 1]).toBe(2);
    expect(d[0]).toBe(4);
  });

  it('sin tierra no hay orilla: el agua queda marcada como inalcanzable (255)', () => {
    const agua = new Uint8Array(9).fill(1);
    const d = campoOrilla(agua, 3, 3);
    for (const v of d) expect(v).toBe(255);
  });

  it('una imagen vacía no revienta', () => {
    expect(campoOrilla(new Uint8Array(0), 0, 0).length).toBe(0);
  });
});
