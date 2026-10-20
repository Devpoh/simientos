// Colocación de sprites del atlas por su ancla. Presentación: aquí sí se usa Phaser.
import Phaser from 'phaser';
import { etapaFinal, type AtlasPixel, type Orientacion } from '../data/atlas';
import { aPantalla, centroHuella, claveOrden, claveOrdenEstructura } from '../logic/iso';

export const CLAVE_REGISTRO_ATLAS = 'atlas';
/** Valor de `estado` que pide la última etapa de obra del sprite (la terminada). */
export const ESTADO_FINAL = '@final';

export interface PedidoSprite {
  id: string;
  /** Rejilla: para `anclaEn: 'huella'`, la esquina trasera de la huella; para `pies`, el punto exacto. */
  u: number;
  v: number;
  estado?: string;
  ori?: Orientacion;
  frame?: number;
}

/** Registra cada fotograma del atlas como frame con nombre en su textura (`atlas-N`). */
export function registrarFotogramas(scene: Phaser.Scene, atlas: AtlasPixel): void {
  for (const [clave, f] of Object.entries(atlas.frames)) {
    const textura = scene.textures.get(`atlas-${f.atlas}`);
    textura.add(clave, 0, f.x, f.y, f.w, f.h);
  }
}

/** Clave del fotograma pedido; por defecto, el primer estado y la primera orientación. */
function resolver(atlas: AtlasPixel, p: PedidoSprite): string {
  const s = atlas.sprites[p.id];
  if (!s) throw new Error(`sprite desconocido: ${p.id}`);
  const estado = p.estado === ESTADO_FINAL ? (etapaFinal(s) ?? Object.keys(s.estados)[0]) : (p.estado ?? Object.keys(s.estados)[0]);
  const orientaciones = s.estados[estado]?.orientaciones;
  if (!orientaciones) throw new Error(`${p.id}: estado desconocido ${estado}`);
  const ori = (p.ori ?? Object.keys(orientaciones)[0]) as Orientacion;
  const claves = orientaciones[ori];
  if (!claves) throw new Error(`${p.id}/${estado}: orientación desconocida ${ori}`);
  return claves[(p.frame ?? 0) % claves.length];
}

/**
 * Crea la imagen en su sitio: origen en el ancla del fotograma, posición a píxel entero y
 * profundidad = clave de orden u+v (vértice frontal en estructuras, pies en lo puntual).
 */
export function colocar(scene: Phaser.Scene, atlas: AtlasPixel, p: PedidoSprite): Phaser.GameObjects.Image {
  const clave = resolver(atlas, p);
  const s = atlas.sprites[p.id];
  const f = atlas.frames[clave];
  const sobreHuella = s.anclaEn === 'huella';
  const c = sobreHuella ? centroHuella(p.u, p.v, s.huella) : { u: p.u, v: p.v };
  const pos = aPantalla(c.u, c.v);
  const img = scene.add.image(Math.round(pos.x), Math.round(pos.y), `atlas-${f.atlas}`, clave);
  img.setOrigin(f.ancla.x / f.w, f.ancla.y / f.h);
  img.setDepth(sobreHuella ? claveOrdenEstructura(p.u, p.v, s.huella) : claveOrden(p.u, p.v));
  return img;
}
