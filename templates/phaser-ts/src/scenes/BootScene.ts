import Phaser from 'phaser';
import { params } from '../core/test-hooks';

/** Carga/genera assets y salta a la escena pedida (?escena=Game) o a la primera jugable. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Placeholders generados por código: sin assets externos hasta que el juego los necesite.
    const g = this.make.graphics({}, false);
    g.fillStyle(0x7c6cff).fillRect(0, 0, 32, 32).generateTexture('jugador', 32, 32);
    g.clear().fillStyle(0xffd34e).fillCircle(8, 8, 8).generateTexture('moneda', 16, 16);
    g.destroy();
  }

  create(): void {
    this.scene.start(params.get('escena') ?? 'Game');
  }
}
