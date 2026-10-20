// Dibuja la aldea de referencia con culling propio, y-sort por u+v (§4.5) y un pool de imágenes reutilizadas:
// nada se crea ni se destruye por fotograma. Presentación: aquí sí se usa Phaser; la lógica está en logic/aldeaReferencia.ts.
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import type { AtlasPixel, Orientacion } from '../data/atlas';
import {
  contarSolapes, orientacionHacia, posicionUnidad, type Aldea, type Elemento, type OrientacionAldea, type Unidad,
} from '../logic/aldeaReferencia';
import { aPantalla, centroHuella, claveOrden, claveOrdenEstructura, TILE } from '../logic/iso';

interface FotogramaVista {
  textura: string;
  clave: string;
  ox: number;
  oy: number;
  ancho: number;
  alto: number;
}

interface Animacion {
  fotogramas: FotogramaVista[];
  fps: number;
}

/** Algo que se dibuja: un elemento fijo o una unidad. Los campos de pantalla se calculan una vez (o por fotograma, sin crear objetos). */
interface Item {
  anim: Animacion;
  x: number;
  y: number;
  depth: number;
  /** Caja en pantalla (px de mundo) para el culling. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sprite: Phaser.GameObjects.Image | null;
  /** Última animación y fotograma aplicados al sprite (−1 = hay que aplicar). */
  aplicada: Animacion | null;
  fotograma: number;
  fase: number;
  unidad?: Unidad;
  elev0: number;
  elev1: number;
  largo: number;
  /** Radio de la caja de una unidad (px), para el culling. */
  radio: number;
  /** Unidad con ruta: animación de la vuelta (la de la ida es `anim` al empezar); `oriIda` dice cuál toca. */
  animIda?: Animacion;
  animVuelta?: Animacion;
  oriIda?: OrientacionAldea;
}

type Elevacion = (u: number, v: number) => number;
/** Los animales solo tienen se y sw: hacia atrás miran al lado más parecido. */
const SUSTITUTA: Record<string, Orientacion> = { nw: 'sw', ne: 'se', sw: 'nw', se: 'ne' };
const ORI_OPUESTA: Record<'se' | 'sw' | 'ne' | 'nw', OrientacionAldea> = { se: 'nw', nw: 'se', sw: 'ne', ne: 'sw' };

export class AldeaVista {
  /** Sprites mostrados ahora mismo (los que el culling deja ver). */
  activos = 0;
  readonly solapes: number;
  private readonly fijos: Item[] = [];
  private readonly animados: Item[] = [];
  private readonly moviles: Item[] = [];
  private readonly libres: Phaser.GameObjects.Image[] = [];
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly cache = new Map<string, Animacion>();
  private readonly pos = { u: 0, v: 0, ori: 'se' as OrientacionAldea };
  private vistaX = NaN;
  private vistaY = NaN;
  private vistaZoom = NaN;
  private vistaAncho = NaN;
  private vistaAlto = NaN;

  constructor(private readonly scene: Phaser.Scene, private readonly atlas: AtlasPixel, aldea: Aldea, elevacion: Elevacion) {
    this.solapes = contarSolapes(aldea);
    for (const e of [...aldea.edificios, ...aldea.props, ...aldea.arboles]) this.añadirFijo(e, elevacion);
    for (const u of aldea.unidades) this.añadirUnidad(u, elevacion);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  get nFijos(): number { return this.fijos.length; }
  get nMoviles(): number { return this.moviles.length; }
  get nPool(): number { return this.pool.length; }

  /** Un solo `update` por fotograma: culling de fijos si la cámara se movió, y movimiento y animación de lo visible. */
  actualizar(ahoraMs: number): void {
    const cam = this.scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const mx = cam.width / (2 * cam.zoom) + tuning.aldea.margenCullingPx;
    const my = cam.height / (2 * cam.zoom) + tuning.aldea.margenCullingPx;
    const x0 = cx - mx;
    const x1 = cx + mx;
    const y0 = cy - my;
    const y1 = cy + my;

    if (cx !== this.vistaX || cy !== this.vistaY || cam.zoom !== this.vistaZoom || cam.width !== this.vistaAncho || cam.height !== this.vistaAlto) {
      this.vistaAncho = cam.width;
      this.vistaAlto = cam.height;
      this.vistaX = cx;
      this.vistaY = cy;
      this.vistaZoom = cam.zoom;
      for (const it of this.fijos) this.recortar(it, x0, y0, x1, y1);
    }
    for (const it of this.animados) if (it.sprite) this.aplicar(it, ahoraMs);

    const t = ahoraMs / 1000;
    const p = this.pos;
    for (const it of this.moviles) {
      const uni = it.unidad as Unidad;
      posicionUnidad(uni, t, tuning.aldea.velocidadCaminar, p);
      let elev = it.elev0;
      if (uni.ruta) elev += (it.elev1 - it.elev0) * (Math.hypot(p.u - uni.u, p.v - uni.v) / it.largo);
      it.x = Math.round(((p.u - p.v) * TILE.ancho) / 2);
      it.y = Math.round(((p.u + p.v) * TILE.alto) / 2 - elev);
      it.depth = claveOrden(p.u, p.v);
      const visible = it.x + it.radio >= x0 && it.x - it.radio <= x1 && it.y + it.radio >= y0 && it.y - it.radio <= y1;
      if (!visible) {
        if (it.sprite) this.soltar(it);
        continue;
      }
      if (it.animIda && it.animVuelta) it.anim = p.ori === it.oriIda ? it.animIda : it.animVuelta;
      const s = it.sprite ?? this.coger(it);
      s.setPosition(it.x, it.y);
      if (s.depth !== it.depth) s.setDepth(it.depth);
      this.aplicar(it, ahoraMs);
    }
  }

  private recortar(it: Item, x0: number, y0: number, x1: number, y1: number): void {
    const visible = it.x1 >= x0 && it.x0 <= x1 && it.y1 >= y0 && it.y0 <= y1;
    if (visible && !it.sprite) {
      this.coger(it).setPosition(it.x, it.y).setDepth(it.depth);
      this.aplicar(it, 0);
    } else if (!visible && it.sprite) {
      this.soltar(it);
    }
  }

  /** Pone el fotograma que toca en el sprite del item; solo toca el sprite si algo cambió. */
  private aplicar(it: Item, ahoraMs: number): void {
    const s = it.sprite as Phaser.GameObjects.Image;
    const n = it.anim.fotogramas.length;
    const idx = it.anim.fps > 0 ? Math.floor((ahoraMs * it.anim.fps) / 1000 + it.fase * n) % n : 0;
    if (it.aplicada === it.anim && it.fotograma === idx) return;
    const f = it.anim.fotogramas[idx];
    s.setTexture(f.textura, f.clave);
    s.setOrigin(f.ox, f.oy);
    it.aplicada = it.anim;
    it.fotograma = idx;
  }

  private coger(it: Item): Phaser.GameObjects.Image {
    let s = this.libres.pop();
    if (!s) {
      s = this.scene.add.image(0, 0, `atlas-${this.atlas.frames[Object.keys(this.atlas.frames)[0]].atlas}`);
      this.pool.push(s);
    }
    s.setVisible(true);
    it.sprite = s;
    it.aplicada = null;
    this.activos++;
    return s;
  }

  private soltar(it: Item): void {
    const s = it.sprite as Phaser.GameObjects.Image;
    s.setVisible(false);
    this.libres.push(s);
    it.sprite = null;
    this.activos--;
  }

  /** Animación de (sprite, estado, orientación), compartida entre todos los que la usan. */
  private animacionDe(id: string, estado: string | undefined, ori: Orientacion): Animacion {
    const clave = `${id}|${estado ?? ''}|${ori}`;
    let a = this.cache.get(clave);
    if (a) return a;
    const sp = this.atlas.sprites[id];
    const nombre = estado ?? Object.keys(sp.estados)[0];
    const est = sp.estados[nombre];
    const lista = est.orientaciones[ori] ?? est.orientaciones[SUSTITUTA[ori]] ?? est.orientaciones[Object.keys(est.orientaciones)[0] as Orientacion] ?? [];
    a = {
      fps: est.fps,
      fotogramas: lista.map((k) => {
        const f = this.atlas.frames[k];
        return { textura: `atlas-${f.atlas}`, clave: k, ox: f.ancla.x / f.w, oy: f.ancla.y / f.h, ancho: f.w, alto: f.h };
      }),
    };
    this.cache.set(clave, a);
    return a;
  }

  private añadirFijo(e: Elemento, elevacion: Elevacion): void {
    const sp = this.atlas.sprites[e.id];
    const anim = this.animacionDe(e.id, e.estado, e.ori as Orientacion);
    const f = anim.fotogramas[0];
    const sobreHuella = sp.anclaEn === 'huella';
    const c = centroHuella(e.u, e.v, { w: e.w, d: e.d });
    const pant = aPantalla(c.u, c.v);
    const x = Math.round(pant.x);
    const y = Math.round(pant.y) - elevacion(c.u, c.v);
    // La caja cubre el mayor fotograma de la animación, no solo el primero.
    let ancho = 0;
    let alto = 0;
    for (const g of anim.fotogramas) {
      ancho = Math.max(ancho, g.ancho);
      alto = Math.max(alto, g.alto);
    }
    const item: Item = {
      anim, x, y, sprite: null, aplicada: null, fotograma: -1, fase: 0, elev0: 0, elev1: 0, largo: 1, radio: 0,
      depth: sobreHuella ? claveOrdenEstructura(e.u, e.v, { w: e.w, d: e.d }) : claveOrden(c.u, c.v),
      x0: x - f.ox * ancho, y0: y - f.oy * alto, x1: x - f.ox * ancho + ancho, y1: y - f.oy * alto + alto,
    };
    this.fijos.push(item);
    if (anim.fps > 0) this.animados.push(item);
  }

  private añadirUnidad(u: Unidad, elevacion: Elevacion): void {
    const anim = this.animacionDe(u.id, u.estado, u.ori as Orientacion);
    const f = anim.fotogramas[0];
    let extra: Pick<Item, 'animIda' | 'animVuelta' | 'oriIda'> = {};
    if (u.ruta) {
      const ida = orientacionHacia(u.ruta.u1 - u.u, u.ruta.v1 - u.v);
      const vuelta = ORI_OPUESTA[ida as 'se'];
      extra = {
        animIda: this.animacionDe(u.id, u.estado, ida as Orientacion),
        animVuelta: this.animacionDe(u.id, u.estado, vuelta as Orientacion),
        oriIda: ida,
      };
    }
    this.moviles.push({
      ...extra, anim, x: 0, y: 0, depth: 0, x0: 0, y0: 0, x1: 0, y1: 0, sprite: null, aplicada: null, fotograma: -1, fase: u.fase, unidad: u,
      elev0: elevacion(u.u, u.v), elev1: u.ruta ? elevacion(u.ruta.u1, u.ruta.v1) : 0,
      largo: u.ruta ? Math.hypot(u.ruta.u1 - u.u, u.ruta.v1 - u.v) : 1,
      radio: Math.max(f.ancho, f.alto),
    });
  }

  private destruir(): void {
    this.fijos.length = 0;
    this.animados.length = 0;
    this.moviles.length = 0;
    this.libres.length = 0;
    this.pool.length = 0;
    this.activos = 0;
  }
}
