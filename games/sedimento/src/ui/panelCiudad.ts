/** Lo que el panel muestra; lo calcula main.ts a partir del estado de la simulación. */
export interface DatosCiudad {
  personas: number;
  hogaresConHambre: number;
  cebada: number;
  /** Alimento total en raciones. */
  alimento: number;
  reservaDias: number;
  racion: number;
}

export interface AccionesCiudad {
  fijarRacion(fraccion: number): void;
}

export interface PanelCiudad {
  actualizar(d: DatosCiudad): void;
  liberar(): void;
}

const ESTILO_PANEL =
  'position:absolute;top:10px;left:12px;display:flex;flex-direction:column;gap:6px;padding:8px 12px;min-width:190px;' +
  'background:rgba(24,20,16,.62);color:#f6ecd8;border:1px solid rgba(255,230,170,.25);border-radius:8px;' +
  'font:600 13px system-ui,sans-serif;user-select:none;backdrop-filter:blur(2px)';
const ESTILO_FILA = 'display:flex;justify-content:space-between;gap:12px';
const ESTILO_BOTON = 'flex:1;padding:2px 6px;border:1px solid rgba(255,230,170,.35);border-radius:5px;background:transparent;color:inherit;font:inherit;cursor:pointer';
const ESTILO_BOTON_ACTIVO = 'background:rgba(255,214,130,.9);color:#2a2016';
/** Colores de la reserva: holgada, justa y crítica. */
const COLOR_RESERVA = { bien: '#bfe39a', justa: '#ffd27a', mal: '#ff8a70' };

/** Panel de la ciudad: población, reservas del templo y política de raciones. */
export function crearPanelCiudad(contenedor: HTMLElement, raciones: readonly number[], diasReservaBaja: number, acciones: AccionesCiudad): PanelCiudad {
  const panel = document.createElement('div');
  panel.style.cssText = ESTILO_PANEL;
  const fila = (etiqueta: string) => {
    const f = document.createElement('div');
    f.style.cssText = ESTILO_FILA;
    const a = document.createElement('span');
    a.textContent = etiqueta;
    a.style.opacity = '.75';
    const b = document.createElement('span');
    f.append(a, b);
    panel.appendChild(f);
    return b;
  };
  const personas = fila('Personas');
  const alimento = fila('Alimento');
  const reserva = fila('Reserva');
  reserva.title = 'Días que dura la comida al ritmo de reparto actual';

  const filaRacion = document.createElement('div');
  filaRacion.style.cssText = 'display:flex;gap:4px;align-items:center';
  const etiqueta = document.createElement('span');
  etiqueta.textContent = 'Ración';
  etiqueta.style.cssText = 'opacity:.75;margin-right:4px';
  filaRacion.appendChild(etiqueta);
  const botones = raciones.map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${Math.round(r * 100)}%`;
    b.title = r === 1 ? 'Ración completa' : `Racionar al ${Math.round(r * 100)} %: dura más, pero la gente pasa hambre`;
    b.style.cssText = ESTILO_BOTON;
    b.tabIndex = -1;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => acciones.fijarRacion(r));
    filaRacion.appendChild(b);
    return b;
  });
  panel.appendChild(filaRacion);
  contenedor.appendChild(panel);

  let ultimo = '';
  return {
    actualizar(d) {
      const dias = Number.isFinite(d.reservaDias) ? Math.floor(d.reservaDias) : Infinity;
      const clave = `${d.personas}|${d.hogaresConHambre}|${Math.floor(d.alimento)}|${dias}|${d.racion}`;
      if (clave === ultimo) return;
      ultimo = clave;
      personas.textContent = d.hogaresConHambre > 0 ? `${d.personas} · ${d.hogaresConHambre} hogares con hambre` : `${d.personas}`;
      personas.style.color = d.hogaresConHambre > 0 ? COLOR_RESERVA.mal : '';
      alimento.textContent = `${Math.floor(d.alimento)} raciones`;
      reserva.textContent = Number.isFinite(dias) ? `${dias} días` : '—';
      reserva.style.color = dias < diasReservaBaja / 2 ? COLOR_RESERVA.mal : dias < diasReservaBaja ? COLOR_RESERVA.justa : COLOR_RESERVA.bien;
      botones.forEach((b, i) => {
        b.style.cssText = ESTILO_BOTON + (raciones[i] === d.racion ? `;${ESTILO_BOTON_ACTIVO}` : '');
      });
    },
    liberar() {
      panel.remove();
    },
  };
}
