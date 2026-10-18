import * as THREE from 'three';
import { crearRng, derivarSemilla, enteroEntre, type Rng } from '../logic/azar';
import type { Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import { fusionar, pieza } from './geometria';
import type { Paleta } from './paleta';

type Especie = 'palma' | 'conifera' | 'arbol' | 'cana' | 'roca';

const TRONCO = '#7c5a3a';
const TRONCO_PALMA = '#8d6b47';
const HOJA_PALMA = '#62b544';
const HOJA_CONIFERA = '#2f6a45';
const HOJA_ARBOL = '#5da846';
const ROCA = '#8f8576';
const CANA = '#a3b250';
const PUNTA_CANA = '#7a5a30';
const FRONDAS_PALMA = 6;
const TALLOS_CANA = 5;
/** Cuánto del color del bioma se mezcla con el follaje de bosques y arboledas (0 = nada). */
const TINTE_BIOMA = 0.45;
/** Variación aleatoria del brillo de cada ejemplar. */
const VARIACION_BRILLO = 0.14;

function crearPalma(): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  const altura = 0.62;
  partes.push(pieza(new THREE.CylinderGeometry(0.035, 0.055, altura, 5).translate(0, altura / 2, 0).rotateZ(0.12), TRONCO_PALMA));
  const cima = new THREE.Vector3(-Math.sin(0.12) * altura, Math.cos(0.12) * altura, 0);
  for (let f = 0; f < FRONDAS_PALMA; f++) {
    // Fronda: cono alargado tumbado, casi horizontal, con la punta apenas levantada.
    const g = new THREE.ConeGeometry(0.1, 0.46, 3).translate(0, 0.23, 0).rotateZ(-Math.PI / 2 + 0.1).rotateY((f / FRONDAS_PALMA) * Math.PI * 2);
    g.translate(cima.x, cima.y, cima.z);
    partes.push(pieza(g, HOJA_PALMA));
  }
  partes.push(pieza(new THREE.IcosahedronGeometry(0.05, 0).translate(cima.x, cima.y - 0.03, cima.z), '#6e4e2e'));
  return fusionar(partes);
}

function crearConifera(): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  partes.push(pieza(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 5).translate(0, 0.07, 0), TRONCO));
  const pisos: [number, number, number][] = [
    [0.27, 0.36, 0.1],
    [0.22, 0.32, 0.31],
    [0.15, 0.28, 0.52],
  ];
  for (const [radio, alto, y] of pisos) partes.push(pieza(new THREE.ConeGeometry(radio, alto, 6).translate(0, y + alto / 2, 0), HOJA_CONIFERA));
  return fusionar(partes);
}

function crearArbol(): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  partes.push(pieza(new THREE.CylinderGeometry(0.035, 0.05, 0.26, 5).translate(0, 0.13, 0), TRONCO));
  partes.push(pieza(new THREE.IcosahedronGeometry(0.22, 0).translate(0, 0.42, 0), HOJA_ARBOL));
  partes.push(pieza(new THREE.IcosahedronGeometry(0.15, 0).translate(0.12, 0.33, 0.06), HOJA_ARBOL));
  return fusionar(partes);
}

function crearRoca(): THREE.BufferGeometry {
  const grande = new THREE.IcosahedronGeometry(0.13, 0).scale(1, 0.6, 0.85).translate(0, 0.05, 0);
  const pequena = new THREE.IcosahedronGeometry(0.07, 0).scale(1, 0.7, 1).translate(0.15, 0.03, 0.05);
  return fusionar([pieza(grande, ROCA), pieza(pequena, ROCA)]);
}

function crearCana(): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  for (let t = 0; t < TALLOS_CANA; t++) {
    const ang = (t / TALLOS_CANA) * Math.PI * 2 + 0.4;
    const alto = 0.55 + (t % 3) * 0.1;
    const inclinacion = 0.12 + (t % 2) * 0.1;
    const tallo = new THREE.CylinderGeometry(0.012, 0.02, alto, 4).translate(0, alto / 2, 0);
    const punta = new THREE.ConeGeometry(0.03, 0.12, 4).translate(0, alto + 0.06, 0);
    for (const [g, color] of [[tallo, CANA], [punta, PUNTA_CANA]] as const) {
      g.rotateZ(inclinacion).rotateY(ang).translate(Math.cos(ang) * 0.09, 0, Math.sin(ang) * 0.09);
      partes.push(pieza(g, color));
    }
  }
  return fusionar(partes);
}

const CREADORES: Record<Especie, () => THREE.BufferGeometry> = {
  palma: crearPalma,
  conifera: crearConifera,
  arbol: crearArbol,
  cana: crearCana,
  roca: crearRoca,
};

interface Ejemplar {
  especie: Especie;
  hex: number;
  x: number;
  y: number;
  z: number;
  escala: number;
  giro: number;
  brillo: number;
}

export interface Vegetacion {
  readonly raiz: THREE.Group;
  /** Número de ejemplares colocados, por si hay que verificarlo. */
  readonly total: number;
  liberar(): void;
}

function especieDe(mapa: Mapa, i: number, rng: Rng, probRoca: number): Especie | null {
  switch (mapa.vegetacion[i]) {
    case 'palmeral':
      return 'palma';
    case 'canaveral':
      return 'cana';
    case 'bosque':
      return mapa.bioma[i] === 'taiga' ? 'conifera' : 'arbol';
    default: {
      // Rocas sueltas sobre suelo yermo: rompen la planicie del desierto sin añadir llamadas de dibujo.
      const yermo = mapa.terreno[i] === 'llanura' && mapa.fertilidad[i] < 0.2;
      return yermo && rng() < probRoca ? 'roca' : null;
    }
  }
}

/** Reparte los ejemplares dentro de cada hexágono, sin que se amontonen. */
function colocar(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, rng: Rng, suelo: SueloEn): Ejemplar[] {
  const v = cfg.vegetacion;
  const res: Ejemplar[] = [];
  for (let i = 0; i < disp.rejilla.total; i++) {
    const especie = especieDe(mapa, i, rng, v.probRoca);
    if (!especie) continue;
    const quiere = especie === 'roca' ? enteroEntre(rng, 1, 2) : enteroEntre(rng, v.minPorHex, v.maxPorHex);
    const puestos: { x: number; z: number }[] = [];
    for (let intento = 0; intento < quiere * 6 && puestos.length < quiere; intento++) {
      const radio = Math.sqrt(rng()) * v.radioColocacion * cfg.tamanoHex;
      const ang = rng() * Math.PI * 2;
      const dx = Math.cos(ang) * radio;
      const dz = Math.sin(ang) * radio;
      if (puestos.some((p) => Math.hypot(p.x - dx, p.z - dz) < v.separacionMin)) continue;
      puestos.push({ x: dx, z: dz });
      res.push({
        especie,
        hex: i,
        x: disp.x[i] + dx,
        // En colinas y montañas el árbol se apoya en la ladera, no en la tapa del prisma.
        y: suelo(i, disp.x[i] + dx, disp.z[i] + dz),
        z: disp.z[i] + dz,
        escala: v.escalaMin + rng() * (v.escalaMax - v.escalaMin),
        giro: rng() * Math.PI * 2,
        brillo: 1 - VARIACION_BRILLO / 2 + rng() * VARIACION_BRILLO,
      });
    }
  }
  return res;
}

/** Palmeras, coníferas, árboles redondos y cañas: una malla instanciada por especie. */
/** Altura del suelo en un punto de un hexágono (la da el relieve). */
export type SueloEn = (hex: number, x: number, z: number) => number;

export function crearVegetacion(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta, suelo: SueloEn): Vegetacion {
  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-veg'));
  const ejemplares = colocar(mapa, disp, cfg, rng, suelo);

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 });
  const geometrias: THREE.BufferGeometry[] = [];
  const mallas: THREE.InstancedMesh[] = [];
  const raiz = new THREE.Group();

  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const giro = new THREE.Quaternion();
  const ejeY = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const blanco = new THREE.Color(1, 1, 1);

  for (const especie of Object.keys(CREADORES) as Especie[]) {
    const lista = ejemplares.filter((e) => e.especie === especie);
    if (lista.length === 0) continue;
    const geometria = CREADORES[especie]();
    const malla = new THREE.InstancedMesh(geometria, material, lista.length);
    malla.castShadow = true;
    malla.receiveShadow = true;
    lista.forEach((e, k) => {
      posicion.set(e.x, e.y, e.z);
      escala.setScalar(e.escala);
      giro.setFromAxisAngle(ejeY, e.giro);
      malla.setMatrixAt(k, matriz.compose(posicion, giro, escala));
      color.copy(blanco);
      // El follaje de árboles y coníferas toma un toque del color del bioma (olivo en el mediterráneo, verde vivo en la selva…).
      if (especie === 'arbol') color.lerp(paleta.biomas[mapa.bioma[e.hex]], TINTE_BIOMA).lerp(blanco, 0.4);
      malla.setColorAt(k, color.multiplyScalar(e.brillo));
    });
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    geometrias.push(geometria);
    mallas.push(malla);
    raiz.add(malla);
  }

  return {
    raiz,
    total: ejemplares.length,
    liberar() {
      for (const g of geometrias) g.dispose();
      for (const m of mallas) m.dispose();
      material.dispose();
    },
  };
}
