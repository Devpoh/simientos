#!/usr/bin/env node
// Panel del estudio: servidor local sin dependencias.
// Uso: npm run panel   →   http://localhost:4400
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GAMES = join(ROOT, 'games');
const PORT = Number(process.env.PANEL_PORT ?? 4400);
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8' };

const json = (res, data, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};

function leerEstado(slug) {
  const p = join(GAMES, slug, 'docs', 'estado.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

function juegos() {
  if (!existsSync(GAMES)) return [];
  const activo = existsSync(join(ROOT, 'studio', 'activo.txt')) ? readFileSync(join(ROOT, 'studio', 'activo.txt'), 'utf8').trim() : null;
  return readdirSync(GAMES, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => {
    const e = leerEstado(d.name);
    return { slug: d.name, nombre: e?.juego?.nombre ?? d.name, activo: d.name === activo,
      fases: e?.fases?.length ?? 0, hechas: e?.fases?.filter((f) => f.estado === 'hecha').length ?? 0, actualizado: e?.actualizado ?? null };
  });
}

// Categoría a partir del nombre del archivo: basta para filtrar en la pestaña Modelos.
const CATEGORIAS = [
  [/palm/i, 'palmeras'], [/tree|arbol|conifera|pine|stump/i, 'árboles'], [/rock|stone|roca|guijarro|cliff/i, 'rocas'],
  [/crop|grass|plant|flower|lily|bush|mata|cana|duna|mushroom/i, 'plantas'], [/building|scaffold|stage|choza|almacen|tent|fence|bridge|statue/i, 'construcción'],
  [/cloud/i, 'cielo'],
];
const categoria = (n) => CATEGORIAS.find(([re]) => re.test(n))?.[1] ?? 'objetos';

/** Recorre public/modelos de un juego: un paquete por carpeta, con su licencia (primera línea de LICENSE.txt). */
function modelos(slug) {
  const base = join(GAMES, slug, 'public', 'modelos');
  if (!existsSync(base)) return [];
  const lista = [];
  for (const d of readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const dir = join(base, d.name);
    const lic = join(dir, 'LICENSE.txt');
    const textoLic = existsSync(lic) ? readFileSync(lic, 'utf8') : '';
    const fuente = textoLic.split(String.fromCharCode(10)).map((l) => l.trim()).find(Boolean) ?? '';
    const licencia = d.name === 'propios' ? 'Propio' : /CC0|Creative Commons Zero|publicdomain\/zero/i.test(textoLic) ? 'CC0' : 'revisar';
    for (const f of readdirSync(dir).filter((f) => /\.(glb|gltf)$/i.test(f))) {
      const nombre = f.replace(/\.(glb|gltf)$/i, '');
      lista.push({ id: `${d.name}/${nombre}`, nombre, paquete: d.name, origen: d.name === 'propios' ? 'propio' : 'descargado',
        categoria: categoria(nombre), licencia, fuente: d.name === 'propios' ? 'Procedural (sesiones A/B), exportado con npm run modelos' : fuente, url: `/modelos/${slug}/${d.name}/${f}`, bytes: statSync(join(dir, f)).size });
    }
  }
  return lista;
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      return res.end(readFileSync(join(ROOT, 'studio', 'panel', 'index.html')));
    }
    if (p === '/api/juegos') return json(res, juegos());
    const m = p.match(/^\/api\/estado\/([\w-]+)$/);
    if (m) { const e = leerEstado(m[1]); return e ? json(res, e) : json(res, { error: 'sin estado' }, 404); }
    const am = p.match(/^\/api\/modelos\/([\w-]+)$/);
    if (am) return json(res, modelos(am[1]));
    const mo = p.match(/^\/modelos\/([\w-]+)\/(.+)$/);
    if (mo) {
      const base = join(GAMES, mo[1], 'public', 'modelos');
      const file = normalize(join(base, mo[2]));
      if (!file.startsWith(base + sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream' });
      return res.end(readFileSync(file));
    }
    const ev = p.match(/^\/evidencia\/([\w-]+)\/(.+)$/);
    if (ev) {
      const base = join(GAMES, ev[1], 'docs', 'evidencia');
      const file = normalize(join(base, ev[2]));
      if (!file.startsWith(base + sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream' });
      return res.end(readFileSync(file));
    }
    res.writeHead(404); res.end('no encontrado');
  } catch (e) {
    json(res, { error: String(e.message) }, 500);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Panel del estudio → http://localhost:${PORT}`));
