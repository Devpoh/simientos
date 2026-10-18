import * as THREE from 'three';
import { crearRng, derivarSemilla, enteroEntre, type Rng } from '../logic/azar';
import type { Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import { fusionar, pieza } from './geometria';
import type { Paleta } from './paleta';

/** Altura del suelo en un punto de un hexágono (la da el relieve). */
export type SueloEn = (hex: number, x: number, z: number) => number;

type Especie = 'palma' | 'conifera' | 'arbol' | 'cana' | 'roca' | 'guijarro' | 'mata' | 'duna';

const TRONCO = '#7a583a';
const TRONCO_OSCURO = '#5f4429';
const TRONCO_PALMA = '#94714b';
const ANILLO_PALMA = '#7b5c3b';
const FRONDA_BASE = '#3e8c34';
const FRONDA_PUNTA = '#86d15a';
const COCO = '#6b4a2b';
const HOJA_CONIFERA_BAJA = '#245a3d';
const HOJA_CONIFERA_ALTA = '#3f8a57';
const HOJA_ARBOL = '#5da846';
const ROCA_BAJA = '#6c645a';
const ROCA_ALTA = '#aaa191';
const CANA = '#a3b250';
const PUNTA_CANA = '#7a5a30';
const MATA_SECA = '#c2b05e';
const MATA_VERDE = '#79b94b';

/** Cuánto del color del bioma se mezcla con el follaje de bosques y arboledas (0 = nada). */
const TINTE_BIOMA = 0.45;
/** Variación aleatoria del brillo de cada ejemplar. */
const VARIACION_BRILLO = 0.14;
/** Separación mínima (en hexágonos de radio 1) entre ejemplares de cada especie dentro de un hexágono. */
const SEPARACION: Record<Especie, number> = { palma: 0, conifera: 0, arbol: 0, cana: 0, roca: 0.3, guijarro: 0.12, mata: 0.18, duna: 0.55 };
/** Hasta dónde llegan las cosas pequeñas desde el centro del hexágono (la apotema mide 0,87). */
const RADIO_PEQUENO = 0.74;
/** Por debajo de este "interior" (borde de playa) no crecen matas ni dunas. */
const INTERIOR_MINIMO = 0.7;
/** Escalas de las especies que no usan escalaMin/escalaMax de tuning. */
const ESCALA_ROCA: [number, number] = [0.8, 1.6];
const ESCALA_GUIJARRO: [number, number] = [0.5, 1.1];
const ESCALA_MATA: [number, number] = [0.8, 1.5];
const ESCALA_DUNA: [number, number] = [0.6, 1.3];
/** Cuánto se entierra una roca (fracción de su tamaño). */
const ENTIERRO_ROCA = 0.12;

// ---------- Utilidades de geometría ----------

/** Desplaza los vértices (los compartidos se mueven igual, no se abren grietas). Geometría con índices. */
function irregular(geo: THREE.BufferGeometry, rng: Rng, amplitud: number): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const vistos = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const clave = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    let d = vistos.get(clave);
    if (!d) {
      d = [(rng() - 0.5) * amplitud, (rng() - 0.5) * amplitud, (rng() - 0.5) * amplitud];
      vistos.set(clave, d);
    }
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Oscurece hacia abajo (falsa oclusión): multiplica el color de cada vértice por un factor según su altura. */
function sombraAbajo(geo: THREE.BufferGeometry, yMin: number, yMax: number, minimo: number): void {
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - yMin) / Math.max(1e-6, yMax - yMin)));
    const f = minimo + (1 - minimo) * t;
    col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f);
  }
}

/** Color por orientación de cada cara: más claro las que miran arriba. Geometría ya sin índices. */
function colorPorNormal(geo: THREE.BufferGeometry, bajo: THREE.Color, alto: THREE.Color): void {
  geo.computeVertexNormals();
  const normal = geo.attributes.normal;
  const col = geo.attributes.color;
  const c = new THREE.Color();
  for (let i = 0; i < normal.count; i++) {
    const t = Math.min(1, Math.max(0, normal.getY(i) * 0.5 + 0.5));
    c.lerpColors(bajo, alto, t * t);
    col.setXYZ(i, c.r, c.g, c.b);
  }
}

/** Multiplica los colores de un grupo de vértices por un valor aleatorio (variedad entre copas de un mismo árbol). */
function matizar(geo: THREE.BufferGeometry, rng: Rng, fuerza: number): void {
  const col = geo.attributes.color;
  const f = 1 + (rng() - 0.5) * 2 * fuerza;
  const g = 1 + (rng() - 0.5) * 2 * fuerza * 0.6;
  for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * f, col.getY(i) * g, col.getZ(i) * f);
}

// ---------- Especies (cada una tiene varias variantes) ----------

function crearArbol(rng: Rng): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  const altoTronco = 0.3 + rng() * 0.08;
  const tronco = new THREE.CylinderGeometry(0.022, 0.058, altoTronco, 6, 2).translate(0, altoTronco / 2, 0);
  irregular(tronco, rng, 0.012);
  partes.push(pieza(tronco, TRONCO));
  // Una rama que sale del tronco hacia un lado.
  const rama = new THREE.CylinderGeometry(0.012, 0.022, 0.16, 5).translate(0, 0.08, 0).rotateZ(0.8).rotateY(rng() * Math.PI * 2).translate(0, altoTronco * 0.6, 0);
  partes.push(pieza(rama, TRONCO_OSCURO));
  const manchas = 4 + Math.floor(rng() * 2);
  for (let k = 0; k < manchas; k++) {
    const radio = k === 0 ? 0.2 + rng() * 0.04 : 0.11 + rng() * 0.07;
    const ang = rng() * Math.PI * 2;
    const dist = k === 0 ? 0 : 0.1 + rng() * 0.08;
    const y = altoTronco + 0.05 + (k === 0 ? 0.08 : rng() * 0.14 - 0.04);
    const copa = new THREE.IcosahedronGeometry(radio, 1).scale(1, 0.85, 1).translate(Math.cos(ang) * dist, y, Math.sin(ang) * dist);
    irregular(copa, rng, radio * 0.28);
    const p = pieza(copa, HOJA_ARBOL);
    sombraAbajo(p, altoTronco - 0.02, altoTronco + 0.4, 0.62);
    matizar(p, rng, 0.1);
    partes.push(p);
  }
  return fusionar(partes);
}

function crearConifera(rng: Rng): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  const pisos = 4 + Math.floor(rng() * 2);
  const alto = 0.78 + rng() * 0.12;
  partes.push(pieza(new THREE.CylinderGeometry(0.018, 0.045, 0.2, 6).translate(0, 0.1, 0), TRONCO));
  for (let k = 0; k < pisos; k++) {
    const t = k / (pisos - 1);
    const radio = 0.3 - 0.2 * t + rng() * 0.02;
    const altoPiso = 0.2 + (1 - t) * 0.06;
    const y = 0.12 + t * (alto - 0.38);
    const cono = new THREE.ConeGeometry(radio, altoPiso, 7, 1).rotateY(rng() * Math.PI).translate((rng() - 0.5) * 0.02, y + altoPiso / 2, (rng() - 0.5) * 0.02);
    irregular(cono, rng, radio * 0.18);
    const p = pieza(cono, HOJA_CONIFERA_BAJA);
    const col = p.attributes.color;
    const claro = new THREE.Color(HOJA_CONIFERA_ALTA);
    const oscuro = new THREE.Color(HOJA_CONIFERA_BAJA);
    const c = new THREE.Color();
    for (let i = 0; i < col.count; i++) {
      const u = Math.min(1, Math.max(0, (p.attributes.position.getY(i) - y) / altoPiso));
      c.lerpColors(oscuro, claro, u * 0.9 + t * 0.2);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    partes.push(p);
  }
  return fusionar(partes);
}

function crearPalma(rng: Rng): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  const altura = 0.64 + rng() * 0.14;
  const curva = 0.05 + rng() * 0.1;
  const tramos = 8;
  // Tronco con anillos: un cilindro dividido en tramos que se curva y se estrecha hacia arriba.
  const tronco = new THREE.CylinderGeometry(0.03, 0.06, altura, 6, tramos, true).translate(0, altura / 2, 0);
  const pos = tronco.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / altura;
    pos.setX(i, pos.getX(i) - curva * t * t);
  }
  tronco.computeVertexNormals();
  const pt = pieza(tronco, TRONCO_PALMA);
  const col = pt.attributes.color;
  const anillo = new THREE.Color(ANILLO_PALMA);
  const base = new THREE.Color(TRONCO_PALMA);
  const c = new THREE.Color();
  for (let i = 0; i < col.count; i++) {
    const tramo = Math.floor((pt.attributes.position.getY(i) / altura) * tramos + 0.001);
    c.copy(base).lerp(anillo, tramo % 2 === 0 ? 0.55 : 0);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  partes.push(pt);
  const cimaX = -curva;
  const frondas = 7 + Math.floor(rng() * 3);
  const clara = new THREE.Color(FRONDA_PUNTA);
  const oscura = new THREE.Color(FRONDA_BASE);
  for (let f = 0; f < frondas; f++) {
    const largo = 0.5 + rng() * 0.14;
    // Hoja: cono aplastado y alargado, curvado hacia abajo con la distancia al tronco.
    const g = new THREE.ConeGeometry(0.085, largo, 3, 4, true).translate(0, largo / 2, 0).rotateZ(-Math.PI / 2);
    const gp = g.attributes.position;
    const caida = 0.5 + rng() * 0.8;
    const subida = 0.25 + rng() * 0.35;
    for (let i = 0; i < gp.count; i++) {
      const t = gp.getX(i) / largo;
      gp.setY(i, gp.getY(i) * 0.3 + (subida * t - caida * t * t) * largo * 0.5);
    }
    g.rotateY((f / frondas) * Math.PI * 2 + (rng() - 0.5) * 0.4).translate(cimaX, altura * 0.99, 0);
    const p = pieza(g, FRONDA_BASE);
    const cp = p.attributes.color;
    for (let i = 0; i < cp.count; i++) {
      const t = Math.min(1, Math.hypot(p.attributes.position.getX(i) - cimaX, p.attributes.position.getZ(i)) / largo);
      c.lerpColors(oscura, clara, t);
      cp.setXYZ(i, c.r, c.g, c.b);
    }
    partes.push(p);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    partes.push(pieza(new THREE.IcosahedronGeometry(0.035, 0).translate(cimaX + Math.cos(a) * 0.045, altura * 0.95, Math.sin(a) * 0.045), COCO));
  }
  return fusionar(partes);
}

function crearCana(rng: Rng): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  const tallos = 6 + Math.floor(rng() * 3);
  for (let t = 0; t < tallos; t++) {
    const ang = (t / tallos) * Math.PI * 2 + rng() * 0.6;
    const alto = 0.5 + rng() * 0.3;
    const inclinacion = 0.08 + rng() * 0.18;
    const tallo = new THREE.CylinderGeometry(0.01, 0.02, alto, 4).translate(0, alto / 2, 0);
    const punta = new THREE.ConeGeometry(0.03, 0.13, 4).translate(0, alto + 0.06, 0);
    const hoja = new THREE.ConeGeometry(0.03, 0.26, 3).translate(0, 0.13, 0).rotateZ(1.0).translate(0, alto * 0.55, 0);
    const radio = 0.05 + rng() * 0.08;
    const dx = Math.cos(ang) * radio;
    const dz = Math.sin(ang) * radio;
    for (const [g, color] of [[tallo, CANA], [punta, PUNTA_CANA], [hoja, '#8fae48']] as const) {
      g.rotateZ(inclinacion).rotateY(ang).translate(dx, 0, dz);
      partes.push(pieza(g, color));
    }
  }
  return fusionar(partes);
}

/** Grupo de 3 piedras irregulares, medio enterradas, con la cara de arriba más clara. */
function crearRoca(rng: Rng): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  const bajo = new THREE.Color(ROCA_BAJA);
  const alto = new THREE.Color(ROCA_ALTA);
  const radios = [0.13 + rng() * 0.04, 0.08 + rng() * 0.03, 0.05 + rng() * 0.02];
  radios.forEach((r, k) => {
    const ang = rng() * Math.PI * 2;
    const dist = k === 0 ? 0 : r + 0.07 + rng() * 0.04;
    const g = new THREE.IcosahedronGeometry(r, 1).scale(1, 0.55 + rng() * 0.15, 0.8 + rng() * 0.25).rotateY(rng() * Math.PI);
    irregular(g, rng, r * 0.45);
    g.translate(Math.cos(ang) * dist, r * (0.45 - ENTIERRO_ROCA * 2), Math.sin(ang) * dist);
    const p = pieza(g, ROCA_BAJA);
    colorPorNormal(p, bajo, alto);
    partes.push(p);
  });
  return fusionar(partes);
}

function crearGuijarro(rng: Rng): THREE.BufferGeometry {
  const r = 0.035 + rng() * 0.02;
  const g = new THREE.IcosahedronGeometry(r, 0).scale(1, 0.6, 0.85);
  irregular(g, rng, r * 0.4);
  g.translate(0, r * 0.2, 0);
  const p = pieza(g, ROCA_BAJA);
  colorPorNormal(p, new THREE.Color(ROCA_BAJA), new THREE.Color(ROCA_ALTA));
  return p;
}

/** Mata de hierba: hojas finas abiertas en abanico, más oscuras en la base. El color final lo da la instancia. */
function crearMata(rng: Rng): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [];
  const hojas = 7 + Math.floor(rng() * 3);
  for (let h = 0; h < hojas; h++) {
    const ang = (h / hojas) * Math.PI * 2 + rng() * 0.5;
    const alto = 0.1 + rng() * 0.1;
    const g = new THREE.ConeGeometry(0.02, alto, 3, 1, true).translate(0, alto / 2, 0).rotateZ(0.15 + rng() * 0.45).rotateY(ang).translate(Math.cos(ang) * 0.02, 0, Math.sin(ang) * 0.02);
    const p = pieza(g, '#ffffff');
    sombraAbajo(p, 0, 0.2, 0.45);
    partes.push(p);
  }
  return fusionar(partes);
}

/** Duna: lomo alargado muy bajo, del que solo asoma la parte superior. */
function crearDuna(rng: Rng): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2).scale(0.8, 0.055, 0.38).rotateY(rng() * Math.PI);
  irregular(g, rng, 0.05);
  g.translate(0, -0.006, 0);
  const p = pieza(g, '#ffffff');
  return p;
}

const CREADORES: Record<Especie, (rng: Rng) => THREE.BufferGeometry> = {
  palma: crearPalma,
  conifera: crearConifera,
  arbol: crearArbol,
  cana: crearCana,
  roca: crearRoca,
  guijarro: crearGuijarro,
  mata: crearMata,
  duna: crearDuna,
};

/** Las especies pequeñas no proyectan sombra: no se verían y costarían mucho. */
const PROYECTA_SOMBRA: Record<Especie, boolean> = { palma: true, conifera: true, arbol: true, cana: false, roca: true, guijarro: false, mata: false, duna: true };

// ---------- Colocación ----------

interface Ejemplar {
  especie: Especie;
  variante: number;
  hex: number;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  giro: number;
  brillo: number;
}

export interface Vegetacion {
  readonly raiz: THREE.Group;
  /** Número de ejemplares colocados, por si hay que verificarlo. */
  readonly total: number;
  liberar(): void;
}

type Pedido = [Especie, number];

/** Qué hay que plantar en un hexágono, con las especies grandes primero para que las pequeñas las esquiven. */
function pedidosDe(mapa: Mapa, disp: Disposicion, i: number, rng: Rng, v: ConfigRender['vegetacion']): Pedido[] {
  const pedidos: Pedido[] = [];
  const terreno = mapa.terreno[i];
  const interior = disp.interior[i] >= INTERIOR_MINIMO;
  const grandes = enteroEntre(rng, v.minPorHex, v.maxPorHex);
  switch (mapa.vegetacion[i]) {
    case 'palmeral':
      pedidos.push(['palma', grandes]);
      break;
    case 'canaveral':
      pedidos.push(['cana', grandes]);
      return pedidos;
    case 'bosque':
      pedidos.push([mapa.bioma[i] === 'taiga' ? 'conifera' : 'arbol', grandes]);
      break;
    default:
      break;
  }
  if (terreno !== 'llanura' && terreno !== 'colina') return pedidos;
  const fert = mapa.fertilidad[i];
  const yermo = fert < 0.2;
  const hayArboles = pedidos.length > 0;
  if (yermo && terreno === 'llanura' && !hayArboles && rng() < v.probRoca) pedidos.push(['roca', enteroEntre(rng, 1, 2)]);
  if (yermo && terreno === 'llanura' && !hayArboles && interior && rng() < v.probDuna) pedidos.push(['duna', 1]);
  if (!interior) return pedidos;
  const guijarros = enteroEntre(rng, 0, v.guijarrosMax);
  if (guijarros > 0 && !hayArboles) pedidos.push(['guijarro', guijarros]);
  if (yermo) {
    if (rng() < v.probMataYerma) pedidos.push(['mata', enteroEntre(rng, 1, 2)]);
  } else {
    pedidos.push(['mata', enteroEntre(rng, v.matasMin, v.matasMax) + (hayArboles ? 0 : 1)]);
  }
  return pedidos;
}

function colocar(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, rng: Rng, suelo: SueloEn): Ejemplar[] {
  const v = cfg.vegetacion;
  const res: Ejemplar[] = [];
  const escalaArbol: [number, number] = [v.escalaMin, v.escalaMax];
  const escalas: Record<Especie, [number, number]> = {
    palma: escalaArbol,
    conifera: escalaArbol,
    arbol: escalaArbol,
    cana: escalaArbol,
    roca: ESCALA_ROCA,
    guijarro: ESCALA_GUIJARRO,
    mata: ESCALA_MATA,
    duna: ESCALA_DUNA,
  };
  for (let i = 0; i < disp.rejilla.total; i++) {
    const puestos: { x: number; z: number }[] = [];
    for (const [especie, cantidad] of pedidosDe(mapa, disp, i, rng, v)) {
      const pequena = SEPARACION[especie] > 0;
      const alcance = (pequena ? RADIO_PEQUENO : v.radioColocacion) * cfg.tamanoHex;
      const separacion = pequena ? SEPARACION[especie] : v.separacionMin;
      let colocadas = 0;
      for (let intento = 0; intento < cantidad * 6 && colocadas < cantidad; intento++) {
        const radio = Math.sqrt(rng()) * alcance;
        const ang = rng() * Math.PI * 2;
        const dx = Math.cos(ang) * radio;
        const dz = Math.sin(ang) * radio;
        if (puestos.some((p) => Math.hypot(p.x - dx, p.z - dz) < separacion)) continue;
        puestos.push({ x: dx, z: dz });
        colocadas++;
        const [min, max] = escalas[especie];
        const e = min + rng() * (max - min);
        // Las dunas se estiran en una dirección; el resto crece parejo.
        const largo = especie === 'duna' ? 0.8 + rng() * 0.6 : 1;
        res.push({
          especie,
          variante: Math.floor(rng() * v.variantes),
          hex: i,
          x: disp.x[i] + dx,
          // En colinas y montañas todo se apoya en la ladera, no en la tapa del prisma.
          y: suelo(i, disp.x[i] + dx, disp.z[i] + dz),
          z: disp.z[i] + dz,
          sx: e * largo,
          sy: e,
          sz: e,
          giro: rng() * Math.PI * 2,
          brillo: 1 - VARIACION_BRILLO / 2 + rng() * VARIACION_BRILLO,
        });
      }
    }
  }
  return res;
}

/** Plantas y piedras de todo el mapa: una malla instanciada por especie y variante de forma. */
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
  const tmp = new THREE.Color();
  const blanco = new THREE.Color(1, 1, 1);
  const seca = new THREE.Color(MATA_SECA);
  const verde = new THREE.Color(MATA_VERDE);

  const colorDe = (e: Ejemplar): THREE.Color => {
    color.copy(blanco);
    switch (e.especie) {
      case 'arbol':
        // El follaje toma un toque del color del bioma (olivo en el mediterráneo, verde vivo en la selva…).
        color.lerp(paleta.biomas[mapa.bioma[e.hex]], TINTE_BIOMA).lerp(blanco, 0.4);
        break;
      case 'mata': {
        const humedad = Math.min(1, mapa.fertilidad[e.hex] * 1.6);
        color.lerpColors(seca, verde, humedad);
        break;
      }
      case 'duna':
        // Mismo color que el suelo del hexágono, algo más claro: la arena empujada por el viento.
        color.copy(paleta.colorTapa(mapa, e.hex, 0, tmp)).multiplyScalar(1.03);
        break;
      default:
        break;
    }
    return color.multiplyScalar(e.brillo);
  };

  const especies = Object.keys(CREADORES) as Especie[];
  for (const especie of especies) {
    for (let variante = 0; variante < cfg.vegetacion.variantes; variante++) {
      const lista = ejemplares.filter((e) => e.especie === especie && e.variante === variante);
      if (lista.length === 0) continue;
      const geometria = CREADORES[especie](crearRng(derivarSemilla(variante + 1, `veg-forma-${especie}`)));
      const malla = new THREE.InstancedMesh(geometria, material, lista.length);
      malla.castShadow = PROYECTA_SOMBRA[especie];
      malla.receiveShadow = true;
      lista.forEach((e, k) => {
        posicion.set(e.x, e.y, e.z);
        escala.set(e.sx, e.sy, e.sz);
        giro.setFromAxisAngle(ejeY, e.giro);
        malla.setMatrixAt(k, matriz.compose(posicion, giro, escala));
        malla.setColorAt(k, colorDe(e));
      });
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
      geometrias.push(geometria);
      mallas.push(malla);
      raiz.add(malla);
    }
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
