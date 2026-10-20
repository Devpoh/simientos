// Mundo procedural: semilla → mapa de datos → campo de alturas continuo → superficie en tiles lista para hornear.
// Lógica pura. La presentación (render/terrenoHorneado.ts) solo dibuja lo que sale de aquí.
import tuning from '../data/tuning.json';
import { crearCampoAlturas, type CampoAlturas } from './alturas';
import { hornear, type ConfigHorneado, type ImagenIndices, type Superficie } from './horneado';
import { generarMapa, type Mapa } from './mapa';

export interface Mundo {
  semilla: number;
  mapa: Mapa;
  campo: CampoAlturas;
  superficie: Superficie;
  cfg: ConfigHorneado;
  tilesU: number;
  tilesV: number;
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
    ...tuning.horneado,
  };
  return { semilla, mapa, campo, superficie: superficieDeCampo(campo, tile), cfg, tilesU, tilesV };
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
