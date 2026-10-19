import { fbm, hash2, Lienzo, rng, tramado, type Rgb } from './lienzo';
import { ANCHO_MUNDO, type Mundo, type Punto } from './mundo';
import { P } from './paleta';
import type { Capas } from './pintor';
import { VACIO, type Sprite } from './sprite';
import * as S from './sprites';

// Todo lo que se mueve. Cada fotograma: copia de la porción visible del mundo + agua animada + sprites móviles.

interface Caminante {
  ruta: Punto[];
  largos: number[];
  s: number;
  dir: 1 | -1;
  vel: number;
  frames: Sprite[];
  x: number;
  y: number;
  izquierda: boolean;
}
interface Barca {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fase: number;
  vel: number;
  sprite: Sprite;
  amarrada: boolean;
}
interface Humo {
  x: number;
  y: number;
  edad: number;
  semilla: number;
}

const ABGR = (c: Rgb) => Lienzo.abgr(c);

export class Vida {
  private readonly caminantes: Caminante[] = [];
  private readonly barcas: Barca[] = [];
  private readonly humos: Humo[] = [];
  private readonly fuegos: Punto[] = [];
  private t = 0;
  private relojHumo = 0;
  private readonly azar = rng(5);

  constructor(m: Mundo, private readonly capas: Capas) {
    const tunicas: [Rgb, Rgb][] = [
      [P.tela, P.telaSombra],
      [P.tela, P.telaSombra],
      [P.telaRoja, P.telaRojaSombra],
      [P.telaAzul, P.telaAzulSombra],
      [P.campoOro, P.campoOroSombra],
      [P.adobe, P.adobeSombra],
    ];
    const cargas = ['nada', 'nada', 'cesto', 'tinaja'] as const;
    for (let k = 0; k < 70; k++) {
      const camino = m.caminos[k % m.caminos.length];
      const ruta = camino.puntos;
      const largos = [0];
      for (let i = 1; i < ruta.length; i++) largos.push(largos[i - 1] + Math.hypot(ruta[i][0] - ruta[i - 1][0], ruta[i][1] - ruta[i - 1][1]));
      const [tu, ts] = tunicas[k % tunicas.length];
      this.caminantes.push({
        ruta,
        largos,
        s: this.azar() * largos[largos.length - 1],
        dir: this.azar() < 0.5 ? 1 : -1,
        vel: 9 + this.azar() * 8,
        frames: S.persona(tu, ts, cargas[k % cargas.length]),
        x: 0,
        y: 0,
        izquierda: false,
      });
    }
    // Barcas: navegando alrededor de la isla y amarradas en el puerto.
    const rutas: [number, number, number, number][] = [
      [330, 1010, 90, 30],
      [700, 1060, 160, 25],
      [1180, 1000, 140, 40],
      [1480, 560, 40, 160],
      [180, 600, 40, 180],
    ];
    rutas.forEach(([cx, cy, rx, ry], k) => this.barcas.push({ cx, cy, rx, ry, fase: k * 1.3, vel: 0.05 + 0.01 * k, sprite: S.barca(k), amarrada: false }));
    for (const [k, [x, y]] of ([[488, 960], [538, 975]] as Punto[]).entries()) this.barcas.push({ cx: x, cy: y, rx: 0, ry: 0, fase: k, vel: 0, sprite: S.barca(10 + k), amarrada: true });
    // Fuegos de cocina en algunas azoteas.
    for (const o of m.objetos) if (o.tipo === 'casa' && o.semilla % 7 === 0) this.fuegos.push([o.x - 4, o.y - 30]);
  }

  get resumen() {
    return { caminantes: this.caminantes.length, barcas: this.barcas.length, humos: this.humos.length };
  }

  actualizar(dt: number): void {
    this.t += dt;
    for (const c of this.caminantes) {
      const total = c.largos[c.largos.length - 1];
      c.s += c.dir * c.vel * dt;
      if (c.s > total || c.s < 0) {
        c.dir = c.dir === 1 ? -1 : 1;
        c.s = Math.max(0, Math.min(total, c.s));
      }
      let i = 1;
      while (i < c.largos.length - 1 && c.largos[i] < c.s) i++;
      const t = (c.s - c.largos[i - 1]) / (c.largos[i] - c.largos[i - 1] || 1);
      const [ax, ay] = c.ruta[i - 1];
      const [bx, by] = c.ruta[i];
      // Cada uno camina por su carril, un poco a un lado del centro del camino.
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const carril = c.dir * 2.5;
      c.x = ax + (bx - ax) * t + (-(by - ay) / l) * carril;
      c.y = ay + (by - ay) * t + ((bx - ax) / l) * carril;
      c.izquierda = (bx - ax) * c.dir < 0;
    }
    this.relojHumo += dt;
    if (this.relojHumo > 0.5) {
      this.relojHumo = 0;
      for (const [x, y] of this.fuegos) this.humos.push({ x, y, edad: 0, semilla: Math.floor(this.azar() * 1000) });
    }
    for (const h of this.humos) {
      h.edad += dt;
      h.y -= dt * 7;
      h.x += dt * (3 + Math.sin(h.edad * 2 + h.semilla) * 2);
    }
    while (this.humos.length && this.humos[0].edad > 5) this.humos.shift();
  }

  pintar(F: Lienzo, camX: number, camY: number): void {
    const { base, agua, profAgua, pie } = this.capas;
    const VW = F.ancho;
    const VH = F.alto;
    const t = this.t;
    for (let y = 0; y < VH; y++) {
      const o = (camY + y) * ANCHO_MUNDO + camX;
      F.px.set(base.px.subarray(o, o + VW), y * VW);
    }

    const espuma = ABGR(P.espuma);
    const claro = ABGR(P.bajoClaro);
    const brillo = ABGR(P.brillo);
    const marClaro = ABGR(P.marClaro);
    const rioClaro = ABGR(P.rioClaro);
    for (let y = 0; y < VH; y++) {
      const wy = camY + y;
      for (let x = 0; x < VW; x++) {
        const wx = camX + x;
        const i = wy * ANCHO_MUNDO + wx;
        const a = agua[i];
        if (a === 0) continue;
        const f = y * VW + x;
        if (a === 2) {
          const flujo = (((wy * 0.16 + wx * 0.05) - t * 1.4 + hash2(wx >> 3, wy >> 4, 2)) % 1 + 1) % 1;
          if (flujo < 0.09) F.px[f] = rioClaro;
          else if (flujo < 0.12 && tramado(wx, wy) < 0.4) F.px[f] = brillo;
          continue;
        }
        const prof = profAgua[i];
        // Espuma que respira en la orilla.
        const orilla = 0.45 + 0.25 * Math.sin(t * 1.3 + wx * 0.045 + wy * 0.03);
        if (prof < orilla) {
          if (prof > orilla - 0.22 || tramado(wx, wy) < 0.5) F.px[f] = espuma;
          continue;
        }
        // Olas que llegan a la costa.
        if (prof < 4) {
          const ola = (((prof * 0.55 - t * 0.22 + fbm(wx / 90, wy / 90, 7, 2) * 0.6) % 1) + 1) % 1;
          if (ola < 0.05 && tramado(wx, wy) < 0.85 - prof * 0.15) {
            F.px[f] = prof < 1.4 ? espuma : claro;
            continue;
          }
        }
        // Destellos de sol: pocos, cambiando a saltos (como en los juegos clásicos).
        const chispa = hash2(wx >> 1, wy, Math.floor(t * 3 + hash2(wx >> 4, wy >> 3) * 9));
        if (chispa < 0.0035) F.px[f] = brillo;
        else if (chispa < 0.008 && prof > 2) F.px[f] = marClaro;
      }
    }

    const ponSprite = (s: Sprite, wx: number, wy: number, espejo: boolean) => {
      const ox = Math.round(wx) - s.anclaX - camX;
      const oy = Math.round(wy) - s.anclaY - camY;
      for (let y = 0; y < s.h; y++) {
        const fy = oy + y;
        if (fy < 0 || fy >= VH) continue;
        for (let x = 0; x < s.w; x++) {
          const c = s.c[y * s.w + (espejo ? s.w - 1 - x : x)];
          if (c === VACIO) continue;
          const fx = ox + x;
          if (fx < 0 || fx >= VW) continue;
          // Detrás de lo que tenga el pie más abajo (una casa delante tapa a la persona).
          if (pie[(fy + camY) * ANCHO_MUNDO + fx + camX] > wy + 0.5) continue;
          F.px[fy * VW + fx] = ABGR(c);
        }
      }
    };

    // Barcas (con estela) y gente.
    for (const b of this.barcas) {
      let x = b.cx;
      let y = b.cy;
      let izquierda = false;
      if (!b.amarrada) {
        const a = b.fase + t * b.vel;
        x = b.cx + Math.cos(a) * b.rx;
        y = b.cy + Math.sin(a) * b.ry;
        izquierda = -Math.sin(a) * b.rx < 0;
        for (let k = 1; k < 16; k++) {
          const ex = Math.round(x + (izquierda ? k + 16 : -k - 16) - camX);
          const ey = Math.round(y + ((k * 7) % 3) - camY);
          if (ex >= 0 && ey >= 0 && ex < VW && ey < VH && tramado(ex + camX, ey + camY) < 0.75 - k * 0.045) F.px[ey * VW + ex] = espuma;
        }
      }
      const vaiven = Math.round(Math.sin(t * 2 + b.fase) * 0.6);
      ponSprite(b.sprite, x, y + vaiven, izquierda);
    }
    for (const c of this.caminantes) {
      const frame = c.frames[Math.floor(t * c.vel * 0.45 + c.s * 0.1) % 2];
      ponSprite(frame, c.x, c.y, c.izquierda);
    }

    // Humo: bocanadas que suben, se ladean y se deshacen.
    for (const h of this.humos) {
      const vida = h.edad / 5;
      const r = 1.5 + vida * 4;
      const cx = h.x - camX;
      const cy = h.y - camY;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const xx = Math.round(cx + dx);
          const yy = Math.round(cy + dy);
          if (xx < 0 || yy < 0 || xx >= VW || yy >= VH) continue;
          if (tramado(xx + camX, yy + camY) < vida * 1.15) continue;
          F.px[yy * VW + xx] = ABGR(dy > r * 0.3 && dx > 0 ? P.humoSombra : P.humo);
        }
    }

    // Sombras de nubes que cruzan despacio (tramadas para que sigan siendo pixel art).
    for (let y = 0; y < VH; y++)
      for (let x = 0; x < VW; x++) {
        const wx = camX + x;
        const wy = camY + y;
        if (((wx ^ wy) & 1) === 0) continue;
        const nube = fbm((wx + t * 9) / 170, (wy + t * 4) / 120, 31, 3);
        if (nube > 0.63) F.sombra(x, y, 0.86);
      }

    // Gaviotas, con su sombra en el suelo.
    for (let k = 0; k < 7; k++) {
      const x = ((t * (16 + k * 3) + k * 260) % (VW + 200)) - 100;
      const y = 30 + ((k * 53) % Math.max(1, VH - 60)) + Math.sin(t * 0.8 + k) * 8;
      const ala = Math.floor(t * 6 + k) % 3;
      const alto = ala === 0 ? -1 : ala === 1 ? 0 : 1;
      F.sombra(x + 14, y + 22, 0.75);
      F.sombra(x + 15, y + 22, 0.75);
      F.pon(x, y, P.tela);
      F.pon(x - 1, y + alto, P.tela);
      F.pon(x + 1, y + alto, P.tela);
      F.pon(x - 2, y + alto * 2, P.telaSombra);
      F.pon(x + 2, y + alto * 2, P.telaSombra);
    }
  }
}
