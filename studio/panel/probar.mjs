#!/usr/bin/env node
// Pruebas del panel del estudio en un navegador real (Playwright).
// Uso: npm run panel:probar [-- --capturas <carpeta>]
// Arranca su propio servidor en un puerto libre: no toca el panel que tengas abierto en :4400.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, copyFileSync, rmSync, mkdtempSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Playwright ya está instalado en el juego: lo reutilizamos para no duplicar dependencias.
const requerir = createRequire(join(RAIZ, 'games', 'sedimento', 'package.json'));
const { chromium } = requerir('playwright');

const argv = process.argv.slice(2);
const i = argv.indexOf('--capturas');
const carpeta = i === -1 ? join(RAIZ, 'studio', 'panel', 'pruebas') : argv[i + 1];
mkdirSync(carpeta, { recursive: true });

async function arrancar(envExtra = {}) {
  const puerto = 4500 + Math.floor(Math.random() * 400);
  const servidor = spawn(process.execPath, [join(RAIZ, 'studio', 'panel', 'server.mjs')], { env: { ...process.env, PANEL_PORT: String(puerto), ...envExtra }, stdio: 'pipe' });
  await new Promise((ok, mal) => { servidor.stdout.on('data', (d) => String(d).includes('http://') && ok()); servidor.on('exit', mal); setTimeout(() => mal(new Error('el servidor no arrancó')), 8000); });
  return { servidor, base: `http://localhost:${puerto}/` };
}

const { servidor, base } = await arrancar();
// Servidor aparte para la sección «Pixel art propio»: PANEL_PIXEL_DIR lo apunta a una carpeta temporal
// (nunca a games/sedimento/public/recursos/pixel) para poder probar el estado vacío y el de con archivos
// sin tocar lo que haya generado B de verdad.
const dirPixelTmp = mkdtempSync(join(tmpdir(), 'panel-pixel-'));
// Lo mismo para la galería de avances (R64): nunca docs/evidencia ni tools/arte-pixel/bocetos reales.
const dirEvidenciaTmp = mkdtempSync(join(tmpdir(), 'panel-evidencia-'));
const dirBocetosTmp = mkdtempSync(join(tmpdir(), 'panel-bocetos-'));
const { servidor: servidorPixel, base: basePixel } = await arrancar({ PANEL_PIXEL_DIR: dirPixelTmp, PANEL_EVIDENCIA_DIR: dirEvidenciaTmp, PANEL_BOCETOS_DIR: dirBocetosTmp });

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
    // Con varias versiones en el roadmap, solo la activa (o la que ya se abrió) muestra sus fases: una
    // «details.phase» de una versión cerrada existe en el DOM pero no es visible.
    const cargar = async () => { await p.goto(base); await p.waitForSelector('details.version[open] details.phase', { timeout: 10000 }); };
    const sinScrollHorizontal = async (vista) => comprobar(`${nombreVista}/${vista}: sin scroll horizontal`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

    // 1. Primera visita: todo es nuevo.
    // Hay que esperar a que la primera carga termine de pintar (y de escribir panel.vistos) antes de
    // limpiar: si no, esa escritura asíncrona puede llegar después del clear() y dejar todo «sinleer».
    await p.goto(base);
    await p.waitForSelector('details.version[open] details.phase', { timeout: 10000 }).catch(() => {});
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('panel.vista', 'progreso'); });
    await cargar();
    const nuevos = await p.$$eval('.phase .m-nuevo', (e) => e.length);
    const fases = await p.$$eval('details.phase', (e) => e.length);
    comprobar(`${nombreVista}: primera visita, todas las fases marcadas 🆕`, fases > 0 && nuevos === fases, `${nuevos}/${fases}`);
    comprobar(`${nombreVista}: hay tarjetas «Ahora mismo»`, await p.$$eval('.ahora .now', (e) => e.length) > 0);
    await sinScrollHorizontal('progreso');
    await p.screenshot({ path: join(carpeta, `${nombreVista}-progreso.png`), fullPage: true });

    // 2. Abrir una fase la marca como leída, y sigue leída al recargar; las demás pasan a «sin leer».
    // Tiene que ser una fase visible (de una versión abierta): el summary de una cerrada no se puede pulsar.
    const id = await p.$eval('details.version[open] details.phase', (d) => d.dataset.id);
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
    await ctx.close();

    // Pixel art propio: en su propio servidor/contexto (carpeta temporal dirPixelTmp), para no tocar
    // nunca games/sedimento/public/recursos/pixel (lo real que genera B).
    const imagenesRotas = (pagina) => pagina.evaluate(async () => {
      const imgs = [...document.querySelectorAll('img[src^="/"]')];
      imgs.forEach((i) => { i.loading = 'eager'; });
      await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((ok) => { i.onload = i.onerror = ok; setTimeout(ok, 20000); }))));
      return imgs.filter((i) => !i.naturalWidth).length;
    });
    const origenMuestra = join(RAIZ, 'prototypes', 'imperium-muestra', 'salida');
    const ctxPixel = await navegador.newContext({ viewport });
    const pPixel = await ctxPixel.newPage();
    pPixel.on('pageerror', (e) => errores.push(`${nombreVista}/pixel: ${e.message}`));
    pPixel.on('console', (m) => { if (m.type() === 'error') errores.push(`${nombreVista}/pixel: ${m.text().slice(0, 200)}`); });
    const sinScrollPixel = async (vista) => comprobar(`${nombreVista}/${vista}: sin scroll horizontal`, await pPixel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    const esperarCuerpo = () => pPixel.waitForFunction(() => { const t = document.querySelector('#app')?.textContent || ''; return t.length > 0 && !t.includes('Cargando'); }, null, { timeout: 15000 });

    await pPixel.goto(basePixel);
    await pPixel.click('#v-modelos');
    await esperarCuerpo();
    comprobar(`${nombreVista}/pixel art: estado vacío cuando no hay archivos`, (await pPixel.textContent('#app')).includes('Todavía no hay nada'));
    await sinScrollPixel('pixel-art-vacio');
    await pPixel.screenshot({ path: join(carpeta, `${nombreVista}-lab-portada.png`) });

    copyFileSync(join(origenMuestra, 'hoja_sprites.png'), join(dirPixelTmp, 'hoja_sprites.png'));
    copyFileSync(join(origenMuestra, 'paleta.png'), join(dirPixelTmp, 'paleta.png'));
    await pPixel.reload();
    await pPixel.click('#v-modelos');
    await pPixel.waitForSelector('.pa-card', { timeout: 15000 });
    await pPixel.waitForFunction(() => [...document.querySelectorAll('.pa-mini img')].every((im) => im.complete), null, { timeout: 15000 }).catch(() => {});
    comprobar(`${nombreVista}/pixel art: una tarjeta por archivo de prueba`, (await pPixel.$$eval('.pa-card', (e) => e.length)) === 2);
    comprobar(`${nombreVista}/pixel art: origen «propio»`, await pPixel.$$eval('.pa-origen', (e) => e.every((n) => n.textContent.includes('propio'))));
    comprobar(`${nombreVista}/pixel art: imágenes sin romper`, (await imagenesRotas(pPixel)) === 0);
    await sinScrollPixel('pixel-art-con-archivos');
    await pPixel.screenshot({ path: join(carpeta, `${nombreVista}-laboratorio.png`) });

    rmSync(join(dirPixelTmp, 'hoja_sprites.png'), { force: true });
    rmSync(join(dirPixelTmp, 'paleta.png'), { force: true });
    await pPixel.reload();
    await pPixel.click('#v-modelos');
    await pPixel.waitForFunction(() => document.querySelector('#app')?.textContent.includes('Todavía no hay nada'), null, { timeout: 15000 });
    comprobar(`${nombreVista}/pixel art: vuelve al estado vacío tras borrar los archivos de prueba`, true);

    // Avances (R64): mismo servidor temporal (dirEvidenciaTmp/dirBocetosTmp), nunca las carpetas reales.
    await pPixel.click('.lab-nav2 [data-s="avances"]');
    await esperarCuerpo();
    comprobar(`${nombreVista}/avances: estado vacío cuando no hay archivos`, (await pPixel.textContent('#app')).includes('Todavía no hay capturas'));
    await sinScrollPixel('avances-vacio');
    await pPixel.screenshot({ path: join(carpeta, `${nombreVista}-avances-vacio.png`) });

    // Tres archivos con fechas de modificación forzadas, para comprobar el orden (más nueva primero).
    copyFileSync(join(origenMuestra, 'hoja_sprites.png'), join(dirEvidenciaTmp, 'vieja.png'));
    utimesSync(join(dirEvidenciaTmp, 'vieja.png'), new Date('2020-01-01'), new Date('2020-01-01'));
    copyFileSync(join(origenMuestra, 'paleta.png'), join(dirBocetosTmp, 'media.png'));
    utimesSync(join(dirBocetosTmp, 'media.png'), new Date('2022-06-15'), new Date('2022-06-15'));
    copyFileSync(join(origenMuestra, 'hoja_sprites.png'), join(dirEvidenciaTmp, 'nueva.png'));
    utimesSync(join(dirEvidenciaTmp, 'nueva.png'), new Date('2024-12-01'), new Date('2024-12-01'));

    await pPixel.reload();
    await pPixel.click('#v-modelos');
    await pPixel.click('.lab-nav2 [data-s="avances"]');
    await pPixel.waitForSelector('.pa-card', { timeout: 15000 });
    await pPixel.waitForFunction(() => [...document.querySelectorAll('.pa-mini img')].every((im) => im.complete), null, { timeout: 15000 }).catch(() => {});
    const nombresGaleria = await pPixel.$$eval('.pa-nombre', (e) => e.map((x) => x.textContent));
    comprobar(`${nombreVista}/avances: tres tarjetas`, nombresGaleria.length === 3, `${nombresGaleria.length}`);
    comprobar(`${nombreVista}/avances: orden de más nueva a más vieja`, nombresGaleria[0] === 'nueva.png' && nombresGaleria[1] === 'media.png' && nombresGaleria[2] === 'vieja.png', nombresGaleria.join(','));
    comprobar(`${nombreVista}/avances: origen evidencia/boceto correcto`, await pPixel.$$eval('.pa-card', (e) => {
      const por = (n) => e.find((c) => c.querySelector('.pa-nombre').textContent === n)?.querySelector('.mod-tags .tag')?.textContent ?? '';
      return por('vieja.png').includes('evidencia') && por('nueva.png').includes('evidencia') && por('media.png').includes('boceto');
    }));
    comprobar(`${nombreVista}/avances: todo marcado 🆕 en la primera visita`, (await pPixel.$$eval('.pa-marca', (e) => e.length)) === 3);
    comprobar(`${nombreVista}/avances: imágenes sin romper`, (await imagenesRotas(pPixel)) === 0);
    await sinScrollPixel('avances-con-archivos');
    await pPixel.screenshot({ path: join(carpeta, `${nombreVista}-avances.png`) });

    // Ampliar una tarjeta la marca leída y abre el visor con pixelado.
    await pPixel.click('.pa-mini');
    await pPixel.waitForSelector('.pa-visor', { timeout: 10000 });
    comprobar(`${nombreVista}/avances: el visor abre con la imagen`, await pPixel.$eval('.pa-visor img', (im) => im.src.length > 0));
    await pPixel.screenshot({ path: join(carpeta, `${nombreVista}-avances-visor.png`) });
    await pPixel.keyboard.press('Escape');
    comprobar(`${nombreVista}/avances: Esc cierra el visor`, (await pPixel.$$eval('.pa-visor', (e) => e.length)) === 0);
    comprobar(`${nombreVista}/avances: ampliar la marca como leída (✓)`, await pPixel.$('.pa-card .pa-marca:has-text("✓")'));

    rmSync(join(dirEvidenciaTmp, 'vieja.png'), { force: true });
    rmSync(join(dirEvidenciaTmp, 'nueva.png'), { force: true });
    rmSync(join(dirBocetosTmp, 'media.png'), { force: true });
    await pPixel.reload();
    await pPixel.click('#v-modelos');
    await pPixel.click('.lab-nav2 [data-s="avances"]');
    await pPixel.waitForFunction(() => document.querySelector('#app')?.textContent.includes('Todavía no hay capturas'), null, { timeout: 15000 });
    comprobar(`${nombreVista}/avances: vuelve al estado vacío tras borrar los archivos de prueba`, true);

    await ctxPixel.close();
  }
} catch (e) {
  errores.push(`probar.mjs: ${e.message.split('\n')[0]}`);
} finally {
  await navegador.close();
  servidor.kill();
  servidorPixel.kill();
  rmSync(dirPixelTmp, { recursive: true, force: true });
  rmSync(dirEvidenciaTmp, { recursive: true, force: true });
  rmSync(dirBocetosTmp, { recursive: true, force: true });
}

const fallos = resultados.filter((r) => !r.ok);
for (const r of resultados) console.log(`${r.ok ? '✓' : '✗'} ${r.nombre}${r.detalle ? ` (${r.detalle})` : ''}`);
for (const e of errores) console.log(`✗ error de consola: ${e}`);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones · ${errores.length} errores · capturas en ${carpeta}`);
process.exit(fallos.length || errores.length ? 1 : 0);
