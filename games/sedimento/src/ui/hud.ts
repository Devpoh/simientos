import type { Estacion } from '../logic/reloj';

const NOMBRE_ESTACION: Record<Estacion, string> = {
  primavera: 'Primavera',
  verano: 'Verano',
  otono: 'Otoño',
  invierno: 'Invierno',
};

export interface DatosFecha {
  anio: number;
  mes: number;
  diaDelMes: number;
  estacion: Estacion;
}

export interface AccionesHud {
  alternarPausa(): void;
  fijarVelocidad(indice: number): void;
}

export interface Hud {
  actualizar(fecha: DatosFecha, pausado: boolean, indiceVelocidad: number): void;
  liberar(): void;
}

const ESTILO_PANEL =
  'position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:6px 12px;' +
  'background:rgba(24,20,16,.62);color:#f6ecd8;border:1px solid rgba(255,230,170,.25);border-radius:8px;' +
  'font:600 13px system-ui,sans-serif;user-select:none;backdrop-filter:blur(2px)';
const ESTILO_BOTON = 'min-width:34px;padding:3px 8px;border:1px solid rgba(255,230,170,.35);border-radius:5px;background:transparent;color:inherit;font:inherit;cursor:pointer';
const ESTILO_BOTON_ACTIVO = 'background:rgba(255,214,130,.9);color:#2a2016';

/** HUD mínimo: fecha, estación y botones de pausa y velocidad. Solo toca el DOM cuando algo cambia. */
export function crearHud(contenedor: HTMLElement, velocidades: readonly number[], acciones: AccionesHud): Hud {
  const panel = document.createElement('div');
  panel.style.cssText = ESTILO_PANEL;
  const texto = document.createElement('span');
  panel.appendChild(texto);

  const crearBoton = (etiqueta: string, titulo: string, alPulsar: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = etiqueta;
    b.title = titulo;
    b.style.cssText = ESTILO_BOTON;
    b.addEventListener('click', alPulsar);
    // Nunca recibe foco: si no, la barra espaciadora activaría el botón además del atajo.
    b.tabIndex = -1;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    panel.appendChild(b);
    return b;
  };
  const botonPausa = crearBoton('⏸', 'Pausa (Espacio)', acciones.alternarPausa);
  const botones = velocidades.map((v, i) => crearBoton(`×${v}`, `Velocidad ×${v} (tecla ${i + 1})`, () => acciones.fijarVelocidad(i)));
  contenedor.appendChild(panel);

  let ultimo = '';
  return {
    actualizar(f, pausado, indice) {
      const clave = `${f.anio}|${f.mes}|${f.diaDelMes}|${pausado}|${indice}`;
      if (clave === ultimo) return;
      ultimo = clave;
      texto.textContent = `Año ${f.anio} · Mes ${f.mes} · Día ${f.diaDelMes} · ${NOMBRE_ESTACION[f.estacion]}`;
      botonPausa.style.cssText = ESTILO_BOTON + (pausado ? `;${ESTILO_BOTON_ACTIVO}` : '');
      botones.forEach((b, i) => {
        b.style.cssText = ESTILO_BOTON + (!pausado && i === indice ? `;${ESTILO_BOTON_ACTIVO}` : '');
      });
    },
    liberar() {
      panel.remove();
    },
  };
}
