/* ============================================================================
   Gestor de Tutoría · Acciones sobre el alumnado, NESE, PAP y enriquecimiento curricular
   tutoria/js/04-acciones-nese-pap.js
   ============================================================================ */

// ===================== ACTIONS =====================
function selectNivel(nivel) {
  currentNivel = nivel;
  renderAll();
}

function selectGrupo(grupo) {
  currentGrupos[currentNivel] = grupo;
  _searchQuery = '';
  renderMain();
}

// Fields that require a full table re-render (row color, badges, trend arrows, etc.)
const _VISUAL_FIELDS = new Set([
  'promociona','propuesta2','propuesta3','eval1','eval2','eval3','evalExtr',
  'repetidor','nese','compensatoria','codComp','lenguaBase','pendientesIII','pendientesExtr',
  'fecha'
]);
let _tableDebounce = {};

// ── recursoNese: normalize old string → array, toggle a code ──
function _getNeseCodes(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // Legacy: single string like 'AL' or 'PT'
  return val.trim() ? [val.trim()] : [];
}

function _toggleNeseCode(nivel, grupo, idx, code) {
  const alumno = data[nivel][grupo][idx];
  const current = _getNeseCodes(alumno.recursoNese);
  if (current.includes(code)) {
    alumno.recursoNese = current.filter(c => c !== code);
  } else {
    alumno.recursoNese = [...current, code].sort(); // AL before PT
  }
  markDirty();
  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
}

// ── PAP / EC: marca si el alumno NESE tiene (o no) cada medida asignada.
// Independiente de recursoNese (AL/PT), y de si el documento ya se ha
// rellenado (eso lo indica el punto verde de a.pap._touched / a.ac._touched).
function _toggleMedidaExtra(nivel, grupo, idx, campo) {
  const alumno = data[nivel][grupo][idx];
  alumno[campo] = !alumno[campo];
  markDirty();
  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
}

function updateField(nivel, grupo, idx, field, value) {
  data[nivel][grupo][idx][field] = value;
  // Si el alumno deja de estar marcado como NESE (nese distinto de 'Sí'),
  // las medidas PAP / EC dejan de tener sentido y se desactivan. Así, si
  // el error se corrige y el alumno se vuelve a marcar NESE más adelante
  // (por otro motivo), PAP y EC no reaparecen ya "activados" sin que el
  // usuario lo pida. No se borra el contenido ya redactado en a.pap / a.ac
  // por si hiciera falta recuperarlo.
  if (field === 'nese' && value !== 'Sí') {
    const alumno = data[nivel][grupo][idx];
    alumno.papActivo = false;
    alumno.ecActivo = false;
  }
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  // Update section meta count
  const key = `${nivel}-${grupo}`;
  const tw = document.getElementById(`table-${key}`);
  if (tw) {
    const sh = tw.parentElement;
    if (sh) {
      const meta = sh.querySelector('.section-meta');
      if (meta) meta.textContent = `${data[nivel][grupo].length} alumno${data[nivel][grupo].length===1?'':'s'} registrado${data[nivel][grupo].length===1?'':'s'}`;
    }
  }
  // Re-render table rows for visual fields (row color, badges, trend)
  if (_VISUAL_FIELDS.has(field)) {
    clearTimeout(_tableDebounce[key]);
    _tableDebounce[key] = setTimeout(() => updateTable(nivel, grupo), 80);
  }
  // Refresh nivel tabs progress badges
  renderNivelTabs();
  // Refresh grupo tab progress bar in real-time
  updateTabProgress(nivel, grupo);
  // If Inicio tab is active, refresh it
  if (currentNivel === '__home__') {
    clearTimeout(_resumenDebounce);
    _resumenDebounce = setTimeout(renderResumen, 400);
  }
}

/* =====================================================================
   PAP — Pla d'Actuació Personalitzat / Plan de Actuación Personalizado
   (Document 7, Conselleria d'Educació, Cultura i Esport — Generalitat
   Valenciana). Un PAP por alumno/a NESE, guardado en alumno.pap.
   ===================================================================== */
const PAP_MEDIDAS = [
  { key:'accesibilidad',    label:"Accesibilidad personalizada con medios específicos o singulares" },
  { key:'altasCapacidades', label:"Enriquecimiento curricular para el alumnado con altas capacidades" },
  { key:'acis',             label:"Adaptación curricular individual significativa (ACIS)" },
  { key:'comunicacion',     label:"Programa personalizado para la adquisición y uso funcional de la comunicación, el lenguaje y el habla" },
  { key:'lectoescritura',   label:"Programa personalizado para el aprendizaje de la lectura y la escritura" },
  { key:'matematicas',      label:"Programa personalizado para el aprendizaje de las matemáticas" },
  { key:'autonomia',        label:"Programa personalizado para el desarrollo de la autonomía personal" },
  { key:'motorMovilidad',   label:"Programa personalizado para el aprendizaje motor y la movilidad" },
  { key:'violencia',        label:"Programa de acompañamiento ante supuestos de violencia y desprotección" },
  { key:'conducta',         label:"Programa específico de conducta o plan terapéutico" },
  { key:'itinerarioFP',     label:"Itinerario formativo personalizado para el alumnado con NEE en Formación Profesional" },
];
function papDefault() {
  const medidas = {};
  PAP_MEDIDAS.forEach(m => medidas[m.key] = { on:false, personal:'', intensidad:'' });
  return {
    _touched:false,
    cursoEscolar:'', fechaInicio:'', centroCodigo:'', centroNombre:'', centroLocalidad:'', nia:'', nivelDoc:'', cursoEscolarAlumno:'',
    tutor:'', profesorado:'', orientacion:'', especializadoApoyo:'', noDocenteApoyo:'', familiares:'', agentesExternos:'',
    infoRelevante:'',
    medidas,
    otrasMedidas:'', actuacionFamiliar:'', actuacionSocial:'', orientacionesItinerario:'', actuacionesTransicion:'',
    tareasApoyo:[{personal:'',tareas:''}],
    horarioNota:'',
    coordInternas:'', coordExternas:'',
    seguimiento:[{medida:'',t1:'',t2:'',t3:'',propuesta:''}],
    progresoGlobal:'', propuestaNuevasMedidas:'',
    firmaNombre:'', firmaComo:'',
  };
}
function _papAlumno(nivel,grupo,idx){ return data[nivel][grupo][idx]; }
window.openPapModal = function(nivel, grupo, idx) {
  const a = _papAlumno(nivel,grupo,idx);
  if (!a.pap) a.pap = papDefault();
  document.getElementById('papModalBox').innerHTML = renderPapFormHTML(nivel, grupo, idx, a);
  document.getElementById('papOverlay').classList.add('open');
};
window.closePapModal = function() {
  document.getElementById('papOverlay').classList.remove('open');
};
window.savePapField = function(nivel, grupo, idx, field, value) {
  const a = _papAlumno(nivel,grupo,idx);
  a.pap[field] = value; a.pap._touched = true;
  markDirty();
};
window.papToggleMedida = function(nivel, grupo, idx, key, checked) {
  const a = _papAlumno(nivel,grupo,idx);
  a.pap.medidas[key].on = checked; a.pap._touched = true;
  markDirty();
};
window.papSetMedidaCampo = function(nivel, grupo, idx, key, campo, value) {
  const a = _papAlumno(nivel,grupo,idx);
  a.pap.medidas[key][campo] = value; a.pap._touched = true;
  markDirty();
};
window.papAddFila = function(nivel, grupo, idx, arrKey, plantilla) {
  const a = _papAlumno(nivel,grupo,idx);
  a.pap[arrKey].push({...plantilla}); a.pap._touched = true;
  markDirty();
  document.getElementById('papModalBox').innerHTML = renderPapFormHTML(nivel, grupo, idx, a);
};
window.papDelFila = function(nivel, grupo, idx, arrKey, rowIdx) {
  const a = _papAlumno(nivel,grupo,idx);
  a.pap[arrKey].splice(rowIdx,1);
  if(!a.pap[arrKey].length) a.pap[arrKey].push(arrKey==='tareasApoyo'?{personal:'',tareas:''}:{medida:'',t1:'',t2:'',t3:'',propuesta:''});
  a.pap._touched = true; markDirty();
  document.getElementById('papModalBox').innerHTML = renderPapFormHTML(nivel, grupo, idx, a);
};
window.papSetFilaCampo = function(nivel, grupo, idx, arrKey, rowIdx, campo, value) {
  const a = _papAlumno(nivel,grupo,idx);
  a.pap[arrKey][rowIdx][campo] = value; a.pap._touched = true;
  markDirty();
};

function renderPapFormHTML(nivel, grupo, idx, a) {
  const p = a.pap;
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const F = (id,label,value,type) => `<div class="pap-field"><label>${label}</label><input type="${type||'text'}" id="${id}" value="${esc(value)}" onchange="savePapField('${nivel}','${grupo}',${idx},'${id.split('_').slice(1).join('_')}',this.value)"></div>`;
  const T = (id,label,value) => `<div class="pap-field"><label>${label}</label><textarea id="${id}" onchange="savePapField('${nivel}','${grupo}',${idx},'${id.split('_').slice(1).join('_')}',this.value)">${esc(value)}</textarea></div>`;

  const medidasRows = PAP_MEDIDAS.map(m => {
    const md = p.medidas[m.key];
    return `<div class="pap-check-row">
      <input type="checkbox" ${md.on?'checked':''} onchange="papToggleMedida('${nivel}','${grupo}',${idx},'${m.key}',this.checked)">
      <span class="pap-check-label">${m.label}</span>
      <input type="text" placeholder="Personal de apoyo" value="${esc(md.personal)}" onchange="papSetMedidaCampo('${nivel}','${grupo}',${idx},'${m.key}','personal',this.value)">
      <select onchange="papSetMedidaCampo('${nivel}','${grupo}',${idx},'${m.key}','intensidad',this.value)">
        <option value="" ${!md.intensidad?'selected':''}>Intensidad —</option>
        <option value="Bajo" ${md.intensidad==='Bajo'?'selected':''}>Bajo</option>
        <option value="Medio" ${md.intensidad==='Medio'?'selected':''}>Medio</option>
        <option value="Alto" ${md.intensidad==='Alto'?'selected':''}>Alto</option>
      </select>
    </div>`;
  }).join('');

  const tareasRows = p.tareasApoyo.map((t,ri) => `<tr>
    <td><input value="${esc(t.personal)}" placeholder="Personal de apoyo" onchange="papSetFilaCampo('${nivel}','${grupo}',${idx},'tareasApoyo',${ri},'personal',this.value)"></td>
    <td><input value="${esc(t.tareas)}" placeholder="Tareas" onchange="papSetFilaCampo('${nivel}','${grupo}',${idx},'tareasApoyo',${ri},'tareas',this.value)"></td>
    <td><button class="pap-dyn-del" onclick="papDelFila('${nivel}','${grupo}',${idx},'tareasApoyo',${ri})">✕</button></td>
  </tr>`).join('');

  const seguimientoRows = p.seguimiento.map((s,ri) => `<tr>
    <td><input value="${esc(s.medida)}" placeholder="Medida de respuesta" onchange="papSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'medida',this.value)"></td>
    <td><input value="${esc(s.t1)}" placeholder="1r trim." onchange="papSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'t1',this.value)"></td>
    <td><input value="${esc(s.t2)}" placeholder="2n trim." onchange="papSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'t2',this.value)"></td>
    <td><input value="${esc(s.t3)}" placeholder="3r trim." onchange="papSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'t3',this.value)"></td>
    <td><input value="${esc(s.propuesta)}" placeholder="Propuesta curso siguiente" onchange="papSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'propuesta',this.value)"></td>
    <td><button class="pap-dyn-del" onclick="papDelFila('${nivel}','${grupo}',${idx},'seguimiento',${ri})">✕</button></td>
  </tr>`).join('');

  return `
    <div class="modal-title" style="display:flex;justify-content:space-between;align-items:center">
      <span>📋 PAP — ${esc(a.nombre)}</span>
      <button class="btn btn-ghost btn-sm" onclick="closePapModal()">✕ Cerrar</button>
    </div>
    <div class="pap-modal-body">

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">A</span><span class="pap-section-title">Datos de identificación</span></div>
        <div class="pap-section-body">
          <div class="pap-grid2">
            <div class="pap-field"><label>Curso escolar</label><input id="pap_cursoEscolar" value="${esc(p.cursoEscolar)}" placeholder="2026-2027" onchange="savePapField('${nivel}','${grupo}',${idx},'cursoEscolar',this.value)"></div>
            <div class="pap-field"><label>Fecha de inicio</label><input type="date" id="pap_fechaInicio" value="${esc(p.fechaInicio)}" onchange="savePapField('${nivel}','${grupo}',${idx},'fechaInicio',this.value)"></div>
          </div>
          <div class="pap-grid3">
            <div class="pap-field"><label>Código de centro</label><input id="pap_centroCodigo" value="${esc(p.centroCodigo)}" onchange="savePapField('${nivel}','${grupo}',${idx},'centroCodigo',this.value)"></div>
            <div class="pap-field"><label>Nombre del centro</label><input id="pap_centroNombre" value="${esc(p.centroNombre)}" onchange="savePapField('${nivel}','${grupo}',${idx},'centroNombre',this.value)"></div>
            <div class="pap-field"><label>Localidad</label><input id="pap_centroLocalidad" value="${esc(p.centroLocalidad)}" onchange="savePapField('${nivel}','${grupo}',${idx},'centroLocalidad',this.value)"></div>
          </div>
          <p class="pap-hint">Apellidos, nombre y fecha de nacimiento se toman directamente de la ficha del alumno/a (${esc(a.nombre)}${a.fecha?', nacido/a el '+esc(a.fecha):''}). Grupo actual: ${esc(nivel)} ${esc(grupo)}.</p>
          <div class="pap-grid3">
            <div class="pap-field"><label>Curso escolar (del alumno/a)</label><input id="pap_cursoEscolarAlumno" value="${esc(p.cursoEscolarAlumno)}" placeholder="${esc(p.cursoEscolar)||'2026-2027'}" onchange="savePapField('${nivel}','${grupo}',${idx},'cursoEscolarAlumno',this.value)"></div>
            <div class="pap-field"><label>NIA</label><input id="pap_nia" value="${esc(p.nia)}" onchange="savePapField('${nivel}','${grupo}',${idx},'nia',this.value)"></div>
            <div class="pap-field"><label>Nivel (si difiere del grupo actual)</label><input id="pap_nivelDoc" value="${esc(p.nivelDoc)}" placeholder="${esc(nivel)}" onchange="savePapField('${nivel}','${grupo}',${idx},'nivelDoc',this.value)"></div>
          </div>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">B</span><span class="pap-section-title">Personas intervinientes</span></div>
        <div class="pap-section-body pap-grid2">
          ${F('pap_tutor','Tutora o tutor',p.tutor)}
          ${F('pap_profesorado','Profesorado',p.profesorado)}
          ${F('pap_orientacion','Profesional de orientación educativa',p.orientacion)}
          ${F('pap_especializadoApoyo','Profesorado especializado de apoyo',p.especializadoApoyo)}
          ${F('pap_noDocenteApoyo','Personal no docente de apoyo',p.noDocenteApoyo)}
          ${F('pap_familiares','Familiares',p.familiares)}
          ${F('pap_agentesExternos','Agentes externos',p.agentesExternos)}
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">C</span><span class="pap-section-title">Información relevante</span></div>
        <div class="pap-section-body">
          <p class="pap-hint">Barreras y fortalezas · necesidades educativas identificadas (NESE y NCD) · propuesta de medidas de respuesta · grado de apoyo · orientaciones para el desarrollo y evaluación de las medidas. (Disponible en el informe sociopsicopedagógico y en el módulo de inclusión de ITACA3; incluir aquí solo lo que surja de la revisión del PAP.)</p>
          ${T('pap_infoRelevante','Información relevante',p.infoRelevante)}
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">D</span><span class="pap-section-title">Medidas educativas propuestas</span></div>
        <div class="pap-section-body">
          ${medidasRows}
          <div class="pap-field" style="margin-top:12px">
            <label>Otras medidas de nivel II y III</label>
            <textarea id="pap_otrasMedidas" onchange="savePapField('${nivel}','${grupo}',${idx},'otrasMedidas',this.value)">${esc(p.otrasMedidas)}</textarea>
          </div>
          <div class="pap-grid2">
            ${T('pap_actuacionFamiliar','Actuaciones a desarrollar en el ámbito familiar',p.actuacionFamiliar)}
            ${T('pap_actuacionSocial','Actuaciones a desarrollar en el ámbito social y/o otros',p.actuacionSocial)}
          </div>
          <div class="pap-grid2">
            ${T('pap_orientacionesItinerario','Orientaciones para el itinerario formativo (si procede)',p.orientacionesItinerario)}
            ${T('pap_actuacionesTransicion','Actuaciones para la transición (si procede)',p.actuacionesTransicion)}
          </div>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">E</span><span class="pap-section-title">Tareas del personal de apoyo</span></div>
        <div class="pap-section-body">
          <table class="pap-dyn-table">
            <thead><tr><th style="width:35%">Personal de apoyo</th><th>Tareas</th><th style="width:30px"></th></tr></thead>
            <tbody>${tareasRows}</tbody>
          </table>
          <button class="pap-add-btn" onclick="papAddFila('${nivel}','${grupo}',${idx},'tareasApoyo',{personal:'',tareas:''})">+ Añadir fila</button>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">F</span><span class="pap-section-title">Horario personalizado del alumnado</span></div>
        <div class="pap-section-body">
          <p class="pap-hint">Se adjuntará el horario detallado del alumnado con todos los apoyos que recibe (documento aparte). Puedes dejar aquí una nota de referencia.</p>
          ${T('pap_horarioNota','Nota sobre el horario',p.horarioNota)}
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">G</span><span class="pap-section-title">Otra documentación adjunta</span></div>
        <div class="pap-section-body">
          <p class="pap-hint">La documentación derivada de la planificación, implementación, seguimiento y evaluación del PAP (programas específicos, adaptaciones curriculares significativas, actas, entrevistas, etc.) forma parte de este y se custodia en el expediente del alumnado.</p>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">H</span><span class="pap-section-title">Planificación de las coordinaciones</span></div>
        <div class="pap-section-body pap-grid2">
          ${T('pap_coordInternas','Coordinaciones internas',p.coordInternas)}
          ${T('pap_coordExternas','Coordinaciones externas',p.coordExternas)}
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">I</span><span class="pap-section-title">Seguimiento y evaluación</span></div>
        <div class="pap-section-body">
          <table class="pap-dyn-table">
            <thead><tr><th style="width:26%">Medida de respuesta</th><th>1r trimestre</th><th>2n trimestre</th><th>3r trimestre</th><th style="width:20%">Propuesta curso siguiente</th><th style="width:30px"></th></tr></thead>
            <tbody>${seguimientoRows}</tbody>
          </table>
          <button class="pap-add-btn" onclick="papAddFila('${nivel}','${grupo}',${idx},'seguimiento',{medida:'',t1:'',t2:'',t3:'',propuesta:''})">+ Añadir fila</button>
          <div style="margin-top:12px">${T('pap_progresoGlobal','Progreso global del alumnado',p.progresoGlobal)}</div>
          <div>${T('pap_propuestaNuevasMedidas','Propuesta de nuevas medidas y/o actuaciones para el curso siguiente',p.propuestaNuevasMedidas)}</div>
          <div class="pap-grid2">
            <div class="pap-field"><label>Nombre y apellidos (de quien cumplimenta)</label><input id="pap_firmaNombre" value="${esc(p.firmaNombre)}" onchange="savePapField('${nivel}','${grupo}',${idx},'firmaNombre',this.value)"></div>
            <div class="pap-field"><label>Como (cargo/relación)</label><input id="pap_firmaComo" value="${esc(p.firmaComo)}" onchange="savePapField('${nivel}','${grupo}',${idx},'firmaComo',this.value)"></div>
          </div>
        </div>
      </div>

    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closePapModal()">Cerrar</button>
      <button class="btn btn-ghost" onclick="exportarPapHTML('${nivel}','${grupo}',${idx})">🌐 HTML</button>
      <button class="btn btn-ghost" onclick="exportarPapWord('${nivel}','${grupo}',${idx})">📄 Word</button>
      <button class="btn btn-primary" onclick="exportarPapPDF('${nivel}','${grupo}',${idx})">🖨️ PDF</button>
    </div>
  `;
}

// _papDocBodyHTML — genera el contenido interior (sin <html>/<style>) del
// documento PAP, reutilizado por las tres exportaciones (PDF, Word y HTML).
function _papDocBodyHTML(nivel, grupo, idx) {
  const a = _papAlumno(nivel,grupo,idx);
  const p = a.pap || papDefault();
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';

  const medidasRows = PAP_MEDIDAS.filter(m => p.medidas[m.key]?.on).map(m => {
    const md = p.medidas[m.key];
    return `<tr><td>☑ ${esc(m.label)}</td><td>${esc(md.personal)||'—'}</td><td>${esc(md.intensidad)||'—'}</td></tr>`;
  }).join('') || `<tr><td colspan="3" style="color:#999;font-style:italic">Sin medidas marcadas.</td></tr>`;

  const tareasRows = p.tareasApoyo.filter(t=>t.personal||t.tareas).map(t=>`<tr><td>${esc(t.personal)}</td><td>${esc(t.tareas)}</td></tr>`).join('')
    || `<tr><td colspan="2" style="color:#999;font-style:italic">Sin tareas registradas.</td></tr>`;

  const seguimientoRows = p.seguimiento.filter(s=>s.medida||s.t1||s.t2||s.t3||s.propuesta).map(s=>
    `<tr><td>${esc(s.medida)}</td><td>${esc(s.t1)}</td><td>${esc(s.t2)}</td><td>${esc(s.t3)}</td><td>${esc(s.propuesta)}</td></tr>`
  ).join('') || `<tr><td colspan="5" style="color:#999;font-style:italic">Sin seguimiento registrado.</td></tr>`;

  return `
  <h1>Plan de Actuación Personalizado (PAP)</h1>
  <div class="subtitle">${esc(a.nombre)} · ${esc(nivel)} ${esc(grupo)} · Documento 7 · Generado el ${new Date().toLocaleDateString('es-ES')}</div>

  <h2>A · Datos de identificación</h2>
  <table class="idtable">
    <tr><th>Curso escolar</th><td>${esc(p.cursoEscolar)||'—'}</td><th>Fecha de inicio</th><td>${esc(p.fechaInicio)||'—'}</td></tr>
    <tr><th>Centro</th><td colspan="3">${esc(p.centroNombre)||'—'} ${p.centroCodigo?'(cód. '+esc(p.centroCodigo)+')':''} — ${esc(p.centroLocalidad)||'—'}</td></tr>
    <tr><th>Alumno/a</th><td colspan="3">${esc(a.nombre)}</td></tr>
    <tr><th>Fecha de nacimiento</th><td>${esc(a.fecha)||'—'}</td><th>Curso escolar (alumno/a)</th><td>${esc(p.cursoEscolarAlumno)||esc(p.cursoEscolar)||'—'}</td></tr>
    <tr><th>NIA</th><td>${esc(p.nia)||'—'}</td><th>Nivel</th><td>${esc(p.nivelDoc)||esc(nivel)}</td></tr>
  </table>

  <h2>B · Personas intervinientes</h2>
  <table class="idtable">
    <tr><th>Tutora o tutor</th><td>${esc(p.tutor)||'—'}</td></tr>
    <tr><th>Profesorado</th><td>${esc(p.profesorado)||'—'}</td></tr>
    <tr><th>Orientación educativa</th><td>${esc(p.orientacion)||'—'}</td></tr>
    <tr><th>Profesorado especializado de apoyo</th><td>${esc(p.especializadoApoyo)||'—'}</td></tr>
    <tr><th>Personal no docente de apoyo</th><td>${esc(p.noDocenteApoyo)||'—'}</td></tr>
    <tr><th>Familiares</th><td>${esc(p.familiares)||'—'}</td></tr>
    <tr><th>Agentes externos</th><td>${esc(p.agentesExternos)||'—'}</td></tr>
  </table>

  <h2>C · Información relevante</h2>
  <p class="txt">${esc(p.infoRelevante)||'—'}</p>

  <h2>D · Medidas educativas propuestas</h2>
  <table><thead><tr><th>Medida</th><th>Personal especializado de apoyo</th><th>Intensidad del apoyo</th></tr></thead><tbody>${medidasRows}</tbody></table>
  ${p.otrasMedidas?`<p><strong>Otras medidas de nivel II y III:</strong></p><p class="txt">${esc(p.otrasMedidas)}</p>`:''}
  ${p.actuacionFamiliar?`<p><strong>Actuaciones en el ámbito familiar:</strong></p><p class="txt">${esc(p.actuacionFamiliar)}</p>`:''}
  ${p.actuacionSocial?`<p><strong>Actuaciones en el ámbito social y/o otros:</strong></p><p class="txt">${esc(p.actuacionSocial)}</p>`:''}
  ${p.orientacionesItinerario?`<p><strong>Orientaciones para el itinerario formativo:</strong></p><p class="txt">${esc(p.orientacionesItinerario)}</p>`:''}
  ${p.actuacionesTransicion?`<p><strong>Actuaciones para la transición:</strong></p><p class="txt">${esc(p.actuacionesTransicion)}</p>`:''}

  <h2>E · Tareas del personal de apoyo</h2>
  <table><thead><tr><th>Personal de apoyo</th><th>Tareas</th></tr></thead><tbody>${tareasRows}</tbody></table>

  <h2>F · Horario personalizado del alumnado</h2>
  <p class="txt">${esc(p.horarioNota)||'Se adjunta el horario detallado del alumnado con todos los apoyos que recibe (documento aparte).'}</p>

  <h2>G · Otra documentación adjunta</h2>
  <p class="txt">La documentación derivada de la planificación, implementación, seguimiento y evaluación del PAP forma parte de este y se custodia en el expediente del alumnado.</p>

  <h2>H · Planificación de las coordinaciones</h2>
  ${p.coordInternas?`<p><strong>Internas:</strong></p><p class="txt">${esc(p.coordInternas)}</p>`:''}
  ${p.coordExternas?`<p><strong>Externas:</strong></p><p class="txt">${esc(p.coordExternas)}</p>`:''}
  ${(!p.coordInternas && !p.coordExternas)?'<p class="txt">—</p>':''}

  <h2>I · Seguimiento y evaluación</h2>
  <table><thead><tr><th>Medida de respuesta</th><th>1r trimestre</th><th>2n trimestre</th><th>3r trimestre</th><th>Propuesta curso siguiente</th></tr></thead><tbody>${seguimientoRows}</tbody></table>
  ${p.progresoGlobal?`<p><strong>Progreso global del alumnado:</strong></p><p class="txt">${esc(p.progresoGlobal)}</p>`:''}
  ${p.propuestaNuevasMedidas?`<p><strong>Propuesta de nuevas medidas para el curso siguiente:</strong></p><p class="txt">${esc(p.propuestaNuevasMedidas)}</p>`:''}

  <div class="firma">
    <div>${esc(p.firmaNombre)||'Nombre y apellidos'}<br>${esc(p.firmaComo)||'Como'}</div>
    <div>Firma</div>
  </div>
  <p style="font-size:8pt;color:#999;margin-top:16px">Datos personales tratados conforme al Reglamento (UE) 2016/679 y la Ley Orgánica 3/2018, en cumplimiento de la Ley 26/2018 de la Generalitat y la Orden 20/2019 de medidas de respuesta a la inclusión. Tratamiento confidencial; puede ejercer sus derechos de acceso, rectificación, cancelación y oposición según el aviso legal de la Conselleria d'Educació, Cultura i Esport.</p>

  <div class="footer">
    <span>Gestor de Tutoría — ${esc(iesName)}</span>
    <span>Documento 7 · PAP</span>
  </div>`;
}

// _docCss — hoja de estilos compartida por los documentos imprimibles /
// exportables de PAP y AC (misma maquetación en PDF, Word y HTML).
function _docCss() {
  return `
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; margin: 12mm 14mm; }
    h1 { font-size: 16pt; color: #4c2f9e; margin: 0 0 2px; }
    .subtitle { font-size: 9.5pt; color: #555; margin-bottom: 14px; }
    h2 { font-size: 11pt; color: #fff; background: #4c2f9e; padding: 5px 10px; border-radius: 4px; margin: 18px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; font-size: 9pt; vertical-align: top; }
    th { background: #f3f0fb; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.3px; }
    .idtable td { border: none; padding: 3px 8px 3px 0; }
    .idtable th { border: none; background: none; color: #666; font-weight: 600; width: 160px; text-transform: none; letter-spacing: 0; font-size: 9pt; }
    p.txt { white-space: pre-wrap; line-height: 1.5; margin: 4px 0 10px; }
    .footer { margin-top: 26px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 8.5pt; color: #888; display: flex; justify-content: space-between; }
    .firma { display:flex; gap:40px; margin-top:30px; }
    .firma div { flex:1; border-top:1px solid #999; padding-top:6px; font-size:9pt; color:#555; }
    @media print { body{margin:10mm 12mm} }
  `;
}

// _wrapPrintHTML / _wrapWordHTML / _wrapPlainHTML — envuelven un fragmento de
// cuerpo (de _papDocBodyHTML o _acDocBodyHTML) en un documento HTML completo,
// listo para imprimir/PDF, exportar a Word (.doc) o exportar a HTML.
function _wrapPrintHTML(titleText, bodyHtml) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <title>${titleText}</title>
  <style>${_docCss()}</style></head><body>
  ${bodyHtml}
  <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`;
}
function _wrapWordHTML(titleText, bodyHtml) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${titleText}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 { size: 21cm 29.7cm; margin: 1.2cm 1.4cm 1.8cm 1.4cm; mso-header-margin: .5cm; mso-footer-margin: .5cm; mso-paper-source: 0; }
  div.Section1 { page: Section1; }
  table { border-collapse: collapse; }
  ${_docCss()}
</style>
</head>
<body>
  <div class="Section1">${bodyHtml}</div>
</body>
</html>`;
}
function _wrapPlainHTML(titleText, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titleText}</title>
<style>${_docCss()}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
function _exportFilename(prefix, nombre, ext) {
  return `${prefix}_${String(nombre||'alumno').replace(/[^a-zA-Z0-9ÁÉÍÓÚÑÜáéíóúñü]+/g,'_').replace(/^_+|_+$/g,'')}.${ext}`;
}

// ── Exportación del PAP: PDF (impresión), Word y HTML ──────────────────
function exportarPapPDF(nivel, grupo, idx) {
  const a = _papAlumno(nivel,grupo,idx);
  const html = _wrapPrintHTML(`PAP — ${a.nombre}`, _papDocBodyHTML(nivel,grupo,idx));
  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}
function exportarPapWord(nivel, grupo, idx) {
  const a = _papAlumno(nivel,grupo,idx);
  const html = _wrapWordHTML(`PAP — ${a.nombre}`, _papDocBodyHTML(nivel,grupo,idx));
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  triggerDownload(blob, _exportFilename('PAP', a.nombre, 'doc'));
  showToast('📄 Word generado — ábrelo con Microsoft Word o LibreOffice');
}
function exportarPapHTML(nivel, grupo, idx) {
  const a = _papAlumno(nivel,grupo,idx);
  const html = _wrapPlainHTML(`PAP — ${a.nombre}`, _papDocBodyHTML(nivel,grupo,idx));
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, _exportFilename('PAP', a.nombre, 'html'));
  showToast('🌐 HTML exportado — conserva la maquetación exacta');
}

/* =====================================================================
   AC — Programa d'Enriquiment / Programa de Enriquecimiento Curricular
   (Altas Capacidades). Un programa por alumno/a NESE, guardado en
   alumno.ac. Mismo diseño y comportamiento que el PAP (modal, campos
   autoguardados, exportación a PDF/Word/HTML).
   ===================================================================== */
const AC_ESTRATEGIAS = [
  { key:'colaboracion',           label:"Colaboración, trabajo entre iguales" },
  { key:'abrirAula',              label:"«Abrir el aula» a recursos externos" },
  { key:'experienciasSignif',     label:"Experiencias personalmente significativas" },
  { key:'actividadesAbiertas',    label:"Actividades abiertas y creativas" },
  { key:'evalCriterios',          label:"Evaluaciones basadas en criterios" },
  { key:'metodologiasActivas',    label:"Metodologías activas (Visual Thinking, Flipped Classroom…)" },
  { key:'aprendProyectos',        label:"Aprendizaje basado en proyectos" },
  { key:'gamificacion',           label:"Gamificación" },
  { key:'aprendInvestigacion',    label:"Aprendizaje basado en investigación" },
  { key:'aprendColaborativo',     label:"Aprendizaje colaborativo" },
  { key:'unidadesIntegradas',     label:"Unidades integradas" },
  { key:'contextosFormales',      label:"Contextos formales e informales" },
  { key:'entornosPersonales',     label:"Entornos personales de aprendizaje" },
  { key:'proyectosColaborativos', label:"Proyectos colaborativos, interniveles y abiertos" },
  { key:'metacognicion',          label:"Metacognición" },
  { key:'aprendEmergentes',       label:"Aparición de aprendizajes emergentes" },
  { key:'problemasRetos',         label:"Aprendizaje basado en problemas y retos" },
  { key:'aprendServicio',         label:"Aprendizaje basado en servicio" },
  { key:'comunidadesAprendizaje', label:"Comunidades de aprendizaje" },
  { key:'portfolio',              label:"Portfolio" },
  { key:'aprendCooperativo',      label:"Aprendizaje cooperativo" },
  { key:'ambientesRincones',      label:"Ambientes y rincones" },
];
function acDefault() {
  const estrategias = {};
  AC_ESTRATEGIAS.forEach(e => estrategias[e.key] = false);
  return {
    _touched:false,
    cursoEscolar:'', fechaInicio:'', centroCodigo:'', centroNombre:'', centroLocalidad:'', nia:'', nivelDoc:'',
    fechaInformeSociopsico:'', fechaInformeMedidas:'',
    enriquecimientoMaterias:{}, // { 'Nombre materia': 'horizontal' | 'vertical' }
    areaMateriaAmbito:'', // observaciones adicionales sobre el ámbito / conexiones concretas
    estrategias, otrasEstrategias:'',
    tareasAgentes:[{agente:'',tareas:''}],
    horarioNota:'',
    coordinaciones:'',
    seguimiento:[{medida:'',t1:'',t2:'',t3:''}],
    progresoGlobal:'', propuestaNuevasMedidas:'',
    firmaNombre:'', firmaComo:'',
  };
}
function _acAlumno(nivel,grupo,idx){ return data[nivel][grupo][idx]; }
window.openAcModal = function(nivel, grupo, idx) {
  const a = _acAlumno(nivel,grupo,idx);
  if (!a.ac) a.ac = acDefault();
  if (!a.ac.enriquecimientoMaterias) a.ac.enriquecimientoMaterias = {}; // compat. EC guardados antes de este campo
  document.getElementById('acModalBox').innerHTML = renderAcFormHTML(nivel, grupo, idx, a);
  document.getElementById('acOverlay').classList.add('open');
};
window.closeAcModal = function() {
  document.getElementById('acOverlay').classList.remove('open');
};
window.saveAcField = function(nivel, grupo, idx, field, value) {
  const a = _acAlumno(nivel,grupo,idx);
  a.ac[field] = value; a.ac._touched = true;
  markDirty();
};
window.acToggleEstrategia = function(nivel, grupo, idx, key, checked) {
  const a = _acAlumno(nivel,grupo,idx);
  a.ac.estrategias[key] = checked; a.ac._touched = true;
  markDirty();
};
// mi = índice de la materia dentro de getMateriasParaNivel(nivel,grupo) (evita problemas
// de escapado de comillas con nombres de materia dentro del atributo onchange).
window.acSetEnriquecimiento = function(nivel, grupo, idx, mi, tipo) {
  const a = _acAlumno(nivel,grupo,idx);
  const materia = getMateriasParaNivel(nivel, grupo)[mi];
  if (!materia) return;
  if (!a.ac.enriquecimientoMaterias) a.ac.enriquecimientoMaterias = {};
  if (tipo) a.ac.enriquecimientoMaterias[materia] = tipo;
  else delete a.ac.enriquecimientoMaterias[materia];
  a.ac._touched = true;
  markDirty();
  document.getElementById('acModalBox').innerHTML = renderAcFormHTML(nivel, grupo, idx, a);
};
window.acAddFila = function(nivel, grupo, idx, arrKey, plantilla) {
  const a = _acAlumno(nivel,grupo,idx);
  a.ac[arrKey].push({...plantilla}); a.ac._touched = true;
  markDirty();
  document.getElementById('acModalBox').innerHTML = renderAcFormHTML(nivel, grupo, idx, a);
};
window.acDelFila = function(nivel, grupo, idx, arrKey, rowIdx) {
  const a = _acAlumno(nivel,grupo,idx);
  a.ac[arrKey].splice(rowIdx,1);
  if(!a.ac[arrKey].length) a.ac[arrKey].push(arrKey==='tareasAgentes'?{agente:'',tareas:''}:{medida:'',t1:'',t2:'',t3:''});
  a.ac._touched = true; markDirty();
  document.getElementById('acModalBox').innerHTML = renderAcFormHTML(nivel, grupo, idx, a);
};
window.acSetFilaCampo = function(nivel, grupo, idx, arrKey, rowIdx, campo, value) {
  const a = _acAlumno(nivel,grupo,idx);
  a.ac[arrKey][rowIdx][campo] = value; a.ac._touched = true;
  markDirty();
};

// Tabla de materias del curso del alumno/a con selector de tipo de enriquecimiento.
// Reutiliza el catálogo de materias por nivel/grupo ya existente en la app (⚙ Materias),
// de modo que la lista siempre coincide con lo que realmente se imparte en su curso.
function renderAcEnriquecimientoTabla(nivel, grupo, idx, p) {
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const materiasNivel = getMateriasParaNivel(nivel, grupo);
  const enr = p.enriquecimientoMaterias || (p.enriquecimientoMaterias = {});

  if (!materiasNivel.length) {
    return `<p class="pap-hint" style="color:var(--yellow)">No hay materias configuradas para ${esc(nivel)}${grupo?' '+esc(grupo):''}. Puedes añadirlas desde la pestaña ⚙ Materias.</p>`;
  }

  const rows = materiasNivel.map((m, mi) => {
    const tipo = enr[m] || '';
    const rowBg = tipo === 'horizontal' ? 'background:rgba(79,142,247,0.08);'
                : tipo === 'vertical'   ? 'background:rgba(124,92,252,0.08);' : '';
    return `<tr style="${rowBg}">
      <td class="ac-enr-materia">${esc(m)}</td>
      <td>
        <select onchange="acSetEnriquecimiento('${nivel}','${grupo}',${idx},${mi},this.value)">
          <option value="" ${tipo===''?'selected':''}>— Sin enriquecimiento —</option>
          <option value="horizontal" ${tipo==='horizontal'?'selected':''}>Enriquecimiento horizontal</option>
          <option value="vertical" ${tipo==='vertical'?'selected':''}>Enriquecimiento vertical</option>
        </select>
      </td>
    </tr>`;
  }).join('');

  return `
    <table class="ac-enr-table">
      <thead><tr><th>Materia</th><th style="width:230px">Tipo de enriquecimiento</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderAcFormHTML(nivel, grupo, idx, a) {
  const p = a.ac;
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const F = (id,label,value,type) => `<div class="pap-field"><label>${label}</label><input type="${type||'text'}" id="${id}" value="${esc(value)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'${id.split('_').slice(1).join('_')}',this.value)"></div>`;
  const T = (id,label,value) => `<div class="pap-field"><label>${label}</label><textarea id="${id}" onchange="saveAcField('${nivel}','${grupo}',${idx},'${id.split('_').slice(1).join('_')}',this.value)">${esc(value)}</textarea></div>`;

  const estrategiasRows = AC_ESTRATEGIAS.map(e => {
    const on = !!p.estrategias[e.key];
    return `<label class="ac-check-row">
      <input type="checkbox" ${on?'checked':''} onchange="acToggleEstrategia('${nivel}','${grupo}',${idx},'${e.key}',this.checked)">
      <span class="ac-check-label">${e.label}</span>
    </label>`;
  }).join('');

  const tareasRows = p.tareasAgentes.map((t,ri) => `<tr>
    <td><input value="${esc(t.agente)}" placeholder="Agente" onchange="acSetFilaCampo('${nivel}','${grupo}',${idx},'tareasAgentes',${ri},'agente',this.value)"></td>
    <td><input value="${esc(t.tareas)}" placeholder="Tareas" onchange="acSetFilaCampo('${nivel}','${grupo}',${idx},'tareasAgentes',${ri},'tareas',this.value)"></td>
    <td><button class="pap-dyn-del" onclick="acDelFila('${nivel}','${grupo}',${idx},'tareasAgentes',${ri})">✕</button></td>
  </tr>`).join('');

  const seguimientoRows = p.seguimiento.map((s,ri) => `<tr>
    <td><input value="${esc(s.medida)}" placeholder="Medida" onchange="acSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'medida',this.value)"></td>
    <td><input value="${esc(s.t1)}" placeholder="1r trim." onchange="acSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'t1',this.value)"></td>
    <td><input value="${esc(s.t2)}" placeholder="2n trim." onchange="acSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'t2',this.value)"></td>
    <td><input value="${esc(s.t3)}" placeholder="3r trim." onchange="acSetFilaCampo('${nivel}','${grupo}',${idx},'seguimiento',${ri},'t3',this.value)"></td>
    <td><button class="pap-dyn-del" onclick="acDelFila('${nivel}','${grupo}',${idx},'seguimiento',${ri})">✕</button></td>
  </tr>`).join('');

  return `
    <div class="modal-title" style="display:flex;justify-content:space-between;align-items:center">
      <span>🎓 Programa de Enriquecimiento Curricular — ${esc(a.nombre)}</span>
      <button class="btn btn-ghost btn-sm" onclick="closeAcModal()">✕ Cerrar</button>
    </div>
    <div class="pap-modal-body">

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">A</span><span class="pap-section-title">Datos de identificación</span></div>
        <div class="pap-section-body">
          <div class="pap-grid2">
            <div class="pap-field"><label>Curso escolar</label><input id="ac_cursoEscolar" value="${esc(p.cursoEscolar)}" placeholder="2026-2027" onchange="saveAcField('${nivel}','${grupo}',${idx},'cursoEscolar',this.value)"></div>
            <div class="pap-field"><label>Fecha de inicio</label><input type="date" id="ac_fechaInicio" value="${esc(p.fechaInicio)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'fechaInicio',this.value)"></div>
          </div>
          <div class="pap-grid3">
            <div class="pap-field"><label>Código de centro</label><input id="ac_centroCodigo" value="${esc(p.centroCodigo)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'centroCodigo',this.value)"></div>
            <div class="pap-field"><label>Nombre del centro</label><input id="ac_centroNombre" value="${esc(p.centroNombre)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'centroNombre',this.value)"></div>
            <div class="pap-field"><label>Localidad</label><input id="ac_centroLocalidad" value="${esc(p.centroLocalidad)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'centroLocalidad',this.value)"></div>
          </div>
          <p class="pap-hint">Apellidos, nombre y fecha de nacimiento se toman directamente de la ficha del alumno/a (${esc(a.nombre)}${a.fecha?', nacido/a el '+esc(a.fecha):''}). Grupo actual: ${esc(nivel)} ${esc(grupo)}.</p>
          <div class="pap-grid2">
            <div class="pap-field"><label>NIA</label><input id="ac_nia" value="${esc(p.nia)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'nia',this.value)"></div>
            <div class="pap-field"><label>Nivel y grupo (si difiere del actual)</label><input id="ac_nivelDoc" value="${esc(p.nivelDoc)}" placeholder="${esc(nivel)} ${esc(grupo)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'nivelDoc',this.value)"></div>
          </div>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">B</span><span class="pap-section-title">Documentación requerida</span></div>
        <div class="pap-section-body pap-grid2">
          ${F('ac_fechaInformeSociopsico','Fecha del informe sociopsicopedagógico',p.fechaInformeSociopsico,'date')}
          ${F('ac_fechaInformeMedidas','Informe de medidas de nivel II y III adjunto, de fecha',p.fechaInformeMedidas,'date')}
          <p class="pap-hint" style="grid-column:1/-1">Ir al Menú Informes del módulo de inclusión de ITACA3 y seleccionar el submódulo Inclusión Educativa — Informe de medidas de nivel II, III y IV.</p>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">C</span><span class="pap-section-title">Concreción del programa de enriquecimiento</span></div>
        <div class="pap-section-body">
          <p class="pap-hint">Área — Materia — Ámbito: para cada materia que se imparte en el curso del alumno/a, indica si se realiza enriquecimiento y de qué tipo. <strong>Horizontal</strong>: profundizar en las competencias específicas trabajadas dentro del aula, estableciendo relaciones y conexiones con otros temas. <strong>Vertical</strong>: aumentar la cantidad de saberes y aprender avanzando competencias específicas de un curso superior.</p>
          ${renderAcEnriquecimientoTabla(nivel, grupo, idx, p)}
          <div class="pap-field" style="margin-top:12px">
            <label>Observaciones adicionales sobre el ámbito (conexiones concretas, temas, saberes de curso superior…)</label>
            <textarea id="ac_areaMateriaAmbito" onchange="saveAcField('${nivel}','${grupo}',${idx},'areaMateriaAmbito',this.value)">${esc(p.areaMateriaAmbito)}</textarea>
          </div>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">D</span><span class="pap-section-title">Estrategias metodológicas empleadas y recursos</span></div>
        <div class="pap-section-body">
          <div class="ac-check-grid">${estrategiasRows}</div>
          <div class="pap-field" style="margin-top:12px">
            <label>Otras estrategias y/o recursos</label>
            <textarea id="ac_otrasEstrategias" onchange="saveAcField('${nivel}','${grupo}',${idx},'otrasEstrategias',this.value)">${esc(p.otrasEstrategias)}</textarea>
          </div>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">E</span><span class="pap-section-title">Tareas de los agentes que intervienen</span></div>
        <div class="pap-section-body">
          <table class="pap-dyn-table">
            <thead><tr><th style="width:35%">Agentes</th><th>Tareas</th><th style="width:30px"></th></tr></thead>
            <tbody>${tareasRows}</tbody>
          </table>
          <button class="pap-add-btn" onclick="acAddFila('${nivel}','${grupo}',${idx},'tareasAgentes',{agente:'',tareas:''})">+ Añadir fila</button>
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">F</span><span class="pap-section-title">Horario personalizado del alumnado</span></div>
        <div class="pap-section-body">
          <p class="pap-hint">Se adjuntará o detallará el horario del alumno/a con todos los apoyos que recibe, haciendo constar si es individual-grupal dentro-fuera del aula.</p>
          ${T('ac_horarioNota','Nota sobre el horario',p.horarioNota)}
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">G</span><span class="pap-section-title">Planificación de las coordinaciones</span></div>
        <div class="pap-section-body">
          <p class="pap-hint">Propuesta de temporalización de las reuniones internas-externas entre los diferentes agentes educativos y familia.</p>
          ${T('ac_coordinaciones','Coordinaciones',p.coordinaciones)}
        </div>
      </div>

      <div class="pap-section">
        <div class="pap-section-head"><span class="pap-section-letter">H</span><span class="pap-section-title">Seguimiento y evaluación de las medidas</span></div>
        <div class="pap-section-body">
          <table class="pap-dyn-table">
            <thead><tr><th style="width:34%">Medidas</th><th>1r trimestre</th><th>2n trimestre</th><th>3r trimestre</th><th style="width:30px"></th></tr></thead>
            <tbody>${seguimientoRows}</tbody>
          </table>
          <button class="pap-add-btn" onclick="acAddFila('${nivel}','${grupo}',${idx},'seguimiento',{medida:'',t1:'',t2:'',t3:''})">+ Añadir fila</button>
          <div style="margin-top:12px">${T('ac_progresoGlobal','Progreso global del alumnado (nivel académico, personal y social — tener en cuenta la opinión de todos los agentes)',p.progresoGlobal)}</div>
          <div>${T('ac_propuestaNuevasMedidas','Propuesta de nuevas medidas y/o actuaciones para el curso siguiente',p.propuestaNuevasMedidas)}</div>
          <div class="pap-grid2">
            <div class="pap-field"><label>Nombre y apellidos (de quien cumplimenta)</label><input id="ac_firmaNombre" value="${esc(p.firmaNombre)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'firmaNombre',this.value)"></div>
            <div class="pap-field"><label>Como (cargo/relación)</label><input id="ac_firmaComo" value="${esc(p.firmaComo)}" onchange="saveAcField('${nivel}','${grupo}',${idx},'firmaComo',this.value)"></div>
          </div>
        </div>
      </div>

    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeAcModal()">Cerrar</button>
      <button class="btn btn-ghost" onclick="exportarAcHTML('${nivel}','${grupo}',${idx})">🌐 HTML</button>
      <button class="btn btn-ghost" onclick="exportarAcWord('${nivel}','${grupo}',${idx})">📄 Word</button>
      <button class="btn btn-primary" onclick="exportarAcPDF('${nivel}','${grupo}',${idx})">🖨️ PDF</button>
    </div>
  `;
}

// _acDocBodyHTML — genera el contenido interior (sin <html>/<style>) del
// documento AC, reutilizado por las tres exportaciones (PDF, Word y HTML).
function _acDocBodyHTML(nivel, grupo, idx) {
  const a = _acAlumno(nivel,grupo,idx);
  const p = a.ac || acDefault();
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';

  const estrategiasRows = AC_ESTRATEGIAS.filter(e => p.estrategias[e.key]).map(e =>
    `<tr><td>☑ ${esc(e.label)}</td></tr>`
  ).join('') || `<tr><td style="color:#999;font-style:italic">Sin estrategias marcadas.</td></tr>`;

  const tareasRows = p.tareasAgentes.filter(t=>t.agente||t.tareas).map(t=>`<tr><td>${esc(t.agente)}</td><td>${esc(t.tareas)}</td></tr>`).join('')
    || `<tr><td colspan="2" style="color:#999;font-style:italic">Sin tareas registradas.</td></tr>`;

  const seguimientoRows = p.seguimiento.filter(s=>s.medida||s.t1||s.t2||s.t3).map(s=>
    `<tr><td>${esc(s.medida)}</td><td>${esc(s.t1)}</td><td>${esc(s.t2)}</td><td>${esc(s.t3)}</td></tr>`
  ).join('') || `<tr><td colspan="4" style="color:#999;font-style:italic">Sin seguimiento registrado.</td></tr>`;

  const _enrMaterias = p.enriquecimientoMaterias || {};
  const enriquecimientoRows = getMateriasParaNivel(nivel, grupo)
    .filter(m => _enrMaterias[m])
    .map(m => `<tr><td>${esc(m)}</td><td>${_enrMaterias[m]==='horizontal'?'Enriquecimiento horizontal':'Enriquecimiento vertical'}</td></tr>`)
    .join('') || `<tr><td colspan="2" style="color:#999;font-style:italic">Sin materias con enriquecimiento asignado.</td></tr>`;

  return `
  <h1>Programa de Enriquecimiento Curricular</h1>
  <div class="subtitle">${esc(a.nombre)} · ${esc(nivel)} ${esc(grupo)} · Altas Capacidades · Generado el ${new Date().toLocaleDateString('es-ES')}</div>

  <h2>A · Datos de identificación</h2>
  <table class="idtable">
    <tr><th>Curso escolar</th><td>${esc(p.cursoEscolar)||'—'}</td><th>Fecha de inicio</th><td>${esc(p.fechaInicio)||'—'}</td></tr>
    <tr><th>Centro</th><td colspan="3">${esc(p.centroNombre)||'—'} ${p.centroCodigo?'(cód. '+esc(p.centroCodigo)+')':''} — ${esc(p.centroLocalidad)||'—'}</td></tr>
    <tr><th>Alumno/a</th><td colspan="3">${esc(a.nombre)}</td></tr>
    <tr><th>Fecha de nacimiento</th><td>${esc(a.fecha)||'—'}</td><th>NIA</th><td>${esc(p.nia)||'—'}</td></tr>
    <tr><th>Nivel y grupo</th><td colspan="3">${esc(p.nivelDoc)||(esc(nivel)+' '+esc(grupo))}</td></tr>
  </table>

  <h2>B · Documentación requerida</h2>
  <table class="idtable">
    <tr><th>Fecha del informe sociopsicopedagógico</th><td>${esc(p.fechaInformeSociopsico)||'—'}</td></tr>
    <tr><th>Informe de medidas de nivel II y III adjunto, de fecha</th><td>${esc(p.fechaInformeMedidas)||'—'}</td></tr>
  </table>

  <h2>C · Concreción del programa de enriquecimiento</h2>
  <table><thead><tr><th>Área / Materia / Ámbito</th><th>Tipo de enriquecimiento</th></tr></thead><tbody>${enriquecimientoRows}</tbody></table>
  ${p.areaMateriaAmbito?`<p><strong>Observaciones adicionales:</strong></p><p class="txt">${esc(p.areaMateriaAmbito)}</p>`:''}

  <h2>D · Estrategias metodológicas empleadas y recursos</h2>
  <table><thead><tr><th>Estrategia</th></tr></thead><tbody>${estrategiasRows}</tbody></table>
  ${p.otrasEstrategias?`<p><strong>Otras estrategias y/o recursos:</strong></p><p class="txt">${esc(p.otrasEstrategias)}</p>`:''}

  <h2>E · Tareas de los agentes que intervienen</h2>
  <table><thead><tr><th>Agentes</th><th>Tareas</th></tr></thead><tbody>${tareasRows}</tbody></table>

  <h2>F · Horario personalizado del alumnado</h2>
  <p class="txt">${esc(p.horarioNota)||'Se adjunta el horario del alumno/a con todos los apoyos que recibe (documento aparte).'}</p>

  <h2>G · Planificación de las coordinaciones</h2>
  <p class="txt">${esc(p.coordinaciones)||'—'}</p>

  <h2>H · Seguimiento y evaluación de las medidas</h2>
  <table><thead><tr><th>Medidas</th><th>1r trimestre</th><th>2n trimestre</th><th>3r trimestre</th></tr></thead><tbody>${seguimientoRows}</tbody></table>
  ${p.progresoGlobal?`<p><strong>Progreso global del alumnado:</strong></p><p class="txt">${esc(p.progresoGlobal)}</p>`:''}
  ${p.propuestaNuevasMedidas?`<p><strong>Propuesta de nuevas medidas para el curso siguiente:</strong></p><p class="txt">${esc(p.propuestaNuevasMedidas)}</p>`:''}

  <div class="firma">
    <div>${esc(p.firmaNombre)||'Nombre y apellidos'}<br>${esc(p.firmaComo)||'Como'}</div>
    <div>Firma</div>
  </div>
  <p style="font-size:8pt;color:#999;margin-top:16px">La Conselleria d'Educació, Universitats i Ocupació es responsable del tratamiento de los datos personales recogidos a través de este formulario, con la finalidad de gestionar la escolarización de alumnado con NEE, conforme al Reglamento (UE) 2016/679 y la Ley Orgánica 3/2018. Puede ejercer sus derechos de acceso, rectificación, supresión y portabilidad, así como la limitación y oposición al tratamiento, según lo indicado en http://sede.gva.es/es/proc19970.</p>

  <div class="footer">
    <span>Gestor de Tutoría — ${esc(iesName)}</span>
    <span>Altas Capacidades · Enriquecimiento Curricular</span>
  </div>`;
}

// ── Exportación del programa de Enriquecimiento Curricular (AC): PDF, Word y HTML ──
function exportarAcPDF(nivel, grupo, idx) {
  const a = _acAlumno(nivel,grupo,idx);
  const html = _wrapPrintHTML(`Enriquecimiento Curricular — ${a.nombre}`, _acDocBodyHTML(nivel,grupo,idx));
  const win = _ventanaDoc();
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('⚠ Permite las ventanas emergentes para imprimir');
}
function exportarAcWord(nivel, grupo, idx) {
  const a = _acAlumno(nivel,grupo,idx);
  const html = _wrapWordHTML(`Enriquecimiento Curricular — ${a.nombre}`, _acDocBodyHTML(nivel,grupo,idx));
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  triggerDownload(blob, _exportFilename('Enriquecimiento_Curricular', a.nombre, 'doc'));
  showToast('📄 Word generado — ábrelo con Microsoft Word o LibreOffice');
}
function exportarAcHTML(nivel, grupo, idx) {
  const a = _acAlumno(nivel,grupo,idx);
  const html = _wrapPlainHTML(`Enriquecimiento Curricular — ${a.nombre}`, _acDocBodyHTML(nivel,grupo,idx));
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, _exportFilename('Enriquecimiento_Curricular', a.nombre, 'html'));
  showToast('🌐 HTML exportado — conserva la maquetación exacta');
}

async function deleteAlumno(nivel, grupo, idx) {
  if (!await confirmar('¿Eliminar este alumno?')) return;
  data[nivel][grupo].splice(idx, 1);
  const key = `${nivel}-${grupo}`;
  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
}
