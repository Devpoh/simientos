import { Color } from 'three';
import type { Bioma } from '../logic/clima';
import { esAgua, type Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';

const suavizar = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Colores de tierra y agua. Todo sale de tuning.json → render.colores. */
export class Paleta {
  readonly biomas: Record<Bioma, Color>;
  readonly regadio: Color;
  readonly marisma: Color;
  readonly roca: Color;
  readonly lecho: Color;
  readonly lechoMar: Color;
  readonly marismaAgua: Color;
  readonly rio: Color;
  readonly lago: Color;
  readonly marCosta: Color;
  readonly marMedio: Color;
  readonly marProfundo: Color;
  readonly espuma: Color;
  readonly ladoSuperior: Color;
  readonly ladoInferior: Color;

  constructor(private readonly cfg: ConfigRender) {
    const c = cfg.colores;
    this.biomas = Object.fromEntries(Object.entries(c.biomas).map(([b, hex]) => [b, new Color(hex)])) as Record<Bioma, Color>;
    this.regadio = new Color(c.regadio);
    this.marisma = new Color(c.marisma);
    this.roca = new Color(c.roca);
    this.lecho = new Color(c.lecho);
    this.lechoMar = new Color(c.lechoMar);
    this.marismaAgua = new Color(c.marismaAgua);
    this.rio = new Color(c.rio);
    this.lago = new Color(c.lago);
    this.marCosta = new Color(c.marCosta);
    this.marMedio = new Color(c.marMedio);
    this.marProfundo = new Color(c.marProfundo);
    this.espuma = new Color(c.espuma);
    this.ladoSuperior = new Color(c.ladoSuperior);
    this.ladoInferior = new Color(c.ladoInferior);
  }

  /** Color de la cara superior del hexágono. `variacion` (±) rompe la uniformidad entre vecinos. */
  colorTapa(mapa: Mapa, i: number, variacion: number, salida: Color): Color {
    const terreno = mapa.terreno[i];
    if (esAgua(terreno)) return salida.copy(terreno === 'mar' ? this.lechoMar : this.lecho);
    const bioma = mapa.bioma[i];
    salida.copy(this.biomas[bioma]);
    switch (terreno) {
      case 'llanura':
        // La franja de regadío del río (fertilidad alta) destaca en verde sobre el desierto.
        salida.lerp(this.regadio, suavizar(0.15, 0.9, mapa.fertilidad[i]));
        break;
      case 'marisma':
        salida.copy(this.marisma);
        break;
      case 'colina':
        if (bioma !== 'nieve') salida.lerp(this.roca, 0.18);
        break;
      case 'montana':
        if (bioma !== 'nieve') salida.lerp(this.roca, 0.6);
        break;
    }
    return salida.multiplyScalar(1 + (mapa.nivel[i] - 3) * 0.012 + variacion);
  }

  /** Color de la superficie del agua: turquesa en ríos y lagos, degradado de costa a fondo en el mar. */
  colorAgua(mapa: Mapa, disp: Disposicion, i: number, variacion: number, salida: Color): Color {
    const terreno = mapa.terreno[i];
    if (terreno === 'rio') salida.copy(this.rio);
    else if (terreno === 'lago') salida.copy(this.lago);
    else {
      const d = disp.distCosta[i];
      const t = Math.min(1, Math.max(0, (d - 1) / (this.cfg.agua.profundidadMaxMar - 1)));
      if (t < 0.5) salida.copy(this.marCosta).lerp(this.marMedio, t * 2);
      else salida.copy(this.marMedio).lerp(this.marProfundo, (t - 0.5) * 2);
      if (d <= 1) salida.lerp(this.espuma, 0.3);
    }
    return salida.multiplyScalar(1 + variacion);
  }
}
