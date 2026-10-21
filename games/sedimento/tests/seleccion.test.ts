import { describe, expect, it } from 'vitest';
import {
  alCaja, alClic, alClicVacio, alDobleClic, alternar, candidatas, dentroDeCaja, distanciaA, enCaja,
  entidadEn, estaSeleccionada, guardarGrupo, grupoVivo, podar, quitar, recuperarGrupo,
  seleccion, SIN_SELECCION, type Entidad, type Grupos,
} from '../src/logic/seleccion';

/** Ciudadano en un punto. */
const uni = (id: string, u: number, v: number, tipo = 'campesino'): Entidad => ({ id, clase: 'unidad', u, v, w: 0, d: 0, tipo });
/** Animal en un punto. */
const ani = (id: string, u: number, v: number, tipo = 'oveja'): Entidad => ({ id, clase: 'animal', u, v, w: 0, d: 0, tipo });
/** Edificio 2×2 con esquina trasera en (u, v). */
const edi = (id: string, u: number, v: number, w = 2, d = 2, tipo = 'casa'): Entidad => ({ id, clase: 'edificio', u, v, w, d, tipo });

const existentes = (ids: string[]): Set<string> => new Set(ids);

describe('selección múltiple (P5, R51, §5)', () => {
  it('la distancia a una unidad es la euclídea y a un edificio, 0 dentro de su huella', () => {
    expect(distanciaA(uni('a', 3, 4), 0, 0)).toBe(5);
    expect(distanciaA(edi('c', 10, 10), 10.5, 10.5)).toBe(0);
    expect(distanciaA(edi('c', 10, 10), 13, 10)).toBe(1);
    // El punto (10, 9) está un tile por detrás de la huella.
    expect(distanciaA(edi('c', 10, 10), 10, 9)).toBe(1);
  });

  it('el clic cae en la entidad más cercana con prioridad unidad > animal > edificio', () => {
    const es = [uni('u1', 5, 5), ani('a1', 5, 5), edi('e1', 4, 4, 2, 2)];
    // Todos a distancia 0 del punto (5, 5): gana la unidad por prioridad.
    expect(entidadEn(es, 5, 5)?.id).toBe('u1');
    // Sin la unidad, gana el animal.
    expect(entidadEn([ani('a1', 5, 5), edi('e1', 4, 4, 2, 2)], 5, 5)?.id).toBe('a1');
    // Sin unidad ni animal, el edificio.
    expect(entidadEn([edi('e1', 4, 4, 2, 2)], 5, 5)?.id).toBe('e1');
  });

  it('una entidad claramente más cercana gana aunque sea de clase inferior', () => {
    // El edificio está encima del clic; la unidad a 0,7 tiles (dentro del radio, pero más lejos).
    const es = [uni('u1', 5.6, 5.6), edi('e1', 5, 5, 2, 2)];
    expect(entidadEn(es, 5.5, 5.5)?.id).toBe('e1');
  });

  it('el clic en suelo vacío no devuelve entidad (toca caja de selección)', () => {
    expect(entidadEn([uni('u1', 0, 0), edi('e1', 30, 30)], 15, 15)).toBeNull();
  });

  it('las candidatas salen ordenadas por distancia, prioridad e id (determinista)', () => {
    const es = [uni('u2', 5, 5), uni('u1', 5, 5), ani('a1', 5, 5)];
    expect(candidatas(es, 5, 5).map((e) => e.id)).toEqual(['u1', 'u2', 'a1']);
  });

  it('sin Mayús el clic reemplaza; Mayús/Ctrl suma y también quita', () => {
    let sel = alClic(SIN_SELECCION, uni('u1', 0, 0));
    expect(sel.ids).toEqual(['u1']);
    sel = alClic(sel, uni('u2', 1, 0));
    expect(sel.ids).toEqual(['u2']);
    sel = alClic(sel, uni('u3', 2, 0), { sumar: true });
    expect(sel.ids).toEqual(['u2', 'u3']);
    sel = alClic(sel, uni('u2', 1, 0), { sumar: true });
    expect(sel.ids).toEqual(['u3']);
  });

  it('un segundo clic sobre la única entidad seleccionada la deselecciona', () => {
    const u = uni('u1', 0, 0);
    const sel = alClic(alClic(SIN_SELECCION, u), u);
    expect(sel.ids).toEqual([]);
  });

  it('clic en el vacío deselecciona, pero con Mayús conserva', () => {
    const sel = seleccion(['u1']);
    expect(alClicVacio(sel).ids).toEqual([]);
    expect(alClicVacio(sel, { sumar: true }).ids).toEqual(['u1']);
  });

  it('la caja selecciona lo que cae dentro y respeta la huella de los edificios', () => {
    const es = [uni('u1', 2, 2), uni('u2', 8, 8), edi('e1', 4, 4, 2, 2)];
    // La caja (0,0)-(5,5) coge u1 y el edificio, pero no u2.
    expect(dentroDeCaja(edi('e1', 4, 4, 2, 2), 0, 0, 5, 5)).toBe(true);
    expect(enCaja(es, 0, 0, 5, 5).map((e) => e.id)).toEqual(['u1', 'e1']);
    // Las esquinas de la caja valen en cualquier orden.
    expect(enCaja(es, 5, 5, 0, 0).map((e) => e.id)).toEqual(['u1', 'e1']);
    // La caja sobre el vacío no cambia nada sin Mayús y no borra con Mayús.
    const sel = seleccion(['u1']);
    expect(alCaja(sel, es, 20, 20, 25, 25).ids).toEqual([]);
    expect(alCaja(sel, es, 20, 20, 25, 25, { sumar: true }).ids).toEqual(['u1']);
  });

  it('la caja con Mayús suma sin duplicar', () => {
    const es = [uni('u1', 2, 2), uni('u2', 3, 3)];
    const sel = seleccion(['u1', 'u9']);
    expect(alCaja(sel, es, 0, 0, 5, 5, { sumar: true }).ids).toEqual(['u1', 'u9', 'u2']);
  });

  it('el doble clic coge todos los del mismo tipo y clase', () => {
    const es = [uni('u1', 0, 0, 'campesino'), uni('u2', 5, 5, 'campesino'), uni('u3', 6, 6, 'soldado'), ani('a1', 1, 1)];
    expect(alDobleClic(es, 'u1').ids).toEqual(['u1', 'u2']);
    expect(alDobleClic(es, 'inexistente').ids).toEqual([]);
  });

  it('quitar, alternar y podar mantienen el orden', () => {
    const sel = seleccion(['a', 'b', 'c']);
    expect(quitar(sel, 'b').ids).toEqual(['a', 'c']);
    expect(quitar(sel, 'z')).toBe(sel);
    expect(alternar(sel, 'd').ids).toEqual(['a', 'b', 'c', 'd']);
    expect(alternar(sel, 'a').ids).toEqual(['b', 'c']);
    expect(podar(sel, existentes(['a', 'c'])).ids).toEqual(['a', 'c']);
    expect(podar(sel, existentes(['a', 'b', 'c']))).toBe(sel);
  });

  it('los grupos se guardan con Ctrl+1…9 y se recuperan descartando muertos', () => {
    const grupos: Grupos = new Map();
    guardarGrupo(grupos, 1, seleccion(['a', 'b']));
    expect(recuperarGrupo(grupos, 1, existentes(['a', 'b'])).ids).toEqual(['a', 'b']);
    // Un miembro muerto no se recupera.
    expect(recuperarGrupo(grupos, 1, existentes(['a'])).ids).toEqual(['a']);
    // Un slot vacío devuelve vacío sin fallar.
    expect(recuperarGrupo(grupos, 5, existentes(['a'])).ids).toEqual([]);
    // Guardar vacío olvida el slot.
    guardarGrupo(grupos, 1, SIN_SELECCION);
    expect(grupoVivo(grupos, 1, existentes(['a']))).toBe(false);
    // Un slot fuera de rango se ignora.
    guardarGrupo(grupos, 0, seleccion(['z']));
    expect(grupos.has(0)).toBe(false);
  });

  it('estaSeleccionada responde por id', () => {
    expect(estaSeleccionada(seleccion(['a', 'b']), 'b')).toBe(true);
    expect(estaSeleccionada(seleccion(['a', 'b']), 'c')).toBe(false);
  });
});
