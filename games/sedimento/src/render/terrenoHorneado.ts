// Dibuja el terreno horneado como trozos de textura (R59): se crean una vez al cargar; Phaser solo pinta los visibles.
import Phaser from 'phaser';
import { COLORES } from '../data/paleta';
import { trocear, VACIO, type ImagenIndices } from '../logic/horneado';

const RGB = COLORES.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const);

/** Crea un trozo de textura por cada `lado`×`lado` px de la imagen y lo coloca en el mundo bajo todo lo demás. */
export function crearTrozos(scene: Phaser.Scene, img: ImagenIndices, lado: number): Phaser.GameObjects.Image[] {
  const objetos: Phaser.GameObjects.Image[] = [];
  trocear(img.ancho, img.alto, lado).forEach((t, n) => {
    const clave = `terreno-${n}`;
    if (scene.textures.exists(clave)) scene.textures.remove(clave);
    const textura = scene.textures.createCanvas(clave, t.ancho, t.alto);
    if (!textura) throw new Error(`no se pudo crear la textura ${clave}`);
    const ctx = textura.getContext();
    const datos = ctx.createImageData(t.ancho, t.alto);
    let vacio = true;
    for (let y = 0; y < t.alto; y++) {
      for (let x = 0; x < t.ancho; x++) {
        const idx = img.datos[(t.y + y) * img.ancho + t.x + x];
        if (idx === VACIO) continue;
        vacio = false;
        const o = (y * t.ancho + x) * 4;
        const c = RGB[idx];
        datos.data[o] = c[0];
        datos.data[o + 1] = c[1];
        datos.data[o + 2] = c[2];
        datos.data[o + 3] = 255;
      }
    }
    if (vacio) { scene.textures.remove(clave); return; }
    ctx.putImageData(datos, 0, 0);
    textura.refresh();
    objetos.push(scene.add.image(img.origenX + t.x, img.origenY + t.y, clave).setOrigin(0, 0).setDepth(-1e6));
  });
  return objetos;
}
