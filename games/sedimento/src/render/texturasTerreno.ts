import * as THREE from 'three';

// Texturas PBR del terreno (Poly Haven, CC0) cargadas en dos «arrays de texturas»: una capa por suelo.
// Un sampler2DArray con 8 capas ocupa una sola unidad de textura; 8 texturas sueltas × 2 mapas no cabrían.

/** Orden de las capas: es el mismo índice que usan los pesos por vértice y el shader. */
export const CAPAS_TERRENO = ['hierba', 'hierba_seca', 'arena', 'barro', 'roca', 'tierra_seca', 'grava', 'nieve'] as const;
export type CapaTerreno = (typeof CAPAS_TERRENO)[number];

export interface TexturasTerreno {
  difusas: THREE.DataArrayTexture;
  normales: THREE.DataArrayTexture;
  liberar(): void;
}

async function cargarPixeles(url: string, lado: number): Promise<Uint8ClampedArray> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`No se pudo cargar ${url} (${resp.status})`);
  const bitmap = await createImageBitmap(await resp.blob());
  const lienzo = new OffscreenCanvas(lado, lado);
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Sin contexto 2D para leer texturas');
  ctx.drawImage(bitmap, 0, 0, lado, lado);
  bitmap.close();
  return ctx.getImageData(0, 0, lado, lado).data;
}

async function cargarArray(base: string, archivo: string, lado: number, srgb: boolean): Promise<THREE.DataArrayTexture> {
  const capas = await Promise.all(CAPAS_TERRENO.map((c) => cargarPixeles(`${base}/${c}/${archivo}`, lado)));
  const datos = new Uint8Array(lado * lado * 4 * capas.length);
  capas.forEach((p, i) => datos.set(p, i * lado * lado * 4));
  const t = new THREE.DataArrayTexture(datos, lado, lado, capas.length);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export async function cargarTexturasTerreno(base: string, ladoDifusa: number, ladoNormal: number): Promise<TexturasTerreno> {
  const [difusas, normales] = await Promise.all([cargarArray(base, 'difusa.jpg', ladoDifusa, true), cargarArray(base, 'normal.jpg', ladoNormal, false)]);
  return {
    difusas,
    normales,
    liberar() {
      difusas.dispose();
      normales.dispose();
    },
  };
}
