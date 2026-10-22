/* ============================================================================
   Cuaderno del profesor · Arranque: estado inicial, migraciones y primer dibujo (se ejecuta el último, cuando ya está todo cargado)
   js/99-arranque.js
   ============================================================================ */

try{ state=JSON.parse(localStorage.getItem(KEY)) || null; }catch(e){ state=null; }
const _cargadoDesdeLS=!!state;
if(!state){
  state=defAppState();
  try{
    const old=JSON.parse(localStorage.getItem(OLD_KEY));
    if(old && (old.alumnos?.length || old.actividades?.length)){
      const g=defGrupo("Historia del Mundo Contemporáneo (importado)","HMC_1BACH");
      g.alumnos=(old.alumnos||[]).map(a=>normalizarAlumno({...a})); g.actividades=(old.actividades||[]).map(a=>({...a,bloqueId:a.bloqueId||(a.bloque==="examenes"?"b0":"b1")}));
      g.notas=old.notas||{}; g.pesos=old.pesos||{crit:{},ceCc:{}};
      g.umbrales=old.umbralesCustom||g.umbrales;
      state.grupos.push(g);
      state.ui.grupoId=g.id;
    }
  }catch(e){}
}
migrarEstado();
render();

/* v1 · Arranque del guardado seguro: pide persistencia, crea/compara el
   espejo en IndexedDB (y recupera de él si es más reciente o si el
   almacenamiento principal se ha perdido) y hace la copia automática
   «al abrir» si toca. Todo en segundo plano: no retrasa la apertura. */
_ultimoDatosStr=_datosSinUI();
(async()=>{
  try{
    if(navigator.storage && navigator.storage.persist){
      const ya=await navigator.storage.persisted();
      if(!ya) await navigator.storage.persist();
    }
  }catch(e){}
  try{
    const esp=await idbGet("kv","estado");
    const tsLS=_cargadoDesdeLS?(state._guardadoEn||0):-1;
    if(esp && esp.json && (esp.guardadoEn||0)>tsLS+1500){
      let nuevo=null; try{ nuevo=JSON.parse(esp.json); }catch(e){}
      if(nuevo && resumenEstado(nuevo).total>0){
        if(_cargadoDesdeLS && resumenEstado(state).total>0) await crearCopiaAuto("Antes de recuperar la copia interna",true);
        if(cargarEstadoCompleto(nuevo)) mostrarToast("✓ Se han recuperado tus últimos cambios desde la copia interna del dispositivo","info");
      }
    }else if(!esp && _cargadoDesdeLS){
      _idbJsonPendiente=JSON.stringify(state); await volcarEspejoIDB();
    }
    if(resumenEstado(state).total>0 && Date.now()-(state._ultimaCopiaAuto||0)>=COPIA_AUTO_INTERVALO_MS){
      await crearCopiaAuto("Al abrir la app");
    }
  }catch(e){ saveState.idbOk=false; actualizarAvisoGuardado(); }
})();

/* Aviso al cerrar/recargar: solo si el guardado está fallando del todo, o
   si hay muchos cambios de datos y hace más de una semana sin exportar
   (las copias automáticas internas cubren el día a día). */
window.addEventListener("beforeunload",e=>{
  volcarEspejoIDB();
  const cambios=state.cambiosSinCopia||0;
  const dias=state.lastBackupAt?(Date.now()-state.lastBackupAt)/86400000:Infinity;
  if((!saveState.ok && !saveState.idbOk) || (cambios>=30 && dias>7)){
    e.preventDefault();
    e.returnValue="";
    return "";
  }
});

/* (El service worker se registra una sola vez, en <head>.) */


