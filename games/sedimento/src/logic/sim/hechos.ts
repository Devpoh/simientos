import type { EstadoSim, Hecho } from './tipos';

/** Registra un hecho y devuelve su id. Conserva solo los `max` más recientes. */
export function registrar(estado: EstadoSim, max: number, h: Omit<Hecho, 'id' | 'dia'>): number {
  const id = estado.siguienteHecho++;
  estado.hechos.push({ id, dia: estado.dia, ...h });
  if (estado.hechos.length > max) estado.hechos.splice(0, estado.hechos.length - max);
  return id;
}

/** Registra un hecho «de estado» y lo recuerda como el último de su tipo, para enlazarlo como causa. */
export function registrarEstado(estado: EstadoSim, max: number, h: Omit<Hecho, 'id' | 'dia'>): number {
  const id = registrar(estado, max, h);
  estado.ultimoHecho[h.tipo] = id;
  return id;
}

export function buscarHecho(estado: EstadoSim, id: number): Hecho | undefined {
  return estado.hechos.find((h) => h.id === id);
}
