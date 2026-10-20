// Pixel art propio (SEDIMENTO): «Pixel art» (atlas, hoja, paleta, animación) y «Avances» (R64: galería
// de capturas de fase + bocetos de arte, para ver el progreso al abrir el panel). Todo se genera por
// código (tools/arte-pixel) o se guarda al cerrar una fase: nada descargado, nada escrito desde aquí.

const $l = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
async function api(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  return r.json();
}

const estilo = document.createElement('style');
estilo.textContent = `
.lab-h { margin:0 0 4px; font-size:20px } .lab-sub { margin:0 0 14px; color:var(--muted); font-size:14px; max-width:78ch }
.lab-nav2 { display:flex; gap:6px; margin-bottom:14px }
.lab-nav2 button { padding:5px 12px; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--text); font:inherit; font-size:13px; cursor:pointer }
.lab-nav2 button[aria-selected=true] { background:var(--accent); border-color:var(--accent); color:#fff }
.pa-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)); gap:10px }
.pa-card { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); display:flex; flex-direction:column; position:relative }
.pa-mini { aspect-ratio:6/5; background:linear-gradient(180deg, #efe3c9, #d3bf94); display:flex; align-items:center; justify-content:center; border:0; padding:0; width:100%; cursor:zoom-in }
.pa-mini img { width:100%; height:100%; object-fit:contain; display:block; image-rendering:pixelated }
.pa-vacio { font:700 13px ui-monospace, Consolas, monospace; color:var(--muted) }
.pa-info { padding:8px 10px; display:flex; flex-direction:column; gap:4px; font-size:12px }
.pa-nombre { font-weight:650; font-size:13px; overflow-wrap:anywhere }
.pa-origen { color:var(--muted) }
.pa-marca { position:absolute; top:6px; left:6px; font-size:13px; filter:drop-shadow(0 1px 1px rgba(0,0,0,.5)) }
.mod-tags { display:flex; flex-wrap:wrap; gap:4px } .tag { padding:1px 7px; border-radius:999px; background:var(--surface-2); color:var(--muted) }
.pa-visor { position:fixed; inset:0; background:rgba(10,10,12,.78); display:flex; align-items:center; justify-content:center; z-index:50; padding:16px; cursor:zoom-out }
.pa-visor img { max-width:100%; max-height:85vh; image-rendering:pixelated; box-shadow:0 4px 24px rgba(0,0,0,.4) }
.pa-visor .pie { position:absolute; bottom:18px; left:0; right:0; text-align:center; color:#fff; font-size:13px }
.req-filtros { display:flex; gap:6px; margin-bottom:14px }
.req-filtros button { padding:5px 12px; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--text); font:inherit; font-size:13px; cursor:pointer }
.req-filtros button[aria-pressed=true] { background:var(--accent); border-color:var(--accent); color:#fff }
.req-item { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); box-shadow:var(--shadow); padding:12px 14px; margin-bottom:8px; position:relative; padding-left:30px }
.req-marca { position:absolute; left:10px; top:13px; font-size:13px }
.req-cab { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; margin-bottom:4px }
.req-id { font:700 12px ui-monospace, Consolas, monospace; color:var(--accent) }
.req-fecha { font-size:12px; color:var(--muted) }
.req-apartado { font-size:11px; color:var(--muted); margin-left:auto }
.req-texto { font-size:14px; line-height:1.45 }
.req-donde { font-size:12px; color:var(--muted); margin-top:4px }
.est-vigente { background:var(--ok-soft); color:var(--ok) } .est-pendiente { background:var(--info-soft); color:var(--info) } .est-sustituido { background:var(--bad-soft); color:var(--bad) }
`;
document.head.appendChild(estilo);

/** Negrita y código inline de markdown, sobre texto ya escapado (seguro: esc() corre primero). */
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

// ── Marcas «nuevo · actualizado · sin leer · leído» (independientes de las de Progreso), por sección. ──
const ICONO = { nuevo: ['🆕', 'Nuevo desde tu última visita'], actualizado: ['🔄', 'Ha cambiado desde tu última visita'], sinleer: ['●', 'Sin leer'], leido: ['✓', 'Leído'] };
/** Versión genérica, por `clave` e item completo como firma (JSON estable de sus campos). */
function marcasPor(ns, slug, items, clave, firmaDe) {
  const previo = JSON.parse(store.get(`panel.${ns}.vistos.${slug}`) || '{}');
  const leidos = JSON.parse(store.get(`panel.${ns}.leidos.${slug}`) || '{}');
  store.set(`panel.${ns}.vistos.${slug}`, JSON.stringify(Object.fromEntries(items.map((i) => [clave(i), firmaDe(i)]))));
  const estado = (i) => {
    const k = clave(i), firma = firmaDe(i);
    if (leidos[k] === firma) return 'leido';
    if (!(k in previo)) return 'nuevo';
    if (previo[k] !== firma) return 'actualizado';
    return 'sinleer';
  };
  const leer = (i) => { leidos[clave(i)] = firmaDe(i); store.set(`panel.${ns}.leidos.${slug}`, JSON.stringify(leidos)); };
  return { estado, leer };
}
function marcasGaleria(slug, items) {
  const previo = JSON.parse(store.get(`panel.galeria.vistos.${slug}`) || '{}');
  const leidos = JSON.parse(store.get(`panel.galeria.leidos.${slug}`) || '{}');
  store.set(`panel.galeria.vistos.${slug}`, JSON.stringify(Object.fromEntries(items.map((i) => [i.url, `${i.fecha}|${i.bytes}`]))));
  const estado = (i) => {
    const firma = `${i.fecha}|${i.bytes}`;
    if (leidos[i.url] === firma) return 'leido';
    if (!(i.url in previo)) return 'nuevo';
    return 'sinleer';
  };
  const leer = (i) => { leidos[i.url] = `${i.fecha}|${i.bytes}`; store.set(`panel.galeria.leidos.${slug}`, JSON.stringify(leidos)); };
  return { estado, leer };
}

function abrirVisor(item) {
  const fondo = document.createElement('div');
  fondo.className = 'pa-visor';
  fondo.innerHTML = `<img src="${esc(item.url)}" alt="${esc(item.nombre)}"><div class="pie">${esc(item.nombre)} · ${esc(item.origen)} · ${new Date(item.fecha).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>`;
  const cerrar = () => { fondo.remove(); removeEventListener('keydown', teclas); };
  const teclas = (e) => { if (e.key === 'Escape') cerrar(); };
  fondo.addEventListener('click', cerrar);
  addEventListener('keydown', teclas);
  document.body.appendChild(fondo);
}

// ── Pixel art ─────────────────────────────────────────────────────────────────────────────
async function pintarPixel(slug, c) {
  c.innerHTML = '<p class="empty">Cargando pixel art…</p>';
  let datos;
  try { datos = await api(`/api/pixel/${encodeURIComponent(slug)}`); }
  catch (e) { c.innerHTML = `<div class="card welcome"><p><b>No se pudo cargar esta sección.</b></p><p class="empty">${esc(e.message)}</p></div>`; return; }
  if (!datos.length) {
    c.innerHTML = `<div class="card welcome"><h2>Pixel art propio</h2>
      <p>Todavía no hay nada en <code>games/${esc(slug)}/public/recursos/pixel/</code>.</p>
      <p class="empty">B lo genera en P1 (tools/arte-pixel + <code>npm run arte</code>): atlas PNG + JSON, hoja de sprites y paleta.</p></div>`;
    return;
  }
  c.innerHTML = `<p class="lab-sub">Todo lo de <code>public/recursos/pixel/</code>: atlas, hoja de sprites, paleta y animación. Origen: propio (generado por código), sin descargas externas.</p>
    <div class="pa-grid">${datos.map((d) => `<article class="pa-card">
        <div class="pa-mini">${/\.(png|webp|gif)$/i.test(d.nombre) ? `<img loading="lazy" src="${esc(d.url)}" alt="${esc(d.nombre)}">` : `<span class="pa-vacio">JSON</span>`}</div>
        <div class="pa-info"><div class="pa-nombre">${esc(d.nombre)}</div>
          <div class="mod-tags"><span class="tag">${esc(d.tipo)}</span><span class="tag">${kb(d.bytes)}</span></div>
          <div class="pa-origen">${esc(d.origen)}</div></div>
      </article>`).join('')}</div>`;
}

// ── Avances (R64) ─────────────────────────────────────────────────────────────────────────
async function pintarGaleria(slug, c) {
  c.innerHTML = '<p class="empty">Cargando avances…</p>';
  let datos;
  try { datos = await api(`/api/galeria/${encodeURIComponent(slug)}`); }
  catch (e) { c.innerHTML = `<div class="card welcome"><p><b>No se pudo cargar esta sección.</b></p><p class="empty">${esc(e.message)}</p></div>`; return; }
  if (!datos.length) {
    c.innerHTML = `<div class="card welcome"><h2>Avances</h2>
      <p>Todavía no hay capturas en <code>games/${esc(slug)}/docs/evidencia/</code> ni bocetos en <code>tools/arte-pixel/bocetos/</code>.</p>
      <p class="empty">Aparecen solas según se cierran fases y se generan sprites.</p></div>`;
    return;
  }
  const m = marcasGaleria(slug, datos);
  const fecha = (iso) => new Date(iso).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' });
  c.innerHTML = `<p class="lab-sub">Capturas de fase (<code>docs/evidencia/</code>) y bocetos de arte (<code>tools/arte-pixel/bocetos/</code>), de más nueva a más vieja. Solo lectura.</p>
    <div class="pa-grid">${datos.map((d) => { const e = m.estado(d); return `<article class="pa-card" data-url="${esc(d.url)}">
        <span class="pa-marca" title="${ICONO[e][1]}">${ICONO[e][0]}</span>
        <button class="pa-mini" type="button" title="Ampliar"><img loading="lazy" src="${esc(d.url)}" alt="${esc(d.nombre)}"></button>
        <div class="pa-info"><div class="pa-nombre">${esc(d.nombre)}</div>
          <div class="mod-tags"><span class="tag">${esc(d.origen)}</span><span class="tag">${fecha(d.fecha)}</span><span class="tag">${kb(d.bytes)}</span>${d.urlX1 ? `<a class="tag" href="${esc(d.urlX1)}" target="_blank" rel="noopener noreferrer">ver ×1</a>` : ''}</div></div>
      </article>`; }).join('')}</div>`;
  c.querySelectorAll('.pa-card').forEach((card) => {
    const item = datos.find((d) => d.url === card.dataset.url);
    card.querySelector('.pa-mini').onclick = () => {
      abrirVisor(item);
      if (m.estado(item) !== 'leido') { m.leer(item); card.querySelector('.pa-marca').outerHTML = `<span class="pa-marca" title="${ICONO.leido[1]}">${ICONO.leido[0]}</span>`; }
    };
  });
}

// ── Marco y navegación ────────────────────────────────────────────────────────────────────
const SECCIONES = [['pixel', 'Pixel art', pintarPixel], ['avances', 'Avances', pintarGaleria]];
let slugActual = '';
let cuerpo = null;

function ir(seccion, contenedor) {
  store.set('panel.lab.seccion2', seccion);
  contenedor.querySelectorAll('.lab-nav2 button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.s === seccion)));
  cuerpo.innerHTML = '';
  SECCIONES.find(([k]) => k === seccion)[2](slugActual, cuerpo);
}

function mostrar(slug, contenedor) {
  slugActual = slug;
  contenedor.innerHTML = `<h3 class="lab-h">Pixel art propio</h3>
    <nav class="lab-nav2" role="tablist" aria-label="Secciones">${SECCIONES.map(([k, t]) => `<button type="button" role="tab" data-s="${k}">${t}</button>`).join('')}</nav>
    <div id="lab-cuerpo2"></div>`;
  cuerpo = $l('#lab-cuerpo2', contenedor);
  contenedor.querySelectorAll('.lab-nav2 button').forEach((b) => { b.onclick = () => ir(b.dataset.s, contenedor); });
  const guardada = store.get('panel.lab.seccion2') || 'pixel';
  ir(SECCIONES.some(([k]) => k === guardada) ? guardada : 'pixel', contenedor);
}

// ── Lo que pediste (R68, R64) ────────────────────────────────────────────────────────────
const ESTADO_TXT = { vigente: 'vigente', pendiente: 'pendiente', sustituido: 'sustituido', otro: 'otro' };
let filtroReq = store.get('panel.requisitos.filtro') || 'todas';

async function mostrarRequisitos(slug, c) {
  c.innerHTML = '<p class="empty">Cargando lo que pediste…</p>';
  let datos;
  try { datos = await api(`/api/requisitos/${encodeURIComponent(slug)}`); }
  catch (e) { c.innerHTML = `<div class="card welcome"><p><b>No se pudo cargar esta sección.</b></p><p class="empty">${esc(e.message)}</p></div>`; return; }
  if (!datos.length) {
    c.innerHTML = `<div class="card welcome"><h2>Lo que pediste</h2><p class="empty">Todavía no hay requisitos registrados en <code>docs/requisitos-usuario.md</code>.</p></div>`;
    return;
  }
  const m = marcasPor('requisitos', slug, datos, (i) => i.id, (i) => `${i.estado}|${i.texto}|${i.donde}`);
  const hoy = new Date().toISOString().slice(0, 10);
  const FILTROS = { todas: () => true, pendientes: (r) => r.estado === 'pendiente', hoy: (r) => r.fechaISO === hoy };
  const pintar = () => {
    const vis = datos.filter(FILTROS[filtroReq]);
    c.innerHTML = `<p class="lab-sub">Lo que pediste de forma explícita, leído de <code>docs/requisitos-usuario.md</code> (no se duplica aquí). De más nuevo a más viejo.</p>
      <div class="req-filtros">${Object.keys(FILTROS).map((k) => `<button type="button" data-f="${k}" aria-pressed="${filtroReq === k}">${k === 'hoy' ? 'de hoy' : k}</button>`).join('')}</div>
      <div class="req-cuenta mod-cuenta" style="margin:-6px 0 10px">${vis.length} de ${datos.length}</div>
      ${vis.length ? vis.map((r) => { const e = m.estado(r); return `<article class="req-item" data-id="${esc(r.id)}">
          <span class="req-marca" title="${ICONO[e][1]}">${ICONO[e][0]}</span>
          <div class="req-cab"><span class="req-id">${esc(r.id)}</span><span class="req-fecha">${esc(r.fecha)}</span><span class="tag est-${esc(r.estado)}">${esc(r.estadoTexto)}</span><span class="req-apartado">${esc(r.apartado)}</span></div>
          <div class="req-texto">${md(r.texto)}</div>
          <div class="req-donde">→ ${md(r.donde)}</div>
        </article>`; }).join('') : '<p class="empty">Nada con este filtro.</p>'}`;
    c.querySelectorAll('.req-filtros button').forEach((b) => { b.onclick = () => { filtroReq = b.dataset.f; store.set('panel.requisitos.filtro', filtroReq); pintar(); }; });
    c.querySelectorAll('.req-item').forEach((el) => { el.addEventListener('click', () => {
      const r = datos.find((d) => d.id === el.dataset.id);
      if (m.estado(r) !== 'leido') { m.leer(r); el.querySelector('.req-marca').outerHTML = `<span class="req-marca" title="${ICONO.leido[1]}">${ICONO.leido[0]}</span>`; }
    }); });
  };
  pintar();
}

window.panelLab = { mostrar, mostrarRequisitos };
