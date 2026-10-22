/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · inspector: pestañas Bloque, Examen y Encabezado/pie
   editor/js/04-inspector.js
   ============================================================================ */
'use strict';
/* =====================================================================
   Controles reutilizables del inspector
   ===================================================================== */
const ALIGN_SVG = {
  left: '<svg viewBox="0 0 16 14"><path d="M1 2h14M1 5.5h9M1 9h14M1 12.5h7"/></svg>',
  center: '<svg viewBox="0 0 16 14"><path d="M1 2h14M3.5 5.5h9M1 9h14M4.5 12.5h7"/></svg>',
  right: '<svg viewBox="0 0 16 14"><path d="M1 2h14M6 5.5h9M1 9h14M8 12.5h7"/></svg>',
  justify: '<svg viewBox="0 0 16 14"><path d="M1 2h14M1 5.5h14M1 9h14M1 12.5h14"/></svg>',
};
const fld = (label, control, hint) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, label), control, hint ? h('small', { class: 'hint' }, hint) : null);
const group = (title, ...kids) => h('div', { class: 'sec' }, title ? h('h3', {}, title) : null, ...kids);
function inText(get, set, ph) { const i = h('input', { type: 'text', value: get() ?? '', placeholder: ph || '' }); i.addEventListener('input', () => set(i.value)); return i; }
function inNum(get, set, o = {}) {
  const i = h('input', { type: 'number', value: get() ?? '', placeholder: o.ph || '' });
  if (o.min != null) i.min = o.min; if (o.max != null) i.max = o.max; i.step = o.step || 'any';
  i.addEventListener('input', () => set(i.value === '' ? '' : i.value)); return i;
}
function inArea(get, set, rows = 3) { const t = h('textarea', { rows }); t.value = get() ?? ''; t.addEventListener('input', () => set(t.value)); return t; }
function chk(label, get, set) { const i = h('input', { type: 'checkbox' }); i.checked = !!get(); i.addEventListener('change', () => set(i.checked)); return h('label', { class: 'chk' }, i, label); }
function sel(options, get, set) {
  const s = h('select', {}, options.map(([v, l]) => h('option', { value: v }, l)));
  s.value = get(); s.addEventListener('change', () => set(s.value)); return s;
}
function seg(options, get, set) {
  const wrap = h('div', { class: 'seg' });
  const paint = () => [...wrap.children].forEach((b, i) => b.classList.toggle('on', options[i][0] === get()));
  options.forEach(([v, lab, title]) => wrap.append(h('button', { type: 'button', title: title || '', 'aria-label': title || '', html: lab, onclick: () => { set(v); paint(); } })));
  paint(); return wrap;
}
const alignSeg = (get, set, inherit) => seg([...(inherit ? [['', 'Auto', 'Heredar']] : []), ['left', ALIGN_SVG.left, 'Izquierda'], ['center', ALIGN_SVG.center, 'Centrado'], ['right', ALIGN_SVG.right, 'Derecha'], ['justify', ALIGN_SVG.justify, 'Justificado']], get, set);

function fontPicker(get, set, inherit, compact) {
  const wrap = h('div');
  const s = h('select');
  if (inherit) s.append(h('option', { value: '' }, compact ? 'Base' : 'Heredar (por defecto)'));
  const gs = h('optgroup', { label: 'Del sistema' }), gw = h('optgroup', { label: 'Web (requieren conexión la primera vez)' });
  FONTS.forEach(f => (f.g === 'sys' ? gs : gw).append(h('option', { value: f.id, style: { fontFamily: f.css } }, f.label)));
  s.append(gs, gw);
  if (!compact) s.append(h('option', { value: '__c' }, 'Otra (escribir el nombre)…'));
  const cur = get() || '';
  const isCustom = cur.startsWith('custom:');
  s.value = isCustom ? '__c' : cur;
  if (compact && isCustom) { s.append(h('option', { value: cur }, cur.slice(7))); s.value = cur; }
  const ci = h('input', { type: 'text', class: 'cust', placeholder: 'Nombre de una fuente instalada, p. ej. Garamond', value: isCustom ? cur.slice(7) : '' });
  ci.hidden = !isCustom;
  s.addEventListener('change', () => {
    if (s.value === '__c') { ci.hidden = false; ci.focus(); if (ci.value) set('custom:' + ci.value); }
    else { ci.hidden = true; set(s.value); }
  });
  ci.addEventListener('input', () => set(ci.value.trim() ? 'custom:' + ci.value.trim() : ''));
  wrap.append(s, ci); return wrap;
}
function presetSelect(presets, get, set) {
  const wrap = h('div');
  const s = h('select', {}, presets.map(([v, l]) => h('option', { value: v }, l)), h('option', { value: '__c' }, 'Personalizado…'));
  const has = presets.some(p => p[0] === get());
  s.value = has ? get() : '__c';
  const ci = h('input', { type: 'text', class: 'cust', value: has ? '' : get(), placeholder: 'Usa {n} {a} {A} {i} {I}' }); ci.hidden = has;
  s.addEventListener('change', () => { if (s.value === '__c') { ci.hidden = false; ci.value = get(); ci.focus(); } else { ci.hidden = true; set(s.value); } });
  ci.addEventListener('input', () => set(ci.value));
  wrap.append(s, ci); return wrap;
}

/* Editor de texto con formato */
function richField(label, get, set, hint) {
  const ed = h('div', { class: 'redit', contenteditable: 'true', spellcheck: 'true', lang: 'es', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label });
  ed.innerHTML = richToEditor(get());
  const push = () => set(domToParas(ed).join('\n'));
  ed.addEventListener('input', push);
  ed.addEventListener('paste', ev => {
    ev.preventDefault();
    const t = (ev.clipboardData || window.clipboardData).getData('text/plain').replace(/\r/g, '');
    document.execCommand('insertHTML', false, esc(t).replace(/&quot;/g, '"').replace(/\n/g, '<br>'));
  });
  const b = (html, title, fn) => h('button', { type: 'button', title, 'aria-label': title, html, onmousedown: e => e.preventDefault(), onclick: () => { ed.focus(); fn(); push(); } });
  const ex = c => () => document.execCommand(c);
  const bar = h('div', { class: 'rtb' },
    b('<b>N</b>', 'Negrita (Ctrl+B)', ex('bold')), b('<i>K</i>', 'Cursiva (Ctrl+I)', ex('italic')), b('<u>S</u>', 'Subrayado (Ctrl+U)', ex('underline')),
    b('x<sub>2</sub>', 'Subíndice', ex('subscript')), b('x<sup>2</sup>', 'Superíndice', ex('superscript')),
    b('____', 'Insertar espacio para rellenar', () => document.execCommand('insertText', false, '__________')),
    b('Tx', 'Quitar formato', ex('removeFormat')));
  return h('div', { class: 'fld' }, h('span', { class: 'lbl' }, label), h('div', { class: 'rich' }, bar, ed), hint ? h('small', { class: 'hint' }, hint) : null);
}

/* =====================================================================
   Pestaña "Bloque"
   ===================================================================== */
function renderSide() {
  $$('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === S.tab); b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)); });
  const box = $('#inspector'), sc = box.parentElement.scrollTop;
  const key = S.tab + ':' + (S.tab === 'block' ? S.sel : '');
  box.textContent = '';
  box.append(...(S.tab === 'block' ? blockPane() : S.tab === 'page' ? pagePane() : barsPane()));
  box.parentElement.scrollTop = key === S._sideKey ? sc : 0;
  S._sideKey = key;
}

function blockPane() {
  const f = S.sel && findNode(S.exam.body, S.sel);
  if (!f) return [h('div', { class: 'note' }, 'Selecciona un bloque en la estructura de la izquierda, o haz clic sobre él en la hoja, para editar su contenido y su estilo.'),
    h('button', { class: 'btn primary', onclick: e => openAddMenu(e.currentTarget, null) }, '+ Añadir bloque')];
  const n = f.node, T = TYPES[n.type];
  const up = (k, tree = true, key) => v => { n[k] = v; change({ key: 'f:' + n.id + k, tree }); };
  const out = [];

  out.push(h('div', { class: 'inspector-head' }, h('h2', {}, T.name),
    h('div', { class: 'tools' },
      h('button', { class: 'btn sm icon', title: 'Subir', onclick: () => nodeOp('up') }, '↑'),
      h('button', { class: 'btn sm icon', title: 'Bajar', onclick: () => nodeOp('down') }, '↓'),
      h('button', { class: 'btn sm icon', title: 'Sacar un nivel (hacerlo hermano de su contenedor)', onclick: () => nodeOp('out') }, '←'),
      h('button', { class: 'btn sm icon', title: 'Meter en el bloque anterior', onclick: () => nodeOp('in') }, '→'),
      h('button', { class: 'btn sm', onclick: () => nodeOp('dup') }, 'Duplicar'),
      h('button', { class: 'btn sm danger', onclick: () => nodeOp('del') }, 'Eliminar'))));

  const content = [];
  const numbering = () => group('Numeración',
    sel([['auto', 'Automática'], ['none', 'Sin número'], ['custom', 'Etiqueta propia']], () => n.numMode || 'auto', v => { n.numMode = v; change({ tree: true, insp: true }); }),
    n.numMode === 'custom' ? fld('Etiqueta', inText(() => n.customLabel, up('customLabel'), 'Ej.: Bonus')) : null);
  const points = () => fld('Puntuación', inText(() => n.points, up('points'), 'Ej.: 1,5'), 'Se escribe con el formato de «Examen › Numeración y puntos».');

  switch (n.type) {
    case 'title': content.push(group('Contenido',
      fld('Línea superior (asignatura, curso…)', inText(() => n.eyebrow, up('eyebrow', false))),
      fld('Título', inText(() => n.title, up('title'))),
      fld('Subtítulo', inText(() => n.subtitle, up('subtitle', false))),
      chk('Línea separadora debajo', () => n.rule, v => { n.rule = v; change({ tree: false }); }))); break;
    case 'datos': {
      const list = h('div', { class: 'sec' });
      n.fields.forEach((x, i) => list.append(h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 46px 56px 24px', gap: '5px' } },
        inText(() => x.label, v => { x.label = v; change({ key: 'df' + n.id + i }); }, 'Campo'),
        inNum(() => x.w, v => { x.w = v; change({ key: 'dw' + n.id + i }); }, { min: 5, ph: '%' }),
        inText(() => x.pre, v => { x.pre = v; change({ key: 'dp' + n.id + i }); }, '/ 10'),
        h('button', { class: 'btn sm icon danger', title: 'Quitar campo', onclick: () => { n.fields.splice(i, 1); change({ insp: true, now: true }); } }, '×'))));
      content.push(group('Campos', h('small', { class: 'hint' }, 'Nombre · ancho relativo · texto ya escrito (opcional)'), list,
        h('button', { class: 'btn sm', onclick: () => { n.fields.push({ label: 'Campo', w: 20, pre: '' }); change({ insp: true, now: true }); } }, '+ Añadir campo')));
      break;
    }
    case 'section': case 'question': {
      content.push(group('Contenido',
        fld(n.type === 'section' ? 'Título del apartado' : 'Título de la pregunta (opcional)', inText(() => n.title, up('title')), n.type === 'question' ? 'Si lo dejas vacío, el número va delante del enunciado.' : ''),
        fld('Línea de detalle (opcional)', inText(() => n.meta, up('meta', false), 'Ej.: Nivel medio'), 'Aparece en cursiva bajo el título.'),
        richField(n.type === 'section' ? 'Descripción (opcional)' : 'Enunciado', () => n.text, v => { n.text = v; change({ key: 'f:' + n.id + 'text', tree: true }); }),
        points()), numbering());
      break;
    }
    case 'subquestion': content.push(group('Contenido', richField('Texto', () => n.text, v => { n.text = v; change({ key: 'f:' + n.id + 'text', tree: true }); }), points()), numbering()); break;
    case 'text': content.push(group('Contenido', richField('Texto', () => n.text, v => { n.text = v; change({ key: 'f:' + n.id + 'text', tree: true }); }, 'Cada línea nueva es un párrafo.'),
      fld('Aspecto', seg([['plain', 'Normal'], ['quote', 'Cita'], ['framed', 'Recuadro']], () => n.variant || 'plain', v => { n.variant = v; change({ insp: true }); })))); break;
    case 'box': content.push(group('Contenido', fld('Título', inText(() => n.title, up('title'))),
      richField('Texto', () => n.text, v => { n.text = v; change({ key: 'f:' + n.id + 'text', tree: true }); }),
      fld('Alto mínimo (mm)', inNum(() => n.minH, up('minH', false), { min: 0, ph: '0' }), 'Útil para dejar un recuadro vacío donde el alumno escriba.'))); break;
    case 'lines': content.push(group('Líneas',
      h('div', { class: 'r3' }, fld('Cantidad', inNum(() => n.count, up('count'), { min: 1, max: 80, step: 1 })), fld('Separación (mm)', inNum(() => n.spacing, up('spacing', false), { min: 4, max: 30 })),
        fld('Trazo', sel([['solid', 'Continuo'], ['dotted', 'Puntos'], ['dashed', 'Guiones']], () => n.lineStyle || 'solid', up('lineStyle', false)))))); break;
    case 'spacer': content.push(group('Espacio', fld('Alto (mm)', inNum(() => n.height, up('height'), { min: 1, max: 250 })))); break;
    case 'image': content.push(imagePane(n)); break;
    case 'table': content.push(...tablePane(n)); break;
  }
  out.push(...content);

  // Estilo
  const sf = STYLE_FIELDS[n.type] || [];
  const st = n.style;
  const styleKids = [];
  if (sf.includes('font')) styleKids.push(fld('Tipografía', fontPicker(() => st.font, v => { st.font = v; change({ key: 'st' + n.id }); }, true)));
  if (sf.includes('size') || sf.includes('align')) {
    const r = h('div', { class: 'r2', style: { alignItems: 'end' } });
    if (sf.includes('size')) r.append(fld('Tamaño (pt)', inNum(() => st.size, v => { st.size = v; change({ key: 'ss' + n.id }); }, { min: 6, max: 40, step: 0.5, ph: 'Heredar' })));
    if (sf.includes('align')) r.append(fld('Alineación', alignSeg(() => st.align, v => { st.align = v; change({ now: true }); }, true)));
    styleKids.push(r);
  }
  if (CONTAINERS.has(n.type)) styleKids.push(h('small', { class: 'hint' }, 'El estilo elegido aquí se aplica también a todo lo que contiene este bloque.'));
  out.push(group('Estilo de esta parte', ...styleKids,
    h('div', { class: 'r2' }, fld('Espacio antes (mm)', inNum(() => n.spaceBefore, v => { n.spaceBefore = v; change({ key: 'sb' + n.id }); }, { min: 0, max: 100, ph: 'Auto' })), h('span')),
    chk('Empezar en una página nueva', () => n.breakBefore, v => { n.breakBefore = v; change({ now: true }); }),
    chk('No partir entre dos páginas', () => n.keepTogether, v => { n.keepTogether = v; change({ now: true }); })));
  return out;
}

function imagePane(n) {
  const kids = [];
  const fi = h('input', { type: 'file', accept: 'image/*', id: 'imgFile' });
  fi.addEventListener('change', async () => {
    const file = fi.files[0]; if (!file) return;
    try {
      n.src = await readImageFile(file);
      const dim = await new Promise(r => { const im = new Image(); im.onload = () => r([im.naturalWidth, im.naturalHeight]); im.onerror = () => r([0, 0]); im.src = n.src; });
      n.imgW = dim[0]; n.imgH = dim[1];
      change({ tree: true, insp: true, now: true });
    } catch (e) { toast(e.message); }
  });
  kids.push(fld(n.src ? 'Cambiar imagen' : 'Elegir imagen', fi, 'También sirve una captura o un mapa guardado como imagen.'));
  if (n.src) kids.push(h('img', { class: 'thumb', src: n.src, alt: 'Vista previa' }));
  kids.push(fld('Ancho (% de la página)', (() => { const r = h('input', { type: 'range', min: 10, max: 100, step: 1, value: num(n.widthPct, 80) }); const o = h('span', { class: 'status' }, num(n.widthPct, 80) + '%'); r.addEventListener('input', () => { n.widthPct = +r.value; o.textContent = r.value + '%'; change({ key: 'iw' + n.id }); }); return h('div', {}, r, o); })()));
  kids.push(fld('Posición', seg([['left', ALIGN_SVG.left, 'Izquierda'], ['center', ALIGN_SVG.center, 'Centro'], ['right', ALIGN_SVG.right, 'Derecha']], () => n.imgAlign || 'center', v => { n.imgAlign = v; change({ now: true }); })));
  kids.push(fld('Pie de imagen (opcional)', inText(() => n.caption, v => { n.caption = v; change({ key: 'ic' + n.id, tree: true }); })));
  if (n.src) kids.push(h('button', { class: 'btn sm danger', onclick: () => { n.src = ''; n.imgW = n.imgH = 0; change({ tree: true, insp: true, now: true }); } }, 'Quitar imagen'));
  return group('Imagen', ...kids);
}

function readClipboardTable(ev) {
  const cb = ev.clipboardData; if (!cb) return null;
  const html = cb.getData('text/html');
  if (html && /<table[\s>]/i.test(html)) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (table) {
        const matrix = [...table.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(td => (td.innerText || td.textContent || '').replace(/\u00a0/g, ' ').trim()));
        if (matrix.some(row => row.length)) return matrix;
      }
    } catch (e) { console.warn('No se pudo interpretar la tabla HTML del portapapeles', e); }
  }
  const text = cb.getData('text/plain');
  if (!text || (!text.includes('\t') && !/[\r\n]/.test(text))) return null;
  const rows = text.replace(/\r/g, '').split('\n');
  if (rows.length && rows[rows.length - 1] === '') rows.pop();
  return rows.map(row => row.split('\t'));
}
function pasteIntoExamTable(n, startRow, startCol, matrix) {
  const T = n.table; if (!T || !Array.isArray(matrix) || !matrix.length) return;
  const widest = Math.max(1, ...matrix.map(r => r.length));
  const needCols = startCol + widest;
  while ((T.cells[0] || []).length < needCols) { T.cells.forEach(row => row.push('')); (T.widths ||= []).push(''); }
  const needRows = startRow + matrix.length;
  while (T.cells.length < needRows) T.cells.push(new Array(T.cells[0].length).fill(''));
  T.cells.forEach(row => { while (row.length < needCols) row.push(''); });
  matrix.forEach((row, ri) => row.forEach((value, ci) => { T.cells[startRow + ri][startCol + ci] = String(value ?? ''); }));
  T.widths ||= []; while (T.widths.length < T.cells[0].length) T.widths.push('');
  change({ tree: true, insp: true, now: true });
  toast(`Pegadas ${matrix.length} fila${matrix.length === 1 ? '' : 's'} y ${widest} columna${widest === 1 ? '' : 's'}.`);
}

function tablePane(n) {
  const T = n.table;
  const autosize = ta => { ta.style.height = 'auto'; ta.style.height = Math.max(26, ta.scrollHeight) + 'px'; };
  const grid = h('div', { class: 'tgrid' });
  const t = h('table');
  const nc = T.cells[0].length;
  // anchos
  const wr = h('tr', { class: 'w' });
  for (let c = 0; c < nc; c++) {
    const i = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'auto %', value: T.widths[c] ?? '', 'aria-label': 'Ancho columna ' + (c + 1) });
    i.addEventListener('input', () => { T.widths[c] = i.value; change({ key: 'tw' + n.id + c }); });
    wr.append(h('td', {}, i));
  }
  wr.append(h('td', { class: 'x' })); t.append(wr);
  T.cells.forEach((row, r) => {
    const tr = h('tr');
    row.forEach((v, c) => {
      const ta = h('textarea', { rows: 1, 'aria-label': `Fila ${r + 1}, columna ${c + 1}` }); ta.value = v;
      ta.addEventListener('input', () => { T.cells[r][c] = ta.value; autosize(ta); change({ key: 'tc' + n.id + r + '_' + c }); });
      ta.addEventListener('paste', ev => {
        const matrix = readClipboardTable(ev);
        if (!matrix) return;
        ev.preventDefault(); pasteIntoExamTable(n, r, c, matrix);
      });
      tr.append(h('td', {}, ta));
    });
    tr.append(h('td', { class: 'x' }, h('button', { class: 'xb', title: 'Quitar fila', onclick: () => { if (T.cells.length > 1) { T.cells.splice(r, 1); change({ tree: true, insp: true, now: true }); } } }, '×')));
    t.append(tr);
  });
  const xr = h('tr');
  for (let c = 0; c < nc; c++) xr.append(h('td', { class: 'x', style: { textAlign: 'center' } }, h('button', { class: 'xb', title: 'Quitar columna', onclick: () => { if (nc > 1) { T.cells.forEach(r => r.splice(c, 1)); T.widths.splice(c, 1); change({ tree: true, insp: true, now: true }); } } }, '×')));
  t.append(xr); grid.append(t);
  setTimeout(() => $$('textarea', grid).forEach(autosize), 0);
  return [
    group('Celdas', grid,
      h('div', { class: 'tools' },
        h('button', { class: 'btn sm', onclick: () => { T.cells.push(new Array(nc).fill('')); change({ tree: true, insp: true, now: true }); } }, '+ Fila'),
        h('button', { class: 'btn sm', onclick: () => { T.cells.forEach(r => r.push('')); T.widths.push(''); change({ tree: true, insp: true, now: true }); } }, '+ Columna')),
      h('small', { class: 'hint' }, 'Puedes copiar celdas de Excel, LibreOffice Calc o Word y pegarlas con Ctrl+V en la celda inicial: se ampliará la tabla si hace falta. La primera fila de números son los anchos en %. Si marcas la primera fila como encabezado, se repetirá automáticamente al continuar la tabla en otra página.')),
    group('Aspecto de la tabla',
      chk('La primera fila es el encabezado', () => T.header, v => { T.header = v; change({ now: true }); }),
      chk('Sombrear el encabezado', () => T.hshade, v => { T.hshade = v; change({ now: true }); }),
      chk('Filas alternas en gris', () => T.zebra, v => { T.zebra = v; change({ now: true }); }),
      chk('Permitir que la tabla se parta entre dos páginas', () => T.split, v => { T.split = v; change({ now: true }); }),
      h('div', { class: 'r2' },
        fld('Bordes', sel([['grid', 'Cuadrícula'], ['rows', 'Solo líneas horizontales'], ['none', 'Sin bordes']], () => T.border || 'grid', v => { T.border = v; change({ now: true }); })),
        fld('Alto mínimo de fila (mm)', inNum(() => T.rowH, v => { T.rowH = v; change({ key: 'rh' + n.id }); }, { min: 0, ph: 'Auto' })))),
  ];
}

/* =====================================================================
   Pestaña "Examen"
   ===================================================================== */
function pagePane() {
  const e = S.exam, P = e.page, B = e.base, N = e.num;
  const setP = (obj, k, tree) => v => { obj[k] = v; change({ key: 'p' + k, tree }); };
  const out = [];
  out.push(group('Papel y márgenes',
    h('div', { class: 'r2' }, fld('Tamaño', sel(Object.keys(PAPERS).map(k => [k, k]), () => P.size, v => { P.size = v; change({ now: true }); })),
      fld('Orientación', seg([['portrait', 'Vertical'], ['landscape', 'Horizontal']], () => P.orient, v => { P.orient = v; change({ now: true }); }))),
    h('div', { class: 'r4' }, [['mt', 'Arriba'], ['mb', 'Abajo'], ['ml', 'Izq.'], ['mr', 'Der.']].map(([k, l]) => fld(l + ' (mm)', inNum(() => P[k], v => { P[k] = num(v, 0); change({ key: 'pm' + k }); }, { min: 5, max: 60 }))))));

  out.push(group('Tipografía general',
    fld('Tipografía base', fontPicker(() => B.font, v => { B.font = v || 'times'; change({ key: 'bf' }); }, false)),
    h('div', { class: 'r2' }, fld('Tamaño (pt)', inNum(() => B.size, v => { B.size = num(v, 11); change({ key: 'bs' }); }, { min: 6, max: 30, step: 0.5 })),
      fld('Interlineado', inNum(() => B.lh, v => { B.lh = num(v, 1.4); change({ key: 'bl' }); }, { min: 1, max: 3, step: 0.05 }))),
    fld('Alineación general', alignSeg(() => B.align, v => { B.align = v; change({ now: true }); })),
    chk('Dividir palabras con guiones (mejora el justificado)', () => B.hyphens, v => { B.hyphens = v; change({ now: true }); }),
    fld('Color de numeración y líneas', h('input', { type: 'color', value: e.accent, 'aria-label': 'Color de énfasis', oninput: ev => { e.accent = ev.target.value; change({ key: 'ac' }); } }), 'Para imprimir en blanco y negro, deja el negro.')));

  const rows = [['title', 'Título'], ['datos', 'Datos alumno'], ['section', 'Apartado'], ['question', 'Pregunta'], ['subquestion', 'Subpregunta'], ['text', 'Texto'], ['table', 'Tabla'], ['box', 'Recuadro']];
  const tbox = h('div', { class: 'in' }, h('small', { class: 'hint' }, 'Valores por defecto para cada tipo de parte. Lo que elijas en un bloque concreto, o en el apartado que lo contiene, tiene prioridad.'));
  rows.forEach(([t, l]) => {
    const ts = e.typeStyles[t] = e.typeStyles[t] || {};
    const row = h('div', { class: 'tyrow' }, h('span', {}, l),
      fontPicker(() => ts.font, v => { ts.font = v; change({ key: 'ty' + t + 'f' }); }, true, true),
      inNum(() => ts.size, v => { ts.size = v; change({ key: 'ty' + t + 's' }); }, { min: 6, max: 40, step: 0.5, ph: 'pt' }),
      sel([['', 'Base'], ['left', 'Izq.'], ['center', 'Centro'], ['right', 'Der.'], ['justify', 'Justif.']], () => ts.align || '', v => { ts.align = v; change({ now: true }); }));
    tbox.append(row);
  });
  out.push(h('details', { class: 'fold' }, h('summary', {}, 'Tipografía y alineación por tipo de parte'), tbox));

  const secP = [['{I}.', 'I. II. III.'], ['{A}.', 'A. B. C.'], ['{n}.', '1. 2. 3.'], ['Parte {n}.', 'Parte 1. Parte 2.'], ['Bloque {n}.', 'Bloque 1. Bloque 2.'], ['{I})', 'I) II) III)'], ['{a})', 'a) b) c)'], ['', 'Sin numeración']];
  const qP = [['{n}.-', '1.- 2.- 3.-'], ['{n}.', '1. 2. 3.'], ['{n})', '1) 2) 3)'], ['Pregunta {n}.', 'Pregunta 1.'], ['Ejercicio {n}.', 'Ejercicio 1.'], ['Problema {n}.', 'Problema 1.'], ['{n}', '1  2  3 (solo número)'], ['', 'Sin numeración']];
  const subP = [['{a})', 'a) b) c)'], ['{a}.', 'a. b. c.'], ['({a})', '(a) (b) (c)'], ['{n})', '1) 2) 3)'], ['{i})', 'i) ii) iii)'], ['{A})', 'A) B) C)'], ['–', '– guion'], ['•', '• viñeta'], ['', 'Sin etiqueta']];
  out.push(group('Numeración',
    fld('Apartados (nivel 1)', presetSelect(secP, () => N.sec[0], v => { N.sec[0] = v; change({ key: 'ns0', tree: true }); })),
    fld('Subapartados (nivel 2)', presetSelect(secP, () => N.sec[1], v => { N.sec[1] = v; change({ key: 'ns1', tree: true }); })),
    fld('Preguntas', presetSelect(qP, () => N.q, v => { N.q = v; change({ key: 'nq', tree: true }); })),
    chk('Reiniciar la numeración de preguntas en cada apartado', () => N.restart, v => { N.restart = v; change({ tree: true, now: true }); }),
    fld('Subpreguntas (nivel 1)', presetSelect(subP, () => N.sub[0], v => { N.sub[0] = v; change({ key: 'nu0', tree: true }); })),
    fld('Subpreguntas (nivel 2)', presetSelect(subP, () => N.sub[1], v => { N.sub[1] = v; change({ key: 'nu1', tree: true }); }))));

  const ptsP = [['(hasta {p} puntos)', '(hasta 2 puntos)'], ['({p} puntos)', '(2 puntos)'], ['[{p} puntos]', '[2 puntos]'], ['({p} p.)', '(2 p.)'], ['{p} puntos', '2 puntos'], ['Valor: {p} puntos', 'Valor: 2 puntos'], ['[{p} pts]', '[2 pts]']];
  out.push(group('Puntuación',
    fld('Cómo se escribe', presetSelect(ptsP, () => N.ptsFmt, v => { N.ptsFmt = v; change({ key: 'pf' }); })),
    fld('Dónde aparece', seg([['inline', 'Tras el texto'], ['right', 'A la derecha'], ['meta', 'En la línea de detalle']], () => N.ptsPlace, v => { N.ptsPlace = v; change({ now: true }); })),
    fld('Total del examen (para avisarte si la suma no cuadra)', inNum(() => N.total, v => { N.total = num(v, 10); change({ key: 'pt', tree: true }); }, { min: 1 }))));
  return out;
}

/* =====================================================================
   Pestaña "Encabezado y pie"
   ===================================================================== */
function barsPane() {
  const e = S.exam;
  const one = (kind, title) => {
    const c = kind === 'hdr' ? e.header : e.footer;
    let lastTa = null; const tas = {};
    const zone = (k, l) => { const t = inArea(() => c[k], v => { c[k] = v; change({ key: kind + k }); }, 2); t.addEventListener('focus', () => lastTa = { t, k }); tas[k] = t; return fld(l, t); };
    const insert = tok => { const z = lastTa || { t: tas.r, k: 'r' }; const t = z.t; const s = t.selectionStart ?? t.value.length, en = t.selectionEnd ?? s; t.value = t.value.slice(0, s) + tok + t.value.slice(en); c[z.k] = t.value; t.focus(); t.setSelectionRange(s + tok.length, s + tok.length); change({ key: kind + z.k }); };
    const kids = [
      chk('Mostrar ' + (kind === 'hdr' ? 'encabezado' : 'pie de página'), () => c.on, v => { c.on = v; change({ insp: true, now: true }); })];
    if (c.on) {
      kids.push(chk('Mostrar también en la primera página', () => c.first, v => { c.first = v; change({ now: true }); }),
        h('div', { class: 'r3' }, zone('l', 'Izquierda'), zone('c', 'Centro'), zone('r', 'Derecha')),
        h('div', { class: 'tools' }, h('span', { class: 'status', style: { alignSelf: 'center' } }, 'Insertar:'),
          h('button', { class: 'btn sm', onmousedown: ev => ev.preventDefault(), onclick: () => insert('{pagina}') }, 'Nº de página'),
          h('button', { class: 'btn sm', onmousedown: ev => ev.preventDefault(), onclick: () => insert('{paginas}') }, 'Total de páginas'),
          h('button', { class: 'btn sm', onmousedown: ev => ev.preventDefault(), onclick: () => insert('{fecha}') }, 'Fecha de hoy')),
        fld('Tipografía', fontPicker(() => c.font, v => { c.font = v; change({ key: kind + 'f' }); }, true)),
        h('div', { class: 'r3' }, fld('Tamaño (pt)', inNum(() => c.size, v => { c.size = num(v, 9); change({ key: kind + 's' }); }, { min: 5, max: 20, step: 0.5 })),
          fld('Color', h('input', { type: 'color', value: c.color || '#333333', oninput: ev => { c.color = ev.target.value; change({ key: kind + 'c' }); } })),
          fld('Distancia al borde (mm)', inNum(() => c.off, v => { c.off = num(v, 8); change({ key: kind + 'o' }); }, { min: 2, max: 40 }))),
        chk(kind === 'hdr' ? 'Línea bajo el encabezado' : 'Línea sobre el pie', () => c.rule, v => { c.rule = v; change({ now: true }); }));
      if (kind === 'hdr') {
        const fi = h('input', { type: 'file', accept: 'image/*' });
        fi.addEventListener('change', async () => { const f = fi.files[0]; if (!f) return; try { c.logo = await readImageFile(f, 600); change({ insp: true, now: true }); } catch (er) { toast(er.message); } });
        kids.push(group('Escudo o logotipo', fld(c.logo ? 'Cambiar imagen' : 'Elegir imagen', fi),
          c.logo ? h('img', { class: 'thumb', src: c.logo, alt: 'Logotipo' }) : null,
          c.logo ? h('div', { class: 'r2' }, fld('Posición', seg([['l', 'Izq.'], ['c', 'Centro'], ['r', 'Der.']], () => c.logoPos || 'l', v => { c.logoPos = v; change({ now: true }); })),
            fld('Alto (mm)', inNum(() => c.logoH, v => { c.logoH = num(v, 10); change({ key: 'lh' }); }, { min: 4, max: 40 }))) : null,
          c.logo ? h('button', { class: 'btn sm danger', onclick: () => { c.logo = ''; change({ insp: true, now: true }); } }, 'Quitar imagen') : null));
      }
    }
    return group(title, ...kids);
  };
  return [one('hdr', 'Encabezado'), one('ftr', 'Pie de página'),
    h('div', { class: 'note' }, 'El encabezado y el pie se repiten en todas las hojas. Puedes escribir varias líneas en cada zona.')];
}

