// Medidor de tiempo de fotograma (R56: ≥ 60 fps). Anillo de tamaño fijo y sin asignaciones por fotograma.
// Lógica pura: quien lo alimenta (la escena o el motor) le pasa los milisegundos de cada fotograma.

export class MedidorFotogramas {
  private readonly anillo: Float32Array;
  private readonly orden: Float32Array;
  private n = 0;
  private cabeza = 0;
  private maxHistorico = 0;
  private total = 0;
  private lentos = 0;
  private sumaMs = 0;

  /** `umbralLentoMs`: un fotograma que tarda más cuenta como perdido (D034). */
  constructor(capacidad: number, private readonly umbralLentoMs = Infinity) {
    this.anillo = new Float32Array(capacidad);
    this.orden = new Float32Array(capacidad);
  }

  registrar(ms: number): void {
    this.anillo[this.cabeza] = ms;
    this.cabeza = (this.cabeza + 1) % this.anillo.length;
    if (this.n < this.anillo.length) this.n++;
    if (ms > this.maxHistorico) this.maxHistorico = ms;
    this.total++;
    this.sumaMs += ms;
    if (ms > this.umbralLentoMs) this.lentos++;
  }

  /** Fotogramas perdidos (más lentos que el umbral) desde el arranque o el último `reiniciar`. */
  get perdidos(): number {
    return this.lentos;
  }

  /** Fps medio desde el arranque o el último `reiniciar` (no solo la ventana). */
  fpsMedio(): number {
    return this.sumaMs > 0 ? (1000 * this.total) / this.sumaMs : 0;
  }

  /** Fotogramas medidos en total desde el arranque. */
  get fotogramas(): number {
    return this.total;
  }

  /** Percentil 95 de la ventana (0 si no hay datos). */
  p95(): number {
    if (this.n === 0) return 0;
    const v = this.orden.subarray(0, this.n);
    v.set(this.anillo.subarray(0, this.n));
    v.sort();
    return v[Math.min(this.n - 1, Math.ceil(this.n * 0.95) - 1)];
  }

  /** Máximo de la ventana. */
  max(): number {
    let m = 0;
    for (let i = 0; i < this.n; i++) if (this.anillo[i] > m) m = this.anillo[i];
    return m;
  }

  /** Máximo desde el arranque (o desde el último `reiniciar`). */
  maxTotal(): number {
    return this.maxHistorico;
  }

  /** Fotogramas por segundo según la media de la ventana. */
  fps(): number {
    if (this.n === 0) return 0;
    let s = 0;
    for (let i = 0; i < this.n; i++) s += this.anillo[i];
    return s > 0 ? (1000 * this.n) / s : 0;
  }

  reiniciar(): void {
    this.n = 0;
    this.cabeza = 0;
    this.maxHistorico = 0;
    this.total = 0;
    this.lentos = 0;
    this.sumaMs = 0;
  }
}
