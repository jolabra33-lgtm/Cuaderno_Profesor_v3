/* ============================================================================
   Gestor de Tutoría · Calendario de sesiones, convivencia e informe académico
   tutoria/js/12-calendario-y-convivencia.js
   ============================================================================ */

// ===================== CALENDARIO DE SESIONES =====================

function renderCalendario() {
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '';

  // ── Collect all sessions from evalDates ──
  const sessions = []; // {date, nivel, tipo, label, color}
  const tipoMeta = {
    eval1: { label: 'I Evaluación',   color: 'var(--accent)',  dot: '#4f8ef7' },
    eval2: { label: 'II Evaluación',  color: 'var(--green)',   dot: '#2dd4a0' },
    eval3: { label: 'III Evaluación', color: 'var(--orange)',  dot: '#f79d4f' },
  };
  NIVELES.forEach(n => {
    const d = getDates(n);
    ['eval1','eval2','eval3'].forEach(k => {
      if (d[k]) sessions.push({ date: d[k], nivel: n, tipo: k, ...tipoMeta[k] });
    });
  });
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  // Eventos propios del calendario, en el mismo formato que las sesiones para
  // poder pintarlos juntos (esEvento los distingue de las evaluaciones).
  const eventosOrdenados = calEventos.slice().sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
  const eventosComoSesion = eventosOrdenados.map(e => {
    const info = calEvTipoInfo(e.tipo);
    return { date: e.fecha, nivel: e.titulo || '(sin título)', tipo: e.tipo, label: info.label, color: info.color, dot: info.color, esEvento: true, evId: e.id, nota: e.nota || '' };
  });
  const todosItems = sessions.concat(eventosComoSesion).sort((a,b) => (a.date||'').localeCompare(b.date||''));

  // ── Current display month (state stored on window) ──
  if (!window._calYear || !window._calMonth) {
    const now = new Date();
    window._calYear  = now.getFullYear();
    window._calMonth = now.getMonth(); // 0-based
  }

  function buildCalendar(year, month) {
    const firstDay  = new Date(year, month, 1);
    const lastDay   = new Date(year, month + 1, 0);
    const startDow  = (firstDay.getDay() + 6) % 7; // Monday=0
    const totalDays = lastDay.getDate();
    const today     = new Date().toISOString().split('T')[0];
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    // Map date string → sesiones y eventos
    const byDate = {};
    todosItems.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    });

    // Build cells
    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      cells += `<div class="cal-cell cal-cell-empty"></div>`;
    }
    for (let day = 1; day <= totalDays; day++) {
      const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const daySessions = byDate[iso] || [];
      const isToday = iso === today;
      const hasSession = daySessions.length > 0;
      const dots = daySessions.slice(0, 3).map(s =>
        `<span style="width:7px;height:7px;border-radius:${s.esEvento?'2px':'50%'};background:${s.dot};display:inline-block;flex-shrink:0" title="${s.esEvento?'':(s.nivel+' — ')}${s.esEvento?s.nivel:s.label}"></span>`
      ).join('');
      const extraCount = daySessions.length > 3 ? `<span style="font-size:8px;color:var(--text3)">+${daySessions.length-3}</span>` : '';
      cells += `
        <div class="cal-cell${isToday?' cal-today':''}${hasSession?' cal-has-event':''}"
          onclick="_calDayClick('${iso}')" title="${iso}">
          <div class="cal-day-num">${day}</div>
          <div class="cal-dots">${dots}${extraCount}</div>
        </div>`;
    }
    // Pad to complete last row
    const total = startDow + totalDays;
    const remainder = total % 7;
    if (remainder) {
      for (let i = 0; i < 7 - remainder; i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;
    }

    return `
      <div class="cal-header">
        <button class="cal-nav" onclick="_calPrev()">‹</button>
        <span class="cal-month-label">${monthNames[month]} ${year}</span>
        <button class="cal-nav" onclick="_calNext()">›</button>
        <button class="cal-nav" style="margin-left:12px;font-size:11px;padding:4px 10px;" onclick="_calToday()">Hoy</button>
      </div>
      <div class="cal-grid">
        ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}
        ${cells}
      </div>`;
  }

  function buildTimeline() {
    if (!todosItems.length) return `<div style="text-align:center;padding:32px;color:var(--text3);font-size:13px">Sin sesiones ni eventos. Configura las fechas en la sección inferior, o pulsa un día del calendario para añadir un evento.</div>`;
    const today = new Date().toISOString().split('T')[0];
    let html = '';
    let lastDate = '';
    todosItems.forEach(s => {
      const dateLabel = s.date ? new Date(s.date + 'T12:00:00').toLocaleDateString('es-ES', {weekday:'long',day:'numeric',month:'long'}) : '—';
      const isPast    = s.date < today;
      const isToday   = s.date === today;
      if (s.date !== lastDate) {
        lastDate = s.date;
        html += `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin:${html?'14px':'0'} 0 6px">
          ${isToday ? '📌 HOY — ' : ''}${dateLabel}
        </div>`;
      }
      html += `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;
          background:${isPast?'var(--surface2)':'var(--surface3)'};border:1px solid var(--border);
          border-left:4px solid ${s.dot};border-radius:8px;margin-bottom:6px;
          opacity:${isPast?'0.65':'1'};">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text)">${s.esEvento?_calEsc(s.nivel):s.nivel}</div>
            <div style="font-size:11px;color:var(--text2)">${s.label}${s.esEvento&&s.nota?' · '+_calEsc(s.nota):''}</div>
          </div>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
            ${isPast ? `<span style="font-size:10px;color:var(--text3);background:var(--surface2);border-radius:4px;padding:2px 6px">Pasada</span>` : 
              isToday ? `<span style="font-size:10px;color:var(--green);background:rgba(45,212,160,0.12);border-radius:4px;padding:2px 6px;font-weight:700">Hoy</span>` : ''}
            <span style="font-size:10px;color:var(--text3)">${s.date?new Date(s.date+'T12:00:00').toLocaleDateString('es-ES'):'—'}</span>
            ${s.esEvento
              ? `<button class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="_calEliminarEvento('${s.evId}')">Eliminar</button>`
              : `<button class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="selectNivel('${s.nivel.replace(/'/g,"\\'")}');renderAll();">Ver grupo</button>`}
          </div>
        </div>`;
    });
    return html;
  }

  function buildConfig() {
    return NIVELES.map(n => {
      const d = getDates(n);
      return `
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px;">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">${n}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            ${[['eval1','I Evaluación','var(--accent)'],['eval2','II Evaluación','var(--green)'],['eval3','III Evaluación','var(--orange)']].map(([k,lbl,col])=>`
              <div>
                <label style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;display:block;margin-bottom:4px">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:4px"></span>${lbl}
                </label>
                <input type="date" value="${d[k]||''}"
                  style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);font-family:inherit;font-size:12px;"
                  onchange="_calUpdateDate('${n.replace(/'/g,"\\'")}','${k}',this.value)">
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');
  }

  // ── Main render ──
  const viewMode = window._calView || 'calendar';
  mc.innerHTML = `
    <div class="main dash-wrap" style="padding-bottom:40px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;">📅 Calendario</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px;">${sessions.length} sesión${sessions.length===1?'':'es'} de evaluación · ${calEventos.length} evento${calEventos.length===1?'':'s'} · pulsa un día para añadir</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm${viewMode==='calendar'?' ':''}" style="${viewMode==='calendar'?'border-color:var(--accent);color:var(--accent);background:rgba(79,142,247,0.08)':''}" onclick="_calSetView('calendar')">📆 Mes</button>
          <button class="btn btn-ghost btn-sm" style="${viewMode==='timeline'?'border-color:var(--accent);color:var(--accent);background:rgba(79,142,247,0.08)':''}" onclick="_calSetView('timeline')">📋 Cronología</button>
          <button class="btn btn-ghost btn-sm" style="${viewMode==='config'?'border-color:var(--yellow);color:var(--yellow);background:rgba(245,200,66,0.08)':''}" onclick="_calSetView('config')">⚙ Configurar</button>
        </div>
      </div>

      <!-- LEGEND -->
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
        ${Object.values(tipoMeta).map(t=>`
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);">
            <span style="width:10px;height:10px;border-radius:50%;background:${t.dot};flex-shrink:0"></span>
            ${t.label}
          </div>`).join('')}
        <span style="width:1px;background:var(--border);align-self:stretch"></span>
        ${CAL_EV_TIPOS.map(t=>`
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);">
            <span style="width:10px;height:10px;border-radius:2px;background:${t.color};flex-shrink:0"></span>
            ${t.label}
          </div>`).join('')}
        <div style="margin-left:auto;font-size:11px;color:var(--text3)">Pulsa un día para ver o añadir</div>
      </div>

      <!-- MAIN VIEW -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:var(--shadow);margin-bottom:20px;" id="calMainView">
        ${viewMode === 'calendar' ? buildCalendar(window._calYear, window._calMonth)
          : viewMode === 'timeline' ? buildTimeline()
          : buildConfig()}
      </div>

      <!-- DAY DETAIL -->
      <div id="calDayDetail" style="display:none;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:var(--shadow);margin-bottom:20px;"></div>

      <!-- NEXT SESSION BANNER -->
      ${(() => {
        const today = new Date().toISOString().split('T')[0];
        const next = sessions.find(s => s.date >= today);
        if (!next) return '';
        const daysUntil = Math.round((new Date(next.date+'T12:00:00') - new Date()) / 86400000);
        const urgColor = daysUntil <= 3 ? 'var(--red)' : daysUntil <= 7 ? 'var(--orange)' : 'var(--accent)';
        return `<div style="background:${daysUntil<=3?'rgba(247,110,110,0.08)':daysUntil<=7?'rgba(247,157,79,0.08)':'rgba(79,142,247,0.08)'};border:1px solid ${urgColor};border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="font-size:24px">${daysUntil<=3?'🚨':daysUntil<=7?'⚠️':'📌'}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">Próxima sesión: <span style="color:${urgColor}">${next.nivel} — ${next.label}</span></div>
            <div style="font-size:12px;color:var(--text2);margin-top:2px">${new Date(next.date+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${daysUntil===0?'Hoy':daysUntil===1?'Mañana':`En ${daysUntil} días`}</div>
          </div>
        </div>`;
      })()}
    </div>`;

  // JS helpers on window
  window._calSetView = function(v) { window._calView = v; renderCalendario(); };
  window._calPrev = function() {
    window._calMonth--;
    if (window._calMonth < 0) { window._calMonth = 11; window._calYear--; }
    renderCalendario();
  };
  window._calNext = function() {
    window._calMonth++;
    if (window._calMonth > 11) { window._calMonth = 0; window._calYear++; }
    renderCalendario();
  };
  window._calToday = function() {
    const now = new Date();
    window._calYear = now.getFullYear();
    window._calMonth = now.getMonth();
    renderCalendario();
  };
  window._calDayClick = function(iso) {
    const detail = document.getElementById('calDayDetail');
    if (!detail) return;
    window._calDiaAbierto = iso;
    const dayEvals = sessions.filter(s => s.date === iso);
    const dayEvs = calEventos.filter(e => e.fecha === iso);
    const dateLabel = new Date(iso+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    detail.style.display = 'block';
    detail.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">📅 ${dateLabel.charAt(0).toUpperCase()+dateLabel.slice(1)}</div>
      ${dayEvals.map(s=>`
        <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-left:4px solid ${s.dot};border-radius:8px;margin-bottom:6px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${s.dot};flex-shrink:0"></div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">${s.nivel}</div>
            <div style="font-size:11px;color:var(--text2)">${s.label}</div>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-left:auto;font-size:11px"
            onclick="selectNivel('${s.nivel.replace(/'/g,"\\'")}');renderAll();">Ir al nivel →</button>
        </div>`).join('')}
      ${dayEvs.map(e=>{ const info=calEvTipoInfo(e.tipo); return `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-left:4px solid ${info.color};border-radius:8px;margin-bottom:6px;">
          <div style="width:10px;height:10px;border-radius:2px;background:${info.color};flex-shrink:0"></div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">${_calEsc(e.titulo||'(sin título)')}</div>
            <div style="font-size:11px;color:var(--text2)">${info.label}${e.nota?' · '+_calEsc(e.nota):''}</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto;font-size:11px" onclick="_calEliminarEvento('${e.id}')">Eliminar</button>
        </div>`; }).join('')}
      ${(!dayEvals.length && !dayEvs.length) ? `<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Sin sesiones ni eventos este día.</div>` : ''}
      <div style="border-top:1px solid var(--border);margin-top:10px;padding-top:10px">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Añadir evento</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input id="calEvTitulo" placeholder="Título del evento" style="flex:2;min-width:160px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);font-family:inherit;font-size:12px;">
          <select id="calEvTipo" style="flex:1;min-width:130px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);font-family:inherit;font-size:12px;">
            ${CAL_EV_TIPOS.map(t=>`<option value="${t.id}">${t.label}</option>`).join('')}
          </select>
          <input id="calEvNota" placeholder="Nota (opcional)" style="flex:2;min-width:140px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);font-family:inherit;font-size:12px;">
          <button class="btn btn-primary btn-sm" style="font-size:11px" onclick="_calAnadirEvento('${iso}')">+ Añadir</button>
        </div>
      </div>`;
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  window._calAnadirEvento = function(iso) {
    const t = document.getElementById('calEvTitulo');
    const tipo = document.getElementById('calEvTipo');
    const nota = document.getElementById('calEvNota');
    const titulo = (t.value||'').trim();
    if (!titulo) { mostrarAviso('Escribe un título para el evento.'); return; }
    calEventos.push({ id: 'ev'+Math.random().toString(36).slice(2,9), fecha: iso, titulo, tipo: tipo.value, nota: (nota.value||'').trim() });
    markDirty();
    renderCalendario();
    setTimeout(() => { if (window._calDayClick) window._calDayClick(iso); }, 0);
  };
  window._calEliminarEvento = async function(id) {
    const ev = calEventos.find(e => e.id === id);
    if (!ev) return;
    if (!await confirmar('¿Eliminar el evento "' + (ev.titulo||'') + '"?')) return;
    const iso = ev.fecha;
    const i = calEventos.indexOf(ev);
    calEventos.splice(i, 1);
    markDirty();
    renderCalendario();
    setTimeout(() => { if (window._calDayClick) window._calDayClick(iso); }, 0);
  };
  window._calUpdateDate = function(nivel, campo, valor) {
    if (!evalDates[nivel]) evalDates[nivel] = { eval1: '', eval2: '', eval3: '' };
    evalDates[nivel][campo] = valor;
    markDirty();
    renderCalendario();
  };
}

// ===================== CONVIVENCIA =====================
// Los datos de AC, Partes, Expedientes y Faltas se calculan en tiempo real a
// partir de las columnas correspondientes de cada alumno en las tablas de
// evaluación (ac1/2/3, partes1/2/3, expedientes1/2/3, faltasJust1/2/3,
// faltasInjust1/2/3) — ver _getConviv más abajo. El objeto window._convivenciaData
// se conserva solo por compatibilidad con copias de seguridad antiguas (versión
// previa con introducción manual de datos); ya no se usa para calcular nada.
if (!window._convivenciaData) window._convivenciaData = {};

// Las 5 métricas de convivencia/asistencia se calculan a partir de los datos
// reales introducidos en la tabla de cada evaluación (columnas AC, Partes,
// Expedientes, F. Just. y F. Injust. de cada alumno), no de un registro manual
// aparte. Así no hay que introducir el mismo dato dos veces.
const CONVIV_METRICS = [
  { key:'ac',           campo:'ac',           label:'Amonestaciones (AC)',        abbr:'AC',     color:'#f5c842' },
  { key:'partes',       campo:'partes',       label:'Partes de Amonestación',     abbr:'Partes', color:'#f79d4f' },
  { key:'expedientes',  campo:'expedientes',  label:'Expedientes Disciplinarios', abbr:'Exped.', color:'#f76e6e' },
  { key:'faltasJust',   campo:'faltasJust',   label:'Faltas Justificadas',        abbr:'F.Just.', color:'#4f8ef7' },
  { key:'faltasInjust', campo:'faltasInjust', label:'Faltas Injustificadas',      abbr:'F.Inj.',  color:'#e85d75' },
];
const CONVIV_EVALS = [
  { key:'eval1', label:'I Eval.',   color:'#4f8ef7' },
  { key:'eval2', label:'II Eval.',  color:'#7c5cfc' },
  { key:'eval3', label:'III Eval.', color:'#2dd4a0' },
];
let _convivMetric = 'ac';
let _convivChartInstances = [];

// Suma, para un grupo y una evaluación dadas, el valor de una métrica (campo
// numérico del alumno: ac1/2/3, partes1/2/3, expedientes1/2/3, faltasJust1/2/3,
// faltasInjust1/2/3) a través de todos sus alumnos.
function _convivSumaGrupo(nivel, grupo, evalKey, metricKey) {
  const m = CONVIV_METRICS.find(x => x.key === metricKey);
  if (!m) return 0;
  const evalNum = evalKey === 'eval1' ? '1' : evalKey === 'eval2' ? '2' : '3';
  const alumnos = (data[nivel]?.[grupo] || []).filter(a => a.nombre && a.nombre.trim());
  return alumnos.reduce((s, a) => s + (+a[m.campo + evalNum] || 0), 0);
}

// Devuelve el registro { eval1:{ac,partes,...}, eval2:{...}, eval3:{...} } de
// un grupo, calculado en tiempo real a partir de los datos de sus alumnos.
function _getConviv(nivel, grupo) {
  const out = {};
  CONVIV_EVALS.forEach(ev => {
    out[ev.key] = {};
    CONVIV_METRICS.forEach(m => { out[ev.key][m.key] = _convivSumaGrupo(nivel, grupo, ev.key, m.key); });
  });
  return out;
}

// Cambia la métrica seleccionada para las gráficas.
function setConvivMetric(m) {
  _convivMetric = m;
  document.querySelectorAll('.conviv-mbtn').forEach(b => b.classList.toggle('active', b.dataset.metric === m));
  drawConvivCharts();
}

// Crea un gráfico de barras agrupadas con el estilo del tema.
function _makeConvivBar(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;
  const chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { labels: { color: '#b8c0d8', font: { size: 11 }, boxWidth: 12, padding: 12, usePointStyle: true } },
        tooltip: {
          backgroundColor: '#161c2d', borderColor: '#2e3a5c', borderWidth: 1,
          titleColor: '#dde3f5', bodyColor: '#dde3f5', padding: 10, cornerRadius: 8
        }
      },
      scales: {
        x: { ticks: { color: '#9aa3bb', font: { size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#9aa3bb', font: { size: 10 }, precision: 0 }, grid: { color: 'rgba(120,130,160,0.12)' } }
      }
    }
  });
  _convivChartInstances.push(chart);
}

// Construye y dibuja las gráficas de la métrica seleccionada:
//  · una agrupada por nivel (suma de los grupos)
//  · una por cada nivel con el detalle de sus grupos
function drawConvivCharts() {
  const area = document.getElementById('convivChartsArea');
  if (!area) return;
  _convivChartInstances.forEach(c => { try { c.destroy(); } catch (e) {} });
  _convivChartInstances = [];

  if (typeof Chart === 'undefined') { area.innerHTML = '<div style="color:var(--text3);padding:20px">Chart.js no disponible.</div>'; return; }

  const m = CONVIV_METRICS.find(x => x.key === _convivMetric) || CONVIV_METRICS[0];
  const nivelesConv = NIVELES.filter(n => (GRUPOS_POR_NIVEL[n] || []).length);
  if (!nivelesConv.length) { area.innerHTML = '<div style="text-align:center;color:var(--text3);padding:30px">No hay niveles/grupos definidos.</div>'; return; }

  const sumNivel = (n, evKey) => (GRUPOS_POR_NIVEL[n] || []).reduce((s, g) => s + _getConviv(n, g)[evKey][m.key], 0);
  const totalsPerEval = CONVIV_EVALS.map(ev => nivelesConv.reduce((s, n) => s + sumNivel(n, ev.key), 0));
  const grand = totalsPerEval.reduce((a, b) => a + b, 0);

  area.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
      ${CONVIV_EVALS.map((ev, i) => `
        <div style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${ev.color};border-radius:10px;padding:10px 14px;">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px">${ev.label}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:${ev.color};line-height:1.15">${totalsPerEval[i]}</div>
        </div>`).join('')}
      <div style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${m.color};border-radius:10px;padding:10px 14px;">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px">Total curso</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:${m.color};line-height:1.15">${grand}</div>
      </div>
    </div>

    <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
      <span style="width:3px;height:14px;background:${m.color};border-radius:2px;display:inline-block"></span>
      ${m.label} — por grupo y evaluación
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px;">
      ${nivelesConv.map((n, i) => `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:8px;">
            <span>${n}</span>
            <span style="font-size:10px;color:var(--text3);font-weight:500">${(GRUPOS_POR_NIVEL[n] || []).length} grupo(s)</span>
          </div>
          <div style="position:relative;height:220px;"><canvas id="convivLvl_${i}"></canvas></div>
        </div>`).join('')}
    </div>
  `;

  // Una gráfica por nivel con el detalle de su(s) grupo(s)
  nivelesConv.forEach((n, i) => {
    const grupos = GRUPOS_POR_NIVEL[n] || [];
    _makeConvivBar('convivLvl_' + i, grupos.slice(),
      CONVIV_EVALS.map(ev => ({
        label: ev.label,
        data: grupos.map(g => _getConviv(n, g)[ev.key][m.key]),
        backgroundColor: ev.color, borderRadius: 4, maxBarThickness: 34
      }))
    );
  });
}

// ===================== INFORME DE CONVIVENCIA =====================
// Genera un informe imprimible/guardable como PDF con el resumen de AC,
// Partes, Expedientes y Faltas (justificadas/injustificadas), por grupo, y los
// rankings de alumnos con más incidencias — para una evaluación concreta
// (evalKey = 'eval1'|'eval2'|'eval3') o para el curso completo (evalKey = 'total').
function exportConvivenciaInforme(evalKey) {
  const esTotal = evalKey === 'total';
  const evalsIncluidas = esTotal ? ['eval1','eval2','eval3'] : [evalKey];
  const tituloEval = { eval1: 'I Evaluación', eval2: 'II Evaluación', eval3: 'Evaluación Final', total: 'Informe Final del Curso (acumulado)' }[evalKey];

  const nivelesConv = NIVELES.filter(n => (GRUPOS_POR_NIVEL[n] || []).length);
  const gruposInfo = [];
  nivelesConv.forEach(n => (GRUPOS_POR_NIVEL[n]||[]).forEach(g => {
    const alumnos = (data[n]?.[g] || []).filter(a => a.nombre && a.nombre.trim());
    if (alumnos.length) gruposInfo.push({ nivel: n, grupo: g, alumnos });
  }));

  if (!gruposInfo.length) { showToast('⚠ No hay alumnos registrados'); return; }

  const dateStr = new Date().toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});
  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Suma de una métrica para un alumno, a través de las evaluaciones incluidas
  const sumaAlumno = (a, campo) => evalsIncluidas.reduce((s, ev) => {
    const n = ev === 'eval1' ? '1' : ev === 'eval2' ? '2' : '3';
    return s + (+a[campo + n] || 0);
  }, 0);

  // ── Estadísticas por grupo ──
  const statsGrupos = gruposInfo.map(({ nivel, grupo, alumnos }) => {
    const tutor = tutores[`${nivel}-${grupo}`] || '—';
    const totales = {};
    CONVIV_METRICS.forEach(m => { totales[m.key] = alumnos.reduce((s,a) => s + sumaAlumno(a, m.campo), 0); });
    return { nivel, grupo, tutor, total: alumnos.length, totales, alumnos };
  });

  // ── Rankings globales de alumnos por métrica (todos los grupos) ──
  const todosAlumnos = [];
  statsGrupos.forEach(g => g.alumnos.forEach(a => todosAlumnos.push({ ...a, _nivel: g.nivel, _grupo: g.grupo })));
  const rankings = {};
  CONVIV_METRICS.forEach(m => {
    rankings[m.key] = todosAlumnos
      .map(a => ({ nombre: a.nombre, nivel: a._nivel, grupo: a._grupo, valor: sumaAlumno(a, m.campo) }))
      .filter(x => x.valor > 0)
      .sort((a,b) => b.valor - a.valor)
      .slice(0, 10);
  });

  const kpiBlock = (totales) => CONVIV_METRICS.map(m => `
    <div class="kpi"><div class="kpi-val" style="color:${m.color}">${totales[m.key]}</div><div class="kpi-lab">${m.abbr}</div></div>
  `).join('');

  const rankingBlock = (m) => {
    const list = rankings[m.key];
    if (!list.length) return `<div style="color:#999;font-size:10pt">Sin incidencias registradas.</div>`;
    return list.map((x,i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="width:16px;font-size:9pt;color:#999;text-align:right">${i+1}.</span>
        <span style="flex:1;font-size:10pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(x.nombre)}">${esc(x.nombre)} <span style="color:#999;font-size:8.5pt">(${esc(x.nivel)} ${esc(x.grupo)})</span></span>
        <span style="font-weight:700;font-size:10pt;color:${m.color};min-width:20px;text-align:right">${x.valor}</span>
      </div>`).join('');
  };

  const grupoCard = (g) => `
    <div class="card" style="margin-bottom:14px;page-break-inside:avoid;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <div style="font-size:12pt;font-weight:700;color:#1a3a6b">${esc(g.nivel)} ${esc(g.grupo)}</div>
        <div style="font-size:9pt;color:#666">Tutor/a: ${esc(g.tutor)} &nbsp;·&nbsp; ${g.total} alumno${g.total!==1?'s':''}</div>
      </div>
      <div class="kpi-row">${kpiBlock(g.totales)}</div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Informe de Convivencia — ${esc(tituloEval)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a2e; margin: 0; padding: 20px; }
    h1 { font-size: 16pt; color: #1a3a6b; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 10pt; margin-bottom: 20px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { background: #f4f6fb; border-radius: 10px; padding: 14px 18px; }
    .card-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 10px; }
    .kpi-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .kpi { background: #fff; border: 1px solid #dde; border-radius: 8px; padding: 9px 13px; text-align: center; flex: 1; min-width: 76px; }
    .kpi-val { font-size: 19pt; font-weight: 700; color: #1a3a6b; }
    .kpi-lab { font-size: 8.5pt; color: #888; }
    .section-title { font-size: 13pt; font-weight: 800; color: #1a3a6b; margin: 22px 0 10px; border-bottom: 2px solid #dde; padding-bottom: 6px; }
    @media print { body { padding: 0; } .card { page-break-inside: avoid; } }
  </style>
  </head><body>
  <h1>🤝 Informe de Convivencia — ${esc(tituloEval)}</h1>
  <div class="subtitle">${esc(iesName)} &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; ${todosAlumnos.length} alumnos en ${statsGrupos.length} grupo${statsGrupos.length!==1?'s':''}</div>

  <div class="grid2">
    ${CONVIV_METRICS.map(m => `
      <div class="card">
        <div class="card-title" style="color:${m.color}">Alumnos con más ${esc(m.label.toLowerCase())}</div>
        ${rankingBlock(m)}
      </div>`).join('')}
  </div>

  <div class="section-title">Detalle por grupo</div>
  ${statsGrupos.map(grupoCard).join('')}

  </body></html>`;

  const win = _ventanaDoc();
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  } else {
    showToast('⚠ Activa las ventanas emergentes para exportar PDF');
  }
}

// Pestaña "Actas no Oficiales": centraliza el acceso a las Actas I/II/Final
// (editables) de todos los grupos, para no tener que ir grupo a grupo. El
// punto verde junto a cada botón indica que ya existe una versión guardada.
function renderActasNoOficiales() {
  const mc = document.getElementById('mainContent');
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const nivelesConAlumnos = NIVELES.filter(n => (GRUPOS_POR_NIVEL[n]||[]).some(g => (data[n]?.[g]||[]).some(a=>a.nombre&&a.nombre.trim())));

  const dot = (nivel, grupo, evalNum) => _actaGetGuardada(nivel, grupo, evalNum)
    ? '<span title="Hay una versión guardada de esta acta" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2dd4a0;margin-left:5px;vertical-align:middle;"></span>'
    : '';

  const cards = nivelesConAlumnos.length ? nivelesConAlumnos.map(n => {
    const grupos = (GRUPOS_POR_NIVEL[n]||[]).filter(g => (data[n]?.[g]||[]).some(a=>a.nombre&&a.nombre.trim()));
    const rows = grupos.map(g => {
      const tut = tutores[`${n}-${g}`] || '';
      const ng = n.replace(/'/g,"\\'"), gg = g.replace(/'/g,"\\'");
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 4px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
        <div style="min-width:150px;">
          <div style="font-weight:700;font-size:13px;color:var(--text)">${esc(n)} ${esc(g)}</div>
          ${tut ? `<div style="font-size:10.5px;color:var(--text3)">${esc(tut)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm" style="background:rgba(79,142,247,0.15);color:var(--accent);border:1px solid var(--accent);" onclick="openInforme('${ng}','${gg}',1)">📄 Acta I${dot(n,g,1)}</button>
          <button class="btn btn-sm" style="background:rgba(45,212,160,0.15);color:var(--green);border:1px solid var(--green);" onclick="openInforme('${ng}','${gg}',2)">📄 Acta II${dot(n,g,2)}</button>
          <button class="btn btn-sm" style="background:rgba(124,92,252,0.15);color:var(--purple);border:1px solid var(--purple);" onclick="openInforme('${ng}','${gg}',3)">📄 Acta Final${dot(n,g,3)}</button>
        </div>
      </div>`;
    }).join('');
    return `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:16px;box-shadow:var(--shadow)">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">${esc(n)}</div>
        ${rows}
      </div>`;
  }).join('') : `<div style="text-align:center;color:var(--text3);padding:30px">No hay niveles/grupos con alumnado registrado.</div>`;

  mc.innerHTML = `
    <div class="main dash-wrap" style="padding-bottom:40px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px">🗂️ Actas no Oficiales</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">Actas de sesión editables (I, II y Evaluación Final) de todos los grupos, en un único lugar · <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2dd4a0;vertical-align:middle;"></span> = ya guardada</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="toggleActasNoOficialesTab()" title="Oculta esta pestaña de la barra superior (se puede volver a mostrar con el icono 🗂️👁️)">🙈 Ocultar esta pestaña</button>
      </div>
      ${cards}
    </div>`;
}

function renderConvivencia() {
  const mc = document.getElementById('mainContent');
  const nivelesConv = NIVELES.filter(n => (GRUPOS_POR_NIVEL[n] || []).length);

  const entry = nivelesConv.length ? nivelesConv.map(n => {
    const grupos = GRUPOS_POR_NIVEL[n] || [];
    const rows = grupos.map(g => {
      const d = _getConviv(n, g);
      const tut = tutores[`${n}-${g}`] || '';
      const cell = (ev, metricKey, sep) => {
        const v = d[ev][metricKey];
        return `<td${sep ? ' class="conviv-eval-sep"' : ''}>${v || '·'}</td>`;
      };
      return `<tr>
        <td class="conviv-grupo">${n} ${g}${tut ? `<span style="font-weight:400;color:var(--text3);font-size:10px;display:block">${tut}</span>` : ''}</td>
        ${cell('eval1','ac',false)}${cell('eval1','partes',false)}${cell('eval1','expedientes',false)}${cell('eval1','faltasJust',false)}${cell('eval1','faltasInjust',false)}
        ${cell('eval2','ac',true)}${cell('eval2','partes',false)}${cell('eval2','expedientes',false)}${cell('eval2','faltasJust',false)}${cell('eval2','faltasInjust',false)}
        ${cell('eval3','ac',true)}${cell('eval3','partes',false)}${cell('eval3','expedientes',false)}${cell('eval3','faltasJust',false)}${cell('eval3','faltasInjust',false)}
      </tr>`;
    }).join('');
    return `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:16px;box-shadow:var(--shadow)">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">${n}</div>
        <div style="overflow-x:auto">
          <table class="conviv-table">
            <thead>
              <tr>
                <th rowspan="2" class="conviv-grupo" style="text-align:left">Grupo</th>
                <th colspan="5" style="color:#4f8ef7">I Evaluación</th>
                <th colspan="5" style="color:#7c5cfc" class="conviv-eval-sep">II Evaluación</th>
                <th colspan="5" style="color:#2dd4a0" class="conviv-eval-sep">III Evaluación</th>
              </tr>
              <tr>
                <th title="Amonestaciones">AC</th><th title="Partes de Amonestación">Partes</th><th title="Expedientes Disciplinarios">Exped.</th><th title="Faltas Justificadas">F.Just.</th><th title="Faltas Injustificadas">F.Inj.</th>
                <th title="Amonestaciones" class="conviv-eval-sep">AC</th><th title="Partes de Amonestación">Partes</th><th title="Expedientes Disciplinarios">Exped.</th><th title="Faltas Justificadas">F.Just.</th><th title="Faltas Injustificadas">F.Inj.</th>
                <th title="Amonestaciones" class="conviv-eval-sep">AC</th><th title="Partes de Amonestación">Partes</th><th title="Expedientes Disciplinarios">Exped.</th><th title="Faltas Justificadas">F.Just.</th><th title="Faltas Injustificadas">F.Inj.</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('') : `<div style="text-align:center;color:var(--text3);padding:30px">No hay niveles/grupos definidos. Crea niveles y grupos primero.</div>`;

  mc.innerHTML = `
    <div class="main dash-wrap" style="padding-bottom:40px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px">🤝 Informe Convivencia</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">Amonestaciones (AC), Partes, Expedientes y Faltas de Asistencia — calculado a partir de las tablas de cada evaluación</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin:18px 0 12px;display:flex;align-items:center;gap:8px;">
        <span style="width:3px;height:14px;background:var(--orange);border-radius:2px;display:inline-block"></span>
        Resumen por grupo y evaluación
        <span style="font-weight:500;text-transform:none;letter-spacing:0;color:var(--text3);font-size:10px">— datos de las columnas AC, Partes, Expedientes, F. Just. y F. Injust. de cada evaluación, sumados por alumno</span>
      </div>
      ${entry}

      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin:28px 0 12px;display:flex;align-items:center;gap:8px;">
        <span style="width:3px;height:14px;background:var(--red);border-radius:2px;display:inline-block"></span>
        Informes
        <span style="font-weight:500;text-transform:none;letter-spacing:0;color:var(--text3);font-size:10px">— por evaluación, o un informe final con el acumulado de todo el curso</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">
        <button class="conviv-mbtn" onclick="exportConvivenciaInforme('eval1')">📄 Informe I Evaluación</button>
        <button class="conviv-mbtn" onclick="exportConvivenciaInforme('eval2')">📄 Informe II Evaluación</button>
        <button class="conviv-mbtn" onclick="exportConvivenciaInforme('eval3')">📄 Informe Evaluación Final</button>
        <button class="conviv-mbtn" style="border-color:var(--red);color:var(--red)" onclick="exportConvivenciaInforme('total')">📑 Informe Final (curso completo)</button>
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin:28px 0 12px;display:flex;align-items:center;gap:8px;">
        <span style="width:3px;height:14px;background:var(--accent);border-radius:2px;display:inline-block"></span>
        Gráficas
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">
        ${CONVIV_METRICS.map(m => `<button class="conviv-mbtn ${_convivMetric === m.key ? 'active' : ''}" data-metric="${m.key}" onclick="setConvivMetric('${m.key}')">${m.label}</button>`).join('')}
      </div>
      <div id="convivChartsArea"></div>
    </div>
  `;
  drawConvivCharts();
}

// ===================== INFORME ACADÉMICO =====================
// Estadísticas de aprobados/suspensos POR MATERIA y por nivel, organizadas en
// subpestañas por evaluación. La fuente de datos por materia (con nombre) son
// las listas de pendientes de cada evaluación:
//   · pendientes1    → materias suspensas en la I Evaluación
//   · pendientes2    → materias suspensas en la II Evaluación
//   · pendientesIII  → materias suspensas en la Evaluación Final (antes "Ordinaria III Eval.")
//   · pendientesExtr → materias suspensas tras la Evaluación Extraordinaria (solo Bachillerato)
const INFORME_FUENTES = {
  pendientes1:    { label: 'I Evaluación',            corto: 'I Eval.',   campoPropuesta: 'propuesta1', soloBach: false },
  pendientes2:    { label: 'II Evaluación',           corto: 'II Eval.',  campoPropuesta: 'propuesta2', soloBach: false },
  pendientesIII:  { label: 'Evaluación Final',        corto: 'Ev. Final', campoPropuesta: 'promociona', soloBach: false },
  pendientesExtr: { label: 'Evaluación Extraordinaria', corto: 'Extraord.', campoPropuesta: null,        soloBach: true  },
};
let _informeFuente = 'pendientesIII';
let _informeGrupoFiltro = 'todos'; // 'todos' o 'NIVEL::GRUPO'
let _informeChartInstances = [];

// Tramos para la distribución de alumnos según su nº de materias suspensas
const INFORME_BUCKETS = [
  { label: 'Todo aprobado', test: n => n === 0,           color: '#2dd4a0' },
  { label: '1–2 susp.',     test: n => n >= 1 && n <= 2,   color: '#f5c842' },
  { label: '3–4 susp.',     test: n => n >= 3 && n <= 4,   color: '#f79d4f' },
  { label: '5 o más',       test: n => n >= 5,             color: '#f76e6e' },
];

function setInformeFuente(f) {
  _informeFuente = f;
  const fcfg = INFORME_FUENTES[f];
  if (fcfg && fcfg.soloBach && _informeGrupoFiltro !== 'todos') {
    const [fNivel] = _informeGrupoFiltro.split('::');
    if (!isBach(fNivel)) _informeGrupoFiltro = 'todos';
  }
  renderInformeAcademico();
}

function setInformeGrupo(v) { _informeGrupoFiltro = v; renderInformeAcademico(); }

// Gráfico de barras apiladas con el estilo del tema (para la distribución por nivel).
function _makeInformeStackedBar(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;
  const chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { labels: { color: '#b8c0d8', font: { size: 11 }, boxWidth: 12, padding: 12, usePointStyle: true } },
        tooltip: { backgroundColor: '#161c2d', borderColor: '#2e3a5c', borderWidth: 1, titleColor: '#dde3f5', bodyColor: '#dde3f5', padding: 10, cornerRadius: 8 }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#9aa3bb', font: { size: 11 } }, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { color: '#9aa3bb', font: { size: 10 }, precision: 0 }, grid: { color: 'rgba(120,130,160,0.12)' } }
      }
    }
  });
  _informeChartInstances.push(chart);
}

// Calcula las estadísticas por materia de un nivel para la fuente indicada.
// grupoFiltro (opcional): restringe el cálculo a un único grupo del nivel.
function _informeNivelStats(nivel, fuente, grupoFiltro) {
  const gruposNivel = GRUPOS_POR_NIVEL[nivel] || [];
  const grupos = grupoFiltro ? gruposNivel.filter(g => g === grupoFiltro) : gruposNivel;
  const alumnos = grupos.flatMap(g => (data[nivel]?.[g] || []).filter(a => a.nombre && a.nombre.trim()));
  const N = alumnos.length;
  // Universo de materias: las configuradas para el nivel + las que aparezcan en pendientes
  const subjSet = new Set();
  grupos.forEach(g => (getMateriasParaNivel(nivel, g) || []).forEach(m => subjSet.add(m)));
  alumnos.forEach(a => (Array.isArray(a[fuente]) ? a[fuente] : []).forEach(m => subjSet.add(m)));
  const subjects = [...subjSet].map(m => {
    const susp = alumnos.filter(a => Array.isArray(a[fuente]) && a[fuente].includes(m)).length;
    const aprob = Math.max(0, N - susp);
    const pctSusp = N ? Math.round(susp / N * 100) : 0;
    return { materia: m, susp, aprob, pctSusp, pctAprob: 100 - pctSusp };
  });
  subjects.sort((a, b) => b.susp - a.susp || a.materia.localeCompare(b.materia, 'es'));
  const totalSusp = subjects.reduce((s, x) => s + x.susp, 0);
  const conSusp = subjects.filter(x => x.susp > 0);
  const limpias = subjects.filter(x => x.susp === 0);
  const masSusp = subjects[0] && subjects[0].susp > 0 ? subjects[0] : null;
  const menosSusp = conSusp.length ? conSusp[conSusp.length - 1] : null;
  const celdas = N * subjects.length;
  const pctAprobGlobal = celdas ? Math.round((1 - totalSusp / celdas) * 100) : 100;
  const promSuspAlumno = N ? (totalSusp / N) : 0;
  const dist = INFORME_BUCKETS.map(b => alumnos.filter(a => b.test((Array.isArray(a[fuente]) ? a[fuente] : []).length)).length);
  return { nivel, N, subjects, totalSusp, conSusp, limpias, masSusp, menosSusp, pctAprobGlobal, promSuspAlumno, dist };
}

function renderInformeAcademico() {
  const mc = document.getElementById('mainContent');
  _informeChartInstances.forEach(c => { try { c.destroy(); } catch (e) {} });
  _informeChartInstances = [];
  destroyAllDonuts();
  _dashDonuts = []; // se rellena con cada gráfico circular durante la construcción del HTML
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fuente = _informeFuente;
  const fcfg = INFORME_FUENTES[fuente] || INFORME_FUENTES.pendientesIII;
  const fuenteLabel = fcfg.soloBach ? `${fcfg.label} (solo 1º y 2º Bachillerato)` : fcfg.label;

  // Filtro por grupo: '' = todos los grupos del centro; si no, restringe todo
  // el informe (KPIs, ranking, distribución, tarjetas) a un único grupo.
  const filtroActivo = _informeGrupoFiltro !== 'todos';
  let filtroNivel = null, filtroGrupo = null;
  if (filtroActivo) { [filtroNivel, filtroGrupo] = _informeGrupoFiltro.split('::'); }

  // La evaluación extraordinaria solo existe en 1º y 2º de Bachillerato
  const nivelesFuente = (fcfg.soloBach ? NIVELES.filter(n => isBach(n)) : NIVELES)
    .filter(n => !filtroActivo || n === filtroNivel);
  const allStats = nivelesFuente.map(n => _informeNivelStats(n, fuente, filtroActivo ? filtroGrupo : null)).filter(s => s.N > 0);
  const totalAlumnos = allStats.reduce((s, x) => s + x.N, 0);
  const totalSuspCentro = allStats.reduce((s, x) => s + x.totalSusp, 0);

  // Alumnado agregado de la fuente seleccionada (para la distribución global y el PDF)
  const todosAlInforme = [];
  nivelesFuente.forEach(n => (GRUPOS_POR_NIVEL[n]||[]).filter(g => !filtroActivo || g === filtroGrupo).forEach(g =>
    (data[n]?.[g]||[]).filter(a=>a.nombre&&a.nombre.trim()).forEach(a => todosAlInforme.push({...a, _nivel:n, _grupo:g}))
  ));

  // Ranking global de materias (sumando mismas materias entre niveles)
  const globalSubj = {};
  allStats.forEach(s => s.subjects.forEach(x => { globalSubj[x.materia] = (globalSubj[x.materia] || 0) + x.susp; }));
  const globalRanking = Object.entries(globalSubj).map(([m, susp]) => ({ materia: m, susp })).sort((a, b) => b.susp - a.susp);
  const materiaTopCentro = globalRanking.find(x => x.susp > 0) || null;
  const nMateriasCentro = Object.keys(globalSubj).length;
  const pctAprobCentro = (totalAlumnos && allStats.length)
    ? Math.round(allStats.reduce((s, x) => s + x.pctAprobGlobal * x.N, 0) / totalAlumnos)
    : 100;
  // Distribución agregada del centro por nº de suspensos
  const distCentro = INFORME_BUCKETS.map((b, i) => allStats.reduce((s, x) => s + x.dist[i], 0));

  // KPI helper
  const kpi = (label, val, color, sub) => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:13px 16px;min-width:150px;flex:1;">
      <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;font-weight:600">${label}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:${typeof val === 'string' && val.length > 10 ? '15px' : '22px'};font-weight:800;color:${color};line-height:1.2;margin-top:3px">${val}</div>
      ${sub ? `<div style="font-size:10px;color:var(--text3);margin-top:2px">${sub}</div>` : ''}
    </div>`;

  // Barra por materia (aprobados verde / suspensos rojo)
  const subjBar = st => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:7px;flex-wrap:wrap;">
      <span style="font-size:12px;color:var(--text);min-width:170px;max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500" title="${esc(st.materia)}">${esc(st.materia)}</span>
      <div style="flex:1;min-width:140px;display:flex;height:16px;border-radius:5px;overflow:hidden;background:var(--border);">
        <div style="width:${st.pctAprob}%;background:#2dd4a0;transition:width .4s ease;"></div>
        <div style="width:${st.pctSusp}%;background:#f76e6e;transition:width .4s ease;"></div>
      </div>
      <span style="font-size:11px;color:var(--green);min-width:96px;text-align:right;font-family:'JetBrains Mono',monospace">${st.aprob} <span style="color:var(--text3)">(${st.pctAprob}%)</span></span>
      <span style="font-size:11px;color:${st.susp > 0 ? 'var(--red)' : 'var(--text3)'};min-width:90px;text-align:right;font-family:'JetBrains Mono',monospace">${st.susp} <span style="color:var(--text3)">(${st.pctSusp}%)</span></span>
    </div>`;

  const nivelCards = allStats.map(s => {
    const masSusp = s.masSusp ? `${esc(s.masSusp.materia)}` : '—';
    const masSuspSub = s.masSusp ? `${s.masSusp.susp} susp. · ${s.masSusp.pctSusp}%` : 'sin suspensos';
    const menosSusp = s.menosSusp ? `${esc(s.menosSusp.materia)}` : (s.limpias.length ? `${s.limpias.length} materia(s) sin suspensos` : '—');
    const menosSuspSub = s.menosSusp ? `${s.menosSusp.susp} susp. · ${s.menosSusp.pctSusp}%` : '';
    return `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:18px;box-shadow:var(--shadow)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
          <div style="font-size:16px;font-weight:800;color:var(--text);font-family:'Syne',sans-serif">${esc(s.nivel)}</div>
          <div style="font-size:11px;color:var(--text3)">${s.N} alumno${s.N !== 1 ? 's' : ''} · ${s.subjects.length} materias</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
          ${kpi('% Aprobados (global)', s.pctAprobGlobal + '%', s.pctAprobGlobal >= 80 ? 'var(--green)' : s.pctAprobGlobal >= 60 ? 'var(--yellow)' : 'var(--red)')}
          ${kpi('Suspensos totales', s.totalSusp, 'var(--red)', `${s.promSuspAlumno.toFixed(1)} por alumno`)}
          ${kpi('Materia con más suspensos', masSusp, 'var(--red)', masSuspSub)}
          ${kpi('Materia con menos suspensos', menosSusp, 'var(--green)', menosSuspSub)}
        </div>
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Alumnos por nº de suspensos</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">
          ${INFORME_BUCKETS.map((b, i) => `
            <div style="flex:1;min-width:108px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${b.color};border-radius:9px;padding:8px 12px;">
              <div style="font-size:10px;color:var(--text3)">${b.label}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;color:${b.color};line-height:1.2">${s.dist[i]}<span style="font-size:10px;color:var(--text3);font-weight:500"> · ${s.N ? Math.round(s.dist[i] / s.N * 100) : 0}%</span></div>
            </div>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:10px;color:var(--text3);margin-bottom:10px;padding-bottom:8px;border-bottom:1px dashed var(--border2)">
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#2dd4a0;display:inline-block"></span>Aprobados</span>
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#f76e6e;display:inline-block"></span>Suspensos</span>
          <span style="margin-left:auto;color:var(--text3)">Ordenadas por nº de suspensos</span>
        </div>
        ${s.subjects.length ? s.subjects.map(subjBar).join('') : '<div style="color:var(--text3);font-size:12px;padding:8px 0">No hay materias configuradas para este nivel.</div>'}
      </div>`;
  }).join('');

  const _colPendNombre = { pendientes1:'I Pend.', pendientes2:'II Pend.', pendientesIII:'Pend. Próx. Curso', pendientesExtr:'Pend. Extr.' };
  const avisoSinDatos = totalSuspCentro === 0
    ? `<div style="background:rgba(79,142,247,0.08);border:1px solid rgba(79,142,247,0.3);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:var(--text2);line-height:1.5">
        ℹ️ No se han registrado materias suspensas en <strong>${fuenteLabel}</strong>. El detalle por materia se obtiene de las listas de <strong>pendientes</strong> de cada alumno (columna “${_colPendNombre[fuente]}”). Rellénalas en cada grupo para ver las estadísticas.
      </div>` : '';

  mc.innerHTML = `
    <div class="main dash-wrap" style="padding-bottom:40px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px">🎓 Informe Académico</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">Aprobados y suspensos por materia y nivel · ${fuenteLabel}${filtroActivo ? ` · <strong style="color:#22d3ee">${esc(filtroNivel)} ${esc(filtroGrupo)}</strong>` : ''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button class="conviv-mbtn ${fuente === 'pendientes1' ? 'active' : ''}" onclick="setInformeFuente('pendientes1')">I Evaluación</button>
          <button class="conviv-mbtn ${fuente === 'pendientes2' ? 'active' : ''}" onclick="setInformeFuente('pendientes2')">II Evaluación</button>
          <button class="conviv-mbtn ${fuente === 'pendientesIII' ? 'active' : ''}" onclick="setInformeFuente('pendientesIII')">Evaluación Final</button>
          <button class="conviv-mbtn ${fuente === 'pendientesExtr' ? 'active' : ''}" onclick="setInformeFuente('pendientesExtr')">Evaluación Extraordinaria</button>
          <select onchange="setInformeGrupo(this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">
            <option value="todos" ${!filtroActivo ? 'selected' : ''}>Todos los grupos</option>
            ${(fcfg.soloBach ? NIVELES.filter(isBach) : NIVELES).flatMap(n => (GRUPOS_POR_NIVEL[n]||[])
              .filter(g => (data[n]?.[g]||[]).some(a=>a.nombre&&a.nombre.trim()))
              .map(g => {
                const key = `${n}::${g}`;
                return `<option value="${esc(key)}" ${_informeGrupoFiltro===key?'selected':''}>${esc(n)} ${esc(g)}</option>`;
              })).join('')}
          </select>
          <button class="export-pdf-btn" onclick="exportStatsPDF('${fuente}')" title="Exporta el PDF de estadísticas de la evaluación seleccionada, agrupado por nivel y grupo">📊 PDF Estadísticas</button>
        </div>
      </div>

      ${avisoSinDatos}

      ${allStats.length ? `
      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin:6px 0 12px;display:flex;align-items:center;gap:8px;">
        <span style="width:3px;height:14px;background:#22d3ee;border-radius:2px;display:inline-block"></span>
        ${filtroActivo ? `Resumen de ${esc(filtroNivel)} ${esc(filtroGrupo)}` : 'Resumen del centro'}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:26px;">
        ${kpi('Alumnos', totalAlumnos, 'var(--accent)')}
        ${kpi(filtroActivo ? '% Aprobados (grupo)' : '% Aprobados (centro)', pctAprobCentro + '%', pctAprobCentro >= 80 ? 'var(--green)' : pctAprobCentro >= 60 ? 'var(--yellow)' : 'var(--red)')}
        ${kpi('Suspensos totales', totalSuspCentro, 'var(--red)')}
        ${kpi('Materias evaluadas', nMateriasCentro, 'var(--text)')}
        ${kpi('Materia con más suspensos', materiaTopCentro ? esc(materiaTopCentro.materia) : '—', 'var(--red)', materiaTopCentro ? `${materiaTopCentro.susp} en ${filtroActivo ? 'el grupo' : 'todo el centro'}` : '')}
      </div>

      <div class="dash-grid-2" style="margin-bottom:26px;align-items:start;">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow)">
          <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:6px;display:flex;align-items:center;gap:8px;">
            <span style="width:3px;height:14px;background:#22d3ee;border-radius:2px;display:inline-block"></span>
            Distribución de alumnos por nº de suspensos
          </div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:12px">${INFORME_BUCKETS.map((b, i) => `<span style="color:${b.color};font-weight:700">${distCentro[i]}</span> ${b.label.toLowerCase()}`).join(' · ')}</div>
          <div style="position:relative;height:300px;"><canvas id="informeDistChart"></canvas></div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow)">
          <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
            <span style="width:3px;height:14px;background:var(--red);border-radius:2px;display:inline-block"></span>
            Materias con más suspensos ${filtroActivo ? '(grupo)' : '(centro)'}
          </div>
          ${(() => {
            const top = globalRanking.filter(x => x.susp > 0).slice(0, 8);
            const maxR = top[0] ? top[0].susp : 1;
            return top.length ? top.map((x, i) => `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span style="font-size:11px;color:var(--text3);width:18px;text-align:right;font-family:'JetBrains Mono',monospace">${i + 1}.</span>
                <span style="font-size:12px;color:var(--text);min-width:150px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500" title="${esc(x.materia)}">${esc(x.materia)}</span>
                <div style="flex:1;background:var(--border);border-radius:4px;height:13px;overflow:hidden;"><div style="width:${Math.round(x.susp / maxR * 100)}%;height:13px;background:#f76e6e;border-radius:4px"></div></div>
                <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--red);min-width:28px;text-align:right">${x.susp}</span>
              </div>`).join('') : '<div style="color:var(--text3);font-size:12px;padding:8px 0">Sin suspensos registrados.</div>';
          })()}
        </div>
      </div>

      ${fcfg.campoPropuesta ? `
      <div style="margin-bottom:26px;">
        ${dashSection(`informe-dist-${fuente}`, `Distribución ${fcfg.label} · propuesta`, 'var(--accent)', `
          <div style="font-size:10px;color:var(--text3);margin-bottom:12px;line-height:1.4">
            Según la propuesta de <strong style="color:var(--text2)">${fcfg.label}</strong> de cada alumno (datos generales del centro).
          </div>
          ${buildDistGlobal(todosAlInforme, fcfg.campoPropuesta, `informe-dist-${fuente}`, `informeDonut_${fuente}`, 'Sin propuesta')}
        `)}
      </div>
      ` : ''}

      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin:6px 0 14px;display:flex;align-items:center;gap:8px;">
        <span style="width:3px;height:14px;background:#22d3ee;border-radius:2px;display:inline-block"></span>
        ${filtroActivo ? 'Detalle del grupo' : 'Detalle por nivel'}
      </div>
      ${nivelCards}

      <div style="font-size:10px;color:var(--text3);margin-top:6px;line-height:1.5;border-top:1px dashed var(--border2);padding-top:12px">
        Los porcentajes se calculan sobre el total de alumnos del nivel. En materias optativas (que no cursan todos los alumnos) el % de aprobados puede aparecer sobrestimado, ya que quien no la cursa no figura como suspenso.
      </div>
      ` : `<div style="text-align:center;color:var(--text3);padding:40px">${fcfg.soloBach ? 'La evaluación extraordinaria solo aplica a 1º y 2º de Bachillerato, y no hay datos extraordinarios registrados todavía.' : 'No hay alumnos registrados todavía.'}</div>`}
    </div>
  `;

  if (allStats.length) {
    _makeInformeStackedBar('informeDistChart', allStats.map(s => s.nivel),
      INFORME_BUCKETS.map((b, i) => ({ label: b.label, data: allStats.map(s => s.dist[i]), backgroundColor: b.color, borderRadius: 4, maxBarThickness: 48 })));
  }
  // Dibujar los donuts de distribución de propuesta (reutiliza el motor del antiguo Dashboard de Dirección)
  renderDashDonuts();
}
