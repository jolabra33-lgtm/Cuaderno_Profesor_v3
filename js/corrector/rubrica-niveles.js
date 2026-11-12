/* ============================================================================
   Cuaderno del profesor · Rúbrica por niveles de logro (categorías × niveles)
   js/corrector/rubrica-niveles.js
   ============================================================================ */

/* Una rúbrica por niveles es una tabla: cada FILA es una categoría (Volumen, Postura, Materiales…) y cada
   COLUMNA un nivel de logro (Experto, Avanzado, Aprendiz, Novel…). Al corregir se pincha la casilla del
   nivel alcanzado y la nota se calcula sola; si hace falta, se afina con el desplegable de puntos.

   Se guarda con la MISMA forma que una rúbrica por puntos, para que todo lo demás (nota del examen, nota de
   cada criterio, NP/Exento, versiones adaptadas NESE, plantillas, Programación, paquetes, estadísticas)
   funcione igual sin tocarlo:
     rubrica=[{ id, title:"", sinTitulo:true, formato:"niveles",
                niveles:[{id,nombre,valor,color}],          // de izquierda (el mejor) a derecha
                items:[categorías], subs:[] }]
   - Cada categoría es un ítem {id,label,max,desc:[],links:[{critId,peso}],celdas:{[nivelId]:"descriptor"}}.
     Su peso en la nota es max×10 % (max son sus puntos sobre 10).
   - El valor de cada nivel lo decide el profesor/a. Un nivel vale (su valor / el valor más alto) de los
     puntos de la categoría: con 4-3-2-1, «Avanzado» en una categoría del 20 % da 1,5 de 2 puntos.
   - En las puntuaciones (grupo.rubricScores) se guardan PUNTOS, como en cualquier rúbrica. Un valor que no
     coincide con ningún nivel se muestra «entre» los dos niveles que lo rodean (nota afinada). */
const CXN_COLORES=["#c8e6c9","#ffe5a3","#f7c48f","#f7a1aa","#cfd8e6","#d7c8ef","#b9e3ea","#eadbc8"];
const CXN_TOL=0.006;
function cxEsNiveles(rub){ return Array.isArray(rub)&&rub.length===1&&!!rub[0]&&rub[0].formato==="niveles"; }
function cxnNodo(rub){ return cxEsNiveles(rub)? rub[0] : null; }
function cxnNiveles(rub){ const n=cxnNodo(rub); return n&&Array.isArray(n.niveles)? n.niveles : []; }
/* Solo se aceptan colores #rrggbb: el color se escribe dentro de un atributo style. */
function cxnColor(c,i){ return /^#[0-9a-f]{6}$/i.test(String(c||""))? c : CXN_COLORES[(i||0)%CXN_COLORES.length]; }
function cxnTinta(hex){
  const n=parseInt(String(hex).slice(1),16); if(!isFinite(n)) return "#141b28";
  const L=0.299*(n>>16&255)+0.587*(n>>8&255)+0.114*(n&255);
  return L>150? "#141b28" : "#ffffff";
}
function cxnValorMax(niveles){ return Math.max(0,...(niveles||[]).map(l=>Number(l.valor)||0)); }
function cxnFraccion(nivel,niveles){ const vm=cxnValorMax(niveles); return vm>0? Math.max(0,Number(nivel.valor)||0)/vm : 0; }
function cxnPuntosNivel(it,nivel,niveles){ return Math.round((Number(it.max)||0)*cxnFraccion(nivel,niveles)*100)/100; }
function cxnPct(v){ return String(Math.round(v*100)/100).replace(".",","); }
function cxnPeso(it){ return Math.round((Number(it.max)||0)*10*100)/100; }
/* Dónde cae una puntuación respecto a los niveles: exactamente en uno, entre dos, o por debajo del más bajo. */
function cxnPosicion(it,v,niveles){
  if(v==null||v===""||!niveles.length) return null;
  const val=Number(v); if(!isFinite(val)) return null;
  const pts=niveles.map(l=>({l,p:cxnPuntosNivel(it,l,niveles)}));
  const ex=pts.find(o=>Math.abs(o.p-val)<CXN_TOL); if(ex) return {exacto:ex.l.id};
  const s=[...pts].sort((a,b)=>b.p-a.p);
  for(let i=0;i<s.length-1;i++) if(val<s[i].p && val>s[i+1].p) return {entre:[s[i].l.id,s[i+1].l.id]};
  if(val<s[s.length-1].p) return {debajo:s[s.length-1].l.id};
  return {encima:s[0].l.id};
}
/* Nivel más parecido a una puntuación (para el reparto por niveles de las estadísticas). */
function cxnNivelCercano(it,v,niveles){
  if(v==null||v===""||!niveles.length) return null;
  const val=Number(v); let mejor=null, d=Infinity;
  niveles.forEach(l=>{ const x=Math.abs(cxnPuntosNivel(it,l,niveles)-val); if(x<d-1e-9){ d=x; mejor=l; } });
  return mejor;
}
function cxnTextoPosicion(pos,niveles){
  if(!pos) return "";
  const nom=id=>{ const l=niveles.find(x=>x.id===id); return l? (l.nombre||"(sin nombre)") : ""; };
  if(pos.exacto) return nom(pos.exacto);
  if(pos.entre) return `entre ${nom(pos.entre[0])} y ${nom(pos.entre[1])}`;
  if(pos.debajo) return `por debajo de ${nom(pos.debajo)}`;
  return nom(pos.encima);
}

/* ---- Crear y convertir ---- */
function cxnNivelesPorDefecto(){
  return [["Experto",4],["Avanzado",3],["Aprendiz",2],["Novel",1]].map(([nombre,valor],i)=>({id:uid(),nombre,valor,color:CXN_COLORES[i]}));
}
function cxnRubricaNueva(criterios,catalogoKey){
  const crits=(criterios||[]).filter(l=>l&&l.critId);
  let cats;
  if(crits.length){
    const idx=catIndex(catalogoKey);
    const textoDe=cid=>{ for(const ce of idx.cat.ces){ const cr=ce.criterios.find(c=>c.id===cid); if(cr) return cr.texto||""; } return ""; };
    const pts=cxRepartirPuntos(crits.map(()=>1),10);
    cats=crits.map((l,i)=>{ let t=textoDe(l.critId); if(t.length>70) t=t.slice(0,67).trim()+"…";
      return {id:uid(),label:`Criterio ${l.critId}${t?" — "+t:""}`,max:pts[i],desc:[],links:[{critId:l.critId,peso:100}],celdas:{}}; });
  } else {
    const pts=cxRepartirPuntos([1,1,1],10);
    cats=pts.map((p,i)=>({id:uid(),label:`Categoría ${i+1}`,max:p,desc:[],links:[],celdas:{}}));
  }
  return [{id:uid(),title:"",sinTitulo:true,formato:"niveles",niveles:cxnNivelesPorDefecto(),items:cats,subs:[]}];
}
/* Rúbrica por puntos → por niveles: cada ítem pasa a ser una categoría con los mismos id, puntos y criterios,
   así que lo ya corregido se conserva (sale «entre» niveles si no coincide con ninguno). */
function cxnDesdePuntos(rub){
  const items=cxItemsFlat(rub).map(it=>{
    const label=String(it.label||"").trim() || (typeof exEtiquetaItem==="function"? exEtiquetaItem(rub,it) : "") || "Categoría";
    return {...it,label,celdas:it.celdas&&typeof it.celdas==="object"? it.celdas : {}};
  });
  return [{id:uid(),title:"",sinTitulo:true,formato:"niveles",niveles:cxnNivelesPorDefecto(),items:items.length?items:[{id:uid(),label:"Categoría 1",max:10,desc:[],links:[],celdas:{}}],subs:[]}];
}
/* Por niveles → por puntos: las categorías pasan a ítems (mismos id y puntos) y los descriptores de cada
   nivel se guardan como descriptores del ítem, para no perder lo escrito. */
function cxnAPuntos(rub){
  const niv=cxnNiveles(rub);
  const items=cxItemsFlat(rub).map(it=>{
    const r={...it}; const cel=it.celdas||{};
    const lineas=niv.filter(l=>String(cel[l.id]||"").trim()).map(l=>`• **${String(l.nombre||"Nivel").replace(/\*/g,"")}**: ${String(cel[l.id]).replace(/\s*\n\s*/g," ").trim()}`);
    if(lineas.length && !(it.desc||[]).length){ r.desc=lineas; r.descFmt=2; }
    delete r.celdas; return r;
  });
  return [{id:uid(),title:"Apartado 1",items,subs:[]}];
}

/* ---- Reajustar lo ya corregido cuando cambian los valores de los niveles o los pesos ----
   Cada puntuación se ubica entre dos «anclas» (los niveles y el 0) y, tras el cambio, se recoloca en la
   misma posición relativa: quien tenía «Avanzado» sigue teniendo «Avanzado» con su nuevo valor. */
function cxnAnclas(it,niveles){ return [{id:"_0",p:0},...niveles.map(l=>({id:l.id,p:cxnPuntosNivel(it,l,niveles)}))].sort((a,b)=>b.p-a.p); }
function cxnUbicar(it,v,niveles){
  const a=cxnAnclas(it,niveles);
  const ex=a.find(x=>Math.abs(x.p-v)<CXN_TOL); if(ex) return {hi:ex.id,lo:ex.id,t:1};
  for(let i=0;i<a.length-1;i++) if(v<=a[i].p && v>=a[i+1].p) return {hi:a[i].id,lo:a[i+1].id,t:(v-a[i+1].p)/((a[i].p-a[i+1].p)||1)};
  return {hi:a[0].id,lo:a[0].id,t:1};
}
function cxnRecolocar(it,u,niveles,anterior){
  const p=id=>{ if(id==="_0") return 0; const l=niveles.find(x=>x.id===id); return l? cxnPuntosNivel(it,l,niveles) : null; };
  const hi=p(u.hi), lo=p(u.lo), max=Number(it.max)||0;
  const v=(hi==null||lo==null)? anterior : lo+u.t*(hi-lo);
  return Math.round(Math.max(0,Math.min(max,v))*100)/100;
}
function cxnRemapear(grupo,act,rub,cambiar){
  const items=cxItemsFlat(rub), niv0=cxnNiveles(rub).map(l=>({...l}));
  const max0=new Map(items.map(it=>[it.id,Number(it.max)||0]));
  const guardadas=[];
  grupo.alumnos.filter(al=>cxRubricaDe(act,al.id)===rub).forEach(al=>{
    const sc=grupo.rubricScores?.[al.id]?.[act.id]; if(!sc) return;
    items.forEach(it=>{ const v=sc[it.id]; if(v==null||v===""||!isFinite(Number(v))) return;
      guardadas.push({sc,it,v:Number(v),u:cxnUbicar({...it,max:max0.get(it.id)},Number(v),niv0)}); });
  });
  cambiar();
  const niv1=cxnNiveles(rub), vivos=new Set(cxItemsFlat(rub).map(it=>it.id));
  guardadas.forEach(g=>{ if(vivos.has(g.it.id)) g.sc[g.it.id]=cxnRecolocar(g.it,g.u,niv1,g.v); });
  cxRecalcTodosLosAlumnos(grupo,act);
}

/* ---------- Editor ---------- */
function cxnEditorHTML(grupo,act,rub,variante,escalar){
  const nodo=cxnNodo(rub), niv=cxnNiveles(rub), items=nodo.items||[];
  const suma=Math.round(items.reduce((s,it)=>s+cxnPeso(it),0)*100)/100;
  const ok=Math.abs(suma-100)<0.01;
  const cab=niv.map((l,i)=>{ const col=cxnColor(l.color,i), tin=cxnTinta(col);
    return `<th scope="col" class="cxn-cab" style="background:${col};color:${tin}">
      <input class="in cxn-nom" value="${esc(l.nombre||"")}" placeholder="Nombre del nivel" aria-label="Nombre del nivel ${i+1}" onchange="cxnSetNivel('${l.id}','nombre',this.value)">
      <div class="cxn-cab-fila">
        <label>Valor <input class="in cxn-valor" type="text" inputmode="decimal" autocomplete="off" value="${cxnPct(Number(l.valor)||0)}" aria-label="Valor del nivel ${esc(l.nombre||String(i+1))}" onchange="cxnSetNivel('${l.id}','valor',this.value)"></label>
        <span title="Parte de los puntos de la categoría que da este nivel">= ${cxnPct(cxnFraccion(l,niv)*100)} %</span>
      </div>
      <div class="cxn-cab-fila">
        <label class="cxn-color" title="Cambiar el color">🎨<input type="color" value="${col}" aria-label="Color del nivel ${esc(l.nombre||String(i+1))}" onchange="cxnSetNivel('${l.id}','color',this.value)"></label>
        <button type="button" class="ghost small" title="Mover a la izquierda" aria-label="Mover el nivel a la izquierda" ${i===0?"disabled":""} onclick="cxnMoverNivel('${l.id}',-1)">◀</button>
        <button type="button" class="ghost small" title="Mover a la derecha" aria-label="Mover el nivel a la derecha" ${i===niv.length-1?"disabled":""} onclick="cxnMoverNivel('${l.id}',1)">▶</button>
        <button type="button" class="ghost small danger" title="Eliminar este nivel" aria-label="Eliminar el nivel ${esc(l.nombre||String(i+1))}" ${niv.length<=2?"disabled":""} onclick="cxnBorrarNivel('${l.id}')">✕</button>
      </div>
    </th>`; }).join("");
  const filas=items.map((it,i)=>{
    const abierto=state.ui.corItemAbierto===it.id, nCrit=(it.links||[]).length;
    return `<tr>
      <th scope="row" class="cxn-cat">
        <textarea class="in cx-autogrow" rows="1" placeholder="Categoría (p. ej. Volumen)" aria-label="Nombre de la categoría ${i+1}" oninput="cxAutoGrow(this)" onchange="cxnSetCat('${it.id}',this.value)">${esc(it.label||"")}</textarea>
        <label class="cxn-peso">Peso <input class="in" type="text" inputmode="decimal" autocomplete="off" value="${cxnPct(cxnPeso(it))}" aria-label="Peso de la categoría ${esc(it.label||String(i+1))} en %" onchange="cxnSetPeso('${it.id}',this.value)"> %</label>
        <div class="cxn-cat-bot">
          <button type="button" class="ghost small" title="Subir" aria-label="Subir la categoría" ${i===0?"disabled":""} onclick="cxnMoverCat('${it.id}',-1)">↑</button>
          <button type="button" class="ghost small" title="Bajar" aria-label="Bajar la categoría" ${i===items.length-1?"disabled":""} onclick="cxnMoverCat('${it.id}',1)">↓</button>
          <button type="button" class="ghost small danger" title="Eliminar la categoría" aria-label="Eliminar la categoría ${esc(it.label||String(i+1))}" ${items.length<=1?"disabled":""} onclick="cxnBorrarCat('${it.id}')">✕</button>
        </div>
        <button type="button" class="ghost small cxn-crit-btn" aria-expanded="${abierto}" onclick="cxToggleItemCriterios('${it.id}')">${abierto?"Ocultar criterios":"Criterios"}${nCrit?` (${(it.links||[]).map(l=>esc(l.critId)).join(", ")})`:" · sin vincular"}</button>
      </th>
      ${niv.map((l,j)=>`<td class="cxn-celda-ed" style="border-top:4px solid ${cxnColor(l.color,j)}"><textarea class="in cx-autogrow" rows="3" placeholder="Qué se observa en «${esc(l.nombre||"este nivel")}»" aria-label="Descriptor de ${esc(it.label||"la categoría")} en el nivel ${esc(l.nombre||String(j+1))}" oninput="cxAutoGrow(this)" onchange="cxnSetCelda('${it.id}','${l.id}',this.value)">${esc((it.celdas||{})[l.id]||"")}</textarea></td>`).join("")}
    </tr>
    ${abierto?`<tr><td colspan="${niv.length+1}" class="cxn-crit-fila">${cxCritPickerHTML(grupo,nodo,it)}</td></tr>`:""}`;
  }).join("");
  return `<div class="card">
    <p class="sub" style="margin:0">Rúbrica <strong>por niveles de logro</strong>: cada fila es una <strong>categoría</strong> con su peso en la nota y los criterios que evalúa; cada columna, un <strong>nivel</strong> con el valor que tú decides. Al corregir se pincha la casilla del nivel alcanzado y la nota se calcula sola (un nivel da su valor dividido entre el del nivel más alto); si hace falta, se afina con el desplegable de puntos.</p>
    <div class="flex" style="margin-top:10px;align-items:center;flex-wrap:wrap">
      <span class="pill" style="background:${ok?'#dcece0':'#f3dcdc'};color:${ok?'#1e5631':'#912525'}">Suma de pesos${variante?" (rúbrica adaptada)":""}: ${cxnPct(suma)} % / 100 %</span>
      ${!ok?`<button class="ghost small" style="border:1px solid var(--line)" onclick="cxnIgualarPesos()">Repartir los pesos a partes iguales</button>
      <label style="font-size:12.5px;color:var(--ink);display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" ${escalar?"checked":""} onchange="cxSetEscalarA10(this.checked)"> Convertir a nota sobre 10 (los pesos cuentan en proporción)</label>
      ${escalar?"":'<span style="font-size:12.5px;color:var(--danger,#b91c1c)">Sin convertir, la nota máxima será '+cxFmtPts(suma/10)+'.</span>'}`:""}
    </div>
  </div>
  <div class="card cxn-card">
    <div class="cxn-wrap"><table class="cxn-tabla cxn-editor" style="min-width:${210+niv.length*150}px">
      <thead><tr><th scope="col" class="cxn-esq">Categorías <span class="sub" style="font-weight:400">· ${items.length}</span></th>${cab}</tr></thead>
      <tbody>${filas}</tbody>
    </table></div>
    <div class="flex" style="margin-top:10px;gap:6px;flex-wrap:wrap">
      <button class="btn" onclick="cxnAddCat()">+ Categoría</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="cxnAddNivel()">+ Nivel</button>
      ${ok?`<button class="ghost" style="border:1px solid var(--line)" onclick="cxnIgualarPesos()">Repartir los pesos a partes iguales</button>`:""}
    </div>
  </div>`;
}
/* Contexto del editor (rúbrica general o adaptada que se está editando), solo si es por niveles. */
function cxnCtx(){ const x=cxCtxEd(); return x&&cxEsNiveles(x.rub)? {...x,nodo:cxnNodo(x.rub)} : null; }
function cxnNum(v){ const n=Number(String(v??"").trim().replace(",",".")); return isFinite(n)? n : null; }
window.cxnSetNivel=(nivelId,campo,v)=>{
  const x=cxnCtx(); if(!x) return; const l=x.nodo.niveles.find(n=>n.id===nivelId); if(!l) return;
  if(campo==="nombre"){ l.nombre=String(v||"").trim(); save(); render(); return; }
  if(campo==="color"){ l.color=cxnColor(v,x.nodo.niveles.indexOf(l)); save(); render(); return; }
  const n=cxnNum(v); if(n==null||n<0){ mostrarAviso("El valor de un nivel tiene que ser un número igual o mayor que 0 (puedes usar coma: 2,5)."); render(); return; }
  cxnRemapear(x.grupo,x.act,x.rub,()=>{ l.valor=n; });
  save(); render();
};
window.cxnAddNivel=()=>{
  const x=cxnCtx(); if(!x) return; const niv=x.nodo.niveles;
  if(niv.length>=8){ mostrarAviso("Como máximo, 8 niveles."); return; }
  const minV=niv.length? Math.min(...niv.map(l=>Number(l.valor)||0)) : 1;
  niv.push({id:uid(),nombre:"Nivel "+(niv.length+1),valor:Math.max(0,minV-1),color:CXN_COLORES[niv.length%CXN_COLORES.length]});
  save(); render();
};
window.cxnMoverNivel=(nivelId,dir)=>{
  const x=cxnCtx(); if(!x) return; const niv=x.nodo.niveles, i=niv.findIndex(l=>l.id===nivelId), j=i+dir;
  if(i<0||j<0||j>=niv.length) return; [niv[i],niv[j]]=[niv[j],niv[i]]; save(); render();
};
window.cxnBorrarNivel=async nivelId=>{
  const x=cxnCtx(); if(!x) return; const niv=x.nodo.niveles, l=niv.find(n=>n.id===nivelId); if(!l) return;
  if(niv.length<=2){ mostrarAviso("La rúbrica necesita al menos dos niveles."); return; }
  const conTexto=(x.nodo.items||[]).some(it=>String((it.celdas||{})[nivelId]||"").trim());
  if(!await confirmar(`¿Eliminar el nivel «${l.nombre||"sin nombre"}»${conTexto?" y sus descriptores":""}? Lo ya corregido conserva sus puntos.`)) return;
  cxnRemapear(x.grupo,x.act,x.rub,()=>{ x.nodo.niveles=niv.filter(n=>n.id!==nivelId); (x.nodo.items||[]).forEach(it=>{ if(it.celdas) delete it.celdas[nivelId]; }); });
  save(); render();
};
window.cxnSetCat=(itemId,v)=>{ const x=cxnCtx(); const it=x&&(x.nodo.items||[]).find(i=>i.id===itemId); if(it){ it.label=String(v||""); save(); } };
window.cxnSetCelda=(itemId,nivelId,v)=>{
  const x=cxnCtx(); const it=x&&(x.nodo.items||[]).find(i=>i.id===itemId); if(!it) return;
  if(!it.celdas||typeof it.celdas!=="object") it.celdas={};
  const t=String(v||"").replace(/\s+$/,""); if(t) it.celdas[nivelId]=t; else delete it.celdas[nivelId];
  save();
};
window.cxnSetPeso=(itemId,v)=>{
  const x=cxnCtx(); const it=x&&(x.nodo.items||[]).find(i=>i.id===itemId); if(!it) return;
  const n=cxnNum(v); if(n==null||n<0||n>100){ mostrarAviso("El peso es un porcentaje entre 0 y 100 (puedes usar coma: 12,5)."); render(); return; }
  cxnRemapear(x.grupo,x.act,x.rub,()=>{ it.max=Math.round(n/10*1000)/1000; });
  save(); render();
};
window.cxnIgualarPesos=()=>{
  const x=cxnCtx(); if(!x) return; const items=x.nodo.items||[]; if(!items.length) return;
  const pts=cxRepartirPuntos(items.map(()=>1),10);
  cxnRemapear(x.grupo,x.act,x.rub,()=>{ items.forEach((it,i)=>{ it.max=pts[i]; }); });
  save(); render();
  mostrarToast("✓ Pesos repartidos a partes iguales");
};
window.cxnAddCat=()=>{
  const x=cxnCtx(); if(!x) return; const items=x.nodo.items=x.nodo.items||[];
  const resto=Math.round((10-items.reduce((s,it)=>s+(Number(it.max)||0),0))*1000)/1000;
  items.push({id:uid(),label:"",max:Math.max(0,resto),desc:[],links:[],celdas:{}});
  save(); render();
  if(resto<=0) mostrarToast("Categoría añadida con peso 0 %: pon su peso o reparte los pesos a partes iguales","info");
};
window.cxnMoverCat=(itemId,dir)=>{
  const x=cxnCtx(); if(!x) return; const items=x.nodo.items||[], i=items.findIndex(it=>it.id===itemId), j=i+dir;
  if(i<0||j<0||j>=items.length) return; [items[i],items[j]]=[items[j],items[i]]; save(); render();
};
window.cxnBorrarCat=async itemId=>{
  const x=cxnCtx(); if(!x) return; const items=x.nodo.items||[], it=items.find(i=>i.id===itemId); if(!it) return;
  if(items.length<=1){ mostrarAviso("Debe quedar al menos una categoría."); return; }
  if(!await confirmar(`¿Eliminar la categoría «${it.label||"sin nombre"}»? Se quitan también sus puntuaciones ya corregidas.`)) return;
  x.nodo.items=items.filter(i=>i.id!==itemId);
  cxLimpiarPuntuacionesHuerfanas(x.grupo,x.act);
  save(); render();
};
/* Cambiar el tipo de la rúbrica que se está editando. Los ítems/categorías conservan su id: lo corregido no se pierde. */
window.cxCambiarTipoRubrica=async()=>{
  const x=cxCtxEd(); if(!x) return;
  const va=cxVarEditando(x.act), aNiv=!cxEsNiveles(x.rub);
  if(aNiv){
    const plano=cxNodosFlat(x.rub).length>1||x.rub.some(n=>cxElegirEf(n));
    if(!await confirmar(`¿Pasar esta rúbrica a «por niveles de logro»? Cada pregunta o ítem pasa a ser una categoría, con sus puntos como peso y sus criterios. Después escribes los niveles y sus descriptores.${plano?"\n\nOjo: los apartados y subapartados desaparecen (todas las preguntas quedan en una sola tabla) y se pierde el «a elegir».":""}\n\nLo ya corregido se conserva.`,{ok:"Pasar a niveles",peligro:false})) return;
  } else {
    if(!await confirmar("¿Pasar esta rúbrica a «por puntos» (preguntas e ítems)? Cada categoría pasa a ser un ítem con sus puntos y criterios, y los descriptores de los niveles se guardan como descriptores del ítem.\n\nLo ya corregido se conserva.",{ok:"Pasar a puntos",peligro:false})) return;
  }
  const nueva=aNiv? cxnDesdePuntos(x.rub) : cxnAPuntos(x.rub);
  if(va) va.rubrica=nueva; else { x.act.rubrica=nueva; delete x.act.rubricaSinElegir; }
  cxSyncCriteriosActividad(x.act); cxRecalcTodosLosAlumnos(x.grupo,x.act);
  state.ui.corItemAbierto="";
  save(); render();
  mostrarToast(aNiv?"✓ Rúbrica por niveles: escribe los descriptores de cada casilla":"✓ Rúbrica por puntos");
};
/* Sustituir la rúbrica que se está editando por una plantilla guardada (de cualquier tipo). */
window.cxCargarPlantilla=async()=>{
  const x=cxCtxEd(); if(!x) return;
  const pl=state.plantillasRubrica||[];
  if(!pl.length){ mostrarAviso("Todavía no tienes plantillas de rúbrica. Guarda una con «💾 Guardar como plantilla» y podrás usarla en cualquier examen o trabajo de cualquier grupo."); return; }
  const id=await elegirOpcion("📂 Cargar plantilla","¿Qué plantilla quieres usar en esta rúbrica? Sustituye a la rúbrica actual.",pl.map(p=>({value:p.id,label:p.nombre+(cxEsNiveles(p.rubrica)?" · por niveles":" · por puntos")})));
  if(!id) return; const p=pl.find(y=>y.id===id); if(!p) return;
  const corregidos=x.grupo.alumnos.filter(al=>cxRubricaDe(x.act,al.id)===x.rub && Object.keys(x.grupo.rubricScores?.[al.id]?.[x.act.id]||{}).length).length;
  if(corregidos && !await confirmar(`Ya hay ${corregidos} alumno${corregidos===1?"":"s"} corregido${corregidos===1?"":"s"} con esta rúbrica. Al cargar la plantilla se perderán esas puntuaciones.\n\n¿Continuar?`,{ok:"Cargar plantilla"})) return;
  const nueva=cxClonarRubrica(p.rubrica,x.grupo.catalogoKey), va=cxVarEditando(x.act);
  if(va) va.rubrica=nueva; else { x.act.rubrica=nueva; delete x.act.rubricaSinElegir; }
  cxLimpiarPuntuacionesHuerfanas(x.grupo,x.act);
  state.ui.corItemAbierto="";
  save(); render();
  mostrarToast(`✓ Plantilla «${p.nombre}» cargada`);
};

/* ---------- Corregir ---------- */
function cxnCorregirHTML(grupo,rub,sc,alId,actId){
  const niv=cxnNiveles(rub), items=cxItemsFlat(rub), np=marcaDe(grupo,alId,actId)==="NP";
  const cab=niv.map((l,i)=>{ const col=cxnColor(l.color,i);
    return `<th scope="col" class="cxn-cab" style="background:${col};color:${cxnTinta(col)}"><span class="cxn-cab-nom">${esc(l.nombre||"")}</span><span class="cxn-cab-val">${cxnPct(Number(l.valor)||0)}</span></th>`; }).join("");
  const filas=items.map(it=>{
    const v=sc[it.id], pos=np?null:cxnPosicion(it,v,niv);
    const parcial=new Set(pos&&(pos.entre||[pos.debajo]).filter(Boolean));
    return `<tr>
      <th scope="row" class="cxn-cat">
        <div class="cxn-cat-nom">${esc(it.label||"(sin nombre)")}</div>
        <div class="cxn-cat-peso">${cxnPct(cxnPeso(it))} %</div>
        ${exComentHTML(alId,actId,it.id)}
      </th>
      ${niv.map((l,i)=>{ const col=cxnColor(l.color,i), on=!!(pos&&pos.exacto===l.id), par=parcial.has(l.id), txt=String((it.celdas||{})[l.id]||"").trim();
        return `<td class="cxn-op${on?" on":""}${par?" parcial":""}" style="--cxn:${col};--cxn-tinta:${cxnTinta(col)}">
          <button type="button" aria-pressed="${on}" aria-label="${esc(it.label||"Categoría")}: ${esc(l.nombre||"nivel")} (${cxFmtPts(cxnPuntosNivel(it,l,niv))} puntos)" onclick="cxnElegir('${alId}','${actId}','${it.id}','${l.id}')">
            ${on?'<span class="cxn-check" aria-hidden="true">✓</span>':""}${txt?esc(txt):`<span class="cxn-solo-nom">${esc(l.nombre||"")}</span>`}
          </button></td>`; }).join("")}
      <td class="cxn-pts">
        ${cxSelectPuntuacionHTML(it.max,v,"",`onchange="cxSetItemScore('${alId}','${actId}','${it.id}',this.value)" title="Afinar la puntuación"`,np)}
        <div class="cxn-pts-max">/ ${cxFmtPts(it.max)}</div>
        ${pos&&!pos.exacto?`<div class="cxn-entre">${esc(cxnTextoPosicion(pos,niv))}</div>`:""}
      </td>
    </tr>`;
  }).join("");
  return `<p class="sub" style="margin:0 0 8px">Pincha la casilla del nivel alcanzado en cada categoría. Para afinar (p. ej. entre dos niveles), elige los puntos en el desplegable de la derecha.</p>
  <div class="cxn-wrap"><table class="cxn-tabla cxn-corr" style="min-width:${230+niv.length*125}px">
    <thead><tr><th scope="col" class="cxn-esq">Categoría</th>${cab}<th scope="col" class="cxn-esq" style="text-align:right">Puntos</th></tr></thead>
    <tbody>${filas}</tbody>
  </table></div>`;
}
window.cxnElegir=(alId,actId,itemId,nivelId)=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  const rub=cxRubricaDe(act,alId), niv=cxnNiveles(rub);
  const it=cxItemsFlat(rub).find(i=>i.id===itemId), l=niv.find(n=>n.id===nivelId); if(!it||!l) return;
  cxSetItemScore(alId,actId,itemId,String(cxnPuntosNivel(it,l,niv)));
};

/* ---------- Imprimir la rúbrica corregida ---------- */
function cxnImprimirHTML(grupo,act,al,rub,sc,opts){
  const niv=cxnNiveles(rub), items=cxItemsFlat(rub);
  const anot=it=>{ const t=(grupo.examComentarios?.[al.id]?.[act.id+"|"+it.id]||"").trim(); return t?`<div class="cx-item-desc" style="font-style:italic">✎ ${esc(t)}</div>`:""; };
  const pts=it=>{ const v=sc[it.id]; return `<span class="cx-item-score">${v==null||v===""?"—":fmt(Number(v))}</span><small> / ${fmt(Number(it.max)||0)}</small>`; };
  if(opts.resumida){
    const filas=items.map(it=>{ const pos=cxnPosicion(it,sc[it.id],niv); const l=pos&&pos.exacto&&niv.find(n=>n.id===pos.exacto);
      return `<tr><td><div class="cx-item-label">${esc(it.label||"(sin nombre)")}</div>${anot(it)}</td>
        <td style="white-space:nowrap">${l?`<span class="cxn-imp-chip" style="background:${cxnColor(l.color,niv.indexOf(l))};color:${cxnTinta(cxnColor(l.color,niv.indexOf(l)))}">${esc(l.nombre||"")}</span>`:esc(cxnTextoPosicion(pos,niv)||"—")}</td>
        <td style="text-align:right;white-space:nowrap">${pts(it)}</td></tr>`; }).join("");
    return `<div class="cx-sec"><table><tbody>${filas}</tbody></table></div>`;
  }
  const cab=niv.map((l,i)=>{ const col=cxnColor(l.color,i); return `<th style="background:${col};color:${cxnTinta(col)}">${esc(l.nombre||"")}</th>`; }).join("");
  const filas=items.map(it=>{ const pos=cxnPosicion(it,sc[it.id],niv), par=new Set(pos&&(pos.entre||[pos.debajo]).filter(Boolean));
    return `<tr><th class="cxn-imp-cat">${esc(it.label||"(sin nombre)")}<div class="cxn-imp-peso">${cxnPct(cxnPeso(it))} %</div>${anot(it)}</th>
      ${niv.map((l,i)=>{ const col=cxnColor(l.color,i), on=pos&&pos.exacto===l.id, p=par.has(l.id);
        return `<td class="${on?"cxn-imp-on":p?"cxn-imp-parcial":""}" style="${on?`background:${col};color:${cxnTinta(col)};`:""}--cxn:${col}">${on?"✓ ":""}${esc(String((it.celdas||{})[l.id]||"").trim())}</td>`; }).join("")}
      <td style="text-align:right;white-space:nowrap;vertical-align:top">${pts(it)}${pos&&!pos.exacto?`<div class="cx-item-desc">${esc(cxnTextoPosicion(pos,niv))}</div>`:""}</td></tr>`; }).join("");
  return `<div class="cx-sec"><table class="cxn-imp"><thead><tr><th></th>${cab}<th style="text-align:right">Puntos</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}
function cxnPrintCSS(){
  return `<style>
    .cxn-imp{ table-layout:fixed; width:100%; border-collapse:collapse; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .cxn-imp th, .cxn-imp td{ border:1px solid #dde3ec; padding:7px 8px; font-size:11.5px; line-height:1.4; vertical-align:top; text-align:left; }
    .cxn-imp thead th{ font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
    .cxn-imp thead th:first-child{ width:22%; border:none; background:none; }
    .cxn-imp thead th:last-child{ width:68px; }
    .cxn-imp-cat{ font-size:12.5px !important; color:#141b28; }
    .cxn-imp-peso{ font-weight:400; color:#8d97ab; font-size:11px; }
    .cxn-imp td{ color:#5b6b82; }
    .cxn-imp-on{ font-weight:700; outline:2px solid #141b28; outline-offset:-2px; }
    .cxn-imp-parcial{ outline:2px dashed #465064; outline-offset:-3px; }
    .cxn-imp-chip{ display:inline-block; padding:2px 9px; border-radius:999px; font-size:12px; font-weight:700; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  </style>`;
}

/* ---------- Estadísticas: cuántos alumnos/as quedan en cada nivel de cada categoría ---------- */
function cxnRepartoHTML(grupo,act){
  const rub=act.rubrica; if(!cxEsNiveles(rub)) return "";
  const niv=cxnNiveles(rub), items=cxItemsFlat(rub);
  const alumnos=grupo.alumnos.filter(al=>!cxVarianteDeAlumno(act,al.id) && !marcaDe(grupo,al.id,act.id) && grupo.notasCuant?.[al.id]?.[act.id]!=null);
  if(!alumnos.length) return "";
  const filas=items.map(it=>{
    const n=new Map(niv.map(l=>[l.id,0]));
    alumnos.forEach(al=>{ const l=cxnNivelCercano(it,grupo.rubricScores?.[al.id]?.[act.id]?.[it.id],niv); if(l) n.set(l.id,n.get(l.id)+1); });
    return `<tr><th scope="row" style="text-align:left;font-weight:500;font-size:12.5px;padding:4px 8px 4px 0">${esc(it.label||"(sin nombre)")}</th>${niv.map(l=>`<td style="text-align:center;font-size:12.5px;padding:4px 6px;${n.get(l.id)?"font-weight:700":"color:var(--mut)"}">${n.get(l.id)}</td>`).join("")}</tr>`;
  }).join("");
  return `<h3 style="font-size:13.5px;margin:14px 0 6px">Reparto por niveles <span class="sub" style="font-weight:400">· rúbrica general, ${alumnos.length} alumno${alumnos.length===1?"":"s"}</span></h3>
    <div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr><th></th>${niv.map((l,i)=>{ const col=cxnColor(l.color,i); return `<th scope="col" style="background:${col};color:${cxnTinta(col)};font-size:12px;padding:4px 6px">${esc(l.nombre||"")}</th>`; }).join("")}</tr></thead><tbody>${filas}</tbody></table></div>
    <p class="sub" style="margin:4px 0 0;font-size:11px">Las notas afinadas cuentan en el nivel más cercano.</p>`;
}

/* ---------- Elegir el tipo de rúbrica de un examen que llega con la rúbrica hecha automáticamente ----------
   Un examen traído de la Programación (o al que se le añade rúbrica desde Evaluación) recibe una rúbrica
   inicial por puntos, con una pregunta por criterio. Mientras nadie la haya corregido, el Corrector pregunta
   con qué tipo se quiere corregir. act.rubricaSinElegir marca las creadas así; las creadas antes de existir
   esta marca se reconocen por su forma (la que genera cxRubricaDesdeCriterios, sin tocar). */
function cxRubricaAutomatica(rub){
  if(!Array.isArray(rub)||rub.length!==1||cxEsNiveles(rub)) return false;
  const n=rub[0], items=n.items||[];
  if((n.subs||[]).length||!items.length||n.title!=="Apartado 1") return false;
  return items.every(it=>!it.fuenteId&&!(it.desc||[]).length&&(/^Pregunta \d+ · criterio /.test(it.label||"")||(items.length===1&&!it.label)));
}
function cxTipoPendiente(grupo,act){
  if(!act||!act.esExamen||!Array.isArray(act.rubrica)||cxEsNiveles(act.rubrica)||cxVariantes(act).length) return false;
  if(act.rubricaSinElegir===false) return false;   // ya se eligió «por puntos»
  if(!act.rubricaSinElegir&&!cxRubricaAutomatica(act.rubrica)) return false;
  return !grupo.alumnos.some(al=>Object.keys(grupo.rubricScores?.[al.id]?.[act.id]||{}).length);
}
function cxElegirTipoHTML(grupo,act){
  if(!cxTipoPendiente(grupo,act)) return "";
  const hayPl=(state.plantillasRubrica||[]).length;
  return `<div class="card" style="border-left:4px solid var(--accent)">
    <h2 style="font-size:15px;margin:0 0 4px">¿Con qué tipo de rúbrica quieres corregir «${esc(act.nombre)}»?</h2>
    <p class="sub" style="margin:0 0 10px">Se ha preparado una rúbrica <strong>por puntos</strong> con una pregunta por cada criterio. Puedes dejarla así o cambiarla ahora (más tarde también podrás, con «⇄ Pasar a…»).</p>
    <div class="flex" style="gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="cxElegirTipoInicial('${act.id}','niveles')">▦ Por niveles de logro</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="cxElegirTipoInicial('${act.id}','puntos')">Por puntos (preguntas e ítems)</button>
      ${hayPl?`<button class="ghost" style="border:1px solid var(--line)" onclick="cxElegirTipoInicial('${act.id}','plantilla')">📂 Desde una plantilla</button>`:""}
    </div>
    <p class="sub" style="margin:8px 0 0;font-size:12px"><strong>Por niveles</strong>: tabla de categorías × niveles (Experto, Avanzado…) que se corrige pinchando casillas; empieza con una categoría por criterio. Si la guardas en la Programación («📌»), los demás grupos la recibirán ya hecha.</p>
  </div>`;
}
window.cxElegirTipoInicial=async(actId,tipo)=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  state.ui.corExamId=act.id; state.ui.corVarId=""; state.ui.corAlId=""; state.ui.corTab="editor";
  if(tipo==="plantilla"){
    const antes=act.rubrica; await cxCargarPlantilla();
    if(act.rubrica===antes){ save(); render(); return; }   // cancelado: se sigue preguntando
  } else if(tipo==="niveles"){
    const crits=cxCriteriosPrevistos(grupo,act)||cxCriteriosDeRubrica(act.rubrica);
    act.rubrica=cxnRubricaNueva(crits.map(c=>({critId:c,peso:100})),grupo.catalogoKey);
    act.escalarA10=true;
    cxSyncCriteriosActividad(act); cxRecalcTodosLosAlumnos(grupo,act);
    mostrarToast("✓ Rúbrica por niveles: escribe los descriptores de cada casilla");
  }
  if(tipo==="puntos") act.rubricaSinElegir=false; else delete act.rubricaSinElegir;
  state.ui.corItemAbierto="";
  save(); render();
};
