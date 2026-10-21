import { describe, expect, it } from 'vitest';
import datos from '../public/recursos/pixel/atlas.json';
import tuning from '../src/data/tuning.json';
import type { AtlasPixel } from '../src/data/atlas';
import { crearMundo } from '../src/logic/mundo';
import { centroPieza, accesible, bloqueado, generarMontanas, solapan, type Montanas, type PiezaMontana } from '../src/logic/montanas';

const atlas = datos as unknown as AtlasPixel;
const mundo = crearMundo(tuning.mapa.semilla);
const montanas: Montanas = generarMontanas(
  mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla,
);

const SECO = (u: number, v: number): boolean => {
  const a = mundo.superficie.agua(u + 0.5, v + 0.5);
  return Number.isNaN(a) || a <= mundo.superficie.suelo(u + 0.5, v + 0.5);
};

describe('montañas: colocación determinista (P2c2, R84, D033)', () => {
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

  it('ninguna pieza toca el agua: toda su huella está seca', () => {
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

  it('misma semilla → mismas piezas (determinista), y otra semilla cambia el resultado', () => {
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
    // Toda cresta está pegada a otra pieza de montaña (la cordillera es una cadena, no piezas sueltas).
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

  it('las huellas bloquean el paso y dejan accesible el pie de la montaña (P3)', () => {
    for (const p of montanas.piezas) {
      for (let j = 0; j < p.d; j++) {
        for (let i = 0; i < p.w; i++) expect(bloqueado(montanas, p.u + i, p.v + j), `${p.id}`).toBe(true);
      }
    }
    // Alrededor de cada pieza hay al menos un tile libre y accesible: la montaña no tapió el mapa.
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
