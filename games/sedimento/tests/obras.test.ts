import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { crearCampoAlturas } from '../src/logic/alturas';
import { rectsSolapan } from '../src/logic/geometria2d';
import { Rejilla } from '../src/logic/hex';
import { generarMapa } from '../src/logic/mapa';
import { configDesdeTuning } from '../src/logic/sim/config';
import { cancelarObra, colocarObra, fundarAsentamiento, huellaDe, motivoNoConstruible, priorizarObra, puedeConstruir, suspenderObra, type Mundo } from '../src/logic/sim/obras';
import { avanzarDias, crearEstado } from '../src/logic/sim/simulacion';
import { ETAPAS_OBRA, type EstadoSim, type TipoEdificio, type Ubicacion } from '../src/logic/sim/tipos';

const cfg = configDesdeTuning(tuning);

const cacheMundos = new Map<number, Mundo>();
function mundo(semilla: number): Mundo {
  let t = cacheMundos.get(semilla);
  if (!t) {
    const mapa = generarMapa({ ...tuning.mapa, semilla }, tuning.clima);
    const campo = crearCampoAlturas(mapa, { ...tuning.alturas, tamanoHex: tuning.render.tamanoHex });
    t = { mapa, rejilla: new Rejilla(mapa.columnas, mapa.filas), tamanoHex: tuning.render.tamanoHex, alturaEn: campo.alturaEn, aguaEn: campo.aguaEn };
    cacheMundos.set(semilla, t);
  }
  return t;
}

/** Primer sitio libre para `tipo` en espiral alrededor de `centro`. */
function buscarSitio(e: EstadoSim, t: Mundo, tipo: TipoEdificio, centro: Ubicacion, giro = 0): Ubicacion {
  for (let r = 0.5; r < 12; r += 0.25)
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const u = { x: centro.x + Math.cos(a) * r, z: centro.z + Math.sin(a) * r, giro };
      if (puedeConstruir(e, t, tipo, u, cfg)) return u;
    }
  throw new Error(`sin sitio para ${tipo}`);
}

/** Barre el mapa buscando un punto donde `tipo` falle justo por `motivo`. */
function buscarMotivo(e: EstadoSim, t: Mundo, tipo: TipoEdificio, motivo: string): Ubicacion | null {
  for (let i = 0; i < t.rejilla.total; i += 3) {
    const { q, r } = t.rejilla.axial(i);
    const u = { x: Math.sqrt(3) * (q + r / 2) * t.tamanoHex, z: 1.5 * r * t.tamanoHex, giro: 0 };
    if (motivoNoConstruible(e, t, tipo, u, cfg) === motivo) return u;
  }
  return null;
}

function aldea(semilla = 20260418) {
  const t = mundo(semilla);
  const e = crearEstado(cfg, semilla);
  const almacen = fundarAsentamiento(e, t, cfg);
  return { t, e, almacen };
}

/** Material y gente de sobra: que nada frene la obra salvo lo que pruebe el test. */
function sobrado(e: EstadoSim) {
  e.almacen.adobe = 1000;
  e.almacen.cana = 1000;
  for (const h of e.hogares) h.adultos = 10;
}

const obra = (e: EstadoSim, id: number) => e.obras.find((o) => o.id === id);

describe('fundación libre', () => {
  it.each([1, 7, 42, 99, 1234, 4242, 20260418, 31337, 55555, 777])('semilla %i: almacén y una choza por hogar, sin solapes', (s) => {
    const t = mundo(s);
    const e = crearEstado(cfg, s);
    const almacen = fundarAsentamiento(e, t, cfg);
    expect(e.edificios.filter((b) => b.tipo === 'almacen')).toHaveLength(1);
    expect(e.edificios.filter((b) => b.tipo === 'choza')).toHaveLength(e.hogares.length);
    for (const h of e.hogares) expect(e.edificios.some((b) => b.id === h.casa)).toBe(true);
    const huellas = e.edificios.map((b) => huellaDe(b.tipo, b, cfg));
    for (let i = 0; i < huellas.length; i++) for (let j = i + 1; j < huellas.length; j++) expect(rectsSolapan(huellas[i], huellas[j])).toBe(false);
    for (const b of e.edificios) expect(Math.hypot(b.x - almacen.x, b.z - almacen.z)).toBeLessThanOrEqual(cfg.obras.radioFundacion + 1e-9);
    // Ningún edificio en el agua.
    for (const b of e.edificios) expect(Number.isNaN(t.aguaEn(b.x, b.z))).toBe(true);
  });
});

describe('colocación libre (R21)', () => {
  it('coloca en cualquier punto con su giro y la obra empieza en «plano»', () => {
    const { t, e, almacen } = aldea();
    const u = buscarSitio(e, t, 'casa', almacen, 0.7);
    const r = colocarObra(e, t, 'casa', u, cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    expect(obra(e, r.id)).toMatchObject({ x: u.x, z: u.z, giro: 0.7, etapa: 'plano', trabajoHecho: 0 });
    expect(e.hechos.at(-1)).toMatchObject({ tipo: 'obra-colocada', sujeto: `obra:${r.id}` });
  });

  it('solape con giro (SAT): pegado y recto cabe, girado 45° choca', () => {
    const { t, e, almacen } = aldea();
    const u = buscarSitio(e, t, 'casa', almacen);
    // Solo la casa A en el mundo: así «pegado» no choca con las chozas de la fundación.
    e.edificios = [];
    const a = colocarObra(e, t, 'casa', u, cfg);
    if (!('id' in a)) throw new Error(a.motivo);
    const h = cfg.edificios.casa.huella;
    const junto = { x: u.x + h.ancho + cfg.obras.separacion + 0.02, z: u.z, giro: 0 };
    expect(motivoNoConstruible(e, t, 'casa', junto, cfg)).not.toBe('ocupado');
    expect(motivoNoConstruible(e, t, 'casa', { ...junto, giro: Math.PI / 4 }, cfg)).toBe('ocupado');
    expect(motivoNoConstruible(e, t, 'casa', { ...u, giro: 1.1 }, cfg)).toBe('ocupado');
  });

  it('explica el motivo: agua, pendiente, fuera del mapa y sin agua al lado', () => {
    const { t, e } = aldea();
    const campo = crearCampoAlturas(t.mapa, { ...tuning.alturas, tamanoHex: tuning.render.tamanoHex });
    const rio = campo.rios[0];
    const p = rio.puntos[Math.floor(rio.puntos.length / 2)];
    expect(motivoNoConstruible(e, t, 'casa', { x: p.x, z: p.z, giro: 0 }, cfg)).toBe('agua');
    expect(motivoNoConstruible(e, t, 'casa', { x: -1000, z: 0, giro: 0 }, cfg)).toBe('fuera-del-mapa');
    const ladera = buscarMotivo(e, t, 'campo', 'pendiente');
    expect(ladera).not.toBeNull();
    expect(buscarMotivo(e, t, 'pesca', 'sin-agua-al-lado')).not.toBeNull();
  });
});

describe('obras por etapas (R22)', () => {
  it('recorre plano → preparación → cimientos → estructura → cubierta y solo entonces es edificio', () => {
    const { t, e, almacen } = aldea();
    sobrado(e);
    const r = colocarObra(e, t, 'almacen', buscarSitio(e, t, 'almacen', almacen), cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    const vistas: string[] = [];
    for (let d = 0; d < 60 && obra(e, r.id); d++) {
      const o = obra(e, r.id)!;
      if (vistas.at(-1) !== o.etapa) vistas.push(o.etapa);
      expect(e.edificios.some((b) => b.id === r.id)).toBe(false);
      avanzarDias(e, 1, cfg);
    }
    expect(vistas).toEqual([...ETAPAS_OBRA]);
    expect(obra(e, r.id)).toBeUndefined();
    expect(e.edificios.some((b) => b.id === r.id && b.tipo === 'almacen')).toBe(true);
  });

  it('dura las personas-día exactas: casa con 6 constructores → suma de ceil(trabajo de etapa / 6)', () => {
    const { t, e, almacen } = aldea();
    sobrado(e);
    const r = colocarObra(e, t, 'casa', buscarSitio(e, t, 'casa', almacen), cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    const def = cfg.edificios.casa;
    const n = cfg.obras.maxConstructoresPorObra;
    const esperado = ETAPAS_OBRA.reduce((s, et) => s + Math.ceil((def.trabajo * cfg.obras.fraccionTrabajo[et]) / n - 1e-9), 0);
    avanzarDias(e, esperado - 1, cfg);
    expect(obra(e, r.id)).toBeDefined();
    avanzarDias(e, 1, cfg);
    expect(obra(e, r.id)).toBeUndefined();
    expect(e.hechos.find((h) => h.tipo === 'obra-terminada' && h.sujeto === `obra:${r.id}`)?.datos?.dias).toBe(esperado);
  });

  it('cada etapa espera su parte de los materiales y avisa de qué falta', () => {
    const { t, e, almacen } = aldea();
    sobrado(e);
    e.almacen.adobe = 0;
    const r = colocarObra(e, t, 'casa', buscarSitio(e, t, 'casa', almacen), cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    avanzarDias(e, 10, cfg);
    const o = obra(e, r.id)!;
    expect(o.etapa).toBe('cimientos'); // plano y preparación no piden material
    expect(o.bloqueo).toBe('esperando:adobe');
    const parte = Math.ceil(cfg.edificios.casa.materiales.adobe! * cfg.obras.fraccionMateriales.cimientos);
    e.almacen.adobe = parte;
    avanzarDias(e, 10, cfg);
    expect(o.etapa).toBe('estructura');
    expect(o.bloqueo).toBe('esperando:adobe');
    expect(o.entregado.adobe).toBe(parte);
  });

  it('cancelar devuelve los materiales entregados', () => {
    const { t, e, almacen } = aldea();
    sobrado(e);
    const antes = { ...e.almacen };
    const r = colocarObra(e, t, 'casa', buscarSitio(e, t, 'casa', almacen), cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    avanzarDias(e, 3, cfg);
    expect(obra(e, r.id)!.entregado.adobe).toBeGreaterThan(0);
    // Las raciones también gastan del almacén: solo comparamos los materiales de obra.
    expect(cancelarObra(e, r.id, cfg)).toBe(true);
    expect(e.almacen.adobe).toBe(antes.adobe);
    expect(e.almacen.cana).toBe(antes.cana);
    expect(obra(e, r.id)).toBeUndefined();
    expect(e.hechos.at(-1)).toMatchObject({ tipo: 'obra-cancelada' });
  });

  it('suspendida no avanza; al reanudar sigue donde estaba', () => {
    const { t, e, almacen } = aldea();
    sobrado(e);
    const r = colocarObra(e, t, 'casa', buscarSitio(e, t, 'casa', almacen), cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    avanzarDias(e, 1, cfg);
    const hecho = obra(e, r.id)!.trabajoHecho;
    suspenderObra(e, r.id, true);
    avanzarDias(e, 5, cfg);
    expect(obra(e, r.id)!.trabajoHecho).toBe(hecho);
    expect(obra(e, r.id)!.bloqueo).toBe('suspendida');
    suspenderObra(e, r.id, false);
    avanzarDias(e, 1, cfg);
    expect(obra(e, r.id)!.trabajoHecho).toBeGreaterThan(hecho);
  });

  it('la prioridad reparte antes a las obras prioritarias', () => {
    const { t, e, almacen } = aldea();
    sobrado(e);
    for (const h of e.hogares) h.adultos = 0;
    e.hogares[0].adultos = 1;
    const a = colocarObra(e, t, 'casa', buscarSitio(e, t, 'casa', almacen), cfg);
    if (!('id' in a)) throw new Error(a.motivo);
    const b = colocarObra(e, t, 'casa', buscarSitio(e, t, 'casa', almacen), cfg);
    if (!('id' in b)) throw new Error(b.motivo);
    priorizarObra(e, b.id, 1);
    avanzarDias(e, 1, cfg);
    expect(obra(e, b.id)!.constructores).toBe(1);
    expect(obra(e, a.id)!.bloqueo).toBe('sin-trabajadores');
  });
});
