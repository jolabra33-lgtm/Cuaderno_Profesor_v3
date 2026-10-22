/* ============================================================================
   Gestor de Tutoría · Panel de dirección y gráficos
   tutoria/js/13-panel-direccion.js
   ============================================================================ */

// ===================== DASHBOARD DE DIRECCIÓN =====================

// Estado de plegado de las secciones del dashboard (persiste entre re-renderizados)
let dashCollapsed = {};
// Registro de gráficos circulares construidos en el último render
let _dashDonuts = [];          // especificaciones { canvasId, section, total, centerValue, centerLabel, items[] }
let _dashChartInstances = {};  // canvasId -> instancia de Chart

// Devuelve el HTML de una sección colapsable del dashboard.
function dashSection(id, titleHtml, accent, bodyHtml) {
  const collapsed = !!dashCollapsed[id];
  return `
  <div class="dash-section${collapsed ? ' collapsed' : ''}" data-sec="${id}">
    <div class="dash-section-head" onclick="toggleDashSection('${id}')">
      <div class="dash-section-title">
        <span class="dash-section-accent" style="background:${accent}"></span>
        ${titleHtml}
      </div>
      <span class="dash-section-chev">▾</span>
    </div>
    <div class="dash-section-body">
      ${bodyHtml}
    </div>
  </div>`;
}

// Pliega / despliega una sección sin re-renderizar todo el dashboard.
function toggleDashSection(id) {
  dashCollapsed[id] = !dashCollapsed[id];
  const el = document.querySelector(`.dash-section[data-sec="${id}"]`);
  if (el) el.classList.toggle('collapsed', !!dashCollapsed[id]);
  // (Re)dibujar o destruir los donuts que viven en esta sección
  _dashDonuts.filter(s => s.section === id).forEach(s => {
    if (dashCollapsed[id]) _destroyDonut(s.canvasId);
    else drawDonut(s);
  });
}

// Pliega (collapse=true) o despliega (collapse=false) todas las secciones del dashboard.
function setAllDashSections(collapse) {
  document.querySelectorAll('.dash-wrap .dash-section').forEach(el => {
    const id = el.dataset.sec;
    if (!id) return;
    dashCollapsed[id] = !!collapse;
    el.classList.toggle('collapsed', !!collapse);
  });
  if (collapse) destroyAllDonuts();
  else renderDashDonuts();
}

// ── Gráficos circulares (donuts) ──────────────────────────────────────────
function _destroyDonut(canvasId) {
  if (_dashChartInstances[canvasId]) {
    try { _dashChartInstances[canvasId].destroy(); } catch (e) {}
    delete _dashChartInstances[canvasId];
  }
}
function destroyAllDonuts() {
  Object.keys(_dashChartInstances).forEach(_destroyDonut);
}
// Dibuja todos los donuts cuya sección esté visible (no plegada)
function renderDashDonuts() {
  _dashDonuts.forEach(spec => {
    if (dashCollapsed[spec.section]) return;
    drawDonut(spec);
  });
}
// Dibuja (o redibuja) un donut moderno a partir de su especificación
function drawDonut(spec) {
  if (typeof Chart === 'undefined' || !spec) return;
  const canvas = document.getElementById(spec.canvasId);
  if (!canvas) return;
  _destroyDonut(spec.canvasId);

  const items = spec.items.filter(it => it.value > 0);
  const total = spec.total != null ? spec.total : items.reduce((s, it) => s + it.value, 0);
  const numEl = document.getElementById(spec.canvasId + 'Total');
  if (numEl && spec.centerValue != null) numEl.textContent = spec.centerValue;
  if (!items.length) return;

  // Sombra suave bajo los segmentos (aspecto moderno)
  const glow = {
    id: 'glow_' + spec.canvasId,
    beforeDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    },
    afterDatasetsDraw(chart) { chart.ctx.restore(); }
  };

  _dashChartInstances[spec.canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: items.map(it => it.label),
      datasets: [{
        data: items.map(it => it.value),
        backgroundColor: items.map(it => it.color),
        borderColor: '#0f1420',
        borderWidth: 3,
        hoverOffset: 8,
        hoverBorderColor: '#0f1420',
        borderRadius: 4,
        spacing: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '70%',
      animation: { animateRotate: true, duration: 650, easing: 'easeOutQuart' },
      layout: { padding: 4 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161c2d',
          borderColor: '#2e3a5c',
          borderWidth: 1,
          titleColor: '#dde3f5',
          bodyColor: '#dde3f5',
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            label(ctx) {
              const v = ctx.parsed;
              const pct = total ? Math.round(v / total * 100) : 0;
              return ` ${ctx.label}: ${v} (${pct}%)`;
            }
          }
        }
      }
    },
    plugins: [glow]
  });
}

// ── Constructores reutilizables de distribución (decisiones / propuestas) ──
// Calcula los recuentos por tipo a partir de un campo ('promociona' o 'propuesta2').
// mode 'full'   → 5 categorías (Promoción y Titulación por separado)
// mode 'merged' → 4 categorías (Promoción + Titulación combinadas)
function _distData(alist, field, mode, sinLabel) {
  const cnt = tipo => alist.filter(a => getPropObj(a[field]).tipo === tipo).length;
  const prom = cnt('Promoción'), titu = cnt('Titulación'), rep = cnt('Repetición'), aban = cnt('Abandono');
  const total = alist.length;
  const sin = total - prom - titu - rep - aban;
  const items = (mode === 'merged')
    ? [
        { label: 'Promocionan/Titulan', value: prom + titu, color: '#2dd4a0' },
        { label: 'Repiten',             value: rep,         color: '#f76e6e' },
        { label: 'Abandono',            value: aban,        color: '#9aa3bb' },
        { label: sinLabel,              value: sin,         color: '#f5c842' },
      ]
    : [
        { label: 'Promocionan', value: prom, color: '#2dd4a0' },
        { label: 'Titulan',     value: titu, color: '#a78bfa' },
        { label: 'Repiten',     value: rep,  color: '#f76e6e' },
        { label: 'Abandono',    value: aban, color: '#9aa3bb' },
        { label: sinLabel,      value: sin,  color: '#f5c842' },
      ];
  return { total, prom, titu, rep, aban, sin, items };
}

// HTML del contenedor del donut + número central
function _donutHtml(canvasId, centerVal, centerLbl, small) {
  return `<div class="donut-wrap${small ? ' donut-sm' : ''}">
      <canvas id="${canvasId}"></canvas>
      <div class="donut-center">
        <span class="donut-center-num" id="${canvasId}Total">${centerVal}</span>
        <span class="donut-center-lbl">${centerLbl}</span>
      </div>
    </div>`;
}

// Una fila de barra (etiqueta + barra + recuento + %)
function _barRow(label, c, tot, color, labelW) {
  const pct = tot ? Math.round(c / tot * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;">
      <span style="font-size:11px;color:var(--text2);min-width:${labelW || 90}px;font-weight:500">${label}</span>
      <div style="flex:1;background:var(--border);border-radius:4px;height:13px;overflow:hidden;">
        <div style="width:${pct}%;height:13px;background:${color};border-radius:4px;"></div>
      </div>
      <span style="font-family:inherit;font-size:12px;font-weight:700;color:${color};min-width:28px;text-align:right">${c}</span>
      <span style="font-size:10px;color:var(--text3);min-width:34px;text-align:right">${tot ? pct + '%' : '—'}</span>
    </div>`;
}

// Cuerpo de una sección de distribución GLOBAL (donut + barras de 5 categorías)
function buildDistGlobal(alist, field, sectionId, canvasId, sinLabel) {
  const d = _distData(alist, field, 'full', sinLabel);
  _dashDonuts.push({ canvasId, section: sectionId, total: d.total, centerValue: d.total, centerLabel: 'alumnos', items: d.items });
  const bars = d.items.map(it => _barRow(it.label, it.value, d.total, it.color, 90)).join('');
  // El donut va en una zona flexible que se expande para centrarlo cuando la tarjeta se estira
  return `<div class="dist-donut-fill">${_donutHtml(canvasId, d.total, 'alumnos', false)}</div>
    <div>${bars}</div>`;
}

// Cuerpo de una sección de distribución POR ETAPA (ESO / Bachillerato),
// con donut + barras (Promoción + Titulación combinadas) para cada etapa.
function buildDistEtapa(alist, field, sectionId, canvasPrefix, sinLabel) {
  const etapas = [
    { titulo: 'ESO',          icon: '📘', key: 'eso',  al: alist.filter(a => !isBach(a._nivel)) },
    { titulo: 'Bachillerato', icon: '🎓', key: 'bach', al: alist.filter(a =>  isBach(a._nivel)) },
  ];
  return etapas.map(({ titulo, icon, key, al }) => {
    const tot = al.length;
    if (!tot) return `<div style="margin-bottom:14px;font-size:11px;color:var(--text3)">${icon} ${titulo} — sin alumnos</div>`;
    const d = _distData(al, field, 'merged', sinLabel);
    const passN = d.prom + d.titu;
    const pctProm = tot ? Math.round(passN / tot * 100) : 0;
    const canvasId = `${canvasPrefix}_${key}`;
    _dashDonuts.push({ canvasId, section: sectionId, total: tot, centerValue: pctProm + '%', centerLabel: 'promo./tit.', items: d.items });
    const bars = d.items.map(it => _barRow(it.label, it.value, tot, it.color, 130)).join('');
    return `
      <div style="margin-bottom:16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:13px 14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;flex-wrap:wrap;gap:6px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="font-size:15px">${icon}</span>
            <span style="font-size:13px;font-weight:700;color:var(--text)">${titulo}</span>
            <span style="font-size:10px;color:var(--text3)">${tot} alumno${tot !== 1 ? 's' : ''}</span>
          </div>
          <div style="display:flex;align-items:baseline;gap:6px;">
            <span style="font-family:inherit;font-size:20px;font-weight:800;color:var(--green);line-height:1">${pctProm}%</span>
            <span style="font-size:10px;color:var(--text3)">${passN}/${tot} promo./titulan</span>
          </div>
        </div>
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
          ${_donutHtml(canvasId, pctProm + '%', 'promo./tit.', true)}
          <div style="flex:1;min-width:170px;">${bars}</div>
        </div>
      </div>`;
  }).join('');
}

function renderDashboard() {
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '';

  const iesName = document.getElementById('headerIesName')?.value || 'Centro Educativo';
  const dateStr = new Date().toLocaleDateString('es-ES', {weekday:'long', year:'numeric', month:'long', day:'numeric'});

  // ── Aggregate all data ──
  const todosAl = [];
  NIVELES.forEach(n => (GRUPOS_POR_NIVEL[n]||[]).forEach(g =>
    (data[n]?.[g]||[]).forEach(a => todosAl.push({...a, _nivel:n, _grupo:g}))
  ));

  const total   = todosAl.length;
  const nese    = todosAl.filter(a => a.nese==='Sí').length;
  const rep     = todosAl.filter(a => a.repetidor==='Sí').length;
  const comp    = todosAl.filter(a => a.compensatoria==='Sí').length;
  const abando  = todosAl.filter(a => getPropObj(a.promociona).tipo==='Abandono').length;
  const totalGrupos = NIVELES.reduce((s,n)=>s+(GRUPOS_POR_NIVEL[n]||[]).length, 0);

  // Completion per nivel
  const nivelStats = NIVELES.map(n => {
    const grupos = GRUPOS_POR_NIVEL[n] || [];
    const al = grupos.flatMap(g => data[n]?.[g] || []);
    if (!al.length) return null;
    const tot  = al.length;
    const dec  = al.filter(a => !!getPropObj(a.promociona).tipo).length;
    const pct  = tot ? Math.round(dec / tot * 100) : 0;
    const crit = al.filter(a => (+a.eval3 >= 5) && !getPropObj(a.promociona).tipo).length;
    const promo  = al.filter(a => { const t=getPropObj(a.promociona).tipo; return t==='Promoción'||t==='Titulación'; }).length;
    const repite = al.filter(a => getPropObj(a.promociona).tipo==='Repetición').length;
    const sinDec = tot - dec;
    const isFinal = n==='4º ESO'||n==='2º Bach.'||isBach(n)&&n.startsWith('2');
    return { n, tot, dec, pct, crit, promo, repite, sinDec, isFinal, grupos };
  }).filter(Boolean);

  const totalDecidido   = todosAl.filter(a => !!getPropObj(a.promociona).tipo).length;
  const pctCentro       = total ? Math.round(totalDecidido/total*100) : 0;
  const totalCrit       = todosAl.filter(a => (+a.eval3>=5) && !getPropObj(a.promociona).tipo).length;
  const totalPendIII    = todosAl.filter(a => (a.pendientesIII||[]).length>0).length;

  // Group completion grid
  const grupoGrid = NIVELES.flatMap(n =>
    (GRUPOS_POR_NIVEL[n]||[]).map(g => {
      const al = data[n]?.[g] || [];
      const tot = al.length;
      if (!tot) return null;
      const dec = al.filter(a => !!getPropObj(a.promociona).tipo).length;
      const pct = tot ? Math.round(dec/tot*100) : 0;
      const crit = al.filter(a => (+a.eval3>=5) && !getPropObj(a.promociona).tipo).length;
      const tutor = tutores[`${n}-${g}`] || '—';
      return { n, g, tot, dec, pct, crit, tutor };
    }).filter(Boolean)
  );

  // Colour helpers
  const pctColor  = p => p===100?'var(--green)':p>=75?'var(--yellow)':p>=50?'var(--orange)':'var(--red)';
  const pctBg     = p => p===100?'rgba(45,212,160,0.12)':p>=75?'rgba(245,200,66,0.1)':p>=50?'rgba(247,157,79,0.1)':'rgba(247,110,110,0.1)';
  const semaforo  = p => p===100?'🟢':p>=75?'🟡':p>=50?'🟠':'🔴';

  // ── HTML ──
  _dashDonuts = []; // se rellena con cada gráfico circular durante la construcción del HTML
  let html = `<div class="main dash-wrap" style="padding-bottom:40px">

  <!-- TITLE BAR -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
    <div>
      <div style="font-family:inherit;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;">
        📈 Dashboard de Dirección
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px;">${iesName} · ${dateStr.charAt(0).toUpperCase()+dateStr.slice(1)}</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-ghost btn-sm" onclick="setAllDashSections(true)" title="Plegar todas las secciones">⊟ Plegar todo</button>
      <button class="btn btn-ghost btn-sm" onclick="setAllDashSections(false)" title="Desplegar todas las secciones">⊞ Desplegar todo</button>
      <button class="btn btn-ghost btn-sm" onclick="renderDashboard()" title="Actualizar datos">↺ Actualizar</button>
    </div>
  </div>

  <!-- ALERTAS (fila propia, antes del resumen general) -->
  ${dashSection('alertas', 'Alertas y atención prioritaria', 'var(--red)', `
      ${(() => {
        const alertas = [];

        // Grupos incompletos
        const gruposIncompletos = grupoGrid.filter(g => g.pct < 100 && g.tot > 0);
        if (gruposIncompletos.length) {
          alertas.push({
            icon:'⏳', color:'var(--yellow)',
            title:`${gruposIncompletos.length} grupo${gruposIncompletos.length>1?'s':''} sin completar`,
            sub: gruposIncompletos.map(g=>`${g.n} ${g.g} (${g.pct}%)`).join(' · ')
          });
        }

        // Casos críticos
        if (totalCrit > 0) {
          const critGrupos = grupoGrid.filter(g=>g.crit>0);
          alertas.push({
            icon:'🚨', color:'var(--red)',
            title:`${totalCrit} alumno${totalCrit>1?'s':''} con ≥5 suspensos sin decisión`,
            sub: critGrupos.map(g=>`${g.n} ${g.g}: ${g.crit} crítico${g.crit>1?'s':''}`).join(' · ')
          });
        }

        // Alto índice de repetición
        NIVELES.forEach(n => {
          const al = (GRUPOS_POR_NIVEL[n]||[]).flatMap(g=>data[n]?.[g]||[]);
          const reps = al.filter(a=>getPropObj(a.promociona).tipo==='Repetición').length;
          const pctRep = al.length ? Math.round(reps/al.length*100) : 0;
          if (pctRep >= 25 && reps >= 3) {
            alertas.push({
              icon:'🔄', color:'var(--orange)',
              title:`${n}: ${pctRep}% de repetición (${reps}/${al.length})`,
              sub:'Índice de repetición elevado'
            });
          }
        });

        // Abandono
        if (abando > 0) {
          alertas.push({
            icon:'🚪', color:'#9aa3bb',
            title:`${abando} alumno${abando>1?'s':''} en situación de abandono`,
            sub:'Requieren atención y seguimiento'
          });
        }

        // All good
        if (!alertas.length) {
          return `<div style="text-align:center;padding:24px 0;color:var(--green)">
            <div style="font-size:32px;margin-bottom:8px">✅</div>
            <div style="font-size:13px;font-weight:600">Todo en orden</div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Sin alertas activas</div>
          </div>`;
        }

        return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">${alertas.map(a => `
          <div style="display:flex;gap:12px;padding:10px 12px;background:var(--surface2);border-radius:8px;border-left:3px solid ${a.color};">
            <span style="font-size:18px;flex-shrink:0">${a.icon}</span>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text)">${a.title}</div>
              <div style="font-size:10px;color:var(--text3);margin-top:2px">${a.sub}</div>
            </div>
          </div>`).join('')}</div>`;
      })()}
  `)}

  <!-- TOP KPIs -->
  ${dashSection('kpis', 'Resumen general', 'var(--accent)', `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;">
    ${[
      { label:'Total alumnos',    val:total,         color:'var(--accent)',  bg:'rgba(79,142,247,0.1)',   icon:'👥' },
      { label:'Niveles activos',  val:NIVELES.length, color:'var(--text)',   bg:'var(--surface2)',        icon:'🏫' },
      { label:'Grupos activos',   val:totalGrupos,    color:'var(--text)',   bg:'var(--surface2)',        icon:'📋' },
      { label:'% Decidido',       val:pctCentro+'%',  color:pctColor(pctCentro), bg:pctBg(pctCentro),   icon:semaforo(pctCentro) },
      { label:'Sin decisión',     val:total-totalDecidido, color:total-totalDecidido>0?'var(--yellow)':'var(--green)', bg:'var(--surface2)', icon:'⏳' },
      { label:'Casos críticos',   val:totalCrit,      color:totalCrit>0?'var(--red)':'var(--green)',    bg:totalCrit>0?'rgba(247,110,110,0.1)':'rgba(45,212,160,0.08)', icon:totalCrit>0?'🚨':'✓' },
      { label:'Con NESE',         val:nese,           color:'var(--purple)',  bg:'rgba(124,92,252,0.1)',  icon:'🧩' },
      { label:'Compensatoria',    val:comp,           color:'var(--orange)',  bg:'rgba(247,157,79,0.1)',  icon:'📚' },
      { label:'Repetidores',      val:rep,            color:'var(--yellow)',  bg:'rgba(245,200,66,0.1)',  icon:'🔄' },
      { label:'Abandono',         val:abando,         color:'#9aa3bb',        bg:'rgba(100,100,120,0.1)', icon:'🚪' },
      { label:'Con pend. III Ev.',val:totalPendIII,   color:'var(--yellow)',  bg:'rgba(245,200,66,0.1)',  icon:'📌' },
    ].map(({label,val,color,bg,icon}) => `
      <div style="background:${bg};border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
        <div style="font-size:20px;margin-bottom:6px">${icon}</div>
        <div style="font-size:22px;font-weight:800;color:${color};font-family:inherit;line-height:1">${val}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">${label}</div>
      </div>`).join('')}
    </div>
  `)}

  <!-- PROGRESS PER NIVEL -->
  ${dashSection('progreso', 'Progreso de decisiones por nivel', 'var(--accent)', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${nivelStats.map(({n,tot,dec,pct,crit,promo,repite,sinDec,isFinal}) => {
        const barColor = pctColor(pct);
        const promoLabel = isFinal ? 'Titulan' : 'Promocionan';
        const promoCount = isFinal
          ? todosAl.filter(a=>a._nivel===n&&getPropObj(a.promociona).tipo==='Titulación').length
          : promo;
        return `<div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;flex-wrap:wrap;gap:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:13px;font-weight:700;color:var(--text);min-width:120px;">${n}</span>
              <span style="font-size:10px;color:var(--text3)">${tot} alumnos</span>
              ${crit>0?`<span style="font-size:10px;color:var(--red);font-weight:700;background:rgba(247,110,110,0.1);border-radius:4px;padding:1px 6px">🚨 ${crit} críticos</span>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:10px;color:var(--green)">✓ ${promoLabel}: <strong>${promoCount}</strong></span>
              <span style="font-size:10px;color:var(--red)">✕ Repiten: <strong>${repite}</strong></span>
              ${sinDec>0?`<span style="font-size:10px;color:var(--yellow)">⏳ Sin decidir: <strong>${sinDec}</strong></span>`:''}
              <span style="font-size:11px;font-weight:700;color:${barColor};min-width:34px;text-align:right">${pct}%</span>
            </div>
          </div>
          <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden;">
            <div style="width:${pct}%;height:8px;background:${barColor};border-radius:4px;transition:width 0.6s ease;"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `)}

  <!-- GRUPO COMPLETION GRID -->
  ${dashSection('grupos', 'Estado de grupos — semáforo', 'var(--green)', `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">
      ${grupoGrid.map(({n,g,tot,dec,pct,crit,tutor}) => `
        <div onclick="selectNivel('${n.replace(/'/g,"\\'")}');currentGrupos['${n.replace(/'/g,"\\'")}']='${jsAttr(g)}';renderAll();"
          style="background:${pctBg(pct)};border:1px solid ${pct===100?'rgba(45,212,160,0.3)':pct>=75?'rgba(245,200,66,0.3)':'rgba(247,110,110,0.3)'};
          border-radius:10px;padding:12px 14px;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;"
          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.2)'"
          onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text)">${n} ${g}</div>
              <div style="font-size:10px;color:var(--text3);margin-top:1px">${tot} alumnos · ${tutor}</div>
            </div>
            <span style="font-size:18px">${semaforo(pct)}</span>
          </div>
          <div style="background:var(--border);border-radius:3px;height:5px;overflow:hidden;margin-bottom:6px;">
            <div style="width:${pct}%;height:5px;background:${pctColor(pct)};border-radius:3px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:var(--text2)">${dec}/${tot} decididos</span>
            <span style="font-size:11px;font-weight:700;color:${pctColor(pct)}">${pct}%</span>
          </div>
          ${crit>0?`<div style="margin-top:5px;font-size:10px;color:var(--red);font-weight:600">🚨 ${crit} alumno${crit>1?'s':''} crítico${crit>1?'s':''}</div>`:''}
        </div>`).join('')}
    </div>
  `)}

  <!-- DISTRIBUCIÓN I EVALUACIÓN (columna I Prop.): global + por etapa -->
  <div class="dash-grid-2" style="margin-bottom:20px;">
    ${dashSection('dist-i', 'Distribución I Evaluación · propuesta', 'var(--accent)', `
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;line-height:1.4">
        Según la columna <strong style="color:var(--text2)">I Prop.</strong> de cada grupo (propuesta de la I Evaluación).
      </div>
      ${buildDistGlobal(todosAl, 'propuesta1', 'dist-i', 'donutIGlobal', 'Sin propuesta')}
    `)}
    ${dashSection('dist-i-etapa', 'Propuesta I Evaluación por etapa — ESO y Bachillerato', 'var(--orange)', `
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;line-height:1.4">
        🏫 Propuesta de la I Evaluación con Promoción + Titulación agrupadas.
      </div>
      ${buildDistEtapa(todosAl, 'propuesta1', 'dist-i-etapa', 'donutIEtapa', 'Sin propuesta')}
    `)}
  </div>

  <!-- DISTRIBUCIÓN II EVALUACIÓN (columna II Prop.): global + por etapa -->
  <div class="dash-grid-2" style="margin-bottom:20px;">
    ${dashSection('dist-ii', 'Distribución II Evaluación · propuesta', 'var(--accent)', `
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;line-height:1.4">
        Según la columna <strong style="color:var(--text2)">II Prop.</strong> de cada grupo (propuesta de la II Evaluación).
      </div>
      ${buildDistGlobal(todosAl, 'propuesta2', 'dist-ii', 'donutIIGlobal', 'Sin propuesta')}
    `)}
    ${dashSection('dist-ii-etapa', 'Propuesta II Evaluación por etapa — ESO y Bachillerato', 'var(--orange)', `
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;line-height:1.4">
        🏫 Propuesta de la II Evaluación con Promoción + Titulación agrupadas.
      </div>
      ${buildDistEtapa(todosAl, 'propuesta2', 'dist-ii-etapa', 'donutIIEtapa', 'Sin propuesta')}
    `)}
  </div>

  <!-- DISTRIBUCIÓN DE DECISIONES FINALES: global + por etapa en paralelo -->
  <div class="dash-grid-2" style="margin-bottom:20px;">
    ${dashSection('dist-final', 'Distribución de decisiones finales', 'var(--purple)', `
      ${buildDistGlobal(todosAl, 'promociona', 'dist-final', 'donutFinalGlobal', 'Sin decidir')}
    `)}
    ${dashSection('dist-final-etapa', 'Decisiones finales por etapa — ESO y Bachillerato', 'var(--green)', `
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;line-height:1.4">
        🏫 Promoción + Titulación agrupadas (en esencia, superar la etapa/curso).
      </div>
      ${buildDistEtapa(todosAl, 'promociona', 'dist-final-etapa', 'donutFinalEtapa', 'Sin decidir')}
    `)}
  </div>

  <!-- NESE / COMP breakdown -->
  ${dashSection('nese', 'Alumnado con necesidades específicas — por nivel', 'var(--purple)', `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:8px 12px;text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid var(--border)">Nivel</th>
            <th style="padding:8px 10px;text-align:center;color:var(--purple);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid var(--border)">NESE</th>
            <th style="padding:8px 10px;text-align:center;color:var(--orange);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid var(--border)">Compensatoria</th>
            <th style="padding:8px 10px;text-align:center;color:var(--yellow);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid var(--border)">Repetidores</th>
            <th style="padding:8px 10px;text-align:center;color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid var(--border)">Total alumnos</th>
            <th style="padding:8px 10px;text-align:center;color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid var(--border)">% NESE</th>
          </tr>
        </thead>
        <tbody>
          ${NIVELES.map((n,ni) => {
            const al = (GRUPOS_POR_NIVEL[n]||[]).flatMap(g=>data[n]?.[g]||[]);
            if (!al.length) return '';
            const t  = al.length;
            const ne = al.filter(a=>a.nese==='Sí').length;
            const co = al.filter(a=>a.compensatoria==='Sí').length;
            const re = al.filter(a=>a.repetidor==='Sí').length;
            const pctNese = t ? Math.round(ne/t*100) : 0;
            return `<tr style="border-bottom:1px solid var(--border);${ni%2===0?'background:var(--surface2)':''}">
              <td style="padding:7px 12px;font-weight:600;color:var(--text)">${n}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:700;color:var(--purple)">${ne}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:700;color:var(--orange)">${co}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:700;color:var(--yellow)">${re}</td>
              <td style="padding:7px 10px;text-align:center;color:var(--text2)">${t}</td>
              <td style="padding:7px 10px;text-align:center;font-size:11px;color:${pctNese>=15?'var(--red)':pctNese>=8?'var(--yellow)':'var(--text3)'};font-weight:600">${pctNese}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `)}

  </div>`;

  mc.innerHTML = html;
  // Dibujar los gráficos circulares tras inyectar el HTML (cada uno sólo si su sección está visible)
  renderDashDonuts();
}
