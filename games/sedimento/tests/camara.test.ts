import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import {
  arrastreAPlano,
  avanzarOpacidad,
  cabeceoAutomatico,
  cabeceoMinimo,
  distanciaDeVista,
  distanciaLibre,
  edificiosQueTapan,
  empujeBorde,
  factorSuavizado,
  factorZoomRueda,
  movimientoRelativo,
  segmentoTocaCilindro,
  suavizarEstado,
  tiempoAsentamiento,
  velocidadPorDistancia,
  zoomRelativo,
  type EstadoSuavizable,
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

describe('suavizado exponencial (1 − e^(−k·dt))', () => {
  const cfg = tuning.render.camara;
  const nuevo = (): EstadoSuavizable => ({ x: 0, z: 0, dist: 50, guino: 0, incl: 0 });

  it('factorSuavizado: 0 sin tiempo, tiende a 1 con mucho y dos medios pasos equivalen a uno entero', () => {
    expect(factorSuavizado(10, 0)).toBe(0);
    expect(factorSuavizado(10, 100)).toBeCloseTo(1);
    const medio = factorSuavizado(10, 0.05);
    expect(1 - (1 - medio) * (1 - medio)).toBeCloseTo(factorSuavizado(10, 0.1));
  });

  it('se nota en el primer fotograma: a 60 fps la cámara ya recorre más del 10 % del camino', () => {
    for (const k of [cfg.suavizado, cfg.suavizadoGiro, cfg.suavizadoZoom]) {
      expect(factorSuavizado(k, 1 / 60)).toBeGreaterThan(0.1);
    }
  });

  it('la frenada dura menos de 0,25 s en posición, giro y zoom (95 % del recorrido)', () => {
    for (const k of [cfg.suavizado, cfg.suavizadoGiro, cfg.suavizadoZoom]) {
      expect(tiempoAsentamiento(k, 0.05)).toBeLessThan(0.25);
    }
    expect(tiempoAsentamiento(0, 0.05)).toBe(Infinity);
  });

  it('cada eje usa su propio ritmo: el giro más rápido que el zoom lento sale distinto', () => {
    const act = nuevo();
    const obj: EstadoSuavizable = { x: 10, z: 10, dist: 150, guino: 1, incl: 1 };
    suavizarEstado(act, obj, { suavizado: 2, suavizadoGiro: 20, suavizadoZoom: 6 }, 0.1);
    const avance = (v: number, ini: number, fin: number) => (v - ini) / (fin - ini);
    expect(avance(act.guino, 0, 1)).toBeGreaterThan(avance(act.dist, 50, 150));
    expect(avance(act.dist, 50, 150)).toBeGreaterThan(avance(act.x, 0, 10));
    expect(act.incl).toBeCloseTo(act.guino);
  });

  /** Mantiene W pulsada `pulsado` s y espera hasta `total` s, a los FPS indicados, como hace `entrada.actualizar`. */
  const recorrido = (fps: number, pulsado: number, total: number) => {
    const dt = 1 / fps;
    const act = nuevo();
    const obj = nuevo();
    const vel = velocidadPorDistancia(act.dist, tuning.render.camara);
    const avance = movimientoRelativo(1, 0, 0);
    const pasos = Math.round(total * fps);
    for (let i = 0; i < pasos; i++) {
      if (i < Math.round(pulsado * fps)) {
        obj.x += avance.x * vel * dt;
        obj.z += avance.z * vel * dt;
      }
      suavizarEstado(act, obj, cfg, dt);
    }
    return { act, obj };
  };

  it('el mismo recorrido a 30, 60 y 144 fps acaba en la misma posición (±1 %)', () => {
    const referencia = recorrido(144, 2, 3);
    expect(Math.abs(referencia.act.z)).toBeGreaterThan(10);
    for (const fps of [30, 60, 240]) {
      const otro = recorrido(fps, 2, 3);
      expect(Math.abs(otro.act.z - referencia.act.z)).toBeLessThan(Math.abs(referencia.act.z) * 0.01);
      expect(Math.abs(otro.act.x - referencia.act.x)).toBeLessThan(1e-9);
    }
  });

  it('también coincide en pleno movimiento, con la tecla aún pulsada (±1 %)', () => {
    const referencia = recorrido(144, 3, 2);
    const lento = recorrido(30, 3, 2);
    expect(Math.abs(lento.act.z - referencia.act.z)).toBeLessThan(Math.abs(referencia.act.z) * 0.01);
  });

  it('al soltar la tecla la cámara real alcanza a la deseada sin pasarse', () => {
    const { act, obj } = recorrido(60, 1, 3);
    expect(act.z).toBeCloseTo(obj.z, 3);
    expect(act.z).toBeGreaterThanOrEqual(obj.z - 1e-9);
  });
});

describe('distanciaLibre (la cámara no se mete bajo el terreno)', () => {
  const llano = () => 0;
  const objetivo = { x: 0, y: 0, z: 0 };
  const dir = { x: 0, y: Math.sin(0.8), z: Math.cos(0.8) }; // sube 0,8 rad hacia +z

  it('sobre suelo llano no acorta nada', () => {
    expect(distanciaLibre(llano, objetivo, dir, 40, 0.4, 28)).toBe(40);
  });

  it('con un cerro entre el objetivo y la cámara, se queda delante de él', () => {
    const cerro = (_x: number, z: number) => (z > 4 && z < 12 ? 30 : 0);
    const d = distanciaLibre(cerro, objetivo, dir, 40, 0.4, 28);
    expect(d).toBeLessThan(40);
    expect(d * dir.z).toBeLessThan(4.5);
    expect(d * dir.z).toBeGreaterThan(3);
  });

  it('el punto resultante siempre queda sobre la superficie más el margen', () => {
    const ondulado = (x: number, z: number) => 3 * Math.sin(x * 0.4) + 3 * Math.cos(z * 0.3) + 4;
    for (let giro = 0; giro < 6.3; giro += 0.37) {
      const o = { x: 10, y: ondulado(10, 5), z: 5 };
      const dd = { x: Math.sin(giro) * Math.cos(0.5), y: Math.sin(0.5), z: Math.cos(giro) * Math.cos(0.5) };
      const t = distanciaLibre(ondulado, o, dd, 60, 0.4, 28);
      if (t > 0) expect(o.y + dd.y * t).toBeGreaterThanOrEqual(ondulado(o.x + dd.x * t, o.z + dd.z * t) + 0.4 - 0.05);
    }
  });

});

describe('distanciaDeVista (acortar con suavidad)', () => {
  const cfg = { suavizadoAcortar: 16, suavizadoLiberar: 4, distanciaMinima: 2.5 };

  it('sin obstáculos converge a la distancia deseada', () => {
    let d = 10;
    for (let i = 0; i < 300; i++) d = distanciaDeVista(d, 40, 40, 40, cfg, 1 / 60);
    expect(d).toBeCloseTo(40, 1);
  });

  it('con un cerro se acerca sin saltos: acorta suave hacia el límite y nunca lo supera', () => {
    let d = 40;
    const pasos: number[] = [d];
    for (let i = 0; i < 60; i++) {
      // El cerro aún no toca el rayo (límite duro lejos), pero ya está cerca (límite blando): empieza a acortar.
      d = distanciaDeVista(d, 40, 12, 40, cfg, 1 / 60);
      pasos.push(d);
    }
    expect(Math.max(...pasos.slice(1))).toBeLessThanOrEqual(40);
    expect(pasos[1]).toBeGreaterThan(30);
    expect(d).toBeCloseTo(12, 1);
    for (let i = 1; i < pasos.length; i++) expect(pasos[i]).toBeLessThanOrEqual(pasos[i - 1] + 1e-9);
  });

  it('el límite duro se respeta en el mismo fotograma, aunque el suavizado aún no haya llegado', () => {
    expect(distanciaDeVista(40, 40, 12, 8, cfg, 1 / 60)).toBeLessThanOrEqual(8);
  });

  it('acorta más rápido de lo que se libera (al salir del obstáculo no rebota)', () => {
    const baja = distanciaDeVista(40, 40, 10, 10, cfg, 0.05);
    const sube = distanciaDeVista(10, 40, 40, 40, cfg, 0.05);
    expect(40 - baja).toBeGreaterThan(sube - 10);
  });

  it('nunca baja de la distancia mínima', () => {
    let d = 20;
    for (let i = 0; i < 200; i++) d = distanciaDeVista(d, 40, 0, 0, cfg, 1 / 60);
    expect(d).toBeGreaterThanOrEqual(2.5 - 1e-9);
  });

  it('la misma trayectoria a 30 y a 144 fps termina en el mismo sitio (±1 %)', () => {
    const correr = (fps: number) => {
      let d = 40;
      for (let i = 0; i < fps * 0.4; i++) d = distanciaDeVista(d, 40, 12, 9, cfg, 1 / fps);
      return d;
    };
    expect(Math.abs(correr(30) - correr(144))).toBeLessThan(0.15);
  });
});

describe('oclusión de edificios', () => {
  const casa = { x: 0, y: 0, z: 0, radio: 1, alto: 2 };

  it('un segmento que cruza la casa a su altura la toca; uno que pasa por encima o al lado, no', () => {
    expect(segmentoTocaCilindro({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, casa)).toBe(true);
    expect(segmentoTocaCilindro({ x: -5, y: 6, z: 0 }, { x: 5, y: 6, z: 0 }, casa)).toBe(false);
    expect(segmentoTocaCilindro({ x: -5, y: 1, z: 3 }, { x: 5, y: 1, z: 3 }, casa)).toBe(false);
  });

  it('un segmento que baja desde arriba solo toca si pasa sobre la casa a su altura', () => {
    expect(segmentoTocaCilindro({ x: -6, y: 8, z: 0 }, { x: 6, y: 0, z: 0 }, casa)).toBe(false);
    expect(segmentoTocaCilindro({ x: -6, y: 4, z: 0 }, { x: 6, y: 0, z: 0 }, casa)).toBe(true);
  });

  it('un segmento que acaba antes de llegar a la casa no la toca', () => {
    expect(segmentoTocaCilindro({ x: -9, y: 1, z: 0 }, { x: -3, y: 1, z: 0 }, casa)).toBe(false);
  });

  it('solo marca los que tapan; el edificio que se está mirando (bajo el objetivo) no se atenúa', () => {
    const cuerpos = [
      { x: 0, y: 0, z: 0, radio: 1, alto: 2 },
      { x: 0, y: 0, z: 9, radio: 1, alto: 2 },
      { x: 4, y: 0, z: 0, radio: 1, alto: 2 },
    ];
    const r = edificiosQueTapan({ x: -6, y: 1, z: 0 }, { x: 4, y: 1, z: 0 }, cuerpos, 0, new Uint8Array(3));
    expect([...r]).toEqual([1, 0, 0]);
  });

  it('el margen atenúa un poco antes de rozar el edificio', () => {
    const cuerpos = [{ x: 0, y: 0, z: 1.3, radio: 1, alto: 2 }];
    const camara = { x: -6, y: 1, z: 0 };
    const objetivo = { x: 6, y: 1, z: 0 };
    expect(edificiosQueTapan(camara, objetivo, cuerpos, 0, new Uint8Array(1))[0]).toBe(0);
    expect(edificiosQueTapan(camara, objetivo, cuerpos, 0.5, new Uint8Array(1))[0]).toBe(1);
  });

  it('la transición de opacidad es suave y llega a su destino', () => {
    let o = 1;
    o = avanzarOpacidad(o, 0.2, 10, 1 / 60);
    expect(o).toBeLessThan(1);
    expect(o).toBeGreaterThan(0.8);
    for (let i = 0; i < 120; i++) o = avanzarOpacidad(o, 0.2, 10, 1 / 60);
    expect(o).toBeCloseTo(0.2, 3);
  });

  it('la transición de opacidad acaba igual a 30 que a 144 fps (±1 %)', () => {
    const correr = (fps: number) => {
      let o = 1;
      for (let i = 0; i < fps * 0.3; i++) o = avanzarOpacidad(o, 0.2, 10, 1 / fps);
      return o;
    };
    expect(Math.abs(correr(30) - correr(144))).toBeLessThan(0.01);
  });
});

describe('distanciaLibre con el objetivo pegado al suelo', () => {
  it('con la cámara tumbada a 20° sobre suelo llano no acorta (el margen crece con la distancia)', () => {
    const dir = { x: 0, y: Math.sin(Math.PI / 9), z: Math.cos(Math.PI / 9) };
    expect(distanciaLibre(() => 0, { x: 0, y: 0, z: 0 }, dir, 30, 0.4, 28)).toBe(30);
    expect(distanciaLibre(() => 0, { x: 0, y: 0, z: 0 }, dir, 30, 1.6, 28)).toBe(30);
  });

  it('una ladera que sube hacia la cámara sí acorta, aunque sea suave', () => {
    const dir = { x: 0, y: Math.sin(Math.PI / 9), z: Math.cos(Math.PI / 9) };
    const ladera = (_x: number, z: number) => Math.max(0, z) * 0.6;
    expect(distanciaLibre(ladera, { x: 0, y: 0, z: 0 }, dir, 30, 0.4, 28)).toBeLessThan(5);
  });
});
