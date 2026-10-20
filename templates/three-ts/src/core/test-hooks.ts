// Puente entre el juego y scripts/shot.mjs.
// Las escenas registran estado legible con exponer(); shot.mjs lo lee como JSON,
// así se verifica el juego sin depender de capturas (mucho más barato en tokens).

const proveedores = new Map<string, () => unknown>();

const api = {
  listo: false,
  snapshot: (): Record<string, unknown> =>
    Object.fromEntries([...proveedores].map(([clave, leer]) => [clave, leer()])),
};

declare global {
  interface Window {
    __GAME__?: typeof api;
  }
}

if (import.meta.env.DEV) window.__GAME__ = api;

export const params = new URLSearchParams(location.search);

/** Registra un valor del juego que shot.mjs incluirá en `estado`. */
export function exponer(clave: string, leer: () => unknown): void {
  proveedores.set(clave, leer);
}

/** Avisa a shot.mjs de que la escena ya es jugable. */
export function marcarListo(): void {
  api.listo = true;
}
