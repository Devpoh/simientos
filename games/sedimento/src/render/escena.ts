import * as THREE from 'three';
import { crearControlCamara, type ControlCamara } from './camara';
import type { ConfigRender } from './config';

/** Tamaño del degradado del cielo (solo importa el alto: se estira a toda la pantalla). */
const ALTO_CIELO = 256;
/** A qué distancia del mapa se coloca el sol, en radios del mapa. Solo afecta al recorte de la sombra. */
const DISTANCIA_SOL = 2;

export interface Escena {
  readonly renderer: THREE.WebGLRenderer;
  readonly escena: THREE.Scene;
  readonly camara: THREE.PerspectiveCamera;
  readonly control: ControlCamara;
  actualizar(dt: number): void;
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

/** Renderer, luces, cielo, niebla y una cámara de estrategia que parte encuadrando la caja `caja` entera. */
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
  sol.shadow.intensity = cfg.luz.intensidadSombra;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.04;
  escena.add(sol, sol.target);
  const control = crearControlCamara(renderer.domElement, cfg, caja);
  const camara = control.camara;
  const niebla = escena.fog as THREE.Fog;

  const redimensionar = () => {
    const ancho = contenedor.clientWidth || window.innerWidth;
    const alto = contenedor.clientHeight || window.innerHeight;
    if (ancho === 0 || alto === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(ancho, alto);
    control.redimensionar(ancho, alto);
  };
  redimensionar();
  window.addEventListener('resize', redimensionar);

  return {
    renderer,
    escena,
    camara,
    control,
    actualizar(dt) {
      control.actualizar(dt);
      // La niebla se mide desde la cámara: de cerca no tapa el mapa, de lejos funde el horizonte del océano.
      niebla.near = control.distancia + cfg.cielo.nieblaCerca;
      niebla.far = control.distancia + cfg.cielo.nieblaLejos;
    },
    renderizar: () => renderer.render(escena, camara),
    liberar() {
      window.removeEventListener('resize', redimensionar);
      control.liberar();
      cielo.dispose();
      sol.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
