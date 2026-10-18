import type { AccionesHud } from './hud';

/** Teclas del reloj: Espacio = pausa, 1/2/3 = velocidades. Devuelve la función que las quita. */
export function crearAtajosReloj(acciones: AccionesHud, cantidadVelocidades: number): () => void {
  const alPulsar = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.code === 'Space') {
      e.preventDefault();
      acciones.alternarPausa();
      return;
    }
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (m && Number(m[1]) <= cantidadVelocidades) acciones.fijarVelocidad(Number(m[1]) - 1);
  };
  window.addEventListener('keydown', alPulsar);
  return () => window.removeEventListener('keydown', alPulsar);
}
