// Agua viva (R65, R87, §13): el agua animada se hornea UNA vez en 4 texturas por trozo y luego solo se cambia
// la textura que toca por reloj. En el bucle no se calcula ni un píxel: 12 trozos × 1 setTexture cada 190 ms.
// Va justo encima del terreno y por debajo de todo lo demás; el terreno base ya trae el agua quieta, así que
// si esta capa fallara el mapa seguiría viéndose bien.
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import { COLORES } from '../data/paleta';
import { trocear, VACIO, type ImagenIndices } from '../logic/horneado';
import { mapaAguaDe, N_FASES_AGUA, pintarAgua, type MapaAgua } from '../logic/aguaAnim';

const RGB = COLORES.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const);

/** Profundidad de la capa: justo por encima del terreno horneado (−1e6) y por debajo de todo lo demás. */
export const PROFUNDIDAD_AGUA = -1e6 + 1;

export class AguaVista {
  private readonly imagenes: Phaser.GameObjects.Image[] = [];
  /** claves[fotograma][trozo]: las 4 texturas de cada trozo con agua. */
  private readonly claves: string[][] = [];
  private fotograma = -1;

  constructor(
    private readonly scene: Phaser.Scene, img: ImagenIndices, lado: number, semilla: number,
  ) {
    const mapa = mapaAguaDe(img);
    if (!mapa || mapa.indices.length === 0) return;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());

    // Un trozo solo entra si tiene algún píxel de agua; los demás no gastan textura.
    const trozos = trocear(img.ancho, img.alto, lado).filter((t) => this.tieneAgua(mapa, img.ancho, t.x, t.y, t.ancho, t.alto));
    if (trozos.length === 0) return;

    const lienzo = new Uint8Array(img.datos.length);
    for (let f = 0; f < N_FASES_AGUA; f++) {
      pintarAgua(lienzo, img.datos, mapa, semilla, f);
      const clavesFase: string[] = [];
      trozos.forEach((t, n) => {
        const clave = `agua-${f}-${n}`;
        if (this.scene.textures.exists(clave)) this.scene.textures.remove(clave);
        const textura = this.scene.textures.createCanvas(clave, t.ancho, t.alto);
        if (!textura) throw new Error(`no se pudo crear la textura ${clave}`);
        const ctx = textura.getContext();
        const datos = ctx.createImageData(t.ancho, t.alto);
        for (let y = 0; y < t.alto; y++) {
          for (let x = 0; x < t.ancho; x++) {
            const idx = lienzo[(t.y + y) * img.ancho + t.x + x];
            if (idx === VACIO) continue;
            const o = (y * t.ancho + x) * 4;
            const c = RGB[idx];
            datos.data[o] = c[0];
            datos.data[o + 1] = c[1];
            datos.data[o + 2] = c[2];
            datos.data[o + 3] = 255;
          }
        }
        ctx.putImageData(datos, 0, 0);
        textura.refresh();
        clavesFase.push(clave);
      });
      this.claves.push(clavesFase);
    }

    trozos.forEach((t, n) => {
      this.imagenes.push(
        this.scene.add.image(img.origenX + t.x, img.origenY + t.y, this.claves[0][n])
          .setOrigin(0, 0).setDepth(PROFUNDIDAD_AGUA),
      );
    });
    this.fotograma = 0;
  }

  get nTrozos(): number { return this.imagenes.length; }

  /** Fotograma que se está mostrando (0..3), para comprobarlo desde `shot`. */
  get fotogramaActual(): number { return this.fotograma; }

  /** Cambia la textura de los trozos con agua si ha pasado el tiempo de un fotograma. Nada más. */
  actualizar(ahoraMs: number): void {
    if (this.imagenes.length === 0) return;
    const f = Math.floor(ahoraMs / tuning.agua.msPorFotograma) % N_FASES_AGUA;
    if (f === this.fotograma) return;
    this.fotograma = f;
    const fase = this.claves[f];
    for (let i = 0; i < this.imagenes.length; i++) this.imagenes[i].setTexture(fase[i]);
  }

  private tieneAgua(mapa: MapaAgua, ancho: number, x0: number, y0: number, w: number, h: number): boolean {
    for (let y = y0; y < y0 + h; y++) {
      const base = y * ancho;
      for (let x = x0; x < x0 + w; x++) if (mapa.agua[base + x] !== 0) return true;
    }
    return false;
  }

  private destruir(): void {
    for (const claves of this.claves) for (const c of claves) if (this.scene.textures.exists(c)) this.scene.textures.remove(c);
    this.imagenes.length = 0;
    this.claves.length = 0;
  }
}
