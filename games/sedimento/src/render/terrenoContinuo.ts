import * as THREE from 'three';
import type { CampoAlturas } from '../logic/alturas';
import { axialAMundo, mundoAAxial, Rejilla } from '../logic/hex';
import { esAgua, type Mapa } from '../logic/mapa';
import { ruidoValor } from '../logic/ruido';
import { derivarSemilla } from '../logic/azar';
import type { Paleta } from './paleta';

/** Sección `render.terreno` de tuning.json (colores y acabado del terreno continuo). */
export interface ConfigTerreno {
  /** Radio (en celdas) de la mezcla gaussiana de colores entre celdas vecinas. */
  sigmaColor: number;
  /** Hasta cuántos anchos de cauce llega el verde de la vega, y con qué fuerza (0–1). */
  vegaColor: number;
  fuerzaVega: number;
  /** 1 − normal.y entre los que la ladera pasa a roca (empieza → del todo). */
  pendienteRocaDesde: number;
  pendienteRocaHasta: number;
  fuerzaRoca: number;
  /** Alto de la franja de arena sobre el nivel del agua. */
  altoPlaya: number;
  /** Profundidad a la que el lecho marino alcanza su color. */
  profundidadLechoMar: number;
  frecuenciaVariacion: number;
  /** Brillo aleatorio ± por zonas. */
  variacionColor: number;
  rugosidad: number;
}

export interface TerrenoContinuo {
  readonly malla: THREE.Mesh;
  readonly vertices: number;
  liberar(): void;
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Terreno continuo (R20): una sola malla con un vértice por muestra del campo de alturas. El color
 * de cada vértice mezcla el de las celdas de datos cercanas con un peso gaussiano (así los biomas
 * se funden sin bordes de hexágono) y después se corrige por lo que el relieve dice de ese punto:
 * roca en las pendientes, lecho bajo el agua, arena en la franja de playa y vega húmeda junto al río.
 */
export function crearTerrenoContinuo(mapa: Mapa, campo: CampoAlturas, ct: ConfigTerreno, R: number, paleta: Paleta): TerrenoContinuo {
  const { columnas, filas, origenX, origenZ, paso, alturas } = campo;
  const total = columnas * filas;

  const posiciones = new Float32Array(total * 3);
  for (let f = 0; f < filas; f++)
    for (let c = 0; c < columnas; c++) {
      const v = f * columnas + c;
      posiciones[v * 3] = origenX + c * paso;
      posiciones[v * 3 + 1] = alturas[v];
      posiciones[v * 3 + 2] = origenZ + f * paso;
    }
  const indices = new Uint32Array((columnas - 1) * (filas - 1) * 6);
  let k = 0;
  for (let f = 0; f + 1 < filas; f++)
    for (let c = 0; c + 1 < columnas; c++) {
      const a = f * columnas + c;
      const b = a + 1;
      const d = a + columnas;
      const e = d + 1;
      // Diagonal alterna: evita el «peinado» de todas las diagonales en la misma dirección.
      if ((c + f) % 2 === 0) indices.set([a, d, b, b, d, e], k);
      else indices.set([a, d, e, a, e, b], k);
      k += 6;
    }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometria.setIndex(new THREE.BufferAttribute(indices, 1));
  geometria.computeVertexNormals();
  const normales = geometria.getAttribute('normal');

  // Color de cada celda de datos. Las de río toman el de su orilla: el cauce real es estrecho y lo pinta la máscara de abajo.
  const rejilla = new Rejilla(mapa.columnas, mapa.filas);
  const colorCelda: THREE.Color[] = [];
  const tmp = new THREE.Color();
  for (let i = 0; i < rejilla.total; i++) colorCelda.push(paleta.colorTapa(mapa, i, 0, new THREE.Color()));
  for (let i = 0; i < rejilla.total; i++) {
    if (mapa.terreno[i] !== 'rio') continue;
    const orilla = rejilla.vecinos(i).filter((j) => !esAgua(mapa.terreno[j]));
    if (!orilla.length) continue;
    colorCelda[i].setRGB(0, 0, 0);
    for (const j of orilla) colorCelda[i].add(tmp.copy(colorCelda[j]).multiplyScalar(1 / orilla.length));
  }

  // Máscara del río: 1 en el cauce, se desvanece por la vega. Recorre solo la caja de cada tramo.
  const cauce = new Float32Array(total);
  const vega = new Float32Array(total);
  for (const rio of campo.rios) {
    const { puntos, ancho } = rio;
    for (let s = 0; s + 1 < puntos.length; s++) {
      const a = puntos[s];
      const b = puntos[s + 1];
      const alcance = Math.max(ancho[s], ancho[s + 1]) * ct.vegaColor;
      const c0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - alcance - origenX) / paso));
      const c1 = Math.min(columnas - 1, Math.ceil((Math.max(a.x, b.x) + alcance - origenX) / paso));
      const f0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - alcance - origenZ) / paso));
      const f1 = Math.min(filas - 1, Math.ceil((Math.max(a.z, b.z) + alcance - origenZ) / paso));
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l2 = dx * dx + dz * dz || 1;
      for (let f = f0; f <= f1; f++)
        for (let c = c0; c <= c1; c++) {
          const x = origenX + c * paso;
          const z = origenZ + f * paso;
          const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / l2));
          const dist = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
          const w = ancho[s] + (ancho[s + 1] - ancho[s]) * t;
          const v = f * columnas + c;
          cauce[v] = Math.max(cauce[v], 1 - suave(w * 0.8, w * 1.25, dist));
          vega[v] = Math.max(vega[v], 1 - suave(w, w * ct.vegaColor, dist));
        }
    }
  }

  const colores = new Float32Array(total * 3);
  const color = new THREE.Color();
  const dosSigma2 = 2 * (ct.sigmaColor * R) ** 2;
  const semillaRuido = derivarSemilla(mapa.semilla, 'terreno-color');
  for (let v = 0; v < total; v++) {
    const x = posiciones[v * 3];
    const h = posiciones[v * 3 + 1];
    const z = posiciones[v * 3 + 2];
    const { q, r } = mundoAAxial(x, z, R);

    color.setRGB(0, 0, 0);
    let pesos = 0;
    let laminaLago = NaN;
    for (let dq = -1; dq <= 1; dq++)
      for (let dr = Math.max(-1, -dq - 1); dr <= Math.min(1, -dq + 1); dr++) {
        const j = rejilla.indiceAxial(q + dq, r + dr);
        if (j === -1) continue;
        if (!Number.isNaN(campo.laminaLago[j])) laminaLago = Number.isNaN(laminaLago) ? campo.laminaLago[j] : Math.min(laminaLago, campo.laminaLago[j]);
        const centro = axialAMundo(q + dq, r + dr, R);
        const w = Math.exp(-((x - centro.x) ** 2 + (z - centro.z) ** 2) / dosSigma2);
        color.add(tmp.copy(colorCelda[j]).multiplyScalar(w));
        pesos += w;
      }
    if (pesos > 0) color.multiplyScalar(1 / pesos);
    else color.copy(paleta.lechoMar);

    // Vega: más verde y húmeda cerca del agua; cauce: lecho de arena y limo.
    color.lerp(paleta.regadio, vega[v] * ct.fuerzaVega);
    color.lerp(paleta.lecho, cauce[v]);
    // Roca donde la ladera es empinada (normal poco vertical).
    const ny = normales.getY(v);
    color.lerp(paleta.roca, suave(ct.pendienteRocaDesde, ct.pendienteRocaHasta, 1 - ny) * ct.fuerzaRoca);
    // Costa: arena justo sobre el nivel del mar y lecho marino por debajo.
    if (h < campo.nivelMar + ct.altoPlaya) color.lerp(paleta.playa, 1 - suave(campo.nivelMar + ct.altoPlaya * 0.5, campo.nivelMar + ct.altoPlaya, h));
    if (h < campo.nivelMar) color.lerp(paleta.lechoMar, suave(0, ct.profundidadLechoMar, campo.nivelMar - h));
    // Lago: lecho bajo su lámina y una orilla de barro claro.
    if (!Number.isNaN(laminaLago) && h < laminaLago + ct.altoPlaya * 0.5) color.lerp(paleta.lecho, 1 - suave(laminaLago, laminaLago + ct.altoPlaya * 0.5, h));
    // Variación de baja frecuencia: rompe la uniformidad de las llanuras grandes.
    const n = ruidoValor(semillaRuido, x * ct.frecuenciaVariacion, z * ct.frecuenciaVariacion) - 0.5;
    color.multiplyScalar(1 + n * 2 * ct.variacionColor);

    colores[v * 3] = color.r;
    colores[v * 3 + 1] = color.g;
    colores[v * 3 + 2] = color.b;
  }
  geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geometria.computeBoundingBox();
  geometria.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: ct.rugosidad, metalness: 0 });
  const malla = new THREE.Mesh(geometria, material);
  malla.castShadow = true;
  malla.receiveShadow = true;
  malla.name = 'terreno-continuo';

  return {
    malla,
    vertices: total,
    liberar() {
      geometria.dispose();
      material.dispose();
    },
  };
}

