// Puente entre el juego y scripts/shot.mjs.
// Las escenas registran estado legible con exponer(); shot.mjs lo lee como JSON,
// así se verifica el juego sin depender de capturas (mucho más barato en tokens).

const proveedores = new Map<string, () => unknown>();

const acciones = new Map<string, (arg?: unknown) => void>();

const api = {
  listo: false,
  /** Ejecuta una acción registrada con `exponerAccion` (p. ej. reiniciar las medidas antes de un bench). */
  accion: (clave: string, arg?: unknown): void => acciones.get(clave)?.(arg),
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

/** Registra una acción que los scripts de navegador pueden lanzar con `__GAME__.accion(clave)`. */
export function exponerAccion(clave: string, hacer: (arg?: unknown) => void): void {
  acciones.set(clave, hacer);
}

/** Avisa a shot.mjs de que la escena ya es jugable. */
export function marcarListo(): void {
  api.listo = true;
}
