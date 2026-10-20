import Phaser from 'phaser';
import tuning from './data/tuning.json';
import { medidor } from './core/metricas';
import { pantallaCompleta, type PantallaCompleta } from './logic/pantalla';
import { BootScene } from './scenes/BootScene';
import { MundoScene } from './scenes/MundoScene';

// Pantalla completa con píxel entero (R83): el lienzo llena la ventana; cada píxel de arte son k píxeles físicos exactos.
const medirVentana = (): PantallaCompleta =>
  pantallaCompleta({ ancho: window.innerWidth, alto: window.innerHeight }, window.devicePixelRatio, tuning.pantalla.alto);
const inicial = medirVentana();

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: inicial.ancho,
  height: inicial.alto,
  backgroundColor: tuning.mundo.colorFondo,
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, zoom: inicial.zoom, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [BootScene, MundoScene],
});

window.addEventListener('resize', () => {
  const p = medirVentana();
  // Primero el tamaño y después el zoom: con zoom 1 `resize` no restila el lienzo, `setZoom` sí.
  juego.scale.resize(p.ancho, p.alto);
  juego.scale.setZoom(p.zoom);
});

// Tiempo real entre fotogramas (lo que ve el jugador), medido tras cada render.
let anterior = 0;
juego.events.on(Phaser.Core.Events.POST_RENDER, () => {
  const ahora = performance.now();
  if (anterior > 0) medidor.registrar(ahora - anterior);
  anterior = ahora;
});
