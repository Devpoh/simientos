#!/usr/bin/env node
// Pruebas del panel del estudio en un navegador real (Playwright).
// Uso: npm run panel:probar [-- --capturas <carpeta>]
// Arranca su propio servidor en un puerto libre: no toca el panel que tengas abierto en :4400.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Playwright ya está instalado en el juego: lo reutilizamos para no duplicar dependencias.
const requerir = createRequire(join(RAIZ, 'games', 'sedimento', 'package.json'));
const { chromium } = requerir('playwright');

const argv = process.argv.slice(2);
const i = argv.indexOf('--capturas');
const carpeta = i === -1 ? join(RAIZ, 'studio', 'panel', 'pruebas') : argv[i + 1];
mkdirSync(carpeta, { recursive: true });

const puerto = 4500 + Math.floor(Math.random() * 400);
const servidor = spawn(process.execPath, [join(RAIZ, 'studio', 'panel', 'server.mjs')], { env: { ...process.env, PANEL_PORT: String(puerto) }, stdio: 'pipe' });
await new Promise((ok, mal) => { servidor.stdout.on('data', (d) => String(d).includes('http://') && ok()); servidor.on('exit', mal); setTimeout(() => mal(new Error('el servidor no arrancó')), 8000); });
const base = `http://localhost:${puerto}/`;

const resultados = [];
const errores = [];
const comprobar = (nombre, ok, detalle = '') => resultados.push({ nombre, ok: Boolean(ok), detalle });

const navegador = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }).catch(() => chromium.launch());
try {
  for (const [nombreVista, viewport] of [['escritorio', { width: 1400, height: 900 }], ['movil', { width: 390, height: 844 }]]) {
    const ctx = await navegador.newContext({ viewport });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(`${nombreVista}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(`${nombreVista}: ${m.text().slice(0, 200)}`); });
    const cargar = async () => { await p.goto(base); await p.waitForSelector('details.phase', { timeout: 10000 }); };
    const sinScrollHorizontal = async (vista) => comprobar(`${nombreVista}/${vista}: sin scroll horizontal`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

    // 1. Primera visita: todo es nuevo.
    await p.goto(base);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('panel.vista', 'progreso'); });
    await cargar();
    const nuevos = await p.$$eval('.phase .m-nuevo', (e) => e.length);
    const fases = await p.$$eval('details.phase', (e) => e.length);
    comprobar(`${nombreVista}: primera visita, todas las fases marcadas 🆕`, fases > 0 && nuevos === fases, `${nuevos}/${fases}`);
    comprobar(`${nombreVista}: hay tarjetas «Ahora mismo»`, await p.$$eval('.ahora .now', (e) => e.length) > 0);
    await sinScrollHorizontal('progreso');
    await p.screenshot({ path: join(carpeta, `${nombreVista}-progreso.png`), fullPage: true });

    // 2. Abrir una fase la marca como leída, y sigue leída al recargar; las demás pasan a «sin leer».
    const id = await p.$eval('details.phase', (d) => d.dataset.id);
    await p.click(`details.phase[data-id="${id}"] summary`);
    comprobar(`${nombreVista}: abrir ${id} la marca ✓`, await p.$(`details.phase[data-id="${id}"] .m-leido`));
    await cargar();
    comprobar(`${nombreVista}: ${id} sigue ✓ tras recargar`, await p.$(`details.phase[data-id="${id}"] .m-leido`));
    comprobar(`${nombreVista}: las no abiertas pasan a ● sin leer`, await p.$$eval('.phase .m-sinleer', (e) => e.length) === fases - 1);

    // 3. Pestañas secundarias y «marcar como leído».
    for (const pest of ['decisiones', 'pendientes', 'errores', 'conceptos', 'actividad']) {
      await p.click(`.subtab[data-p="${pest}"]`);
      comprobar(`${nombreVista}: pestaña ${pest} se abre`, await p.$eval(`.subtab[data-p="${pest}"]`, (b) => b.getAttribute('aria-selected') === 'true'));
    }
    await p.click('.subtab[data-p="decisiones"]');
    await p.click('#leer-pestana');
    comprobar(`${nombreVista}: tras «marcar la pestaña» no quedan decisiones sin leer`, (await p.$$eval('.subtab-body .marca:not(.m-leido)', (e) => e.length)) === 0);
    await p.click('#leer-todo');
    comprobar(`${nombreVista}: «Marcar todo como leído» deja el panel al día`, (await p.textContent('.nov-txt')).includes('al día'));
    await cargar();
    comprobar(`${nombreVista}: sigue al día tras recargar`, (await p.textContent('.nov-txt')).includes('al día'));

    // 4. Otras vistas.
    await p.click('#v-guia');
    await p.waitForSelector('.guide');
    await sinScrollHorizontal('comandos');
    await p.screenshot({ path: join(carpeta, `${nombreVista}-comandos.png`), fullPage: true });
    await p.click('#v-modelos');
    await p.waitForSelector('.mod-card', { timeout: 15000 });
    await p.waitForFunction(() => [...document.querySelectorAll('.mod-mini img')].slice(0, 4).every((im) => im.src.startsWith('data:image')), null, { timeout: 60000 }).catch(() => {});
    const tarjetas = await p.$$eval('.mod-card', (e) => e.length);
    const miniaturas = await p.$$eval('.mod-mini img', (e) => e.filter((im) => im.src.startsWith('data:image')).length);
    comprobar(`${nombreVista}: laboratorio con tarjetas y miniaturas`, tarjetas > 0 && miniaturas > 0, `${tarjetas} tarjetas, ${miniaturas} miniaturas listas`);
    await sinScrollHorizontal('laboratorio');
    await p.screenshot({ path: join(carpeta, `${nombreVista}-laboratorio.png`) });
    await p.click('#v-progreso');
    await p.waitForSelector('details.phase');
    await ctx.close();
  }
} catch (e) {
  errores.push(`probar.mjs: ${e.message.split('\n')[0]}`);
} finally {
  await navegador.close();
  servidor.kill();
}

const fallos = resultados.filter((r) => !r.ok);
for (const r of resultados) console.log(`${r.ok ? '✓' : '✗'} ${r.nombre}${r.detalle ? ` (${r.detalle})` : ''}`);
for (const e of errores) console.log(`✗ error de consola: ${e}`);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones · ${errores.length} errores · capturas en ${carpeta}`);
process.exit(fallos.length || errores.length ? 1 : 0);
