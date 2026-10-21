// Humo dibujado (R87, D037): un pool de imágenes que se reutilizan. Nada se crea ni se destruye por fotograma:
// logic/humo.ts dice dónde y en qué fotograma va cada bocanada, y aquí solo se colocan.
// El humo sube de verdad: cada bocanada es una partícula que asciende con deriva y se recicla al llegar arriba.
import Phaser from 'phaser';
import type { AtlasPixel } from '../data/atlas';
import { avanzarHumo, crearHumo, crearPostura, posturas, type Bocanada, type FocoHumo, type PosturaBocanada } from '../logic/humo';

/** Profundidad: por encima del terreno, el agua y la aldea; el humo va al cielo. */
export const PROFUNDIDAD_HUMO = 1e6 - 1;
/** Un pelo de más para que las bocanadas jóvenes se dibujen delante de las que ya se deshacen. */
const PASO_PROFUNDIDAD = 1e-3;
/** Niveles de profundidad del humo: cambiar `depth` reordena la lista de dibujo, así que se cuantiza. */
const N_TRAMOS = 8;

export class HumoVista {
  private readonly bocanadas: Bocanada[] = [];
  private readonly postura: PosturaBocanada[] = [];
  private readonly imagenes: Phaser.GameObjects.Image[] = [];
  /** Última clave de textura y último fotograma puestos, para no tocar la textura si no cambia. */
  private readonly ultima: string[] = [];
  private readonly ultimoFotograma: number[] = [];
  /** Último tramo de profundidad puesto, para no reordenar la lista de dibujo cada fotograma. */
  private readonly ultimoTramo: number[] = [];
  private readonly claves = new Map<string, string>();
  private readonly textura: string;
  private readonly ox: number;
  private readonly oy: number;

  constructor(private readonly scene: Phaser.Scene, atlas: AtlasPixel) {
    for (const id of ['ambiente_humo', 'ambiente_humo_fuego']) {
      const sp = atlas.sprites[id];
      const estado = sp.estados[Object.keys(sp.estados)[0]];
      const lista = estado.orientaciones.unica ?? [];
      lista.forEach((c, i) => this.claves.set(`${id}|${i}`, c));
    }
    const marco = atlas.frames[this.claves.get('ambiente_humo|0') as string];
    this.textura = `atlas-${marco.atlas}`;
    this.ox = marco.ancla.x / marco.w;
    this.oy = marco.ancla.y / marco.h;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  get nBocanadas(): number { return this.bocanadas.length; }
  get nVisibles(): number { return this.imagenes.length; }

  /** Cuánto ha subido de media el humo (0..1), para comprobar que se mueve desde `shot`. */
  get subidaMedia(): number {
    if (this.bocanadas.length === 0) return 0;
    let s = 0;
    for (const b of this.bocanadas) s += b.vida;
    return Math.round((s / this.bocanadas.length) * 1000) / 1000;
  }

  /** Enciende el humo de estos focos. El array de bocanadas no crece ni mengua después: cada foco recicla la suya. */
  enfocar(focos: readonly FocoHumo[]): void {
    const nuevas = crearHumo(focos);
    while (this.imagenes.length < nuevas.length) {
      this.imagenes.push(
        this.scene.add.image(0, 0, this.textura).setOrigin(this.ox, this.oy).setDepth(PROFUNDIDAD_HUMO).setVisible(false),
      );
    }
    this.bocanadas.length = 0;
    this.postura.length = 0;
    for (const b of nuevas) {
      this.bocanadas.push(b);
      this.postura.push(crearPostura());
    }
    for (let i = 0; i < this.imagenes.length; i++) this.imagenes[i].setVisible(i < nuevas.length);
    // Fuerza a repintar texturas y fotogramas en el primer `actualizar` tras un cambio de focos.
    this.ultimoFotograma.length = 0;
    this.ultima.length = 0;
    this.ultimoTramo.length = 0;
  }

  /** Avanza la simulación y coloca cada bocanada. Cero asignaciones en el bucle. */
  actualizar(dt: number): void {
    if (this.bocanadas.length === 0) return;
    avanzarHumo(this.bocanadas, dt / 1000);
    posturas(this.bocanadas, this.postura);
    for (let i = 0; i < this.bocanadas.length; i++) {
      const b = this.bocanadas[i];
      const p = this.postura[i];
      const img = this.imagenes[i];
      img.setPosition(Math.round(p.x), Math.round(p.y));
      // La textura solo se toca cuando cambia el fotograma: 84 imágenes a 60 fps con `setTexture` a lo tonto se notan.
      if (this.ultimoFotograma[i] !== p.fotograma || this.ultima[i] === undefined) {
        const fuego = b.fuego ? 'ambiente_humo_fuego' : 'ambiente_humo';
        img.setTexture(this.claves.get(`${fuego}|${p.fotograma}`) as string);
        this.ultimoFotograma[i] = p.fotograma;
        this.ultima[i] = fuego;
      }
      // Profundidad cuantizada: cambiar `depth` reordena toda la lista de dibujo, así que solo se toca
      // cuando el humo cruza de tramo. Más joven = delante, para que tape a la bocanada que ya se deshace.
      const tramo = Math.min(N_TRAMOS, Math.floor((1 - b.vida) * N_TRAMOS));
      if (this.ultimoTramo[i] !== tramo) {
        img.setDepth(PROFUNDIDAD_HUMO + tramo * PASO_PROFUNDIDAD);
        this.ultimoTramo[i] = tramo;
      }
    }
  }

  private destruir(): void {
    for (const s of this.imagenes) s.destroy();
    this.imagenes.length = 0;
    this.bocanadas.length = 0;
    this.postura.length = 0;
  }
}
