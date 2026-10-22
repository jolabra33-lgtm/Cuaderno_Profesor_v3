/* ============================================================================
   Cuaderno del profesor · Preferencias de pantalla del dispositivo: tema claro/oscuro y ancho iPad/escritorio
   js/00-preferencias-ui.js
   ============================================================================ */


/* Tema claro/oscuro: preferencia del dispositivo, no viaja con las copias
   de seguridad (es de la pantalla, no de los datos). Se aplica lo antes
   posible para no dar un parpadeo del tema equivocado al cargar. */
(function(){
  const t = localStorage.getItem("geohist_tema") || "claro";
  document.body.setAttribute("data-tema", t);
  const btn=document.getElementById("temaToggleBtn"); if(btn) btn.textContent = t==="oscuro" ? "☀️" : "🌙";
})();
window.toggleTemaApp=()=>{
  const actual = document.body.getAttribute("data-tema")==="oscuro" ? "oscuro" : "claro";
  const nuevo = actual==="oscuro" ? "claro" : "oscuro";
  document.body.setAttribute("data-tema", nuevo);
  localStorage.setItem("geohist_tema", nuevo);
  const btn=document.getElementById("temaToggleBtn"); if(btn) btn.textContent = nuevo==="oscuro" ? "☀️" : "🌙";
};

/* Ancho iPad / escritorio: igual que el tema, preferencia del dispositivo,
   no viaja con las copias de seguridad. iPad (por defecto) mantiene el ancho
   de siempre (1100px); escritorio aprovecha casi todo el monitor. */
(function(){
  const a = localStorage.getItem("geohist_ancho") || "ipad";
  document.body.setAttribute("data-ancho", a);
  const btn=document.getElementById("anchoToggleBtn"); if(btn){ btn.textContent = a==="escritorio" ? "📱" : "🖥️"; btn.title = a==="escritorio" ? "Cambiar a versión iPad" : "Cambiar a versión escritorio"; }
})();
window.toggleAnchoApp=()=>{
  const actual = document.body.getAttribute("data-ancho")==="escritorio" ? "escritorio" : "ipad";
  const nuevo = actual==="escritorio" ? "ipad" : "escritorio";
  document.body.setAttribute("data-ancho", nuevo);
  localStorage.setItem("geohist_ancho", nuevo);
  const btn=document.getElementById("anchoToggleBtn"); if(btn){ btn.textContent = nuevo==="escritorio" ? "📱" : "🖥️"; btn.title = nuevo==="escritorio" ? "Cambiar a versión iPad" : "Cambiar a versión escritorio"; }
};

