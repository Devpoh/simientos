// Arranque provisional tras retirar el render 3D (P0). En P2 se sustituye por el juego en Phaser 4.
import { exponer, marcarListo } from './core/test-hooks';

const raiz = document.getElementById('juego');
if (raiz) raiz.textContent = 'CIMIENTOS — pasando a pixel art 2D (P2 monta Phaser 4)';

exponer('fase', () => 'P0');
marcarListo();
