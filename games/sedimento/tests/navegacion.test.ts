import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { crearMundo, type Mundo } from '../src/logic/mundo';
import {
  BLOQUEADA, colocarEstructura, colocarObjeto, crearOcupacion, crearOcupacionVacia, marcarCamino, SUBCELDAS,
} from '../src/logic/ocupacion';
import {
  buscarRuta, costeEntrar, longitudRuta, puntoEnRuta, suavizarRuta, transitable, type Tile,
} from '../src/logic/navegacion';

const mundo: Mundo = crearMundo(tuning.mapa.semilla);
const huella = (w: number, d: number): { w: number; d: number } => ({ w, d });

/** Rejilla vacía sin terreno: todo pisable. Así los tests no dependen del mundo generado. */
function rejillaLimpia(columnas: number, filas: number) {
  return crearOcupacionVacia(columnas, filas);
}

/** Muro vertical de `alto` tiles en la columna `u` desde la fila `v0`. */
function muro(oc: ReturnType<typeof crearOcupacionVacia>, u: number, v0: number, alto: number): void {
  for (let v = v0; v < v0 + alto; v++) colocarObjeto(oc, huella(1, 1), u, v);
}

describe('navegación sobre la rejilla de ocupación (P4, R50.4)', () => {
  it('una ruta corta en línea recta es la más corta posible', () => {
    const oc = rejillaLimpia(20, 20);
    const ruta = buscarRuta(oc, { u: 2, v: 2 }, { u: 8, v: 2 });
    expect(ruta).not.toBeNull();
    expect(ruta![0]).toEqual({ u: 2, v: 2 });
    expect(ruta![ruta!.length - 1]).toEqual({ u: 8, v: 2 });
    expect(longitudRuta(ruta!)).toBeCloseTo(6, 5);
  });

  it('rodea un muro en vez de atravesarlo', () => {
    const oc = rejillaLimpia(20, 20);
    muro(oc, 5, 0, 12);
    const ruta = buscarRuta(oc, { u: 2, v: 6 }, { u: 9, v: 6 });
    expect(ruta).not.toBeNull();
    // Ningún punto de la ruta pisa el muro.
    for (const t of ruta!) expect(transitable(oc, t.u, t.v)).toBe(true);
    // Y de verdad rodea: la ruta es más larga que la distancia recta (7).
    expect(longitudRuta(ruta!)).toBeGreaterThan(7);
  });

  it('devuelve null si el destino está bloqueado (la unidad queda en estado bloqueado)', () => {
    const oc = rejillaLimpia(20, 20);
    colocarEstructura(oc, 'muro', huella(1, 1), 10, 10);
    expect(buscarRuta(oc, { u: 2, v: 2 }, { u: 10, v: 10 })).toBeNull();
  });

  it('devuelve null si el origen está dentro de una estructura', () => {
    const oc = rejillaLimpia(20, 20);
    colocarEstructura(oc, 'casa', huella(3, 3), 5, 5);
    expect(buscarRuta(oc, { u: 6, v: 6 }, { u: 15, v: 15 })).toBeNull();
  });

  it('devuelve null cuando el muro encierra por completo al destino', () => {
    const oc = rejillaLimpia(20, 20);
    // Caja 5..7 × 5..7 con el destino en el centro (6, 6).
    for (let u = 5; u <= 7; u++) for (let v = 5; v <= 7; v++) {
      if (u === 6 && v === 6) continue;
      colocarObjeto(oc, huella(1, 1), u, v);
    }
    expect(buscarRuta(oc, { u: 0, v: 0 }, { u: 6, v: 6 })).toBeNull();
  });

  it('prefiere el camino: cuesta menos que la tierra', () => {
    const oc = rejillaLimpia(30, 10);
    // Camino recto de (5,5) a (25,5) pintado en todas las subceldas del tile.
    for (let u = 5; u <= 25; u++) {
      for (let su = 0; su < SUBCELDAS; su++) {
        for (let sv = 0; sv < SUBCELDAS; sv++) marcarCamino(oc, u * SUBCELDAS + su, 5 * SUBCELDAS + sv);
      }
    }
    const ruta = buscarRuta(oc, { u: 5, v: 5 }, { u: 25, v: 5 });
    expect(ruta).not.toBeNull();
    expect(longitudRuta(ruta!)).toBeCloseTo(20, 5);
    const coste = ruta!.slice(1).reduce((a, t) => a + costeEntrar(oc, t.u, t.v), 0);
    // 20 pasos de camino a 0,6 = 12; con coste base habría sido 20.
    expect(coste).toBeCloseTo(20 * tuning.navegacion.costeCamino, 5);
  });

  it('no corta esquinas en diagonal (dos unidades no se cruzan en un cruce)', () => {
    const oc = rejillaLimpia(20, 20);
    // En el cruce (5,5)->(6,6) se bloquean los dos ortogonales: (6,5) y (5,6).
    colocarObjeto(oc, huella(1, 1), 6, 5);
    colocarObjeto(oc, huella(1, 1), 5, 6);
    const ruta = buscarRuta(oc, { u: 5, v: 5 }, { u: 6, v: 6 });
    expect(ruta).not.toBeNull();
    // No puede ser [ (5,5), (6,6) ]: esa diagonal corta la esquina bloqueada.
    expect(ruta!.length).toBeGreaterThan(2);
    expect(ruta![ruta!.length - 1]).toEqual({ u: 6, v: 6 });
  });

  it('suavizarRuta deja solo los vértices y conserva los extremos', () => {
    const ruta: Tile[] = [
      { u: 0, v: 0 }, { u: 1, v: 0 }, { u: 2, v: 0 }, { u: 3, v: 0 },
      { u: 3, v: 1 }, { u: 3, v: 2 },
    ];
    const s = suavizarRuta(ruta);
    expect(s[0]).toEqual({ u: 0, v: 0 });
    expect(s[s.length - 1]).toEqual({ u: 3, v: 2 });
    expect(s).toEqual([{ u: 0, v: 0 }, { u: 3, v: 0 }, { u: 3, v: 2 }]);
  });

  it('puntoEnRuta interpola a lo largo de la polilínea', () => {
    const ruta: Tile[] = [{ u: 0, v: 0 }, { u: 10, v: 0 }];
    const p: Tile = { u: 0, v: 0 };
    puntoEnRuta(ruta, 2.5, p);
    expect(p.u).toBeCloseTo(2.5, 6);
    expect(p.v).toBeCloseTo(0, 6);
    puntoEnRuta(ruta, 999, p);
    expect(p.u).toBeCloseTo(10, 6);
  });

  it('la ruta es determinista: los mismos datos dan la misma ruta', () => {
    const oc = rejillaLimpia(30, 30);
    for (let k = 0; k < 40; k++) colocarObjeto(oc, huella(2, 2), (k * 3) % 25, (k * 7) % 25);
    const a = buscarRuta(oc, { u: 1, v: 1 }, { u: 28, v: 28 });
    const b = buscarRuta(oc, { u: 1, v: 1 }, { u: 28, v: 28 });
    expect(a).toEqual(b);
  });
});

describe('navegación sobre el mundo real (P4, R50.4)', () => {
  const oc = crearOcupacion(mundo.superficie, mundo.tilesU, mundo.tilesV);
  // La aldea de referencia no se registra aquí (la rejilla queda solo con el terreno), así que
  // se comprueba que A* funciona sobre el agua y las pendientes del mundo generado.
  it('encuentra ruta entre dos puntos pisables del mundo', () => {
    const libres: Tile[] = [];
    for (let v = 1; v < mundo.tilesV - 1 && libres.length < 2; v++) {
      for (let u = 1; u < mundo.tilesU - 1 && libres.length < 2; u++) {
        if (transitable(oc, u, v)) libres.push({ u, v });
      }
    }
    expect(libres.length).toBe(2);
    const ruta = buscarRuta(oc, libres[0], libres[1]);
    expect(ruta).not.toBeNull();
    for (const t of ruta!) expect(transitable(oc, t.u, t.v)).toBe(true);
  });

  it('el agua del mundo no es transitable (un tile solo se pisa si tiene alguna subcelda seca)', () => {
    let tilesTodoAgua = 0;
    const n = SUBCELDAS * SUBCELDAS;
    for (let v = 0; v < mundo.tilesV; v++) {
      for (let u = 0; u < mundo.tilesU; u++) {
        let agua = 0;
        for (let sv = 0; sv < SUBCELDAS; sv++) {
          for (let su = 0; su < SUBCELDAS; su++) {
            const k = (v * SUBCELDAS + sv) * oc.subU + (u * SUBCELDAS + su);
            if (oc.capas.terreno[k] === BLOQUEADA) agua++;
          }
        }
        if (agua === n) {
          tilesTodoAgua++;
          expect(transitable(oc, u, v)).toBe(false);
        }
      }
    }
    expect(tilesTodoAgua).toBeGreaterThan(0);
  });
});

describe('propiedad: 200 ciudadanos × 10 000 ticks sin pisar una celda bloqueada (§4.6a)', () => {
  it('ninguna unidad acaba nunca sobre una celda bloqueada', () => {
    // Mundo pequeño y con obstáculos para que el test sea rápido pero real.
    const oc = crearOcupacionVacia(48, 48);
    // Muros y casas repartidos: si el A* fuese mal, alguna unidad acabaría dentro.
    for (let k = 0; k < 30; k++) {
      const u = 4 + ((k * 11) % 38);
      const v = 4 + ((k * 7) % 38);
      colocarEstructura(oc, `casa${k}`, huella(2, 2), u, v);
    }
    for (let k = 0; k < 60; k++) {
      const u = 1 + ((k * 13) % 46);
      const v = 1 + ((k * 5) % 46);
      colocarObjeto(oc, huella(1, 1), u, v);
    }

    const N = 200;
    const TICKS = 10_000;
    // Origen libre garantizado: el primero que se pueda pisar cerca del centro.
    let origen: Tile = { u: 24, v: 24 };
    for (let v = 0; v < 48; v++) {
      for (let u = 0; u < 48; u++) {
        if (transitable(oc, u, v)) { origen = { u, v }; break; }
      }
      if (transitable(oc, origen.u, origen.v)) break;
    }
    expect(transitable(oc, origen.u, origen.v)).toBe(true);

    const destinos: Tile[] = [];
    for (let k = 0; k < N; k++) {
      for (let intento = 0; intento < 200; intento++) {
        const u = (k * 17 + intento * 29) % 48;
        const v = (k * 23 + intento * 31) % 48;
        if (transitable(oc, u, v)) { destinos.push({ u, v }); break; }
      }
    }
    expect(destinos.length).toBe(N);

    // Cada unidad tiene su ruta calculada de una vez; el bucle solo la recorre y comprueba.
    const rutas = destinos.map((d) => buscarRuta(oc, origen, d));
    const rutasValidas = rutas.filter((r): r is Tile[] => r !== null);
    expect(rutasValidas.length).toBeGreaterThan(N / 2);

    let violaciones = 0;
    for (const ruta of rutasValidas) {
      const largo = longitudRuta(ruta);
      const p: Tile = { u: 0, v: 0 };
      for (let t = 0; t < TICKS; t++) {
        // La unidad avanza 0,01 tiles por tick: recorre la ruta muchas veces.
        const s = ((t * 0.01) % largo);
        puntoEnRuta(ruta, s, p);
        const tu = Math.round(p.u);
        const tv = Math.round(p.v);
        if (tu < 0 || tv < 0 || tu >= oc.tilesU || tv >= oc.tilesV) { violaciones++; continue; }
        if (!transitable(oc, tu, tv)) violaciones++;
      }
    }
    expect(violaciones).toBe(0);
  });
});
