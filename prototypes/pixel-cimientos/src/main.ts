import { exponer, marcarListo, params } from './core/test-hooks';
import { Lienzo } from './lienzo';
import { ALTO_MUNDO, ANCHO_MUNDO, crearMundo } from './mundo';
import { pintarMundo } from './pintor';
import { Vida } from './vida';

// Prototipo de pixel art (R44/R45): vista cenital 3/4, terreno continuo y cámara libre.
// El mundo se pinta una vez a resolución nativa y la pantalla muestra una ventana escalada ×N (entero).

/** El agua y la gente se animan a este ritmo: el pixel art luce mejor a pocos fotogramas. */
const FPS_ANIMACION = 15;
const VELOCIDAD_CAMARA = 260; // px del mundo por segundo

const lienzo = document.getElementById('juego') as HTMLCanvasElement;
const ctx = lienzo.getContext('2d')!;
const aviso = document.getElementById('aviso')!;

let zoom = Number(params.get('zoom')) || (innerWidth >= 1500 ? 3 : 2);
let camX = 0;
let camY = 0;
let fotograma = new Lienzo(1, 1);
const interno = document.createElement('canvas');
const ctxInterno = interno.getContext('2d')!;

function tamVista() {
  return { vw: Math.min(ANCHO_MUNDO, Math.ceil(innerWidth / zoom)), vh: Math.min(ALTO_MUNDO, Math.ceil(innerHeight / zoom)) };
}
function limitar() {
  const { vw, vh } = tamVista();
  camX = Math.max(0, Math.min(ANCHO_MUNDO - vw, camX));
  camY = Math.max(0, Math.min(ALTO_MUNDO - vh, camY));
}
function ajustar() {
  lienzo.width = innerWidth;
  lienzo.height = innerHeight;
  const { vw, vh } = tamVista();
  if (fotograma.ancho !== vw || fotograma.alto !== vh) {
    fotograma = new Lienzo(vw, vh);
    interno.width = vw;
    interno.height = vh;
  }
  limitar();
}
function centrarEn(x: number, y: number) {
  const { vw, vh } = tamVista();
  camX = x - vw / 2;
  camY = y - vh / 2;
  limitar();
}

// Se genera tras pintar el aviso de «generando», para que la pantalla no quede en blanco.
setTimeout(() => {
  const t0 = performance.now();
  const mundo = crearMundo();
  const capas = pintarMundo(mundo);
  const msGenerar = Math.round(performance.now() - t0);
  const vida = new Vida(mundo, capas);
  aviso.textContent = 'CIMIENTOS · prototipo pixel art — WASD/flechas o arrastrar: mover · rueda: zoom';
  ajustar();
  const foco = params.get('foco')?.split(',').map(Number);
  if (foco && foco.length === 2) centrarEn(foco[0], foco[1]);
  else centrarEn(mundo.centro[0], mundo.centro[1] + 40);
  addEventListener('resize', ajustar);

  const teclas = new Set<string>();
  addEventListener('keydown', (e) => teclas.add(e.code));
  addEventListener('keyup', (e) => teclas.delete(e.code));
  lienzo.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const { vw, vh } = tamVista();
      const cx = camX + vw / 2;
      const cy = camY + vh / 2;
      zoom = Math.max(1, Math.min(6, zoom + (e.deltaY < 0 ? 1 : -1)));
      ajustar();
      centrarEn(cx, cy);
    },
    { passive: false },
  );
  let arrastre: { x: number; y: number; cx: number; cy: number } | null = null;
  lienzo.addEventListener('pointerdown', (e) => (arrastre = { x: e.clientX, y: e.clientY, cx: camX, cy: camY }));
  addEventListener('pointerup', () => (arrastre = null));
  addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    camX = arrastre.cx - (e.clientX - arrastre.x) / zoom;
    camY = arrastre.cy - (e.clientY - arrastre.y) / zoom;
    limitar();
  });

  let ultimo = performance.now();
  let acumulado = 0;
  let fotogramas = 0;
  let ultimaCam = '';
  const bucle = (ahora: number) => {
    const dt = Math.min(0.1, (ahora - ultimo) / 1000);
    ultimo = ahora;
    let mx = 0;
    let my = 0;
    if (teclas.has('KeyA') || teclas.has('ArrowLeft')) mx -= 1;
    if (teclas.has('KeyD') || teclas.has('ArrowRight')) mx += 1;
    if (teclas.has('KeyW') || teclas.has('ArrowUp')) my -= 1;
    if (teclas.has('KeyS') || teclas.has('ArrowDown')) my += 1;
    if (mx || my) {
      const l = Math.hypot(mx, my);
      camX += (mx / l) * VELOCIDAD_CAMARA * dt;
      camY += (my / l) * VELOCIDAD_CAMARA * dt;
      limitar();
    }
    acumulado += dt;
    const cx = Math.round(camX);
    const cy = Math.round(camY);
    const clave = `${cx},${cy},${fotograma.ancho}`;
    if (acumulado >= 1 / FPS_ANIMACION || clave !== ultimaCam || fotogramas === 0) {
      if (acumulado >= 1 / FPS_ANIMACION) {
        vida.actualizar(acumulado);
        acumulado = 0;
      }
      vida.pintar(fotograma, cx, cy);
      ctxInterno.putImageData(fotograma.datos, 0, 0);
      ultimaCam = clave;
      fotogramas++;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#123a63';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(interno, 0, 0, fotograma.ancho * zoom, fotograma.alto * zoom);
    if (fotogramas === 1) marcarListo();
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);

  exponer('pixel', () => ({ mundo: [ANCHO_MUNDO, ALTO_MUNDO], vista: [fotograma.ancho, fotograma.alto], zoom, cam: [Math.round(camX), Math.round(camY)], msGenerar, objetos: mundo.objetos.length, ...vida.resumen, fotogramas }));
}, 30);
