/* ============================================================================
   Cuaderno del profesor · Arranque: estado inicial, migraciones y primer dibujo (se ejecuta el último, cuando ya está todo cargado)
   js/99-arranque.js
   ============================================================================ */

try{ state=JSON.parse(localStorage.getItem(KEY)) || null; }catch(e){ state=null; }
const _cargadoDesdeLS=!!state;
/* v3: si la copia de localStorage no cabía, los datos están en IndexedDB (ver guardado-copias.js). Hasta
   leerlos no se guarda nada: así un estado vacío nunca pisa los datos buenos. */
let _datosEnIDB=false;
try{ _datosEnIDB=!state && !!localStorage.getItem(KEY_EN_IDB); }catch(e){}
if(_datosEnIDB){ _guardadoEnPausa=true; _lsCedido=true; }
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
_proyAplicar();   // modo proyector, si estaba activado en este dispositivo

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
    let esp=null;
    try{ esp=await idbGet("kv","estado"); }
    catch(e){
      if(_datosEnIDB){
        // Los datos están en IndexedDB y no se ha podido leer: no se guarda nada encima.
        document.getElementById("app").innerHTML=`<div class="card" style="border-color:var(--danger);margin-top:24px"><h2 style="color:var(--danger)">⚠️ No se han podido leer tus datos</h2><p class="sub">El navegador no ha dejado abrir la base de datos del dispositivo. Cierra las demás ventanas de la app y vuelve a intentarlo. Tus datos no se han tocado.</p><button class="btn" onclick="location.reload()">Reintentar</button></div>`;
        const _h=document.getElementById("appHeader"); if(_h) _h.style.display="none";
        return;
      }
      throw e;
    }
    if(_datosEnIDB){
      // Arranque normal, solo que los datos vienen de IndexedDB en vez de localStorage.
      let nuevo=null; try{ nuevo=esp && esp.json ? JSON.parse(esp.json) : null; }catch(e){}
      _guardadoEnPausa=false;
      if(nuevo && Array.isArray(nuevo.grupos)){
        state=Object.assign(defAppState(),nuevo);
        Object.keys(CAT_CACHE).forEach(k=>delete CAT_CACHE[k]);
        migrarEstado();
        _ultimoDatosStr=_datosSinUI();
        render();
      }else{
        try{ localStorage.removeItem(KEY_EN_IDB); }catch(e){}
        mostrarAviso("No se han encontrado los datos guardados en este dispositivo (puede que se hayan borrado los datos del sitio). Si tienes una copia de seguridad, cárgala con «Abrir archivo».");
      }
    }
    const tsLS=_cargadoDesdeLS?(state._guardadoEn||0):-1;
    // v3: basta con que sea más reciente. localStorage e IndexedDB guardan la misma marca de tiempo para el mismo
    // estado, así que una diferencia —por pequeña que sea— significa que a localStorage no llegó el último guardado.
    if(!_datosEnIDB && esp && esp.json && (esp.guardadoEn||0)>tsLS){
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


