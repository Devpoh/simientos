import type { Rejilla } from '../hex';
import { esAgua, RECURSO, type Mapa } from '../mapa';
import { registrar } from './hechos';
import { BIENES, type ConfigSim, type EstadoSim, type Obra, type TipoEdificio } from './tipos';

// Obras por etapas: cimientos (solo trabajo) → materiales (esperan a que lleguen todos) →
// trabajo → terminada (pasa a edificio). En F05 el abastecimiento sale directo del almacén;
// en F06 lo harán los porteadores.

/** Lo que la colocación necesita saber del mundo físico. */
export interface Mundo {
  mapa: Mapa;
  rejilla: Rejilla;
}

const ocupado = (e: EstadoSim, hex: number) => e.obras.some((o) => o.hex === hex) || e.edificios.some((b) => b.hex === hex);

/** Por qué no se puede levantar `tipo` en `hex`, o null si se puede. Es lo que explica el fantasma rojo. */
export function motivoNoConstruible(e: EstadoSim, t: Mundo, tipo: TipoEdificio, hex: number, cfg: ConfigSim): string | null {
  const { mapa, rejilla } = t;
  const def = cfg.edificios[tipo];
  if (!Number.isInteger(hex) || hex < 0 || hex >= rejilla.total) return 'fuera-del-mapa';
  if (!def.terrenos.includes(mapa.terreno[hex])) return 'terreno';
  if (ocupado(e, hex)) return 'ocupado';
  if (def.fertilidadMin !== undefined && mapa.fertilidad[hex] < def.fertilidadMin) return 'poco-fertil';
  if (def.distAguaMax !== undefined && mapa.distAgua[hex] > def.distAguaMax) return 'lejos-del-agua';
  if (def.junto === 'agua' && !rejilla.vecinos(hex).some((v) => esAgua(mapa.terreno[v]))) return 'sin-agua-al-lado';
  if (def.junto === 'arcilla' && ![hex, ...rejilla.vecinos(hex)].some((v) => mapa.recursos[v] & RECURSO.arcilla)) return 'sin-arcilla-al-lado';
  return null;
}

export const puedeConstruir = (e: EstadoSim, t: Mundo, tipo: TipoEdificio, hex: number, cfg: ConfigSim) =>
  motivoNoConstruible(e, t, tipo, hex, cfg) === null;

/** Coloca una obra nueva (empieza en cimientos). Devuelve su id o el motivo por el que no se puede. */
export function colocarObra(e: EstadoSim, t: Mundo, tipo: TipoEdificio, hex: number, cfg: ConfigSim): { id: number } | { motivo: string } {
  const motivo = motivoNoConstruible(e, t, tipo, hex, cfg);
  if (motivo !== null) return { motivo };
  const obra: Obra = { id: e.siguienteId++, tipo, hex, etapa: 'cimientos', entregado: {}, trabajoHecho: 0, constructores: 0, bloqueo: null, diaInicio: e.dia };
  e.obras.push(obra);
  registrar(e, cfg.economia.maxHechos, { tipo: 'obra-colocada', sujeto: `obra:${obra.id}`, datos: { edificio: tipo, hex } });
  return { id: obra.id };
}

/**
 * Funda la aldea: un almacén ya construido junto al agua dulce y una choza por hogar alrededor.
 * Elige el sitio con más suelo edificable y fértil dentro de `radioFundacion`. Devuelve el hexágono del almacén.
 */
export function fundarAsentamiento(e: EstadoSim, t: Mundo, cfg: ConfigSim): number {
  const radio = cfg.obras.radioFundacion;
  const chozaCabe = (h: number) => puedeConstruir(e, t, 'choza', h, cfg);
  let mejor = -1;
  let mejorPuntos = -Infinity;
  for (let c = 0; c < t.rejilla.total; c++) {
    if (!puedeConstruir(e, t, 'almacen', c, cfg)) continue;
    const huecos = t.rejilla.entorno(c, radio).filter((h) => h !== c && chozaCabe(h));
    if (huecos.length < e.hogares.length) continue;
    // Pegado al agua dulce pesa más que cualquier suma de fertilidad: sin agua no hay aldea.
    const puntos = huecos.reduce((s, h) => s + 1 + t.mapa.fertilidad[h], 0) - 100 * Math.abs(t.mapa.distAgua[c] - 1);
    if (puntos > mejorPuntos) [mejor, mejorPuntos] = [c, puntos];
  }
  if (mejor === -1) throw new Error('fundarAsentamiento: no hay sitio para la aldea en este mapa');

  e.edificios.push({ id: e.siguienteId++, tipo: 'almacen', hex: mejor });
  const huecos = t.rejilla.entorno(mejor, radio).filter((h) => h !== mejor && chozaCabe(h));
  e.hogares.forEach((h, i) => {
    const hex = huecos[i];
    e.edificios.push({ id: e.siguienteId++, tipo: 'choza', hex });
    h.casa = hex;
  });
  registrar(e, cfg.economia.maxHechos, { tipo: 'fundacion', sujeto: 'ciudad', datos: { hex: mejor } });
  return mejor;
}

/** Sistema diario: abastece, asigna constructores y hace avanzar cada obra. */
export function trabajarObras(e: EstadoSim, cfg: ConfigSim): void {
  if (e.obras.length === 0) return;
  let libres = e.hogares.reduce((s, h) => s + h.adultos, 0);
  const terminadas: number[] = [];

  for (const o of e.obras) {
    const def = cfg.edificios[o.tipo];
    const cimientos = def.trabajo * cfg.obras.fraccionCimientos;
    let bloqueo: string | null = null;

    if (o.etapa === 'materiales') {
      for (const b of BIENES) {
        const falta = (def.materiales[b] ?? 0) - (o.entregado[b] ?? 0);
        if (falta <= 0) continue;
        const llega = Math.min(falta, e.almacen[b]);
        e.almacen[b] -= llega;
        o.entregado[b] = (o.entregado[b] ?? 0) + llega;
        if (llega < falta && bloqueo === null) bloqueo = `esperando:${b}`;
      }
      if (bloqueo === null) o.etapa = 'trabajo';
    }

    o.constructores = 0;
    if (bloqueo === null) {
      // Nunca más gente de la que el trabajo pendiente de la etapa necesita: el resto queda libre para otra obra.
      const tope = o.etapa === 'cimientos' ? cimientos : def.trabajo;
      o.constructores = Math.min(cfg.obras.maxConstructoresPorObra, libres, Math.ceil(tope - o.trabajoHecho - 1e-9));
      libres -= o.constructores;
      if (o.constructores === 0) bloqueo = 'sin-trabajadores';
    }

    if (bloqueo === null) {
      const tope = o.etapa === 'cimientos' ? cimientos : def.trabajo;
      o.trabajoHecho = Math.min(tope, o.trabajoHecho + o.constructores);
      if (o.etapa === 'cimientos' && o.trabajoHecho >= cimientos) o.etapa = 'materiales';
      else if (o.etapa === 'trabajo' && o.trabajoHecho >= def.trabajo) terminadas.push(o.id);
    }

    if (bloqueo !== o.bloqueo) {
      if (bloqueo !== null)
        registrar(e, cfg.economia.maxHechos, { tipo: 'obra-detenida', sujeto: `obra:${o.id}`, datos: { motivo: bloqueo, edificio: o.tipo } });
      o.bloqueo = bloqueo;
    }
  }

  for (const id of terminadas) {
    const i = e.obras.findIndex((o) => o.id === id);
    const o = e.obras[i];
    e.obras.splice(i, 1);
    e.edificios.push({ id: o.id, tipo: o.tipo, hex: o.hex });
    registrar(e, cfg.economia.maxHechos, { tipo: 'obra-terminada', sujeto: `obra:${o.id}`, datos: { edificio: o.tipo, dias: e.dia + 1 - o.diaInicio } });
  }
}
