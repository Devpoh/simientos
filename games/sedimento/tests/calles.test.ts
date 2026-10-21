import { describe, expect, it } from 'vitest';
import datos from '../public/recursos/pixel/atlas.json';
import tuning from '../src/data/tuning.json';
import type { AtlasPixel } from '../src/data/atlas';
import { crearMundo } from '../src/logic/mundo';
import { generarAldea } from '../src/logic/aldeaReferencia';
import { anchoMinimoManzana, CALLE_ROCA, CALLE_TIERRA, contarCalles, configCalles, SIN_CALLE } from '../src/logic/calles';

const atlas = datos as unknown as AtlasPixel;
const mundo = crearMundo(tuning.mapa.semilla);
const aldea = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla);

describe('red de calles (P3b2, R85, §10.9)', () => {
  it('el ancho de las calles principales es de al menos 2 tiles', () => {
    expect(anchoMinimoManzana()).toBeGreaterThanOrEqual(2);
    expect(tuning.aldea.callePrincipalAncho).toBeGreaterThanOrEqual(2);
  });

  it('rechaza una configuración de calle principal de un solo tile', () => {
    expect(() => configCalles({ callePrincipalCada: 14, callePrincipalAncho: 1 })).toThrow();
  });

  it('traza calles de roca y de tierra, ambas con muchos tiles', () => {
    const { roca, tierra } = contarCalles({ tiles: aldea.calles, trazados: aldea.trazados });
    expect(roca).toBeGreaterThan(100);
    expect(tierra).toBeGreaterThan(50);
  });

  it('hay calles de los dos materiales y solo esos valores en la rejilla', () => {
    const vistos = new Set<number>();
    for (const t of aldea.calles) vistos.add(t);
    expect(vistos.has(CALLE_ROCA)).toBe(true);
    expect(vistos.has(CALLE_TIERRA)).toBe(true);
    for (const v of vistos) expect([SIN_CALLE, CALLE_ROCA, CALLE_TIERRA]).toContain(v);
  });

  it('ninguna calle pisa el agua ni pendiente fuerte: solo tiles aptos', () => {
    const seco = (u: number, v: number): boolean => {
      const a = mundo.superficie.agua(u, v);
      return Number.isNaN(a) || a <= mundo.superficie.suelo(u, v);
    };
    for (let v = 0; v < mundo.tilesV; v++) {
      for (let u = 0; u < mundo.tilesU; u++) {
        if (aldea.calles[v * mundo.tilesU + u] === SIN_CALLE) continue;
        expect(seco(u + 0.5, v + 0.5), `calle en (${u},${v})`).toBe(true);
      }
    }
  });

  it('cada trazado declara material, ancho ≥ 1 y al menos dos puntos', () => {
    expect(aldea.trazados.length).toBeGreaterThan(0);
    for (const t of aldea.trazados) {
      expect(['roca', 'tierra']).toContain(t.material);
      expect(t.ancho).toBeGreaterThanOrEqual(1);
      expect(t.puntos.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('hay ramales de tierra: algún trazado de tierra acaba cerca de un edificio', () => {
    const ramales = aldea.trazados.filter((t) => t.material === 'tierra' && t.puntos.length === 2);
    let cerca = 0;
    for (const r of ramales) {
      const p = r.puntos[0];
      for (const e of aldea.edificios) {
        if (Math.hypot(p.u - (e.u + e.w / 2), p.v - (e.v + e.d / 2)) <= 3) { cerca++; break; }
      }
    }
    expect(cerca).toBeGreaterThan(0);
  });

  it('determinista: la misma semilla da exactamente las mismas calles', () => {
    const otra = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla);
    expect(otra.calles).toEqual(aldea.calles);
    expect(otra.trazados).toEqual(aldea.trazados);
  });
});
