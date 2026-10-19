import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { costeCamino, trazarCamino, velocidadEn, type Camino, type ConfigCaminos, type MundoCaminos } from '../src/logic/caminos';

const cfg: ConfigCaminos = tuning.caminos;

/** Mundo de prueba: una rampa (`pendiente` por unidad de x) y, si se pide, una franja de agua en x ∈ [x0, x1]. */
function mundoPrueba(pendiente = 0, franjaAgua?: [number, number]): MundoCaminos {
  return {
    alturaEn: (x) => x * pendiente,
    aguaEn: (x) => (franjaAgua && x >= franjaAgua[0] && x <= franjaAgua[1] ? 0 : NaN),
  };
}

describe('trazarCamino', () => {
  it('menos de 2 puntos clave: pocos-puntos', () => {
    const t = mundoPrueba();
    expect(trazarCamino([], t, cfg)).toEqual({ ok: false, motivo: 'pocos-puntos' });
    expect(trazarCamino([{ x: 0, z: 0 }], t, cfg)).toEqual({ ok: false, motivo: 'pocos-puntos' });
  });

  it('más corto que longitudMin: muy-corto', () => {
    const t = mundoPrueba();
    const r = trazarCamino([{ x: 0, z: 0 }, { x: 0.1, z: 0 }], t, cfg);
    expect(r).toEqual({ ok: false, motivo: 'muy-corto' });
  });

  it('cruza una franja de agua: agua', () => {
    const t = mundoPrueba(0, [5, 6]);
    const r = trazarCamino([{ x: 0, z: 0 }, { x: 10, z: 0 }], t, cfg);
    expect(r).toEqual({ ok: false, motivo: 'agua' });
  });

  it('pendiente por encima de pendienteMax: pendiente', () => {
    const t = mundoPrueba(cfg.pendienteMax + 0.3);
    const r = trazarCamino([{ x: 0, z: 0 }, { x: 10, z: 0 }], t, cfg);
    expect(r).toEqual({ ok: false, motivo: 'pendiente' });
  });

  it('camino válido: pasa por los puntos clave extremos y mide la longitud real', () => {
    const t = mundoPrueba();
    const clave = [{ x: 0, z: 0 }, { x: 5, z: 2 }, { x: 10, z: 0 }];
    const r = trazarCamino(clave, t, cfg);
    if (!r.ok) throw new Error(r.motivo);
    expect(r.camino.trazado[0]).toEqual(clave[0]);
    expect(r.camino.trazado[r.camino.trazado.length - 1]).toEqual(clave[clave.length - 1]);
    expect(r.camino.clave).toEqual(clave);
    expect(r.camino.ancho).toBe(cfg.ancho);
    expect(r.camino.longitud).toBeGreaterThan(cfg.longitudMin);
    expect(r.camino.alturas).toHaveLength(r.camino.trazado.length);
    // Terreno llano (pendiente 0): la altura es la misma en todo el trazado.
    expect(r.camino.alturas.every((h) => h === 0)).toBe(true);
  });

  it('una pendiente justo por debajo del límite sí se traza', () => {
    const t = mundoPrueba(cfg.pendienteMax - 0.1);
    const r = trazarCamino([{ x: 0, z: 0 }, { x: 10, z: 0 }], t, cfg);
    expect(r.ok).toBe(true);
  });

  it('es determinista: el mismo trazado da el mismo resultado', () => {
    const t = mundoPrueba(0.1);
    const clave = [{ x: 0, z: 0 }, { x: 3, z: 1 }, { x: 7, z: -1 }, { x: 10, z: 0 }];
    const a = trazarCamino(clave, t, cfg);
    const b = trazarCamino(clave, t, cfg);
    expect(a).toEqual(b);
  });
});

describe('velocidadEn', () => {
  function caminoRecto(): Camino {
    const r = trazarCamino([{ x: 0, z: 0 }, { x: 10, z: 0 }], mundoPrueba(), cfg);
    if (!r.ok) throw new Error(r.motivo);
    return r.camino;
  }

  it('da el multiplicador dentro de la cinta y 1 (a pie) fuera', () => {
    const caminos = [caminoRecto()];
    expect(velocidadEn({ x: 5, z: 0 }, caminos, cfg)).toBe(cfg.multiplicadorVelocidad);
    expect(velocidadEn({ x: 5, z: cfg.ancho / 2 - 0.01 }, caminos, cfg)).toBe(cfg.multiplicadorVelocidad);
    expect(velocidadEn({ x: 5, z: cfg.ancho / 2 + 0.5 }, caminos, cfg)).toBe(1);
  });

  it('sin caminos cerca, siempre 1', () => {
    expect(velocidadEn({ x: 500, z: 500 }, [], cfg)).toBe(1);
  });
});

describe('costeCamino', () => {
  it('son 2 personas-día por unidad de largo, redondeado hacia arriba', () => {
    const r = trazarCamino([{ x: 0, z: 0 }, { x: 10, z: 0 }], mundoPrueba(), cfg);
    if (!r.ok) throw new Error(r.motivo);
    expect(costeCamino(r.camino)).toBe(Math.ceil(r.camino.longitud * 2));
    expect(costeCamino(r.camino)).toBeGreaterThan(0);
  });
});
