import { describe, expect, it } from 'vitest';
import datos from '../public/recursos/pixel/atlas.json';
import tuning from '../src/data/tuning.json';
import type { AtlasPixel } from '../src/data/atlas';
import {
  contarSolapes, elementosDeAldea, generarAldea, huecoEntre, orientacionHacia, posicionUnidad, type Aldea,
} from '../src/logic/aldeaReferencia';
import { crearMundo } from '../src/logic/mundo';

const atlas = datos as unknown as AtlasPixel;
const mundo = crearMundo(tuning.mapa.semilla);
const aldea = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla);

const seco = (u: number, v: number): boolean => {
  const a = mundo.superficie.agua(u, v);
  return Number.isNaN(a) || a <= mundo.superficie.suelo(u, v);
};

describe('aldea de referencia: cantidades', () => {
  it('trae la carga de la decisión D023: ≥150 edificios, ≥600 árboles y ≥300 ciudadanos y animales', () => {
    expect(aldea.edificios.length).toBeGreaterThanOrEqual(150);
    expect(aldea.arboles.length).toBeGreaterThanOrEqual(600);
    expect(aldea.unidades.length).toBeGreaterThanOrEqual(300);
  });

  it('mezcla casas terminadas y en obra, campos en varias etapas, puestos y props', () => {
    const casas = aldea.edificios.filter((e) => e.id.startsWith('casa_'));
    const etapaFinal = (e: { id: string }): string => atlas.sprites[e.id].etapas!.slice(-1)[0];
    expect(casas.some((e) => e.estado === etapaFinal(e))).toBe(true);
    expect(casas.some((e) => e.estado !== etapaFinal(e))).toBe(true);
    expect(new Set(aldea.edificios.filter((e) => e.id.startsWith('campo_')).map((e) => e.estado)).size).toBeGreaterThanOrEqual(3);
    expect(aldea.edificios.some((e) => e.id.startsWith('puesto_'))).toBe(true);
    expect(aldea.props.length).toBeGreaterThan(0);
  });

  it('todo id y estado existe en el atlas', () => {
    for (const e of elementosDeAldea(aldea)) {
      const s = atlas.sprites[e.id];
      expect(s, e.id).toBeDefined();
      if (e.estado) expect(s.estados[e.estado], `${e.id}/${e.estado}`).toBeDefined();
      expect(e.w).toBe(s.huella.w);
      expect(e.d).toBe(s.huella.d);
    }
    for (const u of aldea.unidades) {
      const est = atlas.sprites[u.id].estados[u.estado];
      expect(est, `${u.id}/${u.estado}`).toBeDefined();
      expect(est.orientaciones[u.ori as 'se'], `${u.id}/${u.estado}/${u.ori}`).toBeDefined();
    }
  });
});

describe('aldea de referencia: huecos libres', () => {
  it('no hay solapes de huellas', () => {
    expect(contarSolapes(aldea)).toBe(0);
  });

  it('nada está en el agua ni en pendiente fuerte', () => {
    for (const e of elementosDeAldea(aldea)) {
      for (const [a, b] of [[0, 0], [e.w, 0], [0, e.d], [e.w, e.d], [e.w / 2, e.d / 2]]) {
        expect(seco(e.u + a, e.v + b), `${e.id} en (${e.u},${e.v})`).toBe(true);
      }
    }
    for (const u of aldea.unidades) {
      expect(seco(u.u, u.v)).toBe(true);
      if (u.ruta) expect(seco(u.ruta.u1, u.ruta.v1)).toBe(true);
    }
  });

  it('entre edificios queda una calle de al menos 1 tile', () => {
    const { edificios } = aldea;
    let peor = Infinity;
    for (let i = 0; i < edificios.length; i++) {
      for (let j = i + 1; j < edificios.length; j++) peor = Math.min(peor, huecoEntre(edificios[i], edificios[j]));
    }
    expect(peor).toBeGreaterThanOrEqual(tuning.aldea.calleTiles);
  });

  it('las unidades no pisan edificios, árboles ni props, ni en su ruta', () => {
    const ocupado = new Set<number>();
    for (const e of elementosDeAldea(aldea)) for (let j = 0; j < e.d; j++) for (let i = 0; i < e.w; i++) ocupado.add((e.v + j) * 100000 + e.u + i);
    const pisa = (u: number, v: number): boolean => ocupado.has(Math.floor(v) * 100000 + Math.floor(u));
    const fuera = { u: 0, v: 0, ori: 'se' as const };
    for (const u of aldea.unidades) {
      for (let t = 0; t < 20; t += 0.5) {
        posicionUnidad(u, t, tuning.aldea.velocidadCaminar, fuera);
        expect(pisa(fuera.u, fuera.v), `${u.id} en (${fuera.u.toFixed(1)},${fuera.v.toFixed(1)})`).toBe(false);
      }
    }
  });
});

describe('aldea de referencia: determinismo', () => {
  it('la misma semilla da exactamente la misma aldea', () => {
    const otra: Aldea = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla);
    expect(otra).toEqual(aldea);
  });

  it('otra semilla da otra aldea', () => {
    const otra = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla + 1);
    expect(otra.edificios).not.toEqual(aldea.edificios);
  });
});

describe('movimiento de las unidades', () => {
  it('orientacionHacia: +u mira a se, +v a sw, −u a nw, −v a ne', () => {
    expect(orientacionHacia(1, 0)).toBe('se');
    expect(orientacionHacia(0, 1)).toBe('sw');
    expect(orientacionHacia(-1, 0)).toBe('nw');
    expect(orientacionHacia(0, -1)).toBe('ne');
  });

  it('una unidad con ruta va y vuelve sin salirse del segmento', () => {
    const uni = { id: 'x', clase: 'ciudadano' as const, u: 10, v: 10, estado: 'caminar', ori: 'se' as const, ruta: { u1: 13, v1: 10 }, fase: 0 };
    const p = { u: 0, v: 0, ori: 'se' as const };
    let max = -Infinity;
    for (let t = 0; t < 30; t += 0.1) {
      posicionUnidad(uni, t, 1, p);
      expect(p.u).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(p.u).toBeLessThanOrEqual(13 + 1e-9);
      max = Math.max(max, p.u);
    }
    expect(max).toBeGreaterThan(12.9);
  });
});
