import * as THREE from 'three';
import { crearRng, derivarSemilla } from '../logic/azar';
import type { Edificio, TipoEdificio } from '../logic/sim/tipos';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import { fusionar, pieza } from './geometria';
import type { SueloEn } from './vegetacion';

type Colores = ConfigRender['edificios']['colores'];

/** Perfil parabólico de arco (ancho 2·w, alto h), de un lado del suelo al otro. */
function perfilArco(w: number, h: number, pasos = 8): THREE.Vector2[] {
  const puntos: THREE.Vector2[] = [];
  for (let k = 0; k <= pasos; k++) {
    const x = -w + (2 * w * k) / pasos;
    puntos.push(new THREE.Vector2(x, h * (1 - (x / w) * (x / w))));
  }
  return puntos;
}

/** Bóveda maciza: el arco extruido a lo largo de x, de -largo/2 a +largo/2. */
function boveda(w: number, h: number, largo: number, pasos = 8): THREE.BufferGeometry {
  const forma = new THREE.Shape(perfilArco(w, h, pasos));
  forma.closePath();
  return new THREE.ExtrudeGeometry(forma, { depth: largo, bevelEnabled: false }).translate(0, 0, -largo / 2).rotateY(Math.PI / 2);
}

/** Placa plana con forma de arco, mirando hacia +x (para fachadas y puertas). */
function placaArco(w: number, h: number, x: number, pasos = 8): THREE.BufferGeometry {
  const forma = new THREE.Shape(perfilArco(w, h, pasos));
  forma.closePath();
  return new THREE.ShapeGeometry(forma).rotateY(Math.PI / 2).translate(x, 0, 0);
}

/** Era de tierra pisada bajo cada casa: la asienta en el suelo y dibuja el «patio». */
function era(radioX: number, radioZ: number, color: string): THREE.BufferGeometry {
  return pieza(new THREE.CylinderGeometry(1, 1.06, 0.03, 12).scale(radioX, 1, radioZ).translate(0, 0.012, 0), color);
}

/**
 * Mudhif: la casa de juncos del sur de Mesopotamia. Bóveda parabólica de haces de caña atados en
 * arcos, fachada de celosía con puerta en arco y los dos grandes pilares de haz rematados en penacho
 * que la hacen reconocible. Con su era, una cerca de cañizo y tinajas: se lee como un hogar.
 */
function crearChoza(c: Colores): THREE.BufferGeometry {
  const W = 0.27;
  const H = 0.46;
  const L = 0.8;
  const frente = L / 2;
  const p: THREE.BufferGeometry[] = [];
  p.push(era(0.62, 0.5, c.tierra));
  p.push(pieza(boveda(W, H, L, 10), c.junco));
  // Arcos de haces atados, algo más gruesos y oscuros que la bóveda.
  for (let k = 0; k < 5; k++) {
    const x = -L / 2 + 0.06 + (k * (L - 0.12)) / 4;
    p.push(pieza(boveda(W + 0.022, H + 0.025, 0.045, 10).translate(x, 0, 0), c.haz));
  }
  // Fachada: celosía oscura, listones claros y puerta en arco.
  p.push(pieza(placaArco(W * 0.86, H * 0.86, frente + 0.004), c.juncoOscuro));
  for (const z of [-0.12, 0, 0.12]) p.push(pieza(new THREE.BoxGeometry(0.012, 0.36, 0.014).translate(frente + 0.01, 0.2, z), c.junco));
  for (const y of [0.16, 0.3]) p.push(pieza(new THREE.BoxGeometry(0.012, 0.014, 0.4 - y * 0.6).translate(frente + 0.01, y, 0), c.junco));
  p.push(pieza(placaArco(0.075, 0.22, frente + 0.016, 6), c.hueco));
  // Pilares de haz a ambos lados de la puerta, con penacho abierto arriba.
  for (const z of [-W - 0.02, W + 0.02]) {
    p.push(pieza(new THREE.CylinderGeometry(0.032, 0.05, 0.62, 6).translate(frente + 0.02, 0.31, z), c.haz));
    p.push(pieza(new THREE.ConeGeometry(0.075, 0.13, 6).rotateX(Math.PI).translate(frente + 0.02, 0.67, z), c.junco));
  }
  // Cerca de cañizo en arco a un costado, como corral o huerto.
  for (let k = 0; k <= 8; k++) {
    const a = -0.2 + (k / 8) * 1.4;
    const x = -0.1 + Math.cos(a) * 0.5;
    const z = 0.12 + Math.sin(a) * 0.38;
    p.push(pieza(new THREE.CylinderGeometry(0.012, 0.014, 0.16 + (k % 2) * 0.03, 4).translate(x, 0.09, z), c.haz));
  }
  // Tinajas junto a la puerta.
  p.push(pieza(new THREE.SphereGeometry(0.055, 7, 5).scale(1, 1.3, 1).translate(frente + 0.12, 0.07, -0.18), c.ceramica));
  p.push(pieza(new THREE.SphereGeometry(0.042, 7, 5).scale(1, 1.3, 1).translate(frente + 0.2, 0.055, -0.1), c.ceramica));
  return fusionar(p);
}

/**
 * Almacén del templo: casa de adobe con la fachada de nichos y contrafuertes típica de los templos
 * sumerios, terraza con pretil, escalera exterior, dos graneros abovedados y tinajas a la puerta.
 */
function crearAlmacen(c: Colores): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  p.push(era(0.78, 0.66, c.tierra));
  // Zócalo y cuerpo principal.
  p.push(pieza(new THREE.BoxGeometry(0.96, 0.05, 0.7).translate(-0.04, 0.025, 0), c.adobeClaro));
  p.push(pieza(new THREE.BoxGeometry(0.86, 0.4, 0.6).translate(-0.04, 0.24, 0), c.adobe));
  // Contrafuertes: resaltes verticales que dan ritmo a las fachadas largas y a la delantera.
  for (const x of [-0.42, -0.2, 0.02, 0.24]) for (const z of [-0.31, 0.31]) p.push(pieza(new THREE.BoxGeometry(0.07, 0.4, 0.035).translate(x, 0.24, z), c.adobeClaro));
  for (const z of [-0.2, 0.2]) p.push(pieza(new THREE.BoxGeometry(0.035, 0.4, 0.07).translate(0.395, 0.24, z), c.adobeClaro));
  // Terraza con pretil.
  p.push(pieza(new THREE.BoxGeometry(0.9, 0.035, 0.64).translate(-0.04, 0.455, 0), c.adobeClaro));
  for (const [sx, sz, x, z] of [
    [0.9, 0.04, -0.04, -0.3],
    [0.9, 0.04, -0.04, 0.3],
    [0.04, 0.6, -0.47, 0],
  ])
    p.push(pieza(new THREE.BoxGeometry(sx, 0.06, sz).translate(x, 0.5, z), c.adobe));
  // Vigas de palmera asomando y puerta.
  for (const z of [-0.18, -0.06, 0.06, 0.18]) p.push(pieza(new THREE.CylinderGeometry(0.016, 0.016, 0.08, 4).rotateZ(Math.PI / 2).translate(0.41, 0.42, z), c.madera));
  p.push(pieza(new THREE.BoxGeometry(0.01, 0.24, 0.13).translate(0.381, 0.17, 0), c.hueco));
  // Escalera exterior que sube a la terraza por un costado.
  for (let k = 0; k < 5; k++) p.push(pieza(new THREE.BoxGeometry(0.1, 0.09 * (k + 1), 0.12).translate(-0.36 + k * 0.1, 0.045 * (k + 1), 0.38), c.adobe));
  // Graneros abovedados sobre la terraza.
  for (const [x, z, r] of [
    [-0.24, -0.1, 0.15],
    [0.04, -0.12, 0.12],
  ]) {
    p.push(pieza(new THREE.CylinderGeometry(r, r * 1.05, 0.08, 10).translate(x, 0.51, z), c.adobe));
    p.push(pieza(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.25, 1).translate(x, 0.55, z), c.adobeClaro));
  }
  // Tinajas a la puerta.
  for (const [x, z, s] of [
    [0.5, -0.24, 1],
    [0.56, -0.12, 0.8],
    [0.52, 0.22, 0.9],
    [0.6, 0.3, 0.7],
  ])
    p.push(pieza(new THREE.SphereGeometry(0.06 * s, 7, 5).scale(1, 1.3, 1).translate(x, 0.075 * s, z), c.ceramica));
  return fusionar(p);
}

export interface Edificios {
  readonly raiz: THREE.Group;
  /** Redibuja si la lista de edificios cambió (barato: se compara la cantidad y los ids). */
  sincronizar(lista: readonly Edificio[]): void;
  liberar(): void;
}

/** Edificios terminados: una malla instanciada por tipo de modelo. */
export function crearEdificios(disp: Disposicion, cfg: ConfigRender, suelo: SueloEn, semilla: number): Edificios {
  const ce = cfg.edificios;
  const modelos: Partial<Record<TipoEdificio, THREE.BufferGeometry>> = {
    choza: crearChoza(ce.colores),
    almacen: crearAlmacen(ce.colores),
  };
  // Doble cara: la bóveda abierta y las puertas planas se ven desde cualquier ángulo.
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const raiz = new THREE.Group();
  const mallas = new Map<TipoEdificio, THREE.InstancedMesh>();
  let firma = '';

  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const giro = new THREE.Quaternion();
  const ejeY = new THREE.Vector3(0, 1, 0);

  return {
    raiz,
    sincronizar(lista) {
      const nueva = lista.map((b) => `${b.id}:${b.tipo}`).join(',');
      if (nueva === firma) return;
      firma = nueva;
      for (const m of mallas.values()) {
        raiz.remove(m);
        m.dispose();
      }
      mallas.clear();
      for (const [tipo, geo] of Object.entries(modelos) as [TipoEdificio, THREE.BufferGeometry][]) {
        const deTipo = lista.filter((b) => b.tipo === tipo);
        if (deTipo.length === 0) continue;
        const malla = new THREE.InstancedMesh(geo, material, deTipo.length);
        malla.castShadow = true;
        malla.receiveShadow = true;
        deTipo.forEach((b, k) => {
          // Orientación y ligera variación estables por edificio (no cambian al redibujar).
          const rng = crearRng(derivarSemilla(semilla, `edificio-${b.id}`));
          const x = disp.x[b.hex];
          const z = disp.z[b.hex];
          posicion.set(x, suelo(b.hex, x, z), z);
          const e = (ce.escala as Partial<Record<TipoEdificio, number>>)[tipo] ?? 1;
          const v = 1 - ce.variacion / 2 + rng() * ce.variacion;
          escala.set(e * v, e * v, e * v);
          giro.setFromAxisAngle(ejeY, rng() * Math.PI * 2);
          malla.setMatrixAt(k, matriz.compose(posicion, giro, escala));
        });
        malla.instanceMatrix.needsUpdate = true;
        mallas.set(tipo, malla);
        raiz.add(malla);
      }
    },
    liberar() {
      for (const m of mallas.values()) m.dispose();
      for (const g of Object.values(modelos)) g?.dispose();
      material.dispose();
    },
  };
}

/** Catálogo de modelos para la galería (?galeria). */
export function catalogoEdificios(cfg: ConfigRender): Record<string, THREE.BufferGeometry> {
  return { choza: crearChoza(cfg.edificios.colores), almacen: crearAlmacen(cfg.edificios.colores) };
}
