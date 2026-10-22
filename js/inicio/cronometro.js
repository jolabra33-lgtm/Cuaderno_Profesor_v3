/* ============================================================================
   Cuaderno del profesor · Cronómetro flotante
   js/inicio/cronometro.js
   ============================================================================ */

/* =================================================================
   Cronómetro flotante — independiente de la app y de sus datos, no
   se guarda entre sesiones (como un cronómetro físico). Sigue
   corriendo aunque cierres el panel o cambies de sección, porque
   vive fuera de #app y su intervalo no depende de ningún render().
   ================================================================= */
let cronoSegundosRestantes=0, cronoIntervalo=null, cronoPausado=false, cronoParpadeoInt=null;
function cronoFormatoTiempo(seg){ const s=Math.max(0,seg); const m=Math.floor(s/60); const r=s%60; return String(m).padStart(2,"0")+":"+String(r).padStart(2,"0"); }
function cronoActualizarDisplay(){
  const disp=document.getElementById("cronoDisplay"); if(disp) disp.textContent=cronoFormatoTiempo(cronoSegundosRestantes);
  const fab=document.getElementById("cronoFab");
  if(fab){
    if(cronoIntervalo && !cronoPausado){ fab.textContent=cronoFormatoTiempo(cronoSegundosRestantes); fab.classList.add("crono-corriendo"); }
    else if(cronoIntervalo && cronoPausado){ fab.textContent=cronoFormatoTiempo(cronoSegundosRestantes); fab.classList.add("crono-corriendo"); }
    else { fab.textContent="⏱️"; fab.classList.remove("crono-corriendo"); }
  }
}
function cronoIniciarIntervalo(){
  clearInterval(cronoIntervalo);
  const disp=document.getElementById("cronoDisplay"); if(disp) disp.classList.remove("crono-acabado");
  if(cronoParpadeoInt){ clearInterval(cronoParpadeoInt); cronoParpadeoInt=null; }
  const fab=document.getElementById("cronoFab"); if(fab) fab.classList.remove("crono-fab-alarma");
  cronoPausado=false;
  const btnP=document.getElementById("cronoBtnPausar"); if(btnP) btnP.textContent="⏸ Pausar";
  cronoIntervalo=setInterval(()=>{
    if(cronoPausado) return;
    cronoSegundosRestantes--;
    cronoActualizarDisplay();
    if(cronoSegundosRestantes<=0){
      clearInterval(cronoIntervalo); cronoIntervalo=null;
      cronoActualizarDisplay();
      const d=document.getElementById("cronoDisplay"); if(d) d.classList.add("crono-acabado");
      cronoSonarAlarma();
    }
  },1000);
  cronoActualizarDisplay();
}
window.cronoIniciarMinutos=(min)=>{ cronoSegundosRestantes=min*60; cronoIniciarIntervalo(); };
window.cronoIniciarCustom=()=>{
  const min=parseInt(document.getElementById("cronoCustomMin").value)||0;
  const seg=parseInt(document.getElementById("cronoCustomSeg").value)||0;
  const total=min*60+seg;
  if(total<=0){ mostrarAviso("Pon un tiempo mayor que cero."); return; }
  cronoSegundosRestantes=total;
  cronoIniciarIntervalo();
};
window.cronoTogglePausa=()=>{
  if(!cronoIntervalo) return;
  cronoPausado=!cronoPausado;
  const btnP=document.getElementById("cronoBtnPausar"); if(btnP) btnP.textContent=cronoPausado?"▶ Reanudar":"⏸ Pausar";
};
window.cronoReiniciar=()=>{
  clearInterval(cronoIntervalo); cronoIntervalo=null; cronoPausado=false; cronoSegundosRestantes=0;
  if(cronoParpadeoInt){ clearInterval(cronoParpadeoInt); cronoParpadeoInt=null; }
  const fab=document.getElementById("cronoFab"); if(fab) fab.classList.remove("crono-fab-alarma");
  const d=document.getElementById("cronoDisplay"); if(d) d.classList.remove("crono-acabado");
  const btnP=document.getElementById("cronoBtnPausar"); if(btnP) btnP.textContent="⏸ Pausar";
  cronoActualizarDisplay();
};
window.cronoTogglePanel=()=>{ document.getElementById("cronoPanel").classList.toggle("open"); };
function cronoSonarAlarma(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    const ctx=new Ctx();
    [0,0.6,1.2].forEach(offset=>{
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value=880;
      gain.gain.setValueAtTime(0.001,ctx.currentTime+offset);
      gain.gain.exponentialRampToValueAtTime(0.35,ctx.currentTime+offset+0.02);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+offset+0.45);
      osc.start(ctx.currentTime+offset);
      osc.stop(ctx.currentTime+offset+0.5);
    });
  }catch(e){ /* si el navegador bloquea audio sin interacción previa, seguimos solo con el parpadeo */ }
  const fab=document.getElementById("cronoFab");
  if(fab){
    let veces=0;
    cronoParpadeoInt=setInterval(()=>{
      fab.classList.toggle("crono-fab-alarma");
      veces++;
      if(veces>12){ clearInterval(cronoParpadeoInt); cronoParpadeoInt=null; fab.classList.remove("crono-fab-alarma"); }
    },400);
  }
}
window.setDatoGlobal=(campo,valor)=>{ state[campo]=valor; save(); };
