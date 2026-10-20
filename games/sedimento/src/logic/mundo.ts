// Mundo procedural: semilla → mapa de datos → campo de alturas continuo → superficie en tiles lista para hornear.
// Lógica pura. La presentación (render/terrenoHorneado.ts) solo dibuja lo que sale de aquí.
import tuning from '../data/tuning.json';
import { crearCampoAlturas, type CampoAlturas } from './alturas';
import { hornear, type ConfigHorneado, type ImagenIndices, type Superficie } from './horneado';
import { axialAMundo, Rejilla } from './hex';
import { esAgua, generarMapa, type Mapa } from './mapa';
import { conRelieve } from './relieve';

export interface Mundo {
  semilla: number;
  mapa: Mapa;
  campo: CampoAlturas;
  superficie: Superficie;
  cfg: ConfigHorneado;
  tilesU: number;
  tilesV: number;
}

/**
 * Fertilidad suave (0..1) por tile: cada hexágono de tierra reparte su fertilidad con un peso gaussiano, así el llano
 * varía sin dibujar hexágonos. Los hexágonos de agua no cuentan: la orilla no se tiñe de «sin fertilidad».
 */
export function fertilidadSuave(mapa: Mapa, campo: CampoAlturas, tileMundo: number, tilesU: number, tilesV: number): (u: number, v: number) => number {
  const nu = tilesU + 2;
  const nv = tilesV + 2;
  const suma = new Float32Array(nu * nv);
  const peso = new Float32Array(nu * nv);
  const rejilla = new Rejilla(mapa.columnas, mapa.filas);
  const R = tuning.alturas.tamanoHex;
  const radio = 2.4;
  const sigma = 0.95;
  for (let i = 0; i < rejilla.total; i++) {
    if (esAgua(mapa.terreno[i])) continue;
    const { q, r } = rejilla.axial(i);
    const p = axialAMundo(q, r, R);
    const cu = (p.x - campo.origenX) / tileMundo;
    const cv = (p.z - campo.origenZ) / tileMundo;
    for (let v = Math.max(0, Math.floor(cv - radio)); v <= Math.min(nv - 1, Math.ceil(cv + radio)); v++) {
      for (let u = Math.max(0, Math.floor(cu - radio)); u <= Math.min(nu - 1, Math.ceil(cu + radio)); u++) {
        const d2 = (u - cu) * (u - cu) + (v - cv) * (v - cv);
        const w = Math.exp(-d2 / (2 * sigma * sigma));
        suma[v * nu + u] += w * mapa.fertilidad[i];
        peso[v * nu + u] += w;
      }
    }
  }
  const valor = (u: number, v: number): number => {
    const k = v * nu + u;
    return peso[k] > 1e-3 ? suma[k] / peso[k] : 0.5;
  };
  return (u, v) => {
    const x = Math.min(nu - 2, Math.max(0, u));
    const y = Math.min(nv - 2, Math.max(0, v));
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const a = valor(i, j);
    const b = valor(i + 1, j);
    const c = valor(i, j + 1);
    const d = valor(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/** Superficie en coordenadas de tile: 1 tile = `tileMundo` unidades del campo de alturas. */
export function superficieDeCampo(campo: CampoAlturas, tileMundo: number): Superficie {
  return {
    suelo: (u, v) => campo.alturaEn(campo.origenX + u * tileMundo, campo.origenZ + v * tileMundo),
    agua: (u, v) => campo.aguaEn(campo.origenX + u * tileMundo, campo.origenZ + v * tileMundo),
  };
}

export function crearMundo(semilla: number = tuning.mapa.semilla): Mundo {
  const mapa = generarMapa({ ...tuning.mapa, semilla }, tuning.clima);
  const campo = crearCampoAlturas(mapa, tuning.alturas);
  const tile = tuning.mundo.tileMundo;
  const tilesU = Math.floor(((campo.columnas - 1) * campo.paso) / tile);
  const tilesV = Math.floor(((campo.filas - 1) * campo.paso) / tile);
  let alturaMax = 0;
  for (let i = 0; i < campo.alturas.length; i++) if (campo.alturas[i] > alturaMax) alturaMax = campo.alturas[i];
  const cfg: ConfigHorneado = {
    tilesU,
    tilesV,
    tileAncho: tuning.pantalla.tileAncho,
    tileAlto: tuning.pantalla.tileAlto,
    alturaMax: alturaMax + 0.05,
    nivelMar: campo.nivelMar,
    semilla,
    ...(({ relieve: _r, ...resto }) => resto)(tuning.horneado),
  };
  const { relieve, ...cfgHorneado } = tuning.horneado;
  const fertilidad = fertilidadSuave(mapa, campo, tile, tilesU, tilesV);
  const superficie: Superficie = { ...conRelieve(superficieDeCampo(campo, tile), tilesU, tilesV, campo.nivelMar, semilla, relieve), fertilidad };
  return { semilla, mapa, campo, superficie, cfg: { ...cfg, ...cfgHorneado, alturaMax: cfg.alturaMax + relieve.amplitud * 0.6 }, tilesU, tilesV };
}

export function hornearMundo(m: Mundo): ImagenIndices {
  return hornear(m.superficie, m.cfg);
}

/** Altura en píxeles (hacia arriba) a la que queda el suelo, o el agua, en (u, v): lo que hay que restar a la y de un sprite. */
export function alturaPx(sup: Superficie, cfg: ConfigHorneado, u: number, v: number): number {
  const agua = sup.agua(u, v);
  const suelo = sup.suelo(u, v);
  return Math.round((!Number.isNaN(agua) && agua > suelo ? agua : suelo) * cfg.pxPorAltura);
}

const seco = (sup: Superficie, u: number, v: number): boolean => {
  const a = sup.agua(u, v);
  return Number.isNaN(a) || a <= sup.suelo(u, v);
};

/**
 * Esquina (u, v) de la zona más llana y seca de `ancho`×`alto` tiles que haya a `radio` tiles de `desde` (con preferencia por la más cercana).
 * Sirve para colocar la aldea provisional; la colocación real validará con la rejilla de ocupación (P3).
 */
export function buscarLlano(
  sup: Superficie, ancho: number, alto: number, desde: { u: number; v: number }, radio: number, limites: { u: number; v: number },
): { u: number; v: number; desnivel: number } | null {
  let mejor: { u: number; v: number; desnivel: number } | null = null;
  let mejorPuntos = Infinity;
  for (let u0 = Math.max(0, Math.floor(desde.u - radio)); u0 + ancho <= Math.min(limites.u, desde.u + radio); u0 += 2) {
    for (let v0 = Math.max(0, Math.floor(desde.v - radio)); v0 + alto <= Math.min(limites.v, desde.v + radio); v0 += 2) {
      let min = Infinity;
      let max = -Infinity;
      let ok = true;
      for (let du = 0; du <= ancho && ok; du += 2) {
        for (let dv = 0; dv <= alto; dv += 2) {
          if (!seco(sup, u0 + du, v0 + dv)) { ok = false; break; }
          const h = sup.suelo(u0 + du, v0 + dv);
          if (h < min) min = h;
          if (h > max) max = h;
        }
      }
      // Gana lo más llano; a igualdad aproximada, lo más cercano a `desde` (0,002 de desnivel por tile de distancia).
      const puntos = max - min + 0.002 * Math.hypot(u0 + ancho / 2 - desde.u, v0 + alto / 2 - desde.v);
      if (ok && puntos < mejorPuntos) {
        mejorPuntos = puntos;
        mejor = { u: u0, v: v0, desnivel: max - min };
      }
    }
  }
  return mejor;
}
