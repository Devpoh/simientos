import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { Rejilla } from '../src/logic/hex';
import { contarBiomas, contarTerrenos, generarMapa, hashMapa, TIPOS_YACIMIENTO, type ConfigMapa } from '../src/logic/mapa';

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

describe('costa como dato de diseño (R001)', () => {
  /** Primera fila de mar de cada columna (la silueta real de la costa en el mapa generado). */
  const filaCosta = (s: number): number[] => {
    const m = conSemilla(s);
    const rej = new Rejilla(m.columnas, m.filas);
    return Array.from({ length: m.columnas }, (_, c) => {
      for (let f = 0; f < m.filas; f++) if (m.terreno[rej.indice(c, f)] === 'mar') return f;
      return m.filas;
    });
  };

  it.each(SEMILLAS)('semilla %i: la costa trae al menos un cabo y una bahía, dentro de los límites', (s) => {
    const { costa } = conSemilla(s);
    expect(costa.rasgos.length).toBeGreaterThanOrEqual(base.costa.rasgosMin);
    expect(costa.rasgos.length).toBeLessThanOrEqual(base.costa.rasgosMax);
    expect(costa.rasgos.some((r) => r.tipo === 'cabo')).toBe(true);
    expect(costa.rasgos.some((r) => r.tipo === 'bahia' || r.tipo === 'golfo')).toBe(true);
    for (const r of costa.rasgos) expect(r.tipo === 'cabo' ? r.magnitud > 0 : r.magnitud < 0).toBe(true);
    expect(costa.perfil).toHaveLength(base.columnas + 1);
    for (const y of costa.perfil) {
      expect(y).toBeGreaterThanOrEqual(base.costa.perfilMin);
      expect(y).toBeLessThanOrEqual(base.costa.perfilMax);
    }
  });

  it.each(SEMILLAS)('semilla %i: la silueta real es irregular (varias filas de diferencia entre cabo y bahía)', (s) => {
    const filas = filaCosta(s);
    expect(Math.max(...filas) - Math.min(...filas)).toBeGreaterThanOrEqual(4);
  });

  it.each(SEMILLAS)('semilla %i: las montañas conservan su altura y su extensión', (s) => {
    const m = conSemilla(s);
    expect(Math.max(...m.altura)).toBeGreaterThanOrEqual(0.9);
    const montana = m.terreno.filter((t) => t === 'montana').length;
    expect(montana / m.terreno.length).toBeGreaterThanOrEqual(0.05);
  });

  it('un cabo adelanta la costa hacia el sur y una bahía la retrasa respecto a la línea base', () => {
    const m = conSemilla(base.semilla);
    const baseY = 1 - base.bordeMar;
    const cabo = m.costa.rasgos.find((r) => r.tipo === 'cabo');
    const bahia = m.costa.rasgos.find((r) => r.tipo !== 'cabo');
    expect(m.costa.perfil[cabo!.columna]).toBeGreaterThan(baseY - base.ondulacionBordes - 0.02);
    expect(m.costa.perfil[bahia!.columna]).toBeLessThan(baseY + base.ondulacionBordes + 0.02);
  });
});

describe('yacimientos como datos (R73)', () => {
  const conteo = (m: ReturnType<typeof conSemilla>, tipo: string): number => m.yacimientos.filter((y) => y.tipo === tipo).length;

  it.each(SEMILLAS)('semilla %i: hay de cada tipo y cada uno está donde le corresponde', (s) => {
    const m = conSemilla(s);
    const rej = new Rejilla(m.columnas, m.filas);
    for (const tipo of TIPOS_YACIMIENTO) expect(conteo(m, tipo), `${tipo}`).toBeGreaterThan(0);
    for (const y of m.yacimientos) {
      const t = m.terreno[y.celda];
      if (['cobre', 'estano', 'hierro', 'plata', 'oro'].includes(y.tipo)) expect(t, y.tipo).toBe('montana');
      if (y.tipo === 'piedra' || y.tipo === 'marmol') expect(t, y.tipo).toBe('colina');
      if (y.tipo === 'carbon') {
        expect(t, y.tipo).toBe('llanura');
        // cuenca: a 1–3 saltos de una colina o sierra
        const cerca = [...Array(m.terreno.length).keys()].some((i) => (m.terreno[i] === 'colina' || m.terreno[i] === 'montana') && rej.distancia(i, y.celda) <= 3);
        expect(cerca).toBe(true);
      }
      expect([1, 2, 3]).toContain(y.riqueza);
    }
  });

  it.each(SEMILLAS)('semilla %i: ninguna celda tiene dos yacimientos y el reparto respeta la rareza', (s) => {
    const m = conSemilla(s);
    const celdas = m.yacimientos.map((y) => y.celda);
    expect(new Set(celdas).size).toBe(celdas.length);
    // el oro y la plata son más raros que el cobre y el hierro
    expect(conteo(m, 'oro')).toBeLessThanOrEqual(base.yacimientos.oro.grupos[1] * base.yacimientos.oro.tamano[1]);
    expect(conteo(m, 'oro') + conteo(m, 'plata')).toBeLessThan(conteo(m, 'cobre') + conteo(m, 'hierro'));
  });

  it.each(SEMILLAS)('semilla %i: el oro y la plata están en la mitad más alta de la sierra', (s) => {
    const m = conSemilla(s);
    const alturas = m.terreno.map((t, i) => (t === 'montana' ? m.altura[i] : -1)).filter((h) => h >= 0).sort((a, b) => a - b);
    const mediana = alturas[Math.floor(alturas.length / 2) - 1];
    for (const y of m.yacimientos.filter((q) => q.tipo === 'oro' || q.tipo === 'plata')) expect(m.altura[y.celda]).toBeGreaterThanOrEqual(mediana);
  });

  it('es determinista por semilla', () => {
    expect(conSemilla(42).yacimientos).toEqual(conSemilla(42).yacimientos);
    expect(conSemilla(42).yacimientos).not.toEqual(conSemilla(43).yacimientos);
  });
});

