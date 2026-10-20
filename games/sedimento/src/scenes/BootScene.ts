import Phaser from 'phaser';
import { params } from '../core/test-hooks';
import { validarAtlas, type AtlasPixel } from '../data/atlas';
import { CLAVE_REGISTRO_ATLAS, registrarFotogramas } from '../render/sprites';

const RUTA = 'recursos/pixel/';

/** Carga el atlas de pixel art (JSON + imágenes), registra sus fotogramas y salta a la escena pedida. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.json('atlas', `${RUTA}atlas.json`);
    // Las imágenes se piden cuando se conoce la lista del JSON.
    this.load.once('filecomplete-json-atlas', (_clave: string, _tipo: string, datos: AtlasPixel) => {
      datos.atlas.forEach((a, n) => this.load.image(`atlas-${n}`, `${RUTA}${a.imagen}`));
    });
  }

  create(): void {
    const atlas = this.cache.json.get('atlas') as AtlasPixel;
    const errores = validarAtlas(atlas);
    if (errores.length > 0) throw new Error(`atlas.json inválido:\n${errores.slice(0, 10).join('\n')}`);
    registrarFotogramas(this, atlas);
    this.registry.set(CLAVE_REGISTRO_ATLAS, atlas);
    this.scene.start(params.get('escena') ?? 'Mundo');
  }
}
