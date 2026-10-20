// Control de la cámara con ratón y teclado (R60/R61). Presentación: lee el input de Phaser y delega en logic/camara.ts.
// Botón central = arrastrar · WASD/flechas y bordes del lienzo = desplazar · rueda = zoom entero hacia el cursor.
// Los botones izquierdo y derecho quedan libres para la selección y las órdenes (P5).
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import {
  arrastrar, desplazar, direccionBordes, limitarCentro, limitesMundo, zoomHaciaCursor,
  type Direccion, type EstadoCamara, type Limites,
} from '../logic/camara';

type Teclas = Record<'arriba' | 'abajo' | 'izq' | 'der', Phaser.Input.Keyboard.Key[]>;

export class ControlCamara {
  private estado: EstadoCamara;
  private readonly vista: { ancho: number; alto: number };
  private readonly lim: Limites;
  private readonly teclas: Teclas;
  private ratonDentro = false;
  private ultimoZoomMs = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    centro: { x: number; y: number },
    mundo: { tilesU: number; tilesV: number; alturaPx: number },
  ) {
    this.lim = limitesMundo(
      mundo.tilesU, mundo.tilesV, { ancho: tuning.pantalla.tileAncho, alto: tuning.pantalla.tileAlto },
      tuning.camara.margenLimitePx, mundo.alturaPx,
    );
    const cam = scene.cameras.main;
    this.vista = { ancho: cam.width, alto: cam.height };
    this.estado = limitarCentro({ ...centro, zoom: tuning.camara.zoomInicial }, this.vista, this.lim);

    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.teclas = {
      arriba: [kb.addKey(K.W), kb.addKey(K.UP)],
      abajo: [kb.addKey(K.S), kb.addKey(K.DOWN)],
      izq: [kb.addKey(K.A), kb.addKey(K.LEFT)],
      der: [kb.addKey(K.D), kb.addKey(K.RIGHT)],
    };

    // El botón central y el derecho no deben abrir el autoscroll ni el menú del navegador.
    scene.input.mouse?.disableContextMenu();
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.alSalir, this);
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.alRueda, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
    this.aplicar();
  }

  /** La ventana cambió de tamaño: la vista se actualiza y el centro y los límites se conservan. */
  redimensionar(ancho: number, alto: number): void {
    this.vista.ancho = ancho;
    this.vista.alto = alto;
    this.estado = limitarCentro(this.estado, this.vista, this.lim);
    this.aplicar();
  }

  /** Estado actual (copia), para exponerlo a los tests de navegador. */
  leer(): EstadoCamara {
    return { ...this.estado };
  }

  update(deltaMs: number): void {
    const dt = Math.min(deltaMs, tuning.camara.deltaMaxMs) / 1000;
    const teclado = this.direccionTeclado();
    let dir: Direccion = teclado;
    let velocidad = tuning.camara.velocidadTeclado;
    if (teclado.x === 0 && teclado.y === 0 && this.ratonDentro && !this.scene.input.activePointer.middleButtonDown()) {
      const p = this.scene.input.activePointer;
      dir = direccionBordes(p.x, p.y, this.vista, tuning.camara.margenBordePx);
      velocidad = tuning.camara.velocidadBorde;
    }
    const nuevo = desplazar(this.estado, dir, velocidad, dt, this.vista, this.lim);
    if (nuevo !== this.estado) {
      this.estado = nuevo;
      this.aplicar();
    }
  }

  private direccionTeclado(): Direccion {
    const pulsada = (ks: Phaser.Input.Keyboard.Key[]): number => (ks.some((k) => k.isDown) ? 1 : 0);
    const x = pulsada(this.teclas.der) - pulsada(this.teclas.izq);
    const y = pulsada(this.teclas.abajo) - pulsada(this.teclas.arriba);
    return { x: x as Direccion['x'], y: y as Direccion['y'] };
  }

  private alMover(p: Phaser.Input.Pointer): void {
    this.ratonDentro = true;
    if (!p.middleButtonDown()) return;
    this.estado = arrastrar(this.estado, p.x - p.prevPosition.x, p.y - p.prevPosition.y, this.vista, this.lim);
    this.aplicar();
  }

  private alSalir(): void {
    this.ratonDentro = false;
  }

  private alRueda(p: Phaser.Input.Pointer, _objetos: unknown, _dx: number, dy: number): void {
    const ahora = this.scene.time.now;
    if (dy === 0 || ahora - this.ultimoZoomMs < tuning.camara.zoomEnfriamientoMs) return;
    this.ultimoZoomMs = ahora;
    const nuevo = zoomHaciaCursor(this.estado, dy < 0 ? 1 : -1, p.x, p.y, this.vista, tuning.camara.zoomPasos, this.lim);
    if (nuevo === this.estado) return;
    this.estado = nuevo;
    this.aplicar();
  }

  /** Aplica el estado a la cámara de Phaser con el centro a píxel entero (roundPixels). */
  private aplicar(): void {
    const cam = this.scene.cameras.main;
    cam.setZoom(this.estado.zoom);
    cam.centerOn(Math.round(this.estado.x), Math.round(this.estado.y));
  }

  private destruir(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.alSalir, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_WHEEL, this.alRueda, this);
  }
}
