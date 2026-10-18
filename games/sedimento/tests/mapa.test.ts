import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { Rejilla } from '../src/logic/hex';
import { contarBiomas, contarTerrenos, generarMapa, hashMapa, type ConfigMapa } from '../src/logic/mapa';

const base: ConfigMapa = tuning.mapa;
const conSemilla = (semilla: number) => generarMapa({ ...base, semilla }, tuning.clima);
const SEMILLAS = [1, 7, 42, 1234, 99991, 20260418, 31337, 5, 808, 64];

describe('generarMapa', () => {
  it('misma semilla → mismo mapa; semillas distintas → mapas distintos', () => {
    expect(hashMapa(conSemilla(42))).toBe(hashMapa(conSemilla(42)));
    const hashes = new Set(SEMILLAS.map((s) => hashMapa(conSemilla(s))));
    expect(hashes.size).toBe(SEMILLAS.length);
  });

  it('tiene el tamaño configurado y valores en rango', () => {
    const m = conSemilla(base.semilla);
    expect(m.terreno).toHaveLength(base.columnas * base.filas);
    for (const f of m.fertilidad) expect(f).toBeGreaterThanOrEqual(0), expect(f).toBeLessThanOrEqual(1);
    for (const n of m.nivel) expect(Number.isInteger(n) && n >= 0 && n < base.niveles).toBe(true);
  });

  it.each(SEMILLAS)('semilla %i: cada río es una cadena conectada que nace al norte y acaba en el mar o en otro río', (s) => {
    const m = conSemilla(s);
    const rej = new Rejilla(m.columnas, m.filas);
    expect(m.rios.length).toBeGreaterThanOrEqual(1);
    m.rios.forEach((rio, k) => {
      expect(rej.fila(rio[0])).toBeLessThanOrEqual(2);
      for (let i = 1; i < rio.length; i++) expect(rej.distancia(rio[i - 1], rio[i])).toBe(1);
      const final = rio[rio.length - 1];
      const llegaAlMar = m.terreno[final] === 'mar';
      const confluye = k > 0 && m.rios.slice(0, k).some((otro) => otro.includes(final));
      expect(llegaAlMar || confluye).toBe(true);
    });
    // El principal siempre llega al mar.
    expect(m.terreno[m.rios[0][m.rios[0].length - 1]]).toBe('mar');
  });

  it.each(SEMILLAS)('semilla %i: hay mar, río, lago, marisma, llanura y montaña', (s) => {
    const c = contarTerrenos(conSemilla(s));
    for (const t of ['mar', 'rio', 'lago', 'marisma', 'llanura', 'montana'] as const) expect(c[t], t).toBeGreaterThan(0);
  });

  it('los mapas varían de verdad: número de ríos o de lagos distinto entre semillas', () => {
    const firmas = new Set(SEMILLAS.map((s) => {
      const c = contarTerrenos(conSemilla(s));
      return `${conSemilla(s).rios.length}-${c.lago}`;
    }));
    expect(firmas.size).toBeGreaterThan(2);
  });

  it('el estado del mapa se serializa con JSON sin pérdidas', () => {
    const m = conSemilla(7);
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });

  it.each(SEMILLAS)('semilla %i: clima de Sumer → valle árido, más frío con la altura y cumbres de tundra o nieve', (s) => {
    const m = conSemilla(s);
    const media = (t: string) => {
      const v = m.temperatura.filter((_, i) => m.terreno[i] === t);
      return v.reduce((a, b) => a + b, 0) / v.length;
    };
    expect(media('montana')).toBeLessThan(media('colina'));
    expect(media('colina')).toBeLessThan(media('llanura'));
    const llanos = m.bioma.filter((_, i) => m.terreno[i] === 'llanura');
    const aridos = llanos.filter((b) => b === 'desierto' || b === 'estepa').length;
    expect(aridos / llanos.length).toBeGreaterThan(0.8);
    const b = contarBiomas(m);
    expect((b.tundra ?? 0) + (b.nieve ?? 0)).toBeGreaterThan(0);
  });

  it('la llanura junto al río es fértil aunque el bioma sea desierto', () => {
    const m = conSemilla(42);
    const ribera = m.fertilidad.filter((_, i) => m.terreno[i] === 'llanura' && m.distAgua[i] === 1 && m.bioma[i] === 'desierto');
    expect(ribera.length).toBeGreaterThan(0);
    for (const f of ribera) expect(f).toBeGreaterThan(0.8);
  });
});
