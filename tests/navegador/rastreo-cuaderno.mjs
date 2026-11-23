/* Recorrido del Cuaderno para revisar sus tablas (tests/navegador/tablas.mjs): rellena un grupo con datos
   de ejemplo (actividades con nota, asistencia, convivencia, diario, familias, programación, reuniones…),
   pasa por cada pestaña y cada modo y pulsa cada botón visible (y los de la ventana que abra), revisando
   las tablas de la página y de los documentos que se generan. Nada sale de la página: ni impresiones, ni
   descargas, ni selectores de archivo, y las confirmaciones se cancelan.
   Necesita instalarAuditoriaTablas(p) antes. Devuelve { clics, fallos, desalineadas }. */
export async function rastrearCuaderno(p) {
  return p.evaluate(async () => {
    const dormir = ms => new Promise(r => setTimeout(r, ms));
    window.print = () => {}; HTMLAnchorElement.prototype.click = function () {};
    const clicInput = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type !== 'file') return clicInput.call(this); };
    window.showOpenFilePicker = window.showSaveFilePicker = window.showDirectoryPicker = () => Promise.reject(Object.assign(new Error('cancelado'), { name: 'AbortError' }));
    window.__dialogosAuto = { confirmar: false, texto: null };
    window.open = () => null;

    _mostrarBienvenida = false;
    const g = state.grupos[0], cat = getCatalogo(g.catalogoKey || 'GeH_1ESO'), crits = cat.ces.flatMap(c => c.criterios).slice(0, 4);
    g.actividades = [
      { id: 'e1', nombre: 'Examen tema 1', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: crits.slice(0, 2).map(c => ({ critId: c.id, peso: 50 })) },
      { id: 'e2', nombre: 'Trabajo en grupo', tipo: TIPOS[1] || TIPOS[0], trimestre: 0, bloqueId: 'b1', criterios: crits.slice(1, 3).map(c => ({ critId: c.id, peso: 50 })) },
      { id: 'e3', nombre: 'Cuaderno', tipo: TIPOS[0], trimestre: 1, bloqueId: 'b1', criterios: [{ critId: crits[3].id, peso: 100 }] }];
    g.notasCuant = {}; g.alumnos.forEach((a, i) => { g.notasCuant[a.id] = { e1: 3 + i * 2, e2: 6 + i, e3: 5 }; a.observaciones = 'Observación ' + i; a.familia = [{ parentesco: 'Madre', nombre: 'Familia ' + i, email: 'f' + i + '@correo.es' }]; });
    const hoy = agHoyStr();
    g.diario[hoy] = { nota: 'Clase normal', incidencias: 'Ninguna', unidadId: '' };
    g.asistencia[hoy] = { [g.alumnos[0].id]: { estado: 'retraso', nota: 'Tráfico' }, [g.alumnos[1].id]: { estado: 'falta', nota: '' } };
    g.convivencia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: hoy, tipo: 'AC', descripcion: 'Habla en clase', medidas: 'Aviso' });
    g.contactosFamilia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: hoy, medio: 'otro', asunto: 'Seguimiento', notas: 'Bien' });
    state.eventos.push({ id: uid(), fecha: hoy, titulo: 'Examen', tipo: 'examen', grupoIds: [g.id], nota: '' });
    state.reuniones.push({ id: uid(), fecha: hoy, tipo: 'familia', titulo: 'Reunión', asistentes: 'Familia', temas: 'Notas', acuerdos: 'Estudiar', grupoId: g.id, alumnoId: g.alumnos[0].id });
    state.programaciones = [{ id: 'p1', nombre: 'Programación GeH', catalogoKey: g.catalogoKey || 'GeH_1ESO', sdas: [{ id: 's1', titulo: 'SdA 1', trimestre: 0, sesionesPrevistas: 6 }], actividades: [] }];
    migrarEstado(); save();
    const foto = JSON.stringify(state);

    const desalineadas = {}; let donde = '', clics = 0; const fallos = [];
    const documentos = () => { const d = [document]; document.querySelectorAll('iframe').forEach(f => { try { if (f.contentDocument) d.push(f.contentDocument); } catch (e) {} }); return d; };
    const escanear = () => documentos().forEach((d, k) => { try { window.__auditarTablas(d, (k ? 'DOCUMENTO: ' : '') + donde.replace(/\s+/g, ' ').slice(0, 90), desalineadas); } catch (e) {} });
    const limpiar = () => {
      document.querySelectorAll('.dlg-overlay, .modal-overlay, .tdoc-ov, #printOverlay, [id$="Ov"]').forEach(o => o.remove());
      document.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
    };
    const visibles = raiz => [...raiz.querySelectorAll('button, [onclick], summary')].filter(el => { if (el.closest('#unaVentanaOverlay, #bloqueoOverlay, #avisoVersionNueva')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const NO_PULSAR = /location\.|reload|href|borrar|eliminar|vaciar|importar|restaurar|cerrarSesion|nuevoCurso|cifrar/i;
    const forma = el => ((el.getAttribute('onclick') || '') + '|' + (el.textContent || '').trim().slice(0, 20)).replace(/'[^']*'/g, "''").replace(/\d+/g, '0');
    const poner = async v => { state = JSON.parse(foto); Object.keys(CAT_CACHE).forEach(k => delete CAT_CACHE[k]); Object.assign(state.ui, v); render(); await dormir(40); };
    const pantalla = async (nombre, v) => {
      await poner(v); donde = nombre; escanear();
      const vistos = {}, n0 = visibles(document.body).length;
      for (let i = 0; i < n0 && i < 250; i++) {
        const c = visibles(document.body)[i]; if (!c) break;
        const f = forma(c); if (vistos[f]) continue; vistos[f] = 1;
        if (NO_PULSAR.test((c.getAttribute('onclick') || '') + (c.textContent || ''))) continue;
        limpiar(); await poner(v);
        const el = visibles(document.body)[i]; if (!el) break;
        donde = nombre + ' › ' + (el.textContent || '').trim().slice(0, 28);
        try { el.click(); clics++; } catch (e) {} await dormir(80); escanear();
        const dentro = [...document.querySelectorAll('.modal-overlay, .dlg-overlay, [id$="Ov"]')].flatMap(o => visibles(o)).slice(0, 30);
        for (const e2 of dentro) {
          if (!e2.isConnected || /Cerrar|✕|×|Cancelar/.test(e2.textContent || '') || NO_PULSAR.test((e2.getAttribute('onclick') || '') + (e2.textContent || ''))) continue;
          const d0 = donde; donde = d0 + ' ›› ' + (e2.textContent || '').trim().slice(0, 24);
          try { e2.click(); clics++; } catch (e) {} await dormir(60); escanear(); donde = d0;
        }
      }
      limpiar();
    };
    const tabs = ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes'];
    for (const tab of tabs) { try { await pantalla('pestaña ' + tab, { appMode: 'competencial', grupoId: g.id, tab }); } catch (e) { fallos.push(tab + ': ' + e.message); } }
    try { await pantalla('informe del alumno', { appMode: 'competencial', grupoId: g.id, tab: 'resultados', resAl: g.alumnos[0].id }); } catch (e) { fallos.push('informe: ' + e.message); }
    for (const m of ['inicio', 'corrector', 'programacion', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) { try { await pantalla('modo ' + m, { appMode: m, grupoId: g.id }); } catch (e) { fallos.push(m + ': ' + e.message); } }
    try { await pantalla('programación abierta', { appMode: 'programacion', progTab: 'detalle', progId: 'p1', grupoId: g.id }); } catch (e) { fallos.push('prog: ' + e.message); }
    window.__dialogosAuto = undefined;
    return { clics, fallos, desalineadas: Object.keys(desalineadas) };
  });
}
