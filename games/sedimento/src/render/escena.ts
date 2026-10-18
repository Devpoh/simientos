import * as THREE from 'three';
import type { ConfigRender } from './config';

/** Tamaño del degradado del cielo (solo importa el alto: se estira a toda la pantalla). */
const ALTO_CIELO = 256;
/** A qué distancia del mapa se coloca el sol, en radios del mapa. Solo afecta al recorte de la sombra. */
const DISTANCIA_SOL = 2;
/** Pasos de la búsqueda binaria de la distancia de cámara. */
const PASOS_ENCUADRE = 40;
const DISTANCIA_MAXIMA_CAMARA = 2000;

export interface Escena {
  readonly renderer: THREE.WebGLRenderer;
  readonly escena: THREE.Scene;
  readonly camara: THREE.PerspectiveCamera;
  renderizar(): void;
  liberar(): void;
}

function crearCielo(cfg: ConfigRender): THREE.CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = 2;
  lienzo.height = ALTO_CIELO;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el lienzo del cielo');
  const degradado = ctx.createLinearGradient(0, 0, 0, ALTO_CIELO);
  degradado.addColorStop(0, cfg.cielo.arriba);
  degradado.addColorStop(1, cfg.cielo.horizonte);
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, 2, ALTO_CIELO);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/** Renderer, luces, cielo, niebla y una cámara fija que encuadra la caja `caja` entera. */
export function crearEscena(contenedor: HTMLElement, cfg: ConfigRender, caja: THREE.Box3): Escena {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // ACES comprime los brillos como una película: la luz dorada no quema los colores claros.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.luz.exposicion;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // El sol y el terreno no se mueven: la sombra se dibuja una vez. Reactiva autoUpdate con unidades o ciclo día/noche.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const cielo = crearCielo(cfg);
  escena.background = cielo;
  escena.fog = new THREE.Fog(cfg.cielo.horizonte, cfg.cielo.nieblaCerca, cfg.cielo.nieblaLejos);

  const centro = caja.getCenter(new THREE.Vector3());
  const radio = caja.getBoundingSphere(new THREE.Sphere()).radius;

  const hemisferio = new THREE.HemisphereLight(cfg.luz.colorCielo, cfg.luz.colorSuelo, cfg.luz.intensidadHemisferio);
  escena.add(hemisferio);

  const sol = new THREE.DirectionalLight(cfg.luz.colorSol, cfg.luz.intensidadSol);
  const az = THREE.MathUtils.degToRad(cfg.luz.azimutGrados);
  const el = THREE.MathUtils.degToRad(cfg.luz.elevacionGrados);
  sol.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(radio * DISTANCIA_SOL).add(centro);
  sol.target.position.copy(centro);
  sol.castShadow = true;
  sol.shadow.mapSize.set(cfg.luz.resolucionSombra, cfg.luz.resolucionSombra);
  const c = sol.shadow.camera;
  c.left = -radio;
  c.right = radio;
  c.top = radio;
  c.bottom = -radio;
  c.near = radio * (DISTANCIA_SOL - 1);
  c.far = radio * (DISTANCIA_SOL + 1);
  // El sesgo evita el "acné" (rayas de autosombra) sin despegar la sombra de su objeto.
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.04;
  escena.add(sol, sol.target);

  const camara = new THREE.PerspectiveCamera(cfg.camara.fov, 1, cfg.camara.cerca, cfg.camara.lejos);
  const cabeceo = THREE.MathUtils.degToRad(cfg.camara.cabeceoGrados);
  const guino = THREE.MathUtils.degToRad(cfg.camara.guinoGrados);
  const direccion = new THREE.Vector3(Math.sin(guino) * Math.cos(cabeceo), Math.sin(cabeceo), Math.cos(guino) * Math.cos(cabeceo));

  const esquinas: THREE.Vector3[] = [];
  for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));
  const punto = new THREE.Vector3();

  const cabe = (distancia: number): boolean => {
    camara.position.copy(direccion).multiplyScalar(distancia).add(centro);
    camara.lookAt(centro);
    camara.updateMatrixWorld();
    const limite = 1 / cfg.camara.margen;
    return esquinas.every((e) => {
      punto.copy(e).project(camara);
      return Math.abs(punto.x) <= limite && Math.abs(punto.y) <= limite;
    });
  };

  // Cámara fija: la distancia más corta con la que las 8 esquinas del mapa caben en pantalla.
  const encuadrar = () => {
    let cerca = 0;
    let lejos = DISTANCIA_MAXIMA_CAMARA;
    for (let k = 0; k < PASOS_ENCUADRE; k++) {
      const medio = (cerca + lejos) / 2;
      if (cabe(medio)) lejos = medio;
      else cerca = medio;
    }
    cabe(lejos);
  };

  const redimensionar = () => {
    const ancho = contenedor.clientWidth || window.innerWidth;
    const alto = contenedor.clientHeight || window.innerHeight;
    if (ancho === 0 || alto === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(ancho, alto);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    encuadrar();
  };
  redimensionar();
  window.addEventListener('resize', redimensionar);

  return {
    renderer,
    escena,
    camara,
    renderizar: () => renderer.render(escena, camara),
    liberar() {
      window.removeEventListener('resize', redimensionar);
      cielo.dispose();
      sol.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
