#!/usr/bin/env node
// Corre el juego en un navegador real (headless), ejecuta acciones de input,
// y devuelve un JSON compacto con errores de consola + estado expuesto con exponer().
// La captura PNG es opcional: el JSON suele bastar y cuesta muchos menos tokens.
//
// npm run shot -- [--escena Game] [--acciones "ArrowRight:600,Space,wait:300,click:480,270"]
//                 [--esperar 800] [--nombre F03-movimiento] [--sin-captura] [--ancho 960] [--alto 540]
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

const resultado = { ok: false, escena: escena || '(inicial)', errores: [], avisos: [], estado: null, captura: null };
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

  const qs = new URLSearchParams({ test: '1', ...(escena && { escena }) });
  await page.goto(`${base}?${qs}`);
  await page.waitForFunction(() => window.__GAME__?.listo === true, null, { timeout: 15000 })
    .catch(() => resultado.errores.push('timeout: el juego no llamó marcarListo() en 15 s'));

  for (const a of acciones.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [k, v, w] = a.split(':');
    if (k === 'wait') await page.waitForTimeout(Number(v));
    else if (k === 'click') { const [x, y] = v.includes(' ') ? v.split(' ') : [v, w]; await page.mouse.click(Number(x), Number(y)); }
    else if (v) { await page.keyboard.down(k); await page.waitForTimeout(Number(v)); await page.keyboard.up(k); }
    else await page.keyboard.press(k);
  }

  await page.waitForTimeout(esperar);
  resultado.estado = await page.evaluate(() => window.__GAME__?.snapshot?.() ?? null);

  if (conCaptura) {
    const dir = join(process.cwd(), 'docs', 'evidencia');
    mkdirSync(dir, { recursive: true });
    const ruta = join(dir, `${nombre}.png`);
    await page.screenshot({ path: ruta });
    resultado.captura = `docs/evidencia/${nombre}.png`;
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
