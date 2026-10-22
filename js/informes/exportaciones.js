/* ============================================================================
   Cuaderno del profesor · Informes y exportaciones (CSV)
   js/informes/exportaciones.js
   ============================================================================ */

/* =================================================================
   Informes y Exportaciones
   ================================================================= */
window.exportarCSVGrupo = () => {
   const grupo = grupoActual();
   const idx = catIndex(grupo.catalogoKey);
   const trim = state.ui.trim;
   const ccKeys = Object.keys(COMP_CLAVE).filter(cc => idx.cat.ces.some(ce => ce.cc.includes(cc)));
   
   const q = s => '"'+String(s??"").replace(/"/g,'""')+'"';
   let csv = `Alumno;Nota ${TRIMESTRES[trim]} (media);Nota ${TRIMESTRES[trim]} (acta);Calificacion ${TRIMESTRES[trim]};Nota final (media);Nota final (acta);Calificacion final`;
   ccKeys.forEach(k => csv += `;${k}`);
   csv += "\n";

   grupo.alumnos.forEach(a => {
      const t = notaTrimestre(grupo, a.id, trim);
      const f = notaFinal(grupo, a.id);
      const etqT = etiquetaNota(t, grupo);
      const etqF = etiquetaNota(f, grupo);
      csv += `${q(a.nombre)};${t==null?'':t.toFixed(2).replace('.',',')};${t==null?'':notaActa(t,grupo)};${etqT?etqT.etq:''};${f==null?'':f.toFixed(2).replace('.',',')};${f==null?'':notaActa(f,grupo)};${etqF?etqF.etq:''}`;
      ccKeys.forEach(k => {
         const val = scoreCC(grupo, a.id, k);
         const nv = nivel(grupo, val);
         csv += `;${nv?nv.etq:'-'}`;
      });
      csv += "\n";
   });

   const blob = new Blob(["\ufeff" + csv], {type: "text/csv;charset=utf-8;"});
   const u = URL.createObjectURL(blob); 
   const a = document.createElement("a");
   a.href = u; 
   a.download = `notas-${grupo.nombre.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-trim${trim+1}.csv`; 
   a.click(); 
   URL.revokeObjectURL(u);
};

