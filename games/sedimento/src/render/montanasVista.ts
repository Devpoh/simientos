// Dibuja las piezas de montaña que colocó logic/montanas.ts (P2c3, R84): mismas reglas que la aldea
// (y-sort por el vértice frontal de la huella, culling propio y pool de imágenes reutilizadas).
// Presentación: aquí sí se usa Phaser; la lógica está en logic/montanas.ts.
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import type { AtlasPixel, Orientacion } from '../data/atlas';
import { centroHuella, claveOrdenEstructura } from '../logic/iso';
import type { PiezaMontana } from '../logic/montanas';

interface Item {
  pieza: PiezaMontana;
  textura: string;
  clave: string;
  ox: number;
  oy: number;
  x: number;
  y: number;
  depth: number;
  /** Caja en pantalla (px de mundo) para el culling. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sprite: Phaser.GameObjects.Image | null;
}

type Elevacion = (u: number, v: number) => number;

export class MontanasVista {
  /** Piezas dibujadas ahora mismo (las que el culling deja ver). */
  activos = 0;

  get nPiezas(): number { return this.items.length; }
  private readonly items: Item[] = [];
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly libres: Phaser.GameObjects.Image[] = [];
  private vistaX = NaN;
  private vistaY = NaN;
  private vistaZoom = NaN;
  private vistaAncho = NaN;
  private vistaAlto = NaN;

  constructor(private readonly scene: Phaser.Scene, private readonly atlas: AtlasPixel, piezas: readonly PiezaMontana[], elevacion: Elevacion) {
    for (const p of piezas) this.añadir(p, elevacion);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  private añadir(p: PiezaMontana, elevacion: Elevacion): void {
    const sp = this.atlas.sprites[p.id];
    if (!sp) return;
    const estado = sp.estados[Object.keys(sp.estados)[0]];
    const oris = estado.orientaciones;
    const claves = oris.unica ?? oris[Object.keys(oris)[0] as Orientacion] ?? [];
    const clave = claves[0];
    if (!clave) return;
    const f = this.atlas.frames[clave];
    const c = centroHuella(p.u, p.v, { w: p.w, d: p.d });
    const x = Math.round(((c.u - c.v) * this.atlas.tile.ancho) / 2);
    const y = Math.round(((c.u + c.v) * this.atlas.tile.alto) / 2 - elevacion(c.u, c.v));
    const ox = f.ancla.x / f.w;
    const oy = f.ancla.y / f.h;
    this.items.push({
      pieza: p, textura: `atlas-${f.atlas}`, clave, ox, oy, x, y,
      depth: claveOrdenEstructura(p.u, p.v, { w: p.w, d: p.d }),
      x0: x - ox * f.w, y0: y - oy * f.h, x1: x - ox * f.w + f.w, y1: y - oy * f.h + f.h,
      sprite: null,
    });
  }

  /** Recorta lo que no se ve. Solo recalcula cuando la cámara cambió. */
  actualizar(): void {
    if (this.items.length === 0) return;
    const cam = this.scene.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const mx = cam.width / (2 * cam.zoom) + tuning.aldea.margenCullingPx;
    const my = cam.height / (2 * cam.zoom) + tuning.aldea.margenCullingPx;
    const x0 = cx - mx;
    const y0 = cy - my;
    const x1 = cx + mx;
    const y1 = cy + my;
    if (cx === this.vistaX && cy === this.vistaY && cam.zoom === this.vistaZoom && cam.width === this.vistaAncho && cam.height === this.vistaAlto) return;
    this.vistaAncho = cam.width;
    this.vistaAlto = cam.height;
    this.vistaX = cx;
    this.vistaY = cy;
    this.vistaZoom = cam.zoom;
    let activos = 0;
    for (const it of this.items) {
      const visible = it.x1 >= x0 && it.x0 <= x1 && it.y1 >= y0 && it.y0 <= y1;
      if (visible && !it.sprite) {
        const s = this.coger();
        s.setTexture(it.textura, it.clave);
        s.setOrigin(it.ox, it.oy);
        s.setPosition(it.x, it.y);
        s.setDepth(it.depth);
        it.sprite = s;
      } else if (!visible && it.sprite) {
        it.sprite.setVisible(false);
        this.libres.push(it.sprite);
        it.sprite = null;
      }
      if (it.sprite) activos++;
    }
    this.activos = activos;
  }

  private coger(): Phaser.GameObjects.Image {
    let s = this.libres.pop();
    if (!s) {
      s = this.scene.add.image(0, 0, `atlas-${this.atlas.frames[Object.keys(this.atlas.frames)[0]].atlas}`);
      this.pool.push(s);
    }
    s.setVisible(true);
    return s;
  }

  private destruir(): void {
    for (const s of this.pool) s.destroy();
    this.pool.length = 0;
    this.libres.length = 0;
    this.items.length = 0;
  }
}
