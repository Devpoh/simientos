import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { crearCampoAlturas } from '../src/logic/alturas';
import { generarMapa } from '../src/logic/mapa';

const SEMILLAS = [20260418, 7, 1234];

function campoDe(semilla: number) {
  const mapa = generarMapa({ ...tuning.mapa, semilla }, tuning.clima);
  return { mapa, campo: crearCampoAlturas(mapa, { ...tuning.alturas, tamanoHex: tuning.render.tamanoHex }) };
}

describe('campo de alturas continuo (R20)', () => {
  it.each(SEMILLAS)('alturaEn es continua: dos puntos muy cercanos dan alturas casi iguales (semilla %i)', (semilla) => {
    const { campo } = campoDe(semilla);
    const paso = campo.paso;
    const ancho = (campo.columnas - 1) * paso;
    const alto = (campo.filas - 1) * paso;
    let peor = 0;
    for (let k = 0; k < 2000; k++) {
      const x = campo.origenX + ((k * 0.6180339) % 1) * ancho;
      const z = campo.origenZ + ((k * 0.4142135) % 1) * alto;
      const e = 1e-5;
      peor = Math.max(peor, Math.abs(campo.alturaEn(x + e, z) - campo.alturaEn(x, z)), Math.abs(campo.alturaEn(x, z + e) - campo.alturaEn(x, z)));
    }
    // Sin escalones: a 1e-5 de distancia solo un salto (no una pendiente, ni la más fuerte, de ~11) supera 1e-3.
    expect(peor).toBeLessThan(1e-3);
  });

  it.each(SEMILLAS)('la lámina de cada río nunca sube aguas abajo (semilla %i)', (semilla) => {
    const { campo } = campoDe(semilla);
    expect(campo.rios.length).toBeGreaterThan(0);
    for (const rio of campo.rios)
      for (let k = 1; k < rio.lamina.length; k++) expect(rio.lamina[k]).toBeLessThanOrEqual(rio.lamina[k - 1] + 1e-6);
  });

  it.each(SEMILLAS)('el mar queda bajo cota 0 y el agua del mar a cota 0 (semilla %i)', (semilla) => {
    const { mapa, campo } = campoDe(semilla);
    // Fuera del mapa todo es mar profundo.
    expect(campo.alturaEn(campo.origenX, campo.origenZ)).toBeLessThan(0);
    expect(campo.aguaEn(campo.origenX - 100, campo.origenZ - 100)).toBe(0);
    // Cada muestra bajo el nivel del mar tiene agua al menos a cota 0.
    for (let v = 0; v < campo.alturas.length; v++) if (campo.alturas[v] < 0) expect(campo.superficieAgua[v]).toBeGreaterThanOrEqual(0);
    expect(mapa.terreno.includes('mar')).toBe(true);
  });

  it('el lecho del río queda bajo su lámina y hay agua sobre él', () => {
    const { campo } = campoDe(SEMILLAS[0]);
    const rio = campo.rios[0];
    const k = Math.floor(rio.puntos.length / 2);
    const p = rio.puntos[k];
    expect(campo.alturaEn(p.x, p.z)).toBeLessThan(rio.lamina[k]);
    expect(Number.isNaN(campo.aguaEn(p.x, p.z))).toBe(false);
  });

  it('es determinista: la misma semilla da el mismo campo', () => {
    const a = campoDe(99).campo;
    const b = campoDe(99).campo;
    expect(Array.from(a.alturas.slice(0, 500))).toEqual(Array.from(b.alturas.slice(0, 500)));
  });
});
