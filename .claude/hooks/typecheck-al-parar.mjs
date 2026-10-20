// Stop: si cambió algún .ts del juego activo desde el último typecheck correcto, ejecuta tsc.
// Con errores sale con código 2: Claude no puede terminar el turno y recibe los errores para corregirlos.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const entrada = (() => { try { return JSON.parse(readFileSync(0, 'utf8')); } catch { return {}; } })();
if (entrada.stop_hook_active) process.exit(0); // evita bucles: solo bloquea una vez seguida

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const activo = join(root, 'studio', 'activo.txt');
if (!existsSync(activo)) process.exit(0);
const juego = join(root, 'games', readFileSync(activo, 'utf8').trim());
if (!existsSync(join(juego, 'node_modules'))) process.exit(0);

function ultimoCambio(dir) {
  if (!existsSync(dir)) return 0;
  let max = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) max = Math.max(max, ultimoCambio(p));
    else if (/\.(ts|json)$/.test(e.name)) max = Math.max(max, statSync(p).mtimeMs);
  }
  return max;
}

const sello = join(juego, 'node_modules', '.typecheck-ok');
const cambio = Math.max(ultimoCambio(join(juego, 'src')), ultimoCambio(join(juego, 'tests')));
if (existsSync(sello) && Number(readFileSync(sello, 'utf8')) >= cambio) process.exit(0);

const r = spawnSync('npx', ['--no-install', 'tsc', '--noEmit'], { cwd: juego, encoding: 'utf8', shell: true, timeout: 90000 });
if (r.status === 0) {
  writeFileSync(sello, String(cambio));
  process.exit(0);
}
const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(0, 15).join('\n');
console.error(`Errores de TypeScript en el juego activo. Corrígelos antes de terminar:\n${salida}`);
process.exit(2);
