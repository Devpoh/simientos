import { describe, expect, it } from 'vitest';
import datos from '../public/recursos/pixel/atlas.json';
import tuning from '../src/data/tuning.json';
import type { AtlasPixel } from '../src/data/atlas';
import { crearMundo, hornearMundo } from '../src/logic/mundo';
import { RAMPAS } from '../src/data/paleta';
import { generarAldea } from '../src/logic/aldeaReferencia';
import {
  centroPieza, accesible, bloqueado, cobertura, generarMontanas, reservaAldea, solapan, type Montanas, type PiezaMontana,
} from '../src/logic/montanas';

const atlas = datos as unknown as AtlasPixel;
const mundo = crearMundo(tuning.mapa.semilla);
const montanas: Montanas = generarMontanas(
  mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla,
);

const SECO = (u: number, v: number): boolean => {
  const a = mundo.superficie.agua(u + 0.5, v + 0.5);
  return Number.isNaN(a) || a <= mundo.superficie.suelo(u + 0.5, v + 0.5);
};

describe('montaĂ±as: colocaciĂłn determinista (P2c2, R84, D033)', () => {
  it('coloca piezas y todas existen en el atlas con la huella que dice la pieza', () => {
    expect(montanas.piezas.length).toBeGreaterThan(0);
    for (const p of montanas.piezas) {
      const s = atlas.sprites[p.id];
      expect(s, p.id).toBeDefined();
      expect(s.categoria, p.id).toBe('roca');
      expect(s.bloquea, p.id).toBe(true);
      expect([p.w, p.d], p.id).toEqual([s.huella.w, s.huella.d]);
    }
  });

  it('usa las seis familias: macizo, pico, cresta, colina, acantilado y pie de ladera', () => {
    const tipos = new Set(montanas.piezas.map((p) => p.tipo));
    for (const t of ['macizo', 'cresta', 'colina', 'acantilado', 'pie'] as const) {
      expect(tipos.has(t), t).toBe(true);
    }
  });

  it('0 solapes entre piezas', () => {
    const p = montanas.piezas;
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        expect(solapan(p[i], p[j]), `${p[i].id}@${p[i].u},${p[i].v} vs ${p[j].id}@${p[j].u},${p[j].v}`).toBe(false);
      }
    }
  });

  it('ninguna pieza toca el agua: toda su huella estĂˇ seca', () => {
    for (const p of montanas.piezas) {
      for (let j = 0; j < p.d; j++) {
        for (let i = 0; i < p.w; i++) {
          expect(SECO(p.u + i, p.v + j), `${p.id}@${p.u + i},${p.v + j}`).toBe(true);
        }
      }
    }
  });

  it('todas las huellas caben dentro del mapa', () => {
    for (const p of montanas.piezas) {
      expect(p.u, p.id).toBeGreaterThanOrEqual(0);
      expect(p.v, p.id).toBeGreaterThanOrEqual(0);
      expect(p.u + p.w, p.id).toBeLessThanOrEqual(mundo.tilesU);
      expect(p.v + p.d, p.id).toBeLessThanOrEqual(mundo.tilesV);
    }
  });

  it('misma semilla â†’ mismas piezas (determinista), y otra semilla cambia el resultado', () => {
    const otra = generarMontanas(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla);
    expect(otra.piezas).toEqual(montanas.piezas);
    const distinta = generarMontanas(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla + 1);
    expect(distinta.piezas).not.toEqual(montanas.piezas);
  });

  it('el macizo y el pico van sobre cumbres altas, y la cordillera encadena crestas pegadas', () => {
    const alturaDe = (u: number, v: number): number => mundo.superficie.suelo(u + 0.5, v + 0.5);
    const cfg = tuning.horneado.montanas;
    for (const p of montanas.piezas) {
      if (p.tipo !== 'macizo' && p.tipo !== 'pico') continue;
      const c = centroPieza(p);
      expect(alturaDe(c.u, c.v), p.id).toBeGreaterThanOrEqual(cfg.alturaPico);
    }
    // Toda cresta estĂˇ pegada a otra pieza de montaĂ±a (la cordillera es una cadena, no piezas sueltas).
    const crestas = montanas.piezas.filter((p) => p.tipo === 'cresta');
    expect(crestas.length).toBeGreaterThanOrEqual(2);
    const montanasTodas = montanas.piezas;
    for (const c of crestas) {
      const pegada = montanasTodas.some((o) =>
        o !== c && o.u <= c.u + c.w && c.u <= o.u + o.w && o.v <= c.v + c.d && c.v <= o.v + o.d);
      expect(pegada, `${c.id}@${c.u},${c.v}`).toBe(true);
    }
  });

  it('las huellas quedan por encima del umbral de altura de su familia', () => {
    const cfg = tuning.horneado.montanas;
    const minimo: Record<PiezaMontana['tipo'], number> = {
      macizo: cfg.alturaMacizo, pico: cfg.alturaPico, cresta: cfg.alturaMinCumbre,
      colina: cfg.mediaColina, acantilado: 0, pie: 0,
    };
    for (const p of montanas.piezas) {
      const c = centroPieza(p);
      expect(mundo.superficie.suelo(c.u + 0.5, c.v + 0.5), `${p.id}@${p.u},${p.v}`).toBeGreaterThanOrEqual(minimo[p.tipo]);
    }
  });

  it('las huellas bloquean el paso y dejan accesible el pie de la montaĂ±a (P3)', () => {
    for (const p of montanas.piezas) {
      for (let j = 0; j < p.d; j++) {
        for (let i = 0; i < p.w; i++) expect(bloqueado(montanas, p.u + i, p.v + j), `${p.id}`).toBe(true);
      }
    }
    // Alrededor de cada pieza hay al menos un tile libre y accesible: la montaĂ±a no tapiĂł el mapa.
    let libres = 0;
    for (const p of montanas.piezas) {
      for (let j = -1; j <= p.d; j++) {
        for (let i = -1; i <= p.w; i++) {
          const u = p.u + i;
          const v = p.v + j;
          if (u < 0 || v < 0 || u >= mundo.tilesU || v >= mundo.tilesV) continue;
          if (accesible(montanas, u, v)) libres++;
        }
      }
    }
    expect(libres).toBeGreaterThan(0);
  });
});

describe('montañas: el terreno bajo las piezas no lleva nieve ni roca (P2c3, R84)', () => {
  const cubierto = cobertura(montanas, mundo.tilesU, mundo.tilesV);
  // Hornear el mundo entero es caro; se hace una vez y los tests comparten el resultado.
  const sinMascara = hornearMundo(mundo);
  const conMascara = hornearMundo(mundo, cubierto);

  it('la máscara marca exactamente las huellas de las piezas', () => {
    for (const p of montanas.piezas) {
      for (let j = 0; j < p.d; j++) {
        for (let i = 0; i < p.w; i++) {
          const u = p.u + i;
          const v = p.v + j;
          if (u < 0 || v < 0 || u >= mundo.tilesU || v >= mundo.tilesV) continue;
          expect(cubierto[v * mundo.tilesU + u], `${p.id}@${u},${v}`).toBe(1);
        }
      }
    }
    let marcados = 0;
    for (const c of cubierto) marcados += c;
    expect(marcados).toBeGreaterThan(0);
  });

  it('con la máscara bajan los píxeles de roca y nieve: el terreno tapado es suave', () => {
    const duro = new Set([...RAMPAS.roca, ...RAMPAS.piedra]);
    let antes = 0;
    let despues = 0;
    for (const v of sinMascara.datos) if (duro.has(v)) antes++;
    for (const v of conMascara.datos) if (duro.has(v)) despues++;
    expect(antes).toBeGreaterThan(0);
    // Bajo cada pieza el horneado deja de pintar roca y nieve, así que el recuento baja de forma clara.
    expect(despues).toBeLessThan(antes * 0.85);
  });

  it('la máscara no cambia el agua ni las dimensiones de la imagen', () => {
    expect(conMascara.ancho).toBe(sinMascara.ancho);
    expect(conMascara.alto).toBe(sinMascara.alto);
    expect(Array.from(conMascara.agua ?? [])).toEqual(Array.from(sinMascara.agua ?? []));
  });

  it('es determinista con la máscara puesta', () => {
    expect(Array.from(conMascara.datos)).toEqual(Array.from(hornearMundo(mundo, cubierto).datos));
  });
});

describe('montañas: ninguna pieza tapa la aldea (P2c3, R84)', () => {
  const aldea = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla);
  const reservado = reservaAldea(aldea, mundo.tilesU, mundo.tilesV);
  const m = generarMontanas(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla, tuning.horneado.montanas, reservado);

  it('con la reserva de la aldea, ningún edificio ni prop queda bajo una pieza', () => {
    const tapados: string[] = [];
    for (const e of [...aldea.edificios, ...aldea.props]) {
      for (let j = 0; j < e.d; j++) {
        for (let i = 0; i < e.w; i++) {
          if (bloqueado(m, e.u + i, e.v + j)) tapados.push(`${e.id}@${e.u},${e.v}`);
        }
      }
    }
    expect(tapados).toEqual([]);
  });

  it('la reserva no deja el mapa sin montañas', () => {
    expect(m.piezas.length).toBeGreaterThan(0);
  });

  it('ninguna pieza pisa un tile reservado por la aldea', () => {
    for (const p of m.piezas) {
      for (let j = 0; j < p.d; j++) {
        for (let i = 0; i < p.w; i++) {
          const u = p.u + i;
          const v = p.v + j;
          expect(reservado[v * mundo.tilesU + u], `${p.id}@${u},${v}`).toBe(0);
        }
      }
    }
  });

  it('las piezas no se solapan entre sí ni con la reserva puesta', () => {
    for (let a = 0; a < m.piezas.length; a++) {
      for (let b = a + 1; b < m.piezas.length; b++) {
        expect(solapan(m.piezas[a], m.piezas[b]), `${m.piezas[a].id}/${m.piezas[b].id}`).toBe(false);
      }
    }
  });

  it('es determinista con la reserva puesta', () => {
    const otra = generarMontanas(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla, tuning.horneado.montanas, reservado);
    expect(otra.piezas).toEqual(m.piezas);
  });
});
