/* ============================================================================
   Cuaderno del profesor · Mapa de criterios: alumnado × criterios de evaluación
   js/resultados/mapa-criterios.js
   ============================================================================ */

/* En Resultados, «▦ Mapa de criterios» cambia la tabla de notas por una tabla de color: una fila por alumno/a,
   una columna por cada criterio trabajado en la evaluación elegida, y en cada casilla su porcentaje de logro
   (scoreCriterio) con el color de su nivel (nivel(): Excelente, Adecuado, En proceso, Necesita mejorar, con
   los umbrales de Ajustes del grupo). Abajo, la media del grupo en cada criterio; a la derecha, cuántos
   criterios tiene cada alumno/a en «Necesita mejorar». Los mismos cálculos que el informe de cada alumno/a. */
function mapaCriteriosDatos(grupo){
  const idx=catIndex(grupo.catalogoKey);
  const usados=new Set();
  actsTrim(grupo).forEach(a=>{ if(!a.recupera) (a.criterios||[]).forEach(l=>usados.add(l.critId)); });
  // Columnas en el orden del currículo, agrupadas por competencia específica.
  const ces=idx.cat.ces.map(ce=>({ce,crits:ce.criterios.filter(c=>usados.has(c.id))})).filter(x=>x.crits.length);
  const crits=ces.flatMap(x=>x.crits);
  const filas=grupo.alumnos.map(al=>{
    const vals=crits.map(c=>scoreCriterio(grupo,al.id,c.id));
    return {al,vals,bajos:vals.filter(p=>p!=null&&nivel(grupo,p)===NIV.necesita).length};
  });
  const medias=crits.map((c,j)=>{ const v=filas.map(f=>f.vals[j]).filter(p=>p!=null); return v.length? v.reduce((s,x)=>s+x,0)/v.length : null; });
  return {ces,crits,filas,medias};
}
function mapaCeldaHTML(grupo,p,titulo){
  const nv=nivel(grupo,p);
  if(!nv) return `<td class="mc-c mc-vacia" title="${esc(titulo)}: sin nota">—</td>`;
  // El color va en una variable (--mc-fg): el tema oscuro aclara algunos «color:» escritos en el atributo style
  // y, sobre estos fondos claros, el número dejaría de leerse.
  return `<td class="mc-c" style="background:${nv.bg};--mc-fg:${nv.fg}" title="${esc(titulo)}: ${Math.round(p)} % · ${nv.etq}">${Math.round(p)}</td>`;
}
function mapaLeyendaHTML(grupo){
  const u=grupo.umbrales;
  return `<div class="mc-leyenda">${[[NIV.excelente,`${u.excelente} % o más`],[NIV.adecuado,`${u.adecuado}–${u.excelente-1} %`],[NIV.enProceso,`${u.enProceso}–${u.adecuado-1} %`],[NIV.necesita,`menos de ${u.enProceso} %`]]
    .map(([n,r])=>`<span><i style="background:${n.bg};border-color:${n.fg}"></i>${n.etq} <small>(${r})</small></span>`).join("")}</div>`;
}
/* La tabla (también para imprimir: conImpresion quita lo que solo sirve en pantalla). */
function mapaCriteriosTablaHTML(grupo,d,paraImprimir){
  const idx=catIndex(grupo.catalogoKey);
  const textoCrit=c=>(idx.critMap&&idx.critMap[c.id]&&idx.critMap[c.id].texto)||c.texto||"";
  return `<table class="mc-tabla">
    <thead>
      <tr><th class="mc-nombre" rowspan="2">Alumno/a</th>${d.ces.map(x=>`<th class="mc-ce" colspan="${x.crits.length}" title="${esc(x.ce.titulo||"")}">${esc(x.ce.id)}</th>`).join("")}<th class="mc-bajos" rowspan="2" title="Criterios en «Necesita mejorar»">En rojo</th></tr>
      <tr>${d.crits.map(c=>`<th class="mc-crit" title="${esc(c.id+" · "+textoCrit(c))}">${esc(c.id)}</th>`).join("")}</tr>
    </thead>
    <tbody>${d.filas.map(f=>`<tr>
      <th class="mc-nombre" scope="row">${paraImprimir?esc(f.al.nombre):`<button class="mc-al" onclick="mapaIrAlumno('${escJS(f.al.id)}')" title="Ver el informe de ${esc(f.al.nombre)}">${esc(f.al.nombre)}</button>`}</th>
      ${f.vals.map((p,j)=>mapaCeldaHTML(grupo,p,f.al.nombre+" · "+d.crits[j].id)).join("")}
      <td class="mc-bajos${f.bajos?" mc-hay-bajos":""}">${f.bajos||""}</td>
    </tr>`).join("")}</tbody>
    <tfoot><tr><th class="mc-nombre" scope="row">Media del grupo</th>${d.medias.map((p,j)=>mapaCeldaHTML(grupo,p,"Media del grupo · "+d.crits[j].id)).join("")}<td class="mc-bajos"></td></tr></tfoot>
  </table>`;
}
function mapaCriteriosHTML(grupo){
  const d=mapaCriteriosDatos(grupo);
  const cab=`<div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
      <div><h2 style="font-size:15px">▦ Mapa de criterios · ${TRIMESTRES[state.ui.trim]}</h2>
      <p class="sub" style="margin:2px 0 0">Porcentaje de logro de cada alumno/a en cada criterio trabajado en esta evaluación, con el color de su nivel. Pasa el dedo o el ratón por una casilla para ver el criterio; toca un nombre para abrir su informe.</p></div>
      <div class="flex">
        ${d.crits.length?`<button class="ghost" style="border:1px solid var(--line)" onclick="mapaImprimir()">🖨️ Imprimir</button>`:""}
        <button class="ghost" style="border:1px solid var(--line)" onclick="mapaVista(false)">← Volver a las notas</button>
      </div>
    </div>`;
  if(!d.crits.length) return `<div class="card">${cab}<p class="sub" style="margin:12px 0 0">Todavía no hay actividades con criterios en esta evaluación.</p></div>`;
  return `<div class="card">${cab}${mapaLeyendaHTML(grupo)}<div class="mc-scroll">${mapaCriteriosTablaHTML(grupo,d,false)}</div></div>`;
}
window.mapaVista=on=>{ state.ui.resVista=on?"mapa":""; if(on) state.ui.resAl=""; save(); render(); };
window.mapaIrAlumno=alId=>{ state.ui.resVista=""; state.ui.resAl=alId; save(); render(); };
window.mapaImprimir=()=>{
  const grupo=grupoActual(); if(!grupo) return;
  const d=mapaCriteriosDatos(grupo), cat=getCatalogo(grupo.catalogoKey);
  const css=`<style>
    .mc-tabla{border-collapse:collapse;width:auto;font-size:11px}
    .mc-tabla th,.mc-tabla td{border:1px solid #ccc;padding:3px 5px;text-align:center}
    .mc-tabla .mc-nombre{text-align:left;white-space:nowrap;font-weight:600;color:#222}
    .mc-tabla .mc-ce{background:#f1f3f6;color:#333}
    .mc-tabla .mc-crit{color:#333;font-weight:600}
    .mc-tabla .mc-c{color:var(--mc-fg);font-weight:700}
    .mc-tabla .mc-vacia{color:#aaa}
    .mc-tabla .mc-hay-bajos{color:#912525;font-weight:700}
    .mc-tabla tfoot th,.mc-tabla tfoot td{border-top:2px solid #888}
    .mc-leyenda{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;margin:4px 0 10px}
    .mc-leyenda i{display:inline-block;width:12px;height:12px;border:1px solid;border-radius:3px;vertical-align:-2px;margin-right:4px}
  </style>`;
  abrirVentanaInforme(`Mapa de criterios · ${grupo.nombre}`,
    `${css}<h1>Mapa de criterios · ${esc(grupo.nombre)}</h1>
    <div class="meta">${esc(cat.materia)} · ${esc(cat.curso)} · ${TRIMESTRES[state.ui.trim]} · porcentaje de logro de cada criterio</div>
    ${mapaLeyendaHTML(grupo)}${mapaCriteriosTablaHTML(grupo,d,true)}`,{landscape:true,maxWidth:"100%"});
};
