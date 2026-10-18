// Exporta los modelos procedurales del juego (palmeras, árboles, chozas…) a GLB en
// public/modelos/propios, para verlos en el panel del estudio (pestaña Modelos).
// Uso: npm run modelos
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const server = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 500), strictPort: false }, logLevel: 'error' });
let browser;
let codigo = 1;
try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  browser = await chromium.launch({ channel: 'chrome', args }).catch(() => chromium.launch({ args }));
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(`${base}?test=1&exportar=1`);
  await page.waitForFunction(() => window.__GAME__?.listo === true, null, { timeout: 30000 });
  const modelos = await page.evaluate(() => window.__EXPORT__ ?? {});
  const dir = join(process.cwd(), 'public', 'modelos', 'propios');
  mkdirSync(dir, { recursive: true });
  for (const [nombre, b64] of Object.entries(modelos)) writeFileSync(join(dir, `${nombre}.glb`), Buffer.from(b64, 'base64'));
  console.log(`Exportados ${Object.keys(modelos).length} modelos → public/modelos/propios`);
  codigo = 0;
} catch (e) {
  console.error('exportar-modelos:', e.message.split('\n')[0]);
} finally {
  await browser?.close();
  await server.close();
}
process.exit(codigo);
