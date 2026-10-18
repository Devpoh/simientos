// Geometría 2D (plano XZ) para el urbanismo libre (R17): colocar edificios en cualquier sitio,
// comprobar que no se solapen entre sí ni invadan una carretera, y suavizar el trazado de caminos.
// Todo en coordenadas de mundo, sin three.js.

export interface Punto {
  x: number;
  z: number;
}

/** Rectángulo orientado: «ancho» va sobre el eje local x, «fondo» sobre el z.
 * El giro (radianes) es sobre el eje y, antihorario visto desde arriba (+y):
 * x' = cx + lx·cos(g) + lz·sin(g); z' = cz − lx·sin(g) + lz·cos(g). */
export interface Rect {
  cx: number;
  cz: number;
  ancho: number;
  fondo: number;
  giro: number;
}

function aMundo(r: Rect, lx: number, lz: number): Punto {
  const cos = Math.cos(r.giro);
  const sin = Math.sin(r.giro);
  return { x: r.cx + lx * cos + lz * sin, z: r.cz - lx * sin + lz * cos };
}

/** Inversa de `aMundo`: coordenadas locales (ejes del rect) de un punto del mundo. */
function aLocal(p: Punto, r: Rect): Punto {
  const dx = p.x - r.cx;
  const dz = p.z - r.cz;
  const cos = Math.cos(r.giro);
  const sin = Math.sin(r.giro);
  return { x: cos * dx - sin * dz, z: sin * dx + cos * dz };
}

/** Las 4 esquinas del rect, en orden (empezando en -ancho/2,-fondo/2 y recorriendo el borde). */
export function esquinasRect(r: Rect): Punto[] {
  const hx = r.ancho / 2;
  const hz = r.fondo / 2;
  return [
    aMundo(r, -hx, -hz),
    aMundo(r, hx, -hz),
    aMundo(r, hx, hz),
    aMundo(r, -hx, hz),
  ];
}

export function puntoEnRect(p: Punto, r: Rect, margen = 0): boolean {
  const l = aLocal(p, r);
  const hx = r.ancho / 2 + margen;
  const hz = r.fondo / 2 + margen;
  return l.x >= -hx && l.x <= hx && l.z >= -hz && l.z <= hz;
}

function ejesRect(r: Rect): Punto[] {
  const cos = Math.cos(r.giro);
  const sin = Math.sin(r.giro);
  return [
    { x: cos, z: -sin },
    { x: sin, z: cos },
  ];
}

function proyectar(esquinas: Punto[], eje: Punto): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of esquinas) {
    const v = p.x * eje.x + p.z * eje.z;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/** SAT con los 4 ejes de ambos rects. `margen` agranda cada rect ese tanto, así que el hueco
 * tolerado entre ambos antes de considerarse solape es `2 · margen`. */
export function rectsSolapan(a: Rect, b: Rect, margen = 0): boolean {
  const ea = esquinasRect(a);
  const eb = esquinasRect(b);
  for (const eje of [...ejesRect(a), ...ejesRect(b)]) {
    const pa = proyectar(ea, eje);
    const pb = proyectar(eb, eje);
    if (pa.max + margen < pb.min - margen || pb.max + margen < pa.min - margen) return false;
  }
  return true;
}

export function distanciaPuntoSegmento(p: Punto, a: Punto, b: Punto): { dist: number; t: number; punto: Punto } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const largo2 = dx * dx + dz * dz;
  let t = largo2 === 0 ? 0 : ((p.x - a.x) * dx + (p.z - a.z) * dz) / largo2;
  t = Math.max(0, Math.min(1, t));
  const punto = { x: a.x + dx * t, z: a.z + dz * t };
  return { dist: Math.hypot(p.x - punto.x, p.z - punto.z), t, punto };
}

export function distanciaPuntoPolilinea(
  p: Punto,
  puntos: Punto[],
): { dist: number; tramo: number; punto: Punto; direccion: Punto } {
  let mejor = { dist: Infinity, tramo: 0, punto: puntos[0] ?? { x: 0, z: 0 }, direccion: { x: 1, z: 0 } };
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const r = distanciaPuntoSegmento(p, a, b);
    if (r.dist < mejor.dist) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const largo = Math.hypot(dx, dz) || 1;
      mejor = { dist: r.dist, tramo: i, punto: r.punto, direccion: { x: dx / largo, z: dz / largo } };
    }
  }
  return mejor;
}

/** 0 si `p` está dentro (o en el borde) de `r`. */
export function distanciaPuntoRect(p: Punto, r: Rect): number {
  const l = aLocal(p, r);
  const hx = r.ancho / 2;
  const hz = r.fondo / 2;
  const cx = Math.max(-hx, Math.min(hx, l.x));
  const cz = Math.max(-hz, Math.min(hz, l.z));
  return Math.hypot(l.x - cx, l.z - cz);
}

function orientacion(a: Punto, b: Punto, c: Punto): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function enCajaDelSegmento(a: Punto, b: Punto, p: Punto): boolean {
  return Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.z, b.z) <= p.z && p.z <= Math.max(a.z, b.z);
}

function segmentosSeCruzan(a: Punto, b: Punto, c: Punto, d: Punto): boolean {
  const o1 = orientacion(a, b, c);
  const o2 = orientacion(a, b, d);
  const o3 = orientacion(c, d, a);
  const o4 = orientacion(c, d, b);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return true;
  if (o1 === 0 && enCajaDelSegmento(a, b, c)) return true;
  if (o2 === 0 && enCajaDelSegmento(a, b, d)) return true;
  if (o3 === 0 && enCajaDelSegmento(c, d, a)) return true;
  if (o4 === 0 && enCajaDelSegmento(c, d, b)) return true;
  return false;
}

/** Distancia mínima entre dos segmentos: 0 si se cruzan, si no el mínimo de las 4 distancias
 * punto-segmento entre cada extremo de uno y el otro segmento (los dos únicos "ejes" posibles
 * entre dos segmentos, a diferencia del SAT entre polígonos que necesita más ejes). */
function distanciaSegmentoSegmento(a: Punto, b: Punto, c: Punto, d: Punto): number {
  if (segmentosSeCruzan(a, b, c, d)) return 0;
  return Math.min(
    distanciaPuntoSegmento(a, c, d).dist,
    distanciaPuntoSegmento(b, c, d).dist,
    distanciaPuntoSegmento(c, a, b).dist,
    distanciaPuntoSegmento(d, a, b).dist,
  );
}

function distanciaSegmentoRect(a: Punto, b: Punto, r: Rect): number {
  if (distanciaPuntoRect(a, r) === 0 || distanciaPuntoRect(b, r) === 0) return 0;
  const esquinas = esquinasRect(r);
  let min = Infinity;
  for (let i = 0; i < 4; i++) {
    const dist = distanciaSegmentoSegmento(a, b, esquinas[i], esquinas[(i + 1) % 4]);
    if (dist < min) min = dist;
  }
  return min;
}

/** ¿La cinta de la carretera (polilínea engordada `anchoMedio` a cada lado) toca el rect? */
export function rectTocaPolilinea(r: Rect, puntos: Punto[], anchoMedio: number): boolean {
  for (let i = 0; i < puntos.length - 1; i++) {
    if (distanciaSegmentoRect(puntos[i], puntos[i + 1], r) <= anchoMedio) return true;
  }
  return false;
}

function mezclar(a: Punto, b: Punto, ta: number, tb: number, t: number): Punto {
  const d = tb - ta;
  if (d === 0) return a;
  const f = (t - ta) / d;
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
}

/** Un tramo Catmull-Rom centrípeta entre p1 y p2, usando p0 y p3 como apoyo para la tangente.
 * La parametrización centrípeta (α=0.5, nudos por raíz de la distancia) evita los bucles y picos
 * que da la variante uniforme cuando los puntos están muy desiguales de separados. */
function tramoCatmullRom(p0: Punto, p1: Punto, p2: Punto, p3: Punto, pasos: number): Punto[] {
  const alpha = 0.5;
  const dist = (a: Punto, b: Punto) => Math.max(Math.hypot(b.x - a.x, b.z - a.z), 1e-6);
  const t0 = 0;
  const t1 = t0 + dist(p0, p1) ** alpha;
  const t2 = t1 + dist(p1, p2) ** alpha;
  const t3 = t2 + dist(p2, p3) ** alpha;

  const resultado: Punto[] = [];
  for (let i = 0; i < pasos; i++) {
    const t = t1 + ((t2 - t1) * i) / pasos;
    const a1 = mezclar(p0, p1, t0, t1, t);
    const a2 = mezclar(p1, p2, t1, t2, t);
    const a3 = mezclar(p2, p3, t2, t3, t);
    const b1 = mezclar(a1, a2, t0, t2, t);
    const b2 = mezclar(a2, a3, t1, t3, t);
    resultado.push(mezclar(b1, b2, t1, t2, t));
  }
  return resultado;
}

/** Suaviza la polilínea pasando por todos los puntos originales. Con menos de 3 puntos no hay
 * curva que trazar, así que devuelve una copia tal cual. */
export function suavizarPolilinea(puntos: Punto[], pasosPorTramo: number): Punto[] {
  if (puntos.length < 3) return puntos.map((p) => ({ ...p }));
  const ext = [puntos[0], ...puntos, puntos[puntos.length - 1]];
  const resultado: Punto[] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    resultado.push(...tramoCatmullRom(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], pasosPorTramo));
  }
  resultado.push({ ...puntos[puntos.length - 1] });
  return resultado;
}

export function longitudPolilinea(puntos: Punto[]): number {
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    total += Math.hypot(puntos[i + 1].x - puntos[i].x, puntos[i + 1].z - puntos[i].z);
  }
  return total;
}

/** Valores locales de -semieje a +semieje cada `paso`, garantizando que ambos bordes salen
 * exactamente aunque `2·semieje` no sea múltiplo de `paso`. */
function pasosEje(semieje: number, paso: number): number[] {
  const valores: number[] = [];
  for (let v = -semieje; v < semieje - 1e-9; v += paso) valores.push(v);
  valores.push(semieje);
  return valores;
}

/** Rejilla de puntos dentro del rect (bordes incluidos), para comprobar el terreno bajo la huella. */
export function muestrasRect(r: Rect, paso: number): Punto[] {
  const xs = pasosEje(r.ancho / 2, paso);
  const zs = pasosEje(r.fondo / 2, paso);
  const resultado: Punto[] = [];
  for (const lx of xs) {
    for (const lz of zs) {
      resultado.push(aMundo(r, lx, lz));
    }
  }
  return resultado;
}
