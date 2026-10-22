/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · diálogos
   editor/js/05-dialogos.js
   ============================================================================ */
'use strict';
/* =====================================================================
   Diálogos
   ===================================================================== */
function openDialog(title, body, actions) {
  const d = $('#dlg'); d.textContent = '';
  d.append(h('div', { class: 'dh' }, h('h2', {}, title)), h('div', { class: 'db' }, body),
    h('div', { class: 'df' }, ...(actions || [{ label: 'Cerrar' }]).map(a => h('button', { class: 'btn' + (a.primary ? ' primary' : ''), onclick: () => { if (!a.keep) d.close(); a.fn && a.fn(); } }, a.label))));
  if (!d.open) d.showModal();
}
const closeDialog = () => { const d = $('#dlg'); if (d.open) d.close(); };

function newExamDialog() {
  const card = (t, s, fn) => h('button', { class: 'card', onclick: () => { closeDialog(); fn(); } }, h('b', {}, t), h('span', {}, s));
  openDialog('Nuevo examen', h('div', {},
    h('p', { style: { margin: '0 0 10px', color: 'var(--ink-2)' } }, 'El examen actual se queda guardado en este navegador; lo encontrarás en «Abrir».'),
    h('div', { class: 'cards' },
      card('En blanco', 'Título y datos del alumno. Tú añades los apartados.', () => loadExam(blankExam())),
      card('Copia del actual', 'Duplica este examen para hacer otra versión.', () => { const c = clone(S.exam); c.id = uid(); c.name += ' (copia)'; loadExam(sanitizeExam(c)); }))),
    [{ label: 'Cancelar' }]);
}
function openDialogList() {
  const idx = libIndex();
  const list = h('div', { class: 'list' });
  if (!idx.length) list.append(h('div', { class: 'note' }, 'Todavía no hay exámenes guardados en este navegador.'));
  idx.forEach(it => {
    let armed = false;
    const del = h('button', { class: 'btn sm danger' }, 'Eliminar');
    del.onclick = () => { if (!armed) { armed = true; del.textContent = '¿Seguro?'; return; } deleteExamLocal(it.id); if (it.id === S.exam.id) { /* el actual se vuelve a guardar al editar */ } openDialogList(); };
    list.append(h('div', { class: 'item' }, h('div', { class: 'n' }, h('b', {}, it.name || 'Sin título'), h('small', {}, new Date(it.updated).toLocaleString('es-ES'))),
      h('button', { class: 'btn sm primary', onclick: () => { const ex = loadExamLocal(it.id); closeDialog(); if (ex) loadExam(ex); else toast('No se pudo abrir ese examen'); } }, 'Abrir'), del));
  });
  openDialog('Abrir examen', h('div', {}, list), [
    { label: 'Abrir un archivo…', fn: () => $('#fileOpen').click() }, { label: 'Cerrar' }]);
}
function exportHelp(go) {
  const cb = h('input', { type: 'checkbox' });
  const [W, H] = PAPERS[S.exam.page.size] || PAPERS.A4;
  openDialog('Exportar a PDF', h('div', {},
    h('p', { style: { margin: '0 0 8px' } }, 'Se abrirá el cuadro de impresión de tu navegador. Para que el PDF salga idéntico a la vista previa, elige:'),
    h('ol', { style: { margin: '0 0 8px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' } },
      h('li', {}, h('b', {}, 'Destino: '), 'Guardar como PDF'),
      h('li', {}, h('b', {}, 'Tamaño de papel: '), `${S.exam.page.size} (${W} × ${H} mm)`),
      h('li', {}, h('b', {}, 'Márgenes: '), 'Ninguno'),
      h('li', {}, h('b', {}, 'Escala: '), '100 % (no «ajustar a la página»)'),
      h('li', {}, h('b', {}, 'Opciones: '), 'desmarca «Encabezados y pies de página» y marca «Gráficos de fondo»')),
    h('p', { style: { margin: 0, color: 'var(--ink-2)' } }, 'El PDF resultante es vectorial: el texto se puede seleccionar y se ve nítido al imprimir.'),
    h('label', { class: 'chk', style: { marginTop: '6px' } }, cb, 'No volver a mostrar este aviso')),
    [{ label: 'Cancelar' }, { label: 'Continuar', primary: true, fn: () => { if (cb.checked) LS.set('ee.nohelp', true); go(); } }]);
}

