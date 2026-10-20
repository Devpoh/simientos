import * as THREE from 'three';
import tuning from './data/tuning.json';
import { exponer, marcarListo } from './core/test-hooks';
import { puntuacionInicial, recoger } from './logic/puntuacion';

// Demo de la plantilla: mover un cubo con WASD/flechas y recoger monedas. Bórrala al empezar tu juego.

const contenedor = document.getElementById('juego')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
contenedor.appendChild(renderer.domElement);

const escena = new THREE.Scene();
escena.background = new THREE.Color(0x1b1d2a);
const camara = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camara.position.set(0, tuning.camara.altura, tuning.camara.distancia);

escena.add(new THREE.HemisphereLight(0xbfd4ff, 0x30304a, 1.2));
const sol = new THREE.DirectionalLight(0xffffff, 2);
sol.position.set(6, 12, 4);
sol.castShadow = true;
escena.add(sol);

const lado = tuning.mundo.mitadLado * 2;
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(lado, lado), new THREE.MeshStandardMaterial({ color: 0x2c3044 }));
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
escena.add(suelo);

const t = tuning.jugador.tamano;
const jugador = new THREE.Mesh(new THREE.BoxGeometry(t, t, t), new THREE.MeshStandardMaterial({ color: 0x7c6cff }));
jugador.position.y = t / 2;
jugador.castShadow = true;
escena.add(jugador);

// Una sola geometría y material compartidos por todas las monedas.
const geoMoneda = new THREE.SphereGeometry(tuning.moneda.radio, 16, 12);
const matMoneda = new THREE.MeshStandardMaterial({ color: 0xffd34e, emissive: 0x553f00 });
const monedas: THREE.Mesh[] = [];
const azar = () => (Math.random() * 2 - 1) * (tuning.mundo.mitadLado - 1);
function soltarMoneda(): void {
  const m = new THREE.Mesh(geoMoneda, matMoneda);
  m.position.set(azar(), tuning.moneda.radio + 0.1, azar());
  m.castShadow = true;
  escena.add(m);
  monedas.push(m);
}
for (let i = 0; i < tuning.moneda.cantidadInicial; i++) soltarMoneda();

const pulsadas = new Set<string>();
addEventListener('keydown', (e) => pulsadas.add(e.code));
addEventListener('keyup', (e) => pulsadas.delete(e.code));
const eje = (pos: string[], neg: string[]) => Number(pos.some((k) => pulsadas.has(k))) - Number(neg.some((k) => pulsadas.has(k)));

const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;top:12px;left:16px;color:#fff;font:20px monospace';
document.body.appendChild(hud);
let puntuacion = puntuacionInicial();
const pintarHud = () => (hud.textContent = `Puntos ${puntuacion.puntos}   Racha x${puntuacion.racha}`);
pintarHud();

function ajustarTamano(): void {
  const { clientWidth: w, clientHeight: h } = contenedor;
  renderer.setSize(w, h);
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
}
addEventListener('resize', ajustarTamano);
ajustarTamano();

const dir = new THREE.Vector3();
const objetivoCamara = new THREE.Vector3();
const lim = tuning.mundo.mitadLado - t / 2;
const reloj = new THREE.Timer();

renderer.setAnimationLoop((ms) => {
  // delta en segundos, acotado para que una pestaña en segundo plano no provoque saltos.
  reloj.update(ms);
  const dt = Math.min(reloj.getDelta(), 0.1);

  dir.set(eje(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']), 0, eje(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp'])).normalize();
  jugador.position.addScaledVector(dir, tuning.jugador.velocidad * dt);
  jugador.position.x = THREE.MathUtils.clamp(jugador.position.x, -lim, lim);
  jugador.position.z = THREE.MathUtils.clamp(jugador.position.z, -lim, lim);

  for (let i = monedas.length - 1; i >= 0; i--) {
    const m = monedas[i];
    m.rotation.y += dt * 2;
    if (m.position.distanceTo(jugador.position) < tuning.moneda.radioRecogida) {
      escena.remove(m);
      monedas.splice(i, 1);
      puntuacion = recoger(puntuacion, tuning.puntuacion);
      pintarHud();
      soltarMoneda();
    }
  }

  // Cámara que sigue al jugador con suavizado independiente de los FPS.
  objetivoCamara.set(jugador.position.x, tuning.camara.altura, jugador.position.z + tuning.camara.distancia);
  camara.position.lerp(objetivoCamara, 1 - Math.exp(-tuning.camara.suavizado * dt));
  camara.lookAt(jugador.position);

  renderer.render(escena, camara);
});

exponer('jugador', () => ({ x: +jugador.position.x.toFixed(2), z: +jugador.position.z.toFixed(2) }));
exponer('puntuacion', () => puntuacion);
exponer('monedas', () => monedas.length);
requestAnimationFrame(() => requestAnimationFrame(marcarListo));
