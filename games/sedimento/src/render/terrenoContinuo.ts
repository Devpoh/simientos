import * as THREE from 'three';
import type { CampoAlturas } from '../logic/alturas';
import { axialAMundo, mundoAAxial, Rejilla } from '../logic/hex';
import { esAgua, type Mapa } from '../logic/mapa';
import { ruidoValor } from '../logic/ruido';
import { derivarSemilla } from '../logic/azar';
import type { Paleta } from './paleta';
import { CAPAS_TERRENO, type CapaTerreno, type TexturasTerreno } from './texturasTerreno';

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
  /** Máscara del cauce (en anchos de río): empieza a desvanecerse → ya no queda lecho. */
  cauceDesde: number;
  cauceHasta: number;
  /** Alto de la franja de arena sobre el nivel del agua. */
  altoPlaya: number;
  /** Fracción de `altoPlaya` que usan la media playa (costa) y la orilla de lago. */
  fraccionPlayaLago: number;
  /** Profundidad a la que el lecho marino alcanza su color. */
  profundidadLechoMar: number;
  frecuenciaVariacion: number;
  /** Brillo aleatorio ± por zonas. */
  variacionColor: number;
  rugosidad: number;
  /** Texturas PBR (G1): repeticiones por unidad de mundo, cerca y lejos (la segunda rompe el patrón repetido). */
  escalaTextura: number;
  escalaTexturaLejos: number;
  /** Cuánto del color de bioma (paleta) tiñe la textura: 0 = textura pura. */
  tinte: number;
  brillo: number;
  fuerzaNormal: number;
  /** Rugosidad de cada capa, en el orden de CAPAS_TERRENO. */
  rugosidadCapas: number[];
  /** Mezcla de hierba y hierba seca por manchas de ruido, para que la pradera no sea uniforme. */
  mezclaRuidoHierba: number;
  frecuenciaRuidoHierba: number;
}

export interface TerrenoContinuo {
  readonly malla: THREE.Mesh;
  readonly vertices: number;
  /** Pone las texturas PBR (llegan en segundo plano; hasta entonces se ve el color por vértice). */
  aplicarTexturas(t: TexturasTerreno): void;
  readonly conTexturas: boolean;
  liberar(): void;
}

const CAPA = Object.fromEntries(CAPAS_TERRENO.map((c, i) => [c, i])) as Record<CapaTerreno, number>;
const N_CAPAS = CAPAS_TERRENO.length;

/** Mezcla de suelos de cada bioma (pesos por capa). */
const SUELO_BIOMA: Record<string, Partial<Record<CapaTerreno, number>>> = {
  desierto: { tierra_seca: 0.6, hierba_seca: 0.25, arena: 0.15 },
  estepa: { hierba_seca: 0.75, tierra_seca: 0.25 },
  sabana: { hierba_seca: 0.6, hierba: 0.4 },
  mediterraneo: { hierba: 0.5, hierba_seca: 0.5 },
  pradera: { hierba: 1 },
  bosqueTemplado: { hierba: 0.85, barro: 0.15 },
  selva: { hierba: 0.8, barro: 0.2 },
  taiga: { hierba: 0.7, hierba_seca: 0.3 },
  tundra: { hierba_seca: 0.5, roca: 0.3, grava: 0.2 },
  nieve: { nieve: 1 },
};

/** Lleva los pesos de un vértice (8 capas desde `o`) hacia una sola capa con fuerza t (0..1). */
function hacia(w: Float32Array, o: number, capa: number, t: number) {
  if (t <= 0) return;
  for (let k = 0; k < N_CAPAS; k++) w[o + k] *= 1 - t;
  w[o + capa] += t;
}

// Shader del terreno: mezcla de 8 suelos por pesos de vértice, en dos escalas (cerca/lejos) para que no se
// note la repetición; la roca se proyecta en 3 ejes (triplanar) porque en las laderas una textura «desde arriba»
// se estiraría; el normal map se mezcla igual y se lleva al espacio de la superficie.
const GLSL_VERTICE = `
attribute vec4 aPesoA;
attribute vec4 aPesoB;
varying vec4 vPesoA;
varying vec4 vPesoB;
varying vec3 vPosMundo;
varying vec3 vNormalMundo;
`;
const GLSL_FRAGMENTO = `
uniform highp sampler2DArray uDifusas;
uniform highp sampler2DArray uNormales;
uniform float uListo;
uniform float uEscala;
uniform float uEscalaLejos;
uniform float uTinte;
uniform float uBrillo;
uniform float uFuerzaNormal;
uniform float uRugosidad[8];
varying vec4 vPesoA;
varying vec4 vPesoB;
varying vec3 vPosMundo;
varying vec3 vNormalMundo;

float pesoCapa(int i) { return i < 4 ? vPesoA[i] : vPesoB[i - 4]; }

// Manchas suaves de baja frecuencia: deciden cuánto pesa la escala «lejos» en cada zona.
float manchaTerreno(vec2 p) {
  return 0.5 + 0.25 * sin(p.x * 0.37 + sin(p.y * 0.21) * 2.0) + 0.25 * sin(p.y * 0.29 + sin(p.x * 0.17) * 2.3);
}

vec4 muestraCapa(highp sampler2DArray t, int i, vec3 pos, vec3 n) {
  float capa = float(i);
  if (i == 4) {
    // Roca triplanar.
    vec3 b = pow(abs(n), vec3(4.0));
    b /= (b.x + b.y + b.z);
    return texture(t, vec3(pos.zy * uEscala, capa)) * b.x + texture(t, vec3(pos.xz * uEscala, capa)) * b.y + texture(t, vec3(pos.xy * uEscala, capa)) * b.z;
  }
  vec4 cerca = texture(t, vec3(pos.xz * uEscala, capa));
  vec4 lejos = texture(t, vec3(pos.zx * uEscalaLejos + 0.37, capa));
  return mix(cerca, lejos, 0.35 * manchaTerreno(pos.xz));
}

vec3 difusaTerreno() {
  vec3 n = normalize(vNormalMundo);
  vec3 c = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = pesoCapa(i);
    if (w < 0.01) continue;
    c += muestraCapa(uDifusas, i, vPosMundo, n).rgb * w;
    total += w;
  }
  return c / max(total, 0.001);
}

float rugosidadTerreno() {
  float r = 0.0;
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = pesoCapa(i);
    r += uRugosidad[i] * w;
    total += w;
  }
  return r / max(total, 0.001);
}

vec3 normalTerreno() {
  vec3 N = normalize(vNormalMundo);
  vec3 t = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = pesoCapa(i);
    if (w < 0.01) continue;
    t += (muestraCapa(uNormales, i, vPosMundo, N).xyz * 2.0 - 1.0) * w;
    total += w;
  }
  t /= max(total, 0.001);
  // Base de la superficie: tangente hacia +x del mundo y bitangente hacia +z (las uv salen de x, z).
  vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
  vec3 B = cross(T, N);
  return normalize(T * t.x * uFuerzaNormal + B * t.y * uFuerzaNormal + N * max(t.z, 0.2));
}
`;

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
      if ((c + f) % 2 === 0) {
        indices[k] = a;
        indices[k + 1] = d;
        indices[k + 2] = b;
        indices[k + 3] = b;
        indices[k + 4] = d;
        indices[k + 5] = e;
      } else {
        indices[k] = a;
        indices[k + 1] = d;
        indices[k + 2] = e;
        indices[k + 3] = a;
        indices[k + 4] = e;
        indices[k + 5] = b;
      }
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
          cauce[v] = Math.max(cauce[v], 1 - suave(w * ct.cauceDesde, w * ct.cauceHasta, dist));
          vega[v] = Math.max(vega[v], 1 - suave(w, w * ct.vegaColor, dist));
        }
    }
  }

  // Suelos de cada celda de datos (las de río toman los de su orilla, como el color).
  const sueloCelda = new Float32Array(rejilla.total * N_CAPAS);
  for (let i = 0; i < rejilla.total; i++) {
    const o = i * N_CAPAS;
    const t = mapa.terreno[i];
    if (t === 'mar') sueloCelda[o + CAPA.arena] = 1;
    else if (t === 'lago') sueloCelda[o + CAPA.barro] = 1;
    else {
      for (const [c, p] of Object.entries(SUELO_BIOMA[mapa.bioma[i]] ?? { hierba: 1 })) sueloCelda[o + CAPA[c as CapaTerreno]] = p ?? 0;
      if (t === 'marisma') hacia(sueloCelda, o, CAPA.barro, 0.55);
      if (t === 'montana' && mapa.bioma[i] !== 'nieve') hacia(sueloCelda, o, CAPA.roca, 0.6);
      if (t === 'colina') hacia(sueloCelda, o, CAPA.roca, 0.15);
      if (t === 'llanura') hacia(sueloCelda, o, CAPA.hierba, suave(0.35, 0.9, mapa.fertilidad[i]) * 0.8);
    }
  }
  for (let i = 0; i < rejilla.total; i++) {
    if (mapa.terreno[i] !== 'rio') continue;
    const orilla = rejilla.vecinos(i).filter((j) => !esAgua(mapa.terreno[j]));
    if (!orilla.length) continue;
    for (let k = 0; k < N_CAPAS; k++) sueloCelda[i * N_CAPAS + k] = orilla.reduce((s, j) => s + sueloCelda[j * N_CAPAS + k], 0) / orilla.length;
  }
  const pesosCapa = new Float32Array(total * N_CAPAS);
  const semillaHierba = derivarSemilla(mapa.semilla, 'terreno-hierba');

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
        for (let s = 0; s < N_CAPAS; s++) pesosCapa[v * N_CAPAS + s] += sueloCelda[j * N_CAPAS + s] * w;
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
    if (h < campo.nivelMar + ct.altoPlaya) color.lerp(paleta.playa, 1 - suave(campo.nivelMar + ct.altoPlaya * ct.fraccionPlayaLago, campo.nivelMar + ct.altoPlaya, h));
    if (h < campo.nivelMar) color.lerp(paleta.lechoMar, suave(0, ct.profundidadLechoMar, campo.nivelMar - h));
    // Lago: lecho bajo su lámina y una orilla de barro claro.
    if (!Number.isNaN(laminaLago) && h < laminaLago + ct.altoPlaya * ct.fraccionPlayaLago) color.lerp(paleta.lecho, 1 - suave(laminaLago, laminaLago + ct.altoPlaya * ct.fraccionPlayaLago, h));
    // Variación de baja frecuencia: rompe la uniformidad de las llanuras grandes.
    const n = ruidoValor(semillaRuido, x * ct.frecuenciaVariacion, z * ct.frecuenciaVariacion) - 0.5;
    color.multiplyScalar(1 + n * 2 * ct.variacionColor);

    // Suelos: misma lógica que el color, pero eligiendo textura en vez de tono.
    const o = v * N_CAPAS;
    if (pesos > 0) for (let s = 0; s < N_CAPAS; s++) pesosCapa[o + s] /= pesos;
    else pesosCapa[o + CAPA.arena] = 1;
    const manchas = (ruidoValor(semillaHierba, x * ct.frecuenciaRuidoHierba, z * ct.frecuenciaRuidoHierba) - 0.5) * 2 * ct.mezclaRuidoHierba;
    const de = manchas > 0 ? CAPA.hierba : CAPA.hierba_seca;
    const a = manchas > 0 ? CAPA.hierba_seca : CAPA.hierba;
    const pasa = pesosCapa[o + de] * Math.abs(manchas);
    pesosCapa[o + de] -= pasa;
    pesosCapa[o + a] += pasa;
    hacia(pesosCapa, o, CAPA.hierba, vega[v] * ct.fuerzaVega);
    hacia(pesosCapa, o, CAPA.barro, cauce[v]);
    hacia(pesosCapa, o, CAPA.grava, suave(0.75, 1, cauce[v]));
    hacia(pesosCapa, o, CAPA.roca, suave(ct.pendienteRocaDesde, ct.pendienteRocaHasta, 1 - ny) * ct.fuerzaRoca);
    if (h < campo.nivelMar + ct.altoPlaya) hacia(pesosCapa, o, CAPA.arena, 1 - suave(campo.nivelMar + ct.altoPlaya * ct.fraccionPlayaLago, campo.nivelMar + ct.altoPlaya, h));
    if (!Number.isNaN(laminaLago) && h < laminaLago + ct.altoPlaya * ct.fraccionPlayaLago) hacia(pesosCapa, o, CAPA.barro, 1 - suave(laminaLago, laminaLago + ct.altoPlaya * ct.fraccionPlayaLago, h));

    colores[v * 3] = color.r;
    colores[v * 3 + 1] = color.g;
    colores[v * 3 + 2] = color.b;
  }
  geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  const pesoA = new Float32Array(total * 4);
  const pesoB = new Float32Array(total * 4);
  for (let v = 0; v < total; v++)
    for (let s = 0; s < 4; s++) {
      pesoA[v * 4 + s] = pesosCapa[v * N_CAPAS + s];
      pesoB[v * 4 + s] = pesosCapa[v * N_CAPAS + 4 + s];
    }
  geometria.setAttribute('aPesoA', new THREE.BufferAttribute(pesoA, 4));
  geometria.setAttribute('aPesoB', new THREE.BufferAttribute(pesoB, 4));
  geometria.computeBoundingBox();
  geometria.computeBoundingSphere();

  const uniformes = {
    uDifusas: { value: null as THREE.DataArrayTexture | null },
    uNormales: { value: null as THREE.DataArrayTexture | null },
    uListo: { value: 0 },
    uEscala: { value: ct.escalaTextura },
    uEscalaLejos: { value: ct.escalaTexturaLejos },
    uTinte: { value: ct.tinte },
    uBrillo: { value: ct.brillo },
    uFuerzaNormal: { value: ct.fuerzaNormal },
    uRugosidad: { value: ct.rugosidadCapas },
  };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: ct.rugosidad, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_VERTICE}`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
  vPesoA = aPesoA;
  vPesoB = aPesoB;
  vPosMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vNormalMundo = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_FRAGMENTO}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  if (uListo > 0.5) {
    // El color de bioma solo tiñe un poco la textura: aporta la variación de gran escala.
    float lum = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.05);
    vec3 tinte = mix(vec3(1.0), diffuseColor.rgb / lum * 0.9, uTinte);
    diffuseColor.rgb = difusaTerreno() * tinte * uBrillo;
  }`,
      )
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n  if (uListo > 0.5) roughnessFactor = rugosidadTerreno();`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n  if (uListo > 0.5) normal = normalize((viewMatrix * vec4(normalTerreno(), 0.0)).xyz);`);
  };
  // Programa propio: que three no lo comparta con otros MeshStandardMaterial sin el parche.
  material.customProgramCacheKey = () => 'terreno-pbr';
  const malla = new THREE.Mesh(geometria, material);
  malla.castShadow = true;
  malla.receiveShadow = true;
  malla.name = 'terreno-continuo';

  return {
    malla,
    vertices: total,
    get conTexturas() {
      return uniformes.uListo.value > 0.5;
    },
    aplicarTexturas(t) {
      uniformes.uDifusas.value = t.difusas;
      uniformes.uNormales.value = t.normales;
      uniformes.uListo.value = 1;
    },
    liberar() {
      geometria.dispose();
      material.dispose();
    },
  };
}

