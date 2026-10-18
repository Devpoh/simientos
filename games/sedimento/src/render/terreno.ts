import * as THREE from 'three';
import { crearRng, derivarSemilla } from '../logic/azar';
import type { Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import { pieza } from './geometria';
import type { Paleta } from './paleta';

/**
 * Prisma hexagonal de altura 1 con la base en y=0. Los colores de vértice son un multiplicador
 * del color de instancia: la tapa conserva el color del bioma (con un borde algo más oscuro que
 * dibuja la rejilla) y el lateral se oscurece hacia abajo en tono tierra.
 */
function crearPrisma(cfg: ConfigRender, paleta: Paleta): THREE.BufferGeometry {
  const R = cfg.tamanoHex;
  const base = new THREE.CylinderGeometry(R, R, 1, 6).translate(0, 0.5, 0);
  const g = pieza(base, '#ffffff');
  const pos = g.attributes.position;
  const normal = g.attributes.normal;
  const col = g.attributes.color;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = normal.getY(i);
    if (ny > 0.5) {
      const radio = Math.hypot(pos.getX(i), pos.getZ(i)) / R;
      c.setScalar(radio < 0.01 ? 1 : cfg.vineteTapa);
    } else if (ny < -0.5) {
      c.copy(paleta.ladoInferior);
    } else {
      c.lerpColors(paleta.ladoInferior, paleta.ladoSuperior, pos.getY(i));
    }
    col.setXYZ(i, c.r, c.g, c.b);
  }
  return g;
}

/**
 * Detalle de suelo sin texturas: ruido de valor en 3 escalas, calculado en el fragment shader a partir
 * de la posición en el mundo (así es continuo entre hexágonos). Varía el brillo y el tono (manchas de
 * arena, hierba más seca…) y perturba un poco la normal para que la luz dibuje ondulaciones.
 * Solo afecta a las tapas (vTapa = 1), no a los laterales.
 */
function aplicarDetalleSuelo(material: THREE.MeshStandardMaterial, cfg: ConfigRender): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrano = { value: cfg.suelo.grano };
    shader.uniforms.uRelieve = { value: cfg.suelo.relieve };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundoT;\nvarying float vTapa;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vMundoT = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        vTapa = step(0.5, objectNormal.y);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGrano;
        uniform float uRelieve;
        varying vec3 vMundoT;
        varying float vTapa;
        float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float ruidoValor(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float suelo(vec2 p) { return ruidoValor(p * 0.55) * 0.55 + ruidoValor(p * 2.3) * 0.3 + ruidoValor(p * 7.0) * 0.15; }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float rel = suelo(vMundoT.xz) - 0.5;
        float mancha = ruidoValor(vMundoT.xz * 0.23 + 11.0) - 0.5;
        diffuseColor.rgb *= 1.0 + vTapa * (rel * uGrano + mancha * vec3(0.16, 0.06, -0.14));`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        float paso = 0.08;
        float gx = suelo(vMundoT.xz + vec2(paso, 0.0)) - suelo(vMundoT.xz);
        float gz = suelo(vMundoT.xz + vec2(0.0, paso)) - suelo(vMundoT.xz);
        normal = normalize(normal + vTapa * uRelieve * (viewMatrix * vec4(-gx, 0.0, -gz, 0.0)).xyz / paso * 0.12);`,
      );
  };
}

export interface Terreno {
  readonly malla: THREE.InstancedMesh;
  readonly colores: THREE.Color[];
  liberar(): void;
}

/** Un prisma por hexágono (tierra y lecho de agua) en un solo InstancedMesh: una llamada de dibujo. */
export function crearTerreno(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta): Terreno {
  const n = disp.rejilla.total;
  const geometria = crearPrisma(cfg, paleta);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
  aplicarDetalleSuelo(material, cfg);
  const malla = new THREE.InstancedMesh(geometria, material, n);
  malla.castShadow = true;
  malla.receiveShadow = true;

  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-color'));
  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const sinGiro = new THREE.Quaternion();
  const color = new THREE.Color();
  const colores: THREE.Color[] = [];

  for (let i = 0; i < n; i++) {
    posicion.set(disp.x[i], 0, disp.z[i]);
    escala.set(1, disp.cima[i], 1);
    malla.setMatrixAt(i, matriz.compose(posicion, sinGiro, escala));
    paleta.colorTapa(mapa, i, (rng() - 0.5) * 2 * cfg.variacionColor, color);
    // Tono y saturación también varían por hexágono: así el desierto no es una mancha plana.
    color.offsetHSL((rng() - 0.5) * 2 * cfg.variacionTono, (rng() - 0.5) * 2 * cfg.variacionTono * 2, 0);
    // Hacia el borde la tierra se vuelve arena.
    color.lerp(paleta.playa, (1 - disp.interior[i]) * cfg.borde.mezclaPlaya);
    malla.setColorAt(i, color);
    colores.push(color.clone());
  }
  malla.instanceMatrix.needsUpdate = true;
  if (malla.instanceColor) malla.instanceColor.needsUpdate = true;

  return {
    malla,
    colores,
    liberar() {
      geometria.dispose();
      material.dispose();
      malla.dispose();
    },
  };
}
