import * as THREE from 'three';
import tuning from './data/tuning.json';
import { exponer, marcarListo, params } from './core/test-hooks';
import { contarBiomas, contarTerrenos, generarMapa, hashMapa } from './logic/mapa';
import { crearEscena } from './render/escena';
import { crearMundo } from './render/mundo';

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
const mundo = crearMundo(mapa, tuning.render);
const vista = crearEscena(contenedor, tuning.render, mundo.caja);
vista.escena.add(mundo.raiz);

// La semilla visible permite repetir un mapa que ha gustado (se puede reutilizar con ?semilla=N).
const etiqueta = document.createElement('div');
etiqueta.textContent = `Semilla ${mapa.semilla}`;
etiqueta.style.cssText = 'position:absolute;left:12px;bottom:10px;font:12px system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000;opacity:.8;pointer-events:none';
contenedor.appendChild(etiqueta);

exponer('mapa', () => ({ semilla: mapa.semilla, hexagonos: mapa.terreno.length, rios: mapa.rios.length, hash: hashMapa(mapa), terrenos: contarTerrenos(mapa), biomas: contarBiomas(mapa) }));
exponer('render', () => ({ drawCalls: vista.renderer.info.render.calls, triangulos: vista.renderer.info.render.triangles, vegetacion: mundo.ejemplaresVegetacion }));

const reloj = new THREE.Timer();
reloj.connect(document);
let primerFrame = true;
vista.renderer.setAnimationLoop((ts: number) => {
  reloj.update(ts);
  mundo.actualizar(Math.min(reloj.getDelta(), DELTA_MAXIMO));
  vista.renderizar();
  if (primerFrame) {
    primerFrame = false;
    marcarListo();
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    vista.renderer.setAnimationLoop(null);
    reloj.dispose();
    etiqueta.remove();
    mundo.liberar();
    vista.liberar();
  });
}
