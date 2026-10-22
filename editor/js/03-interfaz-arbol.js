/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · interfaz: historial, árbol, selección y menú «Añadir»
   editor/js/03-interfaz-arbol.js
   ============================================================================ */
'use strict';
/* =====================================================================
   INTERFAZ: historial, árbol, inspector, diálogos, archivos, PDF
   ===================================================================== */

/* ---------- Historial (deshacer / rehacer) ---------- */
const HI = { stack: [], idx: -1, key: '', t: 0 };
function histPush(key) {
  const s = JSON.stringify(S.exam), now = Date.now();
  if (HI.idx >= 0 && HI.stack[HI.idx] === s) return;
  if (HI.idx >= 0 && key && key === HI.key && now - HI.t < 1000) HI.stack[HI.idx] = s;
  else { HI.stack = HI.stack.slice(0, HI.idx + 1); HI.stack.push(s); if (HI.stack.length > 100) HI.stack.shift(); HI.idx = HI.stack.length - 1; }
  HI.key = key; HI.t = now; histButtons();
}
function histButtons() { $('#btnUndo').disabled = HI.idx <= 0; $('#btnRedo').disabled = HI.idx >= HI.stack.length - 1; }
function histGo(d) {
  const i = HI.idx + d; if (i < 0 || i >= HI.stack.length) return;
  HI.idx = i; HI.key = ''; S.exam = JSON.parse(HI.stack[i]);
  if (S.sel && !findNode(S.exam.body, S.sel)) S.sel = null;
  $('#examName').value = S.exam.name;
  renderTree(); renderSide(); scheduleRender(0); queueSave(); histButtons();
}

/* ---------- Cambios y guardado ---------- */
let saveTimer = 0;
function queueSave() {
  $('#status').textContent = 'Guardando…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const prior = loadExamLocal(S.exam.id);
    if (prior && examSignature(prior) !== examSignature(S.exam)) {
      try { await createRecoverySnapshot(prior, 'Autoguardado anterior', false); } catch (e) { console.warn('No se pudo crear una versión de recuperación', e); }
    }
    const ok = saveExamLocal(S.exam);
    const t = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    $('#status').textContent = ok ? `Guardado en este navegador · ${t}` : 'No se pudo guardar aquí: usa «Guardar archivo»';
    $('#status').style.color = ok ? '' : 'var(--danger)';
  }, 500);
}
function change(o = {}) {
  histPush(o.key || '');
  if (o.tree) renderTree();
  if (o.insp) renderSide();
  scheduleRender(o.now ? 0 : 90);
  queueSave();
}

let toastTimer = 0;
function toast(msg, action) {
  $$('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg, action && h('button', { class: 'btn sm', style: { marginLeft: '12px' }, onclick: () => { action.fn(); t.remove(); } }, action.label));
  document.body.append(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), action ? 6000 : 3000);
}

/* ---------- Selección ---------- */
function selectNode(id, o = {}) {
  S.sel = id; S.tab = 'block';
  renderTree(); renderSide(); markSelection();
  if (o.scrollPreview) { const a = $(`#pages .atom[data-node="${id}"]`); a && a.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  if (o.scrollTree) { const r = $('#tree .row.sel'); r && r.scrollIntoView({ block: 'nearest' }); }
  if (matchMedia('(max-width:860px)').matches && o.fromTree) setView('side');
}
function setView(v) { $('#app').dataset.view = v; $$('.mobile-tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v)); if (v === 'stage') applyZoom(); }

/* ---------- Árbol ---------- */
function summaryOf(n) {
  switch (n.type) {
    case 'title': return n.title;
    case 'datos': return 'Datos del alumno';
    case 'section': return n.title || plainOf(n.text);
    case 'question': return n.title || plainOf(n.text);
    case 'subquestion': case 'text': return plainOf(n.text);
    case 'table': return `Tabla ${n.table.cells.length}×${n.table.cells[0]?.length || 0}`;
    case 'image': return n.src ? (n.caption || 'Imagen') : '(sin imagen)';
    case 'lines': return `${n.count} líneas`;
    case 'box': return n.title || plainOf(n.text);
    case 'spacer': return `Espacio · ${n.height} mm`;
  }
  return '';
}
let dragId = null;
function renderTree() {
  const labels = computeLabels(S.exam), root = $('#tree');
  root.textContent = '';
  if (!S.exam.body.length) {
    root.append(h('div', { class: 'empty-tree' }, h('p', {}, 'El examen está vacío.'), h('button', { class: 'btn primary', onclick: e => openAddMenu(e.currentTarget, null) }, '+ Añadir el primer bloque')));
  }
  const rec = (list, parent) => list.forEach(n => {
    const kids = n.children || [];
    const sm = summaryOf(n) || '';
    const pts = String(n.points ?? '').trim();
    const row = h('div', { class: 'row' + (n.id === S.sel ? ' sel' : ''), draggable: 'true', 'data-id': n.id, title: TYPES[n.type].name },
      h('span', { class: 'caret' + (kids.length ? '' : ' empty'), onclick: ev => { ev.stopPropagation(); n.collapsed = !n.collapsed; renderTree(); } }, n.collapsed ? '▸' : '▾'),
      h('span', { class: 'badge t-' + n.type }, TYPES[n.type].badge),
      labels.get(n.id) ? h('span', { class: 'lab' }, labels.get(n.id)) : null,
      h('span', { class: 'txt' }, sm ? sm : h('em', {}, TYPES[n.type].name)),
      pts ? h('span', { class: 'pt' }, pts) : null,
      CONTAINERS.has(n.type) ? h('button', { class: 'add', title: 'Añadir dentro', 'aria-label': 'Añadir dentro', onclick: ev => { ev.stopPropagation(); openAddMenu(ev.currentTarget, n.id, true); } }, '+') : null);
    row.addEventListener('click', () => selectNode(n.id, { scrollPreview: true, fromTree: true }));
    row.addEventListener('dragstart', ev => { dragId = n.id; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', n.id); });
    row.addEventListener('dragend', () => { dragId = null; $$('.row').forEach(r => r.classList.remove('drop-before', 'drop-after', 'drop-in')); });
    row.addEventListener('dragover', ev => {
      if (!dragId) return;
      const src = findNode(S.exam.body, dragId); if (!src || isInside(src.node, n.id)) return;
      ev.preventDefault();
      const r = row.getBoundingClientRect(), y = (ev.clientY - r.top) / r.height;
      const zone = CONTAINERS.has(n.type) ? (y < .25 ? 'before' : y > .75 ? 'after' : 'in') : (y < .5 ? 'before' : 'after');
      row.dataset.zone = zone;
      row.classList.toggle('drop-before', zone === 'before'); row.classList.toggle('drop-after', zone === 'after'); row.classList.toggle('drop-in', zone === 'in');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drop-before', 'drop-after', 'drop-in'));
    row.addEventListener('drop', ev => {
      ev.preventDefault(); const zone = row.dataset.zone; row.classList.remove('drop-before', 'drop-after', 'drop-in');
      if (dragId) { moveNode(dragId, n.id, zone); dragId = null; }
    });
    parent.append(row);
    if (kids.length && !n.collapsed) { const k = h('div', { class: 'kids' }); parent.append(k); rec(kids, k); }
  });
  rec(S.exam.body, root);
  // total de puntos
  const tot = sumPoints(S.exam.body), target = num(S.exam.num.total, 10);
  const ok = Math.abs(tot - target) < 0.005;
  $('#totals').innerHTML = `<span>Suma de puntos</span><b class="${ok ? 'ok' : 'bad'}">${fmtNum(tot)} / ${fmtNum(target)} ${ok ? '✓' : ''}</b>`;
}

function moveNode(srcId, dstId, zone) {
  if (srcId === dstId) return;
  const body = S.exam.body, s = findNode(body, srcId);
  if (!s || isInside(s.node, dstId)) return;
  s.list.splice(s.index, 1);
  const d = findNode(body, dstId);
  if (zone === 'in' && d.node.children) { d.node.children.push(s.node); d.node.collapsed = false; }
  else d.list.splice(d.index + (zone === 'after' ? 1 : 0), 0, s.node);
  change({ tree: true, insp: false, now: true });
}
function chainOf(id) {
  const c = []; let cur = id;
  while (cur) { const f = findNode(S.exam.body, cur); if (!f) break; c.push(f.node); cur = f.parent && f.parent.id; }
  return c;
}
function insertPos(type, id, inside) {
  const body = S.exam.body, end = { list: body, index: body.length };
  if (!id) return end;
  const f = findNode(body, id); if (!f) return end;
  const n = f.node, chain = chainOf(id);
  const after = x => { const ff = findNode(body, x.id); return { list: ff.list, index: ff.index + 1 }; };
  const inEnd = x => ({ list: x.children, index: x.children.length });
  if (inside && n.children) return inEnd(n);
  switch (type) {
    case 'section': return after(chain.find(x => x.type === 'section') || chain[chain.length - 1]);
    case 'question': {
      if (n.type === 'section') return inEnd(n);
      const q = chain.find(x => x.type === 'question'); if (q) return after(q);
      const s = chain.find(x => x.type === 'section'); if (s) return inEnd(s);
      return after(chain[chain.length - 1]);
    }
    case 'subquestion': {
      if (n.type === 'question') return inEnd(n);
      const sq = chain.find(x => x.type === 'subquestion'); if (sq) return after(sq);
      const q = chain.find(x => x.type === 'question'); if (q) return inEnd(q);
      return after(n);
    }
    default: return CONTAINERS.has(n.type) ? inEnd(n) : after(n);
  }
}
function addNode(type, targetId, inside) {
  const node = newNode(type);
  const pos = insertPos(type, targetId, inside);
  pos.list.splice(pos.index, 0, node);
  chainOf(node.id).slice(1).forEach(p => p.collapsed = false);
  S.sel = node.id; S.tab = 'block';
  change({ tree: true, insp: true, now: true });
  markSelectionSoon(node.id);
}
function markSelectionSoon(id) { setTimeout(() => { markSelection(); const a = $(`#pages .atom[data-node="${id}"]`); a && a.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $('#tree .row.sel')?.scrollIntoView({ block: 'nearest' }); }, 220); }

function nodeOp(op) {
  const id = S.sel; if (!id) return;
  const f = findNode(S.exam.body, id); if (!f) return;
  const { node, list, index, parent } = f;
  if (op === 'up' && index > 0) { [list[index - 1], list[index]] = [list[index], list[index - 1]]; }
  else if (op === 'down' && index < list.length - 1) { [list[index + 1], list[index]] = [list[index], list[index + 1]]; }
  else if (op === 'in') { const prev = list[index - 1]; if (!prev || !prev.children) return toast('Solo se puede meter dentro de un apartado, pregunta o subpregunta anterior'); list.splice(index, 1); prev.children.push(node); prev.collapsed = false; }
  else if (op === 'out') { if (!parent) return; const g = findNode(S.exam.body, parent.id); list.splice(index, 1); g.list.splice(g.index + 1, 0, node); }
  else if (op === 'dup') { list.splice(index + 1, 0, cloneWithNewIds(node)); S.sel = list[index + 1].id; }
  else if (op === 'del') {
    list.splice(index, 1);
    S.sel = (list[index] || list[index - 1] || parent || {}).id || null;
    change({ tree: true, insp: true, now: true });
    return toast('Bloque eliminado', { label: 'Deshacer', fn: () => histGo(-1) });
  } else return;
  change({ tree: true, insp: true, now: true }); markSelectionSoon(S.sel);
}

/* ---------- Menú "Añadir" ---------- */
function closeMenu() { $$('.menu').forEach(m => m.remove()); }
function openAddMenu(anchor, targetId, inside) {
  closeMenu();
  const tid = targetId === undefined ? S.sel : targetId;
  const m = h('div', { class: 'menu', role: 'menu' });
  MENU_GROUPS.forEach(([g, types]) => {
    m.append(h('h3', {}, g));
    types.forEach(t => m.append(h('button', { role: 'menuitem', onclick: () => { closeMenu(); addNode(t, tid, !!inside); } },
      h('b', {}, TYPES[t].badge), h('span', {}, TYPES[t].name, h('small', {}, TYPES[t].hint)))));
  });
  document.body.append(m);
  const r = anchor.getBoundingClientRect(), mh = m.offsetHeight, mw = m.offsetWidth;
  m.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.left)) + 'px';
  m.style.top = (r.bottom + 4 + mh > innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + 'px';
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
}

