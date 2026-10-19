import { describe, expect, it } from 'vitest';
import { SIN_HERRAMIENTA, TEXTO_MOTIVO, transicion, type Herramienta } from '../src/logic/herramienta';

const PASO = Math.PI / 12;

describe('herramienta de construcción', () => {
  it('elegir un edificio activa la colocación con giro 0', () => {
    expect(transicion(SIN_HERRAMIENTA, { tipo: 'elegir', edificio: 'casa' }, PASO)).toEqual({ modo: 'colocar', tipo: 'casa', giro: 0 });
  });

  it('Z/X giran en pasos y el giro vuelve a 0 tras una vuelta completa', () => {
    let h: Herramienta = transicion(SIN_HERRAMIENTA, { tipo: 'elegir', edificio: 'casa' }, PASO);
    h = transicion(h, { tipo: 'girar', pasos: 1 }, PASO);
    expect(h.modo === 'colocar' && h.giro).toBeCloseTo(PASO);
    h = transicion(h, { tipo: 'girar', pasos: -2 }, PASO);
    expect(h.modo === 'colocar' && h.giro).toBeCloseTo(Math.PI * 2 - PASO);
    for (let k = 0; k < 25; k++) h = transicion(h, { tipo: 'girar', pasos: 1 }, PASO);
    expect(h.modo === 'colocar' && h.giro).toBeCloseTo(0, 9);
  });

  it('cambiar de edificio conserva el giro; elegir el mismo lo suelta', () => {
    let h: Herramienta = transicion(SIN_HERRAMIENTA, { tipo: 'elegir', edificio: 'casa' }, PASO);
    h = transicion(h, { tipo: 'girar', pasos: 3 }, PASO);
    h = transicion(h, { tipo: 'elegir', edificio: 'almacen' }, PASO);
    expect(h).toMatchObject({ modo: 'colocar', tipo: 'almacen' });
    expect(h.modo === 'colocar' && h.giro).toBeCloseTo(3 * PASO);
    expect(transicion(h, { tipo: 'elegir', edificio: 'almacen' }, PASO)).toEqual(SIN_HERRAMIENTA);
  });

  it('Esc cancela; tras colocar se sigue colocando salvo que se pida soltar', () => {
    const h = transicion(SIN_HERRAMIENTA, { tipo: 'elegir', edificio: 'choza' }, PASO);
    expect(transicion(h, { tipo: 'cancelar' }, PASO)).toEqual(SIN_HERRAMIENTA);
    expect(transicion(h, { tipo: 'colocado', soltar: false }, PASO)).toBe(h);
    expect(transicion(h, { tipo: 'colocado', soltar: true }, PASO)).toEqual(SIN_HERRAMIENTA);
  });

  it('girar sin herramienta no hace nada', () => {
    expect(transicion(SIN_HERRAMIENTA, { tipo: 'girar', pasos: 1 }, PASO)).toBe(SIN_HERRAMIENTA);
  });

  it('cada motivo de rechazo tiene texto para el jugador', () => {
    for (const m of ['fuera-del-mapa', 'ocupado', 'agua', 'pendiente', 'terreno', 'poco-fertil', 'lejos-del-agua', 'sin-agua-al-lado', 'sin-arcilla-al-lado']) expect(TEXTO_MOTIVO[m]).toBeTruthy();
  });
});
