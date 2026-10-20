#!/usr/bin/env node
// Bitácora del estudio: única fuente de verdad del progreso de cada juego.
// Claude la usa con un comando por evento (barato en tokens); el panel la lee.
// Uso: node studio/bitacora.mjs <comando> [json | -]   ("-" lee el JSON de stdin)
// Ver `node studio/bitacora.mjs ayuda`.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACTIVO = join(ROOT, 'studio', 'activo.txt');
const MAX_ACTIVIDAD = 200;

const AYUDA = `Bitácora — comandos (juego activo por defecto; --juego <slug> para otro):
  usar <slug>                   fija el juego activo
  juegos                        lista juegos y su progreso
  estado                        resumen compacto del juego activo
  juego    '{"nombre","pitch","motor","genero","pilares":[]}'      metadatos (merge)
  fase     '{"id":"F03","titulo","objetivo","criterios":[],"estado","hecho":[],"verificacion":{},"motivo"}'
           upsert por id; "hecho" se acumula; estado: pendiente|en-curso|hecha|bloqueada
  error    '{"fase","sintoma","causa","solucion","estado":"resuelto|abierto"}'
  falta    '{"texto","prioridad":"alta|media|baja","area"}'
  reco     '{"area","texto","porque","prioridad"}'
  decision '{"texto","porque","fase"}'
  aprende  '{"concepto","explicacion"}'          concepto de gamedev para el usuario
  nota     '{"texto"}'
  cerrar   <falta|reco|error> <id>                marca como resuelto/aplicado
Ejemplo: node studio/bitacora.mjs error '{"fase":"F02","sintoma":"...","causa":"...","solucion":"..."}'`;

const ahora = () => new Date().toISOString();
const die = (msg) => { console.error(`bitácora: ${msg}`); process.exit(1); };

function leerJson(arg) {
  if (arg === undefined) die('falta el JSON');
  const raw = arg === '-' ? readFileSync(0, 'utf8') : arg;
  try { return JSON.parse(raw); } catch (e) { die(`JSON inválido: ${e.message}`); }
}

function slugActivo(args) {
  const i = args.indexOf('--juego');
  if (i !== -1) { const s = args[i + 1]; args.splice(i, 2); return s; }
  if (!existsSync(ACTIVO)) die('no hay juego activo; usa: bitacora.mjs usar <slug>');
  return readFileSync(ACTIVO, 'utf8').trim();
}

const rutaEstado = (slug) => join(ROOT, 'games', slug, 'docs', 'estado.json');

function cargar(slug) {
  const p = rutaEstado(slug);
  if (!existsSync(join(ROOT, 'games', slug))) die(`no existe games/${slug}`);
  if (!existsSync(p)) {
    return { juego: { slug, nombre: slug }, fases: [], errores: [], faltantes: [], recomendaciones: [],
      decisiones: [], conceptos: [], actividad: [], actualizado: ahora() };
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

function guardar(slug, est, resumen) {
  est.actualizado = ahora();
  if (resumen) {
    est.actividad.unshift({ t: est.actualizado, texto: resumen });
    est.actividad.length = Math.min(est.actividad.length, MAX_ACTIVIDAD);
  }
  const p = rutaEstado(slug);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(est, null, 2) + '\n');
}

const sigId = (lista, pref) => `${pref}${String(lista.length + 1).padStart(3, '0')}`;

function agregar(est, clave, pref, datos, extra = {}) {
  const item = { id: sigId(est[clave], pref), t: ahora(), ...extra, ...datos };
  est[clave].push(item);
  return item;
}

function resumenEstado(slug, est) {
  const f = est.fases;
  const hechas = f.filter((x) => x.estado === 'hecha').length;
  const actual = f.find((x) => x.estado === 'en-curso');
  const sig = f.find((x) => x.estado === 'pendiente');
  const bloq = f.filter((x) => x.estado === 'bloqueada');
  const errAb = est.errores.filter((x) => x.estado === 'abierto');
  const faltAlta = est.faltantes.filter((x) => !x.cerrado && x.prioridad === 'alta');
  const lineas = [
    `[${slug}] ${est.juego.nombre ?? slug} · ${est.juego.motor ?? '?'} · fases ${hechas}/${f.length}`,
    actual ? `EN CURSO ${actual.id} ${actual.titulo} — ${actual.objetivo ?? ''}` : 'EN CURSO: ninguna',
    sig ? `SIGUIENTE ${sig.id} ${sig.titulo}` : 'SIGUIENTE: ninguna (¿roadmap terminado?)',
  ];
  if (bloq.length) lineas.push(`BLOQUEADAS: ${bloq.map((x) => `${x.id} (${x.motivo ?? 'sin motivo'})`).join('; ')}`);
  if (errAb.length) lineas.push(`ERRORES ABIERTOS: ${errAb.map((x) => `${x.id} ${x.sintoma}`).join('; ')}`);
  if (faltAlta.length) lineas.push(`FALTA (alta): ${faltAlta.map((x) => x.texto).join('; ')}`);
  return lineas.join('\n');
}

const args = process.argv.slice(2);
const cmd = args.shift();

switch (cmd) {
  case undefined: case 'ayuda': case '-h': case '--help':
    console.log(AYUDA); break;

  case 'usar': {
    const slug = args[0] ?? die('falta <slug>');
    if (!existsSync(join(ROOT, 'games', slug))) die(`no existe games/${slug}`);
    writeFileSync(ACTIVO, slug + '\n');
    console.log(`juego activo: ${slug}`); break;
  }

  case 'juegos': {
    const dir = join(ROOT, 'games');
    const slugs = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
    if (!slugs.length) { console.log('sin juegos todavía'); break; }
    for (const s of slugs) {
      const e = existsSync(rutaEstado(s)) ? JSON.parse(readFileSync(rutaEstado(s), 'utf8')) : null;
      const h = e ? e.fases.filter((x) => x.estado === 'hecha').length : 0;
      console.log(`${s}: ${e?.juego.nombre ?? s} · fases ${h}/${e?.fases.length ?? 0}`);
    }
    break;
  }

  case 'estado': {
    const slug = slugActivo(args);
    console.log(resumenEstado(slug, cargar(slug))); break;
  }

  case 'juego': {
    const slug = slugActivo(args); const est = cargar(slug);
    est.juego = { ...est.juego, ...leerJson(args[0]), slug };
    guardar(slug, est, 'Metadatos del juego actualizados');
    console.log('ok juego'); break;
  }

  case 'fase': {
    const slug = slugActivo(args); const est = cargar(slug); const d = leerJson(args[0]);
    if (!d.id) die('la fase necesita "id" (ej. F03)');
    let f = est.fases.find((x) => x.id === d.id);
    const antes = f?.estado;
    if (!f) { f = { id: d.id, estado: 'pendiente', hecho: [], creada: ahora() }; est.fases.push(f); }
    const { hecho, ...resto } = d;
    Object.assign(f, resto);
    if (hecho) f.hecho = [...(f.hecho ?? []), ...[].concat(hecho)];
    if (f.estado === 'en-curso' && antes !== 'en-curso') f.inicio = ahora();
    if (f.estado === 'hecha' && antes !== 'hecha') f.fin = ahora();
    est.fases.sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
    const verbo = !antes ? 'creada' : antes !== f.estado ? `→ ${f.estado}` : 'actualizada';
    guardar(slug, est, `Fase ${f.id} ${verbo}: ${f.titulo ?? ''}`);
    console.log(`ok fase ${f.id} (${f.estado})`); break;
  }

  case 'error': {
    const slug = slugActivo(args); const est = cargar(slug);
    const it = agregar(est, 'errores', 'E', leerJson(args[0]), { estado: 'resuelto' });
    guardar(slug, est, `Error ${it.id} (${it.estado}): ${it.sintoma ?? ''}`);
    console.log(`ok ${it.id}`); break;
  }

  case 'falta': {
    const slug = slugActivo(args); const est = cargar(slug);
    const it = agregar(est, 'faltantes', 'L', leerJson(args[0]), { prioridad: 'media', cerrado: false });
    guardar(slug, est, `Falta: ${it.texto}`);
    console.log(`ok ${it.id}`); break;
  }

  case 'reco': {
    const slug = slugActivo(args); const est = cargar(slug);
    const it = agregar(est, 'recomendaciones', 'R', leerJson(args[0]), { prioridad: 'media', cerrado: false });
    guardar(slug, est, `Recomendación (${it.area ?? 'general'}): ${it.texto}`);
    console.log(`ok ${it.id}`); break;
  }

  case 'decision': {
    const slug = slugActivo(args); const est = cargar(slug);
    const it = agregar(est, 'decisiones', 'D', leerJson(args[0]));
    guardar(slug, est, `Decisión: ${it.texto}`);
    console.log(`ok ${it.id}`); break;
  }

  case 'aprende': {
    const slug = slugActivo(args); const est = cargar(slug);
    const it = agregar(est, 'conceptos', 'C', leerJson(args[0]));
    guardar(slug, est, `Concepto: ${it.concepto}`);
    console.log(`ok ${it.id}`); break;
  }

  case 'nota': {
    const slug = slugActivo(args); const est = cargar(slug);
    guardar(slug, est, leerJson(args[0]).texto ?? die('falta "texto"'));
    console.log('ok nota'); break;
  }

  case 'cerrar': {
    const slug = slugActivo(args); const est = cargar(slug);
    const [tipo, id] = args;
    const clave = { falta: 'faltantes', reco: 'recomendaciones', error: 'errores' }[tipo] ?? die('tipo: falta|reco|error');
    const it = est[clave].find((x) => x.id === id) ?? die(`no existe ${id}`);
    if (tipo === 'error') it.estado = 'resuelto'; else it.cerrado = true;
    it.cerradoEn = ahora();
    guardar(slug, est, `Cerrado ${id}`);
    console.log(`ok cerrado ${id}`); break;
  }

  default:
    die(`comando desconocido "${cmd}"\n${AYUDA}`);
}
