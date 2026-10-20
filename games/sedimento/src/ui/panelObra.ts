// Panel de la obra seleccionada (R22): qué es, en qué etapa va, cuánto lleva y por qué está parada.
// Solo emite eventos: quien lo usa (main.ts) es quien llama a cancelarObra, suspenderObra y priorizarObra.

export interface DatosObra {
  id: number;
  /** Nombre del edificio que se levanta («Casa»). */
  nombre: string;
  /** «Cimientos», «Estructura»… */
  etapa: string;
  /** Posición de la etapa (1..total) para escribir «3 de 5». */
  numeroEtapa: number;
  totalEtapas: number;
  /** Progreso de toda la obra, 0..100. */
  porcentaje: number;
  /** Progreso de la etapa actual, 0..100. */
  porcentajeEtapa: number;
  /** Texto claro: «Falta adobe», «No hay trabajadores libres», «Avanza con normalidad»… */
  motivo: string;
  /** true si no está avanzando (por cualquier motivo). */
  parada: boolean;
  suspendida: boolean;
  prioritaria: boolean;
  constructores: number;
}

export interface AccionesObra {
  cancelar(id: number): void;
  suspender(id: number, suspendida: boolean): void;
  priorizar(id: number, prioritaria: boolean): void;
  cerrar(): void;
}

export interface PanelObra {
  /** Muestra los datos de la obra, o se oculta con null. Es barato: solo toca el DOM si algo cambió. */
  mostrar(datos: DatosObra | null): void;
  liberar(): void;
}

const ESTILO_PANEL =
  'position:absolute;right:12px;top:80px;display:none;flex-direction:column;gap:8px;padding:10px 12px;width:230px;' +
  'background:rgba(24,20,16,.78);color:#f6ecd8;border:1px solid rgba(255,230,170,.3);border-radius:8px;' +
  'font:600 13px system-ui,sans-serif;backdrop-filter:blur(2px)';
const ESTILO_BOTON = 'flex:1;padding:4px 6px;border:1px solid rgba(255,230,170,.35);border-radius:5px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer';
const ESTILO_ACTIVO = 'background:rgba(255,214,130,.9);color:#2a2016';
const ESTILO_PELIGRO = 'background:rgba(255,138,112,.9);color:#2a1410';
/** Tiempo que el botón «Cancelar» espera una segunda pulsación antes de volver a su estado normal. */
const MS_CONFIRMACION = 3000;
const COLOR_BARRA = { avanza: '#bfe39a', parada: '#ffb36b' };

export function crearPanelObra(contenedor: HTMLElement, acciones: AccionesObra): PanelObra {
  const panel = document.createElement('div');
  panel.id = 'panel-obra';
  panel.style.cssText = ESTILO_PANEL;
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  panel.addEventListener('pointerup', (e) => e.stopPropagation());

  const cabecera = document.createElement('div');
  cabecera.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px';
  const titulo = document.createElement('span');
  titulo.style.cssText = 'font-size:15px';
  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.textContent = '✕';
  cerrar.title = 'Cerrar';
  cerrar.style.cssText = 'border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;opacity:.7';
  cerrar.onclick = () => acciones.cerrar();
  cabecera.append(titulo, cerrar);

  const etapa = document.createElement('div');
  etapa.style.opacity = '.85';
  const barra = document.createElement('div');
  barra.style.cssText = 'height:8px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden';
  const relleno = document.createElement('div');
  relleno.style.cssText = 'height:100%;width:0';
  barra.appendChild(relleno);
  const porcentaje = document.createElement('div');
  const motivo = document.createElement('div');
  motivo.style.cssText = 'padding:4px 6px;border-radius:5px;background:rgba(255,255,255,.08)';
  const gente = document.createElement('div');
  gente.style.cssText = 'opacity:.7;font-weight:500;font-size:12px';

  const filaBotones = document.createElement('div');
  filaBotones.style.cssText = 'display:flex;gap:6px';
  const suspender = document.createElement('button');
  const priorizar = document.createElement('button');
  const cancelar = document.createElement('button');
  for (const b of [suspender, priorizar, cancelar]) {
    b.type = 'button';
    b.style.cssText = ESTILO_BOTON;
  }
  suspender.dataset.accion = 'suspender';
  priorizar.dataset.accion = 'priorizar';
  cancelar.dataset.accion = 'cancelar';
  priorizar.textContent = 'Prioridad';
  filaBotones.append(suspender, priorizar);
  panel.append(cabecera, etapa, barra, porcentaje, motivo, gente, filaBotones, cancelar);
  contenedor.appendChild(panel);

  let actual: DatosObra | null = null;
  let confirmando: ReturnType<typeof setTimeout> | null = null;
  const reposo = () => {
    if (confirmando) clearTimeout(confirmando);
    confirmando = null;
    cancelar.textContent = 'Cancelar obra (devuelve el material)';
    cancelar.style.cssText = ESTILO_BOTON;
  };
  reposo();

  suspender.onclick = () => actual && acciones.suspender(actual.id, !actual.suspendida);
  priorizar.onclick = () => actual && acciones.priorizar(actual.id, !actual.prioritaria);
  cancelar.onclick = () => {
    if (!actual) return;
    // Cancelar es irreversible: hace falta pulsar dos veces seguidas.
    if (confirmando) {
      reposo();
      acciones.cancelar(actual.id);
      return;
    }
    cancelar.textContent = '¿Seguro? Pulsa otra vez';
    cancelar.style.cssText = `${ESTILO_BOTON};${ESTILO_PELIGRO}`;
    confirmando = setTimeout(reposo, MS_CONFIRMACION);
  };

  let ultimo = '';
  return {
    mostrar(datos) {
      if (!datos) {
        if (panel.style.display !== 'none') panel.style.display = 'none';
        actual = null;
        ultimo = '';
        reposo();
        return;
      }
      if (actual && actual.id !== datos.id) reposo();
      actual = datos;
      const clave = JSON.stringify(datos);
      if (clave === ultimo) return;
      ultimo = clave;
      panel.style.display = 'flex';
      titulo.textContent = `${datos.nombre} en obra`;
      etapa.textContent = `Etapa ${datos.numeroEtapa} de ${datos.totalEtapas}: ${datos.etapa} (${Math.round(datos.porcentajeEtapa)} %)`;
      relleno.style.width = `${Math.max(0, Math.min(100, datos.porcentaje))}%`;
      relleno.style.background = datos.parada ? COLOR_BARRA.parada : COLOR_BARRA.avanza;
      porcentaje.textContent = `${Math.round(datos.porcentaje)} % de la obra`;
      motivo.textContent = datos.motivo;
      motivo.style.color = datos.parada ? '#ffd0a0' : '#d6eec0';
      gente.textContent = datos.constructores > 0 ? `${datos.constructores} ${datos.constructores === 1 ? 'constructor' : 'constructores'} hoy` : 'Sin constructores hoy';
      suspender.textContent = datos.suspendida ? 'Reanudar' : 'Suspender';
      priorizar.textContent = datos.prioritaria ? 'Prioritaria ✓' : 'Prioridad';
      priorizar.style.cssText = datos.prioritaria ? `${ESTILO_BOTON};${ESTILO_ACTIVO}` : ESTILO_BOTON;
    },
    liberar() {
      reposo();
      panel.remove();
    },
  };
}
