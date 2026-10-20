import { crearRng, derivarSemilla, enteroEntre, hashTexto, type Rng } from './azar';
import { clasificarBioma, climaEnAltitud, FERTILIDAD_BIOMA, type Bioma, type ConfigClima } from './clima';
import { Rejilla } from './hex';
import { fbm } from './ruido';

// Generación procedural del valle: montañas al norte, llanura aluvial en el centro,
// el río que baja hasta el golfo al sur, un lago, marismas en la desembocadura y estepa
// lejos del agua. El bioma de cada hexágono sale del clima (ver clima.ts).
// Todo sale de la semilla: misma semilla → mismo mapa, y cada partida usa una semilla nueva.

/** Forma física del hexágono. La cubierta climática (desierto, bosque, tundra…) es el bioma. */
export type Terreno = 'mar' | 'rio' | 'lago' | 'marisma' | 'llanura' | 'colina' | 'montana';
export type Vegetacion = 'ninguna' | 'palmeral' | 'bosque' | 'canaveral';

/** Recursos naturales por hexágono como banderas de bits (se combinan con |). */
export const RECURSO = { arcilla: 1, cana: 2, peces: 4, madera: 8, piedra: 16 } as const;
export type NombreRecurso = keyof typeof RECURSO;

export interface ConfigMapa {
  semilla: number;
  columnas: number;
  filas: number;
  niveles: number;
  escalaRuido: number;
  octavas: number;
  bordeMontanas: number;
  bordeMar: number;
  nivelMar: number;
  umbralMontana: number;
  umbralColina: number;
  /** Cada semilla desplaza los bordes de montaña y mar hasta ± este valor. */
  variacionBordes: number;
  /** Cuánto ondulan (fracción del alto) las fronteras sierra–valle y costa–mar a lo largo del mapa. */
  ondulacionBordes: number;
  lagosMin: number;
  lagosMax: number;
  radioLagoMin: number;
  radioLagoMax: number;
  /** Probabilidad de un segundo río que confluye con el primero o llega al mar. */
  probSegundoRio: number;
  anchoMarisma: number;
  /** Hasta cuántos saltos de la desembocadura se extiende la marisma costera (el delta). */
  radioDelta: number;
  probPalmeral: number;
  probArboleda: number;
  fertilidadRibera: number;
  caidaFertilidad: number;
  /** Exponente altura → metros: >1 deja la llanura cerca del nivel del mar y eleva las cumbres. */
  curvaAltitud: number;
  costa: ConfigCosta;
  yacimientos: Record<TipoYacimiento, ConfigYacimiento>;
}

/** Cuántos grupos de un yacimiento hay en el mapa y de cuántas celdas cada uno. */
export interface ConfigYacimiento {
  grupos: number[];
  tamano: number[];
}

/** Cómo se diseña la silueta de la costa: cuántos accidentes y de qué tamaño (fracciones del ancho y del alto del mapa). */
export interface ConfigCosta {
  rasgosMin: number;
  rasgosMax: number;
  anchoMin: number;
  anchoMax: number;
  /** [mín, máx] de cuánto entra o sale la costa, como fracción del alto. */
  cabo: number[];
  bahia: number[];
  golfo: number[];
  /** Límites del perfil (fracción del alto): ni tan al norte que toque la sierra, ni tan al sur que no quede orilla. */
  perfilMin: number;
  perfilMax: number;
}

/**
 * Yacimientos como datos (R73): metales en la montaña, piedra y mármol en las colinas y carbón en las cuencas
 * (llanura baja al pie de las sierras). Una celda tiene como mucho un yacimiento; `riqueza` va de 1 a 3.
 */
export type TipoYacimiento = 'cobre' | 'estano' | 'hierro' | 'plata' | 'oro' | 'piedra' | 'marmol' | 'carbon';

export interface Yacimiento {
  tipo: TipoYacimiento;
  celda: number;
  riqueza: 1 | 2 | 3;
}

export const TIPOS_YACIMIENTO: readonly TipoYacimiento[] = ['cobre', 'estano', 'hierro', 'plata', 'oro', 'piedra', 'marmol', 'carbon'];

export type TipoRasgoCosta = 'cabo' | 'bahia' | 'golfo';

/** Un accidente de la costa. `magnitud` > 0 saca la tierra hacia el mar (cabo); < 0 mete el mar tierra adentro. */
export interface RasgoCosta {
  tipo: TipoRasgoCosta;
  /** Columna central, y anchura en columnas. */
  columna: number;
  ancho: number;
  magnitud: number;
}

/**
 * La silueta del territorio como DATO de diseño (R001): afecta a la navegación y al comercio, no es del render.
 * `perfil[col]` es la fracción del alto (0 = norte, 1 = sur) donde empieza el mar en esa columna.
 */
export interface Costa {
  perfil: number[];
  rasgos: RasgoCosta[];
}

/** Estado del mapa como arrays planos indexados por hexágono (serializable con JSON). */
export interface Mapa {
  semilla: number;
  columnas: number;
  filas: number;
  terreno: Terreno[];
  /** Escalón de altura entero (0 = nivel del mar) para el relieve en terrazas. */
  nivel: number[];
  /** Altura continua 0..1 antes de cuantizar; útil para matices de color. */
  altura: number[];
  vegetacion: Vegetacion[];
  bioma: Bioma[];
  /** Temperatura media anual (°C) y precipitación anual (mm) del hexágono. */
  temperatura: number[];
  precipitacion: number[];
  /** Altitud en metros sobre el nivel del mar. */
  metros: number[];
  fertilidad: number[];
  salinidad: number[];
  /** Saltos hasta el agua dulce más cercana (río o lago). */
  distAgua: number[];
  recursos: number[];
  /** Cauces de los ríos (el principal primero), del nacimiento a la desembocadura o la confluencia. */
  rios: number[][];
  costa: Costa;
  yacimientos: Yacimiento[];
}

export const esAgua = (t: Terreno) => t === 'mar' || t === 'rio' || t === 'lago';

export function generarMapa(base: ConfigMapa, climaBase: ConfigClima): Mapa {
  const cfg = variarConfig(base);
  const clima = variarClima(climaBase, cfg.semilla);
  const rejilla = new Rejilla(cfg.columnas, cfg.filas);
  const n = rejilla.total;
  const costa = generarCosta(cfg);
  const altura = calcularAlturas(cfg, rejilla, costa);

  // Mar: lo bajo que está conectado con el borde sur.
  const ultima = cfg.filas - 1;
  for (let c = 0; c < cfg.columnas; c++) {
    const i = rejilla.indice(c, ultima);
    altura[i] = Math.min(altura[i], cfg.nivelMar - 0.05);
  }
  const bordeSur = Array.from({ length: cfg.columnas }, (_, c) => rejilla.indice(c, ultima));
  const distMarBajo = rejilla.distanciasDesde(bordeSur, (i) => altura[i] < cfg.nivelMar);
  const terreno = new Array<Terreno>(n).fill('llanura');
  for (let i = 0; i < n; i++) {
    if (distMarBajo[i] !== Infinity) terreno[i] = 'mar';
    else if (altura[i] < cfg.nivelMar) altura[i] = cfg.nivelMar + 0.02; // charcos sueltos → llanura baja
  }

  const rngRio = crearRng(derivarSemilla(cfg.semilla, 'rio'));
  const principal = enteroEntre(rngRio, Math.floor(cfg.columnas * 0.3), Math.floor(cfg.columnas * 0.7));
  const rios = [trazarRio(cfg, rejilla, altura, terreno, principal, rngRio)];
  if (rngRio() < cfg.probSegundoRio) {
    // Nace lejos del primero, en el otro lado del valle.
    const lado = principal < cfg.columnas / 2 ? 1 : -1;
    const col = Math.max(4, Math.min(cfg.columnas - 5, principal + lado * enteroEntre(rngRio, 12, 18)));
    rios.push(trazarRio(cfg, rejilla, altura, terreno, col, rngRio));
  }

  const rngLago = crearRng(derivarSemilla(cfg.semilla, 'lago'));
  const lagos = enteroEntre(rngLago, cfg.lagosMin, cfg.lagosMax);
  for (let k = 0; k < lagos; k++) colocarLago(cfg, rejilla, altura, terreno, rios[k % rios.length], rngLago);

  const dulce: number[] = [];
  const salada: number[] = [];
  for (let i = 0; i < n; i++) {
    if (terreno[i] === 'rio' || terreno[i] === 'lago') dulce.push(i);
    else if (terreno[i] === 'mar') salada.push(i);
  }
  const distAgua = rejilla.distanciasDesde(dulce);
  const distMar = rejilla.distanciasDesde(salada);
  // El delta: los tramos de río que ya rozan el mar. La marisma costera solo crece alrededor de ellos;
  // el resto de la costa queda como playa (una franja continua de pantano se veía artificial).
  const delta = dulce.filter((i) => terreno[i] === 'rio' && distMar[i] <= cfg.anchoMarisma);
  const distDelta = rejilla.distanciasDesde(delta);

  // Relieve y usos del suelo.
  const rngSuelo = crearRng(derivarSemilla(cfg.semilla, 'suelo'));
  for (let i = 0; i < n; i++) {
    if (esAgua(terreno[i])) continue;
    const h = altura[i];
    if (h >= cfg.umbralMontana) terreno[i] = 'montana';
    else if (h >= cfg.umbralColina) terreno[i] = 'colina';
    else if (distMar[i] <= cfg.anchoMarisma && distDelta[i] <= cfg.radioDelta && h < cfg.nivelMar + 0.12) terreno[i] = 'marisma';
    else if (distAgua[i] === 1 && vecinoDe(rejilla, terreno, i, 'lago') && rngSuelo() < 0.5) terreno[i] = 'marisma';
  }

  // Clima por altitud → bioma.
  const metros = altura.map((h) => {
    const t = Math.min(1, Math.max(0, (h - cfg.nivelMar) / (1 - cfg.nivelMar)));
    return Math.round(clima.alturaMaxMetros * Math.pow(t, cfg.curvaAltitud));
  });
  const temperatura = new Array<number>(n);
  const precipitacion = new Array<number>(n);
  const bioma = new Array<Bioma>(n);
  for (let i = 0; i < n; i++) {
    const c = climaEnAltitud(clima, metros[i]);
    temperatura[i] = Math.round(c.temperatura * 10) / 10 + 0;
    precipitacion[i] = Math.round(c.precipitacion);
    bioma[i] = clasificarBioma(c.temperatura, c.precipitacion);
  }

  const rngVeg = crearRng(derivarSemilla(cfg.semilla, 'vegetacion'));
  const vegetacion = new Array<Vegetacion>(n).fill('ninguna');
  for (let i = 0; i < n; i++) {
    const t = terreno[i];
    const r = rngVeg();
    const b = bioma[i];
    const boscoso = b === 'bosqueTemplado' || b === 'taiga' || b === 'selva' || b === 'mediterraneo';
    if (t === 'marisma' && r < 0.7) vegetacion[i] = 'canaveral';
    // La palmera datilera necesita calor y agua cerca.
    else if (t === 'llanura' && distAgua[i] <= 2 && temperatura[i] >= 18 && r < cfg.probPalmeral) vegetacion[i] = 'palmeral';
    else if ((t === 'colina' || t === 'llanura') && boscoso && r < cfg.probArboleda) vegetacion[i] = 'bosque';
    else if (t === 'montana' && boscoso && r < cfg.probArboleda * 0.6) vegetacion[i] = 'bosque';
  }

  const fertilidad = new Array<number>(n).fill(0);
  const recursos = new Array<number>(n).fill(0);
  const nivel = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const t = terreno[i];
    fertilidad[i] = redondear(fertilidadBase(cfg, t, bioma[i], distAgua[i]));
    recursos[i] = recursosDe(t, vegetacion[i], distAgua[i]);
    nivel[i] = t === 'mar' ? 0 : cuantizar(cfg, altura[i]);
  }
  const yacimientos = colocarYacimientos(cfg, rejilla, terreno, altura);
  // El río y el lago van encajados: nunca más altos que la orilla más baja que los rodea.
  for (const i of dulce) {
    let minimo = nivel[i];
    for (const v of rejilla.vecinos(i)) if (!esAgua(terreno[v])) minimo = Math.min(minimo, nivel[v]);
    nivel[i] = minimo;
  }

  return {
    semilla: cfg.semilla,
    columnas: cfg.columnas,
    filas: cfg.filas,
    terreno,
    nivel,
    altura: altura.map(redondear),
    vegetacion,
    bioma,
    temperatura,
    precipitacion,
    metros,
    fertilidad,
    salinidad: new Array<number>(n).fill(0),
    distAgua: distAgua.map((d) => (d === Infinity ? -1 : d)),
    recursos,
    rios,
    costa,
    yacimientos,
  };
}

/** Cada partida tiene un clima medio algo distinto: más cálido, más seco… */
function variarClima(cfg: ConfigClima, semilla: number): ConfigClima {
  const rng = crearRng(derivarSemilla(semilla, 'clima'));
  return {
    ...cfg,
    temperaturaBase: cfg.temperaturaBase + (rng() * 2 - 1) * cfg.variacionTemperatura,
    precipitacionBase: cfg.precipitacionBase * (1 + (rng() * 2 - 1) * cfg.variacionLluvia),
  };
}

/** Variación por semilla de la forma general del valle, para que ningún mapa se repita. */
function variarConfig(cfg: ConfigMapa): ConfigMapa {
  const rng = crearRng(derivarSemilla(cfg.semilla, 'variacion'));
  const desvio = () => (rng() * 2 - 1) * cfg.variacionBordes;
  return { ...cfg, bordeMontanas: cfg.bordeMontanas + desvio(), bordeMar: Math.max(0.08, cfg.bordeMar + desvio()) };
}

/**
 * Reparte los yacimientos (R73) con su propio generador de azar: cada tipo tiene de 1 a N grupos de celdas contiguas.
 * Oro y plata solo en la mitad más alta de la sierra; el carbón, en cuencas (llanura baja a 1–3 saltos de una colina o sierra).
 */
function colocarYacimientos(cfg: ConfigMapa, rejilla: Rejilla, terreno: Terreno[], altura: number[]): Yacimiento[] {
  const rng = crearRng(derivarSemilla(cfg.semilla, 'yacimientos'));
  const n = rejilla.total;
  const ocupada = new Set<number>();
  const montanas = [...Array(n).keys()].filter((i) => terreno[i] === 'montana');
  const colinas = [...Array(n).keys()].filter((i) => terreno[i] === 'colina');
  const altas = [...montanas].sort((a, b) => altura[b] - altura[a]).slice(0, Math.max(1, Math.ceil(montanas.length / 2)));
  const altasSet = new Set(altas);
  const relieve = [...Array(n).keys()].filter((i) => terreno[i] === 'montana' || terreno[i] === 'colina');
  const alPie = rejilla.distanciasDesde(relieve);
  const cuencas = [...Array(n).keys()].filter((i) => {
    if (terreno[i] !== 'llanura' || alPie[i] < 1 || alPie[i] > 3) return false;
    const vecinas = rejilla.vecinos(i).filter((v) => terreno[v] !== 'mar');
    const media = vecinas.reduce((acum, v) => acum + altura[v], 0) / Math.max(1, vecinas.length);
    return altura[i] <= media + 0.005;
  });
  const cuencasSet = new Set(cuencas);
  const elegibles: Record<TipoYacimiento, (i: number) => boolean> = {
    cobre: (i) => terreno[i] === 'montana',
    estano: (i) => terreno[i] === 'montana',
    hierro: (i) => terreno[i] === 'montana',
    plata: (i) => altasSet.has(i),
    oro: (i) => altasSet.has(i),
    piedra: (i) => terreno[i] === 'colina',
    marmol: (i) => terreno[i] === 'colina',
    carbon: (i) => cuencasSet.has(i),
  };
  const lista: Yacimiento[] = [];
  for (const tipo of TIPOS_YACIMIENTO) {
    const c = cfg.yacimientos[tipo];
    const grupos = enteroEntre(rng, c.grupos[0], c.grupos[1]);
    const candidatas = (tipo === 'carbon' ? cuencas : tipo === 'oro' || tipo === 'plata' ? altas : tipo === 'piedra' || tipo === 'marmol' ? colinas : montanas);
    for (let g = 0; g < grupos; g++) {
      const libres = candidatas.filter((i) => !ocupada.has(i));
      if (libres.length === 0) break;
      const semilla = libres[Math.floor(rng() * libres.length)];
      const tam = enteroEntre(rng, c.tamano[0], c.tamano[1]);
      const grupo = [semilla];
      ocupada.add(semilla);
      for (let k = 0; k < grupo.length && grupo.length < tam; k++) {
        for (const v of rejilla.vecinos(grupo[k])) {
          if (grupo.length >= tam) break;
          if (!ocupada.has(v) && elegibles[tipo](v)) {
            ocupada.add(v);
            grupo.push(v);
          }
        }
      }
      // La riqueza baja del centro del grupo hacia los bordes.
      grupo.forEach((celda, k) => lista.push({ tipo, celda, riqueza: (k === 0 ? 3 : k < 3 ? 2 : 1) as 1 | 2 | 3 }));
    }
  }
  return lista;
}

/** Perfil de la costa en una columna (con posición fraccionaria: las filas impares van medio hexágono desplazadas). */
export function perfilEn(costa: Costa, x: number): number {
  const p = costa.perfil;
  const c = Math.min(p.length - 1, Math.max(0, x));
  const a = Math.floor(c);
  const b = Math.min(p.length - 1, a + 1);
  return p[a] + (p[b] - p[a]) * (c - a);
}

/** Ventana suave (0..1) centrada en `centro`: cos² dentro de `ancho` columnas, 0 fuera. */
function ventana(col: number, centro: number, ancho: number): number {
  const d = Math.abs(col - centro) / (ancho / 2);
  if (d >= 1) return 0;
  const c = Math.cos((d * Math.PI) / 2);
  return c * c;
}

/**
 * Diseña la costa: la línea base de la configuración, una ondulación suave y 2–4 accidentes (cabos, bahías, golfos).
 * Siempre hay al menos un cabo y una bahía, repartidos por el ancho sin solaparse del todo.
 * El perfil se acota para que ni la sierra ni la fila sur queden afectadas (las montañas no encogen, R001).
 */
export function generarCosta(cfg: ConfigMapa): Costa {
  const c = cfg.costa;
  const rng = crearRng(derivarSemilla(cfg.semilla, 'costa'));
  const semillaBordes = derivarSemilla(cfg.semilla, 'bordes');
  const n = enteroEntre(rng, c.rasgosMin, c.rasgosMax);
  const tipos: TipoRasgoCosta[] = ['cabo', 'bahia'];
  const otros: TipoRasgoCosta[] = ['cabo', 'bahia', 'golfo'];
  while (tipos.length < n) tipos.push(otros[Math.floor(rng() * otros.length)]);
  // Orden aleatorio de los tipos y un hueco por accidente a lo ancho del mapa.
  for (let i = tipos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tipos[i], tipos[j]] = [tipos[j], tipos[i]];
  }
  const hueco = cfg.columnas / n;
  const rasgos: RasgoCosta[] = tipos.map((tipo, k) => {
    const ancho = Math.round(cfg.columnas * (c.anchoMin + rng() * (c.anchoMax - c.anchoMin)));
    const columna = Math.round(hueco * (k + 0.2 + rng() * 0.6));
    const [min, max] = c[tipo];   // [mín, máx]
    const tam = min + rng() * (max - min);
    return { tipo, columna, ancho, magnitud: tipo === 'cabo' ? tam : -tam };
  });
  const base = 1 - cfg.bordeMar;
  const perfil = Array.from({ length: cfg.columnas + 1 }, (_, col) => {
    const onda = (fbm(semillaBordes, col * 0.09, 9.5, 2) - 0.5) * 2 * cfg.ondulacionBordes;
    let y = base + onda;
    for (const r of rasgos) {
      const w = ventana(col, r.columna, r.ancho);
      // el golfo tiene el fondo más plano que una bahía
      y += r.magnitud * (r.tipo === 'golfo' ? Math.sqrt(w) : w);
    }
    return Math.min(c.perfilMax, Math.max(c.perfilMin, y));
  });
  return { perfil, rasgos };
}

function calcularAlturas(cfg: ConfigMapa, rejilla: Rejilla, costa: Costa): number[] {
  const semillaRuido = derivarSemilla(cfg.semilla, 'relieve');
  const semillaBordes = derivarSemilla(cfg.semilla, 'bordes');
  const alturas = new Array<number>(rejilla.total);
  for (let i = 0; i < rejilla.total; i++) {
    const col = rejilla.col(i);
    const fila = rejilla.fila(i);
    const y = fila / (cfg.filas - 1);
    // Las filas impares están desplazadas medio hexágono: se refleja en el muestreo del ruido.
    const x = col + (fila & 1) * 0.5;
    // Las fronteras ondulan por columna (ruido de baja frecuencia) para que no sean filas rectas.
    const ondaMontanas = (fbm(semillaBordes, x * 0.09, 0, 2) - 0.5) * 2 * cfg.ondulacionBordes;
    const m = Math.max(0.05, cfg.bordeMontanas + ondaMontanas);
    const s = perfilEn(costa, x);
    // Perfil continuo (sin escalones): sierra → piedemonte → valle → costa → mar.
    let base: number;
    let amplitud: number;
    if (y < m) {
      // Se desplaza el perfil entero (no se estira): así la línea de cumbres también ondula.
      const t = Math.min(1, (m - y) / cfg.bordeMontanas);
      base = 0.34 + 0.66 * t * t * (3 - 2 * t);
      amplitud = 0.08 + 0.27 * t;
    } else if (y > s) {
      const t = (y - s) / (1 - s);
      base = 0.24 - t * 0.3;
      amplitud = 0.08;
    } else {
      const t = (y - m) / (s - m);
      base = 0.34 - t * 0.1;
      amplitud = 0.08;
    }
    const ruido = fbm(semillaRuido, x * cfg.escalaRuido, fila * cfg.escalaRuido, cfg.octavas);
    alturas[i] = base + (ruido - 0.5) * 2 * amplitud;
  }
  return alturas;
}

/**
 * El río nace en las montañas y baja hacia el sur. En cada paso elige el vecino más bajo,
 * con algo de azar y una tendencia lateral que cambia de vez en cuando: eso crea meandros.
 */
function trazarRio(cfg: ConfigMapa, rejilla: Rejilla, altura: number[], terreno: Terreno[], colInicio: number, rng: Rng): number[] {
  const margen = 3;
  let actual = rejilla.indice(colInicio, 1);
  const camino = [actual];
  const visitado = new Set(camino);
  let tendencia = rng() < 0.5 ? -1 : 1;
  let lateralesSeguidos = 0;

  // Termina al llegar al mar o al confluir con un río ya trazado.
  while (terreno[actual] !== 'mar' && camino.length < rejilla.total) {
    if (rng() < 0.18) tendencia = -tendencia;
    const filaActual = rejilla.fila(actual);
    const colActual = rejilla.col(actual);
    let mejor = -1;
    let mejorPuntuacion = Infinity;
    for (const v of rejilla.vecinos(actual)) {
      if (visitado.has(v)) continue;
      const fila = rejilla.fila(v);
      const col = rejilla.col(v);
      if (fila < filaActual) continue;
      const lateral = fila === filaActual;
      if (lateral && lateralesSeguidos >= 2) continue;
      if (col < margen || col > cfg.columnas - 1 - margen) continue;
      const haciaTendencia = Math.sign(col - colActual) === tendencia ? -0.06 : 0;
      const puntuacion = altura[v] + rng() * 0.15 + (lateral ? 0.05 : 0) + haciaTendencia;
      if (puntuacion < mejorPuntuacion) {
        mejorPuntuacion = puntuacion;
        mejor = v;
      }
    }
    if (mejor === -1) {
      // Encerrado (muy raro): baja en línea recta hacia el sur.
      const sur = rejilla.indice(colActual, Math.min(filaActual + 1, cfg.filas - 1));
      if (sur === actual) break;
      mejor = sur;
    }
    lateralesSeguidos = rejilla.fila(mejor) === filaActual ? lateralesSeguidos + 1 : 0;
    // El cauce excava: nunca sube respecto al tramo anterior.
    altura[mejor] = Math.min(altura[mejor], altura[actual]);
    actual = mejor;
    camino.push(actual);
    visitado.add(actual);
    if (terreno[actual] === 'rio') break;
  }
  for (const i of camino) if (terreno[i] !== 'mar') terreno[i] = 'rio';
  return camino;
}

function colocarLago(cfg: ConfigMapa, rejilla: Rejilla, altura: number[], terreno: Terreno[], rio: number[], rng: Rng): void {
  const tramo = rio.slice(Math.floor(rio.length / 3), Math.floor((rio.length * 2) / 3));
  if (tramo.length === 0) return;
  const orilla = tramo[enteroEntre(rng, 0, tramo.length - 1)];
  const lado = rng() < 0.5 ? -1 : 1;
  const radio = enteroEntre(rng, cfg.radioLagoMin, cfg.radioLagoMax);
  const col = rejilla.col(orilla) + lado * (radio + 1);
  const fila = rejilla.fila(orilla);
  if (!rejilla.dentro(col, fila)) return;
  const centro = rejilla.indice(col, fila);
  for (let i = 0; i < rejilla.total; i++) {
    if (rejilla.distancia(i, centro) > radio) continue;
    if (terreno[i] !== 'llanura') continue;
    if (altura[i] >= cfg.umbralColina) continue;
    terreno[i] = 'lago';
    altura[i] = cfg.nivelMar + 0.01;
  }
}

function vecinoDe(rejilla: Rejilla, terreno: Terreno[], i: number, t: Terreno): boolean {
  return rejilla.vecinos(i).some((v) => terreno[v] === t);
}

/** La llanura junto al agua (limo de las crecidas) es fértil aunque el clima sea desértico. */
function fertilidadBase(cfg: ConfigMapa, t: Terreno, b: Bioma, distAgua: number): number {
  const natural = FERTILIDAD_BIOMA[b];
  switch (t) {
    case 'llanura':
      return Math.max(natural, cfg.fertilidadRibera - cfg.caidaFertilidad * (distAgua - 1));
    case 'marisma':
      return 0.35;
    case 'colina':
      return natural * 0.7;
    case 'montana':
      return natural * 0.3;
    default:
      return 0;
  }
}

function recursosDe(t: Terreno, v: Vegetacion, distAgua: number): number {
  let r = 0;
  if ((t === 'llanura' || t === 'marisma') && distAgua === 1) r |= RECURSO.arcilla;
  if (t === 'marisma') r |= RECURSO.cana;
  if (t === 'rio' || t === 'lago' || t === 'mar' || t === 'marisma') r |= RECURSO.peces;
  if (v === 'palmeral' || v === 'bosque') r |= RECURSO.madera;
  if (t === 'colina' || t === 'montana') r |= RECURSO.piedra;
  return r;
}

function cuantizar(cfg: ConfigMapa, h: number): number {
  const t = (h - cfg.nivelMar) / (1 - cfg.nivelMar);
  return Math.max(0, Math.min(cfg.niveles - 1, Math.floor(t * cfg.niveles)));
}

// + 0 normaliza -0 a 0, que JSON no conserva.
const redondear = (x: number) => Math.round(x * 1000) / 1000 + 0;

/** Huella del mapa para comprobar el determinismo. */
export function hashMapa(m: Mapa): number {
  return hashTexto(JSON.stringify([m.terreno, m.nivel, m.vegetacion, m.bioma, m.fertilidad, m.recursos, m.rios]));
}

export function contarTerrenos(m: Mapa): Record<Terreno, number> {
  const cuenta: Record<Terreno, number> = { mar: 0, rio: 0, lago: 0, marisma: 0, llanura: 0, colina: 0, montana: 0 };
  for (const t of m.terreno) cuenta[t]++;
  return cuenta;
}

/** Biomas de los hexágonos de tierra. */
export function contarBiomas(m: Mapa): Partial<Record<Bioma, number>> {
  const cuenta: Partial<Record<Bioma, number>> = {};
  m.bioma.forEach((b, i) => {
    if (!esAgua(m.terreno[i])) cuenta[b] = (cuenta[b] ?? 0) + 1;
  });
  return cuenta;
}
