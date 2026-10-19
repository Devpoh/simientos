import { hash2, rng, type Rgb } from './lienzo';
import { P } from './paleta';
import { dt, rampa, Sprite, VACIO } from './sprite';

// Arte en vista cenital 3/4: desde arriba se ve el techo y, debajo, la fachada que mira al sur.
// Luz desde arriba a la izquierda: bordes de arriba/izquierda claros, abajo/derecha oscuros.

const RAMPA_HOJA = [P.hojaOscura, P.hojaSombra, P.hojaMedia, P.hoja, P.hojaLuz] as const;
const RAMPA_ADOBE = [P.adobeOscuro, P.adobeSombra, P.adobeMedio, P.adobe, P.adobeLuz] as const;
const RAMPA_ROCA = [P.rocaOscura, P.rocaSombra, P.rocaMedia, P.roca, P.rocaLuz] as const;

// ---------------------------------------------------------------- Casas

export interface OpcionesCasa {
  ancho: number;
  fondo: number;
  alto: number;
  semilla: number;
  /** 0 nada · 1 habitación alta · 2 toldo · 3 tinajas · 4 trampilla y ropa tendida */
  azotea: number;
  puertaAzul?: boolean;
}

/** Muro de adobe visto de frente: hiladas insinuadas, desconchones, suciedad abajo y sombra del alero. */
function muro(s: Sprite, x0: number, y0: number, w: number, h: number, semilla: number) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const px = x0 + x;
      const py = y0 + y;
      const n = hash2(px, py, semilla);
      let c: Rgb = P.adobe;
      if (y === 0) c = P.adobeSombra; // sombra bajo el pretil
      else if (y === 1) c = dt(px, py, 0.5, P.adobeSombra, P.adobeMedio);
      else if (y >= h - 2) c = y === h - 1 ? P.adobeSombra : dt(px, py, 0.5, P.adobeMedio, P.adobeSombra);
      else if ((y - 2) % 5 === 4 && n < 0.55) c = P.adobeMedio; // hilada
      else if (n < 0.035) c = P.adobeMedio;
      else if (n > 0.985) c = P.adobeLuz;
      // Esquina izquierda iluminada, derecha en penumbra.
      if (x === 0 && y > 1) c = P.adobeLuz;
      if (x >= w - 2 && y > 1) c = x === w - 1 ? P.adobeSombra : dt(px, py, 0.5, c, P.adobeMedio);
      s.pon(px, py, c);
    }
  // Desconchones: manchas de barro más oscuro que dejan ver el ladrillo.
  const r = rng(semilla);
  for (let k = 0; k < 2; k++) {
    const dx = x0 + 2 + Math.floor(r() * (w - 6));
    const dy = y0 + 3 + Math.floor(r() * Math.max(1, h - 7));
    s.pon(dx, dy, P.adobeMedio);
    s.pon(dx + 1, dy, P.ladrillo);
    s.pon(dx + 1, dy + 1, P.adobeMedio);
  }
}

/** Techo plano con pretil: el borde de arriba e izquierda recibe luz y proyecta sombra hacia dentro. */
function techo(s: Sprite, x0: number, y0: number, w: number, h: number, semilla: number) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const px = x0 + x;
      const py = y0 + y;
      const borde = Math.min(x, y, w - 1 - x, h - 1 - y);
      const n = hash2(px, py, semilla + 1);
      let c: Rgb;
      if (borde === 0) c = y === 0 || x === 0 ? P.adobeLuz : y === h - 1 ? P.adobeLuz : P.adobe;
      else if (borde === 1) c = y === 1 || x === 1 ? P.adobe : P.techoLuz;
      else if ((y === 2 || x === 2) && y < h - 2 && x < w - 2) c = P.techoSombra; // sombra del pretil
      else c = n < 0.06 ? P.techoSombra : n > 0.96 ? P.techoLuz : P.techo;
      s.pon(px, py, c);
    }
}

function puerta(s: Sprite, x: number, yBase: number, azul: boolean) {
  // Arco de medio punto: marco claro, hueco oscuro y hoja de madera entreabierta.
  const w = 6;
  const h = 9;
  for (let y = 0; y < h; y++)
    for (let i = -1; i <= w; i++) {
      const arco = y < 2 && (i < 1 || i > w - 2) && !(y === 1 && (i === 0 || i === w - 1));
      if (arco) continue;
      const borde = i === -1 || i === w || y === 0 || (y === 1 && (i === 0 || i === w - 1));
      const px = x + i;
      const py = yBase - h + y;
      if (borde) s.pon(px, py, y === 0 ? P.adobeLuz : P.adobeMedio);
      else if (i <= 2) s.pon(px, py, azul ? (i === 0 ? P.azulejoLuz : y % 3 === 0 ? P.azulejoSombra : P.azulejo) : i === 0 ? P.maderaLuz : y % 3 === 0 ? P.maderaSombra : P.madera);
      else s.pon(px, py, y === h - 1 ? P.maderaSombra : P.hueco);
    }
  // Umbral de piedra.
  for (let i = -2; i <= w + 1; i++) s.pon(x + i, yBase, i < 0 || i > w ? P.adobeSombra : P.rocaLuz);
}

function ventana(s: Sprite, x: number, y: number) {
  s.rect(x, y, 3, 3, P.hueco);
  s.pon(x + 2, y + 2, P.adobeOscuro);
  s.rect(x - 1, y - 1, 5, 1, P.madera); // dintel de palmera
  s.pon(x - 1, y - 1, P.maderaLuz);
  s.rect(x, y + 3, 3, 1, P.adobeLuz); // alféizar
}

export function casa(o: OpcionesCasa): Sprite {
  const extra = 12; // espacio sobre el techo para lo que haya en la azotea
  const W = o.ancho;
  const s = new Sprite(W + 2, extra + o.fondo + o.alto + 2, Math.floor((W + 2) / 2), extra + o.fondo + o.alto);
  const x0 = 1;
  const yTecho = extra;
  const yMuro = extra + o.fondo;
  const base = yMuro + o.alto - 1;
  const r = rng(o.semilla);
  techo(s, x0, yTecho, W, o.fondo, o.semilla);
  muro(s, x0, yMuro, W, o.alto, o.semilla);
  // Cabezas de vigas de palmera bajo el pretil.
  for (let x = x0 + 3; x < x0 + W - 3; x += 5) {
    s.pon(x, yMuro + 1, P.maderaSombra);
    s.pon(x + 1, yMuro + 1, P.madera);
    s.pon(x, yMuro + 2, P.adobeOscuro);
  }
  const xp = x0 + 3 + Math.floor(r() * (W - 13));
  puerta(s, xp, base, !!o.puertaAzul);
  // Ventanas altas, lejos de la puerta.
  for (let x = x0 + 3; x < x0 + W - 5; x += 9) if (Math.abs(x - xp) > 8 && o.alto >= 13) ventana(s, x, yMuro + 4);
  // Azotea.
  const yt = yTecho + 3;
  if (o.azotea === 1) {
    const w2 = Math.floor(W * 0.45);
    const f2 = Math.max(6, Math.floor(o.fondo * 0.45));
    const a2 = 8;
    techo(s, x0 + 3, yt - a2 + 1, w2, f2, o.semilla + 7);
    muro(s, x0 + 3, yt - a2 + 1 + f2, w2, a2, o.semilla + 9);
    s.rect(x0 + 3 + Math.floor(w2 / 2) - 1, yt + f2 + 3, 3, 5, P.hueco);
    s.rect(x0 + 3 + w2, yt + f2 - a2 + 2, 2, a2, P.techoSombra); // sombra a la derecha
  } else if (o.azotea === 2) {
    // Toldo de tela a rayas sobre cuatro palos, con su sombra en el techo.
    const tx = x0 + 4 + Math.floor(r() * Math.max(1, W - 22));
    const tw = 14;
    const tf = Math.min(o.fondo - 6, 9);
    const roja = r() < 0.6;
    s.rect(tx + 2, yt + 3, tw, tf, (x, y) => dt(x, y, 0.5, P.techoSombra, P.adobeMedio));
    for (let y = 0; y < tf; y++)
      for (let x = 0; x < tw; x++) {
        const raya = Math.floor(x / 2) % 2 === 0;
        const base2 = raya ? P.tela : roja ? P.telaRoja : P.telaAzul;
        const sombra = raya ? P.telaSombra : roja ? P.telaRojaSombra : P.telaAzulSombra;
        s.pon(tx + x, yt - 2 + y, y === tf - 1 || x === tw - 1 ? sombra : base2);
      }
    for (const px of [tx, tx + tw - 1]) for (let k = 0; k < 4; k++) s.pon(px, yt - 2 + tf + k, P.maderaSombra);
  } else if (o.azotea === 3) {
    // Tinajas de barro.
    for (let k = 0; k < 3; k++) {
      const cx = x0 + 5 + k * 5 + Math.floor(r() * 3);
      const cy = yt + 3 + Math.floor(r() * Math.max(1, o.fondo - 10));
      s.elipse(cx, cy, 2.2, 2.6, (_x, _y, nx, ny) => (nx + ny < -0.6 ? P.ladrilloLuz : nx + ny > 0.5 ? P.ladrilloSombra : P.ladrillo));
      s.pon(cx, cy - 2, P.hueco);
      s.pon(cx, cy - 3, P.ladrilloOscuro);
    }
  } else if (o.azotea === 4) {
    // Trampilla de la escalera y ropa tendida.
    const tx = x0 + W - 10;
    s.rect(tx, yt + 2, 5, 4, P.hueco);
    s.rect(tx, yt + 1, 5, 1, P.adobeLuz);
    s.rect(tx - 1, yt + 2, 1, 4, P.adobeMedio);
    const ly = yt + 1;
    s.linea(x0 + 3, ly, x0 + 3 + 14, ly, P.maderaSombra);
    const telas = [P.tela, P.telaRoja, P.telaAzul, P.tela];
    for (let k = 0; k < 4; k++) s.rect(x0 + 4 + k * 3, ly + 1, 2, 3 + (k % 2), telas[k]);
  }
  s.contornear(P.contorno, P.adobeOscuro);
  // Sombra: el techo está a la altura del muro (proyecta como el alto de la fachada).
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) if (s.c[y * s.w + x] !== VACIO) s.alto[y * s.w + x] = Math.min(base - y, o.alto + (y < yTecho + 3 ? 7 : 0));
  return s;
}

// ---------------------------------------------------------------- Zigurat

/** Muro de ladrillo cocido con contrafuertes rehundidos, típico de los zigurats sumerios. */
function muroLadrillo(s: Sprite, x0: number, y0: number, w: number, h: number) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const px = x0 + x;
      const py = y0 + y;
      const fila = Math.floor(y / 3);
      const junta = y % 3 === 2 || (x + (fila % 2) * 3) % 6 === 0;
      const contrafuerte = x % 14;
      let c: Rgb = junta ? P.ladrilloSombra : hash2(px, py, 3) < 0.12 ? P.ladrilloLuz : P.ladrillo;
      if (contrafuerte === 0) c = P.ladrilloLuz;
      else if (contrafuerte === 1 || contrafuerte === 2) c = junta ? P.ladrilloOscuro : P.ladrilloSombra;
      if (y === 0) c = P.ladrilloLuz;
      if (y >= h - 2) c = dt(px, py, 0.6, c, P.ladrilloOscuro);
      s.pon(px, py, c);
    }
}

function terraza(s: Sprite, x0: number, y0: number, w: number, h: number) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const px = x0 + x;
      const py = y0 + y;
      const borde = Math.min(x, y, w - 1 - x, h - 1 - y);
      const n = hash2(px, py, 12);
      const junta = (px % 7 === 0 && n < 0.5) || (py % 4 === 0 && n < 0.4);
      s.pon(px, py, borde === 0 ? (y === 0 || x === 0 ? P.adobeLuz : P.adobe) : junta ? P.adobeMedio : n < 0.08 ? P.adobe : P.techoLuz);
    }
}

/** Arbusto de jardín colgante en las terrazas. */
function matojo(s: Sprite, cx: number, cy: number, r: number) {
  s.elipse(cx, cy, r, r * 0.8, (x, y, nx, ny) => rampa(RAMPA_HOJA, 0.55 - (nx + ny) * 0.35 + (hash2(x, y, 4) - 0.5) * 0.3, x, y));
}

function escalera(s: Sprite, x0: number, yAbajo: number, yArriba: number, w: number) {
  for (let y = yArriba; y <= yAbajo; y++) {
    const peldano = (yAbajo - y) % 3;
    for (let x = 0; x < w; x++) {
      const lateral = x < 2 || x >= w - 2;
      const c = lateral ? (x === 0 ? P.ladrilloLuz : x === w - 1 ? P.ladrilloOscuro : P.ladrillo) : peldano === 0 ? P.adobeSombra : peldano === 1 ? P.adobe : P.adobeLuz;
      s.pon(x0 + x, y, c);
    }
  }
}

export function ziggurat(): Sprite {
  const W = 168;
  const H = 150;
  const s = new Sprite(W, H, W / 2, H - 1);
  const cx = W / 2;
  const frente = 18; // la escalinata sobresale por delante
  const base1 = H - 1 - frente;
  const g1 = { w: 150, muro: 26, fondo: 42 };
  const g2 = { w: 104, muro: 20, fondo: 26, retranqueo: 10 };
  const g3 = { w: 62, muro: 14, fondo: 16, retranqueo: 6 };
  // Grada 1.
  const x1 = cx - g1.w / 2;
  terraza(s, x1, base1 - g1.muro - g1.fondo + 1, g1.w, g1.fondo);
  muroLadrillo(s, x1, base1 - g1.muro + 1, g1.w, g1.muro);
  // Jardines en el borde de la primera terraza.
  for (let k = 0; k < 9; k++) {
    const mx = x1 + 6 + k * 17;
    if (Math.abs(mx - cx) < 16) continue;
    matojo(s, mx, base1 - g1.muro - 2, 3.2);
  }
  // Grada 2.
  const base2 = base1 - g1.muro - g2.retranqueo;
  const x2 = cx - g2.w / 2;
  terraza(s, x2, base2 - g2.muro - g2.fondo + 1, g2.w, g2.fondo);
  muroLadrillo(s, x2, base2 - g2.muro + 1, g2.w, g2.muro);
  for (let k = 0; k < 6; k++) {
    const mx = x2 + 6 + k * 18;
    if (Math.abs(mx - cx) < 14) continue;
    matojo(s, mx, base2 - g2.muro - 2, 2.6);
  }
  // Grada 3.
  const base3 = base2 - g2.muro - g3.retranqueo;
  const x3 = cx - g3.w / 2;
  terraza(s, x3, base3 - g3.muro - g3.fondo + 1, g3.w, g3.fondo);
  muroLadrillo(s, x3, base3 - g3.muro + 1, g3.w, g3.muro);
  // Santuario de azulejo azul con remate de oro.
  const bs = base3 - g3.muro - 4;
  const ws = 34;
  const xs = cx - ws / 2;
  const ms = 15;
  for (let y = 0; y < 10; y++) for (let x = 0; x < ws; x++) s.pon(xs + x, bs - ms - 10 + 1 + y, y === 0 || x === 0 ? P.oro : y === 9 || x === ws - 1 ? P.oroSombra : hash2(x, y, 2) < 0.1 ? P.techoLuz : P.techo);
  for (let y = 0; y < ms; y++)
    for (let x = 0; x < ws; x++) {
      const c = y < 2 ? (y === 0 ? P.oro : P.oroSombra) : x % 4 === 0 ? P.azulejoLuz : x % 4 === 3 ? P.azulejoSombra : P.azulejo;
      s.pon(xs + x, bs - ms + 1 + y, c);
    }
  // Cuernos de oro en las esquinas (remate sagrado) y puerta.
  for (const hx of [xs, xs + ws - 2]) for (let k = 0; k < 4; k++) s.pon(hx + (k > 1 ? 1 : 0), bs - ms - 10 - k, k === 3 ? P.oroSombra : P.oro);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) if (!(y === 0 && (x === 0 || x === 6))) s.pon(cx - 3 + x, bs - 8 + y, x === 0 || x === 6 || y === 0 ? P.oro : P.hueco);
  // Escalinata central (del suelo a la segunda grada) y laterales que suben en diagonal por la fachada.
  escalera(s, cx - 8, H - 1, base2 - g2.muro + 1, 16);
  for (const lado of [-1, 1]) {
    for (let k = 0; k < g1.muro + 4; k++) {
      const y = base1 - k + 3;
      const x = cx + lado * (g1.w / 2 - 12 - k * 2.2);
      for (let i = 0; i < 9; i++) {
        const px = x + (lado < 0 ? i : -i);
        s.pon(px, y, i === 0 || i === 8 ? P.ladrilloLuz : k % 3 === 0 ? P.adobeSombra : k % 3 === 1 ? P.adobe : P.adobeLuz);
      }
    }
  }
  // Pórtico donde se juntan las tres escaleras.
  const yp = base1 - g1.muro - 4;
  s.rect(cx - 12, yp - 10, 24, 6, (x, y) => (y === yp - 10 ? P.adobeLuz : hash2(x, y) < 0.1 ? P.adobe : P.techoLuz));
  muroLadrillo(s, cx - 12, yp - 4, 24, 8);
  s.rect(cx - 3, yp - 2, 6, 6, P.hueco);
  s.contornear(P.ladrilloOscuro, P.ladrilloSombra);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) if (s.c[y * s.w + x] !== VACIO) s.alto[y * s.w + x] = Math.min(base1 - y + frente, 70);
  return s;
}

// ---------------------------------------------------------------- Vegetación

export function palmera(semilla: number): Sprite {
  const r = rng(semilla);
  const s = new Sprite(40, 54, 20, 53);
  const alto = 30 + Math.floor(r() * 10);
  const curva = (r() < 0.5 ? -1 : 1) * (2 + r() * 5);
  let tx = 20;
  let ty = 53;
  // Tronco: escamas en zigzag (las bases de las hojas viejas).
  for (let k = 0; k < alto; k++) {
    const t = k / alto;
    tx = 20 + curva * t * t;
    ty = 53 - k;
    const escama = (k + (k % 6 < 3 ? 0 : 1)) % 3 === 0;
    s.pon(tx - 1, ty, escama ? P.tronco : P.troncoLuz);
    s.pon(tx, ty, escama ? P.troncoSombra : P.tronco);
    s.pon(tx + 1, ty, escama ? P.troncoSombra : t > 0.1 ? P.troncoSombra : P.tronco);
  }
  // Racimos de dátiles bajo la copa.
  for (const dx of [-2, 2]) {
    for (let k = 0; k < 3; k++) {
      s.pon(tx + dx, ty + 2 + k, k === 2 ? P.ladrilloSombra : P.datil);
      s.pon(tx + dx + (dx > 0 ? 1 : -1), ty + 3 + k, P.datil);
    }
  }
  // Hojas: cada una es un nervio curvo con foliolos colgando. Las de detrás, más oscuras.
  const hojas = 9 + Math.floor(r() * 3);
  const orden = Array.from({ length: hojas }, (_, k) => (k / hojas) * Math.PI * 2 + r() * 0.4).sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const a of orden) {
    const atras = Math.sin(a) < -0.2;
    const largo = 13 + r() * 5;
    const caida = 0.035 + r() * 0.02;
    for (let k = 0; k <= largo; k++) {
      const px = tx + Math.cos(a) * k;
      const py = ty + Math.sin(a) * k * 0.55 - k * 0.35 + caida * k * k;
      const t = k / largo;
      const nervio = atras ? P.hojaSombra : t < 0.3 ? P.hojaLuz : P.hoja;
      s.pon(px, py, nervio);
      if (k > 2 && k % 1 === 0) {
        const largoFoliolo = Math.max(1, Math.round(3 - t * 2));
        for (let f = 1; f <= largoFoliolo; f++) s.pon(px + (Math.cos(a) > 0 ? -0.3 : 0.3) * f, py + f, atras ? P.hojaOscura : f === 1 ? P.hojaMedia : P.hojaSombra);
      }
    }
  }
  s.pon(tx, ty, P.hojaOscura);
  s.pon(tx, ty - 1, P.hojaMedia);
  s.contornear(P.hojaOscura, P.hojaSombra);
  // El contorno del tronco, en marrón.
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.c[y * s.w + x] === P.hojaOscura && y > ty + 8) s.c[y * s.w + x] = P.troncoSombra;
  s.calcularAltura();
  return s;
}

/** Copa redonda hecha de varios «lunares» sombreados por su normal: tamarisco u olivo. */
export function arbol(semilla: number, tam = 1): Sprite {
  const r = rng(semilla);
  const W = Math.round(30 * tam);
  const H = Math.round(34 * tam);
  const s = new Sprite(W, H, Math.floor(W / 2), H - 1);
  const cx = W / 2;
  // Tronco con dos ramas.
  for (let k = 0; k < 9 * tam; k++) {
    s.pon(cx - 1, H - 1 - k, P.troncoLuz);
    s.pon(cx, H - 1 - k, P.tronco);
    s.pon(cx + 1, H - 1 - k, P.troncoSombra);
  }
  const copaY = H - 1 - 9 * tam - 8 * tam;
  const lunares: [number, number, number][] = [];
  for (let k = 0; k < 7; k++) lunares.push([cx + (r() - 0.5) * 14 * tam, copaY + (r() - 0.5) * 9 * tam, (5 + r() * 3) * tam]);
  lunares.sort((a, b) => a[1] - b[1]);
  for (const [lx, ly, lr] of lunares)
    s.elipse(lx, ly, lr, lr * 0.85, (x, y, nx, ny) => {
      const grumo = hash2(Math.floor(x / 2), Math.floor(y / 2), semilla) - 0.5;
      return rampa(RAMPA_HOJA, 0.62 - (nx + ny) * 0.38 + grumo * 0.35, x, y);
    });
  s.contornear(P.hojaOscura, P.hojaSombra);
  s.calcularAltura();
  return s;
}

export function arbusto(semilla: number): Sprite {
  const s = new Sprite(14, 11, 7, 10);
  const r = rng(semilla);
  for (let k = 0; k < 3; k++)
    s.elipse(4 + k * 3 + r(), 6 + r() * 2, 3.5, 3, (x, y, nx, ny) => rampa(RAMPA_HOJA, 0.6 - (nx + ny) * 0.4 + (hash2(x, y, semilla) - 0.5) * 0.3, x, y));
  s.contornear(P.hojaOscura, P.hojaSombra);
  s.calcularAltura();
  return s;
}

export function canas(semilla: number): Sprite {
  const s = new Sprite(16, 18, 8, 17);
  const r = rng(semilla);
  for (let k = 0; k < 11; k++) {
    const x = 2 + r() * 12;
    const alto = 8 + Math.floor(r() * 8);
    const inclina = (r() - 0.5) * 0.25;
    for (let j = 0; j < alto; j++) s.pon(x + inclina * j, 17 - j, j > alto - 3 ? (j === alto - 1 ? P.secaLuz : P.seca) : j < 3 ? P.hojaSombra : k % 2 ? P.hojaMedia : P.hoja);
  }
  s.calcularAltura();
  return s;
}

export function roca(semilla: number): Sprite {
  const s = new Sprite(16, 12, 8, 11);
  const r = rng(semilla);
  s.elipse(8, 7, 6 + r() * 1.5, 4.2, (x, y, nx, ny) => rampa(RAMPA_ROCA, 0.6 - (nx + ny) * 0.45 + (hash2(x, y, semilla) - 0.5) * 0.25, x, y));
  s.contornear(P.rocaOscura, P.rocaSombra);
  s.calcularAltura();
  return s;
}

// ---------------------------------------------------------------- Ciudad y puerto

export function puesto(semilla: number): Sprite {
  const r = rng(semilla);
  const s = new Sprite(32, 30, 16, 29);
  const roja = r() < 0.5;
  // Mostrador con mercancía.
  s.rect(3, 20, 26, 8, (x, y) => (y === 20 ? P.maderaLuz : y === 27 ? P.maderaSombra : x % 6 === 0 ? P.maderaSombra : P.madera));
  const generos = [P.datil, P.campoOro, P.ladrillo, P.hojaLuz, P.telaAzul];
  for (let k = 0; k < 7; k++) {
    const gx = 5 + k * 3.3;
    const c = generos[Math.floor(r() * generos.length)];
    s.pon(gx, 19, c);
    s.pon(gx + 1, 19, c);
    s.pon(gx, 18, c);
  }
  // Toldo a rayas con borde festoneado.
  for (let y = 0; y < 11; y++)
    for (let x = 0; x < 30; x++) {
      const raya = Math.floor(x / 3) % 2 === 0;
      let c: Rgb = raya ? P.tela : roja ? P.telaRoja : P.telaAzul;
      if (y >= 8) c = raya ? P.telaSombra : roja ? P.telaRojaSombra : P.telaAzulSombra;
      if (y === 10 && x % 3 === 1) continue;
      s.pon(1 + x, 4 + y, c);
    }
  for (const px of [2, 29]) for (let k = 15; k < 29; k++) s.pon(px, k, P.maderaSombra);
  s.contornear(P.contorno, P.maderaSombra);
  s.calcularAltura();
  return s;
}

export function granero(): Sprite {
  // Silo de adobe en forma de colmena.
  const s = new Sprite(28, 30, 14, 29);
  s.elipse(14, 17, 11, 12, (x, y, nx, ny) => {
    if (y > 27) return VACIO;
    const anillo = Math.floor((y + nx * 1.5) / 4) % 2 === 0 && hash2(x, y) < 0.4;
    return rampa(RAMPA_ADOBE, 0.68 - nx * 0.35 - ny * 0.3 - (anillo ? 0.1 : 0), x, y);
  });
  s.rect(12, 21, 4, 7, P.hueco);
  s.rect(11, 20, 6, 1, P.maderaSombra);
  s.contornear(P.contorno, P.adobeOscuro);
  s.calcularAltura();
  return s;
}

export function torre(): Sprite {
  const W = 26;
  const s = new Sprite(W + 2, 66, 14, 65);
  const yTecho = 14;
  techo(s, 1, yTecho, W, 10, 31);
  muro(s, 1, yTecho + 10, W, 41, 33);
  // Almenas escalonadas.
  for (let k = 0; k < 6; k++) {
    const mx = 1 + k * 5;
    s.rect(mx, yTecho - 3, 3, 3, (x, y) => (y === yTecho - 3 ? P.adobeLuz : x === mx + 2 ? P.adobeMedio : P.adobe));
  }
  ventana(s, 12, yTecho + 16);
  ventana(s, 12, yTecho + 28);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 7; x++) s.pon(11 + x, 64 - 9 + y, y < 2 && (x === 0 || x === 6) ? P.adobe : x === 0 || x === 6 ? P.adobeMedio : P.hueco);
  // Estandarte.
  for (let k = 0; k < 13; k++) s.pon(6, yTecho - 3 - k, P.maderaSombra);
  for (let y = 0; y < 6; y++) for (let x = 1; x < 10 - y; x++) s.pon(6 + x, yTecho - 15 + y + (x > 6 ? 1 : 0), y < 1 ? P.oro : y > 4 ? P.telaRojaSombra : P.telaRoja);
  s.contornear(P.contorno, P.adobeOscuro);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.c[y * s.w + x] !== VACIO) s.alto[y * s.w + x] = Math.min(65 - y, 41);
  return s;
}

export function muelle(largo: number): Sprite {
  // Embarcadero de tablones que entra en el agua (hacia abajo en pantalla).
  const s = new Sprite(16, largo + 6, 8, 2);
  for (let y = 0; y < largo; y++)
    for (let x = 0; x < 14; x++) s.pon(1 + x, y, y % 4 === 3 ? P.maderaSombra : x === 0 ? P.maderaLuz : x === 13 ? P.maderaSombra : hash2(x, y, 5) < 0.1 ? P.maderaLuz : P.madera);
  for (let y = 0; y < largo; y += 10) for (const px of [0, 15]) for (let k = 0; k < 6; k++) s.pon(px, y + k, k > 3 ? P.troncoSombra : P.tronco);
  s.rect(1, largo, 14, 2, P.maderaSombra);
  s.calcularAltura();
  for (let i = 0; i < s.alto.length; i++) if (s.alto[i] >= 0) s.alto[i] = 2;
  return s;
}

export function fardos(semilla: number): Sprite {
  const s = new Sprite(22, 14, 11, 13);
  const r = rng(semilla);
  for (let k = 0; k < 4; k++) {
    const x = 2 + k * 4.5 + r();
    const y = 8 + (k % 2) * 2;
    if (k % 2 === 0) s.elipse(x + 2, y, 2.3, 3, (_px, _py, nx, ny) => (nx + ny < -0.5 ? P.ladrilloLuz : nx + ny > 0.5 ? P.ladrilloSombra : P.ladrillo));
    else s.rect(x, y - 2, 5, 4, (px, py) => (py === y - 2 ? P.campoOroLuz : px === x + 4 ? P.campoOroSombra : P.campoOro));
  }
  s.contornear(P.contorno, P.maderaSombra);
  s.calcularAltura();
  return s;
}

// ---------------------------------------------------------------- Barcas y gente

export function barca(semilla: number): Sprite {
  const r = rng(semilla);
  const s = new Sprite(44, 40, 22, 34);
  const vela = r() < 0.4 ? 'roja' : 'blanca';
  // Casco: visto desde arriba, una almendra con la borda clara y el costado que se ve por delante.
  s.elipse(22, 31, 18, 4.5, (x, _y, _nx, ny) => (Math.abs(ny) > 0.65 ? (ny < 0 ? P.maderaLuz : P.maderaSombra) : x % 4 === 0 ? P.madera : P.maderaLuz));
  for (let x = 6; x < 39; x++) {
    const t = Math.abs(x - 22) / 17;
    const fondo = Math.round(3 - t * 2);
    for (let k = 0; k < fondo; k++) s.pon(x, 35 + k, k === fondo - 1 ? P.contorno : P.maderaSombra);
  }
  // Proa y popa curvadas.
  s.pon(4, 29, P.madera);
  s.pon(3, 28, P.maderaLuz);
  s.pon(40, 29, P.madera);
  s.pon(41, 27, P.maderaLuz);
  s.pon(41, 28, P.madera);
  // Mástil y vela cuadrada hinchada por el viento (centro más claro).
  for (let k = 0; k < 24; k++) s.pon(22, 31 - k, k > 22 ? P.maderaSombra : P.madera);
  for (let y = 0; y < 15; y++)
    for (let x = -9; x <= 9; x++) {
      const bulto = 1 - Math.abs(x) / 10 - Math.abs(y - 7) / 16;
      const raya = vela === 'roja' && Math.floor((x + 9) / 3) % 2 === 1;
      const base = raya ? (bulto > 0.45 ? P.telaRoja : P.telaRojaSombra) : bulto > 0.5 ? P.tela : bulto > 0.25 ? dt(x, y, 0.5, P.tela, P.telaSombra) : P.telaSombra;
      s.pon(22 + x, 9 + y + Math.round(Math.abs(x) * 0.15), base);
    }
  s.linea(13, 9, 31, 9, P.maderaSombra);
  s.contornear(P.contorno, P.maderaSombra);
  for (let i = 0; i < s.alto.length; i++) if (s.c[i] !== VACIO) s.alto[i] = -1;
  return s;
}

export interface Fotogramas {
  frames: Sprite[];
}

/** Persona de 7×13 con dos fotogramas de paso. */
export function persona(tunica: Rgb, tunicaSombra: Rgb, carga: 'nada' | 'cesto' | 'tinaja'): Sprite[] {
  return [0, 1].map((f) => {
    const s = new Sprite(9, 16, 4, 15);
    // Piernas.
    if (f === 0) {
      s.pon(3, 14, P.pielSombra);
      s.pon(5, 14, P.piel);
      s.pon(3, 15, P.hueco);
      s.pon(5, 15, P.hueco);
    } else {
      s.pon(4, 14, P.piel);
      s.pon(4, 15, P.hueco);
      s.pon(3, 13, P.pielSombra);
    }
    // Túnica con falda.
    s.rect(2, 7, 5, 7, (x, y) => (x === 6 || y === 13 ? tunicaSombra : x === 2 && y < 10 ? P.tela : tunica));
    s.pon(2, 9, P.oroSombra); // cinturón
    s.pon(3, 9, P.oroSombra);
    s.pon(4, 9, P.oro);
    s.pon(5, 9, P.oroSombra);
    s.pon(6, 9, P.oroSombra);
    // Brazos.
    s.pon(1, 8 + f, P.piel);
    s.pon(7, 9 - f, P.pielSombra);
    // Cabeza.
    s.rect(3, 4, 3, 3, (x) => (x === 5 ? P.pielSombra : P.piel));
    s.rect(3, 3, 3, 1, P.pelo);
    s.pon(2, 4, P.pelo);
    s.pon(5, 5, P.hueco);
    if (carga === 'cesto') {
      s.rect(2, 1, 5, 2, (x, y) => (y === 1 ? P.maderaLuz : x % 2 ? P.madera : P.maderaSombra));
      s.pon(3, 0, P.datil);
      s.pon(5, 0, P.campoOro);
    } else if (carga === 'tinaja') {
      s.rect(3, 0, 3, 3, (x, y) => (y === 0 ? P.ladrilloOscuro : x === 5 ? P.ladrilloSombra : P.ladrillo));
      s.pon(7, 3, P.piel);
    }
    s.contornear(P.contorno, P.contorno);
    for (let i = 0; i < s.alto.length; i++) if (s.c[i] !== VACIO) s.alto[i] = -1;
    return s;
  });
}
