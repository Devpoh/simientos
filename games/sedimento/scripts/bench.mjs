// Bench de 60 fps (R56): abre Chrome con GPU real y ventana, espera a que el juego esté listo (el horneado no cuenta),
// deja correr la aldea N segundos y escribe docs/evidencia/bench-<nombre>.json.
// Sale con 1 si p95 > presupuesto o max > límite (tuning.rendimiento) y con 2 si no hay GPU real o falla el arranque.
// --sin-vsync quita el límite de 60 Hz (diagnóstico: cuánto margen hay de verdad); sus cifras no sirven de veredicto.
//
// npm run bench -- [--zoom 1|2|3|4] [--segundos 20] [--nombre bench-x1] [--query "semilla=7"] [--sin-vsync] [--ancho 960] [--alto 540]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const zoom = Number(opt('zoom', 1));
const segundos = Number(opt('segundos', 20));
const nombre = opt('nombre', `bench-x${zoom}`);
const ancho = Number(opt('ancho', 960));
const alto = Number(opt('alto', 540));
const queryExtra = opt('query', '');
const sinVsync = argv.includes('--sin-vsync');

const { presupuestoP95Ms, limiteMaxMs } = JSON.parse(readFileSync('src/data/tuning.json', 'utf8')).rendimiento;
const resultado = {
  ok: false, zoom, segundos, sinVsync, renderer: null, fps: null, msFotoP95: null, msFotoMax: null, nSprites: null,
  presupuestoP95Ms, limiteMaxMs, muestras: [], errores: [],
};
const server = await createServer({ server: { port: 5800 + Math.floor(Math.random() * 300), strictPort: false }, logLevel: 'error' });
let browser;
let codigo = 2;

try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  // Con ventana (headless:false) para que use la GPU de verdad; sin SwiftShader. Sin throttling si la ventana queda detrás.
  const args = [
    '--ignore-gpu-blocklist', '--enable-gpu-rasterization', `--window-size=${ancho + 40},${alto + 140}`,
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  ];
  if (sinVsync) args.push('--disable-frame-rate-limit', '--disable-gpu-vsync');
  browser = await chromium.launch({ channel: 'chrome', headless: false, args, ignoreDefaultArgs: ['--enable-unsafe-swiftshader'] })
    .catch(() => chromium.launch({ headless: false, args }));
  const page = await browser.newPage({ viewport: { width: ancho, height: alto } });
  page.on('pageerror', (e) => resultado.errores.push(`pageerror: ${e.message.slice(0, 300)}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) resultado.errores.push(m.text().slice(0, 300)); });

  const qs = new URLSearchParams({ test: '1' });
  if (queryExtra) for (const [k, v] of new URLSearchParams(queryExtra)) qs.set(k, v);
  await page.goto(`${base}?${qs}`);
  await page.waitForFunction(() => window.__GAME__?.listo === true, null, { timeout: 60000 });

  resultado.renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl && info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'desconocido';
  });
  if (/swiftshader|llvmpipe|software/i.test(resultado.renderer)) {
    resultado.errores.push(`sin GPU real: renderer = ${resultado.renderer}`);
    throw new Error('sin GPU real');
  }

  await page.mouse.move(ancho / 2, alto / 2);
  for (let z = 1; z < zoom; z++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(200); }
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__GAME__.accion('reiniciarMedidas'));

  // Una muestra por segundo; la ventana del medidor (300 fotogramas) hace que las muestras cubran todo el periodo.
  for (let s = 0; s < segundos; s++) {
    await page.waitForTimeout(1000);
    const e = await page.evaluate(() => window.__GAME__.snapshot());
    resultado.muestras.push({ fps: e.fps, p95: e.msFotoP95, max: e.msFotoMax, sprites: e.nSprites, zoom: e.camara?.zoom });
  }
  const m = resultado.muestras;
  const r1 = (v) => Math.round(v * 10) / 10;
  resultado.fps = r1(m.reduce((a, x) => a + x.fps, 0) / m.length);
  resultado.fpsMin = Math.min(...m.map((x) => x.fps));
  resultado.msFotoP95 = Math.max(...m.map((x) => x.p95));
  resultado.msFotoMax = Math.max(...m.map((x) => x.max));
  resultado.nSprites = Math.max(...m.map((x) => x.sprites));
  resultado.zoomReal = m[m.length - 1].zoom;
  resultado.ok = resultado.errores.length === 0 && resultado.msFotoP95 <= presupuestoP95Ms && resultado.msFotoMax <= limiteMaxMs;
  codigo = resultado.ok ? 0 : 1;
} catch (e) {
  resultado.errores.push(`bench.mjs: ${e.message.split('\n')[0]}`);
} finally {
  await browser?.close();
  await server.close();
}

const dir = join(process.cwd(), 'docs', 'evidencia');
mkdirSync(dir, { recursive: true });
const { muestras, ...resumen } = resultado;
writeFileSync(join(dir, `${nombre}.json`), JSON.stringify(resultado, null, 1));
console.log(JSON.stringify(resumen, null, 1));
process.exit(codigo);
