import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import tuning from './data/tuning.json';
import { exponer, marcarListo } from './core/test-hooks';
import { crearRng } from './logic/azar';
import { catalogoEdificios } from './render/edificios';
import { catalogoVegetacion } from './render/vegetacion';

// Galería de modelos (R18): `?galeria`. Pone en fila los modelos propios y los de los paquetes
// CC0 con la misma luz que el juego, para compararlos y elegir. No forma parte de la partida.

/** Separación entre modelos de una fila y entre filas (unidades = 1 hexágono). */
const PASO = 1.8;
const ENTRE_FILAS = 2.6;

interface Fila {
  titulo: string;
  modelos: { nombre: string; crear: () => Promise<THREE.Object3D> }[];
}

const cfg = tuning.render;
const cargador = new GLTFLoader();
const materialPropio = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, side: THREE.DoubleSide });

const propio = (geo: THREE.BufferGeometry) => async () => {
  const m = new THREE.Mesh(geo, materialPropio);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/** Carga un modelo de paquete y lo escala para que su altura sea comparable con los nuestros. */
const deArchivo = (ruta: string, alto: number) => async () => {
  const gltf = await cargador.loadAsync(ruta);
  const raiz = gltf.scene;
  raiz.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const caja = new THREE.Box3().setFromObject(raiz);
  const tam = caja.getSize(new THREE.Vector3());
  const escala = alto / Math.max(tam.y, 1e-3);
  raiz.scale.setScalar(escala);
  raiz.position.y = -caja.min.y * escala;
  const grupo = new THREE.Group();
  grupo.add(raiz);
  return grupo;
};

function filas(): Fila[] {
  const veg = [1, 2, 3].map((s) => catalogoVegetacion(crearRng(s * 7919)));
  const edif = catalogoEdificios(cfg);
  const k = (n: string, alto: number) => ({ nombre: `Kenney · ${n}`, crear: deArchivo(`/modelos/kenney-nature/${n}.glb`, alto) });
  const kk = (n: string, alto: number) => ({ nombre: `KayKit · ${n}`, crear: deArchivo(`/modelos/kaykit-hex/${n}.gltf`, alto) });
  return [
    { titulo: 'Palmeras propias (sesión B)', modelos: veg.map((v, i) => ({ nombre: `propia ${i + 1}`, crear: propio(v.palmera) })) },
    { titulo: 'Palmeras Kenney (CC0)', modelos: ['tree_palm', 'tree_palmBend', 'tree_palmTall', 'tree_palmShort', 'tree_palmDetailedTall', 'tree_palmDetailedShort'].filter((n) => !/Tall$|Short$/.test(n) || n.includes('Detailed')).map((n) => k(n, 1.5)) },
    { titulo: 'Árboles y coníferas propios', modelos: [...veg.map((v, i) => ({ nombre: `árbol ${i + 1}`, crear: propio(v.arbol) })), ...veg.map((v, i) => ({ nombre: `conífera ${i + 1}`, crear: propio(v.conifera) }))] },
    { titulo: 'Casas (sesión A)', modelos: [{ nombre: 'choza (mudhif)', crear: propio(edif.choza) }, { nombre: 'almacén del templo', crear: propio(edif.almacen) }] },
    { titulo: 'Obras KayKit (CC0)', modelos: ['building_dirt', 'building_scaffolding', 'building_stage_A', 'building_stage_B', 'building_stage_C', 'building_grain'].map((n) => kk(n, 0.9)) },
    { titulo: 'Objetos KayKit (CC0)', modelos: ['sack', 'barrel', 'crate_A_small', 'pallet', 'wheelbarrow', 'ladder', 'resource_lumber', 'resource_stone', 'tent', 'bucket_water'].map((n) => kk(n, 0.4)) },
    { titulo: 'Agua y nubes KayKit (CC0)', modelos: ['waterlily_A', 'waterlily_B', 'waterplant_A', 'waterplant_B', 'waterplant_C', 'cloud_small', 'rock_single_A', 'rock_single_B'].map((n) => kk(n, 0.35)) },
    { titulo: 'Cultivos y plantas Kenney (CC0)', modelos: ['crops_wheatStageA', 'crops_wheatStageB', 'crops_bambooStageA', 'crops_bambooStageB', 'lily_large', 'grass_large', 'plant_bush', 'plant_bushDetailed', 'flower_yellowA', 'flower_redA'].map((n) => k(n, 0.45)) },
    { titulo: 'Rocas, troncos y objetos Kenney (CC0)', modelos: ['rock_largeA', 'rock_largeB', 'rock_tallA', 'rock_smallA', 'ground_riverRocks', 'log', 'log_stack', 'campfire_stones', 'pot_large', 'tent_detailedOpen', 'fence_simple', 'statue_obelisk'].map((n) => k(n, 0.5)) },
  ];
}

const contenedor = document.getElementById('juego');
if (!contenedor) throw new Error('Falta #juego en index.html');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = cfg.luz.exposicion;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
contenedor.appendChild(renderer.domElement);

const escena = new THREE.Scene();
escena.background = new THREE.Color(cfg.cielo.horizonte);
escena.add(new THREE.HemisphereLight(cfg.luz.colorCielo, cfg.luz.colorSuelo, cfg.luz.intensidadHemisferio));
const sol = new THREE.DirectionalLight(cfg.luz.colorSol, cfg.luz.intensidadSol);
sol.position.set(-12, 20, 10);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 });
sol.shadow.camera.updateProjectionMatrix();
escena.add(sol, sol.target);

const suelo = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: cfg.colores.biomas.estepa, roughness: 1 }));
suelo.receiveShadow = true;
escena.add(suelo);

const camara = new THREE.PerspectiveCamera(35, contenedor.clientWidth / contenedor.clientHeight, 0.1, 400);
const control = new OrbitControls(camara, renderer.domElement);
control.enableDamping = true;

// Rótulos HTML que siguen a cada modelo en pantalla.
const rotulos: { el: HTMLDivElement; pos: THREE.Vector3 }[] = [];
const rotular = (texto: string, pos: THREE.Vector3, titulo = false) => {
  const el = document.createElement('div');
  el.textContent = texto;
  el.style.cssText = `position:absolute;transform:translate(-50%,0);white-space:nowrap;pointer-events:none;font:${titulo ? '700 14px' : '600 11px'} system-ui,sans-serif;color:${titulo ? '#2a2016' : '#3d3226'};text-shadow:0 1px 0 rgba(255,255,255,.6)`;
  contenedor.appendChild(el);
  rotulos.push({ el, pos });
};

const ayuda = document.createElement('div');
ayuda.textContent = 'Galería de modelos · arrastra para girar, rueda para acercar, botón derecho para desplazar';
ayuda.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);padding:6px 12px;background:rgba(24,20,16,.62);color:#f6ecd8;border-radius:8px;font:600 13px system-ui,sans-serif';
contenedor.appendChild(ayuda);

const lista = filas();
const anchoMax = Math.max(...lista.map((f) => f.modelos.length)) * PASO;
const fallos: string[] = [];
let cargados = 0;
await Promise.all(
  lista.map(async (fila, r) => {
    const z = r * ENTRE_FILAS;
    rotular(fila.titulo, new THREE.Vector3(-PASO, 0, z), true);
    await Promise.all(
      fila.modelos.map(async (m, c) => {
        const x = c * PASO;
        try {
          const obj = await m.crear();
          obj.position.x += x;
          obj.position.z += z;
          escena.add(obj);
          cargados++;
        } catch {
          fallos.push(m.nombre);
          console.warn(`[galería] no se pudo cargar ${m.nombre}`);
        }
        rotular(m.nombre, new THREE.Vector3(x, 0, z + 0.7));
      }),
    );
  }),
);

const centro = new THREE.Vector3(anchoMax / 2 - PASO, 0, ((lista.length - 1) * ENTRE_FILAS) / 2);
control.target.copy(centro);
camara.position.copy(centro).add(new THREE.Vector3(0, 14, 16));
sol.target.position.copy(centro);
sol.position.copy(centro).add(new THREE.Vector3(-12, 20, 10));

exponer('galeria', () => ({ filas: lista.length, cargados, fallos }));

const v = new THREE.Vector3();
let primero = true;
renderer.setAnimationLoop(() => {
  control.update();
  renderer.render(escena, camara);
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  for (const { el, pos } of rotulos) {
    v.copy(pos).project(camara);
    const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    el.style.display = visible ? 'block' : 'none';
    el.style.left = `${((v.x + 1) / 2) * w}px`;
    el.style.top = `${((1 - v.y) / 2) * h}px`;
  }
  if (primero) {
    primero = false;
    marcarListo();
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  camara.aspect = contenedor.clientWidth / contenedor.clientHeight;
  camara.updateProjectionMatrix();
});
