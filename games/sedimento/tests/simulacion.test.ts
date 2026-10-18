import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { configDesdeTuning } from '../src/logic/sim/config';
import { avanzarDias, avanzarTicks, crearEstado } from '../src/logic/sim/simulacion';

const cfg = configDesdeTuning(tuning);

describe('simulación', () => {
  it('crea 6 hogares con 30 personas, cada uno de 3 a 8 miembros y con algún adulto', () => {
    const e = crearEstado(cfg, 42);
    expect(e.hogares).toHaveLength(6);
    expect(e.hogares.reduce((s, h) => s + h.miembros, 0)).toBe(30);
    for (const h of e.hogares) {
      expect(h.miembros).toBeGreaterThanOrEqual(3);
      expect(h.miembros).toBeLessThanOrEqual(8);
      expect(h.adultos).toBeGreaterThanOrEqual(1);
    }
  });

  it('es determinista: misma semilla → mismo estado tras 100 días', () => {
    const a = crearEstado(cfg, 7);
    const b = crearEstado(cfg, 7);
    avanzarDias(a, 100, cfg);
    avanzarDias(b, 100, cfg);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('los sistemas diarios corren solo al completar un día de ticks', () => {
    const e = crearEstado(cfg, 1);
    avanzarTicks(e, cfg.ticksPorDia - 1, cfg);
    expect(e.dia).toBe(0);
    avanzarTicks(e, 1, cfg);
    expect(e.dia).toBe(1);
    avanzarTicks(e, cfg.ticksPorDia * 2 + 5, cfg);
    expect(e.dia).toBe(3);
  });

  it('el estado completo se serializa con JSON y se restaura idéntico', () => {
    const e = crearEstado(cfg, 3);
    e.almacen.cebada = 50;
    avanzarDias(e, 10, cfg);
    const copia = JSON.parse(JSON.stringify(e));
    expect(copia).toEqual(e);
    avanzarDias(e, 5, cfg);
    avanzarDias(copia, 5, cfg);
    expect(copia).toEqual(e);
  });
});
