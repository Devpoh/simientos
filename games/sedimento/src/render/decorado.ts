import * as THREE from 'three';
import { crearRng, derivarSemilla, enteroEntre, type Rng } from '../logic/azar';
import type { Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import { Modelos } from './modelos';
import type { SueloEn } from './vegetacion';

const KENNEY = 'kenney-nature/';
const KAYKIT = 'kaykit-hex/';
const ARBUSTOS = [`${KENNEY}plant_bush.glb`, `${KENNEY}plant_bushDetailed.glb`];
const FLORES = [`${KENNEY}flower_redA.glb`, `${KENNEY}flower_yellowA.glb`, `${KENNEY}flower_purpleA.glb`];
const TRONCOS = [`${KENNEY}log.glb`, `${KENNEY}stump_round.glb`];
const ROCAS_AGUA = [`${KENNEY}rock_smallA.glb`, `${KENNEY}rock_smallB.glb`, `${KAYKIT}rock_single_C.gltf`];
const NENUFARES = [`${KENNEY}lily_small.glb`, `${KAYKIT}waterlily_B.gltf`];
const PLANTAS_ACUATICAS = [`${KAYKIT}waterplant_A.gltf`, `${KAYKIT}waterplant_C.gltf`];
const NUBES = [`${KAYKIT}cloud_big.gltf`, `${KAYKIT}cloud_small.gltf`];

/** Hasta dónde llegan los objetos pequeños desde el centro del hexágono (la apotema mide 0,87). */
const ALCANCE = 0.7;
/** Por debajo de este "interior" (borde de playa) no crece decorado de tierra. */
const INTERIOR_MINIMO = 0.7;
/** Lo que se hunde una roca en el agua y lo que sobresale un nenúfar sobre ella. */
const HUNDIMIENTO_ROCA_AGUA = 0.03;
const ALZA_NENUFAR = 0.012;
/** Margen (en hexágonos) por fuera del mapa en el que las nubes aparecen y desaparecen. */
const MARGEN_NUBES = 30;
/** Metros de altura de cámara en los que las nubes pasan de visibles a invisibles al cruzar su capa. */
const BANDA_CAPA_NUBES = 6;
/** La atenuación por altura de cámara empieza a esta fracción del límite configurado. */
const INICIO_ATENUACION = 0.3;

/** Posición de una charca de marisma (la expone el agua) donde pueden flotar nenúfares. */
export interface Charca {
  x: number;
  y: number;
  z: number;
  radio: number;
}

interface Colocacion {
  x: number;
  y: number;
  z: number;
  escala: number;
  giro: number;
  brillo: number;
}

export interface Decorado {
  readonly raiz: THREE.Group;
  actualizar(dt: number): void;
  liberar(): void;
}

const suavizar = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * Objetos de los paquetes CC0 (Kenney y KayKit): arbustos, flores, troncos, rocas de río, nenúfares,
 * plantas acuáticas y nubes. Se cargan en segundo plano: el mapa se ve ya y esto aparece al llegar.
 */
export function crearDecorado(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, suelo: SueloEn, charcas: readonly Charca[] = []): Decorado {
  const d = cfg.decorado;
  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-decorado'));
  const raiz = new THREE.Group();
  const modelos = new Modelos(cfg);
  const colocaciones = new Map<string, Colocacion[]>();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const mallas: THREE.InstancedMesh[] = [];
  let liberado = false;

  const entre = (r: Rng, [min, max]: readonly number[]) => min + r() * (max - min);
  const elegir = <T>(lista: readonly T[]): T => lista[Math.floor(rng() * lista.length)];
  const anadir = (ruta: string, x: number, y: number, z: number, escala: number) => {
    const lista = colocaciones.get(ruta) ?? [];
    lista.push({ x, y, z, escala, giro: rng() * Math.PI * 2, brillo: 0.92 + rng() * 0.16 });
    colocaciones.set(ruta, lista);
  };
  const puntoEn = (i: number, alcance: number): [number, number] => {
    const radio = Math.sqrt(rng()) * alcance * cfg.tamanoHex;
    const ang = rng() * Math.PI * 2;
    return [disp.x[i] + Math.cos(ang) * radio, disp.z[i] + Math.sin(ang) * radio];
  };

  for (let i = 0; i < disp.rejilla.total; i++) {
    const terreno = mapa.terreno[i];
    const fert = mapa.fertilidad[i];
    if (terreno === 'llanura' || terreno === 'colina') {
      if (disp.interior[i] < INTERIOR_MINIMO) continue;
      // Para no estorbar la construcción libre, los objetos grandes solo van en colinas y en estepa pobre; la llanura fértil queda para edificios.
      const construible = terreno === 'llanura' && fert >= 0.5;
      if (!construible && fert >= 0.25 && rng() < d.probArbusto) {
        for (let k = enteroEntre(rng, 1, 2); k > 0; k--) {
          const [x, z] = puntoEn(i, ALCANCE);
          anadir(elegir(ARBUSTOS), x, suelo(i, x, z), z, entre(rng, d.escalaArbusto));
        }
      }
      if (fert >= 0.5 && rng() < d.probFlores) {
        const [cx, cz] = puntoEn(i, ALCANCE * 0.7);
        for (let k = enteroEntre(rng, 2, 4); k > 0; k--) {
          const x = cx + (rng() - 0.5) * 0.3;
          const z = cz + (rng() - 0.5) * 0.3;
          anadir(elegir(FLORES), x, suelo(i, x, z), z, entre(rng, d.escalaFlor));
        }
      }
      if (mapa.vegetacion[i] === 'bosque' && rng() < d.probTronco) {
        const [x, z] = puntoEn(i, ALCANCE);
        anadir(elegir(TRONCOS), x, suelo(i, x, z), z, entre(rng, d.escalaTronco));
      }
    } else if (terreno === 'rio' || terreno === 'lago') {
      if (rng() < d.probRocasAgua) {
        for (let k = enteroEntre(rng, 1, 2); k > 0; k--) {
          const [x, z] = puntoEn(i, ALCANCE);
          anadir(elegir(ROCAS_AGUA), x, disp.aguaY[i] - HUNDIMIENTO_ROCA_AGUA, z, entre(rng, d.escalaRocaAgua));
        }
      }
      if (terreno === 'lago' && rng() < d.probNenufares) {
        for (let k = enteroEntre(rng, 1, 3); k > 0; k--) {
          const [x, z] = puntoEn(i, ALCANCE);
          anadir(elegir(NENUFARES), x, disp.aguaY[i] + ALZA_NENUFAR, z, entre(rng, d.escalaNenufar));
        }
        if (rng() < 0.5) {
          const [x, z] = puntoEn(i, ALCANCE);
          anadir(elegir(PLANTAS_ACUATICAS), x, disp.aguaY[i], z, entre(rng, d.escalaNenufar));
        }
      }
    }
  }

  for (const c of charcas) {
    if (rng() > d.probNenufares + 0.2) continue;
    for (let k = enteroEntre(rng, 1, 2); k > 0; k--) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * c.radio * 0.6;
      anadir(elegir(NENUFARES), c.x + Math.cos(a) * r, c.y + ALZA_NENUFAR, c.z + Math.sin(a) * r, entre(rng, d.escalaNenufar));
    }
    const a = rng() * Math.PI * 2;
    anadir(elegir(PLANTAS_ACUATICAS), c.x + Math.cos(a) * c.radio * 0.5, c.y, c.z + Math.sin(a) * c.radio * 0.5, entre(rng, d.escalaNenufar));
  }

  // --- Carga en segundo plano: cada modelo crea su InstancedMesh cuando llega ---
  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const giro = new THREE.Quaternion();
  const ejeY = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const blanco = new THREE.Color(1, 1, 1);
  const SOMBRAS_PEQUENAS = false;

  const montar = (ruta: string, lista: readonly Colocacion[], geometria: THREE.BufferGeometry, mat: THREE.Material, sombra: boolean): THREE.InstancedMesh => {
    const malla = new THREE.InstancedMesh(geometria, mat, lista.length);
    malla.castShadow = sombra;
    malla.receiveShadow = true;
    lista.forEach((c, k) => {
      posicion.set(c.x, c.y, c.z);
      escala.setScalar(c.escala);
      giro.setFromAxisAngle(ejeY, c.giro);
      malla.setMatrixAt(k, matriz.compose(posicion, giro, escala));
      malla.setColorAt(k, color.copy(blanco).multiplyScalar(c.brillo));
    });
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.name = ruta;
    return malla;
  };

  for (const [ruta, lista] of colocaciones) {
    void modelos.geometria(ruta).then((geometria) => {
      if (!geometria || liberado) return;
      const sombra = ruta.includes('rock') || ruta.includes('log') ? true : SOMBRAS_PEQUENAS;
      const malla = montar(ruta, lista, geometria, material, sombra);
      mallas.push(malla);
      raiz.add(malla);
    });
  }

  // --- Nubes: pocas, altas y lentas; se atenúan según la altura de la cámara para no tapar el mapa ---
  const nubes = d.nubes;
  const materialNubes = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    metalness: 0,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  interface Nube {
    ruta: string;
    x: number;
    z: number;
    escala: number;
    giro: number;
  }
  const lugares: Nube[] = [];
  const caja = disp.caja;
  const margen = MARGEN_NUBES * cfg.tamanoHex;
  if (nubes.activas) {
    for (let k = 0; k < nubes.cantidad; k++) {
      lugares.push({
        ruta: elegir(NUBES),
        x: caja.min.x - margen + rng() * (caja.max.x - caja.min.x + 2 * margen),
        z: caja.min.z - margen + rng() * (caja.max.z - caja.min.z + 2 * margen),
        escala: nubes.escalaMin + rng() * (nubes.escalaMax - nubes.escalaMin),
        giro: rng() * Math.PI * 2,
      });
    }
  }
  const mallasNubes: { malla: THREE.InstancedMesh; indices: number[] }[] = [];
  const dibujarNubes = () => {
    for (const { malla, indices } of mallasNubes) {
      indices.forEach((n, k) => {
        const l = lugares[n];
        posicion.set(l.x, nubes.altura, l.z);
        escala.setScalar(l.escala);
        giro.setFromAxisAngle(ejeY, l.giro);
        malla.setMatrixAt(k, matriz.compose(posicion, giro, escala));
      });
      malla.instanceMatrix.needsUpdate = true;
    }
  };
  for (const ruta of NUBES) {
    const indices = lugares.flatMap((l, n) => (l.ruta === ruta ? [n] : []));
    if (indices.length === 0) continue;
    void modelos.geometria(ruta).then((geometria) => {
      if (!geometria || liberado) return;
      const malla = new THREE.InstancedMesh(geometria, materialNubes, indices.length);
      malla.castShadow = false;
      malla.receiveShadow = false;
      malla.frustumCulled = false;
      // Cada frame, la cámara que la dibuja decide cuánto se ve la nube.
      malla.onBeforeRender = (_renderer, _escena, camara) => {
        const y = camara.position.y;
        const enCapa = suavizar(Math.abs(y - nubes.altura) / BANDA_CAPA_NUBES);
        const lejos = 1 - suavizar((y - nubes.alturaCamaraAtenuacion * INICIO_ATENUACION) / (nubes.alturaCamaraAtenuacion * (1 - INICIO_ATENUACION)));
        materialNubes.opacity = 0.9 + 0 * (nubes.opacidad * enCapa * lejos);
      };
      mallasNubes.push({ malla, indices });
      mallas.push(malla);
      raiz.add(malla);
      dibujarNubes();
    });
  }

  return {
    raiz,
    actualizar(dt) {
      if (mallasNubes.length === 0) return;
      const fin = caja.max.x + margen;
      const inicio = caja.min.x - margen;
      for (const l of lugares) {
        l.x += nubes.velocidad * dt;
        if (l.x > fin) l.x = inicio;
      }
      dibujarNubes();
    },
    liberar() {
      liberado = true;
      for (const m of mallas) m.dispose();
      material.dispose();
      materialNubes.dispose();
      modelos.liberar();
    },
  };
}
