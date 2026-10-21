import { Rejilla } from './hex';
import { MonticuloMin } from './monticulo';
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
