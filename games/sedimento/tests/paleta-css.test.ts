// @ts-expect-error — @types/node no está instalado en el proyecto; Vitest corre con cwd en games/sedimento.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLORES, RAMPAS } from '../src/data/paleta';

const paletaCss: string = readFileSync('src/ui/paleta.css', 'utf8');

describe('tokens CSS de la paleta (R70)', () => {
  it('src/ui/paleta.css expone exactamente los colores de paleta.ts, sin añadir ninguno', () => {
    const esperadas = new Map<string, string>();
    for (const [rampa, indices] of Object.entries(RAMPAS)) {
      indices.forEach((indice, tono) => esperadas.set(`--c-${rampa}-${tono}`, COLORES[indice]));
    }

    const encontradas = new Map<string, string>();
    for (const m of paletaCss.matchAll(/(--c-[a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)) {
      encontradas.set(m[1], m[2].toLowerCase());
    }

    expect(encontradas.size).toBe(esperadas.size);
    for (const [clave, valor] of esperadas) expect(encontradas.get(clave)).toBe(valor);

    const coloresValidos = new Set(COLORES);
    for (const valor of encontradas.values()) expect(coloresValidos.has(valor)).toBe(true);
  });
});
