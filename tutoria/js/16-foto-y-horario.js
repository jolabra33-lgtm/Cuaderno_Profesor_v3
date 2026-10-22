/* ============================================================================
   Gestor de Tutoría · Foto del grupo y horario
   tutoria/js/16-foto-y-horario.js
   ============================================================================ */

// ===================== FOTO DEL GRUPO (una por grupo) =====================
if (!window._fotoData) window._fotoData = {};  // key -> { src, name }
let _fotoContext = { nivel: '', grupo: '' };

function openFotoGaleria(nivel, grupo) {
  _fotoContext = { nivel, grupo };
  document.getElementById('fotoGaleriaTitulo').textContent = `Foto del grupo — ${nivel} ${grupo}`;
  renderFotoDisplay();
  const ov = document.getElementById('fotoGaleriaOverlay');
  ov.style.display = 'flex';

  const dz = document.getElementById('fotoDrop');
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); };
  dz.ondragleave = () => dz.classList.remove('dragover');
  dz.ondrop = e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFotoFile(e.dataTransfer.files[0]);
  };
}

function closeFotoGaleria() {
  document.getElementById('fotoGaleriaOverlay').style.display = 'none';
}

function renderFotoDisplay() {
  const key = `${_fotoContext.nivel}-${_fotoContext.grupo}`;
  const foto = _fotoData[key];
  const dropZone   = document.getElementById('fotoDrop');
  const displayEl  = document.getElementById('fotoDisplay');
  const loadingEl  = document.getElementById('fotoLoadingMsg');
  loadingEl.style.display = 'none';
  if (foto && foto.src) {
    document.getElementById('fotoDisplayImg').src = foto.src;
    dropZone.style.display  = 'none';
    displayEl.style.display = 'block';
  } else {
    dropZone.style.display  = 'block';
    displayEl.style.display = 'none';
  }
}

function handleFotoFile(file) {
  if (!file) return;
  const key = `${_fotoContext.nivel}-${_fotoContext.grupo}`;
  const loadingEl = document.getElementById('fotoLoadingMsg');
  const dropZone  = document.getElementById('fotoDrop');
  dropZone.style.display  = 'none';
  loadingEl.style.display = 'block';

  // Mismo límite que aplica buildState() al guardar: si la imagen resultante
  // (en base64) lo supera, se descartaría silenciosamente al autoguardar. Es
  // mejor avisar aquí, justo al subirla, que dejar que el usuario la vea
  // funcionar en esta sesión y desaparezca sola al recargar la página.
  const FOTO_SIZE_LIMIT = 2_000_000;
  const warnIfTooBig = (src) => {
    if (src && src.length >= FOTO_SIZE_LIMIT) {
      showToast(`⚠ La imagen pesa ${_fmtBytes(src.length)} y no se guardará en el autoguardado del navegador (límite ~2 MB). Usa una imagen más ligera, o guarda el curso en un archivo con Ctrl+S.`);
    }
  };

  if (file.type === 'application/pdf') {
    readPdfFirstPage(file, src => {
      _fotoData[key] = { src, name: file.name.replace(/\.pdf$/i, '') };
      renderFotoDisplay();
      warnIfTooBig(src);
    });
  } else if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => {
      _fotoData[key] = { src: e.target.result, name: file.name.replace(/\.[^.]+$/, '') };
      renderFotoDisplay();
      warnIfTooBig(e.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    loadingEl.style.display = 'none';
    dropZone.style.display  = 'block';
  }
}

async function deleteFotoGrupo() {
  if (!await confirmar('¿Eliminar la foto de este grupo?')) return;
  const key = `${_fotoContext.nivel}-${_fotoContext.grupo}`;
  delete _fotoData[key];
  renderFotoDisplay();
}

function readPdfFirstPage(file, callback) {
  function doRender(pdfjsLib) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const typedarray = new Uint8Array(e.target.result);
      pdfjsLib.getDocument({ data: typedarray }).promise.then(pdf => {
        pdf.getPage(1).then(page => {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise.then(() => {
            callback(canvas.toDataURL('image/jpeg', 0.92));
          });
        });
      }).catch(() => callback(null));
    };
    reader.readAsArrayBuffer(file);
  }
  if (window.pdfjsLib) {
    doRender(window.pdfjsLib);
  } else {
    const s = document.createElement('script');
    s.src = 'vendor/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      doRender(window.pdfjsLib);
    };
    document.head.appendChild(s);
  }
}

function openLightbox() {
  const key = `${_fotoContext.nivel}-${_fotoContext.grupo}`;
  const foto = _fotoData[key];
  if (!foto || !foto.src) return;
  document.getElementById('fotoLightboxImg').src = foto.src;
  document.getElementById('fotoLightbox').style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('fotoLightbox').style.display = 'none';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeFotoGaleria(); closeHorarioLightbox(); closeHorarioGrupo(); }
});

// ===================== HORARIO DEL GRUPO =====================
if (!window._horarioData) window._horarioData = {};  // key -> { src, name }
let _horarioContext = { nivel: '', grupo: '' };

function openHorarioGrupo(nivel, grupo) {
  _horarioContext = { nivel, grupo };
  document.getElementById('horarioTitulo').textContent = `Horario del grupo — ${nivel} ${grupo}`;
  renderHorarioDisplay();
  const ov = document.getElementById('horarioOverlay');
  ov.style.display = 'flex';

  const dz = document.getElementById('horarioDrop');
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); };
  dz.ondragleave = () => dz.classList.remove('dragover');
  dz.ondrop = e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleHorarioFile(e.dataTransfer.files[0]);
  };
}

function closeHorarioGrupo() {
  document.getElementById('horarioOverlay').style.display = 'none';
}

function renderHorarioDisplay() {
  const key = `${_horarioContext.nivel}-${_horarioContext.grupo}`;
  const horario   = _horarioData[key];
  const dropZone  = document.getElementById('horarioDrop');
  const displayEl = document.getElementById('horarioDisplay');
  const loadingEl = document.getElementById('horarioLoadingMsg');
  loadingEl.style.display = 'none';
  if (horario && horario.src) {
    document.getElementById('horarioDisplayImg').src = horario.src;
    dropZone.style.display  = 'none';
    displayEl.style.display = 'block';
  } else {
    dropZone.style.display  = 'block';
    displayEl.style.display = 'none';
  }
}

function handleHorarioFile(file) {
  if (!file) return;
  const key = `${_horarioContext.nivel}-${_horarioContext.grupo}`;
  const loadingEl = document.getElementById('horarioLoadingMsg');
  const dropZone  = document.getElementById('horarioDrop');
  dropZone.style.display  = 'none';
  loadingEl.style.display = 'block';

  // Mismo límite que aplica buildState() al guardar (ver handleFotoFile).
  const HORARIO_SIZE_LIMIT = 2_000_000;
  const warnIfTooBig = (src) => {
    if (src && src.length >= HORARIO_SIZE_LIMIT) {
      showToast(`⚠ El horario pesa ${_fmtBytes(src.length)} y no se guardará en el autoguardado del navegador (límite ~2 MB). Usa una imagen más ligera, o guarda el curso en un archivo con Ctrl+S.`);
    }
  };

  if (file.type === 'application/pdf') {
    readPdfFirstPage(file, src => {
      _horarioData[key] = { src, name: file.name.replace(/\.pdf$/i, '') };
      renderHorarioDisplay();
      warnIfTooBig(src);
    });
  } else if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => {
      _horarioData[key] = { src: e.target.result, name: file.name.replace(/\.[^.]+$/, '') };
      renderHorarioDisplay();
      warnIfTooBig(e.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    loadingEl.style.display = 'none';
    dropZone.style.display  = 'block';
  }
}

async function deleteHorarioGrupo() {
  if (!await confirmar('¿Eliminar el horario de este grupo?')) return;
  const key = `${_horarioContext.nivel}-${_horarioContext.grupo}`;
  delete _horarioData[key];
  renderHorarioDisplay();
}

function openHorarioLightbox() {
  const key = `${_horarioContext.nivel}-${_horarioContext.grupo}`;
  const horario = _horarioData[key];
  if (!horario || !horario.src) return;
  document.getElementById('horarioLightboxImg').src = horario.src;
  document.getElementById('horarioLightbox').style.display = 'flex';
}

function closeHorarioLightbox() {
  document.getElementById('horarioLightbox').style.display = 'none';
}

function printHorario() {
  const key = `${_horarioContext.nivel}-${_horarioContext.grupo}`;
  const horario = _horarioData[key];
  if (!horario || !horario.src) { showToast('⚠ No hay horario para imprimir'); return; }
  const nivel = _horarioContext.nivel;
  const grupo = _horarioContext.grupo;
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Horario ${nivel} ${grupo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; }
  .header { padding:8mm 10mm 4mm; border-bottom:2px solid #1a3a6b; display:flex; justify-content:space-between; align-items:center; }
  .header-title { font-size:13pt; font-weight:bold; color:#1a3a6b; }
  .header-sub { font-size:10pt; color:#555; }
  .img-wrap { padding:6mm 10mm; text-align:center; }
  img { max-width:100%; max-height:240mm; object-fit:contain; }
  @media print { @page { margin:0; size:A4; } body { -webkit-print-color-adjust:exact; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-title">🗓️ Horario del grupo</div>
      <div class="header-sub">${nivel} ${grupo} — ${iesName.replace(/</g,'&lt;')}</div>
    </div>
  </div>
  <div class="img-wrap">
    <img src="${horario.src}" alt="Horario ${nivel} ${grupo}">
  </div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}

// ===================== OBSERVACIONES DEL GRUPO =====================
if (!window._obsGrupoData) window._obsGrupoData = {};  // key -> string
let _obsContext = { nivel: '', grupo: '' };

function openObservacionesGrupo(nivel, grupo) {
  _obsContext = { nivel, grupo };
  const key = `${nivel}-${grupo}`;
  document.getElementById('obsTitulo').textContent = `Observaciones del grupo — ${nivel} ${grupo}`;
  const ta = document.getElementById('obsGrupoTextarea');
  ta.value = (window._obsGrupoData[key] || '');
  updateObsCharCount();
  ta.oninput = updateObsCharCount;
  document.getElementById('obsGrupoOverlay').style.display = 'flex';
  setTimeout(() => ta.focus(), 80);
}

function updateObsCharCount() {
  const ta = document.getElementById('obsGrupoTextarea');
  const count = ta ? ta.value.length : 0;
  const el = document.getElementById('obsCharCount');
  if (el) el.textContent = `${count} caracter${count !== 1 ? 'es' : ''}`;
}

function saveObservacionesGrupo() {
  const key = `${_obsContext.nivel}-${_obsContext.grupo}`;
  const ta = document.getElementById('obsGrupoTextarea');
  const text = ta ? ta.value.trim() : '';
  if (text) {
    window._obsGrupoData[key] = text;
  } else {
    delete window._obsGrupoData[key];
  }
  markDirty();
  closeObservacionesGrupo();
  // Update button indicator
  updateObsBtn(_obsContext.nivel, _obsContext.grupo);
  showToast(text ? '✅ Observaciones guardadas' : '🗑 Observaciones eliminadas');
}

function printObservacionesGrupo() {
  const key = `${_obsContext.nivel}-${_obsContext.grupo}`;
  const nivel   = _obsContext.nivel;
  const grupo   = _obsContext.grupo;
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const tutor   = tutores[key] || '—';
  const dateStr = new Date().toLocaleDateString('es-ES', {year:'numeric', month:'long', day:'numeric'});

  // Use textarea current content (unsaved changes included)
  const ta = document.getElementById('obsGrupoTextarea');
  const texto = (ta ? ta.value.trim() : '') || (window._obsGrupoData[key] || '');

  if (!texto) {
    showToast('ℹ No hay observaciones para imprimir');
    return;
  }

  // Escape and convert line breaks to <br>
  const textoHtml = texto
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');

  const alumnos  = (GRUPOS_POR_NIVEL[nivel] || []).flatMap(g => g === grupo ? (data[nivel]?.[g] || []) : []);
  const total    = alumnos.length;
  const nese     = alumnos.filter(a => a.nese === 'Sí').length;
  const rep      = alumnos.filter(a => a.repetidor === 'Sí').length;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Observaciones ${nivel} ${grupo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; }
  .page { padding: 14mm 16mm; }
  .header { border-bottom: 2.5px solid #1a3a6b; margin-bottom: 18px; padding-bottom: 12px; }
  .title  { font-size: 15pt; font-weight: bold; color: #1a3a6b; margin-bottom: 3px; }
  .sub    { font-size: 11pt; color: #1a6b3a; font-weight: bold; margin-bottom: 8px; }
  .meta   { display: flex; gap: 20px; font-size: 9.5pt; color: #555; flex-wrap: wrap; }
  .info-row {
    display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 18px;
  }
  .info-pill {
    padding: 3px 12px; border-radius: 14px; font-size: 9.5pt; font-weight: bold;
    background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;
  }
  .obs-box {
    border: 1.5px solid #c5d8ef; border-radius: 6px;
    padding: 14px 18px; background: #f8faff;
    font-size: 11pt; line-height: 1.7; color: #111;
    min-height: 120px; white-space: pre-wrap;
  }
  .obs-label {
    font-size: 9pt; font-weight: bold; color: #1a3a6b;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .sign-area {
    margin-top: 40px; display: flex; justify-content: space-between; gap: 20px;
  }
  .sign-block { flex: 1; }
  .sign-line { border-bottom: 1.5px solid #555; height: 28px; margin-bottom: 4px; }
  .sign-label { font-size: 9pt; color: #666; }
  @media print {
    @page { margin: 12mm; size: A4; }
    body { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="title">📝 Observaciones del Grupo</div>
    <div class="sub">${nivel} — Grupo ${grupo}</div>
    <div class="meta">
      <span>🏫 ${iesName.replace(/</g,'&lt;')}</span>
      <span>👤 Tutor/a: ${tutor.replace(/</g,'&lt;')}</span>
      <span>📅 ${dateStr}</span>
    </div>
  </div>

  <div class="info-row">
    <span class="info-pill">👥 ${total} alumnos</span>
    ${nese > 0 ? `<span class="info-pill" style="background:#f5f3ff;color:#5b21b6;border-color:#c4b5fd;">NESE: ${nese}</span>` : ''}
    ${rep  > 0 ? `<span class="info-pill" style="background:#fff7ed;color:#c2410c;border-color:#fed7aa;">Repetidores: ${rep}</span>`  : ''}
  </div>

  <div class="obs-label">Observaciones generales</div>
  <div class="obs-box">${textoHtml}</div>

  <div class="sign-area">
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-label">Tutor/a del grupo</div>
    </div>
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-label">Jefe/a de Estudios</div>
    </div>
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-label">Fecha</div>
    </div>
  </div>
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}

function closeObservacionesGrupo() {
  document.getElementById('obsGrupoOverlay').style.display = 'none';
}

function updateObsBtn(nivel, grupo) {
  // Re-render is handled on next updateTable call; nothing to do inline
}

// Close on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('obsGrupoOverlay');
  if (ov) ov.addEventListener('click', e => { if (e.target === ov) closeObservacionesGrupo(); });
  const hov = document.getElementById('horarioOverlay');
  if (hov) hov.addEventListener('click', e => { if (e.target === hov) closeHorarioGrupo(); });
});
