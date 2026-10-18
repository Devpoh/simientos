import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { Rejilla } from '../src/logic/hex';
import { generarMapa } from '../src/logic/mapa';
import { configDesdeTuning } from '../src/logic/sim/config';
import { colocarObra, fundarAsentamiento, motivoNoConstruible, puedeConstruir, type Mundo } from '../src/logic/sim/obras';
import { avanzarDias, crearEstado } from '../src/logic/sim/simulacion';
import type { EstadoSim, TipoEdificio } from '../src/logic/sim/tipos';

const cfg = configDesdeTuning(tuning);

function mundo(semilla: number): Mundo {
  const mapa = generarMapa({ ...tuning.mapa, semilla }, tuning.clima);
  return { mapa, rejilla: new Rejilla(mapa.columnas, mapa.filas) };
}

/** Partida recién fundada y un hexágono libre cerca del almacén donde cabe `tipo`. */
function aldea(tipo: TipoEdificio, semilla = 20260418) {
  const t = mundo(semilla);
  const e = crearEstado(cfg, semilla);
  const centro = fundarAsentamiento(e, t, cfg);
  const hex = t.rejilla.entorno(centro, 6).find((h) => puedeConstruir(e, t, tipo, h, cfg));
  if (hex === undefined) throw new Error(`sin sitio para ${tipo}`);
  return { t, e, hex };
}

const obra = (e: EstadoSim, id: number) => e.obras.find((o) => o.id === id);

describe('Rejilla.entorno', () => {
  it('radio 1 → 7 hexágonos y radio 3 → 37 en el interior, el centro primero', () => {
    const r = new Rejilla(20, 20);
    const c = r.indice(10, 10);
    expect(r.entorno(c, 1)).toHaveLength(7);
    expect(r.entorno(c, 3)).toHaveLength(37);
    expect(r.entorno(c, 3)[0]).toBe(c);
    expect(r.entorno(c, 3).every((h) => r.distancia(c, h) <= 3)).toBe(true);
  });
});

describe('fundación', () => {
  it.each([1, 42, 1234, 20260418, 31337])('semilla %i: almacén junto al agua dulce y una choza por hogar alrededor', (s) => {
    const t = mundo(s);
    const e = crearEstado(cfg, s);
    const centro = fundarAsentamiento(e, t, cfg);
    expect(t.mapa.distAgua[centro]).toBe(1);
    expect(e.edificios.filter((b) => b.tipo === 'almacen')).toHaveLength(1);
    const chozas = e.edificios.filter((b) => b.tipo === 'choza');
    expect(chozas).toHaveLength(e.hogares.length);
    expect(new Set(e.edificios.map((b) => b.hex)).size).toBe(e.edificios.length);
    for (const h of e.hogares) {
      expect(h.casa).not.toBeNull();
      expect(t.rejilla.distancia(centro, h.casa!)).toBeLessThanOrEqual(cfg.obras.radioFundacion);
    }
  });
});

describe('colocar obras', () => {
  it('rechaza agua, hexágonos ocupados y requisitos de vecindad, y explica el motivo', () => {
    const { t, e } = aldea('casa');
    const rio = t.mapa.rios[0][3];
    expect(colocarObra(e, t, 'casa', rio, cfg)).toEqual({ motivo: 'terreno' });
    expect(motivoNoConstruible(e, t, 'casa', e.edificios[0].hex, cfg)).toBe('ocupado');
    expect(motivoNoConstruible(e, t, 'casa', -1, cfg)).toBe('fuera-del-mapa');
    const lejos = t.mapa.terreno.findIndex((tr, i) => tr === 'llanura' && t.mapa.distAgua[i] > 3 && !t.rejilla.vecinos(i).some((v) => t.mapa.terreno[v] === 'mar'));
    if (lejos !== -1) expect(motivoNoConstruible(e, t, 'pesca', lejos, cfg)).toBe('sin-agua-al-lado');
  });

  it('una obra colocada aparece en cimientos y deja un hecho', () => {
    const { t, e, hex } = aldea('casa');
    const r = colocarObra(e, t, 'casa', hex, cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    expect(obra(e, r.id)).toMatchObject({ etapa: 'cimientos', hex, trabajoHecho: 0 });
    expect(e.hechos.at(-1)).toMatchObject({ tipo: 'obra-colocada', sujeto: `obra:${r.id}` });
  });
});

describe('obras por etapas', () => {
  it('sin material suficiente queda en esperando:<bien> y no progresa', () => {
    const { t, e, hex } = aldea('almacen');
    e.almacen.adobe = 10; // el almacén pide 60
    const r = colocarObra(e, t, 'almacen', hex, cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    avanzarDias(e, 3, cfg);
    const o = obra(e, r.id)!;
    expect(o.etapa).toBe('materiales');
    expect(o.bloqueo).toBe('esperando:adobe');
    const hecho = o.trabajoHecho;
    avanzarDias(e, 20, cfg);
    expect(o.trabajoHecho).toBe(hecho);
    expect(o.constructores).toBe(0);
    expect(e.hechos.filter((h) => h.tipo === 'obra-detenida' && h.sujeto === `obra:${r.id}`)).toHaveLength(1);

    e.almacen.adobe += 100; // llega el adobe: la obra se reanuda y termina
    avanzarDias(e, 10, cfg);
    expect(obra(e, r.id)).toBeUndefined();
    expect(e.edificios.some((b) => b.id === r.id && b.tipo === 'almacen')).toBe(true);
  });

  it('termina tras las personas-día exactas: casa de 15 con 6 constructores → 1 día de cimientos + 3', () => {
    const { t, e, hex } = aldea('casa');
    const r = colocarObra(e, t, 'casa', hex, cfg);
    if (!('id' in r)) throw new Error(r.motivo);
    const def = cfg.edificios.casa;
    const cimientos = def.trabajo * cfg.obras.fraccionCimientos;
    const n = cfg.obras.maxConstructoresPorObra;
    const esperado = Math.ceil(cimientos / n) + Math.ceil((def.trabajo - cimientos) / n);
    avanzarDias(e, esperado - 1, cfg);
    expect(obra(e, r.id)?.trabajoHecho).toBeLessThan(def.trabajo);
    avanzarDias(e, 1, cfg);
    expect(obra(e, r.id)).toBeUndefined();
    const fin = e.hechos.find((h) => h.tipo === 'obra-terminada' && h.sujeto === `obra:${r.id}`);
    expect(fin?.datos?.dias).toBe(esperado);
  });

  it('los constructores se reparten: sin adultos libres la segunda obra espera', () => {
    const { t, e, hex } = aldea('casa');
    for (const h of e.hogares) h.adultos = 0;
    e.hogares[0].adultos = 4;
    e.almacen.adobe = 200; // que el material no sea el cuello de botella
    e.almacen.cana = 200;
    const a = colocarObra(e, t, 'casa', hex, cfg);
    const otro = t.rejilla.entorno(hex, 6).find((h) => puedeConstruir(e, t, 'casa', h, cfg))!;
    const b = colocarObra(e, t, 'casa', otro, cfg);
    if (!('id' in a) || !('id' in b)) throw new Error('no se pudo colocar');
    avanzarDias(e, 1, cfg);
    expect(obra(e, a.id)!.constructores).toBe(2); // los cimientos de 1,5 solo necesitan 2
    expect(obra(e, b.id)!.constructores).toBe(2);
    avanzarDias(e, 1, cfg);
    expect(obra(e, a.id)!.constructores).toBe(4);
    expect(obra(e, b.id)!.bloqueo).toBe('sin-trabajadores');
  });
});
