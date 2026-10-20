import * as THREE from 'three';
import tuning from './data/tuning.json';
import { exponer, marcarListo, params } from './core/test-hooks';
import { contarBiomas, contarTerrenos, generarMapa, hashMapa } from './logic/mapa';
import { crearEscena } from './render/escena';
import { alternarPausa, avanzar, crearReloj, fecha, fijarVelocidad } from './logic/reloj';
import { crearMundo } from './render/mundo';
import { crearEdificios } from './render/edificios';
import { Rejilla } from './logic/hex';
import { configDesdeTuning } from './logic/sim/config';
import { NOMBRE_ETAPA, cancelarObra, colocarObra, fundarAsentamiento, huellaDe, motivoNoConstruible, priorizarObra, progresoEtapa, progresoObra, suspenderObra, textoBloqueo } from './logic/sim/obras';
import { puntoEnRect } from './logic/geometria2d';
import { sembrarObrasDePrueba } from './core/obras-prueba';
import { SIN_HERRAMIENTA, TEXTO_MOTIVO, transicion, type EventoHerramienta, type Herramienta } from './logic/herramienta';
import { ETAPAS_OBRA, type TipoEdificio, type Ubicacion } from './logic/sim/tipos';
import { crearFantasma } from './render/fantasma';
import { crearObras } from './render/obras';
import { CONSTRUIBLES, NOMBRE, crearMenuConstruccion } from './ui/menuConstruccion';
import { crearPanelObra, type DatosObra } from './ui/panelObra';
import { alimentoDisponible, fijarRacion, personas, reservaDias } from './logic/sim/raciones';
import { avanzarTicks, crearEstado } from './logic/sim/simulacion';
import { crearPanelCiudad, type DatosCiudad } from './ui/panelCiudad';
import { crearSeleccion } from './render/seleccion';
import { crearAtajosReloj } from './ui/atajos';
import { crearHud, type AccionesHud } from './ui/hud';

/** Máximo delta por frame (s): tras una pausa o cambio de pestaña no hay saltos. */
const DELTA_MAXIMO = 0.1;

/**
 * Cada partida es un mapa nuevo (R9). `?semilla=N` lo repite. Con `?test` (lo usa `shot`) y sin
 * semilla se usa la de tuning.json, para que la verificación sea reproducible.
 */
function resolverSemilla(): number {
  const pedida = Number(params.get('semilla'));
  if (params.get('semilla') !== null && Number.isFinite(pedida)) return pedida;
  if (params.has('test')) return tuning.mapa.semilla;
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

const contenedor = document.getElementById('juego');
if (!contenedor) throw new Error('Falta #juego en index.html');

const semilla = resolverSemilla();
const mapa = generarMapa({ ...tuning.mapa, semilla }, tuning.clima);
const mundo = crearMundo(mapa, tuning.render, tuning.alturas);
const vista = crearEscena(contenedor, tuning.render, mundo.caja);
vista.escena.add(mundo.raiz);
const lienzo = vista.renderer.domElement;
lienzo.style.display = 'block';

const superficieEn = (x: number, z: number) => {
  const agua = mundo.campo.aguaEn(x, z);
  const suelo = mundo.campo.alturaEn(x, z);
  return Number.isNaN(agua) ? suelo : Math.max(suelo, agua);
};
// La cámara sigue la superficie (terreno o agua) y no se mete bajo ella.
vista.control.fijarAlturaEn(superficieEn);
const seleccion = crearSeleccion(mundo.disposicion, tuning.render, superficieEn);
vista.escena.add(seleccion.raiz);
// Posición del ratón sobre el lienzo (null si está fuera): se evalúa cada frame porque la cámara también se mueve.
let cursor: { x: number; y: number } | null = null;
const alMoverRaton = (e: PointerEvent) => {
  const caja = lienzo.getBoundingClientRect();
  cursor = { x: e.clientX - caja.left, y: e.clientY - caja.top };
};
const alSalirRaton = () => {
  cursor = null;
};
lienzo.addEventListener('pointermove', alMoverRaton);
lienzo.addEventListener('pointerleave', alSalirRaton);
// Doble clic: centra la cámara en el hexágono bajo el ratón.
const alDobleClic = (e: MouseEvent) => {
  // Se recalcula con la posición del propio clic: el hexágono "hover" puede ser del frame anterior.
  const caja = lienzo.getBoundingClientRect();
  seleccion.apuntar(e.clientX - caja.left, e.clientY - caja.top, vista.camara, caja.width, caja.height);
  const i = seleccion.hex;
  if (i !== -1) vista.control.irA(mundo.disposicion.x[i], mundo.disposicion.z[i]);
};
lienzo.addEventListener('dblclick', alDobleClic);

// Simulación de la ciudad (lógica pura en logic/sim): avanza con los ticks del reloj; el render solo la lee.
const cfgSim = configDesdeTuning(tuning);
const sim = crearEstado(cfgSim, semilla);
const mundoFisico = { mapa, rejilla: new Rejilla(mapa.columnas, mapa.filas), tamanoHex: tuning.render.tamanoHex, alturaEn: mundo.campo.alturaEn, aguaEn: mundo.campo.aguaEn };
const aldea = fundarAsentamiento(sim, mundoFisico, cfgSim);
// Como en Civ, la partida empieza mirando a tu asentamiento.
vista.control.irA(aldea.x, aldea.z);
if (params.has('obrasPrueba')) sembrarObrasDePrueba(sim, mundoFisico, cfgSim, aldea);
// ?enfocarObra=N (test): la cámara empieza mirando la obra N de las de prueba.
const obraEnfocada = sim.obras[Number(params.get('enfocarObra'))];
if (obraEnfocada) vista.control.irA(obraEnfocada.x, obraEnfocada.z);
const edificios = crearEdificios(mundo.disposicion, tuning.render, mundo.sueloEn, semilla);
vista.escena.add(edificios.raiz);
edificios.sincronizar(sim.edificios);
// Los edificios que tapan el objetivo se atenúan con transición (oclusión de la cámara).
vista.control.fijarOclusores(edificios);

// Construcción libre (A6b): la herramienta es lógica pura (logic/herramienta.ts); el menú, el teclado y
// el ratón solo le envían eventos, y el fantasma muestra si cabe y por qué no.
const pasoGiro = (tuning.render.construccion.pasoGiroGrados * Math.PI) / 180;
let herramienta: Herramienta = SIN_HERRAMIENTA;
const fantasma = crearFantasma(cfgSim, tuning.render, mundo.campo.alturaEn);
vista.escena.add(fantasma.raiz);
const obrasRender = crearObras(cfgSim, tuning.render, mundo.campo.alturaEn);
vista.escena.add(obrasRender.raiz);
// Obra seleccionada con un clic sin herramienta (A6d). El panel solo emite eventos; aquí se llama a la simulación.
let obraSeleccionada: number | null = null;
const panelObra = crearPanelObra(contenedor, {
  cancelar: (id) => {
    cancelarObra(sim, id, cfgSim);
    obraSeleccionada = null;
  },
  suspender: (id, suspendida) => suspenderObra(sim, id, suspendida),
  priorizar: (id, prioritaria) => priorizarObra(sim, id, prioritaria ? 1 : 0),
  cerrar: () => {
    obraSeleccionada = null;
  },
});
const aplicar = (ev: EventoHerramienta) => {
  herramienta = transicion(herramienta, ev, pasoGiro);
  menu.marcar(herramienta.modo === 'colocar' ? herramienta.tipo : null);
};
const menu = crearMenuConstruccion(contenedor, cfgSim, { elegir: (tipo) => aplicar({ tipo: 'elegir', edificio: tipo }) });
vista.control.fijarHerramienta(() => herramienta.modo !== 'ninguna');
const pedida = params.get('herramienta');
if (pedida && (CONSTRUIBLES as readonly string[]).includes(pedida)) aplicar({ tipo: 'elegir', edificio: pedida as TipoEdificio });
let intento: { u: Ubicacion; motivo: string | null } | null = null;
const alTecla = (e: KeyboardEvent) => {
  if (herramienta.modo === 'ninguna') {
    if (e.code === 'Escape') obraSeleccionada = null;
    return;
  }
  if (e.code === 'KeyZ') aplicar({ tipo: 'girar', pasos: -1 });
  else if (e.code === 'KeyX') aplicar({ tipo: 'girar', pasos: 1 });
  else if (e.code === 'Escape') aplicar({ tipo: 'cancelar' });
};
addEventListener('keydown', alTecla);
// Un clic (sin arrastrar) con la herramienta activa coloca la obra; se sigue colocando hasta Esc.
let pulsado: { x: number; y: number } | null = null;
const alPulsar = (e: PointerEvent) => {
  if (e.button === 0) pulsado = { x: e.clientX, y: e.clientY };
};
const alSoltar = (e: PointerEvent) => {
  if (e.button !== 0 || !pulsado) return;
  const clic = Math.hypot(e.clientX - pulsado.x, e.clientY - pulsado.y) <= tuning.render.construccion.umbralClic;
  pulsado = null;
  if (!clic) return;
  const caja = lienzo.getBoundingClientRect();
  seleccion.apuntar(e.clientX - caja.left, e.clientY - caja.top, vista.camara, caja.width, caja.height);
  const p = seleccion.punto;
  if (herramienta.modo === 'ninguna') {
    // Sin herramienta, un clic sobre la huella de una obra la selecciona; en cualquier otro sitio, la suelta.
    const bajo = p ? sim.obras.find((o) => puntoEnRect({ x: p.x, z: p.z }, huellaDe(o.tipo, o, cfgSim), tuning.render.construccion.margenClicObra)) : undefined;
    obraSeleccionada = bajo ? bajo.id : null;
    return;
  }
  if (herramienta.modo !== 'colocar' || !p) return;
  const r = colocarObra(sim, mundoFisico, herramienta.tipo, { x: p.x, z: p.z, giro: herramienta.giro }, cfgSim);
  if ('id' in r) aplicar({ tipo: 'colocado', soltar: false });
};
lienzo.addEventListener('pointerdown', alPulsar);
lienzo.addEventListener('pointerup', alSoltar);

const datosObra = (o: (typeof sim.obras)[number]): DatosObra => ({
  id: o.id,
  nombre: NOMBRE[o.tipo],
  etapa: NOMBRE_ETAPA[o.etapa],
  numeroEtapa: ETAPAS_OBRA.indexOf(o.etapa) + 1,
  totalEtapas: ETAPAS_OBRA.length,
  porcentaje: progresoObra(o, cfgSim) * 100,
  porcentajeEtapa: progresoEtapa(o, cfgSim) * 100,
  motivo: textoBloqueo(o.bloqueo),
  parada: o.bloqueo !== null,
  suspendida: o.suspendida,
  prioritaria: o.prioridad > 0,
  constructores: o.constructores,
});

const datosCiudad = (): DatosCiudad => ({
  personas: personas(sim),
  hogaresConHambre: sim.hogares.filter((h) => h.diasHambre > 0).length,
  cebada: sim.almacen.cebada,
  alimento: alimentoDisponible(sim, cfgSim),
  reservaDias: reservaDias(sim, cfgSim),
  racion: sim.racionObjetivo,
});
const panelCiudad = crearPanelCiudad(contenedor, tuning.economia.racionesPermitidas, tuning.economia.diasReservaBaja, {
  fijarRacion: (r) => fijarRacion(sim, r, cfgSim),
});

// Reloj de juego (lógica pura en logic/reloj.ts): el HUD y las teclas solo piden cambios.
let reloj = crearReloj(tuning.reloj);
// ?pausa=1 (test): el reloj arranca parado para poder mirar una obra sin que avance.
if (params.has('pausa')) reloj = alternarPausa(reloj);
const acciones: AccionesHud = {
  alternarPausa: () => {
    reloj = alternarPausa(reloj);
  },
  fijarVelocidad: (indice) => {
    reloj = fijarVelocidad(reloj, tuning.reloj.velocidades[indice], tuning.reloj);
  },
};
const hud = crearHud(contenedor, tuning.reloj.velocidades, acciones);
const quitarAtajos = crearAtajosReloj(acciones, tuning.reloj.velocidades.length);

// La semilla visible permite repetir un mapa que ha gustado (se puede reutilizar con ?semilla=N).
const etiqueta = document.createElement('div');
etiqueta.textContent = `Semilla ${mapa.semilla}`;
etiqueta.style.cssText = 'position:absolute;left:12px;bottom:10px;font:12px system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000;opacity:.8;pointer-events:none';
contenedor.appendChild(etiqueta);

exponer('mapa', () => ({ semilla: mapa.semilla, hexagonos: mapa.terreno.length, rios: mapa.rios.length, hash: hashMapa(mapa), terrenos: contarTerrenos(mapa), biomas: contarBiomas(mapa) }));
exponer('render', () => ({ drawCalls: vista.renderer.info.render.calls, triangulos: vista.renderer.info.render.triangles, vegetacion: mundo.ejemplaresVegetacion, verticesTerreno: mundo.verticesTerreno, rios: mundo.campo.rios.length }));
exponer('camara', () => vista.control.estado());
exponer('seleccion', () => {
  const i = seleccion.hex;
  return i === -1 ? { hex: -1 } : { hex: i, col: mundo.disposicion.rejilla.col(i), fila: mundo.disposicion.rejilla.fila(i), terreno: mapa.terreno[i], bioma: mapa.bioma[i] };
});
exponer('ciudad', () => ({ ...datosCiudad(), edificios: sim.edificios.length, obras: sim.obras.length, dia: sim.dia }));
exponer('hud', () => ({ reservaDias: reservaDias(sim, cfgSim) }));
exponer('construccion', () => ({
  herramienta,
  intento,
  seleccionada: obraSeleccionada,
  obras: sim.obras.map((o) => ({ id: o.id, tipo: o.tipo, etapa: o.etapa, progresoEtapa: +progresoEtapa(o, cfgSim).toFixed(2), progreso: +progresoObra(o, cfgSim).toFixed(2), x: +o.x.toFixed(2), z: +o.z.toFixed(2), giro: +o.giro.toFixed(3), bloqueo: o.bloqueo, suspendida: o.suspendida, prioridad: o.prioridad })),
}));
exponer('tiempo', () => ({ dia: fecha(reloj.tick, tuning.reloj).diaTotal, tick: reloj.tick, pausa: reloj.pausado, velocidad: reloj.velocidad }));

const temporizador = new THREE.Timer();
temporizador.connect(document);
let primerFrame = true;
vista.renderer.setAnimationLoop((ts: number) => {
  temporizador.update(ts);
  const dt = Math.min(temporizador.getDelta(), DELTA_MAXIMO);
  const paso = avanzar(reloj, dt, tuning.reloj);
  reloj = paso.reloj;
  avanzarTicks(sim, paso.ticks, cfgSim);
  edificios.sincronizar(sim.edificios);
  panelCiudad.actualizar(datosCiudad());
  vista.actualizar(dt);
  mundo.actualizar(dt);
  const caja = lienzo.getBoundingClientRect();
  seleccion.apuntar(cursor ? cursor.x : null, cursor ? cursor.y : 0, vista.camara, caja.width, caja.height);
  const p = seleccion.punto;
  if (herramienta.modo === 'colocar' && p) {
    const u = { x: p.x, z: p.z, giro: herramienta.giro };
    const motivo = motivoNoConstruible(sim, mundoFisico, herramienta.tipo, u, cfgSim);
    fantasma.mostrar(herramienta.tipo, u, motivo === null);
    menu.motivo(motivo ? TEXTO_MOTIVO[motivo] : null, cursor?.x ?? 0, cursor?.y ?? 0);
    intento = { u, motivo };
    // Mientras se coloca, el círculo de selección sobra: manda el fantasma.
    seleccion.raiz.visible = false;
  } else {
    fantasma.ocultar();
    menu.motivo(null, 0, 0);
    intento = null;
  }
  const seleccionada = sim.obras.find((o) => o.id === obraSeleccionada);
  if (!seleccionada) obraSeleccionada = null;
  obrasRender.sincronizar(sim.obras, obraSeleccionada);
  panelObra.mostrar(seleccionada ? datosObra(seleccionada) : null);
  hud.actualizar(fecha(reloj.tick, tuning.reloj), reloj.pausado, tuning.reloj.velocidades.indexOf(reloj.velocidad));
  vista.renderizar();
  if (primerFrame) {
    primerFrame = false;
    marcarListo();
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    vista.renderer.setAnimationLoop(null);
    temporizador.dispose();
    quitarAtajos();
    hud.liberar();
    panelCiudad.liberar();
    edificios.liberar();
    removeEventListener('keydown', alTecla);
    lienzo.removeEventListener('pointerdown', alPulsar);
    lienzo.removeEventListener('pointerup', alSoltar);
    fantasma.liberar();
    obrasRender.liberar();
    panelObra.liberar();
    menu.liberar();
    lienzo.removeEventListener('pointermove', alMoverRaton);
    lienzo.removeEventListener('pointerleave', alSalirRaton);
    lienzo.removeEventListener('dblclick', alDobleClic);
    seleccion.liberar();
    etiqueta.remove();
    mundo.liberar();
    vista.liberar();
  });
}
