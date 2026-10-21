import { describe, expect, it } from 'vitest';
import { centroDeUnidades, ordenDeGrupo, velocidadDeGrupo } from '../src/logic/ordenesGrupo';
import { crearCiudadano } from '../src/logic/ciudadano';
import { colocarEstructura, crearOcupacionVacia } from '../src/logic/ocupacion';
import { FORMACIONES } from '../src/logic/formaciones';
import { sinSolapes, todosPisables } from '../src/logic/formaciones';
import { violacionesCiudadanos } from '../src/logic/ciudadano';

const limpia = (n = 60) => crearOcupacionVacia(n, n);
function grupo(_oc: ReturnType<typeof limpia>, n: number): ReturnType<typeof crearCiudadano>[] {
  const out = [];
  for (let i = 0; i < n; i++) out.push(crearCiudadano(`u${i}`, 5 + (i % 5), 5 + Math.floor(i / 5), null, 0));
  return out;
}

describe('órdenes de grupo (P5, R51, §5)', () => {
  it('el centro del grupo es la media redondeada de sus unidades', () => {
    const oc = limpia();
    expect(centroDeUnidades(grupo(oc, 4))).toEqual({ u: 7, v: 5 });
    expect(centroDeUnidades([])).toEqual({ u: 0, v: 0 });
  });

  it('la orden mueve a todo el grupo con destinos pisables y sin solapes', () => {
    const oc = limpia();
    const cs = grupo(oc, 8);
    for (const f of FORMACIONES) {
      const r = ordenDeGrupo(cs, oc, f, { u: 30, v: 30 });
      expect(r.movidas).toBe(8);
      expect(r.sinRuta).toBe(0);
      expect(sinSolapes(r.destinos)).toBe(true);
      expect(todosPisables(oc, r.destinos)).toBe(true);
    }
  });

  it('las unidades quedan en estado `andar` con ruta, sin pisar celdas bloqueadas', () => {
    const oc = limpia();
    const cs = grupo(oc, 10);
    ordenDeGrupo(cs, oc, 'cuadro', { u: 30, v: 30 });
    for (const ci of cs) expect(ci.estado).toBe('andar');
    expect(violacionesCiudadanos(cs, oc)).toBe(0);
  });

  it('un muro entre el grupo y el destino no impide llegar: el A* lo rodea', () => {
    const oc = limpia();
    // Muro vertical de v=20 a v=40 en u=20, con un hueco en v=10.
    for (let v = 20; v <= 40; v++) colocarEstructura(oc, `m${v}`, { w: 1, d: 1 }, 20, v);
    const cs = grupo(oc, 4);
    const r = ordenDeGrupo(cs, oc, 'columna', { u: 30, v: 25 });
    expect(r.movidas).toBe(4);
    for (const ci of cs) expect(ci.ruta).not.toBeNull();
  });

  it('sin sitio para todos, las que no caben quedan sin ruta pero ninguna recibe un destino imposible', () => {
    const oc = limpia();
    const cs = grupo(oc, 30);
    const r = ordenDeGrupo(cs, oc, 'cuadro', { u: 30, v: 30 });
    expect(r.movidas + r.sinRuta).toBe(30);
    expect(sinSolapes(r.destinos)).toBe(true);
    expect(todosPisables(oc, r.destinos)).toBe(true);
  });

  it('la velocidad del grupo es la del más lento', () => {
    expect(velocidadDeGrupo([0.08, 0.04, 0.1])).toBe(0.04);
    expect(velocidadDeGrupo([])).toBe(0.04);
  });
});
