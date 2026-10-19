import * as THREE from 'three';
import { crearRng, derivarSemilla, enteroEntre } from '../logic/azar';
import type { CampoAlturas } from '../logic/alturas';
import { mundoAAxial, VECINDAD } from '../logic/hex';
import type { Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import type { Paleta } from './paleta';

/** Lados del polígono irregular de una charca de marisma. */
const LADOS_CHARCA = 9;

interface Uniformes {
  [nombre: string]: THREE.IUniform;
  uTiempo: { value: number };
}

/**
 * Agua procedural sin texturas: un MeshStandardMaterial con GLSL inyectado.
 * - Olas: una función de altura (senos + ruido) de la que salen el brillo y la normal.
 * - Corriente: en los ríos el ruido se desplaza según `aFlujo` con un flowmap de dos fases
 *   (dos copias desfasadas que se alternan para que el dibujo no se estire sin fin).
 * - Espuma: `aOrilla` vale 1 en los vértices que tocan tierra y 0 en el interior; la espuma
 *   es esa franja, rota con ruido y con líneas que avanzan hacia la orilla.
 * - Reflejo: fresnel hacia el color del cielo, más fuerte cuanto más rasante se mira.
 */
function crearMaterialAgua(cfg: ConfigRender, uniformes: Uniformes, opaco: boolean): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    roughness: cfg.agua.rugosidad,
    metalness: 0,
    transparent: !opaco,
    opacity: opaco ? 1 : cfg.agua.opacidad,
    vertexColors: true,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aOrilla;
        attribute vec2 aFlujo;
        varying vec3 vMundo;
        varying float vOrilla;
        varying vec2 vFlujo;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vMundo = (modelMatrix * vec4(position, 1.0)).xyz;
        vOrilla = aOrilla;
        vFlujo = aFlujo;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTiempo;
        uniform float uVelRio;
        uniform float uRelieve;
        uniform float uAnchoEspuma;
        uniform float uFresnel;
        uniform float uDetalleCerca;
        uniform float uDetalleLejos;
        uniform vec3 uCielo;
        uniform vec3 uEspuma;
        varying vec3 vMundo;
        varying float vOrilla;
        varying vec2 vFlujo;
        // 1 con la cámara cerca, 0 lejos: el detalle fino solo se añade cuando se puede ver (sin parpadeo de lejos).
        float detalleCerca = 0.0;
        float azarAgua(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float ruidoAgua(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          // Interpolación quíntica: sin saltos en la pendiente, así la normal no dibuja la cuadrícula.
          vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
          return mix(mix(azarAgua(i), azarAgua(i + vec2(1.0, 0.0)), u.x),
                     mix(azarAgua(i + vec2(0.0, 1.0)), azarAgua(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        // Cada octava se gira para que la rejilla del ruido no se alinee con los ejes.
        const mat2 GIRO_AGUA = mat2(0.8, -0.6, 0.6, 0.8);
        float alturaOlas(vec2 p) {
          float h = 0.5 * sin(p.x * 1.7 + uTiempo * 1.1) * sin(p.y * 1.5 - uTiempo * 0.9)
                  + 0.6 * ruidoAgua(p * 2.2 + vec2(uTiempo * 0.35, -uTiempo * 0.25))
                  + 0.25 * ruidoAgua(GIRO_AGUA * p * 5.3 - vec2(uTiempo * 0.5, uTiempo * 0.2))
                  + detalleCerca * 0.08 * ruidoAgua(GIRO_AGUA * GIRO_AGUA * p * 11.0 + vec2(uTiempo * 0.9, uTiempo * 0.6));
          float fuerza = clamp(length(vFlujo), 0.0, 1.0);
          if (fuerza > 0.001) {
            float f0 = fract(uTiempo * 0.3);
            float f1 = fract(uTiempo * 0.3 + 0.5);
            vec2 d = vFlujo * uVelRio;
            float a = ruidoAgua(p * 3.0 - d * f0 * 3.0) + 0.5 * ruidoAgua(p * 7.0 - d * f0 * 3.0);
            float b = ruidoAgua(p * 3.0 - d * f1 * 3.0 + 17.3) + 0.5 * ruidoAgua(p * 7.0 - d * f1 * 3.0 + 5.1);
            h = mix(h, mix(a, b, abs(f0 * 2.0 - 1.0)), fuerza);
          }
          return h;
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        detalleCerca = 1.0 - smoothstep(uDetalleCerca, uDetalleLejos, length(vViewPosition));
        float hAgua = alturaOlas(vMundo.xz);
        // El brillo solo sigue las olas grandes: el detalle fino va a la normal (si no, sale granulado).
        float hBrillo = hAgua - detalleCerca * 0.08 * ruidoAgua(GIRO_AGUA * GIRO_AGUA * vMundo.xz * 11.0 + vec2(uTiempo * 0.9, uTiempo * 0.6));
        diffuseColor.rgb *= 0.94 + 0.12 * hBrillo;
        float nEsp = ruidoAgua(vMundo.xz * 4.0 + vec2(uTiempo * 0.3, uTiempo * 0.17));
        // Encaje de espuma: ruido fino que rompe las franjas en jirones.
        float encaje = smoothstep(0.25, 0.6, ruidoAgua(vMundo.xz * 9.0 - vec2(uTiempo * 0.4, uTiempo * 0.25)));
        // Franja pegada a la orilla que «respira» (sube y baja como la marea corta).
        float borde = smoothstep(uAnchoEspuma, uAnchoEspuma + 0.3, vOrilla + 0.15 * (nEsp - 0.5) + 0.07 * sin(uTiempo * 1.3 + vMundo.x * 0.7));
        // Olas que avanzan hacia la orilla: una cresta fina que recorre la franja y se deshace al llegar.
        float fase = fract(vOrilla * 1.6 - uTiempo * 0.35 + nEsp * 0.3);
        float lineas = smoothstep(0.82, 0.9, fase) * (1.0 - smoothstep(0.9, 0.98, fase)) * smoothstep(0.15, 0.5, vOrilla);
        float espuma = clamp(borde * mix(0.65, 1.0, encaje) + lineas * 0.6 * encaje, 0.0, 1.0);
        // En un río las dos orillas están a un paso y ya llevan franja de barro: sin espuma (si no,
        // las esquinas de cada tramo dibujan rayas que cruzan el cauce). Las cascadas son blancas por color.
        espuma *= 1.0 - clamp(length(vFlujo) * 1.5, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uEspuma, espuma);
        diffuseColor.a = mix(diffuseColor.a, 1.0, espuma);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.85, espuma);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        const float PASO = 0.04;
        float hx = alturaOlas(vMundo.xz + vec2(PASO, 0.0));
        float hz = alturaOlas(vMundo.xz + vec2(0.0, PASO));
        float relieve = uRelieve * (1.0 - espuma);
        vec3 normalMundo = normalize(vec3(-(hx - hAgua) / PASO * relieve, 1.0, -(hz - hAgua) / PASO * relieve));
        normal = normalize((viewMatrix * vec4(normalMundo, 0.0)).xyz);`,
      )
      .replace(
        '#include <opaque_fragment>',
        `float fresnel = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
        outgoingLight = mix(outgoingLight, uCielo, fresnel * uFresnel * (1.0 - espuma));
        #include <opaque_fragment>`,
      );
  };
  return material;
}

/** Charca de marisma: centro en su superficie y radio medio (para poner nenúfares y plantas). */
export interface Charca {
  x: number;
  y: number;
  z: number;
  radio: number;
}

export interface Agua {
  readonly raiz: THREE.Group;
  readonly charcas: readonly Charca[];
  actualizar(dt: number): void;
  liberar(): void;
}

/** Vértices acumulados de la malla de agua (posición, color, orilla y flujo). */
class Constructor {
  readonly pos: number[] = [];
  readonly col: number[] = [];
  readonly orilla: number[] = [];
  readonly flujo: number[] = [];
  readonly indices: number[] = [];

  vertice(x: number, y: number, z: number, c: THREE.Color, orilla: number, fx: number, fz: number): number {
    this.pos.push(x, y, z);
    this.col.push(c.r, c.g, c.b);
    this.orilla.push(orilla);
    this.flujo.push(fx, fz);
    return this.orilla.length - 1;
  }

  geometria(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aOrilla', new THREE.Float32BufferAttribute(this.orilla, 1));
    g.setAttribute('aFlujo', new THREE.Float32BufferAttribute(this.flujo, 2));
    g.setIndex(this.indices);
    g.computeVertexNormals();
    return g;
  }
}

/**
 * Agua sobre el terreno continuo (G1): el mar es un plano a cota 0 que el terreno tapa donde hay
 * tierra; cada lago, una lámina hecha con las celdas de la rejilla que caen en él; cada río, una
 * cinta a la cota de su lámina con la corriente hacia aguas abajo. Las orillas las dibuja el propio
 * terreno al cortar el agua, así que no hacen falta piezas de orilla.
 */
export function crearAgua(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta, campo: CampoAlturas): Agua {
  const ca = cfg.agua;
  const uniformes: Uniformes = {
    uTiempo: { value: 0 },
    uVelRio: { value: ca.velocidadRio },
    uRelieve: { value: ca.relieveOlas },
    uAnchoEspuma: { value: ca.anchoEspuma },
    uFresnel: { value: ca.fresnel },
    uDetalleCerca: { value: ca.detalleCerca },
    uDetalleLejos: { value: ca.detalleLejos },
    uCielo: { value: new THREE.Color(cfg.cielo.horizonte).lerp(new THREE.Color(cfg.cielo.arriba), 0.45) },
    uEspuma: { value: new THREE.Color(ca.colorEspuma) },
  };
  const R = cfg.tamanoHex;
  const b = new Constructor();
  const color = new THREE.Color();

  // Lagos: cada celda de la rejilla de alturas cuyo centro cae en un lago o junto a él.
  const { paso, columnas, filas, origenX, origenZ } = campo;
  for (let f = 0; f + 1 < filas; f++)
    for (let c = 0; c + 1 < columnas; c++) {
      const x = origenX + (c + 0.5) * paso;
      const z = origenZ + (f + 0.5) * paso;
      const { q, r } = mundoAAxial(x, z, R);
      let lamina = NaN;
      for (const [dq, dr] of VECINDAD) {
        const j = disp.rejilla.indiceAxial(q + dq, r + dr);
        if (j !== -1 && !Number.isNaN(campo.laminaLago[j])) lamina = Number.isNaN(lamina) ? campo.laminaLago[j] : Math.min(lamina, campo.laminaLago[j]);
      }
      // Solo donde el lecho queda bajo la lámina: así no hay agua flotando sobre la orilla.
      if (Number.isNaN(lamina) || campo.alturaEn(x, z) > lamina + paso) continue;
      color.copy(paleta.lago);
      const v = [
        b.vertice(x - paso / 2, lamina, z - paso / 2, color, 0, 0, 0),
        b.vertice(x + paso / 2, lamina, z - paso / 2, color, 0, 0, 0),
        b.vertice(x + paso / 2, lamina, z + paso / 2, color, 0, 0, 0),
        b.vertice(x - paso / 2, lamina, z + paso / 2, color, 0, 0, 0),
      ];
      b.indices.push(v[0], v[2], v[1], v[0], v[3], v[2]);
    }

  // Ríos: cinta a lo largo del cauce, algo más ancha que el lecho (las orillas la recortan).
  for (const rio of campo.rios) {
    const { puntos, lamina, ancho } = rio;
    let anterior: [number, number] | null = null;
    for (let k = 0; k < puntos.length; k++) {
      const p = puntos[k];
      const s = puntos[Math.min(puntos.length - 1, k + 1)];
      const a = puntos[Math.max(0, k - 1)];
      let tx = s.x - a.x;
      let tz = s.z - a.z;
      const l = Math.hypot(tx, tz) || 1;
      tx /= l;
      tz /= l;
      const w = ancho[k] * ca.anchoCinta;
      color.copy(paleta.rio);
      const izq = b.vertice(p.x - tz * w, lamina[k], p.z + tx * w, color, 0, tx, tz);
      const der = b.vertice(p.x + tz * w, lamina[k], p.z - tx * w, color, 0, tx, tz);
      if (anterior) b.indices.push(anterior[0], izq, der, anterior[0], der, anterior[1]);
      anterior = [izq, der];
    }
  }

  // Charcas de marisma: manchas irregulares de agua quieta apoyadas en el suelo.
  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-agua'));
  const charcasLista: Charca[] = [];
  for (let i = 0; i < disp.rejilla.total; i++) {
    if (mapa.terreno[i] !== 'marisma') continue;
    const charcas = enteroEntre(rng, ca.charcasMin, ca.charcasMax);
    for (let c = 0; c < charcas; c++) {
      const ang = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * ca.dispersionCharca * R;
      const px = disp.x[i] + Math.cos(ang) * dist;
      const pz = disp.z[i] + Math.sin(ang) * dist;
      const radio = (ca.radioCharcaMin + rng() * (ca.radioCharcaMax - ca.radioCharcaMin)) * R;
      const y = campo.alturaEn(px, pz) + ca.alzaCharca;
      charcasLista.push({ x: px, y, z: pz, radio });
      const centro = b.vertice(px, y, pz, paleta.marismaAgua, 0, 0, 0);
      const borde: number[] = [];
      for (let k = 0; k < LADOS_CHARCA; k++) {
        const a = (k / LADOS_CHARCA) * Math.PI * 2;
        const rr = radio * (0.7 + rng() * 0.5);
        const bx = px + Math.cos(a) * rr;
        const bz = pz - Math.sin(a) * rr;
        borde.push(b.vertice(bx, Math.max(y, campo.alturaEn(bx, bz) + ca.alzaCharca * 0.5), bz, paleta.marismaAgua, ca.orillaCharca, 0, 0));
      }
      for (let k = 0; k < LADOS_CHARCA; k++) b.indices.push(centro, borde[k], borde[(k + 1) % LADOS_CHARCA]);
    }
  }

  const geometria = b.geometria();
  const material = crearMaterialAgua(cfg, uniformes, false);
  const malla = new THREE.Mesh(geometria, material);
  malla.receiveShadow = true;

  // Mar: un plano enorme a cota 0. Donde hay tierra, el terreno lo tapa; la costa sale sola.
  const matMar = crearMaterialAgua(cfg, uniformes, false);
  const geoMar = new THREE.PlaneGeometry(ca.oceanoExterior, ca.oceanoExterior, 1, 1).rotateX(-Math.PI / 2);
  const nMar = geoMar.getAttribute('position').count;
  const colorMar = paleta.marMedio.clone().lerp(paleta.marProfundo, 0.4);
  geoMar.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: nMar }, () => colorMar.toArray()).flat(), 3));
  geoMar.setAttribute('aOrilla', new THREE.Float32BufferAttribute(new Float32Array(nMar), 1));
  geoMar.setAttribute('aFlujo', new THREE.Float32BufferAttribute(new Float32Array(nMar * 2), 2));
  const mar = new THREE.Mesh(geoMar, matMar);
  const centroMapa = disp.caja.getCenter(new THREE.Vector3());
  mar.position.set(centroMapa.x, campo.nivelMar, centroMapa.z);
  mar.receiveShadow = true;

  const raiz = new THREE.Group();
  raiz.add(mar, malla);

  return {
    raiz,
    charcas: charcasLista,
    actualizar(dt) {
      uniformes.uTiempo.value += dt * ca.velocidadOlas;
    },
    liberar() {
      geometria.dispose();
      material.dispose();
      geoMar.dispose();
      matMar.dispose();
    },
  };
}
