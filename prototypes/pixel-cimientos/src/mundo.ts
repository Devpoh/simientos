import { fbm, hash2, rng } from './lienzo';

// El mundo es continuo: una función de altura por píxel, un río y unos caminos que son curvas,
// y edificios colocados en coordenadas libres. Nada de casillas.

export const ANCHO_MUNDO = 1600;
export const ALTO_MUNDO = 1100;

export type Punto = [number, number];

export interface Objeto {
  tipo: 'casa' | 'casaGrande' | 'ziggurat' | 'palmera' | 'arbol' | 'arbusto' | 'canas' | 'roca' | 'puesto' | 'granero' | 'torre' | 'muelle' | 'fardos';
  x: number;
  /** y del pie (donde toca el suelo): ordena el dibujo. */
  y: number;
  /** Medio ancho y fondo de la huella, para no solaparse. */
  rx: number;
  ry: number;
  semilla: number;
}

export interface Camino {
  puntos: Punto[];
  ancho: number;
}

export interface Mundo {
  altura: Float32Array;
  /** Distancia al río (px) y semiancho del cauce en el punto más cercano. */
  distRio: Float32Array;
  anchoRio: Float32Array;
  distCamino: Float32Array;
  anchoCamino: Float32Array;
  rio: Punto[];
  caminos: Camino[];
  objetos: Objeto[];
  centro: Punto;
  plaza: { x: number; y: number; rx: number; ry: number };
  puerto: Punto;
}

/** Suaviza una polilínea (Chaikin): esquinas → curvas. */
function chaikin(p: Punto[], pasos: number): Punto[] {
  let q = p;
  for (let k = 0; k < pasos; k++) {
    const r: Punto[] = [q[0]];
    for (let i = 0; i + 1 < q.length; i++) {
      const [ax, ay] = q[i];
      const [bx, by] = q[i + 1];
      r.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    r.push(q[q.length - 1]);
    q = r;
  }
  return q;
}

/** Distancia de cada píxel a una polilínea, recorriendo solo la caja de cada tramo. */
function rasterizarDistancia(dist: Float32Array, ancho: Float32Array, puntos: Punto[], anchos: (t: number) => number, alcance: number) {
  for (let s = 0; s + 1 < puntos.length; s++) {
    const [ax, ay] = puntos[s];
    const [bx, by] = puntos[s + 1];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - alcance));
    const x1 = Math.min(ANCHO_MUNDO - 1, Math.ceil(Math.max(ax, bx) + alcance));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - alcance));
    const y1 = Math.min(ALTO_MUNDO - 1, Math.ceil(Math.max(ay, by) + alcance));
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
        const i = y * ANCHO_MUNDO + x;
        if (d < dist[i]) {
          dist[i] = d;
          ancho[i] = anchos((s + t) / (puntos.length - 1));
        }
      }
  }
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function crearMundo(semilla = 11): Mundo {
  const W = ANCHO_MUNDO;
  const H = ALTO_MUNDO;
  const azar = rng(semilla);

  // 1. Río: baja de los montes del norte, serpentea por la llanura y desemboca en la bahía del suroeste.
  const control: Punto[] = [[760, 120], [700, 250], [745, 360], [660, 470], [640, 560], [700, 650], [610, 760], [520, 850], [455, 930], [400, 1000]];
  const rio = chaikin(
    control.map(([x, y], k) => [x + (k > 0 && k < control.length - 1 ? (azar() - 0.5) * 40 : 0), y] as Punto),
    5,
  );
  const distRio = new Float32Array(W * H).fill(1e9);
  const anchoRio = new Float32Array(W * H);
  rasterizarDistancia(distRio, anchoRio, rio, (t) => 4 + t * 9, 140);

  // 2. Altura: isla con costa irregular, bahía, montes al norte y el valle del río.
  const altura = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ex = (x - 820) / 700;
      const ey = (y - 560) / 470;
      let h = 1 - Math.hypot(ex, ey);
      h += (fbm(x / 230, y / 230, semilla) - 0.5) * 0.6 + (fbm(x / 70, y / 70, semilla + 1) - 0.5) * 0.12;
      // Bahía del puerto (suroeste).
      h -= Math.exp(-((x - 400) ** 2 + (y - 975) ** 2) / (2 * 120 ** 2)) * 0.75;
      h *= 0.42;
      // Montes del norte: crestas que se elevan hacia el borde superior.
      const monte = suave(470, 140, y + (fbm(x / 160, 0, 5) - 0.5) * 140);
      if (monte > 0 && h > 0) {
        const cresta = 1 - Math.abs(fbm(x / 95, y / 95, semilla + 3) * 2 - 1);
        h += monte * (0.18 + cresta * cresta * 0.55 + fbm(x / 40, y / 40, 8) * 0.08);
      }
      // Valle del río.
      const d = distRio[y * W + x];
      if (d < 160) h -= (1 - suave(0, 160, d)) * 0.05 * Math.max(0, h + 0.05) * 6;
      altura[y * W + x] = h;
    }

  // 3. Ciudad: plaza del zigurat al este del río y caminos curvos que salen de ella.
  const centro: Punto = [900, 590];
  const plaza = { x: centro[0], y: centro[1] + 18, rx: 120, ry: 78 };
  const puerto: Punto = [500, 905];
  const caminos: Camino[] = [
    { puntos: chaikin([[900, 668], [860, 740], [700, 790], [600, 860], [puerto[0], puerto[1]]], 4), ancho: 7 },
    { puntos: chaikin([[780, 600], [700, 590], [646, 560], [560, 545], [420, 560]], 4), ancho: 6 },
    { puntos: chaikin([[900, 512], [930, 420], [905, 330], [960, 230]], 4), ancho: 6 },
    { puntos: chaikin([[1020, 600], [1110, 620], [1220, 590], [1340, 640]], 4), ancho: 6 },
    { puntos: chaikin([[760, 700], [840, 760], [990, 770], [1090, 700], [1120, 620]], 4), ancho: 4 },
    { puntos: chaikin([[1040, 520], [1080, 470], [1010, 420], [930, 420]], 4), ancho: 4 },
  ];
  const distCamino = new Float32Array(W * H).fill(1e9);
  const anchoCamino = new Float32Array(W * H);
  for (const c of caminos) rasterizarDistancia(distCamino, anchoCamino, c.puntos, () => c.ancho, 40);

  // 4. Objetos con huella libre: se coloca si no choca con otro, ni con agua, caminos o plaza.
  const objetos: Objeto[] = [];
  const en = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(W - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(H - 1, Math.round(y)));
    return yi * W + xi;
  };
  const enPlaza = (x: number, y: number, m = 0) => ((x - plaza.x) / (plaza.rx + m)) ** 2 + ((y - plaza.y) / (plaza.ry + m)) ** 2 < 1;
  const libre = (x: number, y: number, rx: number, ry: number, margenCamino: number) => {
    for (const [dx, dy] of [[0, 0], [-rx, 0], [rx, 0], [0, -ry * 2], [-rx, -ry * 2], [rx, -ry * 2], [-rx, -ry], [rx, -ry]]) {
      const i = en(x + dx, y + dy);
      if (altura[i] < 0.03 || distRio[i] < anchoRio[i] + 6 || distCamino[i] < anchoCamino[i] + margenCamino) return false;
      if (enPlaza(x + dx, y + dy, 6)) return false;
    }
    return !objetos.some((o) => Math.abs(o.x - x) < o.rx + rx + 2 && Math.abs(o.y - o.ry - (y - ry)) < o.ry + ry + 2);
  };
  const poner = (tipo: Objeto['tipo'], x: number, y: number, rx: number, ry: number) => objetos.push({ tipo, x, y, rx, ry, semilla: Math.floor(azar() * 1e9) });

  poner('ziggurat', centro[0], centro[1] + 40, 84, 60);
  for (const [x, y] of [[810, 650], [995, 652], [835, 545]] as Punto[]) poner('puesto', x, y, 16, 8);
  poner('torre', 1140, 645, 14, 10);
  poner('torre', 700, 520, 14, 10);
  poner('torre', 980, 330, 14, 10);

  // Casas a lo largo de los caminos, a ambos lados, y luego relleno del barrio.
  for (const c of caminos) {
    for (let s = 0; s + 1 < c.puntos.length; s += 2) {
      const [ax, ay] = c.puntos[s];
      const [bx, by] = c.puntos[s + 1];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / l;
      const ny = (bx - ax) / l;
      for (const lado of [-1, 1]) {
        const grande = azar() < 0.2;
        const rx = grande ? 30 : 17 + Math.floor(azar() * 5);
        const ry = grande ? 16 : 11;
        const sep = c.ancho + rx * 0.7 + 4;
        const x = ax + nx * lado * sep;
        const y = ay + ny * lado * sep + ry;
        if (Math.hypot(x - centro[0], y - centro[1]) > 330) continue;
        if (libre(x, y, rx, ry, 3)) poner(grande ? 'casaGrande' : 'casa', x, y, rx, ry);
      }
    }
  }
  for (let k = 0; k < 900; k++) {
    const a = azar() * Math.PI * 2;
    const r = Math.sqrt(azar()) * 300;
    const x = centro[0] + Math.cos(a) * r * 1.25;
    const y = centro[1] + Math.sin(a) * r * 0.85;
    const grande = azar() < 0.15;
    const rx = grande ? 30 : 16 + Math.floor(azar() * 6);
    const ry = grande ? 16 : 11;
    if (libre(x, y, rx, ry, 4)) poner(grande ? 'casaGrande' : 'casa', x, y, rx, ry);
  }
  // Graneros junto a los campos.
  for (const [x, y] of [[560, 640], [590, 470], [500, 720]] as Punto[]) if (libre(x, y, 14, 10, 3)) poner('granero', x, y, 14, 10);

  // 5. Puerto: muelles hacia el agua y fardos en la orilla.
  for (const [x, y] of [[470, 880], [520, 900], [560, 920]] as Punto[]) {
    let yy = y;
    while (yy < H - 1 && altura[en(x, yy)] > 0) yy++;
    objetos.push({ tipo: 'muelle', x, y: yy - 4, rx: 8, ry: 2, semilla: 40 });
  }
  for (let k = 0; k < 6; k++) {
    const x = 470 + azar() * 120;
    const y = 850 + azar() * 40;
    if (libre(x, y, 11, 6, 2)) poner('fardos', x, y, 11, 6);
  }

  // 6. Vegetación: palmerales en la vega y la costa, arboledas en el monte, cañas en la orilla.
  for (let k = 0; k < 14000; k++) {
    const x = azar() * W;
    const y = azar() * H;
    const i = en(x, y);
    const h = altura[i];
    if (h < 0.005) continue;
    const dr = distRio[i];
    const ar = anchoRio[i];
    const ciudad = Math.hypot(x - centro[0], y - centro[1]) < 340;
    const campo = esCampo(x, y, dr, h, centro);
    if (dr < ar + 9 && dr > ar + 1 && azar() < 0.5) {
      if (libre(x, y, 6, 4, 1)) poner('canas', x, y, 6, 4);
    } else if (dr < ar + 70 && !campo && !ciudad && azar() < 0.35) {
      if (libre(x, y, 9, 4, 3)) poner('palmera', x, y, 9, 4);
    } else if (h > 0.2 && h < 0.42 && azar() < 0.06) {
      if (libre(x, y, 10, 5, 2)) poner('arbol', x, y, 10, 5);
    } else if (h > 0.3 && azar() < 0.03) {
      if (libre(x, y, 7, 4, 2)) poner('roca', x, y, 7, 4);
    } else if (h < 0.035 && h > 0.008 && azar() < 0.08) {
      if (libre(x, y, 9, 4, 2)) poner('palmera', x, y, 9, 4);
    } else if (!campo && !ciudad && h < 0.2 && azar() < 0.012) {
      if (libre(x, y, 6, 4, 2)) poner(azar() < 0.7 ? 'arbusto' : 'palmera', x, y, 6, 4);
    } else if (ciudad && azar() < 0.05) {
      if (libre(x, y, 9, 4, 3)) poner('palmera', x, y, 9, 4);
    }
  }

  return { altura, distRio, anchoRio, distCamino, anchoCamino, rio, caminos, objetos, centro, plaza, puerto };
}

/** Zona de cultivo: la vega llana a ambos lados del río, fuera de la ciudad. */
export function esCampo(x: number, y: number, dr: number, h: number, centro: Punto): boolean {
  return dr > 22 && dr < 210 && h > 0.025 && h < 0.2 && y > 380 && Math.hypot(x - centro[0], y - centro[1]) > 300 && hash2(Math.floor(x / 400), Math.floor(y / 400), 1) < 2;
}
