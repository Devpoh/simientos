import * as THREE from 'three';
import { crearRng, derivarSemilla, hashTexto } from '../logic/azar';
import type { Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import { colorearCaras, pieza } from './geometria';
import type { Paleta } from './paleta';
import type { Terreno } from './terreno';

/** Radio de la base de un pico (el hexágono mide 1) y cuánto se hunde en el prisma para no dejar rendijas. */
const RADIO_BASE_PICO = 1;
const HUNDIMIENTO_PICO = 0.03;
/** Segundo pico del macizo: distancia al centro del hexágono y tamaño relativo. */
const DESPLAZAMIENTO_PICO = 0.3;
const TAMANO_PICO_SECUNDARIO = 0.75;
/** Tramos de altura (0–1) del pico: ladera, roca y cumbre. */
const FIN_LADERA = 0.3;
const FIN_ROCA = 0.5;
/** Cuánto se descolocan los vértices intermedios del cono para que no parezca un cucurucho. */
const IRREGULARIDAD_PICO = 0.14;
/** Los picos de las zonas más altas son más grandes: el pico más bajo mide esta fracción del más alto. */
const ALTURA_PICO_BAJO = 0.65;
const SEGMENTOS_PICO = 5;
const TRAMOS_PICO = 3;

/** Descoloca de forma determinista los anillos intermedios (los vértices compartidos se mueven igual). */
function irregular(geo: THREE.BufferGeometry, semilla: number): void {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0.01 || y > 0.99) continue;
    const rng = crearRng(hashTexto(`${semilla}:${pos.getX(i).toFixed(3)},${y.toFixed(3)},${pos.getZ(i).toFixed(3)}`));
    pos.setXYZ(i, pos.getX(i) + (rng() - 0.5) * IRREGULARIDAD_PICO, y + (rng() - 0.5) * IRREGULARIDAD_PICO * 0.5, pos.getZ(i) + (rng() - 0.5) * IRREGULARIDAD_PICO);
  }
  geo.computeVertexNormals();
}

/** Cono de altura 1 con la base en y=0; sin tapa de abajo, que queda dentro del prisma. */
function crearPico(paleta: Paleta, semilla: number, conNieve: boolean): THREE.BufferGeometry {
  const base = new THREE.ConeGeometry(RADIO_BASE_PICO, 1, SEGMENTOS_PICO, TRAMOS_PICO, true).translate(0, 0.5, 0);
  irregular(base, semilla);
  const g = pieza(base, '#ffffff');
  const ladera = paleta.roca.clone().multiplyScalar(1.05);
  const roca = paleta.roca.clone().multiplyScalar(1.25);
  const cumbre = conNieve ? paleta.biomas.nieve.clone() : paleta.roca.clone().multiplyScalar(1.5);
  colorearCaras(g, (y) => (y < FIN_LADERA ? ladera : y < FIN_ROCA ? roca : cumbre));
  return g;
}

/** Domo achatado (icosaedro) de altura 1 y radio 1, del que solo se ve la mitad de arriba. */
function crearDomo(): THREE.BufferGeometry {
  return pieza(new THREE.IcosahedronGeometry(1, 1), '#ffffff');
}

export interface Relieve {
  readonly raiz: THREE.Group;
  liberar(): void;
}

/** Montañas (macizos de picos rocosos, con nieve en las cumbres frías) y colinas (domos del color del suelo). */
export function crearRelieve(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta, terreno: Terreno): Relieve {
  const rel = cfg.relieve;
  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-relieve'));

  const montanas: { i: number; nieve: boolean }[] = [];
  const colinas: number[] = [];
  for (let i = 0; i < disp.rejilla.total; i++) {
    if (mapa.terreno[i] === 'colina') colinas.push(i);
    else if (mapa.terreno[i] === 'montana') {
      const bioma = mapa.bioma[i];
      montanas.push({ i, nieve: bioma === 'nieve' || (bioma === 'tundra' && rng() < rel.probNieveTundra) });
    }
  }
  const nivelMax = Math.max(1, ...montanas.map((m) => mapa.nivel[m.i]));
  const relativa = (i: number) => ALTURA_PICO_BAJO + (1 - ALTURA_PICO_BAJO) * (mapa.nivel[i] / nivelMax);
  const conNieve = montanas.filter((m) => m.nieve);
  const sinNieve = montanas.filter((m) => !m.nieve);

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
  const geometrias: THREE.BufferGeometry[] = [];
  const mallas: THREE.InstancedMesh[] = [];
  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const giro = new THREE.Quaternion();
  const ejeY = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const blanco = new THREE.Color(1, 1, 1);

  const crearMalla = (geo: THREE.BufferGeometry, cantidad: number): THREE.InstancedMesh => {
    const malla = new THREE.InstancedMesh(geo, material, cantidad);
    malla.castShadow = true;
    malla.receiveShadow = true;
    geometrias.push(geo);
    mallas.push(malla);
    return malla;
  };

  const rellenarPicos = (lista: { i: number }[], malla: THREE.InstancedMesh) => {
    let k = 0;
    for (const { i } of lista) {
      for (let p = 0; p < rel.picosPorMontana; p++) {
        if (p > 0 && rng() >= rel.probSegundoPico) continue;
        const principal = p === 0;
        const ang = rng() * Math.PI * 2;
        const desp = principal ? rng() * DESPLAZAMIENTO_PICO * 0.8 : DESPLAZAMIENTO_PICO;
        const tam = principal ? 1 : TAMANO_PICO_SECUNDARIO;
        const e = rel.escalaPicoMin + rng() * (rel.escalaPicoMax - rel.escalaPicoMin);
        posicion.set(disp.x[i] + Math.cos(ang) * desp, disp.cima[i] - HUNDIMIENTO_PICO, disp.z[i] + Math.sin(ang) * desp);
        escala.set(e * tam * (0.9 + rng() * 0.2), (rel.alturaPico / rel.escalaPicoMax) * e * tam * relativa(i) * (0.8 + rng() * 0.4), e * tam * (0.9 + rng() * 0.2));
        giro.setFromAxisAngle(ejeY, rng() * Math.PI * 2);
        malla.setMatrixAt(k, matriz.compose(posicion, giro, escala));
        // El pico toma un toque del color del suelo bajo él para no desentonar con el bioma.
        color.copy(blanco).lerp(terreno.colores[i], 0.3).multiplyScalar(0.92 + rng() * 0.16);
        malla.setColorAt(k++, color);
      }
    }
    malla.count = k;
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
  };

  const raiz = new THREE.Group();
  if (sinNieve.length > 0) {
    const malla = crearMalla(crearPico(paleta, mapa.semilla, false), sinNieve.length * rel.picosPorMontana);
    rellenarPicos(sinNieve, malla);
    raiz.add(malla);
  }
  if (conNieve.length > 0) {
    const malla = crearMalla(crearPico(paleta, mapa.semilla, true), conNieve.length * rel.picosPorMontana);
    rellenarPicos(conNieve, malla);
    raiz.add(malla);
  }
  if (colinas.length > 0) {
    const malla = crearMalla(crearDomo(), colinas.length);
    colinas.forEach((i, k) => {
      posicion.set(disp.x[i], disp.cima[i], disp.z[i]);
      escala.set(rel.radioColina, rel.alturaColina, rel.radioColina);
      giro.setFromAxisAngle(ejeY, rng() * Math.PI * 2);
      malla.setMatrixAt(k, matriz.compose(posicion, giro, escala));
      malla.setColorAt(k, color.copy(terreno.colores[i]).multiplyScalar(1.05));
    });
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    raiz.add(malla);
  }

  return {
    raiz,
    liberar() {
      for (const g of geometrias) g.dispose();
      for (const m of mallas) m.dispose();
      material.dispose();
    },
  };
}
