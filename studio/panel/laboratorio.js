// Laboratorio de arte (SEDIMENTO · Art Direction Lab): portada, modelos, materiales y paquetes de recursos.
// La sección «Modelos» vive en index.html (window.panelModelos); aquí está el marco con las secciones
// y las nuevas: portada, materiales PBR en 3D y tarjetas de los paquetes del catálogo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const $l = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
async function api(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  return r.json();
}

const estilo = document.createElement('style');
estilo.textContent = `
.lab-nav { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px }
.lab-nav button { padding:7px 14px; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--text); font:inherit; font-size:14px; cursor:pointer }
.lab-nav button[aria-selected=true] { background:var(--accent); border-color:var(--accent); color:#fff }
.lab-h { margin:0 0 4px; font-size:20px } .lab-sub { margin:0 0 14px; color:var(--muted); font-size:14px; max-width:78ch }
.lab-hero { margin-bottom:14px; background:linear-gradient(135deg, var(--surface), var(--accent-soft)) }
.lab-hero h2 { margin:0 0 6px; font-size:26px; letter-spacing:-.01em } .lab-hero p { margin:0 0 8px; max-width:80ch; line-height:1.5 }
.lab-decision { border-left:4px solid var(--ok); background:var(--ok-soft); padding:10px 14px; border-radius:8px; margin-top:10px; font-size:14px }
.lab-accesos { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:10px; margin-bottom:14px }
.lab-acceso { text-align:left; background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); padding:14px; cursor:pointer; color:var(--text); font:inherit; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:4px }
.lab-acceso:hover:not(:disabled) { border-color:var(--accent) } .lab-acceso:disabled { opacity:.55; cursor:default }
.lab-acceso b { font-size:16px } .lab-acceso span { color:var(--muted); font-size:13px }
.lab-estilos { width:100%; border-collapse:collapse; font-size:13px } .lab-estilos td, .lab-estilos th { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top }
.lab-estilos tr.elegido td { background:var(--ok-soft) }
.lab-meta { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px; margin-top:8px }
.lab-meta img { width:100%; border-radius:8px; border:1px solid var(--line); display:block; aspect-ratio:16/10; object-fit:cover; background:var(--surface-2) }
.lab-meta figcaption { font-size:12px; color:var(--muted); margin-top:4px } .lab-meta figure { margin:0 }
.lab-leyenda { display:flex; flex-wrap:wrap; gap:8px 14px; font-size:13px; color:var(--muted); align-items:center }
.lab-sec { margin-bottom:14px }
.lab-error { border-left:4px solid var(--bad); background:var(--bad-soft); padding:10px 14px; border-radius:8px; font-size:14px; margin-bottom:10px }
.lab-error b { display:block }
.mat-grid, .pq-grid { display:grid; gap:10px } .mat-grid { grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)) } .pq-grid { grid-template-columns:repeat(auto-fill, minmax(270px, 1fr)) }
.mat-card, .pq-card { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); display:flex; flex-direction:column }
.mat-mini, .pq-mini { display:block; width:100%; border:0; padding:0; background:linear-gradient(180deg, #efe3c9, #d3bf94); position:relative }
.mat-mini { aspect-ratio:6/5; cursor:zoom-in } .pq-mini { aspect-ratio:16/10; overflow:hidden }
.mat-mini img, .pq-mini > img { width:100%; height:100%; object-fit:contain; display:block } .pq-mini > img.cubre { object-fit:cover }
.mat-mini img:not([src]), .mod-mini img:not([src]) { visibility:hidden }
.mat-mini.roto::after { content:'No se pudo renderizar'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#7a1c16; font-size:12px }
.mat-mapas { display:grid; grid-template-columns:repeat(auto-fit, minmax(0, 1fr)); gap:4px; padding:0 10px 10px }
.mat-mapas figure { margin:0; font-size:10px; color:var(--muted); text-align:center; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap } .mat-mapas img { width:100%; aspect-ratio:1; object-fit:cover; border-radius:4px; display:block; background:var(--surface-2) }
.pq-vacio { width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; padding:10px; font-size:12px; color:#5d4d2e }
.pq-mosaico { display:grid; grid-template-columns:repeat(4, 1fr); width:100%; height:100%; gap:2px }
.pq-mosaico img { width:100%; height:100%; object-fit:cover; display:block }
.pq-info { padding:10px 12px; display:flex; flex-direction:column; gap:6px; font-size:12px; flex:1 }
.pq-nombre { font-weight:650; font-size:14px; overflow-wrap:anywhere } .pq-fuente { color:var(--muted) }
.pq-linea { display:flex; flex-wrap:wrap; gap:4px 10px; color:var(--muted) } .pq-linea b { color:var(--text); font-weight:600 }
.pq-aviso { background:var(--bad-soft); color:var(--bad); padding:6px 8px; border-radius:6px; font-weight:600 }
.pq-info details { color:var(--muted) } .pq-info summary { cursor:pointer; color:var(--accent) }
.pq-acc { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; padding-top:4px }
.tag.sin-revisar { background:var(--warn-soft); color:var(--warn) } .tag.integrado { background:var(--ok-soft); color:var(--ok) }
.tag.descartado { background:var(--bad-soft); color:var(--bad) } .tag.estiloB { background:var(--accent-soft); color:var(--accent); font-weight:600 }
a.btn { text-decoration:none; display:inline-block }
.lv { position:fixed; inset:0; background:rgba(10,10,12,.72); display:flex; align-items:center; justify-content:center; z-index:50; padding:12px }
.lv-caja { background:var(--surface); border-radius:var(--radius); width:min(1000px, 100%); height:min(720px, 100%); display:flex; flex-direction:column; overflow:hidden }
.lv-cab { display:flex; gap:8px 12px; align-items:center; padding:10px 12px; border-bottom:1px solid var(--line); flex-wrap:wrap }
.lv-cab h3 { margin:0; font-size:15px; flex:1 1 160px; min-width:0; overflow-wrap:anywhere }
.lv-cab label { display:flex; gap:4px; align-items:center; font-size:13px; cursor:pointer }
.lv-lienzo { flex:1; min-height:0; background:linear-gradient(180deg, #f3e3c4, #d2bb8e) } .lv-lienzo canvas { display:block; width:100%; height:100% }
.lv-pie { padding:8px 12px; font-size:12px; color:var(--muted); border-top:1px solid var(--line) }
`;
document.head.appendChild(estilo);

// ── Texturas, entorno HDRI y escena de un material ─────────────────────────────────────────
const texLoader = new THREE.TextureLoader();
const cacheTex = new Map();
function tex(url, srgb) {
  if (!cacheTex.has(url)) {
    cacheTex.set(url, texLoader.loadAsync(url).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 4;
      return t;
    }));
  }
  return cacheTex.get(url);
}

let promesaEntorno = null;
/** El HDRI descargado (si hay) como entorno de reflejos; si no hay o falla, null y se usa solo la luz de la escena. */
function entorno() {
  promesaEntorno ??= api('/api/hdri').then((l) => (l[0] ? new HDRLoader().loadAsync(l[0]) : null)).then((t) => { if (t) t.mapping = THREE.EquirectangularReflectionMapping; return t; }).catch((e) => { console.warn('[lab] sin HDRI', e); return null; });
  return promesaEntorno;
}

const TODOS = { difusa: true, normal: true, rugosidad: true, oclusion: true };
/** Material PBR con los mapas pedidos; sin difusa queda gris para poder juzgar solo la forma (normal) y el brillo (rugosidad). */
async function materialPBR(m, usar) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  if (usar.difusa && m.mapas.difusa) mat.map = await tex(m.mapas.difusa, true); else mat.color.set('#b9b3a8');
  if (usar.normal && m.mapas.normal) mat.normalMap = await tex(m.mapas.normal, false);
  if (usar.rugosidad && m.mapas.rugosidad) mat.roughnessMap = await tex(m.mapas.rugosidad, false);
  if (usar.oclusion && m.mapas.oclusion) mat.aoMap = await tex(m.mapas.oclusion, false);
  return mat;
}

function escenaMaterial(mat, env) {
  const escena = new THREE.Scene();
  const hemi = new THREE.HemisphereLight('#cfe2ff', '#b08a5a', env ? 0.3 : 1.1);
  const sol = new THREE.DirectionalLight('#ffe6b8', 2.4);
  sol.position.set(-3, 2.5, 3.5);
  escena.add(hemi, sol);
  if (env) { escena.environment = env; escena.environmentIntensity = 0.9; }
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.9, 64, 48), mat);
  esfera.position.x = -1.15;
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), mat);
  plano.position.x = 1.15;
  plano.rotation.set(-0.5, -0.35, 0);
  escena.add(esfera, plano);
  return { escena, hemi, esfera, plano };
}
const liberarEscena = (e) => { e.esfera.geometry.dispose(); e.plano.geometry.dispose(); };
function nuevoRenderer(opciones = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, ...opciones });
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}
/** Aleja la cámara lo justo para que esfera y plano quepan a lo ancho, también en pantallas estrechas. */
function encuadrarMaterial(c) {
  const ancho = 2.5 / (Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * Math.max(0.3, c.aspect));
  c.position.set(0, 0.7, Math.max(6.6, ancho));
  c.lookAt(0, 0, 0);
}
const camaraMaterial = (aspecto) => { const c = new THREE.PerspectiveCamera(32, aspecto, 0.1, 80); encuadrarMaterial(c); return c; };

// Miniaturas de materiales: un renderer único y una cola, como en Modelos (una instancia WebGL por tarjeta no aguanta).
const MINI = { w: 300, h: 250 };
let rMat = null;
let colaMat = Promise.resolve();
const miniMat = new Map();
function miniaturaMaterial(m, img) {
  if (miniMat.has(m.id)) { img.src = miniMat.get(m.id); return; }
  colaMat = colaMat.then(async () => {
    if (!img.isConnected) return;
    try {
      if (!rMat) { rMat = nuevoRenderer({ preserveDrawingBuffer: true }); rMat.setSize(MINI.w, MINI.h); }
      const env = await entorno();
      const mat = await materialPBR(m, TODOS);
      const e = escenaMaterial(mat, env);
      rMat.render(e.escena, camaraMaterial(MINI.w / MINI.h));
      const url = rMat.domElement.toDataURL('image/png');
      miniMat.set(m.id, url);
      img.src = url;
      liberarEscena(e);
      mat.dispose();
    } catch (err) {
      console.warn('[materiales]', m.id, err);
      img.closest('.mat-mini')?.classList.add('roto');
    }
  });
}
/** Carga diferida: la miniatura solo se renderiza cuando la tarjeta se acerca a la pantalla. */
function alVer(el, fn) {
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const o = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { o.disconnect(); fn(); } }, { rootMargin: '300px' });
  o.observe(el);
}

// ── Visor 3D de un material ───────────────────────────────────────────────────────────────
let visorMat = null;
async function abrirVisorMaterial(m) {
  visorMat?.();
  const fondo = document.createElement('div');
  fondo.className = 'lv';
  const mapasTxt = { difusa: 'Difusa', normal: 'Normal', rugosidad: 'Rugosidad', oclusion: 'Oclusión' };
  const claves = Object.keys(mapasTxt).filter((k) => m.mapas[k]);
  fondo.innerHTML = `<div class="lv-caja" role="dialog" aria-label="Visor de material"><div class="lv-cab"><h3>${esc(m.nombre)} · ${esc(m.grupo)}</h3>
    ${claves.map((k) => `<label><input type="checkbox" data-mapa="${k}" checked> ${mapasTxt[k]}</label>`).join('')}
    <label><input type="checkbox" id="lv-hdri" checked> HDRI</label><button class="btn" type="button" id="lv-cerrar">Cerrar (Esc)</button></div>
    <div class="lv-lienzo" id="lv-lienzo"></div>
    <div class="lv-pie">${esc(m.licencia)} · ${esc(m.fuente)} · ${kb(m.bytes)} · mapas: ${Object.keys(m.mapas).join(', ')}. Esfera y plano con el mismo material. Arrastra para girar la vista; desmarca un mapa para ver qué aporta.</div></div>`;
  document.body.appendChild(fondo);
  const lienzo = $l('#lv-lienzo', fondo);
  const renderer = nuevoRenderer();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  lienzo.appendChild(renderer.domElement);
  const camara = camaraMaterial(1);
  const control = new OrbitControls(camara, renderer.domElement);
  control.enableDamping = true;
  let actual = null;
  let matActual = null;
  const env = await entorno();
  async function reconstruir() {
    const usar = { difusa: false, normal: false, rugosidad: false, oclusion: false };
    fondo.querySelectorAll('[data-mapa]').forEach((c) => { usar[c.dataset.mapa] = c.checked; });
    const conHdri = Boolean($l('#lv-hdri', fondo).checked && env);
    const mat = await materialPBR(m, usar);
    if (actual) liberarEscena(actual);
    matActual?.dispose();
    actual = escenaMaterial(mat, conHdri ? env : null);
    matActual = mat;
  }
  await reconstruir();
  fondo.querySelectorAll('input').forEach((c) => c.addEventListener('change', reconstruir));
  const medir = () => { renderer.setSize(lienzo.clientWidth, lienzo.clientHeight); camara.aspect = lienzo.clientWidth / Math.max(1, lienzo.clientHeight); camara.updateProjectionMatrix(); encuadrarMaterial(camara); control.update(); };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(lienzo);
  renderer.setAnimationLoop(() => { control.update(); if (actual) renderer.render(actual.escena, camara); });
  const teclas = (e) => { if (e.key === 'Escape') cerrar(); };
  const cerrar = () => { renderer.setAnimationLoop(null); ro.disconnect(); control.dispose(); renderer.dispose(); if (actual) liberarEscena(actual); matActual?.dispose(); removeEventListener('keydown', teclas); fondo.remove(); visorMat = null; };
  addEventListener('keydown', teclas);
  fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
  $l('#lv-cerrar', fondo).onclick = cerrar;
  visorMat = cerrar;
}

// ── Marco y navegación ────────────────────────────────────────────────────────────────────
const SECCIONES = [['portada', 'Portada'], ['modelos', 'Modelos'], ['materiales', 'Materiales'], ['paquetes', 'Paquetes']];
let slugActual = '';
let cuerpo = null;
let nav = null;

function error(c, e, reintentar) {
  c.innerHTML = `<div class="card welcome"><p><b>No se pudo cargar esta sección.</b></p><p class="empty">${esc(e.message)}</p><button class="btn prim" type="button" id="lab-reintentar">Reintentar</button></div>`;
  $l('#lab-reintentar', c).onclick = reintentar;
}

function ir(seccion) {
  guardar('panel.lab.seccion', seccion);
  visorMat?.();
  nav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.s === seccion)));
  cuerpo.innerHTML = '';
  const pintar = { portada, materiales, paquetes, modelos: (c) => window.panelModelos.mostrar(slugActual, c) }[seccion];
  pintar(cuerpo);
}

function mostrar(slug, contenedor) {
  slugActual = slug;
  contenedor.innerHTML = `<nav class="lab-nav" role="tablist" aria-label="Secciones del laboratorio">${SECCIONES.map(([k, t]) => `<button type="button" role="tab" data-s="${k}">${t}</button>`).join('')}</nav><div id="lab-cuerpo"></div>`;
  nav = $l('.lab-nav', contenedor);
  cuerpo = $l('#lab-cuerpo', contenedor);
  nav.querySelectorAll('button').forEach((b) => { b.onclick = () => ir(b.dataset.s); });
  const guardada = leer('panel.lab.seccion', 'portada');
  ir(SECCIONES.some(([k]) => k === guardada) ? guardada : 'portada');
}

// ── Portada ───────────────────────────────────────────────────────────────────────────────
const ESTILOS = [
  ['A', 'Low-poly con color de vértice', 'Es lo que hay hoy en el juego (provisional). Barato, pero se ve plano frente a las expectativas.', 'Modelos propios y KayKit.', false],
  ['B', '3D cálido con texturas PBR', 'La meta visual de las imágenes de expectativas: luz dorada, materiales con relieve y ciudad densa. Exige atlas, LOD e instancing.', 'Kits Kenney, texturas Poly Haven y HDRI: en Modelos y Materiales.', true],
  ['C', 'Pixel art isométrico', 'Bajo coste de GPU, alto de producción (cada edificio × ángulos × 6 etapas). Choca con la cámara libre.', 'Previews de los paquetes 2D en Paquetes.', false],
  ['D', 'Híbrido', 'Solo si una regla escrita lo justifica (R23), p. ej. terreno PBR con edificios estilizados.', 'Aún sin escena (fase A4).', false],
];

async function portada(c) {
  c.innerHTML = '<p class="empty">Cargando portada…</p>';
  try {
    const [mods, mats, pqs, metas] = await Promise.all([api(`/api/modelos/${slugActual}`), api(`/api/materiales/${slugActual}`), api(`/api/paquetes/${slugActual}`), api(`/api/expectativas/${slugActual}`)]);
    const nPaq = new Set(mods.map((m) => m.paquete)).size;
    const cuenta = (e) => pqs.filter((p) => p.estudio === e).length;
    c.innerHTML = `<section class="card lab-hero"><h2>SEDIMENTO — Art Direction Lab</h2>
      <p>Aquí se comparan con material real, no con descripciones, los estilos gráficos posibles antes de fijar el definitivo (R23): modelos 3D, materiales PBR y los paquetes de recursos del catálogo con su licencia, su precio y su estado.</p>
      <div class="lab-decision"><b>★ Estilo elegido (R42): B — 3D cálido con texturas.</b> Se parece a la meta visual de las imágenes de expectativas. El laboratorio destaca lo que encaja con B (primero en Paquetes) sin esconder A ni C. Todo lo gratuito; nada de pago (R43).</div></section>
    <div class="lab-accesos">
      <button class="lab-acceso" type="button" data-ir="modelos"><b>Modelos 3D</b><span>${mods.length} modelos en ${nPaq} paquetes · visor y comparación</span></button>
      <button class="lab-acceso" type="button" data-ir="materiales"><b>Materiales PBR</b><span>${mats.materiales.length} materiales en esfera y plano con luz${mats.problemas.length ? ` · ${mats.problemas.length} con problemas` : ''}</span></button>
      <button class="lab-acceso" type="button" data-ir="paquetes"><b>Paquetes de recursos</b><span>${pqs.length} paquetes · ${cuenta('sin revisar')} sin revisar · ${cuenta('descargado')} descargados · ${cuenta('integrado')} integrados</span></button>
      <button class="lab-acceso" type="button" disabled><b>Pixel art, estilos y comparador</b><span>Fase A4: construcción progresiva, aldea en A/B/C y favoritos</span></button></div>
    <section class="card lab-sec"><h3 style="margin-top:0">Los cuatro estilos candidatos</h3><div style="overflow-x:auto"><table class="lab-estilos"><thead><tr><th>Estilo</th><th>Qué es</th><th>Riesgo</th><th>Qué se ve aquí</th></tr></thead><tbody>
      ${ESTILOS.map(([k, t, r, v, el]) => `<tr class="${el ? 'elegido' : ''}"><td><b>${k}</b>${el ? ' ★' : ''}</td><td>${esc(t)}</td><td>${esc(r)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="card lab-sec"><h3 style="margin-top:0">Estados de un recurso</h3><div class="lab-leyenda"><span><span class="tag sin-revisar">sin revisar</span> no descargado</span><span><span class="tag descargado">descargado</span> en disco, sin usar en el juego</span><span><span class="tag integrado">integrado</span> ya se usa en el juego</span><span><span class="tag descartado">descartado</span> no se usará (p. ej. de pago, R43)</span></div></section>
    <section class="card lab-sec"><h3 style="margin-top:0">Meta visual (R39)</h3>${metas.length ? `<div class="lab-meta">${metas.map((x) => `<figure><img loading="lazy" src="${esc(x.url)}" alt="${esc(x.nombre)}"><figcaption>${esc(x.nombre)}</figcaption></figure>`).join('')}</div>` : '<p class="empty">Aún no hay imágenes en <code>espertativas/</code>.</p>'}</section>`;
    c.querySelectorAll('[data-ir]').forEach((b) => { b.onclick = () => ir(b.dataset.ir); });
  } catch (e) { error(c, e, () => portada(c)); }
}

// ── Materiales ────────────────────────────────────────────────────────────────────────────
const filtrosMat = leer('panel.lab.materiales', { texto: '', grupo: 'todos' });
const NOMBRE_MAPA = { difusa: 'difusa', normal: 'normal', rugosidad: 'rugosidad', oclusion: 'oclusión', altura: 'altura' };

async function materiales(c) {
  c.innerHTML = '<p class="empty">Cargando materiales…</p>';
  let datos;
  try { datos = await api(`/api/materiales/${slugActual}`); } catch (e) { error(c, e, () => materiales(c)); return; }
  const grupos = ['todos', ...new Set(datos.materiales.map((m) => m.grupo))];
  const pintar = () => {
    const t = filtrosMat.texto.trim().toLowerCase();
    const vis = datos.materiales.filter((m) => (filtrosMat.grupo === 'todos' || m.grupo === filtrosMat.grupo) && (!t || `${m.nombre} ${m.grupo}`.toLowerCase().includes(t)));
    c.innerHTML = `<h3 class="lab-h">Materiales PBR</h3><p class="lab-sub">Cada textura de <code>recursos-sin-revisar/texturas</code> sobre una esfera y un plano, con luz y reflejos del HDRI descargado. Pulsa una tarjeta para abrirla en 3D y activar o quitar cada mapa. Todo está <b>descargado y sin revisar</b>: ninguno se usa aún en el juego.</p>
      ${datos.problemas.map((p) => `<div class="lab-error"><b>${esc(p.grupo)}/${esc(p.nombre)}</b>${esc(p.motivo)}</div>`).join('')}
      <div class="card" style="margin-bottom:10px"><div class="mod-bar"><input type="search" id="mt-texto" placeholder="Buscar material (hierba, adobe, roca…)" value="${esc(filtrosMat.texto)}"></div>
        <div class="mod-bar"><div class="mod-grupo"><span class="lbl">Grupo</span>${grupos.map((g) => `<button class="chip" type="button" data-grupo="${esc(g)}" aria-pressed="${filtrosMat.grupo === g}">${esc(g)}</button>`).join('')}</div></div>
        <div class="mod-cuenta">${vis.length} de ${datos.materiales.length} materiales</div></div>
      <div class="mat-grid">${vis.map((m) => `<article class="mat-card" data-id="${esc(m.id)}"><button class="mat-mini" type="button" data-ver="${esc(m.id)}" title="Ver en 3D"><img alt="${esc(m.nombre)} sobre esfera y plano"></button>
        <div class="mod-info"><div class="mod-nombre">${esc(m.nombre)}</div><div class="mod-tags"><span class="tag">${esc(m.grupo)}</span><span class="tag descargado">descargado</span><span class="tag sin-revisar">sin revisar</span><span class="tag">${kb(m.bytes)}</span></div></div>
        <div class="mat-mapas">${Object.entries(m.mapas).map(([k, u]) => `<figure><img loading="lazy" src="${esc(u)}" alt="Mapa ${NOMBRE_MAPA[k]} de ${esc(m.nombre)}">${NOMBRE_MAPA[k]}</figure>`).join('')}</div></article>`).join('') || '<p class="empty">Ningún material con estos filtros.</p>'}</div>`;
    vis.forEach((m) => { const img = $l(`.mat-card[data-id="${CSS.escape(m.id)}"] .mat-mini img`, c); alVer(img, () => miniaturaMaterial(m, img)); });
    const texto = $l('#mt-texto', c);
    texto.oninput = () => { filtrosMat.texto = texto.value; clearTimeout(texto._t); texto._t = setTimeout(() => { guardar('panel.lab.materiales', filtrosMat); pintar(); const n = $l('#mt-texto', c); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    c.querySelectorAll('[data-grupo]').forEach((b) => { b.onclick = () => { filtrosMat.grupo = b.dataset.grupo; guardar('panel.lab.materiales', filtrosMat); pintar(); }; });
    c.querySelectorAll('[data-ver]').forEach((b) => { b.onclick = () => abrirVisorMaterial(datos.materiales.find((m) => m.id === b.dataset.ver)); });
  };
  if (!datos.materiales.length && !datos.problemas.length) { c.innerHTML = '<div class="card welcome"><p>No hay texturas en <code>recursos-sin-revisar/texturas</code>.</p></div>'; return; }
  pintar();
}

// ── Paquetes ──────────────────────────────────────────────────────────────────────────────
const filtrosPaq = leer('panel.lab.paquetes', { texto: '', estudio: 'todos', tipo: 'todos' });
const ESTADOS = ['todos', 'sin revisar', 'descargado', 'integrado', 'descartado'];
const TIPOS = ['todos', '3D', 'texturas', '2D', 'índice'];
const clase = (e) => e.replace(' ', '-');

async function paquetes(c) {
  c.innerHTML = '<p class="empty">Cargando paquetes…</p>';
  let lista;
  let mats = [];
  try { [lista, mats] = await Promise.all([api(`/api/paquetes/${slugActual}`), api(`/api/materiales/${slugActual}`).then((d) => d.materiales)]); } catch (e) { error(c, e, () => paquetes(c)); return; }
  lista.sort((a, b) => (Number(b.encajaB) - Number(a.encajaB)) || (a.n - b.n));
  const pintar = () => {
    const t = filtrosPaq.texto.trim().toLowerCase();
    const vis = lista.filter((p) => (filtrosPaq.estudio === 'todos' || p.estudio === filtrosPaq.estudio) && (filtrosPaq.tipo === 'todos' || p.tipo === filtrosPaq.tipo) && (!t || `${p.nombre} ${p.fuente} ${p.licencia}`.toLowerCase().includes(t)));
    const muestra = (p) => {
      if (p.preview) return `<img loading="lazy" class="cubre" src="${esc(p.preview)}" alt="Imagen de muestra de ${esc(p.nombre)}">`;
      if (p.muestra) return '<img alt="Miniatura de un modelo del paquete">';
      if (p.texturas && mats.length) return `<div class="pq-mosaico">${mats.slice(0, 4).map((m) => `<img loading="lazy" src="${esc(m.mapas.difusa)}" alt="">`).join('')}</div>`;
      return '<div class="pq-vacio">Sin imagen de muestra todavía</div>';
    };
    c.innerHTML = `<h3 class="lab-h">Paquetes de recursos</h3><p class="lab-sub">Los ${lista.length} paquetes del catálogo (<code>docs/recursos/catalogo.md</code>) con su licencia, precio y estado. Los que encajan con el estilo B van primero; los demás siguen a la vista. Solo se descarga lo gratuito (R43).</p>
      <div class="card" style="margin-bottom:10px"><div class="mod-bar"><input type="search" id="pq-texto" placeholder="Buscar paquete, autor o licencia…" value="${esc(filtrosPaq.texto)}"></div>
        <div class="mod-bar"><div class="mod-grupo"><span class="lbl">Estado</span>${ESTADOS.map((x) => `<button class="chip" type="button" data-estudio="${esc(x)}" aria-pressed="${filtrosPaq.estudio === x}">${esc(x)}</button>`).join('')}</div></div>
        <div class="mod-bar"><div class="mod-grupo"><span class="lbl">Tipo</span>${TIPOS.map((x) => `<button class="chip" type="button" data-tipo="${esc(x)}" aria-pressed="${filtrosPaq.tipo === x}">${esc(x)}</button>`).join('')}</div></div>
        <div class="mod-cuenta">${vis.length} de ${lista.length} paquetes</div></div>
      <div class="pq-grid">${vis.map((p) => `<article class="pq-card" data-n="${p.n}"><div class="pq-mini">${muestra(p)}</div><div class="pq-info">
        <div class="pq-nombre">${p.n}. ${esc(p.nombre)}</div><div class="pq-fuente">${esc(p.fuente)}</div>
        <div class="mod-tags"><span class="tag ${clase(p.estudio)}">${esc(p.estudio)}</span><span class="tag ${p.licTipo === 'otra' ? 'sin-revisar' : ''}">${esc(p.licencia.length > 34 ? p.licencia.slice(0, 32) + '…' : p.licencia)}</span><span class="tag">${esc(p.precio)}</span><span class="tag">${esc(p.tipo)}</span>${p.encajaB ? '<span class="tag estiloB">★ encaja con B</span>' : p.tipo === '2D' ? '<span class="tag">estilo C/D (2D)</span>' : ''}</div>
        ${p.estudio === 'descartado' ? '<div class="pq-aviso">De pago: descartado por la regla de cero gasto (R43). Solo se ve la imagen de muestra.</div>' : ''}
        <div class="pq-linea"><span><b>Formato:</b> ${esc(p.formato || '—')}</span></div><div class="pq-linea"><span><b>three.js:</b> ${esc(p.compat || '—')}</span>${p.archivos ? `<span><b>En disco:</b> ${p.archivos} modelos</span>` : ''}</div>
        <details><summary>Valoración (C, provisional)</summary><p style="margin:4px 0 0">${esc(p.valoracion || 'Sin valoración')}</p><p style="margin:4px 0 0"><b>Catálogo:</b> ${esc(p.estadoCatalogo)}</p></details>
        <div class="pq-acc">${p.paqueteModelos ? `<button class="btn prim" type="button" data-modelos="${esc(p.paqueteModelos)}">Ver ${p.archivos} modelos</button>` : ''}${p.texturas && mats.length ? '<button class="btn prim" type="button" data-materiales="1">Ver materiales</button>' : ''}${p.enlace ? `<a class="btn" href="${esc(p.enlace)}" target="_blank" rel="noopener noreferrer">Fuente ↗</a>` : ''}</div></div></article>`).join('') || '<p class="empty">Ningún paquete con estos filtros.</p>'}</div>`;
    vis.filter((p) => !p.preview && p.muestra).forEach((p) => { const img = $l(`.pq-card[data-n="${p.n}"] .pq-mini img`, c); alVer(img, () => window.panelModelos.miniatura(p.muestra, img)); });
    const texto = $l('#pq-texto', c);
    texto.oninput = () => { filtrosPaq.texto = texto.value; clearTimeout(texto._t); texto._t = setTimeout(() => { guardar('panel.lab.paquetes', filtrosPaq); pintar(); const n = $l('#pq-texto', c); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    c.querySelectorAll('[data-estudio]').forEach((b) => { b.onclick = () => { filtrosPaq.estudio = b.dataset.estudio; guardar('panel.lab.paquetes', filtrosPaq); pintar(); }; });
    c.querySelectorAll('[data-tipo]').forEach((b) => { b.onclick = () => { filtrosPaq.tipo = b.dataset.tipo; guardar('panel.lab.paquetes', filtrosPaq); pintar(); }; });
    c.querySelectorAll('[data-modelos]').forEach((b) => { b.onclick = () => { window.panelModelos.filtrarPaquete(b.dataset.modelos); ir('modelos'); }; });
    c.querySelectorAll('[data-materiales]').forEach((b) => { b.onclick = () => ir('materiales'); });
  };
  pintar();
}

window.panelLab = { mostrar, ir };
