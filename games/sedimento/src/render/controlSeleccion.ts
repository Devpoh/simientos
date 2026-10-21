// Control de selección y órdenes con el ratón (P5, R51, §5). Presentación: traduce el puntero de Phaser a
// tiles y eventos de `logic/seleccion.ts`. El botón izquierdo selecciona (clic, Mayús/Ctrl, caja) y el
// derecho da la orden de movimiento en formación. El botón central sigue siendo de la cámara.
import Phaser from 'phaser';
import tuning from '../data/tuning.json';
import { aRejilla } from '../logic/iso';
import {
  alCaja, alClic, alClicVacio, alDobleClic, entidadEn, podar, recuperarGrupo, seleccion,
  SIN_SELECCION, type Entidad, type Grupos, type Seleccion,
} from '../logic/seleccion';
import type { Formacion } from '../logic/formaciones';
import type { Tile } from '../logic/ocupacion';

export type { Formacion } from '../logic/formaciones';

export interface OpcionesControlSeleccion {
  /** Catálogo vivo de lo seleccionable (se reconstruye al cambiar la aldea). */
  entidades(): readonly Entidad[];
  /** Ids vivos, para podar selección y grupos. */
  vivos(): ReadonlySet<string>;
  /** Destino de una orden de movimiento (tile de rejilla). */
  alOrdenar(destino: Tile, formacion: Formacion, encadenar: boolean): void;
  /** La selección cambió: la escena repinta anillos, contador y panel. */
  alCambiar(sel: Seleccion): void;
  /** Rectángulo de caja en pantalla (para pintarlo), o `null` al soltar. */
  alCaja(x0: number, y0: number, x1: number, y1: number, activa: boolean): void;
  /** Formación activa (la elige el jugador con la interfaz; por defecto cuadro). */
  formacion(): Formacion;
}

/** Milisegundos y píxeles que hay que arrastrar sobre una unidad para considerarlo «coger» (P6) y no caja. */
const MS_COGER = tuning.seleccion.umbralArrastreMs;
const PX_COGER = tuning.seleccion.umbralArrastrePx;

export class ControlSeleccion {
  private sel: Seleccion = SIN_SELECCION;
  private readonly grupos: Grupos = new Map();
  /** Arrastre en curso. `sobreEntidad` = empezó encima de algo: no hace caja, es candidato a coger (P6). */
  private arrastre: { x0: number; y0: number; x1: number; y1: number; boton: number; entidad: Entidad | null; inicioMs: number; ultimoX: number; ultimoY: number } | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly op: OpcionesControlSeleccion) {
    const input = scene.input;
    input.mouse?.disableContextMenu();
    input.on(Phaser.Input.Events.POINTER_DOWN, this.alPulsar, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.alSoltar, this);
    input.on(Phaser.Input.Events.GAME_OUT, this.alSalir, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  /** Selección actual (copia). */
  leer(): Seleccion {
    return { ids: [...this.sel.ids] };
  }

  /** Ids seleccionados como conjunto, para pintar. */
  conjunto(): Set<string> {
    return new Set(this.sel.ids);
  }

  /** Guarda la selección en un slot (Ctrl+1…9). */
  guardarGrupo(slot: number): void {
    if (slot < 1 || slot > tuning.seleccion.slotsGrupo) return;
    if (this.sel.ids.length === 0) this.grupos.delete(slot);
    else this.grupos.set(slot, [...this.sel.ids]);
  }

  /** ¿Hay grupo en ese slot con algún miembro vivo? */
  hayGrupo(slot: number): boolean {
    const ids = this.grupos.get(slot);
    return !!ids && ids.some((id) => this.op.vivos().has(id));
  }

  /** Recupera un grupo; devuelve `true` si el slot tenía algo (aunque ya no queden vivos). */
  recuperarGrupo(slot: number): boolean {
    if (!this.grupos.has(slot)) return false;
    const sel = recuperarGrupo(this.grupos, slot, this.op.vivos());
    this.fijar(sel);
    return true;
  }

  /** Guarda la selección actual en un slot. */
  guardar(slot: number): void {
    this.guardarGrupo(slot);
  }

  /** Deja seleccionada solo una entidad (clic en una miniatura del panel). */
  solo(id: string): void {
    this.fijar(seleccion([id]));
  }

  /** Reemplaza la selección por la lista de ids dada (acciones de prueba de `shot`). */
  fijarIds(ids: readonly string[]): void {
    this.fijar(seleccion(ids));
  }

  /** Deselecciona todo (Esc). */
  limpiar(): void {
    this.fijar(SIN_SELECCION);
  }

  /** Poda las entidades que ya no existen (un ciudadano que desaparece). */
  podar(): void {
    const vivos = this.op.vivos();
    const sel = podar(this.sel, vivos);
    if (sel !== this.sel) this.fijar(sel);
  }

  /** Tile de rejilla bajo el puntero. Sin tener en cuenta la elevación: el radio de clic da la tolerancia. */
  private tileDe(p: Phaser.Input.Pointer): Tile {
    const r = aRejilla(p.worldX, p.worldY);
    return { u: Math.round(r.u), v: Math.round(r.v) };
  }

  private alPulsar(p: Phaser.Input.Pointer): void {
    const t = this.tileDe(p);
    if (p.rightButtonDown()) {
      // Botón derecho: orden de movimiento en formación. Mayús encadena puntos de ruta (P5 lo deja listo).
      const encadenar = p.event instanceof KeyboardEvent ? false : (p.event as MouseEvent | undefined)?.shiftKey === true;
      this.op.alOrdenar(t, this.op.formacion(), encadenar);
      return;
    }
    if (!p.leftButtonDown()) return;
    const entidad = entidadEn(this.op.entidades(), t.u, t.v);
    this.arrastre = {
      x0: p.x, y0: p.y, x1: p.x, y1: p.y, boton: 0, entidad, inicioMs: this.scene.time.now, ultimoX: p.x, ultimoY: p.y,
    };
  }

  private alMover(p: Phaser.Input.Pointer): void {
    const a = this.arrastre;
    if (!a) return;
    a.x1 = p.x;
    a.y1 = p.y;
    a.ultimoX = p.x;
    a.ultimoY = p.y;
    // Sobre el vacío, el arrastre dibuja la caja en cuanto se separa del punto de origen.
    if (!a.entidad && Math.hypot(a.x1 - a.x0, a.y1 - a.y0) > PX_COGER) {
      this.op.alCaja(a.x0, a.y0, a.x1, a.y1, true);
    }
  }

  private alSoltar(p: Phaser.Input.Pointer): void {
    const a = this.arrastre;
    this.arrastre = null;
    if (!a) return;
    const movido = Math.hypot(a.x1 - a.x0, a.y1 - a.y0);
    if (a.entidad) {
      // Encima de una entidad: clic (o doble clic). Arrastrar ≥ umbral es «coger» y eso es P6.
      if (p.event instanceof MouseEvent && p.event.detail >= 2) {
        this.fijar(alDobleClic(this.op.entidades(), a.entidad.id));
        return;
      }
      this.fijar(alClic(this.sel, a.entidad, { sumar: p.event instanceof MouseEvent && (p.event.shiftKey || p.event.ctrlKey) }));
      return;
    }
    if (movido > PX_COGER) {
      const mod = { sumar: p.event instanceof MouseEvent && (p.event.shiftKey || p.event.ctrlKey) };
      this.fijar(alCaja(this.sel, this.op.entidades(), a.x0, a.y0, a.x1, a.y1, mod));
      this.op.alCaja(a.x0, a.y0, a.x1, a.y1, false);
      return;
    }
    // Clic corto en el vacío.
    const suma = p.event instanceof MouseEvent && (p.event.shiftKey || p.event.ctrlKey);
    this.fijar(alClicVacio(this.sel, { sumar: suma }));
  }

  private alSalir(): void {
    if (this.arrastre && !this.arrastre.entidad) this.op.alCaja(0, 0, 0, 0, false);
    this.arrastre = null;
  }

  private fijar(sel: Seleccion): void {
    const antes = this.sel.ids;
    this.sel = sel;
    if (antes.length !== sel.ids.length || antes.some((id, i) => id !== sel.ids[i])) this.op.alCambiar(this.sel);
  }

  /** Botón izquierdo con arrastre largo sobre una entidad = coger (P6). P5 lo deja expuesto pero sin usar. */
  esCoger(): boolean {
    const a = this.arrastre;
    if (!a || !a.entidad) return false;
    return this.scene.time.now - a.inicioMs >= MS_COGER && Math.hypot(a.x1 - a.x0, a.y1 - a.y0) > PX_COGER;
  }

  /** Rectángulo de la caja en curso (coordenadas de pantalla) mientras se arrastra sobre el vacío. */
  rectanguloCaja(): { x0: number; y0: number; x1: number; y1: number } | null {
    const a = this.arrastre;
    if (!a || a.entidad) return null;
    if (Math.hypot(a.x1 - a.x0, a.y1 - a.y0) <= PX_COGER) return null;
    return { x0: a.x0, y0: a.y0, x1: a.ultimoX, y1: a.ultimoY };
  }

  private destruir(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.alPulsar, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.alSoltar, this);
    input.off(Phaser.Input.Events.GAME_OUT, this.alSalir, this);
  }
}
