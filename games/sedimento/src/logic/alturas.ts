import { derivarSemilla } from './azar';
import { suavizarPolilinea, type Punto } from './geometria2d';
import { axialAMundo, mundoAAxial, Rejilla } from './hex';
import { esAgua, type Mapa } from './mapa';
import { ruidoValor } from './ruido';

// Campo de alturas continuo (R19): el terreno deja de ser prismas hexagonales y pasa a ser una
// superficie suave muestreada en una rejilla cuadrada. Los hexágonos siguen siendo los datos
// (bioma, fertilidad…); este módulo los convierte en relieve. Es lógica pura: la usan el render,
// la colocación de edificios (pendiente) y, más adelante, el movimiento de las personas.

export interface ConfigAlturas {
  /** Tamaño del hexágono en el mundo (mismo que el render). */
  tamanoHex: number;
  /** Separación entre muestras de la rejilla de alturas. */
  paso: number;
  /** Unidades de mundo por metro de altitud. */
  escalaVertical: number;
  /** Radio (en hexágonos) del suavizado gaussiano entre hexágonos vecinos. */
  sigma: number;
  /** Amplitud del relieve fino por tipo de terreno. */
  detalle: { llanura: number; colina: number; montana: number; frecuencia: number };
  mar: { profundidadCosta: number; pendiente: number; profundidadMax: number };
  lago: { margen: number; profundidad: number };
  rio: { anchoNacimiento: number; anchoDesembocadura: number; profundidad: number; vega: number; margenOrilla: number; pasosCurva: number };
}

export interface Rio {
  /** Cauce suavizado, del nacimiento a la desembocadura o la confluencia. */
  puntos: Punto[];
  /** Cota de la lámina de agua en cada punto (nunca sube aguas abajo). */
  lamina: number[];
  /** Semiancho del cauce en cada punto. */
  ancho: number[];
}

export interface CampoAlturas {
  readonly paso: number;
  readonly columnas: number;
  readonly filas: number;
  readonly origenX: number;
  readonly origenZ: number;
  readonly alturas: Float32Array;
  readonly nivelMar: number;
  readonly rios: Rio[];
  /** Cota de la lámina de cada lago, por hexágono de lago (NaN si no es lago). */
  readonly laminaLago: Float32Array;
  /** Altura del suelo en cualquier punto (interpolación bilineal de la rejilla). */
  alturaEn(x: number, z: number): number;
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function crearCampoAlturas(mapa: Mapa, cfg: ConfigAlturas): CampoAlturas {
  const R = cfg.tamanoHex;
  const rejilla = new Rejilla(mapa.columnas, mapa.filas);
  const n = rejilla.total;
  const cx = new Float32Array(n);
  const cz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const { q, r } = rejilla.axial(i);
    const p = axialAMundo(q, r, R);
    cx[i] = p.x;
    cz[i] = p.z;
  }

  // 1. Cota «objetivo» de cada hexágono. Ríos: la de sus orillas (el cauce se excava después).
  const base = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = mapa.terreno[i];
    if (t === 'mar') base[i] = -Math.min(cfg.mar.profundidadMax, cfg.mar.profundidadCosta + cfg.mar.pendiente * (distCostaDe(rejilla, mapa, i) - 1));
    else if (!esAgua(t)) base[i] = mapa.metros[i] * cfg.escalaVertical;
  }
  const mediaTierraVecina = (i: number) => {
    const v = rejilla.vecinos(i).filter((j) => !esAgua(mapa.terreno[j]));
    return v.length ? v.reduce((s, j) => s + base[j], 0) / v.length : 0;
  };
  const laminaLago = new Float32Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (mapa.terreno[i] === 'rio') base[i] = mediaTierraVecina(i);
    else if (mapa.terreno[i] === 'lago') {
      const orillas = rejilla.vecinos(i).filter((j) => !esAgua(mapa.terreno[j])).map((j) => base[j]);
      laminaLago[i] = (orillas.length ? Math.min(...orillas) : 0) - cfg.lago.margen;
    }
  }
  // Un lago tiene una sola lámina: la más baja de sus hexágonos (el agua se nivela).
  igualarLagos(rejilla, mapa, laminaLago);
  for (let i = 0; i < n; i++) if (mapa.terreno[i] === 'lago') base[i] = laminaLago[i] - cfg.lago.profundidad;

  const amplitud = new Float32Array(n);
  const crestas = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = mapa.terreno[i];
    amplitud[i] = t === 'montana' ? cfg.detalle.montana : t === 'colina' ? cfg.detalle.colina : esAgua(t) ? 0 : cfg.detalle.llanura;
    crestas[i] = t === 'montana' ? 1 : 0;
  }

  // 2. Rejilla de muestras que cubre el mapa con un margen de mar alrededor.
  const margen = 2 * R;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, cx[i]);
    maxX = Math.max(maxX, cx[i]);
    minZ = Math.min(minZ, cz[i]);
    maxZ = Math.max(maxZ, cz[i]);
  }
  const origenX = minX - margen;
  const origenZ = minZ - margen;
  const columnas = Math.ceil((maxX - minX + 2 * margen) / cfg.paso) + 1;
  const filas = Math.ceil((maxZ - minZ + 2 * margen) / cfg.paso) + 1;
  const alturas = new Float32Array(columnas * filas);

  const semillas = [0, 1, 2, 3].map((o) => derivarSemilla(mapa.semilla, `alturas-${o}`));
  const fueraDelMapa = -cfg.mar.profundidadMax;
  const dosSigma2 = 2 * (cfg.sigma * R) ** 2;
  const alcance = 2;

  for (let f = 0; f < filas; f++)
    for (let c = 0; c < columnas; c++) {
      const x = origenX + c * cfg.paso;
      const z = origenZ + f * cfg.paso;
      const { q, r } = mundoAAxial(x, z, R);
      let suma = 0;
      let pesos = 0;
      let amp = 0;
      let cre = 0;
      for (let dq = -alcance; dq <= alcance; dq++)
        for (let dr = Math.max(-alcance, -dq - alcance); dr <= Math.min(alcance, -dq + alcance); dr++) {
          const j = rejilla.indiceAxial(q + dq, r + dr);
          const p = axialAMundo(q + dq, r + dr, R);
          const w = Math.exp(-((x - p.x) ** 2 + (z - p.z) ** 2) / dosSigma2);
          const h = j === -1 ? fueraDelMapa : base[j];
          suma += h * w;
          pesos += w;
          if (j !== -1) {
            amp += amplitud[j] * w;
            cre += crestas[j] * w;
          }
        }
      let h = suma / pesos;
      amp /= pesos;
      cre /= pesos;
      // 3. Relieve fino: lomas suaves en el llano, crestas afiladas en la sierra.
      if (amp > 0) {
        let loma = 0;
        let cresta = 0;
        let a = 1;
        let fr = cfg.detalle.frecuencia;
        let total = 0;
        for (const s of semillas) {
          const v = ruidoValor(s, x * fr, z * fr);
          const rr = 1 - Math.abs(2 * v - 1);
          loma += (v - 0.5) * a;
          cresta += rr * rr * a;
          total += a;
          a *= 0.5;
          fr *= 2.03;
        }
        h += amp * ((loma / total) * (1 - cre) + (cresta / total) * cre);
      }
      alturas[f * columnas + c] = h;
    }

  const alturaEn = (x: number, z: number): number => {
    const fx = Math.min(columnas - 1.001, Math.max(0, (x - origenX) / cfg.paso));
    const fz = Math.min(filas - 1.001, Math.max(0, (z - origenZ) / cfg.paso));
    const c0 = Math.floor(fx);
    const f0 = Math.floor(fz);
    const tx = fx - c0;
    const tz = fz - f0;
    const i = f0 * columnas + c0;
    const a = alturas[i] + (alturas[i + 1] - alturas[i]) * tx;
    const b = alturas[i + columnas] + (alturas[i + columnas + 1] - alturas[i + columnas]) * tx;
    return a + (b - a) * tz;
  };

  // 4. Ríos: cauce suavizado con lámina que solo baja, excavado en el terreno con su vega.
  const rios: Rio[] = [];
  for (const cauce of mapa.rios) {
    const centros = cauce.map((i) => ({ x: cx[i], z: cz[i] }));
    if (centros.length < 2) continue;
    const puntos = suavizarPolilinea(centros, cfg.rio.pasosCurva);
    const lamina: number[] = [];
    const ancho: number[] = [];
    puntos.forEach((p, k) => {
      const t = k / (puntos.length - 1);
      ancho.push(cfg.rio.anchoNacimiento + (cfg.rio.anchoDesembocadura - cfg.rio.anchoNacimiento) * t);
      const orilla = alturaEn(p.x, p.z) - cfg.rio.margenOrilla;
      lamina.push(Math.max(0.02, k === 0 ? orilla : Math.min(lamina[k - 1], orilla)));
    });
    // Si desemboca en otro río ya trazado, termina a la cota de ese punto (sin escalón hacia arriba).
    const fin = puntos[puntos.length - 1];
    for (const otro of rios) {
      const k = cercano(otro.puntos, fin);
      if (Math.hypot(otro.puntos[k].x - fin.x, otro.puntos[k].z - fin.z) < R) {
        const objetivo = otro.lamina[k];
        for (let m = lamina.length - 1; m >= 0 && lamina[m] < objetivo; m--) lamina[m] = Math.min(objetivo, m === 0 ? objetivo : lamina[m - 1]);
      }
    }
    rios.push({ puntos, lamina, ancho });
  }
  for (const rio of rios) excavar(rio, cfg, alturas, columnas, filas, origenX, origenZ);

  return { paso: cfg.paso, columnas, filas, origenX, origenZ, alturas, nivelMar: 0, rios, laminaLago, alturaEn };
}

/** Rebaja el terreno a lo largo del cauce: lecho en U bajo la lámina y vega que desciende hacia él. */
function excavar(rio: Rio, cfg: ConfigAlturas, alturas: Float32Array, columnas: number, filas: number, origenX: number, origenZ: number): void {
  const { puntos, lamina, ancho } = rio;
  for (let k = 0; k + 1 < puntos.length; k++) {
    const a = puntos[k];
    const b = puntos[k + 1];
    const alcance = Math.max(ancho[k], ancho[k + 1]) * cfg.rio.vega;
    const c0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - alcance - origenX) / cfg.paso));
    const c1 = Math.min(columnas - 1, Math.ceil((Math.max(a.x, b.x) + alcance - origenX) / cfg.paso));
    const f0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - alcance - origenZ) / cfg.paso));
    const f1 = Math.min(filas - 1, Math.ceil((Math.max(a.z, b.z) + alcance - origenZ) / cfg.paso));
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    for (let f = f0; f <= f1; f++)
      for (let c = c0; c <= c1; c++) {
        const x = origenX + c * cfg.paso;
        const z = origenZ + f * cfg.paso;
        const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / l2));
        const d = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
        const w = ancho[k] + (ancho[k + 1] - ancho[k]) * t;
        const sup = lamina[k] + (lamina[k + 1] - lamina[k]) * t;
        if (d > w * cfg.rio.vega) continue;
        const i = f * columnas + c;
        // Lecho: parábola bajo la lámina. Vega: se funde desde la orilla (algo sobre la lámina) al terreno.
        const lecho = d < w ? sup - cfg.rio.profundidad * (1 - (d / w) ** 2) : sup + cfg.rio.margenOrilla * 0.5;
        const objetivo = d < w ? lecho : lecho + (alturas[i] - lecho) * suave(w, w * cfg.rio.vega, d);
        alturas[i] = Math.min(alturas[i], objetivo);
      }
  }
}

function cercano(puntos: Punto[], p: Punto): number {
  let mejor = 0;
  let dMin = Infinity;
  puntos.forEach((q, k) => {
    const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
    if (d < dMin) [dMin, mejor] = [d, k];
  });
  return mejor;
}

/** Saltos desde un hexágono de mar hasta la tierra más cercana (se calcula una vez por mapa). */
const cacheCosta = new WeakMap<Mapa, number[]>();
function distCostaDe(rejilla: Rejilla, mapa: Mapa, i: number): number {
  let d = cacheCosta.get(mapa);
  if (!d) {
    const tierra: number[] = [];
    for (let k = 0; k < rejilla.total; k++) if (mapa.terreno[k] !== 'mar') tierra.push(k);
    d = rejilla.distanciasDesde(tierra);
    cacheCosta.set(mapa, d);
  }
  return d[i];
}

/** Cada lago (componente conexa de hexágonos de lago) toma la lámina más baja de sus hexágonos. */
function igualarLagos(rejilla: Rejilla, mapa: Mapa, lamina: Float32Array): void {
  const visto = new Uint8Array(rejilla.total);
  for (let i = 0; i < rejilla.total; i++) {
    if (mapa.terreno[i] !== 'lago' || visto[i]) continue;
    const grupo = [i];
    visto[i] = 1;
    for (let k = 0; k < grupo.length; k++)
      for (const v of rejilla.vecinos(grupo[k]))
        if (mapa.terreno[v] === 'lago' && !visto[v]) {
          visto[v] = 1;
          grupo.push(v);
        }
    const minimo = Math.min(...grupo.map((g) => lamina[g]));
    for (const g of grupo) lamina[g] = minimo;
  }
}
