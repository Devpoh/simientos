// Dibujo de la selección (P5, R51, §5): anillo elíptico bajo los pies, contador «×N» del grupo, aviso de
// destino de la orden y caja de selección dorada discontinua. Presentación: lee la lista de seleccionados y
// los pinta; nada de aquí decide qué está seleccionado (eso es logic/seleccion.ts).
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import { aPantalla, TILE } from '../logic/iso';
import type { Ciudadano } from '../logic/ciudadano';

/** Radio en píxeles de arte del anillo de una unidad. */
const RADIO_UNIDAD = 6;

/** Algo con huella que se puede resaltar (un edificio colocado). */
export interface HuellaResaltable {
  id: string;
  u: number;
  v: number;
  w: number;
  d: number;
}

export class SeleccionVista {
  private readonly anillos: Phaser.GameObjects.Graphics;
  private readonly caja: Phaser.GameObjects.Graphics;
  private readonly marcas: Phaser.GameObjects.Graphics;
  private readonly etiquetas: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.anillos = scene.add.graphics().setDepth(1e6);
    this.marcas = scene.add.graphics().setDepth(1e6 + 1);
    this.caja = scene.add.graphics().setDepth(1e6 + 2);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  /**
   * Anillos bajo las unidades seleccionadas y bajo los edificios (una elipse por su huella). El contador
   * «×N» se pinta sobre el centro del grupo cuando hay 2 o más seleccionados.
   */
  pintarSeleccion(
    ciudadanos: readonly Ciudadano[], huellas: readonly HuellaResaltable[], seleccionados: ReadonlySet<string>,
    elevacion: (u: number, v: number) => number,
  ): void {
    const g = this.anillos;
    g.clear();
    let n = 0;
    let su = 0;
    let sv = 0;
    for (const ci of ciudadanos) {
      if (!seleccionados.has(ci.id)) continue;
      n++;
      su += ci.u;
      sv += ci.v;
      const p = aPantalla(ci.u, ci.v);
      g.lineStyle(1, 0xffd27a, 0.95);
      g.strokeEllipse(p.x, Math.round(p.y - elevacion(ci.u, ci.v)), RADIO_UNIDAD * 2, RADIO_UNIDAD);
    }
    for (const h of huellas) {
      if (!seleccionados.has(h.id)) continue;
      n++;
      const cu = h.u + h.w / 2;
      const cv = h.v + h.d / 2;
      const c = aPantalla(cu, cv);
      const rx = ((h.w + h.d) * TILE.ancho) / 4;
      const ry = ((h.w + h.d) * TILE.alto) / 4;
      g.lineStyle(1, 0xffd27a, 0.95);
      g.strokeEllipse(c.x, Math.round(c.y - elevacion(cu, cv)), rx * 2, ry * 2);
    }
    const t = this.etiqueta();
    if (n < 2) { t.setVisible(false); return; }
    // El centro del contador es el de las unidades; si solo hay edificios, su media.
    const p = aPantalla(su / Math.max(n, 1), sv / Math.max(n, 1));
    t.setVisible(true);
    t.setText(`×${n}`);
    t.setPosition(Math.round(p.x), Math.round(p.y - 14));
  }

  private etiqueta(): Phaser.GameObjects.Text {
    let t = this.etiquetas[0];
    if (!t) {
      t = this.scene.add.text(0, 0, '', {
        fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: tuning.seleccion.colorAnillo,
        stroke: '#2a2016', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(1e6 + 3);
      this.etiquetas[0] = t;
    }
    return t;
  }

  /** Marcas del aviso de orden: un cuadro verde por destino repartido. */
  pintarDestinos(destinos: readonly { u: number; v: number }[], elevacion: (u: number, v: number) => number): void {
    const g = this.marcas;
    g.clear();
    for (const d of destinos) {
      const p = aPantalla(d.u, d.v);
      const y = Math.round(p.y - elevacion(d.u, d.v));
      g.lineStyle(1, 0x9fe07a, 0.9);
      g.strokeRect(p.x - 5, y - 4, 10, 8);
    }
  }

  /** Caja de selección: rectángulo dorado discontinuo animado entre dos esquinas de pantalla. */
  pintarCaja(x0: number, y0: number, x1: number, y1: number, fase: number): void {
    const g = this.caja;
    g.clear();
    const ax = Math.min(x0, x1);
    const ay = Math.min(y0, y1);
    const bx = Math.max(x0, x1);
    const by = Math.max(y0, y1);
    if (bx - ax < 2 && by - ay < 2) return;
    g.lineStyle(1, 0xffd87a, 1);
    const guion = 4;
    const paso = guion + 3;
    const desfase = Math.floor(fase / 80) % paso;
    // Bordes discontinuos: el desplazamiento por `desfase` da la animación de hormigas marchando.
    for (let x = ax - desfase; x < bx; x += paso) g.lineBetween(x, ay, Math.min(x + guion, bx), ay);
    for (let x = ax + desfase; x < bx; x += paso) g.lineBetween(x, by, Math.min(x + guion, bx), by);
    for (let y = ay - desfase; y < by; y += paso) g.lineBetween(ax, y, ax, Math.min(y + guion, by));
    for (let y = ay + desfase; y < by; y += paso) g.lineBetween(bx, y, bx, Math.min(y + guion, by));
    // Esquinas fijas, para que la caja se lea aunque esté casi vacía.
    g.lineStyle(2, 0xffd87a, 1);
    g.lineBetween(ax, ay, ax + 4, ay);
    g.lineBetween(ax, ay, ax, ay + 4);
    g.lineBetween(bx, by, bx - 4, by);
    g.lineBetween(bx, by, bx, by - 4);
  }

  limpiarCaja(): void {
    this.caja.clear();
  }

  limpiarMarcas(): void {
    this.marcas.clear();
  }

  private destruir(): void {
    this.anillos.destroy();
    this.caja.destroy();
    this.marcas.destroy();
    for (const t of this.etiquetas) t.destroy();
    this.etiquetas.length = 0;
  }
}
