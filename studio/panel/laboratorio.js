// Pixel art propio (SEDIMENTO): lista lo que haya en public/recursos/pixel/ (atlas, hoja de sprites, paleta, animación).
// Todo se genera por código (tools/arte-pixel, npm run arte): no hay nada descargado que mostrar aquí.

const $l = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
async function api(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  return r.json();
}

const estilo = document.createElement('style');
estilo.textContent = `
.lab-h { margin:0 0 4px; font-size:20px } .lab-sub { margin:0 0 14px; color:var(--muted); font-size:14px; max-width:78ch }
.pa-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)); gap:10px }
.pa-card { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); display:flex; flex-direction:column }
.pa-mini { aspect-ratio:6/5; background:linear-gradient(180deg, #efe3c9, #d3bf94); display:flex; align-items:center; justify-content:center }
.pa-mini img { width:100%; height:100%; object-fit:contain; display:block }
.pa-vacio { font:700 13px ui-monospace, Consolas, monospace; color:var(--muted) }
.pa-info { padding:8px 10px; display:flex; flex-direction:column; gap:4px; font-size:12px }
.pa-nombre { font-weight:650; font-size:13px; overflow-wrap:anywhere }
.pa-origen { color:var(--muted) }
.mod-tags { display:flex; flex-wrap:wrap; gap:4px } .tag { padding:1px 7px; border-radius:999px; background:var(--surface-2); color:var(--muted) }
`;
document.head.appendChild(estilo);

async function mostrar(slug, contenedor) {
  contenedor.innerHTML = '<p class="empty">Cargando pixel art…</p>';
  let datos;
  try { datos = await api(`/api/pixel/${encodeURIComponent(slug)}`); }
  catch (e) {
    contenedor.innerHTML = `<div class="card welcome"><p><b>No se pudo cargar esta sección.</b></p><p class="empty">${esc(e.message)}</p></div>`;
    return;
  }
  if (!datos.length) {
    contenedor.innerHTML = `<div class="card welcome"><h2>Pixel art propio</h2>
      <p>Todavía no hay nada en <code>games/${esc(slug)}/public/recursos/pixel/</code>.</p>
      <p class="empty">B lo genera en P1 (tools/arte-pixel + <code>npm run arte</code>): atlas PNG + JSON, hoja de sprites y paleta.</p></div>`;
    return;
  }
  contenedor.innerHTML = `<h3 class="lab-h">Pixel art propio</h3>
    <p class="lab-sub">Todo lo de <code>public/recursos/pixel/</code>: atlas, hoja de sprites, paleta y animación. Origen: propio (generado por código), sin descargas externas.</p>
    <div class="pa-grid">${datos.map((d) => `<article class="pa-card">
        <div class="pa-mini">${/\.(png|webp|gif)$/i.test(d.nombre) ? `<img loading="lazy" src="${esc(d.url)}" alt="${esc(d.nombre)}">` : `<span class="pa-vacio">JSON</span>`}</div>
        <div class="pa-info"><div class="pa-nombre">${esc(d.nombre)}</div>
          <div class="mod-tags"><span class="tag">${esc(d.tipo)}</span><span class="tag">${kb(d.bytes)}</span></div>
          <div class="pa-origen">${esc(d.origen)}</div></div>
      </article>`).join('')}</div>`;
}

window.panelLab = { mostrar };
