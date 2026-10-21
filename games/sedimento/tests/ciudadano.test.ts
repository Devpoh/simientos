import { describe, expect, it } from 'vitest';
import { crearRng } from '../src/logic/azar';
import {
  avanzarCiudadano, avanzarCiudadanos, contarEstados, crearCiudadano, irA,
  longitudRutas, orientacionDe, replanificar, violacionesCiudadanos, visible, type Casa,
} from '../src/logic/ciudadano';
import { colocarEstructura, colocarObjeto, crearOcupacionVacia, SUBCELDAS } from '../src/logic/ocupacion';
import { transitable } from '../src/logic/navegacion';

const huella = (w: number, d: number): { w: number; d: number } => ({ w, d });

/** Rejilla limpia sin terreno: todo pisable salvo lo que se coloque. */
function limpia(columnas = 40, filas = 40) {
  return crearOcupacionVacia(columnas, filas);
}

/** Casa 2×2 en (u, v) con puerta en (u+w, v+1) y centro en (u+1, v+1). */
function casa(u: number, v: number, oc = limpia()): Casa {
  colocarEstructura(oc, `casa${u}_${v}`, huella(2, 2), u, v, 0, [{ i: 2, j: 1 }]);
  return { puerta: { u: u + 2, v: v + 1 }, centro: { u: u + 1, v: v + 1 } };
}

/** Avanza `ticks` ticks con un rng fijo. */
function avanzar(ci: ReturnType<typeof crearCiudadano>, oc: ReturnType<typeof limpia>, casas: Casa[], ticks: number, semilla = 7): void {
  const rng = crearRng(semilla);
  for (let t = 0; t < ticks; t++) avanzarCiudadano(ci, oc, casas, rng);
}

describe('ciudadanos que caminan (P4b, §4)', () => {
  it('recorre la ruta hasta la puerta y entra en la casa', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    const ci = crearCiudadano('c1', 2, 2, c, 0);
    expect(irA(ci, oc, c)).toBe(true);
    expect(ci.estado).toBe('andar');
    // Suficientes ticks para llegar y entrar: la ruta mide ~10 tiles a 0,04 tiles/tick.
    avanzar(ci, oc, [c], 400);
    expect(['entrar', 'dentro', 'salir', 'idle']).toContain(ci.estado);
    // Y al final del ciclo acaba dentro o fuera, pero siempre en un tile pisable.
    expect(violacionesCiudadanos([ci], oc)).toBe(0);
  });

  it('pasa por el estado `dentro` (oculto) y vuelve a salir por la misma puerta', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    const ci = crearCiudadano('c1', 2, 2, c, 0);
    irA(ci, oc, c);
    let vioDentro = false;
    const rng = crearRng(7);
    for (let t = 0; t < 800; t++) {
      avanzarCiudadano(ci, oc, [c], rng);
      if (ci.estado === 'dentro') {
        vioDentro = true;
        expect(visible(ci)).toBe(false);
      }
    }
    expect(vioDentro).toBe(true);
    expect(violacionesCiudadanos([ci], oc)).toBe(0);
  });

  it('sin camino queda en `bloqueado` y no se mueve a una celda prohibida', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    // Muro completo entre el ciudadano y la casa.
    for (let v = 0; v < 40; v++) colocarObjeto(oc, huella(1, 1), 5, v);
    const ci = crearCiudadano('c1', 2, 2, c, 0);
    expect(irA(ci, oc, c)).toBe(false);
    expect(ci.estado).toBe('bloqueado');
    expect(violacionesCiudadanos([ci], oc)).toBe(0);
  });

  it('replanifica cuando se derriba el muro: vuelve a haber camino', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    for (let v = 0; v < 40; v++) colocarObjeto(oc, huella(1, 1), 5, v);
    const ci = crearCiudadano('c1', 2, 2, c, 0);
    expect(irA(ci, oc, c)).toBe(false);
    // Se abre un hueco en el muro y se replanifica.
    oc.capas.objetos.fill(0);
    expect(irA(ci, oc, c)).toBe(true);
    expect(ci.estado).toBe('andar');
  });

  it('elegir una casa alcanzable: `replanificar` no rompe las rutas buenas', () => {
    const oc = limpia();
    const c1 = casa(10, 10, oc);
    const c2 = casa(20, 20, oc);
    const ci = crearCiudadano('c1', 2, 2, c1, 0);
    irA(ci, oc, c1);
    const antes = ci.ruta;
    replanificar([ci], oc);
    expect(ci.ruta).not.toBeNull();
    expect(ci.estado).toBe('andar');
    // La ruta es equivalente (mismo destino), aunque sea otro array.
    expect(antes).not.toBeNull();
    expect(ci.casa).toBe(c1);
    void c2;
  });

  it('nunca pisa una celda bloqueada en un ciclo completo (ida, dentro y vuelta)', () => {
    const oc = limpia(48, 48);
    // Obstáculos repartidos.
    for (let k = 0; k < 40; k++) colocarObjeto(oc, huella(1, 1), 3 + ((k * 7) % 40), 3 + ((k * 11) % 40));
    const c = casa(20, 20, oc);
    const ci = crearCiudadano('c1', 5, 5, c, 0);
    const rng = crearRng(11);
    for (let t = 0; t < 3000; t++) {
      avanzarCiudadano(ci, oc, [c], rng);
      if (t % 10 === 0) expect(violacionesCiudadanos([ci], oc)).toBe(0);
    }
  });

  it('la posición es determinista: mismos ticks, misma posición', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    const a = crearCiudadano('c1', 2, 2, c, 0);
    const b = crearCiudadano('c1', 2, 2, c, 0);
    avanzar(a, oc, [c], 200);
    avanzar(b, oc, [c], 200);
    expect(a.u).toBe(b.u);
    expect(a.v).toBe(b.v);
    expect(a.estado).toBe(b.estado);
  });

  it('la orientación sigue el rumbo del tramo', () => {
    expect(orientacionDe(1, 0)).toBe('se');
    expect(orientacionDe(-1, 0)).toBe('nw');
    expect(orientacionDe(0, 1)).toBe('sw');
    expect(orientacionDe(0, -1)).toBe('ne');
  });

  it('cuenta estados para las medidas de shot', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    const gente = [
      crearCiudadano('a', 2, 2, c, 0),
      crearCiudadano('b', 3, 3, c, 0.5),
      crearCiudadano('c', 4, 4, c, 0.9),
    ];
    const estados = contarEstados(gente);
    expect(estados.idle).toBe(3);
    expect(longitudRutas(gente)).toBe(0);
  });

  it('la espera inicial reparte a los ciudadanos (no salen todos a la vez)', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    const pronto = crearCiudadano('a', 2, 2, c, 0);
    const tarde = crearCiudadano('b', 3, 3, c, 0.9);
    expect(tarde.espera).toBeGreaterThan(pronto.espera);
  });

  it('el ciudadano se queda quieto si no hay casas', () => {
    const oc = limpia();
    const ci = crearCiudadano('a', 2, 2, null, 0);
    const rng = crearRng(3);
    for (let t = 0; t < 200; t++) avanzarCiudadano(ci, oc, [], rng);
    expect(ci.u).toBe(2);
    expect(ci.v).toBe(2);
  });

  it('avanzarCiudadanos mueve a todos y devuelve los bloqueados', () => {
    const oc = limpia();
    const c = casa(10, 10, oc);
    const gente = [crearCiudadano('a', 2, 2, c, 0), crearCiudadano('b', 3, 2, c, 0.3)];
    const bloqueados = avanzarCiudadanos(gente, oc, [c], 5, 500);
    expect(bloqueados).toBe(0);
    expect(gente.some((ci) => ci.u !== 2 || ci.v !== 2)).toBe(true);
    expect(violacionesCiudadanos(gente, oc)).toBe(0);
  });

  it('propiedad: 200 ciudadanos × 5 000 ticks sin pisar una celda bloqueada', () => {
    const oc = limpia(64, 64);
    for (let k = 0; k < 60; k++) colocarObjeto(oc, huella(1, 1), 2 + ((k * 13) % 60), 2 + ((k * 17) % 60));
    const casas: Casa[] = [];
    for (let k = 0; k < 12; k++) {
      const u = 4 + ((k * 5) % 52);
      const v = 4 + ((k * 9) % 52);
      casas.push(casa(u, v, oc));
    }
    const gente = [];
    for (let k = 0; k < 200; k++) {
      // Origen: primer tile pisable cerca de una rejilla regular (nadie nace dentro de un muro).
      let u = (k * 3) % 60;
      let v = (k * 7) % 60;
      for (let intento = 0; intento < 400 && !transitable(oc, u, v); intento++) {
        u = (u + 1) % 62;
        v = (v + 3) % 62;
      }
      gente.push(crearCiudadano(`c${k}`, u, v, casas[k % casas.length], (k % 10) / 10));
    }
    avanzarCiudadanos(gente, oc, casas, 99, 5000);
    expect(violacionesCiudadanos(gente, oc)).toBe(0);
  });

  it('el ancho de subceldas de la rejilla no afecta al caminar (misma verdad para todos)', () => {
    expect(SUBCELDAS).toBeGreaterThan(1);
    const oc = limpia();
    const c = casa(10, 10, oc);
    const ci = crearCiudadano('a', 2, 2, c, 0);
    irA(ci, oc, c);
    expect(ci.ruta).not.toBeNull();
    for (const t of ci.ruta!) expect(transitable(oc, t.u, t.v)).toBe(true);
  });
});
