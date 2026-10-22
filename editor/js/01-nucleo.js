/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · núcleo: utilidades, tipografías, modelo de datos, numeración y texto con formato
   editor/js/01-nucleo.js
   ============================================================================ */
'use strict';

'use strict';
/* =====================================================================
   NÚCLEO: utilidades, tipografías, modelo de datos, numeración, texto
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clone = o => JSON.parse(JSON.stringify(o));
const MM = 96 / 25.4;               // píxeles CSS por milímetro
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

/* ---------- Tipografías ---------- */
const FONTS = [
  // Del sistema (funcionan sin conexión)
  { id: 'times', label: 'Times New Roman', css: '"Times New Roman", Times, "Liberation Serif", "Tinos", serif', g: 'sys' },
  { id: 'georgia', label: 'Georgia', css: 'Georgia, "DejaVu Serif", serif', g: 'sys' },
  { id: 'cambria', label: 'Cambria', css: 'Cambria, Caladea, Georgia, serif', g: 'sys' },
  { id: 'arial', label: 'Arial', css: 'Arial, Helvetica, "Liberation Sans", "Arimo", sans-serif', g: 'sys' },
  { id: 'calibri', label: 'Calibri', css: 'Calibri, Carlito, "Segoe UI", sans-serif', g: 'sys' },
  { id: 'verdana', label: 'Verdana', css: 'Verdana, Geneva, "DejaVu Sans", sans-serif', g: 'sys' },
  { id: 'trebuchet', label: 'Trebuchet MS', css: '"Trebuchet MS", "Lucida Grande", Tahoma, sans-serif', g: 'sys' },
  { id: 'tahoma', label: 'Tahoma', css: 'Tahoma, Geneva, Verdana, sans-serif', g: 'sys' },
  { id: 'courier', label: 'Courier New', css: '"Courier New", Courier, "Liberation Mono", monospace', g: 'sys' },
  // Web (se descargan la primera vez que hay conexión)
  { id: 'lora', label: 'Lora', css: '"Lora", Georgia, serif', g: 'web' },
  { id: 'garamond', label: 'EB Garamond', css: '"EB Garamond", Garamond, Georgia, serif', g: 'web' },
  { id: 'merriweather', label: 'Merriweather', css: '"Merriweather", Georgia, serif', g: 'web' },
  { id: 'baskerville', label: 'Libre Baskerville', css: '"Libre Baskerville", Baskerville, Georgia, serif', g: 'web' },
  { id: 'sourceserif', label: 'Source Serif 4', css: '"Source Serif 4", Georgia, serif', g: 'web' },
  { id: 'inter', label: 'Inter', css: '"Inter", "Segoe UI", Arial, sans-serif', g: 'web' },
  { id: 'opensans', label: 'Open Sans', css: '"Open Sans", "Segoe UI", Arial, sans-serif', g: 'web' },
  { id: 'roboto', label: 'Roboto', css: '"Roboto", "Segoe UI", Arial, sans-serif', g: 'web' },
  { id: 'lato', label: 'Lato', css: '"Lato", "Segoe UI", Arial, sans-serif', g: 'web' },
  { id: 'montserrat', label: 'Montserrat', css: '"Montserrat", "Segoe UI", Arial, sans-serif', g: 'web' },
  { id: 'atkinson', label: 'Atkinson Hyperlegible', css: '"Atkinson Hyperlegible", Verdana, sans-serif', g: 'web' },
  { id: 'lexend', label: 'Lexend (lectura fácil)', css: '"Lexend", Verdana, sans-serif', g: 'web' },
  { id: 'courierprime', label: 'Courier Prime', css: '"Courier Prime", "Courier New", monospace', g: 'web' },
  { id: 'patrick', label: 'Patrick Hand (manuscrita)', css: '"Patrick Hand", "Comic Sans MS", cursive', g: 'web' },
];
const FONT_BY_ID = Object.fromEntries(FONTS.map(f => [f.id, f]));
function fontCss(id) {
  if (!id) return 'serif';
  if (id.startsWith('custom:')) return `"${id.slice(7).replace(/["\\]/g, '')}", serif`;
  return (FONT_BY_ID[id] || FONT_BY_ID.times).css;
}

const PAPERS = { A4: [210, 297], A5: [148, 210], Carta: [215.9, 279.4], Legal: [215.9, 355.6] };

/* ---------- Tipos de bloque ---------- */
const TYPES = {
  title:       { name: 'Título del examen', badge: 'Tt', hint: 'Cabecera grande con asignatura, título y subtítulo', container: false },
  datos:       { name: 'Datos del alumno', badge: 'Dt', hint: 'Nombre, curso, fecha y nota', container: false },
  section:     { name: 'Apartado', badge: 'Ap', hint: 'Parte del examen (I, II, III…) con subapartados', container: true },
  question:    { name: 'Pregunta', badge: 'Pr', hint: 'Pregunta numerada con enunciado y puntuación', container: true },
  subquestion: { name: 'Subpregunta', badge: '↳', hint: 'Subapartado a), b), c)…', container: true },
  text:        { name: 'Texto', badge: 'Tx', hint: 'Párrafos, textos de fuentes, citas', container: false },
  table:       { name: 'Tabla', badge: 'Tb', hint: 'Tabla para completar o relacionar', container: false },
  image:       { name: 'Imagen', badge: 'Im', hint: 'Mapa, gráfico, fotografía…', container: false },
  lines:       { name: 'Líneas de respuesta', badge: '≡', hint: 'Renglones para escribir', container: false },
  box:         { name: 'Recuadro', badge: '▭', hint: 'Instrucciones o zona de respuesta con borde', container: false },
  spacer:      { name: 'Espacio en blanco', badge: '␣', hint: 'Hueco vertical', container: false },
};
const MENU_GROUPS = [
  ['Estructura', ['section', 'question', 'subquestion']],
  ['Contenido', ['text', 'table', 'image', 'lines', 'box', 'spacer']],
  ['Cabecera del examen', ['title', 'datos']],
];
const CONTAINERS = new Set(Object.keys(TYPES).filter(t => TYPES[t].container));
const STYLE_FIELDS = {   // qué controles tipográficos tiene cada tipo
  title: ['font', 'size', 'align'], datos: ['font', 'size'], section: ['font', 'size', 'align'],
  question: ['font', 'size', 'align'], subquestion: ['font', 'size', 'align'], text: ['font', 'size', 'align'],
  table: ['font', 'size', 'align'], image: ['font', 'size'], lines: [], box: ['font', 'size', 'align'], spacer: [],
};

function newNode(type) {
  const n = { id: uid(), type, style: { font: '', size: '', align: '' }, spaceBefore: '', breakBefore: false, keepTogether: false, collapsed: false };
  switch (type) {
    case 'title': Object.assign(n, { eyebrow: 'Asignatura · Curso', title: 'Título del examen', subtitle: '', rule: true }); break;
    case 'datos': Object.assign(n, { fields: [
      { label: 'Nombre y apellidos', w: 50, pre: '' }, { label: 'Curso / Grupo', w: 20, pre: '' },
      { label: 'Fecha', w: 15, pre: '' }, { label: 'Nota', w: 15, pre: '/ 10' }] }); break;
    case 'section': Object.assign(n, { title: 'Nuevo apartado', meta: '', text: '', points: '', numMode: 'auto', customLabel: '', children: [] }); break;
    case 'question': Object.assign(n, { title: '', meta: '', text: 'Escribe aquí el enunciado de la pregunta.', points: '', numMode: 'auto', customLabel: '', children: [] }); break;
    case 'subquestion': Object.assign(n, { text: 'Texto del subapartado.', points: '', numMode: 'auto', customLabel: '', children: [] }); break;
    case 'text': Object.assign(n, { text: 'Escribe aquí el texto.', variant: 'plain' }); break;
    case 'table': Object.assign(n, { table: { header: true, border: 'grid', zebra: false, hshade: true, rowH: 0,
      widths: ['', '', ''], cells: [['Columna 1', 'Columna 2', 'Columna 3'], ['', '', ''], ['', '', '']] } }); break;
    case 'image': Object.assign(n, { src: '', widthPct: 80, imgAlign: 'center', caption: '' }); break;
    case 'lines': Object.assign(n, { count: 6, spacing: 8, lineStyle: 'solid' }); break;
    case 'box': Object.assign(n, { title: 'Instrucciones', text: 'Lee con atención cada pregunta.', minH: 0 }); break;
    case 'spacer': Object.assign(n, { height: 20 }); break;
  }
  return n;
}

/* ---------- Examen nuevo ---------- */
function defaultExam() {
  return {
    v: 1, id: uid(), name: 'Examen sin título', updated: Date.now(),
    page: { size: 'A4', orient: 'portrait', mt: 20, mb: 18, ml: 22, mr: 22 },
    base: { font: 'times', size: 11, lh: 1.4, align: 'justify', hyphens: false },
    typeStyles: {},
    accent: '#111111',
    num: { sec: ['{I}.', '{A}.', '{n}.'], q: '{n}.-', sub: ['{a})', '{i})', '–'], restart: false,
           ptsFmt: '(hasta {p} puntos)', ptsPlace: 'inline', total: 10 },
    header: { on: true, first: true, l: 'Nombre del instituto', c: '', r: 'Curso 2026-2027', font: '', size: 9, color: '#333333', rule: true, off: 9,
              logo: '', logoPos: 'l', logoH: 10 },
    footer: { on: true, first: true, l: 'Asignatura · Curso', c: '', r: 'Página {pagina} de {paginas}', font: '', size: 9, color: '#333333', rule: true, off: 8 },
    body: [],
  };
}
function blankExam() {
  const e = defaultExam();
  const t = newNode('title'); t.eyebrow = 'Asignatura · Curso'; t.title = 'Examen de …'; t.subtitle = '';
  e.body = [t, newNode('datos')];
  return e;
}

/* ---------- Árbol: utilidades ---------- */
function findNode(list, id, parent = null, root = list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { node: list[i], list, index: i, parent };
    if (list[i].children) { const r = findNode(list[i].children, id, list[i], root); if (r) return r; }
  }
  return null;
}
function eachNode(list, fn, depth = 0, parent = null) {
  for (const n of list) { fn(n, depth, parent); if (n.children) eachNode(n.children, fn, depth + 1, n); }
}
function isInside(node, id) { // ¿id está dentro de node (o es node)?
  if (node.id === id) return true;
  return (node.children || []).some(c => isInside(c, id));
}
function cloneWithNewIds(n) { const c = clone(n); (function r(x) { x.id = uid(); (x.children || []).forEach(r); })(c); return c; }

/* ---------- Numeración ---------- */
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function toRoman(n) { let s = ''; for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; } return s; }
function toLetters(n) { let s = ''; while (n > 0) { n--; s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); } return s; }
function fmtLabel(tpl, n) {
  return String(tpl || '').replace(/\{(n|a|A|i|I)\}/g, (_, k) =>
    k === 'n' ? n : k === 'a' ? toLetters(n) : k === 'A' ? toLetters(n).toUpperCase() : k === 'i' ? toRoman(n).toLowerCase() : toRoman(n));
}
function computeLabels(exam) {
  const labels = new Map();
  const pick = (arr, i) => arr[Math.min(i, arr.length - 1)];
  function walk(list, ctx) {
    let secN = 0, subN = 0;
    for (const n of list) {
      let label = '';
      const auto = n.numMode !== 'none' && n.numMode !== 'custom';
      if (n.numMode === 'custom') label = n.customLabel || '';
      if (n.type === 'section') {
        if (auto) { secN++; label = fmtLabel(pick(exam.num.sec, ctx.sd), secN); }
        labels.set(n.id, label);
        walk(n.children, { sd: ctx.sd + 1, ud: 0, q: (exam.num.restart && ctx.sd === 0) ? { n: 0 } : ctx.q });
      } else if (n.type === 'question') {
        if (auto) { ctx.q.n++; label = fmtLabel(exam.num.q, ctx.q.n); }
        labels.set(n.id, label);
        walk(n.children, { sd: ctx.sd, ud: 0, q: ctx.q });
      } else if (n.type === 'subquestion') {
        if (auto) { subN++; label = fmtLabel(pick(exam.num.sub, ctx.ud), subN); }
        labels.set(n.id, label);
        walk(n.children, { sd: ctx.sd, ud: ctx.ud + 1, q: ctx.q });
      }
    }
  }
  walk(exam.body, { sd: 0, ud: 0, q: { n: 0 } });
  return labels;
}

/* ---------- Puntos ---------- */
function fmtNum(n) { return (Math.round(n * 100) / 100).toString().replace('.', ','); }
function fmtPoints(exam, raw) {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  const v = num(t, NaN);
  const p = isFinite(v) ? fmtNum(v) : t;
  let s = String(exam.num.ptsFmt || '{p}').replace('{p}', p);
  if (isFinite(v) && v === 1) s = s.replace(/puntos/g, 'punto');
  return s;
}
function sumPoints(list) {
  let s = 0;
  for (const n of list) {
    const p = num(n.points, NaN);
    if (isFinite(p) && String(n.points).trim() !== '') s += p;
    else if (n.children) s += sumPoints(n.children);
  }
  return s;
}

/* ---------- Texto con formato (negrita, cursiva, subrayado, sub/superíndice) ----------
   Se guarda como párrafos separados por "\n". Cada párrafo es HTML en línea limpio. */
function domToParas(root) {
  const out = []; const stack = []; let cur = ''; let has = false;
  const BLOCK = /^(div|p|li|h[1-6]|blockquote|ul|ol|pre|tr|table|section|article)$/;
  const open = () => stack.map(t => `<${t}>`).join('');
  const close = () => stack.slice().reverse().map(t => `</${t}>`).join('');
  const flush = () => { out.push(cur + close()); cur = open(); has = false; };
  function tagsFor(el) {
    const t = el.tagName.toLowerCase(), r = [];
    if (t === 'b' || t === 'strong') r.push('b');
    if (t === 'i' || t === 'em') r.push('i');
    if (t === 'u') r.push('u');
    if (t === 'sub') r.push('sub');
    if (t === 'sup') r.push('sup');
    const s = el.style;
    if (s) {
      const w = s.fontWeight; if (w === 'bold' || +w >= 600) r.push('b');
      if (s.fontStyle === 'italic') r.push('i');
      if ((s.textDecorationLine || s.textDecoration || '').includes('underline')) r.push('u');
    }
    return [...new Set(r)].filter(x => !stack.includes(x));
  }
  function walk(node) {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        const v = c.nodeValue.replace(/\u00a0/g, ' ');
        if (v) { cur += esc(v).replace(/&quot;/g, '"'); has = true; }
      } else if (c.nodeType === 1) {
        const t = c.tagName.toLowerCase();
        if (t === 'br') flush();
        else if (['script', 'style', 'img', 'iframe', 'object'].includes(t)) continue;
        else if (BLOCK.test(t)) {
          if (has) flush();
          walk(c);
          if (has || c.childNodes.length === 0) flush();
        } else {
          const add = tagsFor(c);
          add.forEach(x => { stack.push(x); cur += `<${x}>`; });
          walk(c);
          add.forEach(() => { cur += `</${stack.pop()}>`; });
        }
      }
    }
  }
  walk(root);
  if (has) flush();
  const empty = /<(b|i|u|sub|sup)>(?:\s*)<\/\1>/g;
  const paras = out.map(p => { let q = p; for (let k = 0; k < 3; k++) q = q.replace(empty, ''); return q; });
  while (paras.length && !paras[paras.length - 1]) paras.pop();
  return paras;
}
function cleanRich(html) {           // sanea una cadena "párrafo\npárrafo" que venga de fuera
  const paras = String(html ?? '').split('\n');
  const t = document.createElement('template');
  t.innerHTML = paras.map(p => `<div>${p || '<br>'}</div>`).join('');
  return domToParas(t.content).join('\n');
}
const parasOf = text => String(text ?? '').split('\n');
const richToEditor = text => parasOf(text).map(p => `<div>${p || '<br>'}</div>`).join('');
function plainOf(text) {   // texto sin etiquetas, para el árbol
  const t = document.createElement('template'); t.innerHTML = String(text ?? '').replace(/\n/g, ' · ');
  return t.content.textContent.trim();
}

/* Sanea un examen cargado de un archivo */
function sanitizeExam(raw) {
  const base = defaultExam();
  const e = Object.assign(base, raw || {});
  e.page = Object.assign(defaultExam().page, raw?.page);
  e.base = Object.assign(defaultExam().base, raw?.base);
  e.num = Object.assign(defaultExam().num, raw?.num);
  e.header = Object.assign(defaultExam().header, raw?.header);
  e.footer = Object.assign(defaultExam().footer, raw?.footer);
  e.typeStyles = raw?.typeStyles || {};
  e.body = Array.isArray(raw?.body) ? raw.body : [];
  (function fix(list) {
    list.forEach((n, i) => {
      if (!TYPES[n.type]) { n.type = 'text'; }
      const d = newNode(n.type);
      Object.assign(d, n);
      d.style = Object.assign({ font: '', size: '', align: '' }, n.style);
      if (typeof d.text === 'string') d.text = cleanRich(d.text);
      if (CONTAINERS.has(d.type)) d.children = Array.isArray(n.children) ? n.children : []; else delete d.children;
      if (!d.id) d.id = uid();
      list[i] = d;
      if (d.children) fix(d.children);
    });
  })(e.body);
  return e;
}

/* ---------- Almacenamiento local ---------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};

/* Almacenamiento duradero adicional para versiones y bloques reutilizables. */
let EE_DB_PROMISE = null;
function eeDbOpen() {
  if (EE_DB_PROMISE) return EE_DB_PROMISE;
  EE_DB_PROMISE = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB no está disponible en este navegador.'));
    const req = indexedDB.open('editorExamenesDB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('versions')) db.createObjectStore('versions', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('snippets')) db.createObjectStore('snippets', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('No se pudo abrir el almacenamiento local.'));
    req.onblocked = () => reject(new Error('El almacenamiento está bloqueado por otra pestaña del editor.'));
  }).catch(err => { EE_DB_PROMISE = null; throw err; });
  return EE_DB_PROMISE;
}
function eeFallbackKey(store) { return 'ee.fallback.' + store; }
async function eeDbAll(store) {
  try {
    const db = await eeDbOpen();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
    });
  } catch (e) { return LS.get(eeFallbackKey(store), []); }
}
async function eeDbPut(store, item) {
  try {
    const db = await eeDbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(item);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    const rows = LS.get(eeFallbackKey(store), []), key = store === 'versions' ? 'key' : 'id';
    const next = rows.filter(x => x[key] !== item[key]); next.unshift(item);
    const cap = store === 'versions' ? 3 : 12;
    return LS.set(eeFallbackKey(store), next.slice(0, cap));
  }
}
async function eeDbDelete(store, key) {
  try {
    const db = await eeDbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    const pk = store === 'versions' ? 'key' : 'id';
    return LS.set(eeFallbackKey(store), LS.get(eeFallbackKey(store), []).filter(x => x[pk] !== key));
  }
}
function examSignature(exam) {
  const x = clone(exam); delete x.updated;
  return JSON.stringify(x);
}
async function createRecoverySnapshot(exam, reason = 'Versión manual', force = false) {
  if (!exam) return false;
  const signature = examSignature(exam), all = await eeDbAll('versions');
  const own = all.filter(v => v.examId === exam.id).sort((a,b) => b.at - a.at);
  if (!force && own[0] && own[0].signature === signature) return false;
  if (!force && own[0] && Date.now() - own[0].at < 120000) return false;
  const now = Date.now();
  const v = { key: exam.id + '-' + now + '-' + uid(), examId: exam.id, name: exam.name || 'Examen sin título', at: now, reason, signature, exam: clone(exam) };
  const ok = await eeDbPut('versions', v);
  const after = (await eeDbAll('versions')).filter(x => x.examId === exam.id).sort((a,b) => b.at-a.at);
  // Mantiene las últimas 20 copias automáticas y hasta 20 versiones manuales/restauraciones.
  const autos = after.filter(x => x.reason === 'Autoguardado anterior');
  const named = after.filter(x => x.reason !== 'Autoguardado anterior');
  for (const old of autos.slice(20)) await eeDbDelete('versions', old.key);
  for (const old of named.slice(20)) await eeDbDelete('versions', old.key);
  return ok;
}

function libIndex() { return LS.get('ee.index', []); }
function saveExamLocal(exam) {
  exam.updated = Date.now();
  const ok = LS.set('ee.exam.' + exam.id, exam);
  const idx = libIndex().filter(x => x.id !== exam.id);
  idx.unshift({ id: exam.id, name: exam.name, updated: exam.updated });
  LS.set('ee.index', idx); LS.set('ee.last', exam.id);
  return ok;
}
function loadExamLocal(id) { const r = LS.get('ee.exam.' + id, null); return r ? sanitizeExam(r) : null; }
function deleteExamLocal(id) { LS.del('ee.exam.' + id); LS.set('ee.index', libIndex().filter(x => x.id !== id)); }

/* ---------- Imágenes: redimensionar para que el examen pese poco ---------- */
function readImageFile(file, maxPx = 1500) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('No se pudo leer la imagen'));
    fr.onload = () => {
      const src = fr.result;
      if (file.type === 'image/svg+xml') return resolve(src);
      const im = new Image();
      im.onerror = () => reject(new Error('Formato de imagen no válido'));
      im.onload = () => {
        const k = Math.min(1, maxPx / Math.max(im.width, im.height));
        if (k === 1 && file.type === 'image/png' && file.size < 450000) return resolve(src);
        const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.86));
      };
      im.src = src;
    };
    fr.readAsDataURL(file);
  });
}

const IMG = {};

