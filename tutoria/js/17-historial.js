/* ============================================================================
   Gestor de Tutoría · Historial académico del alumno
   tutoria/js/17-historial.js
   ============================================================================ */

// ===================== HISTORIAL ACADÉMICO =====================

let _histContext = { nivel: '', grupo: '', idx: -1 };

document.getElementById('histOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('histOverlay')) closeHistorial();
});

function openHistorial(nivel, grupo, idx) {
  _histContext = { nivel, grupo, idx };
  const alumno = data[nivel][grupo][idx];

  document.getElementById('histTitle').textContent = alumno.nombre || 'Sin nombre';
  document.getElementById('histSubtitle').textContent =
    `${nivel} — Grupo ${grupo}${alumno.fecha ? ' · Nacido/a ' + alumno.fecha : ''}`;

  renderHistBody(alumno);
  document.getElementById('histOverlay').classList.add('open');
}

function closeHistorial() {
  document.getElementById('histOverlay').classList.remove('open');
}

function renderHistBody(alumno) {
  const historial = alumno.historial || [];
  const body = document.getElementById('histBody');

  // Current year card (read-only summary)
  const { nivel, grupo } = _histContext;
  const p2  = getPropObj(alumno.propuesta2);
  const p3  = getPropObj(alumno.propuesta3);
  const pFinal = getPropObj(alumno.promociona);
  const decFinal = pFinal.tipo ? `${pFinal.tipo}${pFinal.destino?' → '+pFinal.destino:''}` : '—';
  const decColor = pFinal.tipo==='Promoción'||pFinal.tipo==='Titulación' ? 'var(--green)'
    : pFinal.tipo==='Repetición' ? 'var(--red)'
    : pFinal.tipo==='Abandono' ? '#9aa3bb' : 'var(--text3)';
  const dotClass = pFinal.tipo==='Promoción'||pFinal.tipo==='Titulación' ? 'promo'
    : pFinal.tipo==='Repetición' ? 'repite'
    : pFinal.tipo==='Abandono' ? 'abandono'
    : pFinal.tipo==='Titulación' ? 'titula' : '';

  const currentCard = `
    <div class="hist-entry">
      <div class="hist-dot ${dotClass}" title="Curso actual">25-26</div>
      <div class="hist-card" style="border-color:rgba(79,142,247,0.3);background:rgba(79,142,247,0.04)">
        <div class="hist-card-top">
          <span class="hist-card-nivel">${nivel} — Grupo ${grupo}</span>
          <span class="hist-card-year">Curso actual ${_tCursoActual("-",true)}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--accent);font-weight:600">📌 Año en curso</span>
        </div>
        <div class="hist-card-fields">
          <div class="hist-field">
            <label>I Evaluación</label>
            <div style="font-family:inherit;font-size:13px;font-weight:700;color:${+alumno.eval1===0?'var(--green)':+alumno.eval1>=4?'var(--red)':'var(--accent)'}">
              ${alumno.eval1 ?? '—'} mat. no sup.
            </div>
          </div>
          <div class="hist-field">
            <label>II Evaluación</label>
            <div style="font-family:inherit;font-size:13px;font-weight:700;color:${+alumno.eval2===0?'var(--green)':+alumno.eval2>=4?'var(--red)':'var(--accent)'}">
              ${alumno.eval2 ?? '—'} mat. no sup.
            </div>
          </div>
          <div class="hist-field">
            <label>III Evaluación</label>
            <div style="font-family:inherit;font-size:13px;font-weight:700;color:${+alumno.eval3===0?'var(--green)':+alumno.eval3>=4?'var(--red)':'var(--accent)'}">
              ${alumno.eval3 ?? '—'} mat. no sup.
            </div>
          </div>
          <div class="hist-field">
            <label>II Propuesta</label>
            <div style="font-size:12px;font-weight:600;color:var(--text2)">${p2.tipo||'—'}${p2.destino?' → '+p2.destino:''}</div>
          </div>
          <div class="hist-field">
            <label>Decisión final</label>
            <div style="font-size:12px;font-weight:700;color:${decColor}">${decFinal}</div>
          </div>
          <div class="hist-field">
            <label>NESE / Recurso</label>
            <div style="font-size:12px;color:var(--text2)">${alumno.nese==='Sí'?(_getNeseCodes(alumno.recursoNese).join(' / ') || 'Sí'):'No'}</div>
          </div>
        </div>
        ${(alumno.pendientesIII&&alumno.pendientesIII.length)?`
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);">
          <span style="font-size:10px;color:var(--text3);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Materias pendientes:</span>
          <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">
            ${alumno.pendientesIII.map(m=>`<span style="background:rgba(245,200,66,0.15);border:1px solid rgba(245,200,66,0.3);border-radius:4px;padding:1px 7px;font-size:11px;color:var(--yellow)">${m}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>`;

  // Editable past entries
  const pastEntries = historial.map((h, hi) => {
    const hDotClass = h.decision==='Promoción'||h.decision==='Titulación' ? 'promo'
      : h.decision==='Repetición' ? 'repite'
      : h.decision==='Abandono' ? 'abandono'
      : h.decision==='Titulación' ? 'titula' : '';
    const shortYear = h.curso ? h.curso.replace('20','').replace('-20','-') : '—';
    return `
    <div class="hist-entry" data-hi="${hi}">
      <div class="hist-dot ${hDotClass}">${shortYear}</div>
      <div class="hist-card">
        <div class="hist-card-top">
          <input class="hist-field input" style="font-size:13px;font-weight:700;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text);font-family:inherit;padding:2px 4px;flex:1;min-width:120px;"
            placeholder="Nivel (ej: 1º ESO)" value="${(h.nivel||'').replace(/"/g,'&quot;')}"
            onchange="_histUpdate(${hi},'nivel',this.value)">
          <input class="hist-field input" style="font-size:11px;background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;padding:3px 8px;width:110px;"
            placeholder="Curso (ej: 2023-24)" value="${(h.curso||'').replace(/"/g,'&quot;')}"
            onchange="_histUpdate(${hi},'curso',this.value)">
        </div>
        <div class="hist-card-fields">
          <div class="hist-field">
            <label>I Evaluación (mat. no sup.)</label>
            <input type="number" min="0" max="20" placeholder="—" value="${h.eval1??''}"
              onchange="_histUpdate(${hi},'eval1',this.value===''?null:+this.value)">
          </div>
          <div class="hist-field">
            <label>II Evaluación (mat. no sup.)</label>
            <input type="number" min="0" max="20" placeholder="—" value="${h.eval2??''}"
              onchange="_histUpdate(${hi},'eval2',this.value===''?null:+this.value)">
          </div>
          <div class="hist-field">
            <label>III Evaluación (mat. no sup.)</label>
            <input type="number" min="0" max="20" placeholder="—" value="${h.eval3??''}"
              onchange="_histUpdate(${hi},'eval3',this.value===''?null:+this.value)">
          </div>
          <div class="hist-field">
            <label>Decisión final</label>
            <select onchange="_histUpdate(${hi},'decision',this.value)">
              <option value="" ${!h.decision?'selected':''}>— Sin registrar —</option>
              <option value="Promoción"  ${h.decision==='Promoción'?'selected':''}>Promoción</option>
              <option value="Repetición" ${h.decision==='Repetición'?'selected':''}>Repetición</option>
              <option value="Titulación" ${h.decision==='Titulación'?'selected':''}>Titulación</option>
              <option value="Abandono"   ${h.decision==='Abandono'?'selected':''}>Abandono</option>
            </select>
          </div>
          <div class="hist-field">
            <label>Destino</label>
            <input placeholder="Ej: 2º ESO, FPB, Bach…" value="${(h.destino||'').replace(/"/g,'&quot;')}"
              onchange="_histUpdate(${hi},'destino',this.value)">
          </div>
          <div class="hist-field">
            <label>Centro</label>
            <input placeholder="Centro educativo" value="${(h.centro||'').replace(/"/g,'&quot;')}"
              onchange="_histUpdate(${hi},'centro',this.value)">
          </div>
          <div class="hist-field" style="grid-column:1/-1">
            <label>Observaciones</label>
            <textarea placeholder="Notas sobre este curso…" onchange="_histUpdate(${hi},'obs',this.value)">${(h.obs||'').replace(/</g,'&lt;')}</textarea>
          </div>
        </div>
        <div class="hist-card-actions">
          <button class="hist-del-btn" onclick="_histDel(${hi})">🗑 Eliminar entrada</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const emptyMsg = !historial.length ? `
    <div style="text-align:center;padding:24px 0;color:var(--text3);font-size:13px">
      <div style="font-size:28px;margin-bottom:8px">📂</div>
      Sin historial previo registrado. Añade entradas para cursos anteriores.
    </div>` : '';

  body.innerHTML = `
    <div style="margin-bottom:6px;font-size:11px;color:var(--text3);padding:0 2px">
      El historial de cursos anteriores se guarda con el archivo del alumno. Ordena de más reciente a más antiguo.
    </div>
    <div class="hist-timeline">
      ${currentCard}
      ${pastEntries}
      ${emptyMsg}
    </div>
    <button class="hist-add-btn" onclick="_histAdd()" style="margin-top:8px">＋ Añadir curso anterior</button>
  `;
}

window._histUpdate = function(hi, field, value) {
  const { nivel, grupo, idx } = _histContext;
  const alumno = data[nivel][grupo][idx];
  if (!alumno.historial) alumno.historial = [];
  if (!alumno.historial[hi]) return;
  alumno.historial[hi][field] = value;
  markDirty();
};

window._histDel = function(hi) {
  const { nivel, grupo, idx } = _histContext;
  const alumno = data[nivel][grupo][idx];
  if (!alumno.historial) return;
  alumno.historial.splice(hi, 1);
  markDirty();
  renderHistBody(alumno);
};

window._histAdd = function() {
  const { nivel, grupo, idx } = _histContext;
  const alumno = data[nivel][grupo][idx];
  if (!alumno.historial) alumno.historial = [];
  // Suggest previous school year
  const now = new Date();
  const y = now.getFullYear();
  const prevYear = now.getMonth() >= 8 ? `${y}-${y+1}` : `${y-1}-${y}`;
  alumno.historial.unshift({ nivel:'', curso: prevYear, eval1:null, eval2:null, eval3:null, decision:'', destino:'', centro:'', obs:'' });
  markDirty();
  renderHistBody(alumno);
};

function saveHistorial() {
  // Already saved live via _histUpdate — just close and refresh row indicator
  const { nivel, grupo, idx } = _histContext;
  const alumno = data[nivel][grupo][idx];
  markDirty();
  // Refresh the hist-btn indicator in the table
  const key = `${nivel}-${grupo}`;
  const tbl = document.getElementById(`tbl-${key}`);
  if (tbl) {
    const row = tbl.querySelector(`tbody tr[data-idx="${idx}"]`);
    if (row) {
      const btn = row.querySelector('.hist-btn');
      if (btn) {
        const hasHist = !!(alumno.historial && alumno.historial.length);
        btn.className = 'hist-btn' + (hasHist ? ' has-hist' : '');
      }
    }
  }
  closeHistorial();
  showToast('✅ Historial guardado');
}
