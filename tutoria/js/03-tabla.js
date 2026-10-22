/* ============================================================================
   Gestor de Tutoría · Tabla del grupo: pintado, columnas, modo compacto, teclado, selección múltiple
   tutoria/js/03-tabla.js
   ============================================================================ */

// ===================== RENDER =====================
function renderAll() {
  renderNivelTabs();
  const addBtn = document.getElementById('btnAddAlumnoHeader');
  const isSpecial = ['__home__','__materias__', '__calendario__', '__convivencia__', '__informe__', '__vacantes__', '__actasnooficiales__'].includes(currentNivel);
  if (addBtn) addBtn.style.display = isSpecial ? 'none' : '';
  if (currentNivel === '__home__') { renderResumen(); return; }
  if (currentNivel === '__materias__') { renderMaterias(); return; }
  if (currentNivel === '__calendario__') { renderCalendario(); return; }
  if (currentNivel === '__convivencia__') { renderConvivencia(); return; }
  if (currentNivel === '__informe__') { renderInformeAcademico(); return; }
  if (currentNivel === '__segfam__') { renderSegFamiliaListado(); return; }
  if (currentNivel === '__actasnooficiales__') { renderActasNoOficiales(); return; }
  // v6: si la pestaña activa no es un nivel que exista (nivel borrado, o una
  // pestaña interna sin pantalla propia como '__vacantes__'), se vuelve a
  // Inicio en vez de romper la pantalla.
  if (!GRUPOS_POR_NIVEL[currentNivel]) { currentNivel = '__home__'; renderNivelTabs(); renderResumen(); return; }
  renderMain();
  syncDateInputs();
}

function renderNivelTabs() {
  const c = document.getElementById('nivelTabs');
  const homeTab = `<div class="nivel-tab ${currentNivel === '__home__' ? 'active' : ''}" onclick="selectNivel('__home__')">🏠 Inicio</div>`;
  const calendarioTab = `<div class="nivel-tab ${currentNivel === '__calendario__' ? 'active' : ''}" onclick="selectNivel('__calendario__')">📅 Calendario</div>`;
  const informeTab = `<div class="nivel-tab ${currentNivel === '__informe__' ? 'active' : ''}" onclick="selectNivel('__informe__')">🎓 Informe Académico</div>`;
  const segFamTab = `<div class="nivel-tab ${currentNivel === '__segfam__' ? 'active' : ''}" onclick="selectNivel('__segfam__')">📞 Seguimientos</div>`;
  const convivenciaTab = `<div class="nivel-tab ${currentNivel === '__convivencia__' ? 'active' : ''}" onclick="selectNivel('__convivencia__')">🤝 Informe Convivencia</div>`;
  const actasNoOficialesTab = _actasNoOficialesTabVisible
    ? `<div class="nivel-tab ${currentNivel === '__actasnooficiales__' ? 'active' : ''}" onclick="selectNivel('__actasnooficiales__')">🗂️ Actas no Oficiales</div>`
    : '';
  const vacantesTab = `<div class="nivel-tab ${currentNivel === '__vacantes__' ? 'active' : ''}" onclick="selectNivel('__vacantes__')">🏗️ Unidades Vacantes</div>`;
  const materiasTab = `<div class="nivel-tab ${currentNivel === '__materias__' ? 'active' : ''}" onclick="selectNivel('__materias__')">⚙ Materias</div>`;
  const addNivelTab = `<div class="nivel-tab nivel-tab-add" onclick="openAddNivelModal()" title="Crear un nuevo nivel" style="font-weight:700;">＋ Nivel</div>`;
  const actasNoOficialesToggle = `<div class="nivel-tab" onclick="toggleActasNoOficialesTab()" title="${_actasNoOficialesTabVisible ? 'Ocultar' : 'Mostrar'} la pestaña «Actas no Oficiales»" style="opacity:0.55;font-weight:400;">${_actasNoOficialesTabVisible ? '🗂️🙈' : '🗂️👁️'}</div>`;
  c.innerHTML = homeTab + calendarioTab + informeTab + segFamTab + convivenciaTab + actasNoOficialesTab + NIVELES.map(n => {
    // Count pending decisions for this nivel
    const grupos = GRUPOS_POR_NIVEL[n]||[];
    let totalAl = 0, pendAl = 0;
    grupos.forEach(g => {
      const al = data[n]?.[g]||[];
      totalAl += al.length;
      pendAl += al.filter(a => !!(a.nombre && (a.eval3 > 0 || getPropObj(a.propuesta3).tipo)) && !getPropObj(a.promociona).tipo).length;
    });
    const progressClass = !totalAl ? 'empty' : pendAl === 0 ? 'complete' : 'partial';
    const progressLabel = !totalAl ? '—' : pendAl === 0 ? '✓' : `${pendAl}⚠`;
    const progressBadge = `<span class="tab-progress ${progressClass}" title="${pendAl === 0 ? 'Todas las decisiones tomadas' : pendAl + ' pendientes'}">${progressLabel}</span>`;
    return `
    <div class="nivel-tab ${n === currentNivel ? 'active' : ''}" onclick="selectNivel('${n.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:6px;">
      <span>${n}</span>
      ${progressBadge}
      <button class="grupo-tab-del" title="Renombrar nivel ${n}" data-nivel-rename="${n}"
        style="opacity:0.4;transition:opacity 0.15s;"
        onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.4'">✏️</button>
      <button class="grupo-tab-del" title="Eliminar nivel ${n}" data-nivel="${n}"
        style="opacity:0.4;transition:opacity 0.15s;"
        onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.4'">✕</button>
    </div>
  `;}).join('') + addNivelTab + materiasTab + actasNoOficialesToggle;

  // Delegated handlers for nivel delete/rename buttons
  c.querySelectorAll('[data-nivel]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openDeleteNivelModal(btn.dataset.nivel);
    });
  });
  c.querySelectorAll('[data-nivel-rename]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openRenameNivelModal(btn.dataset.nivelRename);
    });
  });
}

function toggleActasNoOficialesTab() {
  _actasNoOficialesTabVisible = !_actasNoOficialesTabVisible;
  if (!_actasNoOficialesTabVisible && currentNivel === '__actasnooficiales__') currentNivel = '__home__';
  markDirty();
  renderAll();
  showToast(_actasNoOficialesTabVisible ? '🗂️ Pestaña «Actas no Oficiales» visible' : '🙈 Pestaña «Actas no Oficiales» oculta');
}

function renderMain() {
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '';

  const nivel = currentNivel;
  const grupos = GRUPOS_POR_NIVEL[nivel];
  const grupoActual = currentGrupos[nivel];

  // Grupo tabs
  const grupoTabsEl = document.createElement('div');
  grupoTabsEl.className = 'grupo-tabs';

  // Build tab elements (not via innerHTML — need real DOM nodes for drag events)
  grupos.forEach(g => {
    const tab = document.createElement('div');
    tab.className = 'grupo-tab' + (g === grupoActual ? ' active' : '');
    tab.draggable = true;
    tab.dataset.grupo = g;
    tab.title = 'Arrastra para reordenar';

    // Drag handle icon + label + progress pct
    const alumnos = data[nivel]?.[g] || [];
    const total = alumnos.length;
    const decided = alumnos.filter(a => !!getPropObj(a.promociona).tipo).length;
    const pct = total ? Math.round(decided / total * 100) : 0;
    const barColor = pct === 100 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : pct > 0 ? 'var(--accent)' : 'var(--border2)';
    const pctLabel = pct === 100 ? '✓' : `${pct}%`;

    tab.innerHTML = `
      <div class="tab-top-row">
        <span class="tab-drag-handle" title="Arrastrar">⠿</span>${nivel} ${g}
        <span class="tab-pct">${pctLabel}</span>
      </div>
      <div class="tab-progress-wrap">
        <div class="tab-progress-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>`;

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'grupo-tab-edit';
    editBtn.title = 'Renombrar grupo';
    editBtn.dataset.nivel = nivel;
    editBtn.dataset.grupo = g;
    editBtn.textContent = '✏';
    editBtn.addEventListener('click', e => { e.stopPropagation(); openRenameGrupoModal(nivel, g); });
    tab.appendChild(editBtn);

    // Delete button
    if (grupos.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'grupo-tab-del';
      delBtn.title = `Eliminar grupo ${g}`;
      delBtn.dataset.nivel = nivel;
      delBtn.dataset.grupo = g;
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', e => { e.stopPropagation(); confirmDeleteGrupo(nivel, g); });
      tab.appendChild(delBtn);
    }

    // Click to select
    tab.addEventListener('click', () => selectGrupo(g));

    grupoTabsEl.appendChild(tab);
  });

  // Add grupo button
  const addBtn = document.createElement('button');
  addBtn.className = 'grupo-tab-add';
  addBtn.title = 'Añadir grupo';
  addBtn.textContent = '＋ Grupo';
  addBtn.addEventListener('click', () => openAddGrupoModal(nivel));
  grupoTabsEl.appendChild(addBtn);

  // ── Drag & drop reorder ──────────────────────────────────────────
  let dragSrc = null;

  grupoTabsEl.addEventListener('dragstart', e => {
    const tab = e.target.closest('.grupo-tab');
    if (!tab) return;
    dragSrc = tab;
    tab.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.dataset.grupo);
  });

  grupoTabsEl.addEventListener('dragend', e => {
    const tab = e.target.closest('.grupo-tab');
    if (tab) tab.classList.remove('dragging');
    grupoTabsEl.querySelectorAll('.grupo-tab').forEach(t => t.classList.remove('drag-over'));
    dragSrc = null;
  });

  grupoTabsEl.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.grupo-tab');
    if (!target || target === dragSrc) return;
    grupoTabsEl.querySelectorAll('.grupo-tab').forEach(t => t.classList.remove('drag-over'));
    target.classList.add('drag-over');
  });

  grupoTabsEl.addEventListener('dragleave', e => {
    const target = e.target.closest('.grupo-tab');
    if (target) target.classList.remove('drag-over');
  });

  grupoTabsEl.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.grupo-tab');
    if (!target || !dragSrc || target === dragSrc) return;
    target.classList.remove('drag-over');

    const fromGrupo = dragSrc.dataset.grupo;
    const toGrupo   = target.dataset.grupo;
    const arr = GRUPOS_POR_NIVEL[nivel];
    const fromIdx = arr.indexOf(fromGrupo);
    const toIdx   = arr.indexOf(toGrupo);
    if (fromIdx < 0 || toIdx < 0) return;

    // Reorder in place
    arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, fromGrupo);

    markDirty();
    renderMain();
  });
  // ────────────────────────────────────────────────────────────────

  // Create grupoBlock container that will hold tabs + content
  const grupoBlock = document.createElement('div');
  grupoBlock.className = 'grupo-block';
  mc.appendChild(grupoBlock);

  grupoBlock.appendChild(grupoTabsEl);

  // Content for current grupo
  const alumnos = data[nivel][grupoActual];
  renderGrupoContent(mc, grupoBlock, nivel, grupoActual, alumnos);
}

function renderGrupoContent(mc, grupoBlock, nivel, grupo, alumnos) {
  const key = `${nivel}-${grupo}`;

  // Section header with tutor field
  const sh = document.createElement('div');
  sh.className = 'section-header';
  sh.style.cssText = 'flex-wrap:wrap;gap:12px;';
  sh.innerHTML = `
    <div>
      <div class="section-title">📋 Tabla de Evaluación — ${nivel} ${grupo}</div>
      <div class="section-meta">${alumnos.length} alumno${alumnos.length===1?'':'s'} registrado${alumnos.length===1?'':'s'}</div>
    </div>
    <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:10px;background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:8px 14px;">
        <span style="font-size:18px;">👤</span>
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Tutor/a del grupo</div>
          <input
            id="tutor-${nivel}-${grupo}"
            type="text"
            placeholder="Nombre del tutor/a…"
            value="${tutores[key] || ''}"
            oninput="tutores['${key}']=this.value"
            style="background:transparent;border:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:500;width:220px;outline:none;"
          />
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <div class="search-bar-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-bar" id="alumnoSearch" placeholder="Buscar alumno…"
            oninput="
              _searchQuery=this.value;
              const cl=document.getElementById('searchClear');
              if(cl)cl.className='search-clear'+(this.value?' visible':'');
              applySearch();
            " />
          <button class="search-clear" id="searchClear" onclick="
            document.getElementById('alumnoSearch').value='';
            _searchQuery='';
            this.className='search-clear';
            applySearch();
          ">✕</button>
          <span id="searchResultCount" style="font-size:10px;color:var(--accent);font-weight:600;display:none;min-width:30px;"></span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="openAddAlumno()">＋ Alumno</button>
        <button class="btn btn-ghost btn-sm" onclick="abrirImportarDelCuaderno('${nivel}','${grupo}')" title="Copiar la lista de alumnado de un grupo del Cuaderno del profesor (solo nombres y fechas de nacimiento)">📥 Del Cuaderno</button>
        <button class="compact-toggle${window._compactMode?' active':''}" id="compactToggle-${nivel}-${grupo}"
          title="Modo compacto — reduce el tamaño de las filas"
          onclick="_toggleCompact('${nivel}','${grupo}',this)">${window._compactMode?'⊡ Normal':'⊟ Compacto'}</button>
        <button class="btn btn-ghost btn-sm" onclick="openActaOficialMenu('${nivel}','${grupo}')">📋 Acta Oficial</button>
        <details class="mas-menu">
          <summary class="btn btn-ghost btn-sm" title="Más herramientas del grupo">⋯ Más${_getAsistenciaIndicator(nivel, grupo) || ((window._obsGrupoData||{})[`${nivel}-${grupo}`] ? ' <span class="mas-punto"></span>' : '')}</summary>
          <div class="mas-menu-lista" role="menu">
            <button role="menuitem" onclick="selectNivel('__actasnooficiales__')" title="Las Actas I/II/Final de todos los grupos se gestionan en su propia pestaña">🗂️ Actas no Oficiales</button>
            <button role="menuitem" onclick="openAsistencia('${nivel}','${grupo}')">👥 Asistencia a la sesión${_getAsistenciaIndicator(nivel, grupo)}</button>
            <button role="menuitem" onclick="openEquipoDocente('${nivel}','${grupo}')">👨‍🏫 Equipo docente</button>
            <button role="menuitem" onclick="openObservacionesGrupo('${nivel}','${grupo}')">📝 Observaciones del grupo${(window._obsGrupoData||{})[`${nivel}-${grupo}`] ? ' <span class="mas-punto"></span>' : ''}</button>
            <button role="menuitem" onclick="openPlanoGrupo('${nivel}','${grupo}')">🪑 Plano del grupo</button>
            <button role="menuitem" onclick="openHorarioGrupo('${nivel}','${grupo}')">🗓️ Horario del grupo</button>
            <button role="menuitem" onclick="openFotoGaleria('${nivel}','${grupo}')">🖼️ Fotos del grupo</button>
          </div>
        </details>
      </div>
    </div>
  `;
  grupoBlock.appendChild(sh);

  // ── EVAL SUB-TABS ──────────────────────────────────────────────────
  // Track active eval tab per grupo key
  if (!window._evalTab) window._evalTab = {};
  if (!window._evalTab[key]) window._evalTab[key] = 'eval1';

  const evalSubtabsEl = document.createElement('div');
  evalSubtabsEl.className = 'eval-subtabs';
  evalSubtabsEl.id = `evalsubtabs-${key}`;
  grupoBlock.appendChild(evalSubtabsEl);

  function buildEvalSubtabs() {
    const active = window._evalTab[key];
    evalSubtabsEl.innerHTML = `
      <button class="eval-subtab ${active==='eval1'?'active-eval1':''}"
        onclick="selectEvalTab('${nivel}','${grupo}','eval1')">📘 I Evaluación</button>
      <button class="eval-subtab ${active==='eval2'?'active-eval2':''}"
        onclick="selectEvalTab('${nivel}','${grupo}','eval2')">📗 II Evaluación</button>
      <button class="eval-subtab ${active==='eval3'?'active-eval3':''}"
        onclick="selectEvalTab('${nivel}','${grupo}','eval3')">📙 Evaluación Final</button>
      <button class="eval-subtab ${active==='nese'?'active-nese':''}"
        onclick="selectEvalTab('${nivel}','${grupo}','nese')">🧩 NESE</button>
    `;
  }
  buildEvalSubtabs();
  window['_rebuildEvalSubtabs_' + key] = buildEvalSubtabs;

  // Filter bar (shared across eval tabs)
  const fb = document.createElement('div');
  fb.id = `filterbar-${key}`;
  grupoBlock.appendChild(fb);

  // Table wrapper
  const tw = document.createElement('div');
  tw.className = 'table-wrapper';
  tw.id = `table-${key}`;
  grupoBlock.appendChild(tw);

  // ── ESTADÍSTICAS FINALES ──────────────────────────────────────────────
  const divStats = document.createElement('div');
  divStats.className = 'section-divider';
  divStats.innerHTML = `<span class="section-divider-icon">📊</span><span class="section-divider-label">Estadísticas del grupo</span><span class="section-divider-line"></span>`;
  mc.appendChild(divStats);

  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats-grid';
  statsDiv.id = `stats-${key}`;
  mc.appendChild(statsDiv);

  // Stats - II Evaluacion
  const stats2Title = document.createElement('div');
  stats2Title.style.cssText = 'font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;margin-top:16px;display:flex;align-items:center;gap:8px;';
  stats2Title.innerHTML = '<span style="width:3px;height:14px;border-radius:2px;background:var(--green);display:inline-block;flex-shrink:0"></span>Propuesta II Evaluación — Previsión de vacantes';
  stats2Title.id = `stats2title-${key}`;
  mc.appendChild(stats2Title);

  const stats2Div = document.createElement('div');
  stats2Div.className = 'stats-grid';
  stats2Div.id = `stats2-${key}`;
  mc.appendChild(stats2Div);

  // ── GRÁFICOS ──────────────────────────────────────────────────────────
  const divCharts = document.createElement('div');
  divCharts.className = 'section-divider';
  divCharts.innerHTML = `<span class="section-divider-icon">📈</span><span class="section-divider-label">Gráficos</span><span class="section-divider-line"></span>`;
  mc.appendChild(divCharts);

  const cg = document.createElement('div');
  cg.className = 'charts-grid';
  cg.innerHTML = `
    <div class="chart-card">
      <div class="chart-title">Materias No Superadas por Evaluación</div>
      <div class="chart-container"><canvas id="chart-eval-${key}"></canvas></div>
    </div>
    <div class="chart-card chart-card-split">
      <div class="chart-split-inner">
        <div class="chart-split-half">
          <div class="chart-title">I Eval Propuesta</div>
          <div class="chart-container"><canvas id="chart-prop1-${key}"></canvas></div>
        </div>
        <div class="chart-split-sep"></div>
        <div class="chart-split-half">
          <div class="chart-title">II Eval Propuesta</div>
          <div class="chart-container"><canvas id="chart-prop2-${key}"></canvas></div>
        </div>
      </div>
    </div>
    <div class="chart-card chart-card-split">
      <div class="chart-split-inner">
        <div class="chart-split-half">
          <div class="chart-title">NESE</div>
          <div class="chart-container"><canvas id="chart-nese-${key}"></canvas></div>
        </div>
        <div class="chart-split-sep"></div>
        <div class="chart-split-half">
          <div class="chart-title">Compensatoria</div>
          <div class="chart-container"><canvas id="chart-comp-${key}"></canvas></div>
        </div>
      </div>
    </div>
    <div class="chart-card chart-card-split">
      <div class="chart-split-inner">
        <div class="chart-split-half">
          <div class="chart-title">Promoción Final</div>
          <div class="chart-container"><canvas id="chart-promo-${key}"></canvas></div>
        </div>
        <div class="chart-split-sep"></div>
        <div class="chart-split-half">
          <div class="chart-title">🗣️ Voto Lengua Base</div>
          <div class="chart-container"><canvas id="chart-lengua-${key}"></canvas></div>
        </div>
      </div>
    </div>
  `;
  mc.appendChild(cg);

  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  setTimeout(() => updateCharts(nivel, grupo), 50);
}

function selectEvalTab(nivel, grupo, tab) {
  const key = `${nivel}-${grupo}`;
  window._evalTab[key] = tab;
  // Rebuild subtab headers
  if (window['_rebuildEvalSubtabs_' + key]) window['_rebuildEvalSubtabs_' + key]();
  // Refresh table for this eval
  updateTable(nivel, grupo);
}

// Pestaña "NESE" (a nivel de grupo, tras Evaluación Final): lista el
// alumnado marcado como NESE de este grupo, con acceso directo a su PAP y,
// si procede, a su Programa de Enriquecimiento Curricular (EC).
function renderNeseTabPanel(nivel, grupo, tw, rawAlumnos) {
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const neseAlumnos = rawAlumnos
    .map((a, i) => ({ a, i }))
    .filter(({a}) => a.nombre && a.nombre.trim() && a.nese === 'Sí');

  if (!neseAlumnos.length) {
    tw.innerHTML = `<div class="no-data"><div class="icon">🧩</div>No hay alumnado marcado como NESE en ${esc(nivel)} ${esc(grupo)}.</div>`;
    return;
  }

  const rows = neseAlumnos.map(({a, i}) => {
    const rn = _getNeseCodes(a.recursoNese);
    const codePills = ['AL','PT'].filter(c => rn.includes(c))
      .map(c => `<span class="nese-pill nese-pill-on" style="cursor:default">${c}</span>`).join('');
    const hasPAP = !!a.papActivo, hasEC = !!a.ecActivo;
    const papDone = !!(a.pap && a.pap._touched);
    const acDone = !!(a.ac && a.ac._touched);
    return `<div class="nese-tab-row">
      <div>
        <div class="nese-tab-name">${esc(a.nombre)}</div>
        <div class="nese-tab-sub">${codePills || 'Sin AL/PT asignado'}${a.compensatoria==='Sí' ? ' · Compensatoria' : ''}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <span class="nese-pill${hasPAP?' nese-pill-on':''}" title="¿Tiene Plan de Actuación Personalizado (PAP)?" onclick="withUndo('${nivel}','${grupo}',()=>_toggleMedidaExtra('${nivel}','${grupo}',${i},'papActivo'))">PAP</span>
        <span class="nese-pill${hasEC?' nese-pill-on':''}" title="¿Tiene Programa de Enriquecimiento Curricular (EC)?" onclick="withUndo('${nivel}','${grupo}',()=>_toggleMedidaExtra('${nivel}','${grupo}',${i},'ecActivo'))">EC</span>
        ${hasPAP?`<span class="pap-btn" title="Plan de Actuación Personalizado (PAP)" onclick="openPapModal('${nivel}','${grupo}',${i})">📋 Ver PAP${papDone?'<span class="nese-doc-dot"></span>':''}</span>`:''}
        ${hasEC?`<span class="ac-btn" title="Programa de Enriquecimiento Curricular (Altas Capacidades)" onclick="openAcModal('${nivel}','${grupo}',${i})">🎓 Ver EC${acDone?'<span class="nese-doc-dot"></span>':''}</span>`:''}
      </div>
    </div>`;
  }).join('');

  tw.innerHTML = `
    <div style="padding:18px 18px 22px">
      <div class="section-divider" style="margin-top:0">
        <span class="section-divider-icon">🧩</span>
        <span class="section-divider-label">Alumnado NESE — ${esc(nivel)} ${esc(grupo)} (${neseAlumnos.length})</span>
        <span class="section-divider-line"></span>
      </div>
      <div class="nese-tab-card">${rows}</div>
    </div>
  `;
}

function renderFilterBar(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const fb = document.getElementById(`filterbar-${key}`);
  if (!fb) return;
  const evalTabNow = (window._evalTab && window._evalTab[key]) || 'eval1';
  if (evalTabNow === 'nese') { fb.innerHTML = ''; fb.className = 'filter-bar'; return; }
  const fs = getFilterState(key);
  const activeCount = Object.keys(fs).length;
  const isOpen = fb.classList.contains('open');
  const evalTab = (window._evalTab && window._evalTab[key]) || 'eval1';
  const hiddenColCount = getHiddenColCount(key, nivel, evalTab);

  const chip = (label, field, value, color='') => {
    const on = fs[field] === value;
    return `<button class="filter-chip${on?' active'+(color?' '+color:''):''}"
      onclick="toggleFilter('${key}','${field}','${value}')">${label}</button>`;
  };

  // Map active filters to pills for collapsed view
  const filterLabels = {
    nese:         { 'Sí':'NESE',       '':'Sin NESE' },
    repetidor:    { 'Sí':'Repetidor' },
    compensatoria:{ 'Sí':'Compens.' },
    matSus:       { '0':'✓ Aprob.', '1-2':'1-2 Susp.', '3+':'3+ Susp.' },
    propuesta:    { 'Repetición':'Repite','Promoción':'Promociona','Titulación':'Titula','Abandono':'Abandono' },
    lengua:       { 'Castellano':'🟦 Cast.','Valenciano':'🟩 Val.','':'⬜ No vota' },
    pendientes:   { 'si':'Con pend.' },
    sinDecision:  { 'si':'Sin decidir' },
  };
  const filterColors = {
    nese:'purple', repetidor:'yellow', compensatoria:'orange',
    matSus:'yellow', propuesta:'green', pendientes:'yellow', sinDecision:'red'
  };

  const activePills = Object.entries(fs).map(([field, val]) => {
    const label = filterLabels[field]?.[val] || val;
    const color = filterColors[field] || '';
    return `<span class="filter-active-pill ${color}"
      onclick="toggleFilter('${key}','${field}','${val}')" title="Quitar filtro">
      ${label} ✕</span>`;
  }).join('');

  fb.className = 'filter-bar' + (isOpen ? ' open' : '');
  fb.innerHTML = `
    <div class="filter-bar-top">
      <button class="filter-bar-toggle" onclick="(function(fb){fb.classList.toggle('open');renderFilterBar('${nivel.replace(/'/g,"\\'")}','${grupo}');})(this.closest('.filter-bar'))">
        ${isOpen ? '▲ Ocultar filtros' : '▼ Filtros'}${activeCount ? ` <span style="background:var(--accent);color:#fff;border-radius:8px;padding:0 6px;font-size:9px">${activeCount}</span>` : ''}
      </button>
      ${activePills || (!isOpen ? `<span style="font-size:10px;color:var(--text3)">Sin filtros activos</span>` : '')}
      ${activeCount ? `<button class="filter-chip" style="color:var(--red);border-color:rgba(247,110,110,0.3);font-size:10px;padding:2px 7px" onclick="clearFilters('${key}')">✕ Limpiar todo</button>` : ''}
      <span id="filterResultCount" style="margin-left:auto"></span>
      <button class="col-manager-btn${hiddenColCount>0?' has-hidden':''}" onclick="openColManager(event,'${nivel}','${grupo}')" id="colManagerBtn-${key}">⚙ Columnas${hiddenColCount>0?` <span style="background:var(--yellow);color:#111;border-radius:8px;padding:0 5px;font-size:10px">${hiddenColCount}</span>`:''}</button>
    </div>
    <div class="filter-bar-expanded">
      <div class="filter-group">
        <span class="filter-group-label">Perfil</span>
        ${chip('NESE','nese','Sí','purple')}
        ${chip('Sin NESE','nese','')}
        ${chip('Repetidor','repetidor','Sí','yellow')}
        ${chip('Compens.','compensatoria','Sí','orange')}
      </div>
      <div class="filter-group">
        <span class="filter-group-label">Resultados</span>
        ${chip('✓ Todo aprobado','matSus','0','green')}
        ${chip('1-2 Susp.','matSus','1-2','yellow')}
        ${chip('3+ Susp.','matSus','3+','red')}
        <span class="filter-sep"></span>
        ${chip('⚠ Sin decidir','sinDecision','si','red')}
        ${chip('Con pendientes','pendientes','si','yellow')}
      </div>
      <div class="filter-group">
        <span class="filter-group-label">Decisión</span>
        ${chip('Repite','propuesta','Repetición','red')}
        ${chip('Promociona','propuesta','Promoción','green')}
        ${chip('Titula','propuesta','Titulación','purple')}
        ${chip('Abandono','propuesta','Abandono','gray')}
      </div>
      <div class="filter-group">
        <span class="filter-group-label">Lengua</span>
        ${chip('🟦 Castellano','lengua','Castellano')}
        ${chip('🟩 Valenciano','lengua','Valenciano')}
        ${chip('⬜ No vota','lengua','')}
      </div>
    </div>
  `;
}

// ===================== COLUMN MANAGER =====================

// Genera la lista de columnas [label, required] para una pestaña de evaluación
// concreta ('eval1'|'eval2'|'eval3'), replicando EXACTAMENTE el mismo orden y
// nombres que construye renderMain. Es la única fuente de verdad: así el
// gestor de columnas (⚙ Columnas) nunca puede desincronizarse de la tabla real.
// required = no se puede ocultar ni eliminar (columnas imprescindibles).
// Genera la lista de columnas [label, required, shared] para una pestaña de
// evaluación concreta ('eval1'|'eval2'|'eval3'), replicando EXACTAMENTE el
// mismo orden y nombres que construye renderMain. Es la única fuente de
// verdad: así el gestor de columnas (⚙ Columnas) nunca puede desincronizarse
// de la tabla real.
//   required = no se puede ocultar ni eliminar (columnas imprescindibles).
//   shared   = es una columna de identidad del alumno (Lengua Base, NESE,
//              Compensatoria, Pend. Ant…) que se muestra igual en las tres
//              evaluaciones; ocultarla en una pestaña la oculta en las demás.
//              Las columnas propias de cada evaluación (I/II/III Eval., sus
//              pendientes/propuesta, asistencia y convivencia de esa
//              evaluación concreta) NO son compartidas: cada pestaña
//              mantiene su propia visibilidad para ellas.
function getColDefs(nivel, evalTab) {
  const bach = isBach(nivel);
  const tab = evalTab || 'eval1';

  const baseNames = ['Alumno / a','Lengua Base','CEIP Origen','Curso','Grupo','Repetidor','F. Nacimiento','Edad Actual','NESE','Recurso NESE','Compensatoria','Cód. Comp.','Pend. Ant.'];
  const baseRequired = baseNames.map(n => n === 'Alumno / a');
  const baseShared = baseNames.map(() => true);
  // Nota: hasta hace poco había aquí dos columnas más ('📝' y una vacía) que
  // ya no correspondían a ninguna celda real — el botón de observaciones
  // (📝) vive dentro de la propia celda "Alumno / a" desde hace tiempo, no
  // como columna aparte. Se han retirado porque desajustaban en dos
  // posiciones la cabecera respecto a las filas de datos.

  let names, required, shared;
  if (tab === 'eval1') {
    names = [...baseNames, 'I Eval.','I Pend.','I Prop.','F. Just.','F. Injust.','AC','Partes','Expedientes'];
    required = [...baseRequired, false,false,false,false,false,false,false,false];
    shared = [...baseShared, false,false,false,false,false,false,false,false];
  } else if (tab === 'eval2') {
    names = [...baseNames, 'II Eval.','II Pend.','II Prop.','F. Just.','F. Injust.','AC','Partes','Expedientes'];
    required = [...baseRequired, false,false,false,false,false,false,false,false];
    shared = [...baseShared, false,false,false,false,false,false,false,false];
  } else { // eval3
    const pendLabel = bach ? 'Pend. III Ev.' : 'Pend. Próx. Curso';
    const extrNames = bach ? ['Eval. Extr.','Pend. Extr.'] : [];
    const extrRequired = bach ? [false,false] : [];
    const extrShared = bach ? [false,false] : [];
    names = [...baseNames, 'Recuperadas', 'III Eval.', pendLabel, ...extrNames, 'Promociona', 'F. Just.','F. Injust.','AC','Partes','Expedientes'];
    required = [...baseRequired, false, false, false, ...extrRequired, true, false,false,false,false,false];
    shared = [...baseShared, false, false, false, ...extrShared, false, false,false,false,false,false];
  }
  return names.map((label, i) => [label, required[i], shared[i]]);
}

// Crea (o devuelve) el almacén plano { visible:[], deleted:[] } bajo una
// clave concreta, asegurando que tenga al menos `n` elementos.
function _rawColStore(storeKey, n) {
  if (!_colState[storeKey]) {
    _colState[storeKey] = { visible: Array(n).fill(true), deleted: Array(n).fill(false) };
  }
  while (_colState[storeKey].visible.length < n) _colState[storeKey].visible.push(true);
  while (_colState[storeKey].deleted.length < n) _colState[storeKey].deleted.push(false);
  return _colState[storeKey];
}

// Array "virtual" indexado 0..n-1 que, para cada índice, lee/escribe en el
// almacén compartido o en el específico de la evaluación, según corresponda
// (según el flag `shared` de getColDefs). Así el resto del código sigue
// usando cs.visible[i] / cs.deleted[i] con normalidad, sin saber que por
// debajo hay dos almacenes distintos.
function _makeColArrayProxy(prop, defs, sharedStore, ownStore) {
  return new Proxy({}, {
    get(_target, p) {
      if (p === 'length') return defs.length;
      if (p === 'filter' || p === 'forEach' || p === 'map' || typeof p === 'symbol' || p === Symbol.iterator) {
        // Materializar un array real para los métodos de Array.prototype
        const arr = defs.map((d, i) => (d[2] ? sharedStore[prop] : ownStore[prop])[i]);
        return Array.prototype[p] ? arr[p].bind(arr) : arr[p];
      }
      const i = +p;
      if (Number.isInteger(i)) return (defs[i] && defs[i][2] ? sharedStore[prop] : ownStore[prop])[i];
      return undefined;
    },
    set(_target, p, value) {
      const i = +p;
      if (Number.isInteger(i)) {
        const store = (defs[i] && defs[i][2]) ? sharedStore[prop] : ownStore[prop];
        store[i] = value;
        return true;
      }
      return true;
    }
  });
}

function getColState(key, nivel, evalTab) {
  const tab = evalTab || 'eval1';
  const defs = getColDefs(nivel, tab);
  const n = defs.length;
  const sharedStore = _rawColStore(`${key}_shared`, n);
  const ownStore = _rawColStore(`${key}_${tab}`, n);
  return {
    visible: _makeColArrayProxy('visible', defs, sharedStore, ownStore),
    deleted: _makeColArrayProxy('deleted', defs, sharedStore, ownStore),
  };
}

function getHiddenColCount(key, nivel, evalTab) {
  const cs = getColState(key, nivel, evalTab);
  return cs.visible.filter((v, i) => !v && !cs.deleted[i]).length;
}

function isColVisible(key, nivel, evalTab, i) {
  const cs = getColState(key, nivel, evalTab);
  return !cs.deleted[i] && cs.visible[i];
}

/* La v3 guarda el estado de columnas con su propia clave: la v2 usa el orden
   antiguo (nombre en 6.ª posición) y comparte el almacenamiento del navegador. */
const _COLSTATE_CLAVE = 'evalies_colstate_v3';
function saveColState() {
  try {
    localStorage.setItem(_COLSTATE_CLAVE, JSON.stringify(_colState));
  } catch(e) {}
}

// Pasa un estado de columnas del orden antiguo al nuevo: la posición 5
// («Alumno / a») va al principio en cada almacén (visible / deleted).
function _colStateNombrePrimero(cs) {
  Object.keys(cs).forEach(k => {
    const st = cs[k]; if (!st || typeof st !== 'object') return;
    ['visible', 'deleted'].forEach(p => {
      const a = st[p];
      if (Array.isArray(a) && a.length > 5) a.unshift(a.splice(5, 1)[0]);
    });
  });
}

function loadColState() {
  try {
    const raw = localStorage.getItem(_COLSTATE_CLAVE);
    if (raw) { Object.assign(_colState, JSON.parse(raw)); return; }
    // Primera vez en la v3: se parte del estado de la v2 (si lo hay), reordenado.
    const rawV2 = localStorage.getItem('evalies_colstate');
    if (rawV2) {
      const cs = JSON.parse(rawV2);
      // Las claves del formato antiguo (sin sufijo de evaluación) nunca se leen.
      Object.keys(cs).forEach(k => { if (!/_(eval[123]|shared)$/.test(k)) delete cs[k]; });
      _colStateNombrePrimero(cs);
      Object.assign(_colState, cs);
    }
    saveColState();
  } catch(e) {}
}

let _activeColPanel = null;

function closeColManager() {
  if (_activeColPanel) {
    _activeColPanel.remove();
    _activeColPanel = null;
  }
}

document.addEventListener('click', function(e) {
  if (_activeColPanel &&
      !_activeColPanel.contains(e.target) &&
      !e.target.closest('.col-manager-btn')) {
    closeColManager();
  }
});

function openColManager(e, nivel, grupo) {
  e.stopPropagation();
  closeColManager();

  const key = `${nivel}-${grupo}`;
  const evalTab = (window._evalTab && window._evalTab[key]) || 'eval1';
  const defs = getColDefs(nivel, evalTab);
  const cs = getColState(key, nivel, evalTab);

  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();

  const panel = document.createElement('div');
  panel.className = 'col-manager-panel open';

  const panelH = Math.min(520, 110 + defs.length * 30);
  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow > panelH ? rect.bottom + 6 : rect.top - panelH - 6;
  const left = Math.max(8, Math.min(rect.right - 320, window.innerWidth - 328));
  panel.style.cssText = `top:${top}px;left:${left}px;`;

  // Track which items are checkbox-selected in the panel (separate from col visibility)
  // Key: col index → boolean
  const panelSel = {};

  function getSelCount() {
    return Object.values(panelSel).filter(Boolean).length;
  }

  const evalTabLabel = { eval1: 'I Evaluación', eval2: 'II Evaluación', eval3: 'Evaluación Final' }[evalTab];

  function renderPanel() {
    const hiddenCount = cs.visible.filter((v, i) => !v && !cs.deleted[i]).length;
    const deletedCount = cs.deleted.filter(Boolean).length;
    const selCount = getSelCount();

    let lastShared = null;
    const items = defs.map(([label, required, isShared], i) => {
      if (cs.deleted[i]) return '';
      if (!label && required) return '';
      const visible = cs.visible[i];
      const labelDisplay = label || `Col. ${i+1}`;
      const checked = !!panelSel[i];
      const header = (isShared !== lastShared)
        ? `<div class="col-manager-group-header">${isShared ? 'Columnas comunes (afectan a las 3 evaluaciones)' : 'Columnas de esta evaluación'}</div>`
        : '';
      lastShared = isShared;
      return `${header}<label class="col-manager-item${required ? ' required' : ''}" onclick="event.stopPropagation()">
        <input type="checkbox" ${checked ? 'checked' : ''}
          onchange="(function(cb,idx){_cmSel(idx,cb.checked);})(this,${i})">
        <span class="col-manager-label${!visible ? ' hidden-label' : ''}">${labelDisplay}</span>
        ${!visible ? '<span style="font-size:9px;color:var(--text3);margin-left:2px">●</span>' : ''}
        ${!required ? `<button class="col-manager-delete" title="Eliminar columna permanentemente"
          onclick="event.preventDefault();event.stopPropagation();deleteCol('${nivel}','${grupo}',${i})">🗑</button>` : ''}
      </label>`;
    }).join('');

    panel.innerHTML = `
      <div class="col-manager-header">
        <span class="col-manager-title">⚙ Columnas — ${evalTabLabel}</span>
        <button class="col-manager-reset" onclick="resetCols('${nivel}','${grupo}')">↺ Restaurar</button>
      </div>
      <div style="padding:0 14px 6px;font-size:10px;color:var(--text3);line-height:1.4;">
        Las columnas comunes (Lengua Base, NESE, Compensatoria, Pend. Ant.…) se ocultan igual en las tres evaluaciones. Las propias de esta pestaña (I/II/III Eval., su propuesta, asistencia y convivencia) solo afectan aquí.
      </div>
      <div class="col-manager-actions">
        <button class="col-manager-act" onclick="_cmSelAll(true)"   title="Marcar todas">☑ Todas</button>
        <button class="col-manager-act" onclick="_cmSelAll(false)"  title="Desmarcar todas">☐ Ninguna</button>
        <button class="col-manager-act" onclick="_cmSelHidden()"    title="Seleccionar las ocultas">○ Ocultas</button>
        <span class="col-manager-sel-count" id="cmSelCount">${selCount ? selCount + ' sel.' : ''}</span>
      </div>
      <div class="col-manager-list">${items}</div>
      <div style="display:flex;gap:6px;padding:8px 14px 6px;border-top:1px solid var(--border);">
        <button class="col-manager-act hide" style="flex:1" onclick="_cmApplyHide('${nivel}','${grupo}')">👁 Ocultar sel.</button>
        <button class="col-manager-act show" style="flex:1" onclick="_cmApplyShow('${nivel}','${grupo}')">✓ Mostrar sel.</button>
      </div>
      <div class="col-manager-footer">
        <span>${hiddenCount > 0 ? `${hiddenCount} oculta${hiddenCount>1?'s':''}` : 'Todas visibles'}</span>
        <span>${deletedCount > 0 ? `<span style="color:var(--red)">${deletedCount} eliminada${deletedCount>1?'s':''}</span>` : ''}</span>
      </div>
    `;
  }

  // Expose helpers on window so inline handlers can reach them
  window._cmSel = function(idx, checked) {
    panelSel[idx] = checked;
    const countEl = panel.querySelector('#cmSelCount');
    if (countEl) { const n = getSelCount(); countEl.textContent = n ? n + ' sel.' : ''; }
  };
  window._cmSelAll = function(val) {
    defs.forEach(([label, required], i) => {
      if (!cs.deleted[i] && label) panelSel[i] = val;
    });
    renderPanel();
  };
  window._cmSelHidden = function() {
    defs.forEach(([label, required], i) => {
      if (!cs.deleted[i] && label) panelSel[i] = !cs.visible[i];
    });
    renderPanel();
  };
  window._cmApplyHide = function(niv, grp) {
    const k = `${niv}-${grp}`;
    const s = getColState(k, niv, evalTab);
    let changed = false;
    Object.keys(panelSel).forEach(i => {
      if (panelSel[i] && !getColDefs(niv, evalTab)[i]?.[1]) { // not required
        s.visible[+i] = false; changed = true;
      }
    });
    if (changed) { saveColState(); applyColVisibility(k, niv, evalTab); renderFilterBar(niv, grp); renderPanel(); }
  };
  window._cmApplyShow = function(niv, grp) {
    const k = `${niv}-${grp}`;
    const s = getColState(k, niv, evalTab);
    let changed = false;
    Object.keys(panelSel).forEach(i => {
      if (panelSel[i]) { s.visible[+i] = true; changed = true; }
    });
    if (changed) { saveColState(); applyColVisibility(k, niv, evalTab); renderFilterBar(niv, grp); renderPanel(); }
  };

  panel._renderPanel = renderPanel;
  renderPanel();
  document.body.appendChild(panel);
  _activeColPanel = panel;
}

function toggleColVisible(nivel, grupo, colIdx) {
  const key = `${nivel}-${grupo}`;
  const evalTab = (window._evalTab && window._evalTab[key]) || 'eval1';
  const cs = getColState(key, nivel, evalTab);
  cs.visible[colIdx] = !cs.visible[colIdx];
  saveColState();
  // Re-render panel
  if (_activeColPanel && _activeColPanel._renderPanel) _activeColPanel._renderPanel();
  // Apply visibility to table without full re-render
  applyColVisibility(key, nivel, evalTab);
  // Refresh filter bar button state
  renderFilterBar(nivel, grupo);
}

async function deleteCol(nivel, grupo, colIdx) {
  if (!await confirmar('¿Eliminar esta columna permanentemente? Para recuperarla usa "Restaurar todas".')) return;
  const key = `${nivel}-${grupo}`;
  const evalTab = (window._evalTab && window._evalTab[key]) || 'eval1';
  const cs = getColState(key, nivel, evalTab);
  cs.deleted[colIdx] = true;
  cs.visible[colIdx] = false;
  saveColState();
  if (_activeColPanel && _activeColPanel._renderPanel) _activeColPanel._renderPanel();
  updateTable(nivel, grupo); // full re-render to remove col from colgroup/thead/tbody
  closeColManager();
  renderFilterBar(nivel, grupo);
}

function resetCols(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const evalTab = (window._evalTab && window._evalTab[key]) || 'eval1';
  const n = getColDefs(nivel, evalTab).length;
  delete _colState[`${key}_shared`];
  delete _colState[`${key}_${evalTab}`];
  saveColState();
  if (_activeColPanel && _activeColPanel._renderPanel) _activeColPanel._renderPanel();
  updateTable(nivel, grupo);
  closeColManager();
  renderFilterBar(nivel, grupo);
}

function applyColVisibility(key, nivel, evalTab) {
  const tbl = document.getElementById(`tbl-${key}`);
  if (!tbl) return;
  if (!evalTab) evalTab = (window._evalTab && window._evalTab[key]) || 'eval1';
  const cs = getColState(key, nivel, evalTab);
  const actualCols = tbl.querySelectorAll('col[data-col]').length;
  // If colState length doesn't match actual columns (e.g. stale data from before
  // a column was added/removed), skip visibility manipulation to avoid mismatches
  if (cs.visible.length !== actualCols) {
    const parts2 = key.split('-'); const grp2 = parts2.pop(); const niv2 = parts2.join('-');
    requestAnimationFrame(() => updateStickyOffset(niv2, grp2));
    return;
  }
  // Apply to colgroup cols
  tbl.querySelectorAll('col[data-col]').forEach(col => {
    const i = parseInt(col.dataset.col);
    const show = !cs.deleted[i] && cs.visible[i];
    col.classList.toggle('col-hidden', !show);
  });
  // Apply to thead th (skip cb-col y las columnas de acciones del final, que
  // no forman parte de la configuración de columnas visibles/ocultas)
  tbl.querySelectorAll('thead th:not(.cb-col):not(.accion-col)').forEach((th, i) => {
    const show = !cs.deleted[i] && cs.visible[i];
    th.classList.toggle('col-hidden', !show);
  });
  // Apply to tbody tr td (skip cb-col y columnas de acciones)
  tbl.querySelectorAll('tbody tr').forEach(row => {
    row.querySelectorAll('td:not(.cb-col):not(.accion-col)').forEach((td, i) => {
      const show = !cs.deleted[i] && cs.visible[i];
      td.classList.toggle('col-hidden', !show);
    });
  });
  // Re-sync sticky nombre offset after visibility changes
  const parts = key.split('-');
  const grupo = parts.pop();
  const niv = parts.join('-');
  requestAnimationFrame(() => updateStickyOffset(niv, grupo));
}

function updateTable(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const tw = document.getElementById(`table-${key}`);
  if (!tw) return;
  const rawAlumnos = data[nivel][grupo];
  // Contador de la cabecera de la sección («N alumnos registrados»), también al añadir o quitar.
  const _meta = tw.parentElement && tw.parentElement.querySelector('.section-meta');
  if (_meta) _meta.textContent = `${rawAlumnos.length} alumno${rawAlumnos.length===1?'':'s'} registrado${rawAlumnos.length===1?'':'s'}`;

  // Render filter bar
  renderFilterBar(nivel, grupo);

  // Apply filters then sort
  const filtered = getAppliedFilters(key, rawAlumnos);
  const alumnos = getSortedAlumnos(key, filtered);

  // Update filter result count
  const frc = document.getElementById('filterResultCount');
  if (frc) {
    const fs = getFilterState(key);
    if (Object.keys(fs).length) {
      frc.textContent = `${filtered.length} de ${rawAlumnos.length} alumnos`;
      frc.style.display = '';
    } else {
      frc.textContent = '';
    }
  }

  // Default column widths (px), stored per key
  if (!window.colWidths) window.colWidths = {};
  const bach = isBach(nivel);

  // ── EVAL TAB AWARE COLUMNS ──────────────────────────────────────────
  if (!window._evalTab) window._evalTab = {};
  const evalTab = window._evalTab[key] || 'eval1';

  // ── PESTAÑA NESE: lista de alumnado NESE con acceso a su PAP / EC ──
  if (evalTab === 'nese') {
    renderNeseTabPanel(nivel, grupo, tw, rawAlumnos);
    return;
  }

  // Shared base columns (always shown)
  // v3: «Alumno / a» es la PRIMERA columna (antes la 6.ª), así queda fija a la izquierda
  // y se ve en el iPad. El estado de columnas guardado se reordena una vez (loadColState).
  // Then eval-specific, then shared trailing
  let colNames, thClasses, sortCols;

  const baseNames = ['Alumno / a','Lengua Base','CEIP Origen','Curso','Grupo','Repetidor','F. Nacimiento','Edad Actual','NESE','Recurso NESE','Compensatoria','Cód. Comp.','Pend. Ant.'];
  const baseClasses = ['','','','','','','','','','','','comp-code-th',''];
  const baseSorts = ['nombre',null,null,null,null,null,'fecha',null,'nese',null,null,null,null];
  // (ver nota en getColDefs: aquí había dos columnas más, '📝' y una vacía,
  // sin celda real correspondiente — retiradas por el mismo motivo.)

  if (evalTab === 'eval1') {
    colNames  = [...baseNames, 'I Eval.','I Pend.','I Prop.','F. Just.','F. Injust.','AC','Partes','Expedientes'];
    thClasses = [...baseClasses,'group-eval1','group-eval1','group-eval1','group-conv','group-conv','group-conv','group-conv','group-conv'];
    sortCols  = [...baseSorts, 'eval1',null,null,null,null,null,null,null];
  } else if (evalTab === 'eval2') {
    colNames  = [...baseNames, 'II Eval.','II Pend.','II Prop.','F. Just.','F. Injust.','AC','Partes','Expedientes'];
    thClasses = [...baseClasses,'group-eval2','group-eval2','group-eval2','group-conv','group-conv','group-conv','group-conv','group-conv'];
    sortCols  = [...baseSorts, 'eval2',null,null,null,null,null,null,null];
  } else { // eval3
    const pendLabel = bach ? 'Pend. III Ev.' : 'Pend. Próx. Curso';
    const extrCols = bach ? ['Eval. Extr.','Pend. Extr.'] : [];
    const extrClasses = bach ? ['group-eval3','group-eval3'] : [];
    const extrSorts = bach ? [null,null] : [];
    colNames  = [...baseNames, 'Recuperadas', 'III Eval.', pendLabel, ...extrCols, 'Promociona', 'F. Just.','F. Injust.','AC','Partes','Expedientes'];
    thClasses = [...baseClasses,'group-rec','group-eval3','group-eval3',...extrClasses,'','group-conv','group-conv','group-conv','group-conv','group-conv'];
    sortCols  = [...baseSorts, null,'eval3',null,...extrSorts,'propuesta',null,null,null,null,null];
  }

  const defaults = colNames.map(() => 120);
  const _nombreIdx = colNames.indexOf('Alumno / a');
  if (_nombreIdx >= 0) defaults[_nombreIdx] = 180; // Alumno
  defaults[colNames.indexOf('Lengua Base')] = 130;
  defaults[colNames.indexOf('CEIP Origen')] = 150;
  const cols = window.colWidths[key+'_'+evalTab] || (window.colWidths[key+'_'+evalTab] = [...defaults]);

  const ss = _sortState[key] || {};

  const colgroup = '<colgroup><col class="cb-col" style="width:36px">' + cols.map((w,i)=>`<col data-col="${i}" style="width:${w}px">`).join('') + '<col style="width:44px"><col style="width:44px"><col style="width:44px"><col style="width:44px"><col style="width:48px"></colgroup>';

  function makeResizer(colIdx) {
    return `<div class="col-resizer" data-col="${colIdx}" onmousedown="startResize(event,'${nivel}','${grupo}',${colIdx})"></div>`;
  }

  const headers = colNames.map((name, i) => {
    const sk = sortCols[i];
    const cls = (thClasses[i] ? thClasses[i] + ' resizable-th' : 'resizable-th') + (sk ? ' sortable-th' : '') + (name === 'Alumno / a' ? ' sticky-nombre' : '');
    const sortClick = sk ? `onclick="setSortCol('${nivel}','${grupo}','${sk}')"` : '';
    const indicator = sk ? `<span class="sort-indicator${ss.col===sk?' active':''}">${ss.col===sk?(ss.dir==='asc'?'▲':'▼'):'⇅'}</span>` : '';
    // Botón de imprimir informe encima de la columna "Promociona"
    if (name === 'Promociona') {
      const printBtn = `<button class="th-print-btn" title="Imprimir informe de promoción del grupo (PDF)" onclick="event.stopPropagation();printPromocionaGrupo('${nivel}','${grupo}')">🖨️ Imprimir</button>`;
      return `<th class="${cls}" style="width:${cols[i]}px;min-width:${cols[i]}px;" ${sortClick}><span class="th-print-wrap">${printBtn}<span>${name}${indicator}</span></span>${makeResizer(i)}</th>`;
    }
    return `<th class="${cls}" style="width:${cols[i]}px;min-width:${cols[i]}px;" ${sortClick}>${name}${indicator}${makeResizer(i)}</th>`;
  }).join('');

  const cbTh = `<th class="cb-col"><input type="checkbox" class="all-cb" title="Seleccionar todos" onchange="bulkToggleAll('${nivel}','${grupo}',this.checked)"></th>`;
  // Encabezados de las columnas de acciones: sin ellos, el navegador las
  // comprimía al mínimo y los iconos se recortaban.
  const tailHeaders = `
    <th class="accion-col" style="width:44px;min-width:44px;text-align:center" title="Historial académico">📅</th>
    <th class="accion-col" style="width:44px;min-width:44px;text-align:center" title="Informe de seguimiento">📋</th>
    <th class="accion-col" style="width:44px;min-width:44px;text-align:center" title="Seguimiento con familia">📞</th>
    <th class="accion-col" style="width:44px;min-width:44px;text-align:center" title="Mover de grupo">↗</th>
    <th class="accion-col" style="width:48px;min-width:48px;text-align:center" title="Eliminar"></th>`;
  const tailWidth = 44*4 + 48;

  let html = `
    <div class="table-scroll">
    <table id="tbl-${key}" class="${window._compactMode?'tbl-compact':''}" style="width:${cols.reduce((a,b)=>a+b,0)+36+tailWidth}px;">
      ${colgroup}
      <thead><tr>${cbTh}${headers}${tailHeaders}</tr></thead>
      <tbody>
  `;

  alumnos.forEach((a, _i) => {
    // Use real index in data array for mutations
    const i = rawAlumnos.indexOf(a);
    const ageStyle = 'text-align:center;font-family:inherit;font-weight:600;font-size:13px;';
    const promoTipo = (a.promociona && typeof a.promociona === 'object') ? a.promociona.tipo : a.promociona;
    const promoBadge = promoTipo === 'Promoción' || promoTipo === 'Titulación' ? 'badge-green' : promoTipo === 'Repetición' || promoTipo === 'No Titula' || promoTipo === 'No Promociona' ? 'badge-red' : 'badge-yellow';

    const e1Color = a.eval1 === 0 ? 'var(--green)' : a.eval1 >= 4 ? 'var(--red)' : a.eval1 >= 1 ? 'var(--accent)' : 'var(--text)';
    const e2Color = a.eval2 === 0 ? 'var(--green)' : a.eval2 >= 4 ? 'var(--red)' : a.eval2 >= 1 ? 'var(--accent)' : 'var(--text)';
    const e3Color = a.eval3 === 0 ? 'var(--green)' : a.eval3 >= 4 ? 'var(--red)' : a.eval3 >= 1 ? 'var(--accent)' : 'var(--text)';

    const hasNote = !!(a.notas && a.notas.trim());
    const hasData = !!(a.nombre && (a.eval3 > 0 || getPropObj(a.propuesta3).tipo));
    const pendiente = hasData && !getPropObj(a.promociona).tipo;

    const trendVal = ((+a.eval2 > 0) || (+a.eval3 > 0)) ? (+a.eval3 - +a.eval2) : null;
    const trendHtml = trendVal === null ? '' :
      trendVal < 0 ? `<span class="trend-up" title="Mejora: ${Math.abs(trendVal)} mat. menos">↑</span>` :
      trendVal > 0 ? `<span class="trend-down" title="Empeora: ${trendVal} mat. más">↓</span>` :
      `<span class="trend-flat" title="Sin cambio entre II y III Eval.">→</span>`;
    const tooltipHtml = hasNote ? `<div class="nombre-tooltip">📝 ${a.notas.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '';
    const isCritical = (+a.eval3 >= 5) && !getPropObj(a.promociona).tipo;
    const criticalBadge = isCritical ? `<span class="critical-badge" title="≥5 suspensos sin decisión">🚨 CRÍTICO</span>` : '';
    const rowColorClass = promoTipo === 'Promoción' ? 'row-promo' : promoTipo === 'Titulación' ? 'row-titula' : promoTipo === 'Repetición' || promoTipo === 'No Promociona' ? 'row-repite' : promoTipo === 'Abandono' ? 'row-abandono' : '';

    // Helper: number input for convivencia fields
    function numCell(field, max, color) {
      const val = a[field] || 0;
      const dispColor = val > 0 ? color : 'var(--text3)';
      return `<td style="text-align:center"><input class="num-mini" type="number" min="0" max="${max}" value="${val}"
        style="color:${dispColor}"
        onchange="withUndo('${nivel}','${grupo}',()=>{updateField('${nivel}','${grupo}',${i},'${field}',+this.value);this.style.color=+this.value>0?'${color}':'var(--text3)';})" /></td>`;
    }

    // Lengua Base + CEIP Origen — ahora columnas base, comunes a TODAS las evaluaciones
    const lbVal = a.lenguaBase||'';
    const lbColor = lbVal==='Castellano'?'var(--accent)':lbVal==='Valenciano'?'var(--green)':'var(--text3)';
    const ceipVal = a.colegioProcedencia||'';
    const isOtros = !!(ceipVal && !CEIP_KNOWN.includes(ceipVal));
    const ceipColor = ceipVal&&!isOtros?'var(--green)':isOtros?'var(--yellow)':'var(--text3)';
    const opts = CEIP_KNOWN.map(c=>`<option value="${c.replace(/"/g,'&quot;')}" ${ceipVal===c?'selected':''}>${c}</option>`).join('');

    // Base shared cells (always present in all eval tabs)
    const baseCells = `
      <td class="td-nombre sticky-nombre">
        <div class="nombre-cell">
          <div class="nombre-cell-top">
            <input class="cell-input" value="${a.nombre.replace(/"/g,'&quot;')}" onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'nombre',this.value))" placeholder="Apellidos, Nombre" style="min-width:0"/>
            ${evalTab === 'eval3' ? trendHtml : ''}
            <button class="notes-btn obs-inline${hasNote?' has-note':''}" title="${hasNote?'Ver / editar observaciones':'Añadir observaciones'}"
              onclick="openNotesPanel(event,'${nivel}','${grupo}',${i})">📝</button>
          </div>
          ${(pendiente || isCritical) && evalTab === 'eval3' ? `<div class="nombre-cell-badges">
            ${pendiente ? '<span class="pending-badge">pendiente</span>' : ''}
            ${criticalBadge}
          </div>` : ''}
          ${tooltipHtml}
        </div>
      </td>
      <td>
        <select class="cell-input" style="color:${lbColor}" onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'lenguaBase',this.value))">
          <option value="" ${!lbVal?'selected':''}>— No vota</option>
          <option value="Castellano" ${lbVal==='Castellano'?'selected':''}>Castellano</option>
          <option value="Valenciano" ${lbVal==='Valenciano'?'selected':''}>Valenciano</option>
        </select>
      </td>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <select class="cell-input" style="color:${ceipColor}" onchange="(function(s){var td=s.closest('td');var inp=td.querySelector('.ceip-inp');if(s.value==='__otros__'){inp.style.display='';inp.focus();}else{inp.style.display='none';withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'colegioProcedencia',s.value));}})(this)">
            <option value="" ${!ceipVal?'selected':''}>—</option>
            ${opts}
            <option value="__otros__" ${isOtros?'selected':''}>Otros…</option>
          </select>
          <input class="cell-input ceip-inp" type="text" placeholder="Centro, Municipio" value="${isOtros?ceipVal.replace(/"/g,'&quot;'):''}" style="display:${isOtros?'block':'none'};font-size:11px;" onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'colegioProcedencia',this.value))" />
        </div>
      </td>
      <td><span class="badge badge-blue">${nivel}</span></td>
      <td><span class="badge badge-gray">${grupo}</span></td>
      <td>
        <select class="cell-input" onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'repetidor',this.value))">
          <option ${!a.repetidor||a.repetidor==='No'?'selected':''} value="No">No</option>
          <option ${a.repetidor==='Sí'?'selected':''} value="Sí">Sí</option>
        </select>
      </td>
      <td><input class="cell-input" type="date" value="${a.fecha}" onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'fecha',this.value))" /></td>
      <td style="${ageStyle}color:var(--text2)">${calcEdad(a.fecha) !== '' ? calcEdad(a.fecha) : '—'}</td>
      <td>
        <select class="cell-input" onchange="withUndo('${nivel}','${grupo}',()=>{updateField('${nivel}','${grupo}',${i},'nese',this.value);updateStats('${nivel}','${grupo}');updateCharts('${nivel}','${grupo}');updateTable('${nivel}','${grupo}');})" style="color:${a.nese==='Sí'?'var(--yellow)':'var(--text3)'}">
          <option value="" ${!a.nese?'selected':''}>—</option>
          <option value="Sí" ${a.nese==='Sí'?'selected':''}>Sí</option>
          <option value="No" ${a.nese==='No'?'selected':''}>No</option>
        </select>
      </td>
      <td>
        ${(()=>{
          const rn = _getNeseCodes(a.recursoNese);
          const hasAL = rn.includes('AL'), hasPT = rn.includes('PT');
          const hasPAP = !!a.papActivo, hasEC = !!a.ecActivo;
          const papEditBtn = hasPAP ? `<span class="pap-btn" title="Abrir el Plan de Actuación Personalizado (PAP)" onclick="openPapModal('${nivel}','${grupo}',${i})">📋 Editar${a.pap&&a.pap._touched?'<span class="nese-doc-dot"></span>':''}</span>` : '';
          const ecEditBtn = hasEC ? `<span class="ac-btn" title="Abrir el Programa de Enriquecimiento Curricular" onclick="openAcModal('${nivel}','${grupo}',${i})">🎓 Editar${a.ac&&a.ac._touched?'<span class="nese-doc-dot"></span>':''}</span>` : '';
          const medidasBlock = a.nese==='Sí' ? `<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
              <span class="nese-pill${hasPAP?' nese-pill-on':''}" title="¿Tiene Plan de Actuación Personalizado (PAP)?" onclick="withUndo('${nivel}','${grupo}',()=>_toggleMedidaExtra('${nivel}','${grupo}',${i},'papActivo'))">PAP</span>
              <span class="nese-pill${hasEC?' nese-pill-on':''}" title="¿Tiene Programa de Enriquecimiento Curricular (EC)?" onclick="withUndo('${nivel}','${grupo}',()=>_toggleMedidaExtra('${nivel}','${grupo}',${i},'ecActivo'))">EC</span>
            </div>${(papEditBtn||ecEditBtn) ? `<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">${papEditBtn}${ecEditBtn}</div>` : ''}` : '';
          return `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
              <span class="nese-pill${hasAL?' nese-pill-on':''}" title="Audición y Lenguaje" onclick="withUndo('${nivel}','${grupo}',()=>_toggleNeseCode('${nivel}','${grupo}',${i},'AL'))">AL</span>
              <span class="nese-pill${hasPT?' nese-pill-on':''}" title="Pedagogía Terapéutica" onclick="withUndo('${nivel}','${grupo}',()=>_toggleNeseCode('${nivel}','${grupo}',${i},'PT'))">PT</span>
            </div>
            ${medidasBlock}
          </div>`;
        })()}
      </td>
      <td>
        <select class="cell-input" onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'compensatoria',this.value))">
          <option value="" ${!a.compensatoria?'selected':''}>—</option>
          <option ${a.compensatoria==='Sí'?'selected':''} value="Sí">Sí</option>
          <option ${a.compensatoria==='No'?'selected':''} value="No">No</option>
        </select>
      </td>
      <td class="multicode-cell">
        ${(()=>{
          const codes = Array.isArray(a.codComp) ? a.codComp : (a.codComp ? [a.codComp] : []);
          const pills = codes.length ? codes.map(c=>`<span class="code-pill">${c}</span>`).join('') : '<span class="multicode-placeholder">—</span>';
          return `<div class="multicode-display" onclick="openMultiCode(event,'${nivel}','${grupo}',${i})">${pills}</div>`;
        })()}
      </td>
      <td>${buildPendientesDisplay(a.pendientesAnteriores||[], nivel, grupo, i, 'ant')}</td>`;

    // Tail cells (always at end) — cada acción en su propia celda con ancho
    // propio: amontonadas en una sola, la columna se comprimía y los iconos
    // se recortaban mostrando puntos suspensivos.
    const tailCells = `
      <td class="accion-col" style="text-align:center;width:44px;min-width:44px">
        <button class="hist-btn${(a.historial&&a.historial.length)?' has-hist':''}" title="Historial académico" onclick="openHistorial('${nivel}','${grupo}',${i})">📅</button>
      </td>
      <td class="accion-col" style="text-align:center;width:44px;min-width:44px">
        <button class="move-btn" title="Informe de seguimiento" onclick="printSeguimientoAlumno('${nivel}','${grupo}',${i})" style="color:var(--green)">📋</button>
      </td>
      <td class="accion-col" style="text-align:center;width:44px;min-width:44px">
        <button class="move-btn" title="Seguimiento con familia (reuniones a petición de los padres)" onclick="openSegFamilia('${nivel}','${grupo}',${i})" style="color:#f76ea0">📞</button>
      </td>
      <td class="accion-col" style="text-align:center;width:44px;min-width:44px">
        <button class="move-btn" title="Mover a otro grupo/nivel" onclick="openMovePanel(event,'${nivel}','${grupo}',${i})">↗</button>
      </td>
      <td class="accion-col" style="text-align:center;width:48px;min-width:48px"><button class="btn btn-danger" onclick="(async()=>{if(await confirmar('¿Eliminar a ${a.nombre.replace(/'/g,"\\'")}?')){withUndo('${nivel}','${grupo}',()=>deleteAlumnoNoConfirm('${nivel}','${grupo}',${i}))}})()">✕</button></td>`;

    // Eval-specific cells
    let evalCells = '';
    if (evalTab === 'eval1') {
      const p1 = a.propuesta1 && typeof a.propuesta1==='object' ? a.propuesta1 : {tipo:'',destino:''};
      evalCells = `
        <td style="text-align:center">
          <input class="cell-input" type="number" min="0" max="12" value="${a.eval1}"
            oninput="(function(el){var v=+el.value;el.style.color=v===0?'var(--green)':v>=4?'var(--red)':v>=1?'var(--accent)':'var(--text)';})(this)"
            onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'eval1',+this.value))"
            style="width:60px;text-align:center;color:${e1Color};font-weight:600;font-family:inherit" />
        </td>
        <td>${buildPendientesDisplay(a.pendientes1||[], nivel, grupo, i, 'p1')}</td>
        <td>
          <div class="propuesta-display" data-field="propuesta1" onclick="openPropuesta(event,'${nivel}','${grupo}',${i},'propuesta1')">${buildPropuestaPills(p1)}</div>
        </td>
        ${numCell('faltasJust1', 999, 'var(--yellow)')}
        ${numCell('faltasInjust1', 999, 'var(--red)')}
        ${numCell('ac1', 99, 'var(--orange)')}
        ${numCell('partes1', 99, 'var(--red)')}
        ${numCell('expedientes1', 99, 'var(--purple)')}`;
    } else if (evalTab === 'eval2') {
      const p2 = a.propuesta2 && typeof a.propuesta2==='object' ? a.propuesta2 : {tipo:'',destino:''};
      evalCells = `
        <td style="text-align:center">
          <input class="cell-input" type="number" min="0" max="12" value="${a.eval2}"
            oninput="(function(el){var v=+el.value;el.style.color=v===0?'var(--green)':v>=4?'var(--red)':v>=1?'var(--accent)':'var(--text)';})(this)"
            onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'eval2',+this.value))"
            style="width:60px;text-align:center;color:${e2Color};font-weight:600;font-family:inherit" />
        </td>
        <td>${buildPendientesDisplay(a.pendientes2||[], nivel, grupo, i, 'p2')}</td>
        <td>
          <div class="propuesta-display" data-field="propuesta2" onclick="openPropuesta(event,'${nivel}','${grupo}',${i},'propuesta2')">${buildPropuestaPills(p2)}</div>
        </td>
        ${numCell('faltasJust2', 999, 'var(--yellow)')}
        ${numCell('faltasInjust2', 999, 'var(--red)')}
        ${numCell('ac2', 99, 'var(--orange)')}
        ${numCell('partes2', 99, 'var(--red)')}
        ${numCell('expedientes2', 99, 'var(--purple)')}`;
    } else { // eval3
      const pm = a.promociona && typeof a.promociona==='object' ? a.promociona : {tipo:'',destino:''};
      const extrCells = bach ? `
        <td style="text-align:center">
          <input class="cell-input" type="number" min="0" max="20" style="width:60px;text-align:center;font-family:inherit;font-weight:700;color:${(a.evalExtr||0)===0?'var(--green)':(a.evalExtr||0)>=4?'var(--red)':'var(--yellow)'}"
            value="${a.evalExtr||''}" placeholder="—"
            onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'evalExtr',this.value===''?0:parseInt(this.value)))" />
        </td>
        <td>${buildPendientesDisplay(a.pendientesExtr||[], nivel, grupo, i, 'extr')}</td>` : '';
      evalCells = `
        <td>${buildRecuperadasDisplay(a, nivel, grupo, i)}</td>
        <td style="text-align:center">
          <input class="cell-input" type="number" min="0" max="12" value="${a.eval3}"
            oninput="(function(el){var v=+el.value;el.style.color=v===0?'var(--green)':v>=4?'var(--red)':v>=1?'var(--accent)':'var(--text)';})(this)"
            onchange="withUndo('${nivel}','${grupo}',()=>updateField('${nivel}','${grupo}',${i},'eval3',+this.value))"
            style="width:60px;text-align:center;color:${e3Color};font-weight:600;font-family:inherit" />
        </td>
        <td>${buildPendientesDisplay(a.pendientesIII||[], nivel, grupo, i, 'iii')}</td>
        ${extrCells}
        <td>
          <div class="propuesta-display" data-field="promociona" onclick="openPropuesta(event,'${nivel}','${grupo}',${i},'promociona')">${buildPropuestaPills(pm)}</div>
        </td>
        ${numCell('faltasJust3', 999, 'var(--yellow)')}
        ${numCell('faltasInjust3', 999, 'var(--red)')}
        ${numCell('ac3', 99, 'var(--orange)')}
        ${numCell('partes3', 99, 'var(--red)')}
        ${numCell('expedientes3', 99, 'var(--purple)')}`;
    }

    html += `
      <tr data-idx="${i}"${(pendiente && evalTab==='eval3') ? ' class="row-pending ' + rowColorClass + '"' : rowColorClass ? ' class="' + rowColorClass + '"' : ''}>
        <td class="cb-col"><input type="checkbox" class="row-cb" onchange="bulkToggleRow('${nivel}','${grupo}',${i},this.checked)"></td>
        ${baseCells}
        ${evalCells}
        ${tailCells}
    `;
  });

  // Footer stats adapted per eval tab
  let pendienteStr = '', criticalStr = '', pendientesFooterStr = '', pctDecision = 0;
  if (evalTab === 'eval1') {
    const sinProp1 = rawAlumnos.filter(a => a.nombre && !getPropObj(a.propuesta1).tipo).length;
    pendienteStr = sinProp1 > 0
      ? ` | <span style="color:var(--accent);font-weight:600">📘 ${sinProp1} sin propuesta I Eval.</span>`
      : ` | <span style="color:var(--green);font-weight:600">✓ Todas las propuestas I Eval. hechas</span>`;
    const totalFJ1 = rawAlumnos.reduce((s,a)=>s+(+a.faltasJust1||0),0);
    const totalFI1 = rawAlumnos.reduce((s,a)=>s+(+a.faltasInjust1||0),0);
    const totalP1  = rawAlumnos.reduce((s,a)=>s+(+a.partes1||0),0);
    pendientesFooterStr = totalFI1 > 0 || totalP1 > 0
      ? ` | <span style="color:var(--orange);font-weight:600">📋 ${totalFJ1}J / ${totalFI1}I faltas · ${totalP1} partes</span>` : '';
    pctDecision = rawAlumnos.length ? Math.round(rawAlumnos.filter(a=>a.nombre&&getPropObj(a.propuesta1).tipo).length / rawAlumnos.length * 100) : 0;
  } else if (evalTab === 'eval2') {
    const sinProp2 = rawAlumnos.filter(a => a.nombre && !getPropObj(a.propuesta2).tipo).length;
    pendienteStr = sinProp2 > 0
      ? ` | <span style="color:var(--green);font-weight:600">📗 ${sinProp2} sin propuesta II Eval.</span>`
      : ` | <span style="color:var(--green);font-weight:600">✓ Todas las propuestas II Eval. hechas</span>`;
    const totalFJ2 = rawAlumnos.reduce((s,a)=>s+(+a.faltasJust2||0),0);
    const totalFI2 = rawAlumnos.reduce((s,a)=>s+(+a.faltasInjust2||0),0);
    const totalP2  = rawAlumnos.reduce((s,a)=>s+(+a.partes2||0),0);
    pendientesFooterStr = totalFI2 > 0 || totalP2 > 0
      ? ` | <span style="color:var(--orange);font-weight:600">📋 ${totalFJ2}J / ${totalFI2}I faltas · ${totalP2} partes</span>` : '';
    pctDecision = rawAlumnos.length ? Math.round(rawAlumnos.filter(a=>a.nombre&&getPropObj(a.propuesta2).tipo).length / rawAlumnos.length * 100) : 0;
  } else {
    const pendienteCount = rawAlumnos.filter(a =>
      !!(a.nombre && (a.eval3 > 0 || getPropObj(a.propuesta3).tipo)) && !getPropObj(a.promociona).tipo
    ).length;
    const decisionadas = rawAlumnos.filter(a => !!getPropObj(a.promociona).tipo).length;
    pctDecision = rawAlumnos.length ? Math.round(decisionadas / rawAlumnos.length * 100) : 0;
    const criticalCount = rawAlumnos.filter(a => (+a.eval3 >= 5) && !getPropObj(a.promociona).tipo).length;
    pendienteStr = pendienteCount > 0
      ? ` | <span style="color:var(--red);font-weight:600">⚠ ${pendienteCount} sin decisión final</span>`
      : ` | <span style="color:var(--green);font-weight:600">✓ Todas las decisiones tomadas</span>`;
    criticalStr = criticalCount > 0
      ? ` | <span style="color:var(--red);font-weight:700">🚨 ${criticalCount} alumno${criticalCount>1?'s':''} crítico${criticalCount>1?'s':''}</span>`
      : '';
    const conPendTotal = rawAlumnos.filter(a=>(a.pendientesIII||[]).length+(a.pendientesExtr||[]).length>0).length;
    pendientesFooterStr = conPendTotal > 0
      ? ` | <span style="color:var(--yellow);font-weight:600">📚 ${conPendTotal} con mat. pendientes</span>` : '';
    const totalFJ3 = rawAlumnos.reduce((s,a)=>s+(+a.faltasJust3||0),0);
    const totalFI3 = rawAlumnos.reduce((s,a)=>s+(+a.faltasInjust3||0),0);
    const totalP3  = rawAlumnos.reduce((s,a)=>s+(+a.partes3||0),0);
    if (totalFI3 > 0 || totalP3 > 0) pendientesFooterStr += ` | <span style="color:var(--orange);font-weight:600">📋 ${totalFJ3}J / ${totalFI3}I faltas · ${totalP3} partes</span>`;
  }

  const abandonoCount = evalTab === 'eval3' ? rawAlumnos.filter(a => getPropObj(a.promociona).tipo === 'Abandono').length : 0;
  const abandonoFooterStr = abandonoCount > 0
    ? ` | <span style="color:#9aa3bb;font-weight:600">🚪 ${abandonoCount} abandono${abandonoCount>1?'s':''}</span>`
    : '';

  html += `</tbody></table></div>
    <div class="table-footer">
      <span>${rawAlumnos.length} alumnos | ${rawAlumnos.filter(a=>a.nese==='Sí').length} NESE | ${rawAlumnos.filter(a=>a.compensatoria==='Sí').length} Comp.${pendienteStr}${criticalStr}${abandonoFooterStr}${pendientesFooterStr}</span>
      <span style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:10px;color:var(--text3)">${pctDecision}% decidido</span>
        <div class="decision-progress-bar">
          <div class="decision-progress-fill" style="width:${pctDecision}%;background:${pctDecision===100?'var(--green)':pctDecision>60?'var(--yellow)':'var(--red)'}"></div>
        </div>
        <span style="font-size:10px;color:var(--text3)">${new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</span>
      </span>
    </div>`;

  tw.innerHTML = html;

  // Forzar un repintado explícito: Safari (iPad) a veces no redibuja una
  // tabla grande tras sustituir su contenido de golpe, sobre todo si
  // combina columnas fijas ("sticky") y desplazamiento — hasta que algo
  // fuerza un repintado (como cambiar de pestaña, que es justo lo que
  // "arreglaba" el problema al salir y volver a entrar). Esto lo hace
  // explícitamente, sin depender de que el usuario navegue.
  tw.style.display = 'none';
  void tw.offsetHeight; // fuerza el reflow síncrono
  tw.style.display = '';

  // Apply td column-group classes for visual banding
  requestAnimationFrame(() => {
    _applyTdGroupClasses(key, nivel);
    initStickyScrollbar(nivel, grupo);
    updateStickyOffset(nivel, grupo);
    restoreBulkSelection(nivel, grupo);
    initTableKeyNav(nivel, grupo);
    updateTabProgress(nivel, grupo);
  });
  applyColVisibility(key, nivel);

  // Re-apply current search filter
  if (_searchQuery) setTimeout(applySearch, 0);
}

// ===================== COMPACT MODE =====================
if (!window._compactMode) window._compactMode = false;

function _toggleCompact(nivel, grupo, btn) {
  window._compactMode = !window._compactMode;
  // Update all compact toggle buttons across all rendered groups
  document.querySelectorAll('[id^="compactToggle-"]').forEach(b => {
    b.classList.toggle('active', window._compactMode);
    b.textContent = window._compactMode ? '⊡ Normal' : '⊟ Compacto';
  });
  // Apply to all visible tables
  document.querySelectorAll('table[id^="tbl-"]').forEach(tbl => {
    tbl.classList.toggle('tbl-compact', window._compactMode);
  });
  // Re-apply td group-eval classes
  document.querySelectorAll('table[id^="tbl-"]').forEach(tbl => {
    const keyFromId = tbl.id.replace('tbl-','');
    const parts = keyFromId.split('-');
    // Find nivel (may contain º so last part is grupo)
    const grp = parts[parts.length - 1];
    const niv = parts.slice(0, -1).join('-');
    _applyTdGroupClasses(keyFromId, niv);
  });
}

function _applyTdGroupClasses(key, nivel) {
  const tbl = document.getElementById(`tbl-${key}`);
  if (!tbl) return;
  // Read thClasses from the actual <th> elements rendered for this eval tab
  const ths = tbl.querySelectorAll('thead th:not(.cb-col)');
  const thCls = Array.from(ths).map(th => {
    const c = th.className || '';
    if (c.includes('group-conv'))  return 'group-conv';
    if (c.includes('group-eval3')) return 'group-eval3';
    if (c.includes('group-eval2')) return 'group-eval2';
    if (c.includes('group-eval1')) return 'group-eval1';
    return '';
  });
  tbl.querySelectorAll('tbody tr').forEach(row => {
    row.querySelectorAll('td:not(.cb-col)').forEach((td, i) => {
      if (thCls[i]) td.classList.add(thCls[i]);
    });
  });
}

// ===================== TAB PROGRESS =====================
function updateTabProgress(nivel, grupo) {
  const tab = document.querySelector(`.grupo-tab[data-grupo="${CSS.escape(grupo)}"]`);
  if (!tab) return;
  const alumnos = data[nivel]?.[grupo] || [];
  const total = alumnos.length;
  const decided = alumnos.filter(a => !!getPropObj(a.promociona).tipo).length;
  const pct = total ? Math.round(decided / total * 100) : 0;
  const barColor = pct === 100 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : pct > 0 ? 'var(--accent)' : 'var(--border2)';
  const pctLabel = pct === 100 ? '✓' : `${pct}%`;

  const fill = tab.querySelector('.tab-progress-fill');
  const pctEl = tab.querySelector('.tab-pct');
  if (fill) { fill.style.width = pct + '%'; fill.style.background = barColor; }
  if (pctEl) pctEl.textContent = pctLabel;
}

// ===================== FIXED VIEWPORT SCROLLBAR =====================
// Initialised inside DOMContentLoaded so the #fixedScrollbar element exists
function _initFixedScrollbar() {
  const bar   = document.getElementById('fixedScrollbar');
  const inner = document.getElementById('fixedScrollbarInner');
  if (!bar || !inner) return;

  let activeTs = null;
  let busy = false;

  // Fixed bar → table
  bar.addEventListener('scroll', () => {
    if (busy || !activeTs) return;
    busy = true; activeTs.scrollLeft = bar.scrollLeft; busy = false;
  });

  function getBestTableScroll() {
    const viewH = window.innerHeight;
    let best = null, bestScore = -Infinity;
    document.querySelectorAll('.table-scroll').forEach(ts => {
      const tbl = ts.querySelector('table');
      if (!tbl) return;
      const overflow = tbl.offsetWidth - ts.clientWidth;
      if (overflow <= 10) return;
      const rect = ts.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewH) return;
      const visTop = Math.max(rect.top, 0);
      const visBot = Math.min(rect.bottom, viewH);
      const visiblePx = Math.max(0, visBot - visTop);
      const score = visiblePx + overflow * 0.1;
      if (score > bestScore) { bestScore = score; best = ts; }
    });
    return best;
  }

  function update() {
    const ts = getBestTableScroll();
    if (ts !== activeTs) {
      if (activeTs && activeTs._fixedBarListener) {
        activeTs.removeEventListener('scroll', activeTs._fixedBarListener);
        delete activeTs._fixedBarListener;
      }
      activeTs = ts;
      if (ts) {
        ts._fixedBarListener = () => {
          if (busy) return;
          busy = true; bar.scrollLeft = ts.scrollLeft; busy = false;
        };
        ts.addEventListener('scroll', ts._fixedBarListener);
        bar.scrollLeft = ts.scrollLeft;
      }
    }
    if (ts) {
      const tbl = ts.querySelector('table');
      inner.style.width = (tbl ? tbl.offsetWidth : 0) + 'px';
      const rect = ts.getBoundingClientRect();
      bar.style.left  = Math.max(0, rect.left) + 'px';
      bar.style.right = Math.max(0, window.innerWidth - rect.right) + 'px';
      bar.style.display = 'block';
    } else {
      bar.style.display = 'none';
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  window._fixedScrollbarUpdate = update;
  // Run once tables are rendered
  setTimeout(update, 200);
}

document.addEventListener('DOMContentLoaded', _initFixedScrollbar);

function initStickyScrollbar(nivel, grupo) {
  // Remove any legacy in-table bar
  const key = `${nivel}-${grupo}`;
  const tw = document.getElementById(`table-${key}`);
  if (tw) tw.querySelectorAll('.sticky-scrollbar-wrap').forEach(el => el.remove());
  // Re-evaluate which table needs the bar
  if (window._fixedScrollbarUpdate) setTimeout(window._fixedScrollbarUpdate, 80);
}

// ===================== TABLE KEYBOARD NAVIGATION =====================
function initTableKeyNav(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const tbl = document.getElementById(`tbl-${CSS.escape(key)}`);
  if (!tbl || tbl._keyNavSet) return;
  tbl._keyNavSet = true;

  const NAV_SEL = 'input.cell-input, select.cell-input, .propuesta-display, .multicode-display, .notes-btn';

  function getNavItems() {
    return Array.from(tbl.querySelectorAll(`tbody ${NAV_SEL}`));
  }

  function getPos(el) {
    const td = el.closest('td');
    const tr = el.closest('tr');
    if (!td || !tr) return [-1, -1];
    return [
      Array.from(tbl.querySelectorAll('tbody tr')).indexOf(tr),
      Array.from(tr.querySelectorAll('td')).indexOf(td)
    ];
  }

  function findAt(rowIdx, colIdx) {
    const tr = tbl.querySelectorAll('tbody tr')[rowIdx];
    if (!tr) return null;
    const td = tr.querySelectorAll('td')[colIdx];
    if (!td) return null;
    return td.querySelector(NAV_SEL);
  }

  function focusEl(el) {
    if (!el) return;
    const isPanel = el.classList.contains('propuesta-display') || el.classList.contains('multicode-display') || el.classList.contains('notes-btn');
    if (isPanel) { el.setAttribute('tabindex', '0'); el.focus(); }
    else { el.focus(); try { if (el.type !== 'checkbox') el.select(); } catch(e) {} }
    el.closest('td')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // Make panel-type cells keyboard-focusable
  tbl.querySelectorAll('tbody .propuesta-display, tbody .multicode-display, tbody .notes-btn').forEach(el => {
    if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });

  tbl.addEventListener('keydown', function(e) {
    const active = document.activeElement;
    if (!tbl.contains(active) || !active.matches(NAV_SEL)) return;

    const [row, col] = getPos(active);
    if (row < 0) return;
    const items = getNavItems();
    const idx = items.indexOf(active);
    const isPanel = active.classList.contains('propuesta-display') || active.classList.contains('multicode-display') || active.classList.contains('notes-btn');
    const isSelect = active.tagName === 'SELECT';

    if (e.key === 'Tab') {
      e.preventDefault();
      focusEl(e.shiftKey ? items[idx - 1] : items[idx + 1]);

    } else if (e.key === 'Enter') {
      if (isPanel) { active.click(); return; }
      e.preventDefault();
      const below = findAt(row + 1, col) || items[idx + 1];
      focusEl(below);

    } else if (e.key === 'ArrowDown' && !isSelect) {
      e.preventDefault();
      focusEl(findAt(row + 1, col));

    } else if (e.key === 'ArrowUp' && !isSelect) {
      e.preventDefault();
      focusEl(findAt(row - 1, col));

    } else if (e.key === 'Escape') {
      active.blur();
    }
  });
}

// ===================== BULK SELECTION =====================
if (!window._bulkSel) window._bulkSel = {};
let _bulkContext = { nivel: '', grupo: '' };

function bulkToggleRow(nivel, grupo, idx, checked) {
  const key = `${nivel}-${grupo}`;
  if (!_bulkSel[key]) _bulkSel[key] = new Set();
  if (checked) _bulkSel[key].add(idx);
  else _bulkSel[key].delete(idx);
  const tr = document.querySelector(`#tbl-${CSS.escape(key)} tr[data-idx="${idx}"]`);
  if (tr) tr.classList.toggle('row-selected', checked);
  _bulkContext = { nivel, grupo };
  _updateBulkBar();
}

function bulkToggleAll(nivel, grupo, checked) {
  const key = `${nivel}-${grupo}`;
  if (!_bulkSel[key]) _bulkSel[key] = new Set();
  const tbl = document.getElementById(`tbl-${key}`);
  if (!tbl) return;
  tbl.querySelectorAll('tbody tr[data-idx]').forEach(tr => {
    const idx = parseInt(tr.dataset.idx);
    if (checked) _bulkSel[key].add(idx);
    else _bulkSel[key].delete(idx);
    tr.classList.toggle('row-selected', checked);
    const cb = tr.querySelector('.row-cb');
    if (cb) cb.checked = checked;
  });
  _bulkContext = { nivel, grupo };
  _updateBulkBar();
}

function _updateBulkBar() {
  const { nivel, grupo } = _bulkContext;
  const key = `${nivel}-${grupo}`;
  const sel = _bulkSel[key];
  const count = sel ? sel.size : 0;
  const bar = document.getElementById('bulkBar');
  const countEl = document.getElementById('bulkBarCount');
  const labelEl = document.getElementById('bulkBarLabel');
  if (!bar) return;
  if (count > 0) {
    bar.style.display = 'flex';
    if (countEl) countEl.textContent = count;
    if (labelEl) labelEl.textContent = `alumno${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}`;
  } else {
    bar.style.display = 'none';
  }
}

function clearBulkSelection() {
  const { nivel, grupo } = _bulkContext;
  const key = `${nivel}-${grupo}`;
  if (_bulkSel[key]) _bulkSel[key].clear();
  const tbl = document.getElementById(`tbl-${key}`);
  if (tbl) {
    tbl.querySelectorAll('tr.row-selected').forEach(tr => tr.classList.remove('row-selected'));
    tbl.querySelectorAll('.row-cb').forEach(cb => cb.checked = false);
    const allCb = tbl.querySelector('.all-cb');
    if (allCb) allCb.checked = false;
  }
  const bar = document.getElementById('bulkBar');
  if (bar) bar.style.display = 'none';
}

function restoreBulkSelection(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const sel = _bulkSel[key];
  if (!sel || !sel.size) return;
  const tbl = document.getElementById(`tbl-${key}`);
  if (!tbl) return;
  tbl.querySelectorAll('tbody tr[data-idx]').forEach(tr => {
    const idx = parseInt(tr.dataset.idx);
    if (sel.has(idx)) {
      tr.classList.add('row-selected');
      const cb = tr.querySelector('.row-cb');
      if (cb) cb.checked = true;
    }
  });
  _bulkContext = { nivel, grupo };
  _updateBulkBar();
}

function applyBulkEdit(field, value) {
  const { nivel, grupo } = _bulkContext;
  const key = `${nivel}-${grupo}`;
  const sel = _bulkSel[key];
  if (!sel || !sel.size) return;
  const indices = [...sel];
  withUndo(nivel, grupo, () => {
    indices.forEach(idx => updateField(nivel, grupo, idx, field, value));
  });
  showToast(`✅ ${indices.length} alumno${indices.length !== 1 ? 's' : ''} actualizados`);
}

// Bulk edit for propuesta/promociona fields (object with tipo + destino)
function applyBulkEditPropTipo(field, tipo) {
  const { nivel, grupo } = _bulkContext;
  const key = `${nivel}-${grupo}`;
  const sel = _bulkSel[key];
  if (!sel || !sel.size) return;
  const indices = [...sel];
  withUndo(nivel, grupo, () => {
    indices.forEach(idx => {
      const alumno = data[nivel][grupo][idx];
      const current = (alumno[field] && typeof alumno[field] === 'object')
        ? alumno[field]
        : { tipo: '', destino: '' };
      alumno[field] = { ...current, tipo };
    });
  });
  // updateTable re-renders rows — bulk selection is restored by restoreBulkSelection inside it
  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  if (field === 'promociona') {
    updateTabProgress(nivel, grupo);
    if (currentNivel === '__home__') { clearTimeout(_resumenDebounce); _resumenDebounce = setTimeout(renderResumen, 400); }
  }
  showToast(`✅ ${indices.length} alumno${indices.length !== 1 ? 's' : ''} actualizados`);
}

// Bulk edit destino for propuesta/promociona fields (keeps existing tipo)
function applyBulkEditPropDestino(field, destino) {
  const { nivel, grupo } = _bulkContext;
  const key = `${nivel}-${grupo}`;
  const sel = _bulkSel[key];
  if (!sel || !sel.size) return;
  const indices = [...sel];
  withUndo(nivel, grupo, () => {
    indices.forEach(idx => {
      const alumno = data[nivel][grupo][idx];
      const current = (alumno[field] && typeof alumno[field] === 'object')
        ? alumno[field]
        : { tipo: '', destino: '' };
      alumno[field] = { ...current, destino };
    });
  });
  updateTable(nivel, grupo);
  updateStats(nivel, grupo);
  updateStats2(nivel, grupo);
  updateCharts(nivel, grupo);
  if (field === 'promociona') {
    updateTabProgress(nivel, grupo);
    if (currentNivel === '__home__') { clearTimeout(_resumenDebounce); _resumenDebounce = setTimeout(renderResumen, 400); }
  }
  const destLabel = destino || 'sin destino';
  showToast(`✅ Destino "${destLabel}" → ${indices.length} alumno${indices.length !== 1 ? 's' : ''}`);
}

// Fill the bulk "Destino" dropdowns (I, II y Final) with the same options as the per-student panel
document.addEventListener('DOMContentLoaded', () => {
  if (typeof PROPUESTA_DESTINOS === 'undefined') return;
  ['bulkDestino1Select', 'bulkDestino2Select', 'bulkDestinoSelect'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    PROPUESTA_DESTINOS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      sel.appendChild(opt);
    });
  });
});

// ===================== STICKY NOMBRE OFFSET =====================
function updateStickyOffset(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const tbl = document.getElementById(`tbl-${key}`);
  if (!tbl) return;
  // Sum the widths of every visible header column BEFORE the sticky "Alumno/a"
  // column (plus the 36px fixed checkbox column). Robust to column reordering.
  let left = 36;
  const ths = tbl.querySelectorAll('thead th');
  for (const th of ths) {
    if (th.classList.contains('cb-col')) continue;
    if (th.classList.contains('sticky-nombre')) break;
    if (th.classList.contains('col-hidden')) continue;
    left += th.getBoundingClientRect().width;
  }
  tbl.querySelectorAll('.sticky-nombre').forEach(el => {
    el.style.left = left + 'px';
  });
  // Add shadow class only when table is actually scrolled
  const ts = tbl.closest('.table-scroll');
  if (ts) {
    const markShadow = () => tbl.classList.toggle('sticky-nombre-active', ts.scrollLeft > 2);
    markShadow();
    if (!ts._stickyListenerSet) {
      ts.addEventListener('scroll', markShadow);
      ts._stickyListenerSet = true;
    }
  }
}

function getPropObj(p) {
  if (!p) return {tipo:'', destino:''};
  if (typeof p === 'object') return p;
  return {tipo: p, destino: ''};
}
function getPropuestaTipo(a) {
  return getPropObj(a.propuesta3).tipo;
}
function getPropuestaDestino(a) {
  return getPropObj(a.propuesta3).destino;
}
function getPromocionaTipo(a) {
  return getPropObj(a.promociona).tipo;
}
function getPromocionaDestino(a) {
  return getPropObj(a.promociona).destino;
}

function updateStats(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const el = document.getElementById(`stats-${key}`);
  if (!el) return;
  const alumnos = data[nivel][grupo];
  const total = alumnos.length;
  const nese  = alumnos.filter(a => a.nese === 'Sí').length;
  const rep   = alumnos.filter(a => a.repetidor === 'Sí').length;
  const avgE1 = total ? (alumnos.reduce((s,a)=>s+(+a.eval1||0),0)/total).toFixed(1) : '—';
  const avgE3 = total ? (alumnos.reduce((s,a)=>s+(+a.eval3||0),0)/total).toFixed(1) : '—';
  const avgExtr = (isBach(nivel) && total) ? (alumnos.reduce((s,a)=>s+(+a.evalExtr||0),0)/total).toFixed(1) : null;

  // Final decision counts (from 'promociona' field — the definitive column)
  const repiten    = alumnos.filter(a => getPromocionaTipo(a) === 'Repetición').length;
  const titulan    = alumnos.filter(a => getPromocionaTipo(a) === 'Titulación').length;
  const abandonan  = alumnos.filter(a => getPromocionaTipo(a) === 'Abandono').length;
  const promoFPB   = alumnos.filter(a => getPromocionaTipo(a) === 'Promoción' && getPromocionaDestino(a) === 'FPB').length;
  const promoTotal = alumnos.filter(a => getPromocionaTipo(a) === 'Promoción').length;
  const promoNormal = promoTotal - promoFPB;

  // Determine what cards to show based on nivel
  const show4ESO = nivel === '4º ESO';
  const show2BAC = nivel === '2º Bach.';
  const showTitula = show4ESO || show2BAC;
  const showFPB = nivel === '2º ESO' || nivel === '3º ESO';

  // Stat card helper
  const card = (label, value, color, subtitle='', subtitleColor='var(--text3)') => `
    <div class="stat-card ${color}">
      <div class="stat-label">${label}</div>
      <div class="stat-value ${color}">${value}</div>
      ${subtitle ? `<div style="font-size:10px;color:${subtitleColor};margin-top:4px;">${subtitle}</div>` : ''}
    </div>`;

  let html = '';
  html += card('Total Alumnos', total, 'blue');
  html += card('Repiten', repiten, 'red');

  if (showTitula) {
    html += card('Titulan', titulan, 'purple');
    // For 4º ESO: show destination breakdown for titulación
    if (nivel === '4º ESO' && titulan > 0) {
      const bachDests = [
        { dest:'1º Bachillerato Científico', label:'→ Bach. Científico', color:'accent' },
        { dest:'1º Bachillerato HS',         label:'→ Bach. HS',         color:'green'  },
        { dest:'CFGM',                        label:'→ CFGM',            color:'orange' },
      ];
      bachDests.forEach(({dest, label, color}) => {
        const n = alumnos.filter(a => getPromocionaTipo(a)==='Titulación' && getPromocionaDestino(a)===dest).length;
        if (n > 0) html += card(label, n, color);
      });
    }
  }

  if (showFPB) {
    html += card('Promocionan', promoNormal, 'green', promoFPB > 0 ? `(excluidos ${promoFPB} → FPB)` : '');
    html += card('Promocionan a FPB', promoFPB, 'orange');
  } else if (!showTitula) {
    html += card('Promocionan', promoTotal, 'green');
  } else {
    // 4ESO / 2BAC: show promo (non-FPB) normally
    html += card('Promocionan', promoNormal, 'green');
    if (promoFPB > 0) html += card('Promocionan a FPB', promoFPB, 'orange');
  }

  const comp = alumnos.filter(a => a.compensatoria === 'Sí').length;
  html += card('Con NESE', nese, 'yellow');
  if (comp > 0) html += card('Compensatoria', comp, 'orange', `${Math.round(comp/total*100)}% del grupo`);
  html += card('Repetidores curso', rep, 'orange');
  if (abandonan > 0) html += card('Abandono', abandonan, 'gray');
  html += card('Ø Mat. I Eval.', avgE1, 'blue');
  html += card('Ø Mat. III Eval.', avgE3, 'green');
  if (avgExtr !== null) html += card('Ø Mat. Eval. Extr.', avgExtr, 'orange');

  // Pendientes
  const conPendIII  = alumnos.filter(a => (a.pendientesIII ||[]).length > 0).length;
  const conPendExtr = alumnos.filter(a => (a.pendientesExtr||[]).length > 0).length;
  if (conPendIII > 0)  html += card('Con pend. III Ev.', conPendIII,  'yellow', `${Math.round(conPendIII /total*100)}% del grupo`);
  if (conPendExtr > 0) html += card('Con pend. Extr.',   conPendExtr, 'orange', `${Math.round(conPendExtr/total*100)}% del grupo`);

  el.innerHTML = html;
}

function getP2Tipo(a) { return getPropObj(a.propuesta2).tipo; }
function getP2Destino(a) { return getPropObj(a.propuesta2).destino; }

function updateStats2(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const el = document.getElementById(`stats2-${key}`);
  if (!el) return;
  const alumnos = data[nivel][grupo];
  const total = alumnos.length;

  const showFPB   = nivel === '2º ESO' || nivel === '3º ESO';
  const showTitula = nivel === '4º ESO'; // 2 Bach no tiene II eval con titulacion normalmente but include anyway

  const repiten2    = alumnos.filter(a => getP2Tipo(a) === 'Repetición').length;
  const titulan2    = alumnos.filter(a => getP2Tipo(a) === 'Titulación').length;
  const abandonan2  = alumnos.filter(a => getP2Tipo(a) === 'Abandono').length;
  const promoFPB2   = alumnos.filter(a => getP2Tipo(a) === 'Promoción' && getP2Destino(a) === 'FPB').length;
  const promoTotal2 = alumnos.filter(a => getP2Tipo(a) === 'Promoción').length;
  const promoNorm2  = promoTotal2 - promoFPB2;
  const sinProp2    = alumnos.filter(a => !getP2Tipo(a)).length;

  // Destino breakdown — count each destination for promoted students
  const destinoCount = {};
  alumnos.forEach(a => {
    const t = getP2Tipo(a);
    const d = getP2Destino(a);
    if (t === 'Promoción' && d) {
      destinoCount[d] = (destinoCount[d] || 0) + 1;
    } else if (t === 'Repetición') {
      const dest = d || nivel; // repeating in same course
      const label = 'Repite: ' + (d || nivel);
      destinoCount[label] = (destinoCount[label] || 0) + 1;
    } else if (t === 'Titulación') {
      const label = 'Titula' + (d ? ': ' + d : '');
      destinoCount[label] = (destinoCount[label] || 0) + 1;
    }
  });

  const colorMap = {red:'red',green:'green',orange:'orange',purple:'purple',blue:'accent',yellow:'yellow'};
  const card = (label, value, color, subtitle='') => {
    const cssVar = colorMap[color] || 'accent';
    const subHtml = subtitle ? `<div style="font-size:10px;color:var(--text3);margin-top:4px;">${subtitle}</div>` : '';
    return `<div class="stat-card" style="border-left:3px solid var(--${cssVar})"><div class="stat-label">${label}</div><div class="stat-value ${color}">${value}</div>${subHtml}</div>`;
  };

  // Vacantes preview: destinos sorted
  const vacanteCards = Object.entries(destinoCount)
    .sort((a,b) => b[1]-a[1])
    .map(([dest, n]) => {
      const isRepite = dest.startsWith('Repite');
      const isFPB    = dest === 'FPB' || dest.includes('FPB');
      const isTitula = dest.startsWith('Titula');
      const color    = isRepite ? 'red' : isFPB ? 'orange' : isTitula ? 'purple' : 'green';
      return card(dest, n, color);
    }).join('');

  let html = '';
  html += card('Total Alumnos', total, 'blue');
  html += card('Repiten (II Ev.)', repiten2, 'red');
  if (showFPB) {
    html += card('Promocionan (II Ev.)', promoNorm2, 'green', promoFPB2 > 0 ? `(excl. ${promoFPB2} → FPB)` : '');
    if (promoFPB2 > 0) html += card('→ FPB (II Ev.)', promoFPB2, 'orange');
  } else {
    html += card('Promocionan (II Ev.)', promoNorm2, 'green');
    if (promoFPB2 > 0) html += card('→ FPB (II Ev.)', promoFPB2, 'orange');
  }
  if (showTitula || titulan2 > 0) {
    html += card('Titulan (II Ev.)', titulan2, 'purple');
    // For 4º ESO: show destination breakdown for titulación
    if (nivel === '4º ESO' && titulan2 > 0) {
      const bachDests = [
        { dest:'1º Bachillerato Científico', label:'→ Bach. Científico', color:'accent' },
        { dest:'1º Bachillerato HS',         label:'→ Bach. HS',         color:'green'  },
        { dest:'CFGM',                        label:'→ CFGM',            color:'orange' },
      ];
      bachDests.forEach(({dest, label, color}) => {
        const n = alumnos.filter(a => getP2Tipo(a)==='Titulación' && getP2Destino(a)===dest).length;
        if (n > 0) html += card(label, n, color);
      });
    }
  }
  if (abandonan2 > 0) html += card('Abandono (II Ev.)', abandonan2, 'gray');
  if (sinProp2 > 0) html += card('Sin propuesta aún', sinProp2, 'yellow');

  // Separator + destination breakdown
  if (vacanteCards) {
    html += `<div style="grid-column:1/-1;border-top:1px solid var(--border);margin:4px 0;padding-top:12px;">
      <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-weight:700;">📍 Desglose por destino (previsión de vacantes)</div>
      <div class="stats-grid" style="margin:0">${vacanteCards}</div>
    </div>`;
  }

  el.innerHTML = html;
}

function updateCharts(nivel, grupo) {
  try {
    _updateChartsInner(nivel, grupo);
  } catch (e) {
    // Un fallo al crear/actualizar los gráficos (p.ej. Chart.js no cargado,
    // porque falta la carpeta vendor/ junto al .html) no debe impedir que
    // el resto de la app siga funcionando: la tabla, NESE, PAP, EC, etc.
    // deben actualizarse igualmente aunque los gráficos no se dibujen.
    console.warn('No se han podido actualizar los gráficos de', nivel, grupo, e);
  }
}

function _updateChartsInner(nivel, grupo) {
  const key = `${nivel}-${grupo}`;
  const alumnos = data[nivel][grupo];

  // Destroy old charts and clear canvas to prevent "Canvas is already in use" error
  ['eval','prop1','prop2','nese','comp','promo','lengua'].forEach(t => {
    const ck = `${t}-${key}`;
    if (charts[ck]) {
      charts[ck].destroy();
      delete charts[ck];
    }
    const canvas = document.getElementById(`chart-${t}-${key}`);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  const palette = {
    blue: 'rgba(79,142,247,0.85)',
    green: 'rgba(45,212,160,0.85)',
    orange: 'rgba(247,157,79,0.85)',
    red: 'rgba(247,110,110,0.85)',
    yellow: 'rgba(245,200,66,0.85)',
    purple: 'rgba(124,92,252,0.85)',
  };

  const isLight = document.documentElement.classList.contains('light');
  const gridColor  = isLight ? 'rgba(180,192,220,0.5)' : 'rgba(46,51,80,0.8)';
  const textColor  = isLight ? '#4a5580' : '#8891b4';
  const defaults = {
    color: textColor,
    font: { family: 'Inter' }
  };

  // Chart 1: Materias no superadas por evaluación (barras agrupadas)
  const buckets = [0,1,2,3,4,5,6,7,8,9,10];
  const bachMode = isBach(nivel);
  const e1dist = buckets.map(b => alumnos.filter(a=>(+a.eval1||0)===b).length);
  const e2dist = buckets.map(b => alumnos.filter(a=>(+a.eval2||0)===b).length);
  const e3dist = buckets.map(b => alumnos.filter(a=>(+a.eval3||0)===b).length);
  const eXdist = bachMode ? buckets.map(b => alumnos.filter(a=>(+a.evalExtr||0)===b).length) : null;

  const c1 = document.getElementById(`chart-eval-${key}`);
  if (c1) {
    charts[`eval-${key}`] = new Chart(c1, {
      type: 'bar',
      data: {
        labels: buckets.map(b => b === 0 ? 'Todas' : b),
        datasets: [
          { label: 'I Eval.', data: e1dist, backgroundColor: palette.blue, borderRadius: 4 },
          { label: 'II Eval.', data: e2dist, backgroundColor: palette.green, borderRadius: 4 },
          { label: 'III Eval.', data: e3dist, backgroundColor: palette.orange, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: defaults }, tooltip: {} },
        scales: {
          x: { ticks: defaults, grid: { color: gridColor } },
          y: { ticks: { ...defaults, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }

  // Color map compartido para todos los doughnuts de propuesta
  const propColorFn = k => k==='Repetición'?palette.red:k==='Titulación'?'rgba(167,139,250,0.85)':k==='→ FPB'?palette.orange:k==='Abandono'?'rgba(120,120,140,0.7)':palette.green;

  // Chart 2a: I Eval Propuesta
  const p1Count = {};
  ['Repetición','Promoción','Titulación','Abandono'].forEach(t => {
    p1Count[t] = alumnos.filter(a => getPropObj(a.propuesta1).tipo === t).length;
  });
  const fpb1 = alumnos.filter(a => getPropObj(a.propuesta1).tipo === 'Promoción' && getPropObj(a.propuesta1).destino === 'FPB').length;
  if (fpb1 > 0) { p1Count['Promoción'] -= fpb1; p1Count['→ FPB'] = fpb1; }
  Object.keys(p1Count).forEach(k => { if (!p1Count[k]) delete p1Count[k]; });
  const c2a = document.getElementById(`chart-prop1-${key}`);
  if (c2a) {
    charts[`prop1-${key}`] = new Chart(c2a, {
      type: 'doughnut',
      data: {
        labels: Object.keys(p1Count),
        datasets: [{ data: Object.values(p1Count), backgroundColor: Object.keys(p1Count).map(propColorFn), borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { ...defaults, padding: 10, boxWidth: 12 } } },
        cutout: '60%'
      }
    });
  }

  // Chart 2b: II Eval Propuesta
  const p2Count = {};
  ['Repetición','Promoción','Titulación','Abandono'].forEach(t => {
    p2Count[t] = alumnos.filter(a => getP2Tipo(a) === t).length;
  });
  const fpb2 = alumnos.filter(a => getP2Tipo(a) === 'Promoción' && getP2Destino(a) === 'FPB').length;
  if (fpb2 > 0) { p2Count['Promoción'] -= fpb2; p2Count['→ FPB'] = fpb2; }
  Object.keys(p2Count).forEach(k => { if (!p2Count[k]) delete p2Count[k]; });
  const c2b = document.getElementById(`chart-prop2-${key}`);
  if (c2b) {
    charts[`prop2-${key}`] = new Chart(c2b, {
      type: 'doughnut',
      data: {
        labels: Object.keys(p2Count),
        datasets: [{ data: Object.values(p2Count), backgroundColor: Object.keys(p2Count).map(propColorFn), borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { ...defaults, padding: 10, boxWidth: 12 } } },
        cutout: '60%'
      }
    });
  }

  // Chart 3: NESE (doughnut)
  const neseCount = alumnos.filter(a => a.nese === 'Sí').length;
  const noNeseCount = alumnos.length - neseCount;
  const c3 = document.getElementById(`chart-nese-${key}`);
  if (c3) {
    charts[`nese-${key}`] = new Chart(c3, {
      type: 'doughnut',
      data: {
        labels: ['Con NESE', 'Sin NESE'],
        datasets: [{ data: [neseCount, noNeseCount], backgroundColor: [palette.blue, 'rgba(90,96,128,0.4)'], borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { ...defaults, padding: 14, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} alumnos` } }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const {ctx, chartArea:{width,height,left,top}} = chart;
          ctx.save();
          ctx.font = 'bold 22px Inter, sans-serif';
          ctx.fillStyle = document.documentElement.classList.contains('light') ? '#1e2540' : '#e8eaf2';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(neseCount, left + width/2, top + height/2 - 10);
          ctx.font = '11px Inter, sans-serif';
          ctx.fillStyle = document.documentElement.classList.contains('light') ? '#4a5580' : '#8891b4';
          ctx.fillText('con NESE', left + width/2, top + height/2 + 12);
          ctx.restore();
        }
      }]
    });
  }

  // Chart 3b: Compensatoria (doughnut)
  const compCount = alumnos.filter(a => a.compensatoria === 'Sí').length;
  const noCompCount = alumnos.length - compCount;
  const c3b = document.getElementById(`chart-comp-${key}`);
  if (c3b) {
    charts[`comp-${key}`] = new Chart(c3b, {
      type: 'doughnut',
      data: {
        labels: ['Con Compensatoria', 'Sin Compensatoria'],
        datasets: [{ data: [compCount, noCompCount], backgroundColor: [palette.orange, 'rgba(90,96,128,0.4)'], borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { ...defaults, padding: 14, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} alumnos` } }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const {ctx, chartArea:{width,height,left,top}} = chart;
          ctx.save();
          ctx.font = 'bold 22px Inter, sans-serif';
          ctx.fillStyle = document.documentElement.classList.contains('light') ? '#1e2540' : '#e8eaf2';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(compCount, left + width/2, top + height/2 - 10);
          ctx.font = '11px Inter, sans-serif';
          ctx.fillStyle = document.documentElement.classList.contains('light') ? '#4a5580' : '#8891b4';
          ctx.fillText('compensatoria', left + width/2, top + height/2 + 12);
          ctx.restore();
        }
      }]
    });
  }

  // Chart 4: Promoción
  const promoSi   = alumnos.filter(a => getPromocionaTipo(a)==='Promoción' && getPromocionaDestino(a)!=='FPB').length;
  const promoFPBc = alumnos.filter(a => getPromocionaTipo(a)==='Promoción' && getPromocionaDestino(a)==='FPB').length;
  const promoNo   = alumnos.filter(a => getPromocionaTipo(a)==='Repetición').length;
  const titulaC   = alumnos.filter(a => getPromocionaTipo(a)==='Titulación').length;
  const abandonaC = alumnos.filter(a => getPromocionaTipo(a)==='Abandono').length;
  const promoPend = alumnos.filter(a => !getPromocionaTipo(a)).length;
  const c4 = document.getElementById(`chart-promo-${key}`);
  if (c4) {
    const promoVals   = [promoSi,promoNo,titulaC,promoFPBc,abandonaC,promoPend];
    const promoLabels = ['Promociona','Repite','Titula','→ FPB','Abandono','Sin propuesta'];
    const promoColors = [palette.green,palette.red,'rgba(167,139,250,0.85)',palette.orange,'rgba(120,120,140,0.7)',palette.yellow];
    charts[`promo-${key}`] = new Chart(c4, {
      type: 'pie',
      data: {
        labels: promoLabels.filter((_,i)=>promoVals[i]>0),
        datasets: [{ data: promoVals.filter(v=>v>0), backgroundColor: promoColors.filter((_,i)=>promoVals[i]>0), borderWidth: 0, hoverOffset: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { ...defaults, padding: 14, boxWidth: 14 } } }
      }
    });
  }

  // Chart 5: Lengua Base
  const castCount   = alumnos.filter(a=>a.lenguaBase==='Castellano').length;
  const valCount    = alumnos.filter(a=>a.lenguaBase==='Valenciano').length;
  const noVotaCount = alumnos.length - castCount - valCount;
  const c5 = document.getElementById(`chart-lengua-${key}`);
  if (c5) {
    charts[`lengua-${key}`] = new Chart(c5, {
      type: 'doughnut',
      data: {
        labels: ['Castellano','Valenciano','No vota'].filter((_,i)=>[castCount,valCount,noVotaCount][i]>0),
        datasets: [{ data: [castCount,valCount,noVotaCount].filter(v=>v>0), backgroundColor: [palette.blue,palette.green,'rgba(90,96,128,0.5)'].filter((_,i)=>[castCount,valCount,noVotaCount][i]>0), borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { ...defaults, padding: 12, boxWidth: 12 } } }
      }
    });
  }
}

// «⋯ Más» de la barra del grupo: se cierra al elegir una opción, al pulsar fuera o con Esc.
document.addEventListener('click', e => {
  document.querySelectorAll('details.mas-menu[open]').forEach(d => {
    if (!d.contains(e.target) || e.target.closest('.mas-menu-lista > button')) d.removeAttribute('open');
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('details.mas-menu[open]').forEach(d => { d.removeAttribute('open'); d.querySelector('summary')?.focus(); });
});
