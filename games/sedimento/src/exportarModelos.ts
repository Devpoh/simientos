import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import tuning from './data/tuning.json';
import { marcarListo } from './core/test-hooks';
import { crearRng } from './logic/azar';
import { catalogoEdificios } from './render/edificios';
import { catalogoVegetacion } from './render/vegetacion';

// `?exportar`: convierte los modelos procedurales en GLB (scripts/exportar-modelos.mjs los guarda en
// public/modelos/propios) para verlos en el panel del estudio junto a los de los paquetes CC0.

declare global {
  interface Window {
    __EXPORT__?: Record<string, string>;
  }
}

const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
const modelos: Record<string, THREE.BufferGeometry> = {};
[1, 2, 3].forEach((s) => {
  for (const [nombre, geo] of Object.entries(catalogoVegetacion(crearRng(s * 7919)))) {
    // Las especies que no varían con la semilla se exportan una sola vez.
    if (s === 1 || ['palmera', 'arbol', 'conifera', 'roca'].includes(nombre)) modelos[`${nombre}_${s}`] = geo;
  }
});
for (const [nombre, geo] of Object.entries(catalogoEdificios(tuning.render))) modelos[nombre] = geo;

const exportador = new GLTFExporter();
const aBase64 = (buf: ArrayBuffer) => {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

const salida: Record<string, string> = {};
for (const [nombre, geo] of Object.entries(modelos)) {
  const malla = new THREE.Mesh(geo, material);
  malla.name = nombre;
  const glb = await exportador.parseAsync(malla, { binary: true });
  if (glb instanceof ArrayBuffer) salida[nombre] = aBase64(glb);
}
window.__EXPORT__ = salida;
marcarListo();
