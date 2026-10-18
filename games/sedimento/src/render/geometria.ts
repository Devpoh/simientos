import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Deja una geometría lista para fusionar: sin índices, sin uv y con un color por vértice.
 * Todas las piezas que se fusionan deben tener los mismos atributos (posición, normal, color).
 */
export function pieza(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const colores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colores[i * 3] = c.r;
    colores[i * 3 + 1] = c.g;
    colores[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  return g;
}

/** Recolorea cada triángulo según la altura (y) de su centro: así la nieve cubre solo la parte alta. */
export function colorearCaras(geo: THREE.BufferGeometry, color: (y: number) => THREE.Color): void {
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  for (let t = 0; t < pos.count; t += 3) {
    const y = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3;
    const c = color(y);
    for (let k = 0; k < 3; k++) col.setXYZ(t + k, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

export function fusionar(piezas: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(piezas, false);
  for (const p of piezas) p.dispose();
  return g;
}

/** Libera la memoria de GPU de todo lo que cuelga de `raiz`. */
export function liberar(raiz: THREE.Object3D): void {
  raiz.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    const m = o.material as THREE.Material | THREE.Material[];
    for (const mat of Array.isArray(m) ? m : [m]) mat.dispose();
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
}
