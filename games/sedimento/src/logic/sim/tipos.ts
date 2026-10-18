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
  /** Requisito de vecindad: junto a agua o a un hexágono con arcilla. */
  junto?: 'agua' | 'arcilla';
}

/** Etapas visibles de una obra. El motivo de una parada va aparte, en `bloqueo`. */
export type EtapaObra = 'cimientos' | 'materiales' | 'trabajo';

export interface Obra {
  id: number;
  tipo: TipoEdificio;
  hex: number;
  etapa: EtapaObra;
  entregado: Partial<Existencias>;
  /** Personas-día aportadas hasta ahora. */
  trabajoHecho: number;
  /** Constructores asignados hoy. */
  constructores: number;
  /** null si avanza; si no, por qué está parada: 'esperando:adobe', 'sin-trabajadores'… */
  bloqueo: string | null;
  diaInicio: number;
}

export interface Edificio {
  id: number;
  tipo: TipoEdificio;
  hex: number;
}

export interface Hogar {
  id: number;
  miembros: number;
  adultos: number;
  /** Hexágono de su casa; null mientras no tenga vivienda (llega con la construcción). */
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
  obras: { fraccionCimientos: number; maxConstructoresPorObra: number; radioFundacion: number };
  edificios: Record<TipoEdificio, DefEdificio>;
}
