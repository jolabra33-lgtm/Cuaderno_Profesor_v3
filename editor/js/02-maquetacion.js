/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · maquetación: del árbol a «átomos», paginación y hojas
   editor/js/02-maquetacion.js
   ============================================================================ */
'use strict';
/* =====================================================================
   MAQUETACIÓN: del árbol del examen a "átomos" → paginación → hojas
   La vista previa y el PDF salen de las MISMAS hojas.
   ===================================================================== */
const S = { exam: null, sel: null, tab: 'block', zoom: 1, fit: true, guides: false, tok: 0, pages: 0, overflow: 0 };
const HANG = 7;   // mm de sangría francesa en subpreguntas
const MT = { title: 0, datos: 4, section: 7, question: 5, subquestion: 1.8, text: 2.6, table: 3, image: 3.5, lines: 2.5, box: 3.5, spacer: 0 };

function effStyle(n, inh, exam) {
  const own = n.style || {};
  const ex = { font: own.font || inh.font, size: own.size || inh.size, align: own.align || inh.align };
  const td = exam.typeStyles[n.type] || {};
  return { ex, fin: {
    font: ex.font || td.font || exam.base.font,
    size: num(ex.size || td.size || exam.base.size, 11) || 11,
    align: ex.align || td.align || exam.base.align } };
}

function colWidths(w) {
  const nums = w.map(v => num(v, 0)); const spec = nums.filter(v => v > 0);
  const sum = spec.reduce((a, b) => a + b, 0); const u = nums.length - spec.length;
  const rest = Math.max(0, 100 - sum);
  return nums.map(v => v > 0 ? v : (u ? Math.max(5, rest / u) : 0));
}

function buildAtoms(exam, labels) {
  const out = [];
  const mk = (n, f, c, o) => ({ node: n, f, ind: c.ind, cls: o.cls || '', html: o.html, mt: o.mt ?? 0, pt: o.pt ?? 0,
    hang: o.hang || 0, keep: !!o.keep, first: !!o.first, brk: false, tbl: o.tbl || null, style: o.style || '', h: 0, hTop: 0 });
  const par = p => `<div class="par">${p || '<br>'}</div>`;

  function headingHtml(n, kind, label, title, pts, place) {
    const parts = [];
    if (pts && place === 'right') parts.push(`<span class="pts right">${esc(pts)}</span>`);
    if (label) parts.push(`<span class="lab">${esc(label)}</span> `);
    parts.push(esc(title));
    if (pts && place === 'inline') parts.push(` <span class="pts">${esc(pts)}</span>`);
    let html = `<div class="hd ${kind}">${parts.join('')}</div>`;
    const meta = [String(n.meta || '').trim(), place === 'meta' && pts ? pts : ''].filter(Boolean).join(' · ');
    if (meta) html += `<div class="meta">${esc(meta)}</div>`;
    return html;
  }

  // Párrafos de un nodo: el primero con mt (margen superior del bloque), los siguientes con separación interna
  function paraAtoms(n, f, c, paras, firstMt, o = {}) {
    paras.forEach((p, i) => out.push(mk(n, f, c, {
      cls: o.cls || '', html: (i === 0 && o.lead ? o.lead : '') + par(p) , mt: i === 0 ? firstMt : 0, pt: i === 0 ? 0 : 1.7,
      hang: o.hang, keep: false })));
  }

  const gen = {
    title(n, f, c) {
      const html = (n.eyebrow ? `<div class="eyebrow">${esc(n.eyebrow)}</div>` : '') + `<div class="tt">${esc(n.title)}</div>` +
        (n.subtitle ? `<div class="sub">${esc(n.subtitle)}</div>` : '') + (n.rule ? '<div class="rule"></div>' : '');
      out.push(mk(n, f, c, { cls: 'title', html, mt: MT.title }));
    },
    datos(n, f, c) {
      const cells = n.fields.map(x => `<div class="f" style="flex:${Math.max(1, num(x.w, 20))} 1 0"><small>${esc(x.label)}</small><div>${esc(x.pre || '')}</div></div>`).join('');
      out.push(mk(n, f, c, { cls: 'datos', html: `<div class="dt">${cells}</div>`, mt: MT.datos }));
    },
    section(n, f, c) {
      const label = labels.get(n.id) || '', title = String(n.title || '').trim();
      const pts = fmtPoints(exam, n.points), place = exam.num.ptsPlace;
      const hasHead = label || title;
      if (hasHead) out.push(mk(n, f, c, { cls: 'sh', html: headingHtml(n, 's', label, title, pts, place), mt: MT.section, keep: true }));
      const paras = String(n.text || '').trim() ? parasOf(n.text) : [];
      paraAtoms(n, f, c, paras, hasHead ? 1.6 : MT.section);
      if (hasHead && !paras.length) { /* el encabezado se queda con el siguiente bloque */ }
    },
    question(n, f, c) {
      const label = labels.get(n.id) || '', title = String(n.title || '').trim();
      const pts = fmtPoints(exam, n.points), place = exam.num.ptsPlace;
      let paras = String(n.text || '').trim() ? parasOf(n.text) : [];
      if (title) {
        out.push(mk(n, f, c, { cls: 'qh', html: headingHtml(n, 'q', label, title, pts, place), mt: MT.question, keep: true }));
        paraAtoms(n, f, c, paras, 1.4);
      } else {
        if (!paras.length) paras = [''];
        let lead = label ? `<span class="lab">${esc(label)}</span> ` : '';
        if (pts && place === 'right') lead = `<span class="pts right">${esc(pts)}</span>` + lead;
        const first = (pts && place !== 'right') ? (paras[0] + ` <span class="pts">${esc(pts)}</span>`) : paras[0];
        paras[0] = first;
        // la etiqueta va dentro del primer párrafo (en línea)
        out.push(mk(n, f, c, { cls: '', html: `<div class="par">${lead}${paras[0] || ''}</div>`, mt: MT.question }));
        paras.slice(1).forEach(p => out.push(mk(n, f, c, { html: par(p), mt: 0, pt: 1.7 })));
      }
    },
    subquestion(n, f, c) {
      const label = labels.get(n.id) || '';
      const pts = fmtPoints(exam, n.points);
      let paras = String(n.text || '').trim() ? parasOf(n.text) : [''];
      if (pts) paras[0] = paras[0] + ` <span class="pts">${esc(pts)}</span>`;
      const hang = label ? HANG : 0;
      paras.forEach((p, i) => out.push(mk(n, f, c, {
        cls: label ? 'hang' : '', hang,
        html: (i === 0 && label ? `<span class="lab h sl">${esc(label)}</span>` : '') + par(p), mt: i === 0 ? MT.subquestion : 0, pt: i === 0 ? 0 : 1.7 })));
    },
    text(n, f, c) {
      const paras = parasOf(n.text);
      if (n.variant === 'framed') {
        out.push(mk(n, f, c, { cls: 'framedwrap', html: `<div class="fr">${paras.map((p, i) => `<div class="par"${i ? ' style="margin-top:1.7mm"' : ''}>${p || '<br>'}</div>`).join('')}</div>`, mt: MT.text }));
      } else paraAtoms(n, f, c, paras, MT.text, { cls: n.variant === 'quote' ? 'quote' : '' });
    },
    box(n, f, c) {
      const paras = String(n.text || '').trim() ? parasOf(n.text) : [];
      const inner = (n.title ? `<div class="hd">${esc(n.title)}</div>` : '') +
        paras.map((p, i) => `<div class="par" style="margin-top:${i === 0 && n.title ? 1.2 : (i ? 1.7 : 0)}mm">${p || '<br>'}</div>`).join('');
      out.push(mk(n, f, c, { cls: 'framedwrap', html: `<div class="fr" style="min-height:${num(n.minH, 0)}mm">${inner}</div>`, mt: MT.box }));
    },
    table(n, f, c) {
      const T = n.table, wd = colWidths(T.widths || T.cells[0].map(() => ''));
      const cg = '<colgroup>' + wd.map(w => `<col style="width:${w}%">`).join('') + '</colgroup>';
      T.cells.forEach((row, ri) => {
        const head = T.header && ri === 0;
        const tag = head ? 'th' : 'td';
        const zb = T.zebra && !head && ((ri - (T.header ? 1 : 0)) % 2 === 1) ? ' class="zb"' : '';
        const rh = num(T.rowH, 0) > 0 && !head ? ` style="height:${num(T.rowH)}mm"` : '';
        const cells = row.map(x => `<${tag}>${esc(x) || '&#8203;'}</${tag}>`).join('');
        out.push(mk(n, f, c, { cls: 'tbl', tbl: n.id,
          html: `<table class="tb ${T.border || 'grid'}${head && T.hshade ? ' hshade' : ''}">${cg}<tr${zb}${rh}>${cells}</tr></table>`,
          mt: ri === 0 ? MT.table : 0, keep: head || (!T.split && ri < T.cells.length - 1), first: ri === 0 }));
      });
    },
    image(n, f, c) {
      if (!n.src) return;
      const ar = n.imgW && n.imgH ? `aspect-ratio:${n.imgW}/${n.imgH};` : '';
      const html = `<figure style="text-align:${n.imgAlign || 'center'}"><img class="fig" alt="" src="${esc(n.src)}" style="width:${num(n.widthPct, 80)}%;${ar}">` +
        (n.caption ? `<figcaption>${esc(n.caption)}</figcaption>` : '') + '</figure>';
      out.push(mk(n, f, c, { cls: 'img', html, mt: MT.image }));
    },
    lines(n, f, c) {
      const cnt = Math.max(1, Math.min(80, Math.round(num(n.count, 6))));
      for (let i = 0; i < cnt; i++) out.push(mk(n, f, c, { cls: 'lnwrap', html: `<div class="ln" style="height:${Math.max(4, num(n.spacing, 8))}mm"></div>`,
        mt: i === 0 ? MT.lines : 0, style: `--ls:${n.lineStyle || 'solid'}` }));
    },
    spacer(n, f, c) { out.push(mk(n, f, c, { cls: 'sp', html: `<div style="height:${Math.max(1, num(n.height, 20))}mm"></div>`, mt: 0 })); },
  };

  function walk(list, ctx) {
    for (const n of list) {
      const { ex, fin } = effStyle(n, ctx.inh, exam);
      const start = out.length;
      gen[n.type](n, fin, ctx);
      const kids = CONTAINERS.has(n.type) ? n.children : null;
      if (kids && kids.length) walk(kids, { inh: ex, ind: ctx.ind + (n.type === 'subquestion' && labels.get(n.id) ? HANG : 0) });
      const mine = out.slice(start);
      if (mine.length) {
        if (n.breakBefore) mine[0].brk = true;
        if (String(n.spaceBefore ?? '') !== '' && isFinite(num(n.spaceBefore, NaN))) mine[0].mt = Math.max(0, num(n.spaceBefore));
        if (n.keepTogether) for (let i = 0; i < mine.length - 1; i++) mine[i].keep = true;
      }
    }
  }
  walk(exam.body, { inh: { font: '', size: '', align: '' }, ind: 0 });
  // El texto que presenta una imagen o una tabla no se queda solo al final de una página
  for (let i = 0; i < out.length - 1; i++) {
    const nx = out[i + 1];
    if ((nx.cls === 'img' || (nx.cls === 'tbl' && nx.first)) && !nx.brk && out[i].cls !== 'lnwrap') out[i].keep = true;
  }
  return out;
}

function atomEl(a) {
  const d = document.createElement('div');
  d.className = 'atom ' + a.cls;
  d.dataset.node = a.node.id;
  const s = d.style;
  const al = (a.node.type === 'table') && a.f.align === 'justify' ? 'left' : a.f.align;
  s.fontFamily = fontCss(a.f.font); s.fontSize = a.f.size + 'pt'; s.textAlign = al;
  if (a.ind) s.marginLeft = a.ind + 'mm';
  s.marginTop = a.mt + 'mm'; if (a.pt) s.paddingTop = a.pt + 'mm';
  if (a.hang) s.paddingLeft = a.hang + 'mm';
  if (a.style) s.cssText += ';' + a.style;
  d.innerHTML = a.html;
  return d;
}

/* ---------- Encabezado y pie ---------- */
function barEl(exam, kind, n, total) {
  const cfg = kind === 'hdr' ? exam.header : exam.footer;
  const d = document.createElement('div');
  d.className = 'bar ' + kind + (cfg.rule ? '' : ' norule');
  d.style.fontFamily = fontCss(cfg.font || exam.base.font);
  d.style.fontSize = num(cfg.size, 9) + 'pt'; d.style.color = cfg.color || '#333';
  const date = new Date().toLocaleDateString('es-ES');
  const txt = t => esc(t).replace(/\{pagina\}/gi, n).replace(/\{paginas\}/gi, total).replace(/\{fecha\}/gi, date).replace(/\n/g, '<br>');
  const logo = (kind === 'hdr' && cfg.logo) ? `<img alt="" src="${esc(cfg.logo)}" style="height:${num(cfg.logoH, 10)}mm">` : '';
  const zone = (cls, key) => `<div class="${cls}">${(logo && cfg.logoPos === key) ? logo : ''}<span>${txt(cfg[key])}</span></div>`;
  d.innerHTML = zone('l', 'l') + zone('c', 'c') + zone('r', 'r');
  return d;
}

/* ---------- Paginación ---------- */
function paginate(atoms, availFn) {
  const pages = [[]]; let used = 0, pi = 0, over = 0;
  const headers = new Map();
  for (const a of atoms) if (a.tbl && a.first && a.node?.table?.header) headers.set(a.tbl, a);
  const newPage = () => { pages.push([]); pi++; used = 0; };
  let i = 0;
  while (i < atoms.length) {
    // Al continuar una tabla en una página nueva, se reserva espacio para repetir su primera fila.
    if (!pages[pi].length && atoms[i].tbl && !atoms[i].first && headers.has(atoms[i].tbl)) {
      const src = headers.get(atoms[i].tbl);
      const rh = { ...src, repeat: true, first: false, mt: 0, keep: false, brk: false,
        h: Math.max(1, src.h - src.mt * MM), hTop: src.hTop };
      pages[pi].push(rh); used = rh.h;
    }
    let j = i; while (j < atoms.length - 1 && atoms[j].keep) j++;
    const chunk = atoms.slice(i, j + 1);
    if (atoms[i].brk && pages[pi].length) newPage();
    // Una página que solo contiene el encabezado repetido aún puede recibir la fila siguiente.
    const headerOnly = pages[pi].length === 1 && pages[pi][0].repeat;
    const empty = pages[pi].length === 0;
    const hN = chunk.reduce((s, a) => s + a.h, 0);
    const hT = hN - chunk[0].h + chunk[0].hTop;
    const room = availFn(pi) + 0.5;
    if ((empty ? hT : used + hN) <= room) {
      pages[pi].push(...chunk); used = empty ? hT : used + hN; i = j + 1;
    } else if (!empty && !headerOnly) { newPage(); }
    else if (chunk.length > 1) { atoms[i].keep = false; }
    else {
      pages[pi].push(chunk[0]); used = (headerOnly ? used : 0) + hT; over++; i = j + 1;
    }
  }
  return { pages, over };
}
function imagesReady(root) {
  return Promise.all($$('img', root).map(im => im.complete && im.naturalWidth ? 0 : (im.decode ? im.decode().catch(() => { }) : 0)));
}

/* ---------- Render ---------- */
async function renderPreview() {
  const tok = ++S.tok;
  const exam = S.exam; if (!exam) return;
  const { page, base } = exam;
  let [W, H] = PAPERS[page.size] || PAPERS.A4;
  if (page.orient === 'landscape') [W, H] = [H, W];
  const cw = W - page.ml - page.mr;

  $('#pagecss').textContent = `@page{size:${W}mm ${H}mm;margin:0}`;
  const m = $('#measure');
  m.textContent = '';
  m.style.width = cw + 'mm';
  const vars = `--lh:${base.lh};--accent-paper:${exam.accent};--hy:${base.hyphens ? 'auto' : 'manual'}`;
  m.style.cssText += ';' + vars;

  const labels = computeLabels(exam);
  const atoms = buildAtoms(exam, labels);
  const els = atoms.map(atomEl);
  els.forEach(e => m.append(e));

  // barras (encabezado/pie): altura real
  const barH = (kind) => {
    const w = h('div', { style: { width: cw + 'mm' } });
    const b = barEl(exam, kind, 1, 99); b.style.position = 'static'; w.append(b); m.append(w);
    const r = b.getBoundingClientRect().height / MM; w.remove(); return r;
  };
  const hdrH = exam.header.on ? barH('hdr') : 0, ftrH = exam.footer.on ? barH('ftr') : 0;
  const topFor = pi => (exam.header.on && (pi > 0 || exam.header.first)) ? Math.max(page.mt, num(exam.header.off, 9) + hdrH + 3.5) : page.mt;
  const botFor = pi => (exam.footer.on && (pi > 0 || exam.footer.first)) ? Math.max(page.mb, num(exam.footer.off, 8) + ftrH + 3.5) : page.mb;
  const availFn = pi => (H - topFor(pi) - botFor(pi)) * MM - 1;

  await imagesReady(m);
  if (tok !== S.tok) return;
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { } }
  if (tok !== S.tok) return;

  atoms.forEach((a, i) => {
    const r = els[i].getBoundingClientRect();
    a.h = r.height + a.mt * MM; a.hTop = r.height - a.pt * MM; a.el = els[i];
  });
  const { pages, over } = paginate(atoms, availFn);
  while (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();

  // hojas
  const frag = document.createDocumentFragment();
  const total = pages.length;
  pages.forEach((pg, pi) => {
    const sheet = h('div', { class: 'sheet paper' + (S.guides ? ' guides' : ''), style: `width:${W}mm;height:calc(${H}mm - .5mm);${vars}` });
    sheet.dataset.page = pi + 1;
    const t = topFor(pi), b = botFor(pi);
    if (exam.header.on && (pi > 0 || exam.header.first)) {
      const bar = barEl(exam, 'hdr', pi + 1, total);
      bar.style.cssText += `;top:${num(exam.header.off, 9)}mm;left:${page.ml}mm;right:${page.mr}mm`; sheet.append(bar);
    }
    if (exam.footer.on && (pi > 0 || exam.footer.first)) {
      const bar = barEl(exam, 'ftr', pi + 1, total);
      bar.style.cssText += `;bottom:${num(exam.footer.off, 8)}mm;left:${page.ml}mm;right:${page.mr}mm`; sheet.append(bar);
    }
    const body = h('div', { class: 'body', style: `top:${t}mm;left:${page.ml}mm;width:${cw}mm;height:${H - t - b}mm` });
    pg.forEach((a, k) => {
      const e = a.repeat ? atomEl(a) : a.el;
      e.classList.toggle('top', k === 0);
      e.classList.remove('sel');
      if (a.tbl) {
        const prev = pg[k - 1];
        const tb = $('table.tb', e);
        tb && tb.classList.toggle('cont', !!(prev && prev.tbl === a.tbl));
      }
      body.append(e);
    });
    sheet.append(body); frag.append(sheet);
  });
  if (tok !== S.tok) return;
  $('#pages').replaceChildren(frag);
  S.pages = total; S.overflow = over;
  $('#pageCount').textContent = total + (total === 1 ? ' página' : ' páginas') + ` · ${W === 210 ? 'A4' : page.size}`;
  const warn = $('#warn');
  if (over) { warn.hidden = false; warn.textContent = `Hay ${over} bloque${over > 1 ? 's' : ''} más alto${over > 1 ? 's' : ''} que una página y se verá${over > 1 ? 'n' : ''} cortado${over > 1 ? 's' : ''}. Reduce su tamaño o sus márgenes.`; }
  else warn.hidden = true;
  markSelection();
  applyZoom();
}

function markSelection() {
  $$('#pages .atom.sel').forEach(e => e.classList.remove('sel'));
  if (S.sel) $$(`#pages .atom[data-node="${S.sel}"]`).forEach(e => e.classList.add('sel'));
}

function applyZoom() {
  const scroll = $('#stageScroll'), pages = $('#pages'), outer = $('#pagesOuter');
  let [W] = PAPERS[S.exam.page.size] || PAPERS.A4;
  if (S.exam.page.orient === 'landscape') W = (PAPERS[S.exam.page.size] || PAPERS.A4)[1];
  const wpx = W * MM;
  if (S.fit) S.zoom = Math.max(0.3, Math.min(1.6, (scroll.clientWidth - 40) / wpx));
  pages.style.transform = `scale(${S.zoom})`;
  outer.style.width = wpx * S.zoom + 'px';
  outer.style.height = pages.offsetHeight * S.zoom + 'px';
  $('#zVal').textContent = Math.round(S.zoom * 100) + '%';
}

let renderTimer = 0;
function scheduleRender(ms = 90) { clearTimeout(renderTimer); renderTimer = setTimeout(renderPreview, ms); }

