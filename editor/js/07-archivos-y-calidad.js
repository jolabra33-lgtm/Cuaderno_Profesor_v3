/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · archivos, PDF, control de calidad, versiones y banco de bloques
   editor/js/07-archivos-y-calidad.js
   ============================================================================ */
'use strict';
/* ---------- Archivos y PDF ---------- */
function slug(s) { return (s || 'examen').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'examen'; }
function saveFile() {
  const blob = new Blob([JSON.stringify({ app: 'editor-de-examenes', v: 1, exam: S.exam })], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: slug(S.exam.name) + '.examen.json' });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Archivo descargado. Con «Abrir» puedes recuperarlo en cualquier ordenador.');
}
async function openFile(file) {
  try {
    const j = JSON.parse(await file.text());
    const ex = sanitizeExam(j.exam || j); ex.id = uid();
    loadExam(ex); toast('Examen abierto: ' + ex.name);
  } catch (e) { toast('Ese archivo no es un examen válido'); }
}
function exportPdf() { runQualityGate('PDF', exportPdfDirect); }
async function exportPdfDirect() {
  if (!S.exam.body.length) return toast('Añade contenido al examen antes de exportar');
  clearTimeout(renderTimer); await renderPreview();
  const go = () => {
    const old = document.title; document.title = S.exam.name || 'Examen';
    const back = () => { document.title = old; removeEventListener('afterprint', back); };
    addEventListener('afterprint', back);
    setTimeout(() => window.print(), 60);
  };
  if (LS.get('ee.nohelp', false)) go(); else exportHelp(go);
}

/* =====================================================================
   Control de calidad, versiones de recuperación y banco de bloques
   ===================================================================== */
function auditExam() {
  const findings = [], nodes = [];
  eachNode(S.exam.body || [], n => nodes.push(n));
  const add = (severity, title, detail, nodeId = null) => findings.push({ severity, title, detail, nodeId });
  if (!S.exam.body || !S.exam.body.length) add('error', 'El examen está vacío', 'Añade al menos un bloque antes de exportar.');
  for (const n of nodes) {
    const name = TYPES[n.type]?.name || n.type;
    if (n.type === 'title' && !String(n.title || '').trim()) add('warning', 'Título vacío', 'El bloque de título no contiene un título.', n.id);
    if (n.type === 'question' && !String(n.title || '').trim() && !plainOf(n.text || '').trim()) add('warning', 'Pregunta sin enunciado', 'Añade un enunciado o un título a la pregunta.', n.id);
    if (n.type === 'subquestion' && !plainOf(n.text || '').trim()) add('warning', 'Subpregunta vacía', 'Comprueba si falta el texto de esta subpregunta.', n.id);
    if (n.type === 'text' && !plainOf(n.text || '').trim()) add('warning', 'Bloque de texto vacío', 'El bloque no contiene texto.', n.id);
    if (n.type === 'section' && !String(n.title || '').trim() && !plainOf(n.text || '').trim() && !(n.children || []).length) add('warning', 'Apartado vacío', 'No hay título, texto ni bloques dentro del apartado.', n.id);
    if (n.type === 'image' && !n.src) add('warning', 'Imagen sin archivo', 'El bloque de imagen no tiene ninguna imagen cargada.', n.id);
    if (n.type === 'table') {
      const rows = n.table?.cells || [], widths = rows.map(r => r.length);
      if (!rows.length) add('warning', 'Tabla vacía', 'La tabla no tiene filas.', n.id);
      else if (new Set(widths).size > 1) add('error', 'Tabla irregular', 'Las filas no tienen el mismo número de columnas; revisa o vuelve a pegar los datos.', n.id);
      if (rows.length && rows.every(r => r.every(c => !String(c ?? '').trim()))) add('warning', 'Tabla sin contenido', 'Todas las celdas están vacías.', n.id);
      if (n.table?.header && rows.length < 2) add('warning', 'Tabla con solo encabezado', 'La tabla tiene encabezado, pero no filas de contenido.', n.id);
    }
    if (n.type === 'box' && !String(n.title || '').trim() && !plainOf(n.text || '').trim()) add('warning', 'Recuadro vacío', 'El recuadro no tiene título ni texto.', n.id);
    if (n.type === 'spacer' && num(n.height, 0) > 80) add('warning', 'Espacio vertical grande', `${name}: ${num(n.height)} mm pueden dejar mucho espacio en blanco.`, n.id);
  }
  const scored = nodes.some(n => String(n.points ?? '').trim() !== '' && isFinite(num(n.points, NaN)));
  if (scored) {
    const total = sumPoints(S.exam.body), expected = num(S.exam.num?.total, 10);
    if (Math.abs(total - expected) > 0.01) add('warning', 'La puntuación no coincide', `La suma calculada es ${fmtNum(total)} y el total configurado es ${fmtNum(expected)}. Comprueba si falta o sobra puntuación.`);
  }
  if (S.overflow > 0) add('warning', 'Bloques que desbordan una página', `La vista previa detecta ${S.overflow} bloque${S.overflow === 1 ? '' : 's'} más alto${S.overflow === 1 ? '' : 's'} que el espacio disponible. Revisa el bloque afectado y sus márgenes.`);
  $$('#pages .atom img').filter(im => !im.complete || !im.naturalWidth).forEach(im => {
    const atom = im.closest('.atom');
    add('warning', 'Imagen que no se ha podido cargar', 'Comprueba que la imagen esté incrustada correctamente en el examen antes de exportar.', atom?.dataset.node || null);
  });
  return findings;
}
function showAuditDialog(findings, title, onContinue = null) {
  const body = h('div', {}, h('p', { style: { marginTop: 0 } }, findings.length ? `Se han detectado ${findings.length} incidencia${findings.length === 1 ? '' : 's'}. Revisa las advertencias antes de distribuir el examen.` : 'No se han detectado incidencias en el contenido o la paginación.' ));
  if (findings.length) {
    const list = h('div', { class: 'audit-list' });
    findings.forEach(f => {
      const row = h('div', { class: 'audit-item ' + f.severity });
      row.append(h('span', { class: 'mark' }, f.severity === 'error' ? '✖' : '⚠'), h('div', { class: 'message' }, h('strong', {}, f.title), h('div', {}, f.detail)));
      if (f.nodeId) row.append(h('button', { class: 'btn sm', onclick: () => { closeDialog(); setView('side'); selectNode(f.nodeId, { scrollPreview: true }); } }, 'Ir al bloque'));
      list.append(row);
    });
    body.append(list);
  } else body.append(h('div', { class: 'note' }, 'La validación es automática, pero no sustituye la revisión docente final, especialmente de mapas, imágenes y puntuaciones.'));
  const hasErrors = findings.some(f => f.severity === 'error');
  const actions = [{ label: 'Cerrar' }];
  if (onContinue && !hasErrors) actions.push({ label: 'Continuar de todos modos', primary: true, fn: onContinue });
  openDialog(title, body, actions);
}
async function runQualityGate(target, onContinue = null) {
  if (S.exam) { clearTimeout(renderTimer); await renderPreview(); }
  const findings = auditExam();
  if (!findings.length) {
    if (onContinue) onContinue(); else toast('Validación completada: no se han detectado incidencias.');
    return;
  }
  showAuditDialog(findings, `Revisión antes de exportar a ${target}`, onContinue);
}

async function openVersionsDialog() {
  const wrap = h('div', {}, h('p', { style: { marginTop: 0 } }, 'Las versiones se guardan localmente en este navegador. Se crean copias de recuperación durante el autoguardado, como máximo cada dos minutos, y puedes crear una versión manual en cualquier momento.'));
  const list = h('div', { class: 'list' }); wrap.append(list);
  const refresh = async () => {
    list.textContent = '';
    const versions = (await eeDbAll('versions')).filter(v => v.examId === S.exam.id).sort((a,b) => b.at-a.at);
    if (!versions.length) list.append(h('div', { class: 'note' }, 'Todavía no hay versiones anteriores. Pulsa «Crear versión ahora» para guardar un punto de restauración.'));
    versions.forEach(v => {
      const time = new Date(v.at).toLocaleString('es-ES');
      list.append(h('div', { class: 'item' }, h('div', { class: 'n' }, h('b', {}, time), h('small', {}, `${v.reason} · ${v.name}`)),
        h('button', { class: 'btn sm primary', onclick: async () => {
          if (!confirm(`¿Restaurar la versión del ${time}? Se conservará una copia del estado actual antes de restaurar.`)) return;
          await createRecoverySnapshot(S.exam, 'Copia antes de restaurar', true);
          const restored = sanitizeExam(clone(v.exam)); closeDialog(); loadExam(restored); toast('Versión restaurada.');
        } }, 'Restaurar'),
        h('button', { class: 'btn sm danger', onclick: async () => { await eeDbDelete('versions', v.key); await refresh(); } }, 'Eliminar')));
    });
  };
  openDialog('Versiones y recuperación', wrap, [
    { label: 'Crear versión ahora', primary: true, keep: true, fn: async () => {
      const ok = await createRecoverySnapshot(S.exam, 'Versión manual', true);
      toast(ok ? 'Versión manual guardada.' : 'No se pudo guardar la versión. Comprueba el almacenamiento del navegador.'); await refresh();
    } }, { label: 'Cerrar' }
  ]);
  await refresh();
}
function nodeSnippetName(n) {
  return String(n.title || n.eyebrow || n.caption || TYPES[n.type]?.name || 'Bloque').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Bloque reutilizable';
}
async function importReusableBank(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.snippets) ? parsed.snippets : (parsed.node ? [parsed] : []));
    if (!incoming.length) throw new Error('El archivo no contiene bloques reconocibles.');
    let added = 0;
    for (const raw of incoming) {
      const sourceNode = raw.node || raw;
      if (!sourceNode || !TYPES[sourceNode.type]) continue;
      const safeNode = sanitizeExam({ body: [clone(sourceNode)] }).body[0];
      const snippet = { id: uid(), name: String(raw.name || nodeSnippetName(safeNode)).slice(0, 120), type: safeNode.type, created: Date.now() + added, node: safeNode };
      if (await eeDbPut('snippets', snippet)) added++;
    }
    if (!added) throw new Error('No se encontró ningún bloque válido.');
    toast(`Se han importado ${added} bloque${added === 1 ? '' : 's'} al banco.`);
    openReusableLibrary();
  } catch (err) { toast('No se pudo importar el banco: ' + (err?.message || 'archivo no válido')); }
}
async function openReusableLibrary() {
  const wrap = h('div', {}, h('p', { style: { marginTop: 0 } }, 'Guarda una pregunta, apartado, tabla, imagen o bloque completo con sus subbloques y formato. El banco es local a este navegador; para compartirlo con compañeros, usa Guardar archivo o exporta el examen donde lo insertes.'));
  const actionsTop = h('div', { class: 'bank-actions' });
  actionsTop.append(h('button', { class: 'btn primary', disabled: !S.sel, onclick: async () => {
    const found = S.sel && findNode(S.exam.body, S.sel); if (!found) return toast('Selecciona primero un bloque en la estructura.');
    const suggested = nodeSnippetName(found.node), name = prompt('Nombre para guardar este bloque:', suggested);
    if (!name || !name.trim()) return;
    const snippet = { id: uid(), name: name.trim(), type: found.node.type, created: Date.now(), node: clone(found.node) };
    const ok = await eeDbPut('snippets', snippet);
    if (ok) { toast('Bloque guardado en el banco.'); await refresh(); } else toast('No se pudo guardar el bloque.');
  } }, 'Guardar bloque seleccionado'),
  h('button', { class: 'btn', onclick: async () => {
    const snippets = (await eeDbAll('snippets')).sort((a,b) => (a.created || 0)-(b.created || 0));
    if (!snippets.length) return toast('El banco está vacío.');
    const blob = new Blob([JSON.stringify({ app: 'editor-de-examenes-banco', v: 1, exported: Date.now(), snippets }, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'banco-bloques-examenes.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Banco exportado. Puedes compartir el JSON con el departamento.');
  } }, 'Exportar banco'),
  h('button', { class: 'btn', onclick: () => { closeDialog(); $('#fileSnippetOpen').click(); } }, 'Importar banco'));
  wrap.append(actionsTop);
  const list = h('div', { class: 'list' }); wrap.append(list);
  const refresh = async () => {
    list.textContent = '';
    const snippets = (await eeDbAll('snippets')).sort((a,b) => (b.created || 0)-(a.created || 0));
    if (!snippets.length) list.append(h('div', { class: 'note' }, 'El banco está vacío. Selecciona un bloque del examen y guárdalo aquí.'));
    snippets.forEach(sn => list.append(h('div', { class: 'item' },
      h('div', { class: 'n' }, h('b', {}, sn.name), h('small', {}, `${TYPES[sn.type]?.name || sn.type} · ${new Date(sn.created).toLocaleDateString('es-ES')}`)),
      h('button', { class: 'btn sm primary', onclick: () => {
        const node = cloneWithNewIds(sn.node);
        const found = S.sel && findNode(S.exam.body, S.sel);
        if (found) found.list.splice(found.index + 1, 0, node); else S.exam.body.push(node);
        S.sel = node.id; closeDialog(); change({ tree: true, insp: true, now: true }); toast('Bloque insertado en el examen.');
      } }, 'Insertar'),
      h('button', { class: 'btn sm danger', onclick: async () => { if (confirm(`¿Eliminar «${sn.name}» del banco?`)) { await eeDbDelete('snippets', sn.id); await refresh(); } } }, 'Eliminar'))));
  };
  openDialog('Banco de bloques reutilizables', wrap, [{ label: 'Cerrar' }]);
  await refresh();
}

