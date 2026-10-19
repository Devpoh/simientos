import { fbm, hash2, Lienzo, type Rgb } from './lienzo';
import { ALTO_MUNDO, ANCHO_MUNDO, esCampo, type Mundo, type Objeto } from './mundo';
import { P, RAMPA } from './paleta';
import { dt, rampa, VACIO, type Sprite } from './sprite';
import * as S from './sprites';

// Pinta el mundo estático una vez: suelo, agua, sombras y todos los sprites fijos, ordenados por su pie.

export interface Capas {
  base: Lienzo;
  /** 1 = mar, 2 = río (los anima vida.ts); 0 = otra cosa. */
  agua: Uint8Array;
  /** Profundidad del mar en «bandas» (0 en la orilla). */
  profAgua: Float32Array;
  /** y del pie de lo que pintó cada píxel (para que la gente quede detrás de las casas). */
  pie: Float32Array;
}

const W = ANCHO_MUNDO;
const H = ALTO_MUNDO;
/** Escala de profundidad del mar: unidades de altura por banda de color. */
const BANDA_MAR = 0.022;

export function pintarMundo(m: Mundo): Capas {
  const L = new Lienzo(W, H);
  const agua = new Uint8Array(W * H);
  const profAgua = new Float32Array(W * H);
  const pie = new Float32Array(W * H).fill(-1e9);
  const px32 = L.px;
  const alt = m.altura;

  // ---------------------------------------------------------------- Suelo
  const ang = 0.42;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const h = alt[i];
      let c: Rgb;
      if (h < 0) {
        const prof = -h / BANDA_MAR + (fbm(x / 50, y / 50, 3) - 0.5) * 0.6;
        profAgua[i] = prof;
        agua[i] = 1;
        c = rampa(RAMPA.mar, 1 - Math.min(1, prof / 6), x, y);
        if (prof < 0.35) c = dt(x, y, prof / 0.35, P.arenaLuz, P.bajoClaro); // fondo de arena que se transparenta
        px32[i] = Lienzo.abgr(c);
        continue;
      }
      const gx = (alt[Math.min(i + 1, W * H - 1)] - alt[Math.max(i - 1, 0)]) * 140;
      const gy = (alt[Math.min(i + W, W * H - 1)] - alt[Math.max(i - W, 0)]) * 140;
      const luz = 0.55 + (gx + gy) * 1.4;
      const n = fbm(x / 22, y / 22, 21);
      const dr = m.distRio[i];
      const ar = m.anchoRio[i];
      const dc = m.distCamino[i];
      const ac = m.anchoCamino[i];
      const enPlaza = ((x - m.plaza.x) / m.plaza.rx) ** 2 + ((y - m.plaza.y) / m.plaza.ry) ** 2;

      if (dr < ar) {
        agua[i] = 2;
        c = dr > ar - 1.6 ? P.rioClaro : dt(x, y, 0.3 + n * 0.4, P.rio, P.mar);
      } else if (dr < ar + 3) {
        c = dr < ar + 1.5 ? P.arenaMojada : dt(x, y, 0.5, P.arenaSombra, P.arena);
      } else if (enPlaza < 1) {
        // Losas de piedra en hiladas, con cenefa de ladrillo en el borde.
        if (enPlaza > 0.9) c = enPlaza > 0.96 ? P.ladrilloSombra : P.ladrillo;
        else {
          const fila = Math.floor(y / 6);
          const junta = y % 6 === 0 || (x + (fila % 2) * 5) % 10 === 0;
          const v = hash2(Math.floor((x + (fila % 2) * 5) / 10), fila, 4);
          c = junta ? P.losaJunta : v < 0.2 ? P.camino : v > 0.85 ? P.adobeLuz : P.losa;
        }
      } else if (dc < ac) {
        const t = dc / ac;
        const h2 = hash2(x, y, 9);
        if (t > 0.8) c = P.caminoSombra;
        else if (Math.abs(t - 0.45) < 0.1 && h2 < 0.6) c = P.caminoSombra; // rodadas
        else c = h2 < 0.02 ? P.rocaLuz : h2 > 0.985 ? P.caminoLuz : dt(x, y, n, P.camino, P.caminoLuz);
      } else if (h < 0.022) {
        c = h < 0.006 ? dt(x, y, h / 0.006, P.arenaMojada, P.arenaSombra) : rampa(RAMPA.arena, Math.min(1, luz * 0.9 + 0.15 + (n - 0.5) * 0.3), x, y);
      } else if (esCampo(x, y, dr, h, m.centro)) {
        c = colorCampo(x, y, ca, sa, luz);
        if (c === P.rio) agua[i] = 2;
      } else {
        const empinado = gy < -0.55 && h > 0.15;
        const roca = (h > 0.33 && n > 0.42) || h > 0.5;
        if (empinado) {
          // Cara de risco que mira al sur: se ve «de frente» en la vista 3/4, con estratos.
          const estrato = Math.floor((y + hash2(Math.floor(x / 6), 0, 2) * 3) / 3) % 3;
          c = estrato === 0 ? P.rocaOscura : estrato === 1 ? P.rocaSombra : P.rocaMedia;
        } else if (roca) c = rampa(RAMPA.roca, luz + (n - 0.5) * 0.35, x, y);
        else {
          // Humedad: verde junto al río, más seco lejos y hacia el sur-este.
          const humedad = 1 - dr / 320 + (n - 0.5) * 0.7 - Math.max(0, (x - 1150) / 600);
          const vega = dr < ar + 60;
          const r = humedad < 0.32 ? RAMPA.seca : RAMPA.hierba;
          c = rampa(r, Math.min(1, Math.max(0, luz + (vega ? 0.08 : 0) + (n - 0.5) * 0.45)), x, y);
        }
      }
      px32[i] = Lienzo.abgr(c);
    }

  // Matas de hierba y florecillas: 2 px, claro encima de oscuro.
  for (let k = 0; k < 26000; k++) {
    const x = 1 + Math.floor(hash2(k, 1, 77) * (W - 2));
    const y = 2 + Math.floor(hash2(k, 2, 77) * (H - 3));
    const i = y * W + x;
    if (agua[i] || alt[i] < 0.025 || m.distCamino[i] < m.anchoCamino[i] + 1) continue;
    const c = L.lee(x, y);
    if (c !== P.hierba && c !== P.hierbaMedia && c !== P.hierbaLuz && c !== P.seca && c !== P.secaLuz) continue;
    const seca = c === P.seca || c === P.secaLuz;
    L.pon(x, y - 1, seca ? P.secaLuz : P.hierbaLuz);
    L.pon(x, y, seca ? P.secaSombra : P.hierbaSombra);
    if (!seca && k % 9 === 0) L.pon(x + 1, y - 1, k % 2 ? P.tela : P.oro);
  }

  // ---------------------------------------------------------------- Sprites
  const cache = new Map<string, Sprite>();
  const spriteDe = (o: Objeto): Sprite => {
    const r = o.semilla;
    switch (o.tipo) {
      case 'casa':
        return S.casa({ ancho: o.rx * 2, fondo: 14 + (r % 6), alto: 12 + (r % 4), semilla: r, azotea: r % 5 });
      case 'casaGrande':
        return S.casa({ ancho: o.rx * 2, fondo: 22 + (r % 5), alto: 17, semilla: r, azotea: 1 + (r % 2), puertaAzul: true });
      case 'ziggurat':
        return memo('zig', () => S.ziggurat());
      case 'palmera':
        return memo(`palma${r % 9}`, () => S.palmera(r % 9));
      case 'arbol':
        return memo(`arbol${r % 6}`, () => S.arbol(r % 6, 0.85 + (r % 3) * 0.12));
      case 'arbusto':
        return memo(`arbusto${r % 5}`, () => S.arbusto(r % 5));
      case 'canas':
        return memo(`canas${r % 5}`, () => S.canas(r % 5));
      case 'roca':
        return memo(`roca${r % 5}`, () => S.roca(r % 5));
      case 'puesto':
        return S.puesto(r);
      case 'granero':
        return memo('granero', () => S.granero());
      case 'torre':
        return memo('torre', () => S.torre());
      case 'muelle':
        return memo('muelle', () => S.muelle(46));
      case 'fardos':
        return S.fardos(r);
    }
  };
  function memo(k: string, f: () => Sprite): Sprite {
    let s = cache.get(k);
    if (!s) {
      s = f();
      cache.set(k, s);
    }
    return s;
  }

  const lista = m.objetos.map((o) => ({ o, s: spriteDe(o) })).sort((a, b) => a.o.y - b.o.y);

  // Sombras proyectadas (sol arriba a la izquierda → hacia abajo a la derecha), sin oscurecer dos veces.
  const sombra = new Uint8Array(W * H);
  for (const { o, s } of lista) {
    const ox = Math.round(o.x) - s.anclaX;
    const oy = Math.round(o.y) - s.anclaY;
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const a = s.alto[y * s.w + x];
        if (a < 0) continue;
        const sx = Math.round(ox + x + a * 0.75);
        const sy = Math.round(oy + y + a + a * 0.32);
        for (const [dx, dy] of [[0, 0], [1, 0]]) {
          const xx = sx + dx;
          const yy = sy + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) sombra[yy * W + xx] = 1;
        }
      }
  }
  for (let i = 0; i < W * H; i++) if (sombra[i]) L.sombra(i % W, (i / W) | 0, agua[i] ? 0.8 : 0.7);

  for (const { o, s } of lista) {
    const ox = Math.round(o.x) - s.anclaX;
    const oy = Math.round(o.y) - s.anclaY;
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const c = s.c[y * s.w + x];
        if (c === VACIO) continue;
        const xx = ox + x;
        const yy = oy + y;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const i = yy * W + xx;
        px32[i] = Lienzo.abgr(c);
        agua[i] = 0;
        pie[i] = o.y;
      }
  }
  return { base: L, agua, profAgua, pie };
}

/** Parcelas de cultivo con surcos, lindes y acequias, en una rejilla girada y desordenada (no se lee como casillas). */
function colorCampo(x: number, y: number, ca: number, sa: number, luz: number): Rgb {
  const U = 58;
  const V = 34;
  const u = x * ca + y * sa;
  const v = -x * sa + y * ca;
  const cu = Math.floor(u / U);
  const desfase = hash2(cu, 0, 13) * V;
  const cv = Math.floor((v + desfase) / V);
  const lu = u - cu * U;
  const lv = v + desfase - cv * V;
  const acequia = hash2(cu, 1, 14) < 0.35;
  if (lu < 2.2) return acequia ? (lu < 1.2 ? P.rio : P.rioClaro) : P.caminoSombra;
  if (lu < 3.4) return acequia ? P.arenaMojada : P.camino;
  if (lv < 1.6) return P.hierbaSombra; // linde de hierba
  const tipo = hash2(cu, cv, 15);
  const surcoU = hash2(cu, cv, 16) < 0.5;
  const surco = Math.floor((surcoU ? lu : lv) / 2) % 2 === 0;
  const tono = luz > 0.62 ? 1 : 0;
  if (tipo < 0.42) return surco ? (tono ? P.campoOroLuz : P.campoOro) : P.campoOroSombra;
  if (tipo < 0.78) return surco ? (tono ? P.campoVerdeLuz : P.campoVerde) : P.hierbaMedia;
  if (tipo < 0.9) return surco ? P.tierra : P.tierraSombra;
  // Huerto: matas en hileras.
  return Math.floor(lu / 4) % 2 === 0 && Math.floor(lv / 4) % 2 === 0 ? P.hoja : P.tierra;
}
