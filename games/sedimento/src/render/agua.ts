import * as THREE from 'three';
import { crearRng, derivarSemilla } from '../logic/azar';
import { esAgua, type Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import type { Paleta } from './paleta';

/** Proporción del hexágono que ocupa el charco de una marisma. */
const ESCALA_CHARCO = 0.85;
/** Cuánto asoma el charco sobre la tapa de la marisma, para que no parpadee con ella. */
const ALZA_CHARCO = 0.015;
/** El océano exterior queda justo bajo el lecho más bajo del mar: dentro del mapa no se ve. */
const HUNDIMIENTO_OCEANO = 0.012;

interface Uniformes {
  uTiempo: { value: number };
}

/**
 * Agua con olas sin texturas: un MeshStandardMaterial al que se le inyecta código GLSL.
 * Dos retoques en el fragment shader: variación de brillo (olas) y normal perturbada (la luz
 * rebota distinto en cada cresta). Todo depende de la posición en el
 * mundo y de `uTiempo`, así que el agua se mueve sin geometría extra.
 */
function crearMaterialAgua(cfg: ConfigRender, uniformes: Uniformes, opaco: boolean): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    roughness: cfg.agua.rugosidad,
    metalness: 0,
    transparent: !opaco,
    opacity: opaco ? 1 : cfg.agua.opacidad,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = uniformes.uTiempo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 mundo = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          mundo = instanceMatrix * mundo;
        #endif
        vMundo = (modelMatrix * mundo).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTiempo;\nvarying vec3 vMundo;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float ola = sin(vMundo.x * 2.3 + uTiempo * 1.4) * sin(vMundo.z * 2.1 - uTiempo * 1.1)
                  + 0.5 * sin((vMundo.x + vMundo.z) * 4.1 + uTiempo * 2.2);
        diffuseColor.rgb *= 1.0 + 0.06 * ola;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec3 sacudida = vec3(
          cos(vMundo.x * 2.3 + uTiempo * 1.4) * 0.5 + cos((vMundo.x + vMundo.z) * 4.1 + uTiempo * 2.2) * 0.25,
          0.0,
          cos(vMundo.z * 2.1 - uTiempo * 1.1) * 0.5 + cos((vMundo.x + vMundo.z) * 4.1 + uTiempo * 2.2) * 0.25);
        normal = normalize(normal + 0.12 * sacudida);`,
      );
  };
  return material;
}

export interface Agua {
  readonly raiz: THREE.Group;
  actualizar(dt: number): void;
  liberar(): void;
}

/** Río, lago y mar (una malla instanciada), charcos de marisma y un océano que rodea el mapa. */
export function crearAgua(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta): Agua {
  const uniformes: Uniformes = { uTiempo: { value: 0 } };
  const R = cfg.tamanoHex;
  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-agua'));

  const hexAgua: number[] = [];
  const hexMarisma: number[] = [];
  let lechoMar = Infinity;
  for (let i = 0; i < disp.rejilla.total; i++) {
    const t = mapa.terreno[i];
    if (esAgua(t)) hexAgua.push(i);
    else if (t === 'marisma') hexMarisma.push(i);
    if (t === 'mar') lechoMar = Math.min(lechoMar, disp.cima[i]);
  }

  // Hexágono plano con un vértice hacia -z, igual que los prismas del terreno.
  const hexagono = new THREE.CircleGeometry(R, 6, Math.PI / 2).rotateX(-Math.PI / 2);
  const material = crearMaterialAgua(cfg, uniformes, false);
  const malla = new THREE.InstancedMesh(hexagono, material, hexAgua.length + hexMarisma.length);
  malla.receiveShadow = true;

  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const sinGiro = new THREE.Quaternion();
  const color = new THREE.Color();
  let k = 0;
  for (const i of hexAgua) {
    posicion.set(disp.x[i], disp.aguaY[i], disp.z[i]);
    malla.setMatrixAt(k, matriz.compose(posicion, sinGiro, escala.set(1, 1, 1)));
    malla.setColorAt(k++, paleta.colorAgua(mapa, disp, i, (rng() - 0.5) * 2 * cfg.variacionColor, color));
  }
  for (const i of hexMarisma) {
    posicion.set(disp.x[i], disp.cima[i] + ALZA_CHARCO, disp.z[i]);
    malla.setMatrixAt(k, matriz.compose(posicion, sinGiro, escala.set(ESCALA_CHARCO, 1, ESCALA_CHARCO)));
    malla.setColorAt(k++, color.copy(paleta.marismaAgua));
  }
  malla.instanceMatrix.needsUpdate = true;
  if (malla.instanceColor) malla.instanceColor.needsUpdate = true;

  // El mapa termina en un borde recto; este plano enorme hace que el mar siga hasta el horizonte (la niebla lo funde).
  const geoOceano = new THREE.PlaneGeometry(cfg.agua.oceanoExterior, cfg.agua.oceanoExterior).rotateX(-Math.PI / 2);
  const matOceano = crearMaterialAgua(cfg, uniformes, true);
  matOceano.color.copy(paleta.marProfundo).lerp(paleta.marMedio, 0.35);
  const oceano = new THREE.Mesh(geoOceano, matOceano);
  const centro = disp.caja.getCenter(new THREE.Vector3());
  oceano.position.set(centro.x, (Number.isFinite(lechoMar) ? lechoMar : 0) - HUNDIMIENTO_OCEANO, centro.z);
  oceano.receiveShadow = true;

  const raiz = new THREE.Group();
  raiz.add(oceano, malla);

  return {
    raiz,
    actualizar(dt) {
      uniformes.uTiempo.value += dt * cfg.agua.velocidadOlas;
    },
    liberar() {
      hexagono.dispose();
      material.dispose();
      malla.dispose();
      geoOceano.dispose();
      matOceano.dispose();
    },
  };
}
