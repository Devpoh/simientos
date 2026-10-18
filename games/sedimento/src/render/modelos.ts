import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ConfigRender } from './config';

/** Píxeles de un atlas de color ya leídos, para volcarlos a color de vértice. */
interface Atlas {
  ancho: number;
  alto: number;
  datos: Uint8ClampedArray;
}

/**
 * Carga modelos glTF/GLB (CC0: Kenney y KayKit) y los convierte en una geometría simple con color
 * de vértice, lista para un InstancedMesh con el material compartido de la escena:
 *  - Kenney usa materiales planos con nombre: cada nombre se traduce a un color de tuning (render.modelos.colores).
 *  - KayKit usa un atlas de degradados: se lee el color del atlas en el uv de cada vértice.
 * Un archivo que falta o falla avisa por consola y devuelve null: el juego sigue sin ese modelo.
 */
export class Modelos {
  private readonly cargador = new GLTFLoader();
  private readonly cache = new Map<string, Promise<THREE.BufferGeometry | null>>();
  private readonly atlas = new WeakMap<object, Atlas | null>();
  private readonly colores = new Map<string, THREE.Color>();
  private readonly geometrias: THREE.BufferGeometry[] = [];

  constructor(private readonly cfg: ConfigRender) {
    for (const [nombre, hex] of Object.entries(cfg.modelos.colores)) this.colores.set(nombre, new THREE.Color(hex));
  }

  /** Geometría fusionada del modelo (`kenney-nature/plant_bush.glb`); null si no se pudo cargar. Se cachea. */
  geometria(ruta: string): Promise<THREE.BufferGeometry | null> {
    let promesa = this.cache.get(ruta);
    if (!promesa) {
      promesa = this.cargar(ruta);
      this.cache.set(ruta, promesa);
    }
    return promesa;
  }

  liberar(): void {
    for (const g of this.geometrias) g.dispose();
    this.geometrias.length = 0;
    this.cache.clear();
  }

  private async cargar(ruta: string): Promise<THREE.BufferGeometry | null> {
    try {
      const gltf = await this.cargador.loadAsync(`${import.meta.env.BASE_URL}${this.cfg.modelos.carpeta}/${ruta}`);
      const geometria = this.aplanar(gltf);
      if (geometria) this.geometrias.push(geometria);
      return geometria;
    } catch (error) {
      console.warn(`Modelo no disponible (${ruta}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /** Une todas las mallas del modelo en una geometría sin índices con position, normal y color. */
  private aplanar(gltf: GLTF): THREE.BufferGeometry | null {
    gltf.scene.updateMatrixWorld(true);
    const partes: THREE.BufferGeometry[] = [];
    gltf.scene.traverse((objeto) => {
      if (!(objeto instanceof THREE.Mesh)) return;
      const geo = (objeto.geometry.index ? objeto.geometry.toNonIndexed() : objeto.geometry.clone()).applyMatrix4(objeto.matrixWorld);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const materiales = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
      const total = geo.attributes.position.count;
      const colores = new Float32Array(total * 3);
      const rangos = geo.groups.length > 0 ? geo.groups : [{ start: 0, count: total, materialIndex: 0 }];
      const c = new THREE.Color();
      for (const rango of rangos) {
        const material = materiales[rango.materialIndex ?? 0];
        for (let i = rango.start; i < rango.start + rango.count && i < total; i++) {
          this.colorDe(material, geo.attributes.uv, i, c);
          colores[i * 3] = c.r;
          colores[i * 3 + 1] = c.g;
          colores[i * 3 + 2] = c.b;
        }
      }
      const limpia = new THREE.BufferGeometry();
      limpia.setAttribute('position', geo.attributes.position);
      limpia.setAttribute('normal', geo.attributes.normal);
      limpia.setAttribute('color', new THREE.BufferAttribute(colores, 3));
      partes.push(limpia);
    });
    if (partes.length === 0) return null;
    const unida = mergeGeometries(partes, false);
    for (const p of partes) p.dispose();
    return unida;
  }

  private colorDe(material: THREE.Material, uv: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined, i: number, salida: THREE.Color): void {
    const estandar = material as THREE.MeshStandardMaterial;
    const mapa = estandar.map;
    if (mapa && uv) {
      const atlas = this.leerAtlas(mapa);
      if (atlas) {
        const px = Math.min(atlas.ancho - 1, Math.max(0, Math.round(uv.getX(i) * (atlas.ancho - 1))));
        const py = Math.min(atlas.alto - 1, Math.max(0, Math.round(uv.getY(i) * (atlas.alto - 1))));
        const k = (py * atlas.ancho + px) * 4;
        salida.setRGB(atlas.datos[k] / 255, atlas.datos[k + 1] / 255, atlas.datos[k + 2] / 255, THREE.SRGBColorSpace);
        return;
      }
    }
    const traducido = this.colores.get(material.name);
    if (traducido) salida.copy(traducido);
    else if (estandar.color) salida.copy(estandar.color);
    else salida.set(1, 1, 1);
  }

  private leerAtlas(textura: THREE.Texture): Atlas | null {
    const imagen = textura.image as CanvasImageSource & { width: number; height: number };
    const guardado = this.atlas.get(imagen);
    if (guardado !== undefined) return guardado;
    let resultado: Atlas | null = null;
    try {
      const lienzo = document.createElement('canvas');
      lienzo.width = imagen.width;
      lienzo.height = imagen.height;
      const ctx = lienzo.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(imagen, 0, 0);
        resultado = { ancho: lienzo.width, alto: lienzo.height, datos: ctx.getImageData(0, 0, lienzo.width, lienzo.height).data };
      }
    } catch (error) {
      console.warn('No se pudo leer el atlas de color:', error instanceof Error ? error.message : error);
    }
    this.atlas.set(imagen, resultado);
    return resultado;
  }
}
