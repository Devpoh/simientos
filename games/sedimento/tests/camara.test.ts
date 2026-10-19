import { describe, expect, it } from 'vitest';
import {
  arrastreAPlano,
  cabeceoAutomatico,
  cabeceoMinimo,
  empujeBorde,
  factorZoomRueda,
  movimientoRelativo,
  velocidadPorDistancia,
  zoomRelativo,
} from '../src/logic/camara';

const velocidad = { velocidadPan: 0.8, velocidadAdaptativa: true, exponenteVelocidad: 0.9, distanciaReferencia: 30 };

describe('movimientoRelativo (WASD relativo al giro)', () => {
  it('con giro 0, W va hacia -z y D hacia +x', () => {
    const w = movimientoRelativo(1, 0, 0);
    expect(w.x).toBeCloseTo(0);
    expect(w.z).toBeCloseTo(-1);
    const d = movimientoRelativo(0, 1, 0);
    expect(d.x).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });

  it('con la cámara girada, W sigue avanzando hacia donde mira', () => {
    // Con 90° la cámara mira hacia -x: delante = (-1, 0).
    const w = movimientoRelativo(1, 0, Math.PI / 2);
    expect(w.x).toBeCloseTo(-1);
    expect(w.z).toBeCloseTo(0);
    // Con 180° mira hacia +z.
    const atras = movimientoRelativo(1, 0, Math.PI);
    expect(atras.z).toBeCloseTo(1);
  });

  it('la diagonal está normalizada: no es más rápida que un eje', () => {
    for (const giro of [0, 0.7, 2, 4]) {
      const recto = movimientoRelativo(1, 0, giro);
      const diagonal = movimientoRelativo(1, 1, giro);
      expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(Math.hypot(recto.x, recto.z));
      expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1);
    }
  });

  it('sin entrada no se mueve, y una entrada opuesta se anula', () => {
    expect(movimientoRelativo(0, 0, 1.3)).toEqual({ x: 0, z: 0 });
    const nulo = movimientoRelativo(0.4 - 0.4, 0.2 - 0.2, 1);
    expect(nulo).toEqual({ x: 0, z: 0 });
  });

  it('reutiliza el objeto de salida (sin crear basura por frame)', () => {
    const salida = { x: 9, z: 9 };
    expect(movimientoRelativo(1, 0, 0, salida)).toBe(salida);
  });
});

describe('velocidadPorDistancia', () => {
  it('a la distancia de referencia da velocidadPan × referencia', () => {
    expect(velocidadPorDistancia(30, velocidad)).toBeCloseTo(0.8 * 30);
  });

  it('crece con la distancia pero menos que proporcionalmente (exponente 0,9)', () => {
    const cerca = velocidadPorDistancia(10, velocidad);
    const lejos = velocidadPorDistancia(100, velocidad);
    expect(lejos).toBeGreaterThan(cerca);
    expect(lejos / cerca).toBeLessThan(10);
    expect(lejos / cerca).toBeCloseTo(Math.pow(10, 0.9));
  });

  it('es continua: sin escalones al pasar de una distancia a otra', () => {
    let anterior = velocidadPorDistancia(5, velocidad);
    for (let d = 5.5; d <= 200; d += 0.5) {
      const v = velocidadPorDistancia(d, velocidad);
      expect(v - anterior).toBeGreaterThan(0);
      expect(v - anterior).toBeLessThan(0.5);
      anterior = v;
    }
  });

  it('si se desactiva la adaptación, es constante', () => {
    const fija = { ...velocidad, velocidadAdaptativa: false };
    expect(velocidadPorDistancia(5, fija)).toBe(velocidadPorDistancia(500, fija));
  });
});

describe('inclinación según el zoom', () => {
  const cerca = (45 * Math.PI) / 180;
  const lejos = (65 * Math.PI) / 180;

  it('interpola de oblicua (cerca) a alta (lejos)', () => {
    expect(cabeceoAutomatico(0, cerca, lejos)).toBeCloseTo(cerca);
    expect(cabeceoAutomatico(1, cerca, lejos)).toBeCloseTo(lejos);
    const medio = cabeceoAutomatico(0.5, cerca, lejos);
    expect(medio).toBeGreaterThan(cerca);
    expect(medio).toBeLessThan(lejos);
  });

  it('el cabeceo mínimo interpola entre el de cerca y el de lejos', () => {
    expect(cabeceoMinimo(0, 0.3, 0.5)).toBeCloseTo(0.3);
    expect(cabeceoMinimo(1, 0.3, 0.5)).toBeCloseTo(0.5);
  });

  it('zoomRelativo se acota entre 0 y 1', () => {
    expect(zoomRelativo(2, 6, 100)).toBe(0);
    expect(zoomRelativo(500, 6, 100)).toBe(1);
    expect(zoomRelativo(53, 6, 100)).toBeCloseTo(0.5);
  });
});

describe('empujeBorde (desplazamiento al llevar el ratón al borde)', () => {
  it('no empuja en el centro ni dentro del margen', () => {
    expect(empujeBorde(400, 300, 800, 600, 12)).toEqual({ x: 0, z: 0 });
    expect(empujeBorde(12, 300, 800, 600, 12)).toEqual({ x: 0, z: 0 });
  });

  it('empuja con más fuerza cuanto más cerca del borde', () => {
    expect(empujeBorde(0, 300, 800, 600, 12).x).toBeCloseTo(-1);
    expect(empujeBorde(6, 300, 800, 600, 12).x).toBeCloseTo(-0.5);
    expect(empujeBorde(800, 300, 800, 600, 12).x).toBeCloseTo(1);
    expect(empujeBorde(400, 0, 800, 600, 12).z).toBeCloseTo(-1);
    expect(empujeBorde(400, 600, 800, 600, 12).z).toBeCloseTo(1);
  });

  it('en una esquina empuja en las dos direcciones', () => {
    const e = empujeBorde(0, 0, 800, 600, 12);
    expect(e.x).toBeCloseTo(-1);
    expect(e.z).toBeCloseTo(-1);
  });

  it('con margen 0 (desactivado) nunca empuja', () => {
    expect(empujeBorde(0, 0, 800, 600, 0)).toEqual({ x: 0, z: 0 });
  });
});

describe('arrastreAPlano', () => {
  it('arrastrar a la derecha mueve el punto de mira a la izquierda (el suelo sigue al cursor)', () => {
    const m = arrastreAPlano(10, 0, 0.1, 1, 0);
    expect(m.x).toBeCloseTo(-1);
    expect(m.z).toBeCloseTo(0);
  });

  it('respeta el giro: con 90° el mismo arrastre desplaza en z', () => {
    const m = arrastreAPlano(10, 0, 0.1, 1, Math.PI / 2);
    expect(m.x).toBeCloseTo(0);
    expect(m.z).toBeCloseTo(1);
  });

  it('con la cámara muy tumbada el arrastre vertical no se dispara', () => {
    const m = arrastreAPlano(0, 10, 0.1, 0, 0);
    expect(Number.isFinite(m.z)).toBe(true);
    expect(Math.abs(m.z)).toBeLessThanOrEqual(10);
  });
});

describe('factorZoomRueda', () => {
  it('hacia abajo aleja (factor > 1) y hacia arriba acerca', () => {
    expect(factorZoomRueda(100, 1, 0.0016, 1, false)).toBeGreaterThan(1);
    expect(factorZoomRueda(-100, 1, 0.0016, 1, false)).toBeLessThan(1);
  });

  it('invertir cambia el sentido y el pellizco multiplica la fuerza', () => {
    expect(factorZoomRueda(100, 1, 0.0016, 1, true)).toBeLessThan(1);
    expect(factorZoomRueda(100, 1, 0.0016, 4, false)).toBeGreaterThan(factorZoomRueda(100, 1, 0.0016, 1, false));
  });

  it('un paso hacia delante y otro hacia atrás se compensan', () => {
    expect(factorZoomRueda(120, 1, 0.0016, 1, false) * factorZoomRueda(-120, 1, 0.0016, 1, false)).toBeCloseTo(1);
  });
});
