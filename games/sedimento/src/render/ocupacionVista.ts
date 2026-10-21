// Vista de depuración F3 (P3, R50): pinta encima del mundo la ocupación real de la rejilla.
// Un color por tile según `estadoTile` (libre / bloqueada / puerta / camino) y, opcionalmente, el contorno
// de la huella de cada estructura. Presentación: aquí sí se usa Phaser.
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import { aPantalla, type Huella } from '../logic/iso';
import { BLOQUEADA, CAMINO, LIBRE, PUERTA, estadoTile, huellaGirada, type Ocupacion } from '../logic/ocupacion';
import type { Tile } from '../logic/navegacion';
const COLOR: Record<number, number> = {
  [LIBRE]: 0x2bd66a,
  [BLOQUEADA]: 0xe23b3b,
  [PUERTA]: 0x35b6ff,
  [CAMINO]: 0xf2c14e,
};
const ALFA = 0.22;
const ALFA_HUELLA = 0.35;
const COLOR_RUTA = 0xffffff;
const PROFUNDIDAD = 100000;

/** Trapecio isométrico del tile (u, v) como polígono de Phaser. */
function trapecio(u: number, v: number, t: { ancho: number; alto: number }): Phaser.Geom.Polygon {
  const arriba = aPantalla(u, v, t);
  const der = aPantalla(u + 1, v, t);
  const abajo = aPantalla(u + 1, v + 1, t);
  const izq = aPantalla(u, v + 1, t);
  return new Phaser.Geom.Polygon([arriba.x, arriba.y, der.x, der.y, abajo.x, abajo.y, izq.x, izq.y]);
}



/**
 * Capa F3. Solo se construye cuando el jugador la enciende; `redibujar()` recalcula todo de golpe
 * (es depuración: no entra en el bucle de 60 fps).
 */
export class OcupacionVista {
  readonly graficos: Phaser.GameObjects.Graphics;
  private readonly t: { ancho: number; alto: number };

  constructor(scene: Phaser.Scene) {
    this.t = { ancho: tuning.pantalla.tileAncho, alto: tuning.pantalla.tileAlto };
    this.graficos = scene.add.graphics().setDepth(PROFUNDIDAD);
  }

  /** Redibuja la ocupación entera, las huellas de las estructuras y, si se da, una ruta de ejemplo. */
  redibujar(oc: Ocupacion, elevacion: (u: number, v: number) => number, ruta?: Tile[]): void {
    const g = this.graficos;
    g.clear();
    for (let v = 0; v < oc.tilesV; v++) {
      for (let u = 0; u < oc.tilesU; u++) {
        const e = estadoTile(oc, u, v);
        const color = COLOR[e];
        // Los tiles libres no se pintan: así la capa deja ver el terreno y solo señala lo que estorba.
        if (color === undefined || e === LIBRE) continue;
        const alto = (elevacion(u, v) + elevacion(u + 1, v) + elevacion(u, v + 1) + elevacion(u + 1, v + 1)) / 4;
        g.fillStyle(color, ALFA);
        g.fillPoints(trapecio(u, v, this.t).points.map((pt) => new Phaser.Math.Vector2(pt.x, pt.y - alto)), true);
      }
    }
    for (const est of oc.estructuras.values()) {
      this.huella(est.u, est.v, huellaGirada(est.huella, est.giro), elevacion);
    }
    if (ruta) this.ruta(ruta, elevacion);
  }

  /** Pinta la ruta de ejemplo (P4): una línea por encima del terreno, tile a tile. */
  private ruta(ruta: Tile[], elevacion: (u: number, v: number) => number): void {
    const g = this.graficos;
    const pts: Phaser.Math.Vector2[] = [];
    for (const t of ruta) {
      const p = aPantalla(t.u + 0.5, t.v + 0.5, this.t);
      pts.push(new Phaser.Math.Vector2(p.x, p.y - elevacion(t.u + 0.5, t.v + 0.5) - 2));
    }
    if (pts.length < 2) return;
    g.lineStyle(2, COLOR_RUTA, 0.9);
    g.strokePoints(pts, false, false);
  }

  private huella(u: number, v: number, h: Huella, elevacion: (u: number, v: number) => number): void {
    const g = this.graficos;
    const esquinas: { u: number; v: number }[] = [
      { u, v }, { u: u + h.w, v }, { u: u + h.w, v: v + h.d }, { u, v: v + h.d },
    ];
    const pts: Phaser.Math.Vector2[] = [];
    for (const e of esquinas) {
      const p = aPantalla(e.u, e.v, this.t);
      pts.push(new Phaser.Math.Vector2(p.x, p.y - elevacion(e.u, e.v)));
    }
    g.lineStyle(1, 0xffffff, ALFA_HUELLA);
    g.strokePoints(pts, true, true);
  }

  destruir(): void {
    this.graficos.destroy();
  }
}
