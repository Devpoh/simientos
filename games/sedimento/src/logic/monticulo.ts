// Montículo binario mínimo por `f`, con desempate determinista por menor índice.
// Lo comparten los dos A* del juego (terreno hexagonal en `rutas.ts` y rejilla de ocupación en
// `navegacion.ts`): el desempate por índice es lo que hace que la ruta sea siempre la misma
// para los mismos datos, y eso es lo que exige el y-sort determinista de §4.

export interface NodoMonticulo {
  i: number;
  f: number;
}

export class MonticuloMin {
  private datos: NodoMonticulo[] = [];

  get tamano(): number {
    return this.datos.length;
  }

  insertar(i: number, f: number): void {
    this.datos.push({ i, f });
    this.subir(this.datos.length - 1);
  }

  extraerMin(): NodoMonticulo | undefined {
    const datos = this.datos;
    if (datos.length === 0) return undefined;
    const min = datos[0];
    const ultimo = datos.pop() as NodoMonticulo;
    if (datos.length > 0) {
      datos[0] = ultimo;
      this.bajar(0);
    }
    return min;
  }

  private tienePrioridad(a: NodoMonticulo, b: NodoMonticulo): boolean {
    return a.f !== b.f ? a.f < b.f : a.i < b.i;
  }

  private subir(idx: number): void {
    const datos = this.datos;
    while (idx > 0) {
      const padre = (idx - 1) >> 1;
      if (!this.tienePrioridad(datos[idx], datos[padre])) break;
      [datos[idx], datos[padre]] = [datos[padre], datos[idx]];
      idx = padre;
    }
  }

  private bajar(idx: number): void {
    const datos = this.datos;
    const n = datos.length;
    while (true) {
      const izq = idx * 2 + 1;
      const der = idx * 2 + 2;
      let mejor = idx;
      if (izq < n && this.tienePrioridad(datos[izq], datos[mejor])) mejor = izq;
      if (der < n && this.tienePrioridad(datos[der], datos[mejor])) mejor = der;
      if (mejor === idx) break;
      [datos[idx], datos[mejor]] = [datos[mejor], datos[idx]];
      idx = mejor;
    }
  }
}
