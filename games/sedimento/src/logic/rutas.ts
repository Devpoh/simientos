import { Rejilla } from './hex';
import type { Mapa, Terreno } from './mapa';

// A* sobre la rejilla hexagonal. El coste de un paso depende del terreno de destino
// y del desnivel que haya que subir o bajar; la heurística usa la distancia hexagonal
// multiplicada por el coste de terreno más barato, así nunca sobreestima el coste real.

export interface ConfigMovimiento {
  costeTerreno: Record<Terreno, number | null>;
  costePorNivel: number;
}

const TERRENOS: readonly Terreno[] = ['mar', 'rio', 'lago', 'marisma', 'llanura', 'colina', 'montana'];

/** Valida y tipa la sección "movimiento" de tuning.json. */
export function configMovimiento(t: { costeTerreno: Record<string, number | null>; costePorNivel: number }): ConfigMovimiento {
  const costeTerreno = {} as Record<Terreno, number | null>;
  for (const terreno of TERRENOS) {
    const coste = t.costeTerreno[terreno];
    if (coste === undefined) throw new Error(`Falta el coste de terreno "${terreno}" en costeTerreno`);
    costeTerreno[terreno] = coste;
  }
  return { costeTerreno, costePorNivel: t.costePorNivel };
}

/** Coste de entrar en `hacia` desde `desde`, o null si `hacia` es intransitable. */
export function costePaso(mapa: Mapa, desde: number, hacia: number, cfg: ConfigMovimiento): number | null {
  const base = cfg.costeTerreno[mapa.terreno[hacia]];
  if (base === null) return null;
  const desnivel = Math.abs(mapa.nivel[hacia] - mapa.nivel[desde]);
  return base + cfg.costePorNivel * desnivel;
}

function costeMinimoTransitable(cfg: ConfigMovimiento): number {
  let minimo = Infinity;
  for (const terreno of TERRENOS) {
    const coste = cfg.costeTerreno[terreno];
    if (coste !== null && coste < minimo) minimo = coste;
  }
  return minimo;
}

/** Montículo binario mínimo por `f`, con desempate determinista por menor índice. */
class MonticuloMin {
  private datos: { i: number; f: number }[] = [];

  get tamano(): number {
    return this.datos.length;
  }

  insertar(i: number, f: number): void {
    this.datos.push({ i, f });
    this.subir(this.datos.length - 1);
  }

  extraerMin(): { i: number; f: number } | undefined {
    const datos = this.datos;
    if (datos.length === 0) return undefined;
    const min = datos[0];
    const ultimo = datos.pop() as { i: number; f: number };
    if (datos.length > 0) {
      datos[0] = ultimo;
      this.bajar(0);
    }
    return min;
  }

  private tienePrioridad(a: { i: number; f: number }, b: { i: number; f: number }): boolean {
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

function reconstruir(cameFrom: Map<number, number>, actual: number): number[] {
  const camino = [actual];
  let cur = actual;
  while (cameFrom.has(cur)) {
    cur = cameFrom.get(cur) as number;
    camino.push(cur);
  }
  camino.reverse();
  return camino;
}

/** Ruta de `origen` a `destino` (índices de hexágono, ambos incluidos), o null si no hay camino. */
export function buscarRuta(mapa: Mapa, origen: number, destino: number, cfg: ConfigMovimiento): number[] | null {
  if (origen === destino) return [origen];
  if (cfg.costeTerreno[mapa.terreno[destino]] === null) return null;

  const rejilla = new Rejilla(mapa.columnas, mapa.filas);
  const costeMinimo = costeMinimoTransitable(cfg);
  const heuristica = (i: number) => rejilla.distancia(i, destino) * costeMinimo;

  const abierto = new MonticuloMin();
  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();
  const visitado = new Set<number>();

  gScore.set(origen, 0);
  abierto.insertar(origen, heuristica(origen));

  while (abierto.tamano > 0) {
    const nodo = abierto.extraerMin() as { i: number; f: number };
    if (visitado.has(nodo.i)) continue;
    if (nodo.i === destino) return reconstruir(cameFrom, nodo.i);
    visitado.add(nodo.i);

    for (const vecino of rejilla.vecinos(nodo.i)) {
      if (visitado.has(vecino)) continue;
      const coste = costePaso(mapa, nodo.i, vecino, cfg);
      if (coste === null) continue;
      const g2 = (gScore.get(nodo.i) as number) + coste;
      if (g2 < (gScore.get(vecino) ?? Infinity)) {
        gScore.set(vecino, g2);
        cameFrom.set(vecino, nodo.i);
        abierto.insertar(vecino, g2 + heuristica(vecino));
      }
    }
  }

  return null;
}
