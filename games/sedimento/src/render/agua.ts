import * as THREE from 'three';
import { crearRng, derivarSemilla, enteroEntre } from '../logic/azar';
import { esAgua, type Mapa } from '../logic/mapa';
import { ruidoValor } from '../logic/ruido';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import type { Paleta } from './paleta';

/** Lados del polígono irregular de una charca de marisma. */
const LADOS_CHARCA = 9;
/** El océano exterior va justo bajo la lámina del mar: continúa el agua sin escalón en el borde del
 *  mapa y tapa el lecho (que se transparentaba lechoso). El hueco evita que parpadee con la lámina. */
const HUNDIMIENTO_OCEANO = 0.05;
/** Diferencia mínima de cota entre dos tramos de río para dibujar una cascada entre ellos. */
const SALTO_CASCADA = 0.01;

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
        // En un río las dos orillas están muy cerca: espuma más tenue para que se lea el agua.
        espuma *= mix(1.0, 0.4, clamp(length(vFlujo), 0.0, 1.0));
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

export interface Agua {
  readonly raiz: THREE.Group;
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
 * Río, lago, mar y charcos de marisma en una sola malla continua, más un océano que rodea el mapa.
 * Cada hexágono es un anillo exterior de 12 puntos (esquinas y mitades de lado), uno interior y
 * el centro. Los puntos del borde que comparten varios hexágonos promedian color y corriente:
 * por eso no se ven costuras. La espuma vive solo en la franja entre los dos anillos.
 */
export function crearAgua(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta): Agua {
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
  const { rejilla } = disp;
  const n = rejilla.total;

  // Esquinas en el mismo orden que los prismas del terreno (la 0 apunta a -z).
  const esquinaX = (k: number) => R * Math.cos(Math.PI / 2 + (k * Math.PI) / 3);
  const esquinaZ = (k: number) => -R * Math.sin(Math.PI / 2 + (k * Math.PI) / 3);
  const clave = (x: number, z: number) => `${Math.round(x * 1000)},${Math.round(z * 1000)}`;

  // Qué hexágonos tocan cada esquina del mapa (2 o 3).
  const tocan = new Map<string, number[]>();
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 6; k++) {
      const c = clave(disp.x[i] + esquinaX(k), disp.z[i] + esquinaZ(k));
      const lista = tocan.get(c);
      if (lista) lista.push(i);
      else tocan.set(c, [i]);
    }

  // Hacia dónde corre el agua en cada tramo de río (vector unitario en x, z).
  const flujoX = new Float32Array(n);
  const flujoZ = new Float32Array(n);
  const asignado = new Uint8Array(n);
  for (const cauce of mapa.rios)
    for (let k = 0; k < cauce.length; k++) {
      const i = cauce[k];
      if (asignado[i] || mapa.terreno[i] !== 'rio') continue;
      const [a, b] = k + 1 < cauce.length ? [i, cauce[k + 1]] : [cauce[Math.max(0, k - 1)], i];
      const dx = disp.x[b] - disp.x[a];
      const dz = disp.z[b] - disp.z[a];
      const l = Math.hypot(dx, dz) || 1;
      flujoX[i] = dx / l;
      flujoZ[i] = dz / l;
      asignado[i] = 1;
    }

  const colorHex = new Array<THREE.Color>(n);
  const agua: number[] = [];
  const marisma: number[] = [];
  let laminaMar = -Infinity;
  for (let i = 0; i < n; i++) {
    const t = mapa.terreno[i];
    if (esAgua(t)) {
      agua.push(i);
      colorHex[i] = paleta.colorAgua(mapa, disp, i, 0, new THREE.Color());
    } else if (t === 'marisma') marisma.push(i);
    if (t === 'mar') laminaMar = Math.max(laminaMar, disp.aguaY[i]);
  }

  const b = new Constructor();
  const tmp = new THREE.Color();

  /** Promedia color y flujo de los hexágonos de agua que tocan un punto del borde; marca orilla si toca tierra. */
  const puntoBorde = (i: number, tocantes: number[], y: number, x: number, z: number, orillaForzada?: number) => {
    tmp.setRGB(0, 0, 0);
    let fx = 0;
    let fz = 0;
    let nAgua = 0;
    let tierra = false;
    for (const j of tocantes) {
      if (!esAgua(mapa.terreno[j])) {
        tierra = true;
        continue;
      }
      tmp.add(colorHex[j]);
      fx += flujoX[j];
      fz += flujoZ[j];
      nAgua++;
    }
    tmp.multiplyScalar(1 / Math.max(1, nAgua));
    // En el borde del mapa el mar sigue (océano exterior); un río o lago, en cambio, acaba en orilla.
    if (tocantes.length < 3 && mapa.terreno[i] !== 'mar') tierra = true;
    const orilla = orillaForzada ?? (tierra ? 1 : 0);
    return b.vertice(x, y, z, tmp, orilla, fx / Math.max(1, nAgua), fz / Math.max(1, nAgua));
  };

  for (const i of agua) {
    const y = disp.aguaY[i];
    const cx = disp.x[i];
    const cz = disp.z[i];
    const exterior: number[] = [];
    const interior: number[] = [];
    const tocantesEsquina: number[][] = [];
    for (let k = 0; k < 6; k++) tocantesEsquina.push(tocan.get(clave(cx + esquinaX(k), cz + esquinaZ(k))) ?? [i]);
    for (let k = 0; k < 6; k++) {
      const k2 = (k + 1) % 6;
      // Esquina k y mitad del lado k → k+1 (el vecino de ese lado es quien comparte las dos esquinas).
      exterior.push(puntoBorde(i, tocantesEsquina[k], y, cx + esquinaX(k), cz + esquinaZ(k)));
      const vecino = tocantesEsquina[k].filter((j) => j !== i && tocantesEsquina[k2].includes(j));
      const ladoTocantes = [i, ...vecino];
      const mx = cx + (esquinaX(k) + esquinaX(k2)) / 2;
      const mz = cz + (esquinaZ(k) + esquinaZ(k2)) / 2;
      // Un lado abierto al borde del mapa: el mar continúa, el río no.
      const forzada = vecino.length === 0 ? (mapa.terreno[i] === 'mar' ? 0 : 1) : undefined;
      exterior.push(puntoBorde(i, ladoTocantes, y, mx, mz, forzada));
    }
    // En el río las orillas están a un paso: franja de espuma estrecha. En mar y lago, ancha.
    const anillo = mapa.terreno[i] === 'rio' ? ca.anilloRio : ca.anilloInterior;
    const centro = b.vertice(cx, y, cz, colorHex[i], 0, flujoX[i], flujoZ[i]);
    for (let k = 0; k < 12; k++) {
      const v = exterior[k];
      const px = b.pos[v * 3];
      const pz = b.pos[v * 3 + 2];
      // El color del anillo interior va a medio camino entre el centro y el borde: degradado sin escalones.
      tmp.setRGB(b.col[v * 3], b.col[v * 3 + 1], b.col[v * 3 + 2]).lerp(colorHex[i], 1 - anillo);
      interior.push(b.vertice(cx + (px - cx) * anillo, y, cz + (pz - cz) * anillo, tmp, 0, flujoX[i], flujoZ[i]));
    }
    for (let k = 0; k < 12; k++) {
      const k2 = (k + 1) % 12;
      // Sentido antihorario visto desde arriba (+y), para que la cara mire hacia el cielo.
      b.indices.push(centro, interior[k], interior[k2]);
      b.indices.push(interior[k], exterior[k], exterior[k2], interior[k], exterior[k2], interior[k2]);
    }
  }

  // Cascadas: donde el río baja de nivel, una cortina blanca une las dos láminas de agua.
  for (const cauce of mapa.rios)
    for (let k = 0; k + 1 < cauce.length; k++) {
      const i = cauce[k];
      const j = cauce[k + 1];
      if (!esAgua(mapa.terreno[i]) || !esAgua(mapa.terreno[j]) || disp.aguaY[i] - disp.aguaY[j] < SALTO_CASCADA) continue;
      const comunes: number[] = [];
      for (let e = 0; e < 6; e++) {
        const t = tocan.get(clave(disp.x[i] + esquinaX(e), disp.z[i] + esquinaZ(e)));
        if (t?.includes(j)) comunes.push(e);
      }
      if (comunes.length !== 2) continue;
      const [e1, e2] = comunes;
      const ax = disp.x[i] + esquinaX(e1);
      const az = disp.z[i] + esquinaZ(e1);
      const bx = disp.x[i] + esquinaX(e2);
      const bz = disp.z[i] + esquinaZ(e2);
      const espuma = tmp.set(ca.colorEspuma);
      const v0 = b.vertice(ax, disp.aguaY[i], az, espuma, 1, flujoX[i], flujoZ[i]);
      const v1 = b.vertice(bx, disp.aguaY[i], bz, espuma, 1, flujoX[i], flujoZ[i]);
      const v2 = b.vertice(bx, disp.aguaY[j], bz, espuma, 1, flujoX[i], flujoZ[i]);
      const v3 = b.vertice(ax, disp.aguaY[j], az, espuma, 1, flujoX[i], flujoZ[i]);
      b.indices.push(v0, v1, v2, v0, v2, v3, v0, v2, v1, v0, v3, v2);
    }

  // Charcas de marisma: 2–4 manchas irregulares de agua quieta entre los juncos, nunca un hexágono.
  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-agua'));
  for (const i of marisma) {
    const y = disp.cima[i] + ca.alzaCharca;
    const charcas = enteroEntre(rng, ca.charcasMin, ca.charcasMax);
    for (let c = 0; c < charcas; c++) {
      const ang = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * ca.dispersionCharca * R;
      const px = disp.x[i] + Math.cos(ang) * dist;
      const pz = disp.z[i] + Math.sin(ang) * dist;
      const radio = (ca.radioCharcaMin + rng() * (ca.radioCharcaMax - ca.radioCharcaMin)) * R;
      const centro = b.vertice(px, y, pz, paleta.marismaAgua, 0, 0, 0);
      const borde: number[] = [];
      for (let k = 0; k < LADOS_CHARCA; k++) {
        const a = (k / LADOS_CHARCA) * Math.PI * 2;
        const r = radio * (0.7 + rng() * 0.5);
        borde.push(b.vertice(px + Math.cos(a) * r, y, pz - Math.sin(a) * r, paleta.marismaAgua, ca.orillaCharca, 0, 0));
      }
      for (let k = 0; k < LADOS_CHARCA; k++) b.indices.push(centro, borde[k], borde[(k + 1) % LADOS_CHARCA]);
    }
  }

  const orillas = crearOrillas(mapa, disp, cfg, tocan, clave, esquinaX, esquinaZ);

  const geometria = b.geometria();
  const material = crearMaterialAgua(cfg, uniformes, false);
  const matOceano = crearMaterialAgua(cfg, uniformes, true);
  const malla = new THREE.Mesh(geometria, material);
  malla.receiveShadow = true;

  // El mapa termina en un borde recto; este plano enorme hace que el mar siga hasta el horizonte (la niebla lo funde).
  const geoOceano = new THREE.PlaneGeometry(ca.oceanoExterior, ca.oceanoExterior).rotateX(-Math.PI / 2);
  const colorOceano = paleta.marProfundo.clone().lerp(paleta.marMedio, 0.35);
  const nOceano = geoOceano.getAttribute('position').count;
  geoOceano.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: nOceano }, () => colorOceano.toArray()).flat(), 3));
  geoOceano.setAttribute('aOrilla', new THREE.Float32BufferAttribute(new Float32Array(nOceano), 1));
  geoOceano.setAttribute('aFlujo', new THREE.Float32BufferAttribute(new Float32Array(nOceano * 2), 2));
  const oceano = new THREE.Mesh(geoOceano, matOceano);
  const centroMapa = disp.caja.getCenter(new THREE.Vector3());
  oceano.position.set(centroMapa.x, (Number.isFinite(laminaMar) ? laminaMar : 0) - HUNDIMIENTO_OCEANO, centroMapa.z);
  oceano.receiveShadow = true;
  // El océano se dibuja antes que el agua del mapa para que la transparencia no los mezcle mal.
  oceano.renderOrder = -1;

  const raiz = new THREE.Group();
  raiz.add(oceano, malla, orillas.malla);

  return {
    raiz,
    actualizar(dt) {
      uniformes.uTiempo.value += dt * ca.velocidadOlas;
    },
    liberar() {
      geometria.dispose();
      material.dispose();
      geoOceano.dispose();
      matOceano.dispose();
      orillas.liberar();
    },
  };
}

/**
 * Orillas: una franja de arena (mar y lago) o de barro (río, marisma) en cada lado de tierra que
 * toca agua. Va de un poco hacia dentro de la tapa hasta meterse bajo la lámina de agua, así que
 * tapa el corte vertical del prisma y la tierra «entra» en el agua en pendiente, como una playa.
 */
function crearOrillas(
  mapa: Mapa,
  disp: Disposicion,
  cfg: ConfigRender,
  tocan: Map<string, number[]>,
  clave: (x: number, z: number) => string,
  esquinaX: (k: number) => number,
  esquinaZ: (k: number) => number,
): { malla: THREE.Mesh; liberar(): void } {
  const ca = cfg.agua;
  const R = cfg.tamanoHex;
  const semilla = derivarSemilla(mapa.semilla, 'render-orillas');
  const arena = new THREE.Color(ca.colorArena);
  const barro = new THREE.Color(ca.colorBarro);
  const pos: number[] = [];
  const col: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
  };
  const color = new THREE.Color();

  for (let i = 0; i < disp.rejilla.total; i++) {
    if (esAgua(mapa.terreno[i])) continue;
    const cx = disp.x[i];
    const cz = disp.z[i];
    const yTierra = disp.cima[i] + ca.alzaOrilla;
    // Para cada lado: el hexágono de agua al otro lado, si lo hay.
    const aguaEnLado: number[] = [];
    for (let k = 0; k < 6; k++) {
      const a = tocan.get(clave(cx + esquinaX(k), cz + esquinaZ(k))) ?? [];
      const b = tocan.get(clave(cx + esquinaX((k + 1) % 6), cz + esquinaZ((k + 1) % 6))) ?? [];
      const j = a.find((h) => h !== i && b.includes(h));
      aguaEnLado.push(j !== undefined && esAgua(mapa.terreno[j]) ? j : -1);
    }
    if (aguaEnLado.every((j) => j === -1)) continue;

    // Punto interior de cada esquina, con anchura irregular (ruido en coordenadas del mundo).
    const interior = (k: number) => {
      const ex = cx + esquinaX(k);
      const ez = cz + esquinaZ(k);
      const ancho = ca.anchoOrilla * (0.6 + 0.8 * ruidoValor(semilla, ex * 2.3, ez * 2.3));
      return new THREE.Vector3(cx + esquinaX(k) * (1 - ancho), yTierra, cz + esquinaZ(k) * (1 - ancho));
    };
    const borde = (k: number) => new THREE.Vector3(cx + esquinaX(k), yTierra, cz + esquinaZ(k));
    /** Punto de la esquina k empujado hacia el agua del lado `lado`, ya bajo su lámina. */
    const fuera = (k: number, lado: number) => {
      const j = aguaEnLado[lado];
      const l2 = (lado + 1) % 6;
      const nx = (esquinaX(lado) + esquinaX(l2)) / 2;
      const nz = (esquinaZ(lado) + esquinaZ(l2)) / 2;
      const nl = Math.hypot(nx, nz);
      const entra = (mapa.terreno[j] === 'rio' ? ca.entradaRio : ca.entradaMar) * R;
      return new THREE.Vector3(cx + esquinaX(k) + (nx / nl) * entra, disp.aguaY[j] - ca.hundidoOrilla, cz + esquinaZ(k) + (nz / nl) * entra);
    };
    for (let k = 0; k < 6; k++) {
      const j = aguaEnLado[k];
      if (j === -1) continue;
      const k2 = (k + 1) % 6;
      const fango = mapa.terreno[j] === 'rio' || mapa.terreno[i] === 'marisma';
      color.copy(fango ? barro : arena).multiplyScalar(0.94 + 0.12 * ruidoValor(semilla, cx * 5 + k, cz * 5));
      const i1 = interior(k);
      const i2 = interior(k2);
      const b1 = borde(k);
      const b2 = borde(k2);
      const f1 = fuera(k, k);
      const f2 = fuera(k2, k);
      // Tramo llano sobre la tapa y tramo en pendiente hacia el agua (antihorario visto desde arriba).
      tri(i1, b1, b2, color);
      tri(i1, b2, i2, color);
      tri(b1, f1, f2, color);
      tri(b1, f2, b2, color);
      // Esquina convexa: si el lado anterior también es orilla, se rellena la cuña entre las dos pendientes.
      const kAnt = (k + 5) % 6;
      if (aguaEnLado[kAnt] !== -1) tri(b1, fuera(k, kAnt), f1, color);
    }
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometria.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const malla = new THREE.Mesh(geometria, material);
  malla.receiveShadow = true;
  return {
    malla,
    liberar() {
      geometria.dispose();
      material.dispose();
    },
  };
}
