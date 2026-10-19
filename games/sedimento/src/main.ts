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
import { fundarAsentamiento } from './logic/sim/obras';
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
const edificios = crearEdificios(mundo.disposicion, tuning.render, mundo.sueloEn, semilla);
vista.escena.add(edificios.raiz);
edificios.sincronizar(sim.edificios);
// Los edificios que tapan el objetivo se atenúan con transición (oclusión de la cámara).
vista.control.fijarOclusores(edificios);

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
    lienzo.removeEventListener('pointermove', alMoverRaton);
    lienzo.removeEventListener('pointerleave', alSalirRaton);
    lienzo.removeEventListener('dblclick', alDobleClic);
    seleccion.liberar();
    etiqueta.remove();
    mundo.liberar();
    vista.liberar();
  });
}
