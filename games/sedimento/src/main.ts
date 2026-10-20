import Phaser from 'phaser';
import tuning from './data/tuning.json';
import { medidor } from './core/metricas';
import { escalaEntera } from './logic/pantalla';
import { BootScene } from './scenes/BootScene';
import { MundoScene } from './scenes/MundoScene';

const base = { ancho: tuning.pantalla.ancho, alto: tuning.pantalla.alto };
const zoomVentana = (): number => escalaEntera({ ancho: window.innerWidth, alto: window.innerHeight }, base);

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: base.ancho,
  height: base.alto,
  backgroundColor: tuning.mundo.colorFondo,
  pixelArt: true,
  roundPixels: true,
  // Escalado solo por enteros: el zoom del ScaleManager se recalcula al cambiar la ventana.
  scale: { mode: Phaser.Scale.NONE, zoom: zoomVentana(), autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MundoScene],
});

window.addEventListener('resize', () => juego.scale.setZoom(zoomVentana()));

// Tiempo real entre fotogramas (lo que ve el jugador), medido tras cada render.
let anterior = 0;
juego.events.on(Phaser.Core.Events.POST_RENDER, () => {
  const ahora = performance.now();
  if (anterior > 0) medidor.registrar(ahora - anterior);
  anterior = ahora;
});
