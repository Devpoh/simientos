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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const json = (res, data, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};

/** Sirve un archivo de solo lectura dentro de `base`: rechaza cualquier ruta que se salga de ella. */
function servir(res, base, rel, cache = 'no-cache') {
  const file = normalize(join(base, rel));
  if (!file.startsWith(base + sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': cache });
  res.end(readFileSync(file));
}

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

// Tipo de archivo de pixel art a partir de su nombre: basta para agrupar en la sección «Pixel art propio».
const TIPO_PIXEL = [
  [/atlas/i, 'atlas'], [/paleta|palette/i, 'paleta'], [/sprite|hoja/i, 'hoja de sprites'], [/anim/i, 'animación'],
];
const tipoPixel = (n) => TIPO_PIXEL.find(([re]) => re.test(n))?.[1] ?? 'otro';

// PANEL_PIXEL_DIR (solo para pruebas automatizadas, ver studio/panel/probar.mjs): sustituye la carpeta
// real `public/recursos/pixel` por una temporal, para no escribir ni borrar nada del juego de verdad.
const pixelBase = (slug) => process.env.PANEL_PIXEL_DIR || join(GAMES, slug, 'public', 'recursos', 'pixel');

/** Recorre la carpeta de pixel art (atlas PNG+JSON, hoja de sprites, paleta, animación). Todo es propio (generado por código). */
function pixelArt(slug) {
  const base = pixelBase(slug);
  if (!existsSync(base)) return [];
  const lista = [];
  const recorrer = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      const relP = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { recorrer(ruta, relP); continue; }
      if (!/\.(png|webp|gif|json)$/i.test(e.name)) continue;
      lista.push({ nombre: e.name, ruta: relP, tipo: tipoPixel(e.name), bytes: statSync(ruta).size, url: `/pixel/${slug}/${relP}`, origen: 'propio (generado por código)' });
    }
  };
  recorrer(base, '');
  return lista;
}

function expectativas(slug) {
  const dir = join(GAMES, slug, 'espertativas');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => ({ nombre: f.replace(/\.[^.]+$/, ''), url: `/espertativas/${slug}/${encodeURIComponent(f)}`, bytes: statSync(join(dir, f)).size }));
}

// PANEL_EVIDENCIA_DIR / PANEL_BOCETOS_DIR (solo pruebas, igual que PANEL_PIXEL_DIR): carpetas temporales
// en vez de las reales, para que probar.mjs no toque nunca docs/evidencia ni tools/arte-pixel/bocetos.
const evidenciaBase = (slug) => process.env.PANEL_EVIDENCIA_DIR || join(GAMES, slug, 'docs', 'evidencia');
const bocetosBase = () => process.env.PANEL_BOCETOS_DIR || join(ROOT, 'tools', 'arte-pixel', 'bocetos');

/** Galería de avances (R64): evidencia de fase + bocetos de arte, de más nueva a más vieja. Solo lectura. */
function galeria(slug) {
  // Un boceto con `_x1` y `_x4` (la misma imagen a dos escalas) se muestra en una sola tarjeta: la ×4,
  // con un enlace a la ×1.
  const leerCarpeta = (dir, origen, urlBase) => {
    if (!existsSync(dir)) return [];
    const archivos = readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
    const grupos = new Map();
    for (const f of archivos) {
      const clave = f.replace(/_x[14](?=\.[^.]+$)/i, '');
      (grupos.get(clave) ?? grupos.set(clave, []).get(clave)).push(f);
    }
    return [...grupos.values()].map((fs) => {
      const x4 = fs.find((f) => /_x4\./i.test(f));
      const x1 = fs.find((f) => /_x1\./i.test(f));
      const principal = x4 ?? fs[0];
      const st = statSync(join(dir, principal));
      return { nombre: principal, origen, fecha: st.mtime.toISOString(), bytes: st.size,
        url: `${urlBase}/${encodeURIComponent(principal)}`,
        urlX1: x4 && x1 ? `${urlBase}/${encodeURIComponent(x1)}` : null };
    });
  };
  const lista = [
    ...leerCarpeta(evidenciaBase(slug), 'evidencia de fase', `/evidencia/${slug}`),
    ...leerCarpeta(bocetosBase(), 'boceto de arte', '/bocetos'),
  ];
  lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return lista;
}

// PANEL_REQUISITOS_FILE (solo pruebas, igual que PANEL_PIXEL_DIR): un .md temporal en vez del real.
const requisitosPath = (slug) => process.env.PANEL_REQUISITOS_FILE || join(GAMES, slug, 'docs', 'requisitos-usuario.md');
const AÑO_REQUISITOS = 2026; // el documento solo pone día-mes (18-10, 19-10…); todo es de este año.

/** Parsea `requisitos-usuario.md` (R68, R64): no lo duplica, lee la tabla tal cual. Solo lectura. */
function requisitos(slug) {
  const p = requisitosPath(slug);
  if (!existsSync(p)) return [];
  const lineas = readFileSync(p, 'utf8').replace(/\r/g, '').split('\n');
  let apartado = '';
  const lista = [];
  for (const l of lineas) {
    const h = l.match(/^## (.+)/);
    if (h) { apartado = h[1].trim(); continue; }
    const m = l.match(/^\|\s*(R\d+\w*)\s*\|(.+)\|\s*$/);
    if (!m) continue;
    const celdas = m[2].split('|').map((s) => s.trim());
    if (celdas.length < 4) continue;
    const [fecha, texto, estadoTexto, donde] = celdas;
    const [dd, mm] = fecha.split('-');
    const estado = /^✅/.test(estadoTexto) ? 'vigente' : /^🔁/.test(estadoTexto) ? 'sustituido' : /^⏳/.test(estadoTexto) ? 'pendiente' : 'otro';
    lista.push({ id: m[1], apartado, fecha, fechaISO: dd && mm ? `${AÑO_REQUISITOS}-${mm}-${dd}` : '', texto, estado, estadoTexto, donde });
  }
  lista.sort((a, b) => b.fechaISO.localeCompare(a.fechaISO) || (Number(b.id.slice(1)) - Number(a.id.slice(1))));
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
    if (p === '/laboratorio.js') return servir(res, join(ROOT, 'studio', 'panel'), 'laboratorio.js');
    if (p === '/api/juegos') return json(res, juegos());
    const m = p.match(/^\/api\/estado\/([\w-]+)$/);
    if (m) { const e = leerEstado(m[1]); return e ? json(res, e) : json(res, { error: 'sin estado' }, 404); }
    const am = p.match(/^\/api\/(pixel|expectativas|galeria|requisitos)\/([\w-]+)$/);
    if (am) return json(res, { pixel: pixelArt, expectativas, galeria, requisitos }[am[1]](am[2]));
    const bz = p.match(/^\/bocetos\/(.+)$/);
    if (bz) return servir(res, bocetosBase(), bz[1]);
    // Rutas de solo lectura: cada una sirve una carpeta concreta del juego y nada fuera de ella.
    const rutas = [
      [/^\/recursos\/([\w-]+)\/(.+)$/, (s) => join(GAMES, s, 'public', 'recursos')],
      [/^\/pixel\/([\w-]+)\/(.+)$/, (s) => pixelBase(s)],
      [/^\/espertativas\/([\w-]+)\/(.+)$/, (s) => join(GAMES, s, 'espertativas')],
      [/^\/evidencia\/([\w-]+)\/(.+)$/, (s) => evidenciaBase(s)],
    ];
    for (const [re, carpeta] of rutas) {
      const r = p.match(re);
      if (r) return servir(res, carpeta(r[1]), r[2]);
    }
    res.writeHead(404); res.end('no encontrado');
  } catch (e) {
    json(res, { error: String(e.message) }, 500);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Panel del estudio → http://localhost:${PORT}`));
