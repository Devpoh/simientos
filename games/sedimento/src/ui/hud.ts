// HUD en pixel art (R70, P2b): fecha, estación, controles del reloj y recursos, con retrato del atlas.
// Presentación: solo toca el DOM cuando el dato cambia (por eventos, nunca cada fotograma).
import type { Estacion } from '../logic/reloj';
import type { CapaUi, MarcoUi } from './capa';

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

export interface DatosHud {
  fecha: DatosFecha;
  pausado: boolean;
  indiceVelocidad: number;
  /** Recursos a mostrar, en orden: [clave, valor]. */
  recursos: readonly (readonly [string, number])[];
}

export interface AccionesHud {
  alternarPausa(): void;
  fijarVelocidad(indice: number): void;
}

/** Recorte del atlas para el retrato del HUD. */
export interface Retrato {
  imagen: CanvasImageSource;
  frame: { x: number; y: number; w: number; h: number };
  /** Ampliación entera del recorte. */
  escala: number;
}

export interface Hud {
  actualizar(d: DatosHud): void;
  /** Veces que se ha redibujado el HUD (verifica que no se redibuja sin cambios). */
  readonly redibujados: number;
  /** Último texto pintado (para comprobar el contenido desde shot). */
  readonly texto: string;
  liberar(): void;
}

export interface OpcionesHud {
  capa: CapaUi;
  marcoFecha: MarcoUi;
  marcoRecursos: MarcoUi;
  velocidades: readonly number[];
  acciones: AccionesHud;
  retrato?: Retrato;
}

const ESTILO_BOTON =
  'font-family:inherit;font-size:8px;line-height:1;padding:3px 4px;cursor:pointer;color:var(--c-piedra-6);' +
  'background:var(--c-tinta-0);border:1px solid var(--c-piedra-2)';
const ESTILO_BOTON_ACTIVO = 'background:var(--c-oro-1);color:var(--c-tinta-0);border-color:var(--c-oro-2)';

/** Crea el HUD dentro de la capa `#ui` (fecha arriba al centro, recursos arriba a la izquierda). */
export function crearHud(o: OpcionesHud): Hud {
  const panelFecha = o.capa.panel(o.marcoFecha, {
    position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: '6px',
  });
  const texto = document.createElement('span');
  texto.style.cssText = 'font-size:9px;letter-spacing:.5px;white-space:nowrap';
  panelFecha.appendChild(texto);

  const crearBoton = (etiqueta: string, titulo: string, alPulsar: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = etiqueta;
    b.title = titulo;
    b.style.cssText = ESTILO_BOTON;
    // Nunca recibe foco: si no, la barra espaciadora activaría el botón además del atajo.
    b.tabIndex = -1;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', alPulsar);
    panelFecha.appendChild(b);
    return b;
  };
  const botonPausa = crearBoton('II', 'Pausa (Espacio)', o.acciones.alternarPausa);
  const botones = o.velocidades.map((v, i) =>
    crearBoton(`x${v}`, `Velocidad x${v} (tecla ${i + 1})`, () => o.acciones.fijarVelocidad(i)));

  const panelRecursos = o.capa.panel(o.marcoRecursos, {
    position: 'absolute', top: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '8px',
  });
  if (o.retrato) {
    const r = o.retrato;
    const retrato = document.createElement('canvas');
    retrato.className = 'retrato';
    retrato.dataset.ui = 'retrato';
    retrato.width = r.frame.w * r.escala;
    retrato.height = r.frame.h * r.escala;
    const ctx = retrato.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(r.imagen, r.frame.x, r.frame.y, r.frame.w, r.frame.h, 0, 0, retrato.width, retrato.height);
    }
    panelRecursos.appendChild(retrato);
  }
  const lista = document.createElement('span');
  lista.style.cssText = 'font-size:9px;white-space:nowrap';
  panelRecursos.appendChild(lista);

  let ultimo = '';
  let redibujados = 0;
  let textoActual = '';
  return {
    get redibujados() {
      return redibujados;
    },
    get texto() {
      return textoActual;
    },
    actualizar(d) {
      const recursos = d.recursos.map(([k, v]) => `${k} ${Math.floor(v)}`).join('  ');
      const clave = `${d.fecha.anio}|${d.fecha.mes}|${d.fecha.diaDelMes}|${d.fecha.estacion}|${d.pausado}|${d.indiceVelocidad}|${recursos}`;
      if (clave === ultimo) return;
      ultimo = clave;
      redibujados++;
      textoActual = `Año ${d.fecha.anio} · Mes ${d.fecha.mes} · Día ${d.fecha.diaDelMes} · ${NOMBRE_ESTACION[d.fecha.estacion]}`;
      texto.textContent = textoActual;
      botonPausa.style.cssText = ESTILO_BOTON + (d.pausado ? `;${ESTILO_BOTON_ACTIVO}` : '');
      botones.forEach((b, i) => {
        b.style.cssText = ESTILO_BOTON + (!d.pausado && i === d.indiceVelocidad ? `;${ESTILO_BOTON_ACTIVO}` : '');
      });
      lista.textContent = recursos;
    },
    liberar() {
      panelFecha.remove();
      panelRecursos.remove();
    },
  };
}
