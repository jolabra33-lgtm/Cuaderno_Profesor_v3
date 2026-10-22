/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · carga del examen, tema y arranque
   editor/js/08-arranque.js
   ============================================================================ */
'use strict';
/* ---------- Cargar un examen en el editor ---------- */
function loadExam(exam) {
  S.exam = exam; S.sel = null; S.tab = 'block';
  HI.stack = []; HI.idx = -1; histPush('load');
  $('#examName').value = exam.name;
  renderTree(); renderSide(); scheduleRender(0); queueSave();
}

/* ---------- Tema de la interfaz (la hoja siempre es blanca) ---------- */
const THEMES = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']];
function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
  $('#btnTheme').textContent = '◐ ' + THEMES.find(x => x[0] === t)[1];
}
function cycleTheme() {
  const cur = LS.get('ee.theme', 'auto');
  const next = THEMES[(THEMES.findIndex(x => x[0] === cur) + 1) % THEMES.length][0];
  LS.set('ee.theme', next); applyTheme(next);
}

/* ---------- Arranque ---------- */
function init() {
  applyTheme(LS.get('ee.theme', 'auto'));
  $('#btnTheme').onclick = cycleTheme;
  $('#examName').addEventListener('input', e => { S.exam.name = e.target.value; change({ key: 'name' }); });
  $('#btnNew').onclick = newExamDialog; $('#btnOpen').onclick = openDialogList; $('#btnSave').onclick = saveFile; $('#btnPdf').onclick = exportPdf;
  $('#btnDocx').onclick = exportDocx;
  $('#btnAudit').onclick = () => runQualityGate('revisión');
  $('#btnVersions').onclick = openVersionsDialog; $('#btnBank').onclick = openReusableLibrary;
  $('#btnUndo').onclick = () => histGo(-1); $('#btnRedo').onclick = () => histGo(1);
  $('#btnAdd').onclick = e => { e.stopPropagation(); openAddMenu(e.currentTarget, S.sel); };
  $('#fileOpen').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) { closeDialog(); openFile(f); } });
  $('#fileSnippetOpen').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importReusableBank(f); });
  $$('.tabs button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; renderSide(); });
  $$('.mobile-tabs button').forEach(b => b.onclick = () => setView(b.dataset.view));
  $('#zIn').onclick = () => { S.fit = false; S.zoom = Math.min(2, S.zoom + .1); applyZoom(); };
  $('#zOut').onclick = () => { S.fit = false; S.zoom = Math.max(.3, S.zoom - .1); applyZoom(); };
  $('#zFit').onclick = () => { S.fit = true; applyZoom(); };
  $('#chkGuides').onchange = e => { S.guides = e.target.checked; $$('.sheet').forEach(s => s.classList.toggle('guides', S.guides)); };
  $('#pages').addEventListener('click', e => { const a = e.target.closest('.atom'); if (a) selectNode(a.dataset.node, { scrollTree: true }); });
  addEventListener('resize', () => { if (S.fit && S.exam) applyZoom(); });
  addEventListener('keydown', e => {
    const t = e.target, typing = t.matches && t.matches('input,textarea,select,[contenteditable="true"]');
    if ((e.ctrlKey || e.metaKey) && !typing) {
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); histGo(e.shiftKey ? 1 : -1); } else if (k === 'y') { e.preventDefault(); histGo(1); }
    }
    if (e.key === 'Escape') closeMenu();
  });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => scheduleRender(30));

  let ex = null;
  const last = LS.get('ee.last', null);
  if (last) ex = loadExamLocal(last);
  loadExam(ex || TEMPLATES.eso());
  setView('stage');
}
document.addEventListener('DOMContentLoaded', init);

/* Plantillas: dentro del Cuaderno siempre se parte de un examen en blanco. */
const TEMPLATES = { eso: () => blankExam(), historia: () => blankExam() };

