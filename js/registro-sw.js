/* Cuaderno del profesor · registro del service worker y aviso de versión nueva
   js/registro-sw.js — lo cargan el Cuaderno (index.html) y Tutoría (tutoria/index.html).

   - Registra sw.js (en la raíz de la app) para que funcione sin conexión.
   - Cuando hay una versión nueva descargada, NO se cambia sola a mitad de trabajo:
     aparece un aviso «Hay una versión nueva» con el botón «Actualizar». Al pulsarlo,
     la versión nueva se activa y la página se recarga una sola vez. Los datos no se tocan.
   - Al volver a la app (por ejemplo, al reabrirla en el iPad) se comprueba si hay
     versión nueva, sin esperar a cerrarla del todo. */
(function(){
  if(!('serviceWorker' in navigator)) return;
  const swUrl=new URL('../sw.js',document.currentScript.src).href;
  let recargando=false;

  function mostrarAviso(reg){
    if(document.getElementById('avisoVersionNueva')) return;
    const div=document.createElement('div');
    div.id='avisoVersionNueva';
    div.setAttribute('role','status');
    div.setAttribute('aria-live','polite');
    div.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:100000;'+
      'display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 32px);'+
      'background:#1e293b;color:#f8fafc;padding:12px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);'+
      'font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif';
    div.innerHTML='<span>✨ Hay una versión nueva de la aplicación.</span>'+
      '<button type="button" data-accion="actualizar" style="background:#3b82f6;color:#fff;border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer">Actualizar</button>'+
      '<button type="button" data-accion="luego" style="background:transparent;color:#cbd5e1;border:1px solid #475569;border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer">Luego</button>';
    div.querySelector('[data-accion="actualizar"]').onclick=()=>{
      const w=reg.waiting;
      if(!w){ location.reload(); return; }
      recargando=true;
      w.postMessage({tipo:'ACTIVAR_VERSION_NUEVA'});
    };
    div.querySelector('[data-accion="luego"]').onclick=()=>div.remove();
    (document.body||document.documentElement).appendChild(div);
  }

  function vigilar(reg){
    // Ya hay una versión nueva esperando (se descargó en una visita anterior).
    if(reg.waiting && navigator.serviceWorker.controller) mostrarAviso(reg);
    reg.addEventListener('updatefound',()=>{
      const w=reg.installing; if(!w) return;
      w.addEventListener('statechange',()=>{
        // Solo se avisa si ya había una versión funcionando; la primera instalación es silenciosa.
        if(w.state==='installed' && navigator.serviceWorker.controller) mostrarAviso(reg);
      });
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible') reg.update().catch(()=>{});
    });
  }

  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!recargando) return;   // solo recarga si lo ha pedido el usuario con «Actualizar»
    recargando=false;
    location.reload();
  });

  window.addEventListener('load',()=>{
    navigator.serviceWorker.register(swUrl).then(vigilar).catch(()=>{});
  });
})();
