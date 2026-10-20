import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { Rejilla } from '../src/logic/hex';
import { generarMapa } from '../src/logic/mapa';
import type { Mapa, Terreno } from '../src/logic/mapa';
import { buscarRuta, configMovimiento } from '../src/logic/rutas';

const cfg = configMovimiento(tuning.movimiento);

/** Mapa sintético: todo llanura salvo los índices que se indiquen en `terrenoPorIndice`. */
function mapaPrueba(columnas: number, filas: number, terrenoPorIndice: Record<number, Terreno> = {}): Mapa {
  const total = columnas * filas;
  const terreno: Terreno[] = new Array(total).fill('llanura');
  for (const [i, t] of Object.entries(terrenoPorIndice)) terreno[Number(i)] = t;
  return {
    semilla: 0,
    columnas,
    filas,
    terreno,
    nivel: new Array(total).fill(0),
    altura: new Array(total).fill(0),
    vegetacion: new Array(total).fill('ninguna'),
    bioma: new Array(total).fill('pradera'),
    temperatura: new Array(total).fill(15),
    precipitacion: new Array(total).fill(500),
    metros: new Array(total).fill(0),
    fertilidad: new Array(total).fill(0.5),
    salinidad: new Array(total).fill(0),
    distAgua: new Array(total).fill(0),
    recursos: new Array(total).fill(0),
    rios: [],
    costa: { perfil: [], rasgos: [] },
  };
}

function sonVecinos(rejilla: Rejilla, a: number, b: number): boolean {
  return rejilla.vecinos(a).includes(b);
}

describe('rutas', () => {
  it('en llano abierto la ruta tiene distancia+1 hexágonos y cada paso es entre vecinos', () => {
    const mapa = mapaPrueba(6, 6);
    const rejilla = new Rejilla(mapa.columnas, mapa.filas);
    const origen = rejilla.indice(0, 0);
    const destino = rejilla.indice(5, 5);
    const ruta = buscarRuta(mapa, origen, destino, cfg);
    expect(ruta).not.toBeNull();
    const r = ruta as number[];
    expect(r.length).toBe(rejilla.distancia(origen, destino) + 1);
    for (let i = 0; i < r.length - 1; i++) {
      expect(sonVecinos(rejilla, r[i], r[i + 1])).toBe(true);
    }
  });

  it('rodea un lago sin pisar lago ni mar', () => {
    const columnas = 6;
    const filas = 7;
    const rejilla = new Rejilla(columnas, filas);
    const lago: Record<number, Terreno> = {};
    for (let fila = 2; fila <= 4; fila++) {
      for (let col = 1; col <= 4; col++) {
        lago[rejilla.indice(col, fila)] = 'lago';
      }
    }
    const mapa = mapaPrueba(columnas, filas, lago);
    const origen = rejilla.indice(0, 0);
    const destino = rejilla.indice(0, 6);
    const ruta = buscarRuta(mapa, origen, destino, cfg);
    expect(ruta).not.toBeNull();
    for (const i of ruta as number[]) {
      expect(mapa.terreno[i]).not.toBe('lago');
      expect(mapa.terreno[i]).not.toBe('mar');
    }
  });

  it('prefiere un rodeo en llano antes que cruzar una montaña, cuando es más barato', () => {
    const columnas = 4;
    const filas = 3;
    const rejilla = new Rejilla(columnas, filas);
    const origen = rejilla.indice(0, 1);
    const destino = rejilla.indice(3, 1);
    const montana = rejilla.indice(1, 1);
    const mapa = mapaPrueba(columnas, filas, { [montana]: 'montana' });
    const ruta = buscarRuta(mapa, origen, destino, cfg);
    expect(ruta).not.toBeNull();
    expect((ruta as number[]).includes(montana)).toBe(false);
  });

  it('destino inalcanzable (rodeado de agua) o destino de agua devuelven null', () => {
    const columnas = 3;
    const filas = 3;
    const rejilla = new Rejilla(columnas, filas);
    const origen = rejilla.indice(0, 0);
    const centro = rejilla.indice(1, 1);
    const agua: Record<number, Terreno> = {};
    for (const v of rejilla.vecinos(centro)) agua[v] = 'mar';
    const mapaRodeado = mapaPrueba(columnas, filas, agua);
    expect(buscarRuta(mapaRodeado, origen, centro, cfg)).toBeNull();

    const mapaDestinoAgua = mapaPrueba(columnas, filas, { [centro]: 'mar' });
    expect(buscarRuta(mapaDestinoAgua, origen, centro, cfg)).toBeNull();
  });

  it('origen igual a destino devuelve [origen]', () => {
    const mapa = mapaPrueba(4, 4);
    expect(buscarRuta(mapa, 5, 5, cfg)).toEqual([5]);
  });

  it('es determinista: el mismo mapa y extremos dan siempre la misma ruta', () => {
    const mapa = mapaPrueba(8, 8);
    const rejilla = new Rejilla(mapa.columnas, mapa.filas);
    const origen = rejilla.indice(0, 0);
    const destino = rejilla.indice(7, 7);
    const ruta1 = buscarRuta(mapa, origen, destino, cfg);
    const ruta2 = buscarRuta(mapa, origen, destino, cfg);
    expect(ruta1).toEqual(ruta2);
  });

  it('en el mapa real hay ruta entre dos llanuras lejanas, paso a paso entre vecinos', () => {
    const mapa = generarMapa({ ...tuning.mapa, semilla: 42 }, tuning.clima);
    const rejilla = new Rejilla(mapa.columnas, mapa.filas);
    const llanuras = mapa.terreno.reduce<number[]>((acc, t, i) => {
      if (t === 'llanura') acc.push(i);
      return acc;
    }, []);
    expect(llanuras.length).toBeGreaterThan(1);
    let origen = llanuras[0];
    let destino = llanuras[0];
    let mejorDist = 0;
    for (const i of llanuras) {
      const d = rejilla.distancia(llanuras[0], i);
      if (d > mejorDist) {
        mejorDist = d;
        destino = i;
      }
    }
    for (const i of llanuras) {
      const d = rejilla.distancia(origen, destino);
      const d2 = rejilla.distancia(i, destino);
      if (d2 > d) origen = i;
    }
    const ruta = buscarRuta(mapa, origen, destino, cfg);
    expect(ruta).not.toBeNull();
    const r = ruta as number[];
    expect(r[0]).toBe(origen);
    expect(r[r.length - 1]).toBe(destino);
    for (let i = 0; i < r.length - 1; i++) {
      expect(sonVecinos(rejilla, r[i], r[i + 1])).toBe(true);
    }
  });

  it('200 búsquedas en el mapa real tardan menos de 1 s', () => {
    const mapa = generarMapa({ ...tuning.mapa, semilla: 42 }, tuning.clima);
    const transitables = mapa.terreno.reduce<number[]>((acc, t, i) => {
      if (cfg.costeTerreno[t] !== null) acc.push(i);
      return acc;
    }, []);
    const origen = transitables[0];
    const destino = transitables[transitables.length - 1];
    const inicio = performance.now();
    for (let i = 0; i < 200; i++) {
      buscarRuta(mapa, origen, destino, cfg);
    }
    const duracion = performance.now() - inicio;
    expect(duracion).toBeLessThan(1000);
  });
});
