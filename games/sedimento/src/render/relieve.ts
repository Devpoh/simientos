import * as THREE from 'three';
import { derivarSemilla } from '../logic/azar';
import type { Mapa } from '../logic/mapa';
import { ruidoValor } from '../logic/ruido';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import type { Paleta } from './paleta';
import type { Terreno } from './terreno';

/** Anillos concéntricos de cada hexágono elevado (más anillos = laderas más detalladas). */
const ANILLOS = 4;
/** Puntos por anillo: las 6 esquinas y las 6 mitades de lado, igual que el agua. */
const PUNTOS = 12;
/** Fracción del radio a partir de la cual el relieve empieza a fundirse con el borde. */
const INICIO_FUSION = 0.3;
/** Cuánto se hunden los árboles en la ladera para no flotar sobre las caras planas. */
const HUNDIMIENTO_SUELO = 0.03;

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Relieve {
  readonly raiz: THREE.Group;
  /** Altura del suelo en (x, z) dentro del hexágono `hex`: la tapa del prisma o la ladera si es colina o montaña. */
  sueloEn(hex: number, x: number, z: number): number;
  liberar(): void;
}

/**
 * Montañas y colinas como UNA superficie continua sobre los hexágonos elevados.
 * - La altura sale de ruido en coordenadas del mundo (crestas «ridged» en la sierra, ondulado
 *   suave en las colinas), así que las crestas cruzan de un hexágono a otro y forman cordilleras.
 * - En el borde con el llano la amplitud cae a 0: la ladera muere justo en la tapa del prisma.
 * - Los puntos del borde que comparten varios hexágonos promedian amplitud, base y nieve:
 *   no hay rendijas entre vecinos.
 * - Color por cara según altura relativa y pendiente: falda del bioma → roca con estratos →
 *   nieve solo en las caras poco inclinadas.
 */
export function crearRelieve(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta, terreno: Terreno): Relieve {
  const rel = cfg.relieve;
  const R = cfg.tamanoHex;
  const { rejilla } = disp;
  const n = rejilla.total;
  const semillas = [0, 1, 2].map((o) => derivarSemilla(mapa.semilla, `relieve-${o}`));
  const semillaPico = derivarSemilla(mapa.semilla, 'relieve-pico');

  const elevado = (i: number) => mapa.terreno[i] === 'montana' || mapa.terreno[i] === 'colina';
  let nivelMax = 1;
  for (let i = 0; i < n; i++) if (mapa.terreno[i] === 'montana') nivelMax = Math.max(nivelMax, mapa.nivel[i]);

  // Propiedades de cada hexágono elevado: amplitud, «montañosidad» (1 sierra, 0 colina) y nieve.
  const amplitud = new Float32Array(n);
  const sierra = new Float32Array(n);
  const nieve = new Float32Array(n);
  const picoX = new Float32Array(n);
  const picoZ = new Float32Array(n);
  const picoFuerza = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (mapa.terreno[i] === 'montana') {
      amplitud[i] = rel.alturaPico * (rel.alturaPicoBaja + (1 - rel.alturaPicoBaja) * (mapa.nivel[i] / nivelMax));
      sierra[i] = 1;
      const b = mapa.bioma[i];
      nieve[i] = b === 'nieve' ? 1 : b === 'tundra' ? rel.nieveTundra : 0;
      const ang = ruidoValor(semillaPico, i, 0) * Math.PI * 2;
      const d = ruidoValor(semillaPico, i, 1) * rel.desplazamientoPico * R;
      picoX[i] = Math.cos(ang) * d;
      picoZ[i] = Math.sin(ang) * d;
      // No todas las montañas tienen cumbre propia marcada: así no sale una rejilla de picos iguales.
      picoFuerza[i] = rel.picoMin + (1 - rel.picoMin) * Math.pow(ruidoValor(semillaPico, i, 2), 1.5);
    } else if (mapa.terreno[i] === 'colina') amplitud[i] = rel.alturaColina;
  }

  // Esquinas en el mismo orden que los prismas (la 0 apunta a -z); los puntos pares son esquinas.
  const angulo = (k: number) => Math.PI / 2 + (k * Math.PI) / 6;
  const radioBorde = (k: number) => (k % 2 === 0 ? R : (R * Math.sqrt(3)) / 2);
  const bordeX = (k: number) => radioBorde(k) * Math.cos(angulo(k));
  const bordeZ = (k: number) => -radioBorde(k) * Math.sin(angulo(k));
  const clave = (x: number, z: number) => `${Math.round(x * 1000)},${Math.round(z * 1000)}`;
  const tocan = new Map<string, number[]>();
  for (let i = 0; i < n; i++)
    for (let k = 0; k < PUNTOS; k += 2) {
      const c = clave(disp.x[i] + bordeX(k), disp.z[i] + bordeZ(k));
      const l = tocan.get(c);
      if (l) l.push(i);
      else tocan.set(c, [i]);
    }

  /** Valores en el borde (punto k del hexágono i), compartidos con los vecinos que tocan ese punto. */
  interface Borde {
    amp: number;
    base: number;
    sierra: number;
    nieve: number;
  }
  const bordes = new Map<number, Borde[]>();
  const bordeDe = (i: number): Borde[] => {
    const hecho = bordes.get(i);
    if (hecho) return hecho;
    const lista: Borde[] = [];
    for (let k = 0; k < PUNTOS; k++) {
      let tocantes: number[];
      if (k % 2 === 0) tocantes = tocan.get(clave(disp.x[i] + bordeX(k), disp.z[i] + bordeZ(k))) ?? [i];
      else {
        const a = tocan.get(clave(disp.x[i] + bordeX(k - 1), disp.z[i] + bordeZ(k - 1))) ?? [i];
        const b = tocan.get(clave(disp.x[i] + bordeX((k + 1) % PUNTOS), disp.z[i] + bordeZ((k + 1) % PUNTOS))) ?? [i];
        tocantes = a.filter((j) => b.includes(j));
      }
      // Un borde del mapa cuenta como llano: la sierra no se corta en seco.
      const completo = tocantes.length === (k % 2 === 0 ? 3 : 2) && tocantes.every(elevado);
      const elevados = tocantes.filter(elevado);
      const media = (v: Float32Array) => elevados.reduce((s, j) => s + v[j], 0) / elevados.length;
      lista.push({
        amp: completo ? media(amplitud) : 0,
        base: Math.max(...elevados.map((j) => disp.cima[j])),
        sierra: media(sierra),
        nieve: media(nieve),
      });
    }
    bordes.set(i, lista);
    return lista;
  };

  /** Forma del relieve en [0, 1]: crestas afiladas (sierra) o lomas suaves (colina). */
  const forma = (x: number, z: number, s: number) => {
    let cresta = 0;
    let loma = 0;
    let a = 1;
    let f = rel.frecuencia;
    let total = 0;
    for (const sem of semillas) {
      const v = ruidoValor(sem, x * f, z * f);
      const r = 1 - Math.abs(2 * v - 1);
      cresta += r * r * a;
      loma += v * a;
      total += a;
      a *= 0.5;
      f *= 2;
    }
    return (loma / total) * (1 - s) + (cresta / total) * s;
  };

  /** Fracción hexagonal (0 en el centro, 1 en el borde) y posición angular (0..12) de un punto local. */
  const polar = (dx: number, dz: number) => {
    const apotema = (R * Math.sqrt(3)) / 2;
    let f = 0;
    for (let k = 1; k < PUNTOS; k += 2) f = Math.max(f, (dx * Math.cos(angulo(k)) - dz * Math.sin(angulo(k))) / apotema);
    let ang = Math.atan2(-dz, dx) - Math.PI / 2;
    ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return { f, sector: (ang / (Math.PI * 2)) * PUNTOS };
  };

  /** Todo lo que define la superficie en un punto del hexágono elevado i. */
  const muestra = (i: number, x: number, z: number) => {
    const dx = x - disp.x[i];
    const dz = z - disp.z[i];
    const { f, sector } = polar(dx, dz);
    const b = bordeDe(i);
    const k0 = Math.floor(sector) % PUNTOS;
    const k1 = (k0 + 1) % PUNTOS;
    const t = sector - Math.floor(sector);
    const enBorde = (c: keyof Borde) => b[k0][c] * (1 - t) + b[k1][c] * t;
    const s = suave(INICIO_FUSION, 1, f);
    const amp = amplitud[i] * (1 - s) + enBorde('amp') * s;
    const base = disp.cima[i] * (1 - s) + enBorde('base') * s;
    const sie = sierra[i] * (1 - s) + enBorde('sierra') * s;
    const nie = nieve[i] * (1 - s) + enBorde('nieve') * s;
    // Cumbre propia de cada montaña, que se apaga antes de llegar al borde.
    const dp = Math.hypot(dx - picoX[i], dz - picoZ[i]) / (rel.radioPico * R);
    const pico = sierra[i] * picoFuerza[i] * Math.exp(-dp * dp) * (1 - s);
    const y = base + amp * (rel.pesoCresta * forma(x, z, sie) + (1 - rel.pesoCresta) * pico);
    return { y, base, amp, sie, nie };
  };

  // Malla: centro + ANILLOS anillos de PUNTOS puntos por hexágono elevado, sin índices (caras planas).
  const pos: number[] = [];
  const col: number[] = [];
  const meta: { base: number; amp: number; sie: number; nie: number }[] = [];
  const triangulos: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (!elevado(i)) continue;
    const v: { x: number; y: number; z: number; base: number; amp: number; sie: number; nie: number }[] = [];
    const punto = (x: number, z: number) => {
      const m = muestra(i, x, z);
      v.push({ x, z, ...m });
      return v.length - 1;
    };
    const centro = punto(disp.x[i], disp.z[i]);
    const anillos: number[][] = [];
    for (let a = 1; a <= ANILLOS; a++) {
      const fr = a / ANILLOS;
      const anillo: number[] = [];
      for (let k = 0; k < PUNTOS; k++) anillo.push(punto(disp.x[i] + bordeX(k) * fr, disp.z[i] + bordeZ(k) * fr));
      anillos.push(anillo);
    }
    const tri = (a: number, b: number, c: number) => triangulos.push([i, a, b, c]);
    const lista = v;
    for (let k = 0; k < PUNTOS; k++) tri(centro, anillos[0][k], anillos[0][(k + 1) % PUNTOS]);
    for (let a = 0; a + 1 < ANILLOS; a++)
      for (let k = 0; k < PUNTOS; k++) {
        const k2 = (k + 1) % PUNTOS;
        tri(anillos[a][k], anillos[a + 1][k], anillos[a + 1][k2]);
        tri(anillos[a][k], anillos[a + 1][k2], anillos[a][k2]);
      }
    // Se vuelcan los triángulos de este hexágono con sus vértices ya calculados.
    for (const [hex, a, b, c] of triangulos.splice(0)) {
      for (const idx of [a, b, c]) {
        const p = lista[idx];
        pos.push(p.x, p.y, p.z);
        meta.push(p);
      }
      colorearCara(hex, pos.length / 3 - 3);
    }
  }

  function colorearCara(hex: number, v0: number): void {
    const p = (k: number) => new THREE.Vector3(pos[(v0 + k) * 3], pos[(v0 + k) * 3 + 1], pos[(v0 + k) * 3 + 2]);
    const a = p(0);
    const b = p(1);
    const c = p(2);
    const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const m = [meta[v0], meta[v0 + 1], meta[v0 + 2]];
    const y = (a.y + b.y + c.y) / 3;
    const base = (m[0].base + m[1].base + m[2].base) / 3;
    const sie = (m[0].sie + m[1].sie + m[2].sie) / 3;
    const nie = (m[0].nie + m[1].nie + m[2].nie) / 3;
    const amp = (m[0].amp + m[1].amp + m[2].amp) / 3;
    const cx = (a.x + b.x + c.x) / 3;
    const cz = (a.z + b.z + c.z) / 3;
    // Altura relativa a la sierra más alta posible: así la nieve marca las cumbres de verdad.
    const t = (y - base) / rel.alturaPico;
    const ruido = ruidoValor(semillas[0], cx * 3.1, cz * 3.1);
    const suelo = terreno.colores[hex];
    const color = new THREE.Color();
    // Colina: el suelo del bioma, algo más oscuro en las laderas que miran abajo.
    const colina = suelo.clone().multiplyScalar(0.92 + 0.12 * normal.y);
    // Sierra: falda del bioma → roca (más oscura cuanto más vertical) con estratos → nieve.
    const empinada = 1 - suave(0.45, 0.8, normal.y);
    const estrato = 1 + rel.estratos * Math.sin(y * 11 + ruido * 4);
    const roca = paleta.roca.clone().multiplyScalar((1.15 - 0.22 * empinada) * estrato);
    const falda = suave(0.08, 0.26, t + (ruido - 0.5) * 0.12);
    const sierraColor = suelo.clone().multiplyScalar(0.9).lerp(roca, falda);
    const limiteNieve = rel.nieveDesde - nie * rel.nieveBajada + (ruido - 0.5) * 0.18;
    // La nieve cuaja en lo alto de cada macizo, no en los collados entre picos.
    const alturaLocal = amp > 0.01 ? (y - base) / amp : 0;
    if (nie > 0.05 && t > limiteNieve && alturaLocal > rel.nieveLocal && normal.y > 0.5) sierraColor.copy(paleta.biomas.nieve).multiplyScalar(0.95 + 0.05 * normal.y);
    color.copy(colina).lerp(sierraColor, sie);
    color.multiplyScalar(1 - rel.variacionCara / 2 + rel.variacionCara * ruidoValor(semillas[1], cx * 17, cz * 17));
    for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometria.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
  const malla = new THREE.Mesh(geometria, material);
  malla.castShadow = true;
  malla.receiveShadow = true;

  const raiz = new THREE.Group();
  if (pos.length > 0) raiz.add(malla);

  return {
    raiz,
    sueloEn(hex, x, z) {
      return elevado(hex) ? muestra(hex, x, z).y - HUNDIMIENTO_SUELO : disp.cima[hex];
    },
    liberar() {
      geometria.dispose();
      material.dispose();
    },
  };
}
