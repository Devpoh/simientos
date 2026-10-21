// Dibuja a los ciudadanos que caminan (P4b) con el mismo culling, pool de imágenes y y-sort de una sola regla
// que la aldea (§4.5). Lo que decide dónde está cada uno vive en logic/ciudadano.ts; aquí solo se pinta.
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import type { AtlasPixel, Orientacion } from '../data/atlas';
import { estadoDibujo, visible, type Ciudadano } from '../logic/ciudadano';
import { TILE } from '../logic/iso';
import { IndiceHuellas, type HuellaColocada } from '../logic/orden';

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

interface Item {
  anim: Animacion;
  x: number;
  y: number;
  depth: number;
  radio: number;
  sprite: Phaser.GameObjects.Image | null;
  aplicada: Animacion | null;
  fotograma: number;
  fase: number;
}

/** Elevación del terreno en píxeles, compartida con la aldea (misma función `alturaPx`). */
type Elevacion = (u: number, v: number) => number;

export class CiudadanosVista {
  /** Sprites de ciudadanos mostrados ahora mismo. */
  activos = 0;
  private readonly scene: Phaser.Scene;
  private readonly atlas: AtlasPixel;
  private readonly elevacion: Elevacion;
  private readonly indice: IndiceHuellas;
  private readonly cache = new Map<string, Animacion>();
  private readonly libres: Phaser.GameObjects.Image[] = [];
  private readonly pool: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, atlas: AtlasPixel, ciudadanos: readonly Ciudadano[], elevacion: Elevacion, huellas: readonly HuellaColocada[]) {
    this.scene = scene;
    this.atlas = atlas;
    this.elevacion = elevacion;
    this.indice = new IndiceHuellas(huellas);
    this.items = ciudadanos.map((ci) => ({ ciudadano: ci, item: this.crearItem(ci) }));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  private readonly items: { ciudadano: Ciudadano; item: Item }[] = [];

  /** Un `update` por fotograma: los ciudadanos ya se movieron en la lógica; aquí se coloca, culla y ordena. */
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

    for (const { ciudadano, item } of this.items) {
      if (!visible(ciudadano)) {
        if (item.sprite) this.soltar(item);
        continue;
      }
      item.anim = this.animacionDe(ciudadano);
      const elev = this.elevacion(ciudadano.u, ciudadano.v);
      const x = Math.round(((ciudadano.u - ciudadano.v) * TILE.ancho) / 2);
      const y = Math.round(((ciudadano.u + ciudadano.v) * TILE.alto) / 2 - elev);
      const dentro = x + item.radio >= x0 && x - item.radio <= x1 && y + item.radio >= y0 && y - item.radio <= y1;
      if (!dentro) {
        if (item.sprite) this.soltar(item);
        continue;
      }
      item.x = x;
      item.y = y;
      item.depth = this.indice.profundidad(ciudadano.u, ciudadano.v);
      const s = item.sprite ?? this.coger(item);
      s.setPosition(x, y);
      if (s.depth !== item.depth) s.setDepth(item.depth);
      this.aplicar(item, ahoraMs);
    }
  }

  private crearItem(ci: Ciudadano): Item {
    const anim = this.animacionDe(ci);
    let radio = 0;
    for (const g of anim.fotogramas) radio = Math.max(radio, g.ancho, g.alto);
    return { anim, x: 0, y: 0, depth: 0, radio, sprite: null, aplicada: null, fotograma: -1, fase: ci.fase };
  }

  private coger(item: Item): Phaser.GameObjects.Image {
    let s = this.libres.pop();
    if (!s) {
      s = this.scene.add.image(0, 0, `atlas-${this.atlas.frames[Object.keys(this.atlas.frames)[0]].atlas}`);
      this.pool.push(s);
    }
    s.setVisible(true);
    item.sprite = s;
    item.aplicada = null;
    this.activos++;
    return s;
  }

  private soltar(item: Item): void {
    const s = item.sprite as Phaser.GameObjects.Image;
    s.setVisible(false);
    this.libres.push(s);
    item.sprite = null;
    this.activos--;
  }

  private aplicar(item: Item, ahoraMs: number): void {
    const s = item.sprite as Phaser.GameObjects.Image;
    const n = item.anim.fotogramas.length;
    const idx = item.anim.fps > 0 ? Math.floor((ahoraMs * item.anim.fps) / 1000 + item.fase * n) % n : 0;
    if (item.aplicada === item.anim && item.fotograma === idx) return;
    const f = item.anim.fotogramas[idx];
    s.setTexture(f.textura, f.clave);
    s.setOrigin(f.ox, f.oy);
    item.aplicada = item.anim;
    item.fotograma = idx;
  }

  /** Animación de un ciudadano según su estado lógico (caminar) o su actividad parada. */
  private animacionDe(ci: Ciudadano): Animacion {
    const estado = estadoDibujo(ci);
    const ori = ci.ori as Orientacion;
    const clave = `${ci.sprite}|${estado}|${ori}`;
    let a = this.cache.get(clave);
    if (a) return a;
    const sp = this.atlas.sprites[ci.sprite];
    const nombre = sp.estados[estado] ? estado : Object.keys(sp.estados)[0];
    const est = sp.estados[nombre];
    const lista = est.orientaciones[ori] ?? est.orientaciones[Object.keys(est.orientaciones)[0] as Orientacion] ?? [];
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

  get nItems(): number { return this.items.length; }
  get nPool(): number { return this.pool.length; }

  private destruir(): void {
    this.items.length = 0;
    this.libres.length = 0;
    for (const s of this.pool) s.destroy();
    this.pool.length = 0;
  }
}
