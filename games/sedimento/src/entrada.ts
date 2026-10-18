import { params } from './core/test-hooks';

// Punto de entrada: `?galeria` abre la galería de modelos (R18), `?exportar` exporta los modelos
// procedurales a GLB para el panel; si no, la partida.
if (params.has('galeria')) void import('./galeria');
else if (params.has('exportar')) void import('./exportarModelos');
else void import('./main');
