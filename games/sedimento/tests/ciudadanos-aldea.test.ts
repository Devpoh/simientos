// Integración de P4b sobre el mundo y la aldea de verdad: mundo procedural + aldea de referencia + rejilla de
// ocupación + ciudadanos que caminan. Comprueba el criterio de la fase: 200 ciudadanos × 10 000 ticks sin pisar
// una celda bloqueada, entradas y salidas por la puerta, y replanificación al derribar.
import { describe, expect, it } from 'vitest';
import datos from '../public/recursos/pixel/atlas.json';
import tuning from '../src/data/tuning.json';
import type { AtlasPixel } from '../src/data/atlas';
import { crearMundo } from '../src/logic/mundo';
import { generarAldea } from '../src/logic/aldeaReferencia';
import { colocarEstructura, colocarObjeto, crearOcupacion, type Ocupacion } from '../src/logic/ocupacion';
import { crearRng } from '../src/logic/azar';
import { buscarRuta, transitable } from '../src/logic/navegacion';
import {
  avanzarCiudadano, casasDeAldea, contarEstados, poblarCiudadanos, replanificar, violacionesCiudadanos,
  type SemillaCiudadano,
} from '../src/logic/ciudadano';

const atlas = datos as unknown as AtlasPixel;
const mundo = crearMundo(tuning.mapa.semilla);
const aldea = generarAldea(mundo.superficie, mundo.tilesU, mundo.tilesV, atlas.sprites, mundo.semilla);

/** Igual que la escena: mundo → rejilla → huellas de la aldea (estructuras y objetos). */
function rejillaConAldea(): Ocupacion {
  const oc = crearOcupacion(mundo.superficie, mundo.tilesU, mundo.tilesV);
  for (const e of aldea.edificios) colocarEstructura(oc, e.id, { w: e.w, d: e.d }, e.u, e.v, 0, atlas.sprites[e.id]?.puertas ?? []);
  for (const e of [...aldea.props, ...aldea.arboles]) colocarObjeto(oc, { w: e.w, d: e.d }, e.u, e.v);
  return oc;
}

function semillasDeAldea(): SemillaCiudadano[] {
  const s: SemillaCiudadano[] = [];
  for (const u of aldea.unidades) {
    if (u.clase !== 'ciudadano') continue;
    s.push({ sprite: u.id, actividad: u.estado, u: Math.round(u.u), v: Math.round(u.v), fase: u.fase });
  }
  return s;
}

describe('ciudadanos sobre la aldea real (P4b, §4)', () => {
  const oc = rejillaConAldea();
  const casas = casasDeAldea(oc, aldea.edificios);

  it('la aldea tiene casas con puerta pisable y ciudadanos suficientes', () => {
    expect(casas.length).toBeGreaterThan(100);
    expect(semillasDeAldea().length).toBeGreaterThanOrEqual(200);
  });

  it('los ciudadanos arrancan con ruta, no dentro de un muro, y con 0 violaciones', () => {
    const gente = poblarCiudadanos(semillasDeAldea(), oc, casas);
    const estados = contarEstados(gente);
    expect(estados.andar).toBeGreaterThan(gente.length * 0.9);
    expect(estados.bloqueado).toBe(0);
    expect(violacionesCiudadanos(gente, oc)).toBe(0);
  });

  it('criterio de la fase: 200 ciudadanos × 10 000 ticks sin pisar una celda bloqueada', () => {
    const semillas = semillasDeAldea();
    // Se recortan a 200 para el criterio (la aldea genera 200 ciudadanos exactos de todas formas).
    const gente = poblarCiudadanos(semillas.slice(0, 200), oc, casas);
    const rng = crearRng(0xc1);
    let vioDentro = false;
    for (let t = 0; t < 10000; t++) {
      for (const ci of gente) avanzarCiudadano(ci, oc, casas, rng);
      if (t % 500 === 0) {
        expect(violacionesCiudadanos(gente, oc)).toBe(0);
        if (contarEstados(gente).dentro > 0) vioDentro = true;
      }
    }
    expect(violacionesCiudadanos(gente, oc)).toBe(0);
    expect(vioDentro || contarEstados(gente).entrar > 0).toBe(true);
  });

  it('un ciudadano `bloqueado` lo está por una razón real: ninguna casa es alcanzable desde su tile', () => {
    const oc2 = rejillaConAldea();
    const casas2 = casasDeAldea(oc2, aldea.edificios);
    // El mundo tiene bolsas de tierra aisladas por el agua: allí puede no haber ninguna casa alcanzable.
    // Se elige a propósito un tile de una bolsa sin casas (si la aldea no tiene ninguna, el test no aplica).
    const aislados = semillasDeAldea().filter((s) => {
      const t = { u: Math.round(s.u), v: Math.round(s.v) };
      if (!transitable(oc2, t.u, t.v)) return false;
      return casas2.every((c) => buscarRuta(oc2, t, c.puerta) === null);
    });
    if (aislados.length === 0) return;
    const gente = poblarCiudadanos(aislados.slice(0, 20), oc2, casas2);
    expect(gente.every((ci) => ci.estado !== 'andar')).toBe(true);
    expect(gente.every((ci) => violacionesCiudadanos([ci], oc2) === 0)).toBe(true);
  });

  it('la replanificación reacciona a la rejilla: se cierra el paso, se bloquea; se abre, vuelve a andar', () => {
    const oc2 = rejillaConAldea();
    const casas2 = casasDeAldea(oc2, aldea.edificios);
    const gente = poblarCiudadanos(semillasDeAldea().slice(0, 20), oc2, casas2);
    const ci = gente.find((c) => c.estado === 'andar' && c.casa)!;
    expect(ci).toBeDefined();
    const puerta = ci.casa!.puerta;
    // Se sella la puerta: la ruta deja de existir y se replanifica a estado bloqueado.
    colocarObjeto(oc2, { w: 1, d: 1 }, puerta.u, puerta.v);
    replanificar(gente, oc2);
    expect(ci.estado).toBe('bloqueado');
    // Se abre de nuevo: vuelve a haber camino.
    oc2.capas.objetos.fill(0);
    replanificar(gente, oc2);
    expect(ci.estado).toBe('andar');
    expect(violacionesCiudadanos(gente, oc2)).toBe(0);
  });
});
