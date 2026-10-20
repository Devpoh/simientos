// Bench de 60 fps (R56, criterio D034): abre Chrome con GPU real y ventana, espera a que el juego esté listo (el horneado no cuenta),
// calienta 3 s, reinicia el medidor, deja correr la aldea N segundos y escribe docs/evidencia/bench-<nombre>.json.
//   Con vsync (lo normal): fps medio ≥ 59,5, fotogramas perdidos (intervalo > 25 ms) ≤ 0,5 % y máximo ≤ 33 ms.
//   Sin vsync (--sin-vsync, margen de GPU y CPU): p95 ≤ 8,3 ms.
// Sale con 0 si cumple, 1 si no, y 2 si no hay GPU real o falla el arranque.
//
// npm run bench -- [--zoom 1|2|3|4] [--segundos 20] [--sin-vsync] [--maximizada] [--nombre bench-x1] [--query "semilla=7"] [--ancho 960] [--alto 540]
// --maximizada abre la ventana a tamaño de pantalla (1920×1080) para medir el lienzo a pantalla completa.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const zoom = Number(opt('zoom', 1));
const segundos = Number(opt('segundos', 20));
const nombre = opt('nombre', `bench-x${zoom}`);
const maximizada = argv.includes('--maximizada');
const ancho = Number(opt('ancho', maximizada ? 1920 : 960));
const alto = Number(opt('alto', maximizada ? 969 : 540));
const queryExtra = opt('query', '');
const sinVsync = argv.includes('--sin-vsync');

const rend = JSON.parse(readFileSync('src/data/tuning.json', 'utf8')).rendimiento;
const { limiteMaxMs, fpsMedioMin, perdidosMaxPct, calentamientoS, p95SinVsyncMs } = rend;
const resultado = {
  ok: false, zoom, segundos, sinVsync, lienzo: null, renderer: null, fps: null, msFotoP95: null, msFotoMax: null, nSprites: null,
  umbrales: sinVsync ? { p95SinVsyncMs } : { fpsMedioMin, perdidosMaxPct, limiteMaxMs }, muestras: [], errores: [],
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
  await page.waitForTimeout(calentamientoS * 1000);
  await page.evaluate(() => window.__GAME__.accion('reiniciarMedidas'));

  // Una muestra por segundo; p95 y máximo salen de la ventana del medidor (300 fotogramas), que cubre todo el periodo.
  for (let s = 0; s < segundos; s++) {
    await page.waitForTimeout(1000);
    const e = await page.evaluate(() => window.__GAME__.snapshot());
    resultado.muestras.push({ fps: e.fps, p95: e.msFotoP95, max: e.msFotoMax, sprites: e.nSprites, zoom: e.camara?.zoom, fotogramas: e.fotogramas, lienzo: e.lienzo });
  }
  const m = resultado.muestras;
  const ult = m[m.length - 1];
  resultado.lienzo = ult.lienzo;
  resultado.fps = ult.fotogramas.fpsMedio;
  resultado.fotogramas = ult.fotogramas.n;
  resultado.perdidos = ult.fotogramas.perdidos;
  resultado.perdidosPct = Math.round((1000 * ult.fotogramas.perdidos) / Math.max(1, ult.fotogramas.n)) / 10;
  resultado.msFotoP95 = Math.max(...m.map((x) => x.p95));
  resultado.msFotoMax = ult.fotogramas.maxTotal;
  resultado.nSprites = Math.max(...m.map((x) => x.sprites));
  resultado.zoomReal = ult.zoom;
  resultado.ok = resultado.errores.length === 0 && (sinVsync
    ? resultado.msFotoP95 <= p95SinVsyncMs
    : resultado.fps >= fpsMedioMin && resultado.perdidosPct <= perdidosMaxPct && resultado.msFotoMax <= limiteMaxMs);
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
