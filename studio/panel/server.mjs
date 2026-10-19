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
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8' };

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

// Categoría a partir del nombre del archivo: basta para filtrar en la pestaña Modelos.
const CATEGORIAS = [
  [/palm/i, 'palmeras'], [/tree|arbol|conifera|pine|stump/i, 'árboles'], [/rock|stone|roca|guijarro|cliff/i, 'rocas'],
  [/boat|ship|cannon|hull|sail|mast|canoe/i, 'barcos'],
  [/crop|grass|plant|flower|lily|bush|mata|cana|duna|mushroom/i, 'plantas'],
  [/building|scaffold|stage|choza|almacen|tent|fence|bridge|statue|wall|tower|gate|castle|roof|door|window|stairs|balcony|house|chimney|banner|flag/i, 'construcción'],
  [/cloud/i, 'cielo'],
];
const categoria = (n) => CATEGORIAS.find(([re]) => re.test(n))?.[1] ?? 'objetos';

/** Metadatos de cada carpeta de modelos. `integrado` = ya se usa en el juego; `descargado` = solo está en disco. */
const META_3D = {
  propios: { autor: 'Sesiones A y B', formato: 'GLB', popularidad: '—', compat: 'sí (GLB nativo)', estado: 'integrado' },
  'kaykit-hex': { autor: 'Kay Lousberg (KayKit)', formato: 'glTF/GLB', popularidad: 'sin verificar', compat: 'sí (glTF)', estado: 'integrado' },
};
const metaDe = (nombre) => META_3D[nombre] ?? (nombre.startsWith('kenney')
  ? { autor: 'Kenney', formato: 'GLB', popularidad: 'sin verificar', compat: 'sí (GLB nativo)', estado: 'descargado' }
  : { autor: '—', formato: 'GLB', popularidad: 'sin verificar', compat: 'sin comprobar', estado: 'descargado' });

const SEP_LINEA = String.fromCharCode(10);
const LICENCIA = (texto, nombre) => nombre === 'propios' ? 'Propio' : /CC0|Creative Commons Zero|publicdomain\/zero/i.test(texto) ? 'CC0' : /CC-BY|Attribution/i.test(texto) ? 'CC-BY' : 'revisar';

/** Recorre una carpeta de paquetes de modelos (un paquete por subcarpeta, con su LICENSE.txt). */
function recorrerModelos(slug, base, urlBase, lista) {
  if (!existsSync(base)) return;
  for (const d of readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const dir = join(base, d.name);
    const lic = join(dir, 'LICENSE.txt');
    const textoLic = existsSync(lic) ? readFileSync(lic, 'utf8') : '';
    const fuente = textoLic.split(SEP_LINEA).map((l) => l.trim()).find(Boolean) ?? '';
    const meta = metaDe(d.name);
    for (const f of readdirSync(dir).filter((f) => /\.(glb|gltf)$/i.test(f))) {
      const nombre = f.replace(/\.(glb|gltf)$/i, '');
      lista.push({ id: `${d.name}/${nombre}`, nombre, paquete: d.name, origen: d.name === 'propios' ? 'propio' : 'descargado',
        categoria: categoria(nombre), licencia: LICENCIA(textoLic, d.name), estado: meta.estado, autor: meta.autor, formato: meta.formato, popularidad: meta.popularidad, compat: meta.compat,
        fuente: d.name === 'propios' ? 'Procedural (sesiones A/B), exportado con npm run modelos' : fuente, url: `${urlBase}/${d.name}/${f}`, bytes: statSync(join(dir, f)).size });
    }
  }
}

/** Todos los modelos 3D del juego: los de `public/modelos` y los descargados en `public/recursos/modelos3d`. */
function modelos(slug) {
  const lista = [];
  recorrerModelos(slug, join(GAMES, slug, 'public', 'modelos'), `/modelos/${slug}`, lista);
  recorrerModelos(slug, join(GAMES, slug, 'public', 'recursos', 'modelos3d'), `/recursos/${slug}/modelos3d`, lista);
  return lista;
}

/** Texturas PBR de `recursos-sin-revisar/texturas`: terreno/* y edificios/*, con los mapas que traen. */
function materiales(slug) {
  const base = join(GAMES, slug, 'recursos-sin-revisar', 'texturas');
  const lista = [];
  const problemas = [];
  const MAPAS = ['difusa', 'normal', 'rugosidad', 'oclusion', 'altura'];
  if (!existsSync(base)) return { materiales: lista, problemas };
  for (const grupo of readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const dirGrupo = join(base, grupo.name);
    for (const e of readdirSync(dirGrupo, { withFileTypes: true })) {
      if (e.isFile() && /\.zip$/i.test(e.name)) {
        // Un zip sin «fin de directorio central» no se puede extraer: se avisa en vez de esconderlo.
        const ok = readFileSync(join(dirGrupo, e.name)).includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
        problemas.push({ id: `${grupo.name}/${e.name}`, nombre: e.name, grupo: grupo.name, motivo: ok ? 'Es un zip sin extraer: falta descomprimirlo para ver sus mapas.' : 'El zip está dañado (no tiene directorio central) y no se puede extraer. Hay que volver a descargarlo.' });
        continue;
      }
      if (!e.isDirectory()) continue;
      const dir = join(dirGrupo, e.name);
      const mapas = {};
      let bytes = 0;
      for (const clave of MAPAS) {
        const archivo = ['jpg', 'png'].map((ext) => `${clave}.${ext}`).find((a) => existsSync(join(dir, a)));
        if (archivo) { mapas[clave] = `/recursos-sin-revisar/${slug}/texturas/${grupo.name}/${e.name}/${archivo}`; bytes += statSync(join(dir, archivo)).size; }
      }
      const lic = join(dir, 'LICENSE.txt');
      lista.push({ id: `${grupo.name}/${e.name}`, nombre: e.name.replace(/_/g, ' '), grupo: grupo.name, mapas, bytes, estado: 'descargado · sin revisar',
        licencia: existsSync(lic) ? 'CC0 (LICENSE.txt)' : grupo.name === 'agua' ? 'sin verificar (sin LICENSE.txt ni origen anotado)' : 'CC0 según el catálogo (la carpeta no trae LICENSE.txt)',
        fuente: grupo.name === 'agua' ? `origen por confirmar (carpeta ${e.name}, la dejó la sesión C)` : 'Poly Haven (catálogo #9)' });
    }
  }
  return { materiales: lista, problemas };
}

// Qué carpeta de disco corresponde a cada paquete del catálogo, y su imagen de muestra (recursos-sin-revisar/previews).
const DISCO = {
  1: { modelos: 'kenney-nature' }, 2: { modelos: 'kaykit-hex', estado: 'integrado' }, 3: { modelos: 'propios', estado: 'integrado' },
  4: { modelos: 'kenney-survival-kit', preview: 'kenney-survival-kit.png' }, 5: { modelos: 'kenney-castle-kit', preview: 'kenney-castle-kit.png' },
  6: { modelos: 'kenney-pirate-kit', preview: 'kenney-pirate-kit.png' }, 7: { modelos: 'kenney-fantasy-town-kit', preview: 'kenney-fantasy-town-kit.png' },
  9: { texturas: true }, 18: { texturas: true, archivo: 'texturas/agua/others_0020/difusa.jpg' }, 19: { archivo: 'hdri/mpumalanga_veld_puresky_2k.hdr' }, 20: { archivo: 'hdri/kloofendal_43d_clear_puresky_2k.hdr' }, 11: { preview: 'beelim-set5-akkadian-babylonian.jpg' }, 12: { preview: 'beelim-set4-egyptian-levantine.jpg' },
  13: { dos_d: 'mesopotamian-tombs' }, 17: { preview: 'lpc-desert-ruins.png', dos_d: 'lpc-desert-ruins' },
};

/** Extrae «**Etiqueta:** valor» de un bloque del catálogo (el valor acaba en « · **» o al final de la línea). */
const campo = (txt, et) => {
  const m = txt.match(new RegExp(`\\*\\*${et}:\\*\\*\\s*(.*?)(?:\\s+·\\s+\\*\\*|\\n|$)`));
  return m ? m[1].trim() : '';
};
const limpiar = (s) => s.replace(/\*\*|★/g, '').trim();

/** Modelo que representa a un paquete: el primero que parezca un edificio u objeto reconocible; si no, el más detallado (el de más peso). */
function elegirMuestra(modelos) {
  for (const re of [/house|hut|tent|choza|almacen|tower|castle|building|barrel|bridge|boat|ship/i, /palm|tree/i]) {
    const m = modelos.find((x) => re.test(x.nombre));
    if (m) return m;
  }
  return modelos.reduce((a, b) => (!a || b.bytes > a.bytes ? b : a), null);
}

/** Los paquetes del catálogo (`docs/recursos/catalogo.md`), con lo que hay en disco de cada uno. */
function paquetes(slug) {
  const p = join(GAMES, slug, 'docs', 'recursos', 'catalogo.md');
  if (!existsSync(p)) return [];
  const md = readFileSync(p, 'utf8').replace(/\r/g, '');
  const filas = new Map();
  for (const l of md.split(SEP_LINEA)) {
    const m = l.match(/^\|\s*(\d+)\s*\|(.+)\|\s*$/);
    if (m) filas.set(Number(m[1]), m[2].split('|').map((s) => s.trim()));
  }
  const bloques = new Map();
  for (const b of md.split(/^## (?=\d+\. )/m).slice(1)) bloques.set(parseInt(b, 10), b);
  const todos = modelos(slug);
  const lista = [];
  for (const [n, c] of filas) {
    const b = bloques.get(n) ?? '';
    const d = DISCO[n] ?? {};
    const tipoTxt = campo(b, 'Tipo · formatos');
    const compat = campo(b, 'Compatibilidad three.js/glTF');
    const tipo = /textura|hdri/i.test(tipoTxt) ? 'texturas' : /cat[aá]logo/i.test(tipoTxt) ? 'índice' : /sprites?|tileset|pixel|2D|renders/i.test(tipoTxt) ? '2D' : '3D';
    const licCorta = limpiar(c[2]);
    const precio = limpiar(c[3]);
    const gratis = /gratis|^—$/i.test(precio);
    const delPaquete = d.modelos ? todos.filter((m) => m.paquete === d.modelos) : [];
    const muestra = elegirMuestra(delPaquete);
    const dir2d = d.dos_d ? join(GAMES, slug, 'public', 'recursos', '2d', d.dos_d) : null;
    const en2d = dir2d && existsSync(dir2d);
    const enArchivo = d.archivo && existsSync(join(GAMES, slug, 'recursos-sin-revisar', d.archivo));
    const hayDisco = delPaquete.length > 0 || en2d || enArchivo || Boolean(d.texturas && !d.archivo && materiales(slug).materiales.length);
    const preview = d.preview && existsSync(join(GAMES, slug, 'recursos-sin-revisar', 'previews', d.preview)) ? `/recursos-sin-revisar/${slug}/previews/${d.preview}` : null;
    lista.push({
      n, nombre: limpiar(c[0]), fuente: limpiar(c[1]), enlace: (campo(b, 'Enlace').match(/https?:\/\/\S+/) ?? [''])[0],
      licencia: licCorta, licTipo: /^CC0/i.test(licCorta) ? 'cc0' : /propio/i.test(licCorta) ? 'propio' : /CC-BY|OGA-BY/i.test(licCorta) ? 'cc-by' : 'otra',
      precio, gratis, tipo, formato: tipoTxt, compat, valoracion: campo(b, 'Valoración \\(C, provisional\\)'), estadoCatalogo: limpiar(c[4]),
      estudio: !gratis ? 'descartado' : d.estado ?? (hayDisco ? 'descargado' : 'sin revisar'),
      encajaB: (tipo === '3D' || tipo === 'texturas') && !/^no/i.test(compat),
      preview, paqueteModelos: d.modelos ?? null, muestra: muestra?.url ?? null, archivos: delPaquete.length, texturas: Boolean(d.texturas),
    });
  }
  return lista;
}

function expectativas(slug) {
  const dir = join(GAMES, slug, 'espertativas');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => ({ nombre: f.replace(/\.[^.]+$/, ''), url: `/espertativas/${slug}/${encodeURIComponent(f)}`, bytes: statSync(join(dir, f)).size }));
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      return res.end(readFileSync(join(ROOT, 'studio', 'panel', 'index.html')));
    }
    if (p === '/api/hdri') return json(res, existsSync(join(GAMES, 'sedimento', 'recursos-sin-revisar', 'hdri')) ? readdirSync(join(GAMES, 'sedimento', 'recursos-sin-revisar', 'hdri')).filter((f) => /\.hdr$/i.test(f)).map((f) => `/recursos-sin-revisar/sedimento/hdri/${f}`) : []);
    if (p === '/laboratorio.js') return servir(res, join(ROOT, 'studio', 'panel'), 'laboratorio.js');
    if (p === '/api/juegos') return json(res, juegos());
    const m = p.match(/^\/api\/estado\/([\w-]+)$/);
    if (m) { const e = leerEstado(m[1]); return e ? json(res, e) : json(res, { error: 'sin estado' }, 404); }
    // three.js servido desde el juego: el laboratorio funciona sin depender de un CDN externo.
    const vt = p.match(/^\/vendor\/three\/(.+)$/);
    if (vt) return servir(res, join(GAMES, 'sedimento', 'node_modules', 'three'), vt[1], 'max-age=3600');
    const am = p.match(/^\/api\/(modelos|materiales|paquetes|expectativas)\/([\w-]+)$/);
    if (am) return json(res, { modelos, materiales, paquetes, expectativas }[am[1]](am[2]));
    // Rutas de solo lectura: cada una sirve una carpeta concreta del juego y nada fuera de ella.
    const rutas = [
      [/^\/modelos\/([\w-]+)\/(.+)$/, (s) => join(GAMES, s, 'public', 'modelos')],
      [/^\/recursos\/([\w-]+)\/(.+)$/, (s) => join(GAMES, s, 'public', 'recursos')],
      [/^\/recursos-sin-revisar\/([\w-]+)\/(.+)$/, (s) => join(GAMES, s, 'recursos-sin-revisar')],
      [/^\/espertativas\/([\w-]+)\/(.+)$/, (s) => join(GAMES, s, 'espertativas')],
      [/^\/evidencia\/([\w-]+)\/(.+)$/, (s) => join(GAMES, s, 'docs', 'evidencia')],
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
