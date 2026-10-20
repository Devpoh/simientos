// SessionStart (inicio, resume, clear y compact): inyecta el estado del juego activo.
// Barato a propósito: unas pocas líneas para que Claude no tenga que redescubrir el contexto.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const activo = join(root, 'studio', 'activo.txt');

if (!existsSync(activo)) {
  console.log('[Estudio] Sin juego activo. Para empezar: /nuevo-juego. Panel: npm run panel → http://localhost:4400');
  process.exit(0);
}

const slug = readFileSync(activo, 'utf8').trim();
let estado = '';
try {
  estado = execFileSync(process.execPath, [join(root, 'studio', 'bitacora.mjs'), 'estado'], { encoding: 'utf8', timeout: 5000 }).trim();
} catch {
  estado = `(sin bitácora todavía para ${slug})`;
}
console.log(`[Estudio] Juego activo: ${slug} — lee games/${slug}/CLAUDE.md antes de tocar su código.
${estado}
Panel: npm run panel → http://localhost:4400`);
