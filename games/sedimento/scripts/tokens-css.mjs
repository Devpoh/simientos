#!/usr/bin/env node
// Genera src/ui/paleta.css a partir de src/data/paleta.ts (R70): una variable
// --c-<rampa>-<tono> por color, en el mismo orden que las rampas de la paleta.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COLORES, RAMPAS } from '../src/data/paleta.ts';

const vars = [];
for (const [rampa, indices] of Object.entries(RAMPAS)) {
  indices.forEach((indice, tono) => {
    vars.push(`  --c-${rampa}-${tono}: ${COLORES[indice]};`);
  });
}
const lineas = [
  '/* Generado por scripts/tokens-css.mjs a partir de src/data/paleta.ts. No editar a mano. */',
  ':root {',
  ...vars,
  '}',
  '',
];

const destino = fileURLToPath(new URL('../src/ui/paleta.css', import.meta.url));
writeFileSync(destino, lineas.join('\n'));
console.log(`paleta.css generado con ${vars.length} variables (${COLORES.length} colores de origen).`);
