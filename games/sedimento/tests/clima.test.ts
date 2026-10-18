import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { BIOMAS, clasificarBioma, climaEnAltitud, type Bioma } from '../src/logic/clima';

describe('clima', () => {
  it('la temperatura baja 6,5 °C por km y la lluvia sube con la altitud', () => {
    const abajo = climaEnAltitud(tuning.clima, 0);
    const arriba = climaEnAltitud(tuning.clima, 2000);
    expect(abajo.temperatura - arriba.temperatura).toBeCloseTo(13, 5);
    expect(arriba.precipitacion).toBeGreaterThan(abajo.precipitacion);
  });

  it('Whittaker: cada bioma aparece en su combinación lógica de temperatura y lluvia', () => {
    const casos: [number, number, Bioma][] = [
      [-10, 200, 'nieve'],
      [-2, 400, 'tundra'],
      [3, 600, 'taiga'],
      [3, 150, 'tundra'],
      [8, 900, 'bosqueTemplado'],
      [8, 350, 'pradera'],
      [15, 500, 'mediterraneo'],
      [10, 150, 'estepa'],
      [25, 100, 'desierto'],
      [25, 350, 'estepa'],
      [25, 800, 'sabana'],
      [26, 2000, 'selva'],
    ];
    for (const [t, p, b] of casos) expect(clasificarBioma(t, p), `${t} °C, ${p} mm`).toBe(b);
    const cubiertos = new Set(casos.map(([t, p]) => clasificarBioma(t, p)));
    expect(cubiertos.size).toBe(BIOMAS.length);
  });

  it('al subir una montaña la temperatura nunca sube y la cima muy alta es nieve', () => {
    let anterior = Infinity;
    for (let m = 0; m <= 6000; m += 250) {
      const c = climaEnAltitud(tuning.clima, m);
      expect(c.temperatura).toBeLessThan(anterior);
      anterior = c.temperatura;
    }
    const cima = climaEnAltitud(tuning.clima, 6000);
    expect(clasificarBioma(cima.temperatura, cima.precipitacion)).toBe('nieve');
    const valle = climaEnAltitud(tuning.clima, 0);
    expect(clasificarBioma(valle.temperatura, valle.precipitacion)).toBe('desierto');
  });
});
