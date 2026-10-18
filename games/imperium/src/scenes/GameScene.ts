import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import { exponer, marcarListo } from '../core/test-hooks';
import { puntuacionInicial, recoger, type Puntuacion } from '../logic/puntuacion';

/** Demo de la plantilla: mover al jugador y recoger monedas. Bórrala al empezar tu juego. */
export class GameScene extends Phaser.Scene {
  private jugador!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private monedas!: Phaser.Physics.Arcade.StaticGroup;
  private teclas!: Record<'arriba' | 'abajo' | 'izq' | 'der', Phaser.Input.Keyboard.Key[]>;
  private texto!: Phaser.GameObjects.Text;
  private puntuacion: Puntuacion = puntuacionInicial();

  constructor() {
    super('Game');
  }

  init(): void {
    // El estado por partida se reinicia aquí: Phaser reutiliza la instancia de la escena.
    this.puntuacion = puntuacionInicial();
  }

  create(): void {
    const { width, height } = this.scale;
    this.jugador = this.physics.add.image(width / 2, height / 2, 'jugador').setCollideWorldBounds(true);
    this.jugador.setDisplaySize(tuning.jugador.tamano, tuning.jugador.tamano);

    this.monedas = this.physics.add.staticGroup();
    for (let i = 0; i < tuning.moneda.cantidadInicial; i++) this.soltarMoneda();
    this.physics.add.overlap(this.jugador, this.monedas, (_j, m) => this.recogerMoneda(m as Phaser.Physics.Arcade.Image));

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.teclas = {
      arriba: [kb.addKey(K.UP), kb.addKey(K.W)],
      abajo: [kb.addKey(K.DOWN), kb.addKey(K.S)],
      izq: [kb.addKey(K.LEFT), kb.addKey(K.A)],
      der: [kb.addKey(K.RIGHT), kb.addKey(K.D)],
    };

    this.texto = this.add.text(16, 12, '', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' });
    this.actualizarTexto();

    exponer('jugador', () => ({ x: Math.round(this.jugador.x), y: Math.round(this.jugador.y) }));
    exponer('puntuacion', () => this.puntuacion);
    exponer('monedas', () => this.monedas.countActive());
    this.events.once(Phaser.Scenes.Events.UPDATE, marcarListo);
  }

  update(): void {
    const pulsada = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((k) => k.isDown);
    const dir = new Phaser.Math.Vector2(
      Number(pulsada(this.teclas.der)) - Number(pulsada(this.teclas.izq)),
      Number(pulsada(this.teclas.abajo)) - Number(pulsada(this.teclas.arriba)),
    ).normalize();
    // Arcade Physics integra la velocidad con delta: el movimiento no depende de los FPS.
    this.jugador.setVelocity(dir.x * tuning.jugador.velocidad, dir.y * tuning.jugador.velocidad);
  }

  private soltarMoneda(): void {
    const { width, height } = this.scale;
    const m = this.monedas.create(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(60, height - 40), 'moneda') as Phaser.Physics.Arcade.Image;
    m.setDisplaySize(tuning.moneda.tamano, tuning.moneda.tamano).refreshBody();
  }

  private recogerMoneda(m: Phaser.Physics.Arcade.Image): void {
    m.destroy();
    this.puntuacion = recoger(this.puntuacion, tuning.puntuacion);
    this.actualizarTexto();
    this.soltarMoneda();
  }

  private actualizarTexto(): void {
    this.texto.setText(`Puntos ${this.puntuacion.puntos}   Racha x${this.puntuacion.racha}`);
  }
}
