// Panel de depuración (F2): fps, p95 y máximo de fotograma, sprites y escala. DOM, fuera del lienzo.
import tuning from '../data/tuning.json';
import { medidor } from '../core/metricas';

export class PanelRendimiento {
  private readonly el: HTMLPreElement;
  private temporizador = 0;
  private visible = false;
  private readonly alPulsar = (e: KeyboardEvent): void => {
    if (e.code !== 'F2') return;
    e.preventDefault();
    this.alternar();
  };

  constructor(private readonly leerExtra: () => { sprites: number; escala: number }) {
    this.el = document.createElement('pre');
    this.el.id = 'panel-rendimiento';
    this.el.style.cssText =
      'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;display:none;z-index:10;pointer-events:none;' +
      'font:12px/1.4 monospace;color:#e8dfca;background:rgba(10,23,54,.85);border:1px solid #6c6b82';
    document.body.appendChild(this.el);
    window.addEventListener('keydown', this.alPulsar);
  }

  private alternar(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
    window.clearInterval(this.temporizador);
    if (this.visible) {
      this.pintar();
      this.temporizador = window.setInterval(() => this.pintar(), tuning.rendimiento.refrescoPanelMs);
    }
  }

  private pintar(): void {
    const p95 = medidor.p95();
    const ok = p95 <= tuning.rendimiento.presupuestoP95Ms && medidor.max() <= tuning.rendimiento.limiteMaxMs;
    const x = this.leerExtra();
    this.el.textContent =
      `fps ${medidor.fps().toFixed(0)}  ${ok ? 'OK' : 'LENTO'}\n` +
      `p95 ${p95.toFixed(1)} ms   max ${medidor.max().toFixed(1)} ms\n` +
      `sprites ${x.sprites}   escala x${x.escala}`;
  }

  destruir(): void {
    window.clearInterval(this.temporizador);
    window.removeEventListener('keydown', this.alPulsar);
    this.el.remove();
  }
}
