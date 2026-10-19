// Contratos del estado de la simulación. Todo es objeto plano o array: se guarda con
// JSON.stringify, se compara en tests y se puede portar tal cual a otro motor.

export type Bien = 'cebada' | 'datiles' | 'pescado' | 'arcilla' | 'cana' | 'paja' | 'adobe' | 'hoces';
export const BIENES: readonly Bien[] = ['cebada', 'datiles', 'pescado', 'arcilla', 'cana', 'paja', 'adobe', 'hoces'];

export type Existencias = Record<Bien, number>;

export type TipoEdificio = 'choza' | 'casa' | 'almacen' | 'campo' | 'palmeral' | 'pesca' | 'adoberia' | 'alfar' | 'canal' | 'dique' | 'templo';
export const TIPOS_EDIFICIO: readonly TipoEdificio[] = ['choza', 'casa', 'almacen', 'campo', 'palmeral', 'pesca', 'adoberia', 'alfar', 'canal', 'dique', 'templo'];

export interface DefEdificio {
  /** Terrenos donde se puede levantar. */
  terrenos: string[];
  materiales: Partial<Existencias>;
  /** Personas-día de trabajo para terminarlo (incluye los cimientos). */
  trabajo: number;
  puestos?: number;
  vivienda?: number;
  fertilidadMin?: number;
  distAguaMax?: number;
  /** Requisito de vecindad: junto a agua o a tierra con arcilla. */
  junto?: 'agua' | 'arcilla';
  /** Huella en el suelo (unidades de mundo): «ancho» en el eje local x y «fondo» en el z. */
  huella: { ancho: number; fondo: number };
  /** Desnivel máximo dentro de la huella, en altura por unidad de largo (R21: la pendiente cuenta). */
  pendienteMax: number;
}

/**
 * Etapas de una obra (R22): plano → preparación → cimientos → estructura → cubierta → (terminada,
 * pasa a edificio). Cada etapa pide su parte del trabajo y de los materiales. El motivo de una parada
 * va aparte, en `bloqueo`.
 */
export type EtapaObra = 'plano' | 'preparacion' | 'cimientos' | 'estructura' | 'cubierta';
export const ETAPAS_OBRA: readonly EtapaObra[] = ['plano', 'preparacion', 'cimientos', 'estructura', 'cubierta'];

/** Dónde está algo en el mundo continuo: centro y giro (radianes) sobre el eje vertical. */
export interface Ubicacion {
  x: number;
  z: number;
  giro: number;
}

export interface Obra extends Ubicacion {
  id: number;
  tipo: TipoEdificio;
  /** Celda de datos bajo el centro (fertilidad, recursos…). No es una posición: la posición es x, z. */
  celda: number;
  etapa: EtapaObra;
  /** Personas-día aportadas en la etapa actual. */
  trabajoEtapa: number;
  entregado: Partial<Existencias>;
  /** Personas-día aportadas en total. */
  trabajoHecho: number;
  /** Constructores asignados hoy. */
  constructores: number;
  /** null si avanza; si no, por qué está parada: 'esperando:adobe', 'sin-trabajadores', 'suspendida'… */
  bloqueo: string | null;
  diaInicio: number;
  suspendida: boolean;
  /** Mayor = recibe constructores y materiales antes. */
  prioridad: number;
}

export interface Edificio extends Ubicacion {
  id: number;
  tipo: TipoEdificio;
  celda: number;
}

export interface Hogar {
  id: number;
  miembros: number;
  adultos: number;
  /** Id del edificio donde vive; null mientras no tenga vivienda (llega con la construcción). */
  casa: number | null;
  /** Raciones recibidas el último día. */
  recibidoHoy: number;
  /** Media móvil de recibido / necesario (0..1+): la satisfacción de la necesidad de comida. */
  satisfaccionComida: number;
  /** Días seguidos por debajo del umbral de hambre. */
  diasHambre: number;
}

/**
 * Un hecho es algo que pasó, con su causa. Es el registro causal del que leen el inspector
 * «¿por qué?», la crónica, los agravios (v0.2) y los tests.
 */
export interface Hecho {
  id: number;
  dia: number;
  tipo: string;
  /** A quién o a qué afecta: 'hogar:3', 'almacen', 'ciudad'… */
  sujeto: string;
  datos?: Record<string, number | string>;
  /** id del hecho que lo provocó, si se conoce. */
  causa?: number;
}

export interface EstadoSim {
  version: 1;
  semilla: number;
  /** Ticks de simulación acumulados y días completos ya procesados. */
  tick: number;
  dia: number;
  almacen: Existencias;
  hogares: Hogar[];
  obras: Obra[];
  edificios: Edificio[];
  /** Contador de ids para obras y edificios (una obra terminada conserva su id como edificio). */
  siguienteId: number;
  /** Fracción de la ración completa que reparte el templo (decisión del jugador). */
  racionObjetivo: number;
  hechos: Hecho[];
  siguienteHecho: number;
  /** Último hecho de cada tipo «de estado» (reserva baja, política…) para enlazar causas. */
  ultimoHecho: Record<string, number>;
}

export interface ConfigSim {
  ticksPorDia: number;
  poblacion: { hogaresIniciales: number; personasIniciales: number; fraccionAdultos: number };
  economia: {
    racionPorPersona: number;
    reservaInicial: Partial<Existencias>;
    ordenAlimentos: Bien[];
    racionesPermitidas: number[];
    diasMediaMovil: number;
    umbralHambre: number;
    /** Por debajo de estos días de reserva se registra «reserva-baja». */
    diasReservaBaja: number;
    maxHechos: number;
  };
  obras: {
    maxConstructoresPorObra: number;
    /** Radio (unidades de mundo) alrededor del almacén donde se reparten las chozas al fundar. */
    radioFundacion: number;
    /** Fracción del trabajo total de cada etapa (suman 1). */
    fraccionTrabajo: Record<EtapaObra, number>;
    /** Fracción de los materiales que pide cada etapa antes de empezar (suman 1). */
    fraccionMateriales: Record<EtapaObra, number>;
    /** Hueco mínimo entre huellas. */
    separacion: number;
    /** Separación entre los puntos con los que se mide agua y pendiente bajo la huella. */
    pasoMuestras: number;
    /** Hasta dónde se mira alrededor de la huella para «junto al agua / a la arcilla». */
    alcanceJunto: number;
  };
  edificios: Record<TipoEdificio, DefEdificio>;
}
