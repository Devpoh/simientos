import { crearRng, derivarSemilla } from '../azar';
import { muestrasRect, rectsSolapan, type Rect } from '../geometria2d';
import { axialAMundo, mundoAAxial, type Rejilla } from '../hex';
import { RECURSO, type Mapa } from '../mapa';
import { registrar } from './hechos';
import { BIENES, ETAPAS_OBRA, type ConfigSim, type EstadoSim, type EtapaObra, type Obra, type TipoEdificio, type Ubicacion } from './tipos';

// Construcción libre (R21) y progresiva (R22). Las obras y los edificios están en coordenadas libres
// con su huella; las celdas de datos solo aportan reglas (terreno, fertilidad, recursos).
// Cada día, cada obra: pide los materiales de su etapa → si llegan, trabaja → si acaba la etapa, pasa a la siguiente.

/** Lo que la colocación necesita saber del mundo físico. */
export interface Mundo {
  mapa: Mapa;
  rejilla: Rejilla;
  tamanoHex: number;
  /** Altura del suelo continuo. */
  alturaEn(x: number, z: number): number;
  /** Cota del agua, o NaN si está seco. */
  aguaEn(x: number, z: number): number;
}

export type MotivoNoConstruible = 'fuera-del-mapa' | 'ocupado' | 'agua' | 'pendiente' | 'terreno' | 'poco-fertil' | 'lejos-del-agua' | 'sin-agua-al-lado' | 'sin-arcilla-al-lado';

/** Celda de datos bajo un punto, o -1 fuera del mapa. */
export function celdaEn(t: Mundo, x: number, z: number): number {
  const { q, r } = mundoAAxial(x, z, t.tamanoHex);
  return t.rejilla.indiceAxial(q, r);
}

export function huellaDe(tipo: TipoEdificio, u: Ubicacion, cfg: ConfigSim, margen = 0): Rect {
  const h = cfg.edificios[tipo].huella;
  return { cx: u.x, cz: u.z, ancho: h.ancho + margen * 2, fondo: h.fondo + margen * 2, giro: u.giro };
}

/** Por qué no se puede levantar `tipo` en `u`, o null si se puede. Es lo que explica el fantasma rojo. */
export function motivoNoConstruible(e: EstadoSim, t: Mundo, tipo: TipoEdificio, u: Ubicacion, cfg: ConfigSim): MotivoNoConstruible | null {
  const def = cfg.edificios[tipo];
  const huella = huellaDe(tipo, u, cfg);
  const muestras = muestrasRect(huella, cfg.obras.pasoMuestras);
  const celdas = muestras.map((p) => celdaEn(t, p.x, p.z));
  if (!Number.isFinite(u.x) || !Number.isFinite(u.z) || celdas.some((c) => c === -1)) return 'fuera-del-mapa';
  // rectsSolapan agranda los dos rects con el margen: la mitad en cada uno da el hueco pedido.
  const sep = cfg.obras.separacion / 2;
  const ocupa = (o: { tipo: TipoEdificio } & Ubicacion) => rectsSolapan(huella, huellaDe(o.tipo, o, cfg), sep);
  if (e.obras.some(ocupa) || e.edificios.some(ocupa)) return 'ocupado';
  if (muestras.some((p) => !Number.isNaN(t.aguaEn(p.x, p.z)))) return 'agua';
  let min = Infinity;
  let max = -Infinity;
  for (const p of muestras) {
    const h = t.alturaEn(p.x, p.z);
    min = Math.min(min, h);
    max = Math.max(max, h);
  }
  if (max - min > def.pendienteMax * Math.max(def.huella.ancho, def.huella.fondo)) return 'pendiente';
  const centro = celdaEn(t, u.x, u.z);
  if (!def.terrenos.includes(t.mapa.terreno[centro])) return 'terreno';
  if (def.fertilidadMin !== undefined && t.mapa.fertilidad[centro] < def.fertilidadMin) return 'poco-fertil';
  if (def.distAguaMax !== undefined && t.mapa.distAgua[centro] > def.distAguaMax) return 'lejos-del-agua';
  if (def.junto) {
    const alrededor = muestrasRect(huellaDe(tipo, u, cfg, cfg.obras.alcanceJunto), cfg.obras.pasoMuestras);
    if (def.junto === 'agua' && !alrededor.some((p) => !Number.isNaN(t.aguaEn(p.x, p.z)))) return 'sin-agua-al-lado';
    if (def.junto === 'arcilla' && !alrededor.some((p) => {
      const c = celdaEn(t, p.x, p.z);
      return c !== -1 && (t.mapa.recursos[c] & RECURSO.arcilla) !== 0;
    }))
      return 'sin-arcilla-al-lado';
  }
  return null;
}

export const puedeConstruir = (e: EstadoSim, t: Mundo, tipo: TipoEdificio, u: Ubicacion, cfg: ConfigSim) => motivoNoConstruible(e, t, tipo, u, cfg) === null;

/** Coloca una obra nueva (empieza en «plano»). Devuelve su id o el motivo por el que no se puede. */
export function colocarObra(e: EstadoSim, t: Mundo, tipo: TipoEdificio, u: Ubicacion, cfg: ConfigSim): { id: number } | { motivo: MotivoNoConstruible } {
  const motivo = motivoNoConstruible(e, t, tipo, u, cfg);
  if (motivo !== null) return { motivo };
  const obra: Obra = {
    id: e.siguienteId++,
    tipo,
    x: u.x,
    z: u.z,
    giro: u.giro,
    celda: celdaEn(t, u.x, u.z),
    etapa: 'plano',
    trabajoEtapa: 0,
    entregado: {},
    trabajoHecho: 0,
    constructores: 0,
    bloqueo: null,
    diaInicio: e.dia,
    suspendida: false,
    prioridad: 0,
  };
  e.obras.push(obra);
  registrar(e, cfg.economia.maxHechos, { tipo: 'obra-colocada', sujeto: `obra:${obra.id}`, datos: { edificio: tipo, x: u.x, z: u.z } });
  return { id: obra.id };
}

/** Cancela una obra: los materiales ya entregados vuelven al almacén. */
export function cancelarObra(e: EstadoSim, id: number, cfg: ConfigSim): boolean {
  const i = e.obras.findIndex((o) => o.id === id);
  if (i === -1) return false;
  const o = e.obras[i];
  for (const b of BIENES) e.almacen[b] += o.entregado[b] ?? 0;
  e.obras.splice(i, 1);
  registrar(e, cfg.economia.maxHechos, { tipo: 'obra-cancelada', sujeto: `obra:${id}`, datos: { edificio: o.tipo, etapa: o.etapa } });
  return true;
}

export function suspenderObra(e: EstadoSim, id: number, suspendida: boolean): boolean {
  const o = e.obras.find((x) => x.id === id);
  if (!o) return false;
  o.suspendida = suspendida;
  return true;
}

export function priorizarObra(e: EstadoSim, id: number, prioridad: number): boolean {
  const o = e.obras.find((x) => x.id === id);
  if (!o) return false;
  o.prioridad = prioridad;
  return true;
}

/** Materiales que la obra debe tener entregados para trabajar en su etapa actual (acumulado hasta ella). */
export function materialesHastaEtapa(cfg: ConfigSim, tipo: TipoEdificio, etapa: EtapaObra): Partial<Record<(typeof BIENES)[number], number>> {
  const hasta = ETAPAS_OBRA.indexOf(etapa);
  const fraccion = ETAPAS_OBRA.slice(0, hasta + 1).reduce((s, et) => s + cfg.obras.fraccionMateriales[et], 0);
  const res: Partial<Record<(typeof BIENES)[number], number>> = {};
  for (const b of BIENES) {
    const total = cfg.edificios[tipo].materiales[b] ?? 0;
    if (total > 0) res[b] = Math.min(total, Math.ceil(total * fraccion - 1e-9));
  }
  return res;
}

/** Progreso total de la obra (0..1): lo usa el render para levantar la maqueta por etapas. */
export function progresoObra(o: Obra, cfg: ConfigSim): number {
  return Math.min(1, o.trabajoHecho / cfg.edificios[o.tipo].trabajo);
}

/** Sistema diario: abastece, asigna constructores y hace avanzar cada obra por sus etapas. */
export function trabajarObras(e: EstadoSim, cfg: ConfigSim): void {
  if (e.obras.length === 0) return;
  let libres = e.hogares.reduce((s, h) => s + h.adultos, 0);
  const terminadas: number[] = [];
  // Las obras prioritarias reciben antes material y gente; a igual prioridad, la más antigua.
  const orden = [...e.obras].sort((a, b) => b.prioridad - a.prioridad || a.id - b.id);

  for (const o of orden) {
    const def = cfg.edificios[o.tipo];
    let bloqueo: string | null = o.suspendida ? 'suspendida' : null;

    if (bloqueo === null) {
      const pedido = materialesHastaEtapa(cfg, o.tipo, o.etapa);
      for (const b of BIENES) {
        const falta = (pedido[b] ?? 0) - (o.entregado[b] ?? 0);
        if (falta <= 0) continue;
        const llega = Math.min(falta, e.almacen[b]);
        e.almacen[b] -= llega;
        o.entregado[b] = (o.entregado[b] ?? 0) + llega;
        if (llega < falta && bloqueo === null) bloqueo = `esperando:${b}`;
      }
    }

    o.constructores = 0;
    const tope = def.trabajo * cfg.obras.fraccionTrabajo[o.etapa];
    if (bloqueo === null) {
      // Nunca más gente de la que la etapa necesita: el resto queda libre para otra obra.
      o.constructores = Math.min(cfg.obras.maxConstructoresPorObra, libres, Math.max(1, Math.ceil(tope - o.trabajoEtapa - 1e-9)));
      libres -= o.constructores;
      if (o.constructores === 0) bloqueo = 'sin-trabajadores';
    }

    if (bloqueo === null) {
      const aporte = Math.min(o.constructores, tope - o.trabajoEtapa);
      o.trabajoEtapa += aporte;
      o.trabajoHecho += aporte;
      if (o.trabajoEtapa >= tope - 1e-9) {
        const siguiente = ETAPAS_OBRA.indexOf(o.etapa) + 1;
        if (siguiente >= ETAPAS_OBRA.length) terminadas.push(o.id);
        else {
          o.etapa = ETAPAS_OBRA[siguiente];
          o.trabajoEtapa = 0;
          registrar(e, cfg.economia.maxHechos, { tipo: 'obra-etapa', sujeto: `obra:${o.id}`, datos: { etapa: o.etapa } });
        }
      }
    }

    if (bloqueo !== o.bloqueo) {
      if (bloqueo !== null) registrar(e, cfg.economia.maxHechos, { tipo: 'obra-detenida', sujeto: `obra:${o.id}`, datos: { motivo: bloqueo, edificio: o.tipo } });
      o.bloqueo = bloqueo;
    }
  }

  for (const id of terminadas) {
    const i = e.obras.findIndex((o) => o.id === id);
    const o = e.obras[i];
    e.obras.splice(i, 1);
    e.edificios.push({ id: o.id, tipo: o.tipo, x: o.x, z: o.z, giro: o.giro, celda: o.celda });
    registrar(e, cfg.economia.maxHechos, { tipo: 'obra-terminada', sujeto: `obra:${o.id}`, datos: { edificio: o.tipo, dias: e.dia + 1 - o.diaInicio } });
  }
}

/**
 * Funda la aldea: un almacén ya construido junto al agua dulce y una choza por hogar alrededor,
 * en posiciones y giros libres. Elige la celda con más suelo fértil en la que caben todas.
 * Devuelve la ubicación del almacén.
 */
export function fundarAsentamiento(e: EstadoSim, t: Mundo, cfg: ConfigSim): Ubicacion {
  const rng = crearRng(derivarSemilla(e.semilla, 'fundacion'));
  const radio = cfg.obras.radioFundacion;
  let mejor: { u: Ubicacion; puntos: number } | null = null;
  for (let c = 0; c < t.rejilla.total; c++) {
    // Pegado al agua dulce: sin agua no hay aldea.
    if (t.mapa.distAgua[c] !== 1) continue;
    const { q, r } = t.rejilla.axial(c);
    const u = { ...axialAMundo(q, r, t.tamanoHex), giro: 0 };
    if (!puedeConstruir(e, t, 'almacen', u, cfg)) continue;
    let puntos = 0;
    for (const v of t.rejilla.entorno(c, Math.ceil(radio / t.tamanoHex))) puntos += t.mapa.terreno[v] === 'llanura' ? 1 + t.mapa.fertilidad[v] : 0;
    if (!mejor || puntos > mejor.puntos) mejor = { u, puntos };
  }
  if (!mejor) throw new Error('fundarAsentamiento: no hay sitio para la aldea en este mapa');

  const almacen = mejor.u;
  e.edificios.push({ id: e.siguienteId++, tipo: 'almacen', ...almacen, celda: celdaEn(t, almacen.x, almacen.z) });
  for (const h of e.hogares) {
    let puesta = false;
    for (let intento = 0; intento < 400 && !puesta; intento++) {
      const ang = rng() * Math.PI * 2;
      const dist = radio * (0.35 + 0.65 * Math.sqrt(rng()));
      const u = { x: almacen.x + Math.cos(ang) * dist, z: almacen.z + Math.sin(ang) * dist, giro: rng() * Math.PI * 2 };
      if (!puedeConstruir(e, t, 'choza', u, cfg)) continue;
      const id = e.siguienteId++;
      e.edificios.push({ id, tipo: 'choza', ...u, celda: celdaEn(t, u.x, u.z) });
      h.casa = id;
      puesta = true;
    }
  }
  registrar(e, cfg.economia.maxHechos, { tipo: 'fundacion', sujeto: 'ciudad', datos: { x: almacen.x, z: almacen.z } });
  return almacen;
}
