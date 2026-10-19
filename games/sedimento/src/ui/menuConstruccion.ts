import type { ConfigSim, TipoEdificio } from '../logic/sim/tipos';

// Barra de construcción (abajo, al centro) y aviso del motivo junto al cursor. Solo emite eventos:
// nunca toca la simulación.

export interface AccionesMenu {
  elegir(tipo: TipoEdificio): void;
}

export interface MenuConstruccion {
  /** Resalta el botón del edificio activo (null = ninguno). */
  marcar(tipo: TipoEdificio | null): void;
  /** Muestra el motivo de rechazo junto al cursor (null lo oculta). */
  motivo(texto: string | null, x: number, y: number): void;
  liberar(): void;
}

const NOMBRE: Record<TipoEdificio, string> = {
  choza: 'Choza',
  casa: 'Casa',
  almacen: 'Almacén',
  campo: 'Campo',
  palmeral: 'Palmeral',
  pesca: 'Pesca',
  adoberia: 'Adobería',
  alfar: 'Alfar',
  canal: 'Canal',
  dique: 'Dique',
  templo: 'Templo',
};
const NOMBRE_BIEN: Record<string, string> = { adobe: 'adobe', cana: 'caña', paja: 'paja', arcilla: 'arcilla', cebada: 'cebada', datiles: 'dátiles', pescado: 'pescado', hoces: 'hoces' };

const ESTILO_BARRA =
  'position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:6px;padding:6px;' +
  'background:rgba(24,20,16,.7);border:1px solid rgba(255,230,170,.25);border-radius:10px;backdrop-filter:blur(2px);user-select:none;max-width:calc(100vw - 24px);overflow-x:auto';
const ESTILO_BOTON =
  'display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px;padding:6px 8px;border:1px solid rgba(255,230,170,.3);' +
  'border-radius:7px;background:rgba(255,255,255,.04);color:#f6ecd8;font:600 13px system-ui,sans-serif;cursor:pointer';
const ESTILO_ACTIVO = 'background:rgba(255,214,130,.92);color:#2a2016;border-color:rgba(255,214,130,1)';
const ESTILO_COSTE = 'font:500 11px system-ui,sans-serif;opacity:.8;white-space:nowrap';
const ESTILO_MOTIVO =
  'position:absolute;pointer-events:none;padding:4px 8px;border-radius:6px;background:rgba(150,32,24,.9);color:#fff;' +
  'font:600 12px system-ui,sans-serif;white-space:nowrap;transform:translate(14px,14px);display:none';

/** Edificios que se pueden colocar a mano en esta versión (canal y dique llegan con el agua, más adelante). */
export const CONSTRUIBLES: readonly TipoEdificio[] = ['choza', 'casa', 'almacen', 'campo', 'palmeral', 'pesca', 'adoberia', 'alfar', 'templo'];

export function crearMenuConstruccion(contenedor: HTMLElement, cfg: ConfigSim, acciones: AccionesMenu): MenuConstruccion {
  const barra = document.createElement('div');
  barra.style.cssText = ESTILO_BARRA;
  barra.dataset.ui = 'construccion';
  const botones = new Map<TipoEdificio, HTMLButtonElement>();
  for (const tipo of CONSTRUIBLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1; // nunca recibe foco: el espacio sigue siendo la pausa
    b.style.cssText = ESTILO_BOTON;
    b.dataset.edificio = tipo;
    const nombre = document.createElement('span');
    nombre.textContent = NOMBRE[tipo];
    const coste = document.createElement('span');
    coste.style.cssText = ESTILO_COSTE;
    const mats = Object.entries(cfg.edificios[tipo].materiales).filter(([, v]) => (v ?? 0) > 0);
    coste.textContent = mats.length ? mats.map(([k, v]) => `${v} ${NOMBRE_BIEN[k] ?? k}`).join(' · ') : 'sin material';
    b.append(nombre, coste);
    b.addEventListener('click', () => acciones.elegir(tipo));
    botones.set(tipo, b);
    barra.appendChild(b);
  }
  const aviso = document.createElement('div');
  aviso.style.cssText = ESTILO_MOTIVO;
  contenedor.append(barra, aviso);

  let marcado: TipoEdificio | null = null;
  return {
    marcar(tipo) {
      if (tipo === marcado) return;
      if (marcado) botones.get(marcado)!.style.cssText = ESTILO_BOTON;
      if (tipo) botones.get(tipo)!.style.cssText = ESTILO_BOTON + ';' + ESTILO_ACTIVO;
      marcado = tipo;
    },
    motivo(texto, x, y) {
      if (!texto) {
        aviso.style.display = 'none';
        return;
      }
      aviso.textContent = texto;
      aviso.style.left = `${x}px`;
      aviso.style.top = `${y}px`;
      aviso.style.display = 'block';
    },
    liberar() {
      barra.remove();
      aviso.remove();
    },
  };
}
