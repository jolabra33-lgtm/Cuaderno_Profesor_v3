/* Rastreador de «texto hostil» para Tutoría (ver tests/README.md).

   Rellena Tutoría con datos de ejemplo y mete, en todos los campos que escribe una persona o
   que llegan en un archivo (nombres, niveles, grupos, materias, observaciones, destinos…), un
   texto preparado para colarse como HTML o como código. Después recorre las pantallas pulsando
   cada botón (y los de las ventanas que se abren) y comprueba que:
     - no aparece ningún elemento inyectado en la página ni en los documentos que se generan,
     - no se ejecuta nada de lo inyectado,
     - con caracteres normales pero especiales (d'Alt & "Co" <i>) no se ve «&amp;», «&#39;»… como texto
       (eso sería haber escapado dos veces).

   rastrearTutoria(pagina, { modo: 'hostil' | 'doble', completo: false })
   Con completo:true recorre más niveles y pestañas (tarda varios minutos): es la auditoría entera.
   Se lanza a mano con:  RASTREO=completo npm test -- tutoria-texto-hostil                                   */

export async function rastrearTutoria(p, { modo = 'hostil', completo = false } = {}) {
  return p.evaluate(async ({ modo, completo }) => {
    const DOBLE = modo === 'doble';
    const dormir = ms => new Promise(r => setTimeout(r, ms));
    const ejecutados = {}, inyectados = {}, dobles = {}; let donde = 'arranque';
    window.__x = re => { (ejecutados[re.source] = ejecutados[re.source] || {})[donde] = 1; };
    const P = DOBLE ? (tag => `d'Alt & "${tag}" <i>x</i>`)
      : (tag => `Zq"'><img src=x onerror=top.__x(/${tag}/)>');top.__x(/${tag}_js/);('&#39;);top.__x(/${tag}_ent/);(&#39;`);

    // Nada sale de la página: ni impresiones, ni descargas, ni selectores de archivo, ni confirmaciones reales.
    window.print = () => {}; HTMLAnchorElement.prototype.click = function () {};
    const clicInput = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type !== 'file') return clicInput.call(this); };
    window.showOpenFilePicker = window.showSaveFilePicker = window.showDirectoryPicker = () => Promise.reject(Object.assign(new Error('cancelado'), { name: 'AbortError' }));
    window.confirmar = () => Promise.resolve(false); window.mostrarAviso = () => Promise.resolve(true);
    window._tGuardarArchivo = async () => {};

    await cargarDatosEjemplo(); await dormir(300);
    const nivH = '9º ' + P('nivel'), grH = 'H' + P('grupo');
    NIVELES.push(nivH); GRUPOS_POR_NIVEL[nivH] = [grH]; data[nivH] = { [grH]: generateSampleData(NIVELES[0], GRUPOS_POR_NIVEL[NIVELES[0]][0]).slice(0, 6) };
    currentGrupos[nivH] = grH; evalDates[nivH] = { eval1: _today, eval2: _today, eval3: _today };
    NIVELES.forEach(n => GRUPOS_POR_NIVEL[n].forEach(g => {
      (data[n][g] || []).forEach((a, i) => {
        if (i > 5) return;
        a.nombre = 'Pérez ' + P('nombre') + ', Ana' + i;
        a.notas = 'Obs ' + P('notas'); a.colegioProcedencia = 'CEIP ' + P('colegio');
        ['propuesta1', 'propuesta2', 'propuesta3', 'promociona'].forEach(k => { if (a[k] && typeof a[k] === 'object') a[k].destino = P('destino'); });
        a.recursoNese = [P('recursoNese')]; a.codComp = [P('codComp')]; a.nese = 'Sí'; a.compensatoria = 'Sí';
        ['pendientes1', 'pendientes2', 'pendientesIII', 'pendientesExtr', 'pendientesAnteriores', 'recuperadasAnteriores', 'noRecuperadasAnteriores'].forEach(k => { a[k] = [P(k)]; });
        a.historial = [{ nivel: P('hist_nivel'), curso: P('hist_curso'), eval1: 3, eval2: 2, eval3: 1, decision: P('hist_decision'), destino: P('hist_destino'), centro: P('hist_centro'), obs: P('hist_obs') }];
        a.seguimientos = [{ id: 'seg' + i, fecha: _today, materias: [{ nombre: P('seg_materia'), trabajo: 'B', examenes: 'B', comportamiento: 'B' }], observaciones: P('seg_obs') }];
        a.lenguaBase = i % 2 ? 'Castellano' : 'Valenciano';
        if (i === 0) { a.papActivo = true; a.ecActivo = true; }
      });
      const key = `${n}-${g}`;
      tutores[key] = 'Tutor ' + P('tutor');
      (window._obsGrupoData = window._obsGrupoData || {})[key] = 'Obs grupo ' + P('obsGrupo');
      const as = _getAsistenciaData(n, g); as.profesores = [{ nombre: P('prof_nombre'), materia: P('prof_materia') }];
      ['eval1', 'eval2', 'eval3'].forEach(e => { as.sesiones[e] = [{ asistio: false, justificacion: P('justif') }]; });
    }));
    calEventos.push({ id: 'evx', fecha: _today, titulo: P('cal_titulo'), tipo: 'otro', nota: P('cal_nota') });
    const ies = document.getElementById('headerIesName'); if (ies) ies.value = 'IES ' + P('ies');
    [NIVELES[0], nivH].forEach(n => { _materiasCustom[n] = [P('materia'), 'Lengua']; });

    // Foto de los datos: se restaura antes de cada pulsación (el rastreo borra, renombra y mueve cosas).
    const G = { _materiasCustom, _obsGrupoData: window._obsGrupoData, _asistenciaData: window._asistenciaData, _planosGrupo: window._planosGrupo, _convivenciaData: window._convivenciaData, _actasData: window._actasData, _actasOficialesData: window._actasOficialesData };
    const foto = JSON.stringify({ NIVELES, GRUPOS_POR_NIVEL, data, tutores, evalDates, calEventos, currentGrupos, otros: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v || {}])) });
    const vaciar = (o, n) => { Object.keys(o).forEach(k => delete o[k]); Object.assign(o, n); };
    const restaurar = () => { const f = JSON.parse(foto);
      NIVELES.length = 0; f.NIVELES.forEach(n => NIVELES.push(n)); vaciar(GRUPOS_POR_NIVEL, f.GRUPOS_POR_NIVEL); vaciar(data, f.data); vaciar(tutores, f.tutores); vaciar(evalDates, f.evalDates);
      calEventos.length = 0; f.calEventos.forEach(e => calEventos.push(e)); vaciar(currentGrupos, f.currentGrupos);
      Object.entries(G).forEach(([k, o]) => { if (o) vaciar(o, f.otros[k]); }); };

    const ruta = el => { const r = []; for (let e = el.parentElement || el, i = 0; e && i < 4; e = e.parentElement, i++) r.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id.replace(/(Zq|d').*/, '…').slice(0, 30) : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')); return r.join(' < '); };
    const documentos = () => { const d = [document]; document.querySelectorAll('iframe').forEach(f => { try { if (f.contentDocument) d.push(f.contentDocument); } catch (e) {} }); return d; };
    const escanear = () => documentos().forEach((d, k) => {
      const pre = k ? 'DOCUMENTO: ' : '';
      d.querySelectorAll('img[onerror*="__x"]').forEach(im => { const tag = (im.getAttribute('onerror').match(/__x\(\/(\w+)\//) || [])[1]; inyectados[tag + ' @ ' + pre + ruta(im)] = donde.slice(0, 70); });
      if (!DOBLE || !d.body) return;
      const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const pe = n.parentElement; if (!pe || /^(SCRIPT|STYLE|TEXTAREA)$/.test(pe.tagName)) continue;
        if (/&(amp|#39|lt|gt|quot);/.test(n.nodeValue)) dobles[pre + ruta(n) + ' «' + n.nodeValue.trim().slice(0, 50) + '»'] = donde.slice(0, 70); }
      d.body.querySelectorAll('[title],[value],[placeholder],[aria-label]').forEach(el => ['title', 'value', 'placeholder', 'aria-label'].forEach(a => { const v = el.getAttribute(a);
        if (v && /&(amp|#39|lt|gt|quot);/.test(v)) dobles[pre + a + ' @ ' + ruta(el.firstChild || el) + ' «' + v.slice(0, 50) + '»'] = donde.slice(0, 70); }));
    });
    const limpiar = () => {
      try { window.__cerrarVistaDocT && window.__cerrarVistaDocT(); } catch (e) {}
      document.querySelectorAll('.tdlg-ov').forEach(o => o.remove());
      document.querySelectorAll('.modal-overlay.open, .overlay.open, .open[id$="Overlay"], .show[id$="Overlay"]').forEach(o => { o.classList.remove('open'); o.classList.remove('show'); });
      try { closeModal(); } catch (e) {}
      document.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
    };
    const visibles = raiz => [...raiz.querySelectorAll('[onclick], button, summary')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const forma = el => (el.getAttribute('onclick') || el.className || el.textContent).replace(/'[^']*'/g, "''").replace(/\d+/g, '0').slice(0, 70) + '|' + el.tagName;
    const abiertos = () => [...document.querySelectorAll('.tdlg-ov, .tdoc-ov, .modal-overlay.open, .overlay.open, [id$="Overlay"].open, [id$="Overlay"].show, [id$="Modal"].open, .col-manager-panel, .pendientes-panel, details[open] > :not(summary)')].filter(o => o.getBoundingClientRect().width > 0);
    const NO_PULSAR = /cargarDatosEjemplo|salirDatosEjemplo|toggleTheme|location\.|reload|href/i;
    const repeticiones = completo ? 2 : 1;
    let clics = 0; const fallos = [];
    const pantalla = async (nombre, poner) => {
      restaurar(); donde = nombre; await poner(); await dormir(60); escanear();
      const vistos = {}; const n0 = visibles(document.body).length;
      for (let i = 0; i < n0 && i < 400; i++) {
        const candidato = visibles(document.body)[i]; if (!candidato) break;
        const f = forma(candidato); vistos[f] = (vistos[f] || 0) + 1; if (vistos[f] > repeticiones) continue;
        if (NO_PULSAR.test(candidato.getAttribute('onclick') || '')) continue;
        limpiar(); restaurar(); donde = nombre; await poner(); await dormir(15);
        const el = visibles(document.body)[i]; if (!el) break;
        donde = nombre + ' › ' + (el.textContent || '').trim().slice(0, 28) + ' [' + (el.getAttribute('onclick') || '').slice(0, 40) + ']';
        try { el.click(); clics++; } catch (e) {} await dormir(60); escanear();
        // Segundo nivel: lo que hay dentro de la ventana o el panel que se ha abierto.
        const dentro = abiertos().flatMap(o => visibles(o)); const v2 = {};
        for (let j = 0; j < dentro.length && j < 60; j++) {
          const e2 = dentro[j]; if (!e2.isConnected) continue; const f2 = forma(e2); v2[f2] = (v2[f2] || 0) + 1; if (v2[f2] > repeticiones) continue;
          if (/Cerrar|✕|×|Cancelar/.test(e2.textContent || '') && (e2.textContent || '').length < 12) continue;
          if (NO_PULSAR.test(e2.getAttribute('onclick') || '')) continue;
          const d0 = donde; donde = d0 + ' ›› ' + (e2.textContent || '').trim().slice(0, 24);
          try { e2.click(); clics++; } catch (e) {} await dormir(50); escanear(); donde = d0;
        }
      }
      limpiar();
    };
    const especiales = ['__home__', '__calendario__', '__informe__', '__segfam__', '__convivencia__', '__actasnooficiales__', '__vacantes__', '__materias__'];
    for (const e of especiales) { try { await pantalla(e, () => selectNivel(e)); } catch (err) { fallos.push(e + ': ' + err.message); } }
    const niveles = completo ? [NIVELES[0], NIVELES[NIVELES.length - 2], nivH] : [nivH];
    const pestanas = completo ? ['eval1', 'eval2', 'eval3', 'nese', 'final', 'extr'] : ['eval1', 'eval3', 'nese'];
    for (const n of niveles) {
      const g = (GRUPOS_POR_NIVEL[n] || [])[0], key = `${n}-${g}`;
      for (const tab of pestanas) {
        try { await pantalla(`${n === nivH ? 'NIVEL HOSTIL' : n} · ${tab}`, () => { window._evalTab = window._evalTab || {}; window._evalTab[key] = tab; currentGrupos[n] = g; selectNivel(n); }); }
        catch (err) { fallos.push(tab + ': ' + err.message); }
      }
    }
    const lista = o => Object.entries(o).map(([k, v]) => `${k}   ← ${typeof v === 'string' ? v : Object.keys(v)[0]}`);
    return { clics, fallos, inyectados: lista(inyectados), ejecutados: lista(ejecutados), dobles: lista(dobles) };
  }, { modo, completo });
}
