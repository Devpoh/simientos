import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { claveOrdenEstructura } from '../src/logic/iso';
import { crearMundo, type Mundo } from '../src/logic/mundo';
import type { Superficie } from '../src/logic/horneado';
import {
  BLOQUEADA, CAMINO, LIBRE, PUERTA, SUBCELDAS, TERRENO_AGUA, TERRENO_PENDIENTE,
  bloqueada, calcularTerreno, colocarEstructura, colocarObjeto, colisionesViolaciones, crearOcupacion,
  derribarEn, estadoTile, huellaGirada, marcarCamino, nEstructuras,
  puedeColocar, puertaGirada, reservarDinamica, type Ocupacion,
} from '../src/logic/ocupacion';

// Superficies de juguete: controlan agua y pendiente sin depender del mundo procedural.
const llano: Superficie = { suelo: () => 0.2, agua: () => NaN };
const conAgua: Superficie = { suelo: (u) => (u < 4 ? -0.5 : 0.2), agua: (u) => (u < 4 ? 0 : NaN) };
const conAcantilado: Superficie = { suelo: (u) => (u < 4 ? 0.2 : 3.5), agua: () => NaN };

const chica = (sup: Superficie = llano): Ocupacion => crearOcupacion(sup, 12, 12);
const huella = (w: number, d: number) => ({ w, d });

describe('rejilla de ocupación: terreno (P3, R50)', () => {
  it('1 tile son SUBCELDAS×SUBCELDAS subceldas y todas las capas miden lo mismo', () => {
    const oc = chica();
    expect(SUBCELDAS).toBe(4);
    expect(oc.subU).toBe(12 * SUBCELDAS);
    expect(oc.subV).toBe(12 * SUBCELDAS);
    for (const capa of Object.values(oc.capas)) expect(capa).toHaveLength(12 * 12 * SUBCELDAS * SUBCELDAS);
  });

  it('marca el agua y no el llano seco', () => {
    // Con pendiente tolerada al máximo, solo cuenta el agua: así se prueba el criterio de agua aislado.
    const t = calcularTerreno(conAgua, 12, 12, 99);
    for (let v = 0; v < 12; v++) {
      for (let u = 0; u < 12; u++) expect(t[v * 12 + u], `${u},${v}`).toBe(u < 4 ? TERRENO_AGUA : 0);
    }
  });

  it('marca el acantilado como pendiente excesiva y no el llano', () => {
    const t = calcularTerreno(conAcantilado, 12, 12, 0.55);
    // La columna 3 limita con la 4: ahí salta de 0.2 a 3.5.
    expect(t[3]).toBe(TERRENO_PENDIENTE);
    expect(t[0]).toBe(0);
    expect(calcularTerreno(llano, 12, 12, 0.55).every((x) => x === 0)).toBe(true);
  });

  it('el terreno bloqueado inunda todas las subceldas del tile', () => {
    const oc = crearOcupacion(conAgua, 12, 12);
    for (let sv = 0; sv < SUBCELDAS; sv++) {
      for (let su = 0; su < SUBCELDAS; su++) {
        const k = sv * oc.subU + su;
        expect(oc.capas.terreno[k]).toBe(BLOQUEADA);
      }
    }
    expect(bloqueada(oc, 0, 0)).toBe(true);
    expect(bloqueada(oc, 8, 8)).toBe(false);
  });
});

describe('puedeColocar: motivos (P3, R21, R50)', () => {
  it('acepta un sitio seco y libre y lo dice sin motivo', () => {
    const oc = chica();
    expect(puedeColocar(oc, huella(2, 2), 4, 4)).toEqual({ ok: true });
  });

  it('rechaza fuera del mapa', () => {
    const oc = chica();
    expect(puedeColocar(oc, huella(3, 3), 11, 4)).toEqual({ ok: false, motivo: 'fuera' });
    expect(puedeColocar(oc, huella(1, 1), -1, 0)).toEqual({ ok: false, motivo: 'fuera' });
  });

  it('rechaza el agua y explica «agua», no «pendiente»', () => {
    const oc = chica(conAgua);
    expect(puedeColocar(oc, huella(2, 2), 0, 4)).toEqual({ ok: false, motivo: 'agua' });
  });

  it('rechaza el acantilado y explica «pendiente»', () => {
    const oc = chica(conAcantilado);
    expect(puedeColocar(oc, huella(2, 2), 3, 4)).toEqual({ ok: false, motivo: 'pendiente' });
  });

  it('rechaza el solape con otra estructura', () => {
    const oc = chica();
    expect(colocarEstructura(oc, 'casa', huella(3, 3), 2, 2)).toBe(true);
    expect(puedeColocar(oc, huella(2, 2), 3, 3)).toEqual({ ok: false, motivo: 'estructura' });
  });

  it('rechaza el solape con un objeto y con una unidad', () => {
    const oc = chica();
    colocarObjeto(oc, huella(2, 2), 5, 5);
    expect(puedeColocar(oc, huella(1, 1), 5, 5)).toEqual({ ok: false, motivo: 'objeto' });
    reservarDinamica(oc, 8 * SUBCELDAS + 1, 8 * SUBCELDAS + 1, true);
    expect(puedeColocar(oc, huella(1, 1), 8, 8)).toEqual({ ok: false, motivo: 'dinamica' });
  });

  it('rechaza pisar un camino reservado', () => {
    const oc = chica();
    marcarCamino(oc, 3 * SUBCELDAS + 1, 3 * SUBCELDAS + 2);
    expect(puedeColocar(oc, huella(2, 2), 3, 3)).toEqual({ ok: false, motivo: 'camino' });
  });

  it('un tile enteramente de camino se reporta como camino, no como libre', () => {
    const oc = chica();
    for (let su = 0; su < SUBCELDAS; su++) {
      for (let sv = 0; sv < SUBCELDAS; sv++) marcarCamino(oc, 3 * SUBCELDAS + su, 4 * SUBCELDAS + sv);
    }
    expect(estadoTile(oc, 3, 4)).toBe(CAMINO);
    // Y sigue siendo pisable: el camino acelera, no bloquea.
    expect(bloqueada(oc, 3, 4)).toBe(false);
  });

  it('el giro intercambia ancho y fondo', () => {
    expect(huellaGirada({ w: 2, d: 5 }, 0)).toEqual({ w: 2, d: 5 });
    expect(huellaGirada({ w: 2, d: 5 }, 1)).toEqual({ w: 5, d: 2 });
    expect(huellaGirada({ w: 2, d: 5 }, 2)).toEqual({ w: 2, d: 5 });
    expect(huellaGirada({ w: 2, d: 5 }, 3)).toEqual({ w: 5, d: 2 });
  });

  it('con giro 1 la huella ocupa el ancho del fondo girado', () => {
    const oc = chica();
    // 1×4 girada ocupa 4×1: cabe pegada al borde derecho solo si se mide bien.
    expect(puedeColocar(oc, huella(1, 4), 8, 0, 1)).toEqual({ ok: true });
    expect(puedeColocar(oc, huella(1, 4), 12, 0, 1)).toEqual({ ok: false, motivo: 'fuera' });
  });
});

describe('colocar y derribar (P3)', () => {
  it('colocar marca la huella y derribar la libera', () => {
    const oc = chica();
    expect(colocarEstructura(oc, 'casa', huella(3, 2), 4, 5)).toBe(true);
    expect(nEstructuras(oc)).toBe(1);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) expect(bloqueada(oc, 4 + i, 5 + j), `${i},${j}`).toBe(true);
    const quitada = derribarEn(oc, 5, 5);
    expect(quitada?.id).toBe('casa');
    expect(nEstructuras(oc)).toBe(0);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) expect(bloqueada(oc, 4 + i, 5 + j), `${i},${j}`).toBe(false);
    expect(puedeColocar(oc, huella(3, 2), 4, 5)).toEqual({ ok: true });
  });

  it('derribar donde no hay nada no cambia la rejilla', () => {
    const oc = chica();
    expect(derribarEn(oc, 2, 2)).toBeNull();
    expect(colisionesViolaciones(oc)).toBe(0);
  });

  it('colocar en un sitio imposible no cambia nada y no es una violación', () => {
    const oc = chica(conAgua);
    expect(colocarEstructura(oc, 'casa', huella(2, 2), 0, 0)).toBe(false);
    expect(nEstructuras(oc)).toBe(0);
    expect(colisionesViolaciones(oc)).toBe(0);
    expect(bloqueada(oc, 0, 0)).toBe(true); // sigue siendo agua
  });

  it('la auditoría sí caza a una unidad metida en un muro', () => {
    const oc = chica();
    colocarEstructura(oc, 'casa', huella(2, 2), 4, 4);
    // Simula un fallo de navegación: una unidad reservada dentro de la huella.
    reservarDinamica(oc, 4 * SUBCELDAS + 1, 4 * SUBCELDAS + 1, true);
    expect(colisionesViolaciones(oc)).toBeGreaterThan(0);
  });

  it('la puerta abre paso en la celda de acceso y no bloquea el tile', () => {
    const oc = chica();
    expect(colocarEstructura(oc, 'casa', huella(2, 2), 4, 4, 0, [{ i: 0, j: 2 }])).toBe(true);
    expect(estadoTile(oc, 4, 6)).toBe(PUERTA);
    expect(bloqueada(oc, 4, 6)).toBe(false);
    expect(bloqueada(oc, 4, 4)).toBe(true);
  });

  it('la estructura guarda sus puertas en coordenadas absolutas (están fuera de la huella)', () => {
    const oc = chica();
    colocarEstructura(oc, 'casa', huella(2, 2), 4, 4, 0, [{ i: 0, j: 2 }, { i: 1, j: 2 }]);
    const est = oc.estructuras.get(4 * oc.tilesU + 4);
    expect(est?.puertas).toEqual([{ u: 4, v: 6 }, { u: 5, v: 6 }]);
  });

  it('derribar limpia también las puertas (no deja un acceso fantasma)', () => {
    const oc = chica();
    colocarEstructura(oc, 'casa', huella(2, 2), 4, 4, 0, [{ i: 0, j: 2 }]);
    expect(estadoTile(oc, 4, 6)).toBe(PUERTA);
    derribarEn(oc, 4, 4);
    expect(estadoTile(oc, 4, 6)).toBe(LIBRE);
    expect(colisionesViolaciones(oc)).toBe(0);
  });

  it('la puerta girada sigue pegada al lado correcto de la huella girada', () => {
    const h = huella(2, 3);
    // Una puerta por cada lado, en su celda de acceso (fuera de la huella).
    const casos = [
      { p: { i: 0, j: 3 }, lado: 'v+' },
      { p: { i: 0, j: -1 }, lado: 'v-' },
      { p: { i: 2, j: 1 }, lado: 'u+' },
      { p: { i: -1, j: 1 }, lado: 'u-' },
    ] as const;
    // Giro 1 lleva v+→u-, v-→u+, u+→v+, u-→v-; el giro 4 veces vuelve al principio.
    const destino: Record<string, string> = { 'v+': 'u-', 'v-': 'u+', 'u+': 'v+', 'u-': 'v-' };
    for (const { p, lado } of casos) {
      const g = puertaGirada(p, h, 1);
      const gw = huellaGirada(h, 1);
      const enLado =
        (destino[lado] === 'v+' && g.j === gw.d && g.i >= 0 && g.i < gw.w) ||
        (destino[lado] === 'v-' && g.j === -1 && g.i >= 0 && g.i < gw.w) ||
        (destino[lado] === 'u+' && g.i === gw.w && g.j >= 0 && g.j < gw.d) ||
        (destino[lado] === 'u-' && g.i === -1 && g.j >= 0 && g.j < gw.d);
      expect(enLado, `${lado}→${destino[lado]} dio (${g.i},${g.j})`).toBe(true);
    }
    for (const { p } of casos) {
      let q: { i: number; j: number } = { ...p };
      for (let k = 0; k < 4; k++) q = puertaGirada(q, h, 1);
      expect(q).toEqual(p);
    }
  });

  it('no se puede edificar sobre una puerta ajena, pero sí pegado a ella', () => {
    const oc = chica();
    colocarEstructura(oc, 'casa', huella(2, 2), 4, 4, 0, [{ i: 0, j: 2 }]);
    expect(puedeColocar(oc, huella(1, 1), 4, 6)).toEqual({ ok: true });
  });
});

describe('rejilla de ocupación sobre el mundo real (P3, R50)', () => {
  const mundo: Mundo = crearMundo(tuning.mapa.semilla);
  const oc = crearOcupacion(mundo.superficie, mundo.tilesU, mundo.tilesV);

  it('el agua del mundo queda bloqueada y hay tierra pisable de sobra', () => {
    let agua = 0;
    let tierra = 0;
    for (let v = 0; v < mundo.tilesV; v += 3) {
      for (let u = 0; u < mundo.tilesU; u += 3) {
        if (mundo.superficie.agua(u + 0.5, v + 0.5) > mundo.superficie.suelo(u + 0.5, v + 0.5)) {
          expect(bloqueada(oc, u, v), `agua en ${u},${v}`).toBe(true);
          agua++;
        } else if (!bloqueada(oc, u, v)) tierra++;
      }
    }
    expect(agua).toBeGreaterThan(0);
    expect(tierra).toBeGreaterThan(0);
  });

  it('ninguna colocación aleatoria sobre el mundo viola la rejilla', () => {
    const o2 = crearOcupacion(mundo.superficie, mundo.tilesU, mundo.tilesV);
    let colocadas = 0;
    for (let k = 0; k < 400; k++) {
      const u = (k * 7) % mundo.tilesU;
      const v = (k * 13) % mundo.tilesV;
      if (colocarEstructura(o2, `casa${k}`, huella(2, 2), u, v)) colocadas++;
    }
    expect(colocadas).toBeGreaterThan(0);
    expect(colisionesViolaciones(o2)).toBe(0);
    expect(nEstructuras(o2)).toBe(colocadas);
  });

  it('el y-sort es determinista: la clave de una estructura no depende del orden de colocación (R50.5)', () => {
    const a = crearOcupacion(mundo.superficie, mundo.tilesU, mundo.tilesV);
    const b = crearOcupacion(mundo.superficie, mundo.tilesU, mundo.tilesV);
    const sitios: [number, number][] = [];
    for (let k = 0; k < 60; k++) {
      const u = (k * 7) % mundo.tilesU;
      const v = (k * 13) % mundo.tilesV;
      sitios.push([u, v]);
    }
    for (const [u, v] of sitios) colocarEstructura(a, 'x', huella(2, 2), u, v);
    for (const [u, v] of [...sitios].reverse()) colocarEstructura(b, 'x', huella(2, 2), u, v);
    const claves = (oc: Ocupacion): number[] =>
      [...oc.estructuras.values()].map((e) => claveOrdenEstructura(e.u, e.v, huellaGirada(e.huella, e.giro))).sort((x, y) => x - y);
    expect(claves(a)).toEqual(claves(b));
    expect(claves(a).length).toBe(nEstructuras(a));
  });
});
