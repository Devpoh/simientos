// Medidor global de fotogramas: lo alimenta main.ts (tras cada render) y lo leen la escena, F2 y shot.
import tuning from '../data/tuning.json';
import { MedidorFotogramas } from '../logic/rendimiento';

export const medidor = new MedidorFotogramas(tuning.rendimiento.ventanaFotogramas, tuning.rendimiento.fotogramaPerdidoMs);
