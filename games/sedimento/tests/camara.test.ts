import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import {
  aMundo, arrastrar, desplazar, direccionBordes, limitarCentro, limitesMundo, pasoZoom, zoomHaciaCursor,
  type EstadoCamara,
} from '../src/logic/camara';

const vista = { ancho: 960, alto: 540 };
const pasos = tuning.camara.zoomPasos;
const lim = limitesMundo(64, 64, { ancho: 32, alto: 16 }, tuning.camara.margenLimitePx);
const centro: EstadoCamara = { x: 0, y: 512, zoom: 1 };

describe('límites del mapa', () => {
  it('el mapa de 64×64 tiles mide 2048×1024 px y los límites añaden el margen', () => {
    expect(lim).toEqual({ minX: -1024 - 64, maxX: 1024 + 64, minY: -64, maxY: 1024 + 64 });
  });

  it('un mapa rectangular (u≠v) se extiende más hacia el lado largo y el relieve sube el límite superior', () => {
    const l = limitesMundo(80, 60, { ancho: 32, alto: 16 }, 0, 100);
    expect(l).toEqual({ minX: -960, maxX: 1280, minY: -100, maxY: 1120 });
  });

  it('la vista no sale de los límites en ningún lado', () => {
    for (const zoom of pasos) {
      for (const [x, y] of [[-9999, -9999], [9999, 9999], [-9999, 9999], [9999, -9999]]) {
        const e = limitarCentro({ x, y, zoom }, vista, lim);
        expect(e.x - vista.ancho / zoom / 2).toBeGreaterThanOrEqual(lim.minX - 1e-9);
        expect(e.x + vista.ancho / zoom / 2).toBeLessThanOrEqual(lim.maxX + 1e-9);
        expect(e.y - vista.alto / zoom / 2).toBeGreaterThanOrEqual(lim.minY - 1e-9);
        expect(e.y + vista.alto / zoom / 2).toBeLessThanOrEqual(lim.maxY + 1e-9);
      }
    }
  });

  it('si el mundo es más pequeño que la vista, se centra en él', () => {
    const chico = limitesMundo(4, 4, { ancho: 32, alto: 16 }, 0);
    const e = limitarCentro({ x: 500, y: -300, zoom: 1 }, vista, chico);
    expect(e).toEqual({ x: 0, y: 32, zoom: 1 });
  });
});

describe('arrastrar con el botón central', () => {
  it('el mapa sigue al ratón: arrastrar a la derecha mueve el centro a la izquierda', () => {
    const e = arrastrar(centro, 100, 40, vista, lim);
    expect(e.x).toBe(-100);
    expect(e.y).toBe(472);
  });

  it('a zoom ×2 el mismo arrastre mueve la mitad en el mundo', () => {
    const e = arrastrar({ ...centro, zoom: 2 }, 100, 0, vista, lim);
    expect(e.x).toBe(-50);
  });

  it('no se pasa del borde', () => {
    expect(arrastrar(centro, -99999, 0, vista, lim).x).toBe(lim.maxX - 480);
  });
});

describe('desplazamiento con teclas y bordes', () => {
  it('la velocidad en pantalla es la misma a cualquier zoom (en el mundo, menor al acercar)', () => {
    const v = tuning.camara.velocidadTeclado;
    expect(desplazar(centro, { x: 1, y: 0 }, v, 1, vista, lim).x).toBeCloseTo(v, 6);
    expect(desplazar({ ...centro, zoom: 4 }, { x: 1, y: 0 }, v, 1, vista, lim).x).toBeCloseTo(v / 4, 6);
  });

  it('la diagonal no va más rápida que un eje', () => {
    const v = 400;
    const e = desplazar(centro, { x: 1, y: 1 }, v, 1, vista, lim);
    expect(Math.hypot(e.x - centro.x, e.y - centro.y)).toBeCloseTo(v, 6);
  });

  it('el recorrido depende del delta, no de los fps', () => {
    const v = 300;
    const uno = desplazar(centro, { x: 1, y: 0 }, v, 0.1, vista, lim);
    let varios = centro;
    for (let i = 0; i < 10; i++) varios = desplazar(varios, { x: 1, y: 0 }, v, 0.01, vista, lim);
    expect(varios.x).toBeCloseTo(uno.x, 6);
  });

  it('sin dirección no se mueve', () => {
    expect(desplazar(centro, { x: 0, y: 0 }, 500, 1, vista, lim)).toBe(centro);
  });

  it('los bordes del lienzo dan la dirección; el centro, ninguna', () => {
    expect(direccionBordes(0, 270, vista, 6)).toEqual({ x: -1, y: 0 });
    expect(direccionBordes(959, 270, vista, 6)).toEqual({ x: 1, y: 0 });
    expect(direccionBordes(480, 0, vista, 6)).toEqual({ x: 0, y: -1 });
    expect(direccionBordes(955, 539, vista, 6)).toEqual({ x: 1, y: 1 });
    expect(direccionBordes(480, 270, vista, 6)).toEqual({ x: 0, y: 0 });
  });
});

describe('zoom por pasos enteros hacia el cursor', () => {
  it('los pasos son enteros y crecientes', () => {
    expect(pasos.every((p) => Number.isInteger(p))).toBe(true);
    expect([...pasos].sort((a, b) => a - b)).toEqual(pasos);
  });

  it('pasoZoom sube, baja y se queda en los extremos', () => {
    expect(pasoZoom(pasos, 1, 1)).toBe(2);
    expect(pasoZoom(pasos, 2, -1)).toBe(1);
    expect(pasoZoom(pasos, 1, -1)).toBe(1);
    expect(pasoZoom(pasos, pasos[pasos.length - 1], 1)).toBe(pasos[pasos.length - 1]);
  });

  it('el punto del mapa bajo el cursor no se mueve al acercar ni al alejar', () => {
    for (const [px, py] of [[480, 270], [100, 80], [850, 460], [700, 120]]) {
      const antes = aMundo(centro, vista, px, py);
      const acercado = zoomHaciaCursor(centro, 1, px, py, vista, pasos, lim);
      expect(acercado.zoom).toBe(2);
      const despues = aMundo(acercado, vista, px, py);
      expect(despues.x).toBeCloseTo(antes.x, 6);
      expect(despues.y).toBeCloseTo(antes.y, 6);
      const alejado = zoomHaciaCursor(acercado, -1, px, py, vista, pasos, lim);
      expect(aMundo(alejado, vista, px, py).x).toBeCloseTo(antes.x, 6);
    }
  });

  it('en el extremo no cambia nada', () => {
    const e = zoomHaciaCursor(centro, -1, 480, 270, vista, pasos, lim);
    expect(e).toBe(centro);
  });

  it('cerca del borde del mapa los límites mandan sobre el cursor', () => {
    const esquina: EstadoCamara = { x: lim.minX + 480, y: 512, zoom: 1 };
    const e = zoomHaciaCursor(esquina, 1, 0, 270, vista, pasos, lim);
    expect(e.x - vista.ancho / e.zoom / 2).toBeGreaterThanOrEqual(lim.minX - 1e-9);
  });
});
