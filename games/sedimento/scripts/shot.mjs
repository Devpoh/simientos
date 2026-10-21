#!/usr/bin/env node
// Corre el juego en un navegador real (headless), ejecuta acciones de input,
// y devuelve un JSON compacto con errores de consola + estado expuesto con exponer().
// La captura PNG es opcional: el JSON suele bastar y cuesta muchos menos tokens.
//
// npm run shot -- [--escena Game] [--acciones "ArrowRight:600,Space,wait:300,click:480,270"]
//                 [--esperar 800] [--nombre F03-movimiento] [--sin-captura] [--ancho 960] [--alto 540]
//                 [--query "semilla=7&x=1"] [--semillas 7,42,12345]
//
// --query añade parámetros a la URL que abre Playwright (se combinan con los que ya pone el script).
// --semillas hace una ejecución completa por cada semilla (?semilla=N) en el mismo navegador;
//            cada una guarda su propia captura <nombre>-s<N>.png y el JSON trae un array `semillas`
//            con el estado de cada una en vez de `estado`/`captura` sueltos.
//
// Acciones admitidas en --acciones (separadas por coma):
//   wait:<ms>                         espera ms milisegundos
//   click:<x>,<y>                     clic en (x, y)
//   wheel:<dy>[:<x>:<y>]               mueve el ratón a (x, y) (centro del viewport por defecto)
//                                      y gira la rueda dy; dy negativo = acercar
//   drag:<x1>:<y1>:<x2>:<y2>:<boton>  arrastre de (x1,y1) a (x2,y2) en ~10 pasos; boton: left/right/middle
//   accion:<clave>[:<arg>]            lanza una acción del juego (`__GAME__.accion`), p. ej. depurarOcupacion
//   <tecla>[:<ms>]                    pulsa <tecla>; con ms, la mantiene pulsada ese tiempo
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const flag = (k) => argv.includes(`--${k}`);

const escena = opt('escena', '');
const acciones = opt('acciones', '');
const esperar = Number(opt('esperar', 800));
const nombre = opt('nombre', `shot-${Date.now()}`);
const ancho = Number(opt('ancho', 960));
const alto = Number(opt('alto', 540));
const conCaptura = !flag('sin-captura');
const queryExtra = opt('query', '');
const semillas = opt('semillas', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function construirQs(semillaOverride) {
  const qs = new URLSearchParams({ test: '1', ...(escena && { escena }) });
  if (queryExtra) for (const [k, v] of new URLSearchParams(queryExtra)) qs.set(k, v);
  if (semillaOverride !== undefined) qs.set('semilla', semillaOverride);
  return qs;
}

const resultado = { ok: false, escena: escena || '(inicial)', errores: [], avisos: [], estado: null, captura: null, semillas: null };
const server = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' });
let browser;

try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  browser = await chromium.launch({ channel: 'chrome', args }).catch(() => chromium.launch({ args }));
  const page = await browser.newPage({ viewport: { width: ancho, height: alto } });

  page.on('response', (r) => {
    if (r.status() >= 400) resultado.errores.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) resultado.errores.push(m.text().slice(0, 300));
    else if (m.type() === 'warning' && resultado.avisos.length < 3) resultado.avisos.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => resultado.errores.push(`pageerror: ${e.message.slice(0, 300)}`));

  async function correrUna(qs, sufijo) {
    await page.goto(`${base}?${qs}`);
    await page.waitForFunction(() => window.__GAME__?.listo === true, null, { timeout: 15000 })
      .catch(() => resultado.errores.push('timeout: el juego no llamó marcarListo() en 15 s'));

    for (const a of acciones.split(',').map((s) => s.trim()).filter(Boolean)) {
      const partes = a.split(':');
      const k = partes[0];
      const v = partes[1];
      const w = partes[2];
      if (k === 'wait') await page.waitForTimeout(Number(v));
      else if (k === 'click') { const [x, y] = v.includes(' ') ? v.split(' ') : [v, w]; await page.mouse.click(Number(x), Number(y)); }
      else if (k === 'wheel') {
        const x = partes[2] !== undefined ? Number(partes[2]) : ancho / 2;
        const y = partes[3] !== undefined ? Number(partes[3]) : alto / 2;
        await page.mouse.move(x, y);
        await page.mouse.wheel(0, Number(v));
      } else if (k === 'drag') {
        const [x1, y1, x2, y2, boton] = [Number(partes[1]), Number(partes[2]), Number(partes[3]), Number(partes[4]), partes[5] || 'left'];
        await page.mouse.move(x1, y1);
        await page.mouse.down({ button: boton });
        const pasos = 10;
        for (let i = 1; i <= pasos; i++) {
          await page.mouse.move(x1 + (x2 - x1) * (i / pasos), y1 + (y2 - y1) * (i / pasos));
        }
        await page.mouse.up({ button: boton });
      } else if (k === 'accion') {
        await page.evaluate(([clave, arg]) => window.__GAME__?.accion?.(clave, arg), [v, w]);
      } else if (v) { await page.keyboard.down(k); await page.waitForTimeout(Number(v)); await page.keyboard.up(k); }
      else await page.keyboard.press(k);
    }

    await page.waitForTimeout(esperar);
    const estado = await page.evaluate(() => window.__GAME__?.snapshot?.() ?? null);

    let captura = null;
    if (conCaptura) {
      const dir = join(process.cwd(), 'docs', 'evidencia');
      mkdirSync(dir, { recursive: true });
      const ruta = join(dir, `${nombre}${sufijo}.png`);
      await page.screenshot({ path: ruta });
      captura = `docs/evidencia/${nombre}${sufijo}.png`;
    }
    return { estado, captura };
  }

  if (semillas.length > 0) {
    resultado.semillas = [];
    for (const semilla of semillas) {
      const { estado, captura } = await correrUna(construirQs(semilla), `-s${semilla}`);
      resultado.semillas.push({ semilla, estado, captura });
    }
  } else {
    const { estado, captura } = await correrUna(construirQs(), '');
    resultado.estado = estado;
    resultado.captura = captura;
  }

  resultado.errores = resultado.errores.slice(0, 10);
  resultado.ok = resultado.errores.length === 0;
} catch (e) {
  resultado.errores.push(`shot.mjs: ${e.message.split('\n')[0]}`);
  if (/Executable doesn't exist|browserType.launch/.test(e.message)) resultado.errores.push('Instala el navegador: npx playwright install chromium');
} finally {
  await browser?.close();
  await server.close();
}

console.log(JSON.stringify(resultado, null, 1));
process.exit(resultado.ok ? 0 : 1);
