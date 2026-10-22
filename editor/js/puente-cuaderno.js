/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · puente con el Cuaderno
   editor/js/puente-cuaderno.js
   (guardado en memoria, fuentes, PDF por la vista previa del Cuaderno, criterios y estructura)
   ============================================================================ */
(function(){
  var MEM={}, KEYS=/^ee\.(exam\.|index$|last$|fallback\.)/;
  var s0=LS.set, g0=LS.get;
  LS.set=function(k,v){ return KEYS.test(k)? true : s0.call(LS,k,v); };
  LS.get=function(k,d){ return KEYS.test(k)? d : g0.call(LS,k,d); };
  loadExamLocal=function(id){ return MEM[id]? sanitizeExam(JSON.parse(MEM[id])) : null; };
  saveExamLocal=function(exam){ exam.updated=Date.now(); MEM[exam.id]=JSON.stringify(exam); try{ asegurarFuentesWeb(exam); }catch(e){} if(window.__eeActivo&&window.__eeOnSave) window.__eeOnSave(exam); return true; };

  /* --- v2: fuentes. Lora e Inter van incrustadas (sin conexión). El resto
     solo se descarga si el examen la usa y hay conexión; nunca bloquea la carga. --- */
  var WEBF={"garamond":"https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap","merriweather":"https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&display=swap","baskerville":"https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap","sourceserif":"https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400;1,700&display=swap","opensans":"https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap","roboto":"https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap","lato":"https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&display=swap","montserrat":"https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&display=swap","atkinson":"https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap","lexend":"https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap","courierprime":"https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap","patrick":"https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap"}, webPuestas={};
  FONTS.forEach(function(f){ if(f.g==='web'&&f.id!=='lora'&&f.id!=='inter'&&f.label.indexOf('conexión')<0) f.label+=' · requiere conexión'; });
  function fuentesUsadas(ex){ var out={}, m, re=/"font":"([a-z0-9]+)"/g, j=JSON.stringify(ex||{}); while((m=re.exec(j))) if(WEBF[m[1]]) out[m[1]]=WEBF[m[1]]; return out; }
  function asegurarFuentesWeb(ex){
    if(navigator.onLine===false) return;
    var u=fuentesUsadas(ex); Object.keys(u).forEach(function(id){ if(webPuestas[id]) return; webPuestas[id]=1;
      var l=document.createElement('link'); l.rel='stylesheet'; l.href=u[id]; document.head.appendChild(l); });
  }
  window.__eeFuentesWeb=function(){ var u=fuentesUsadas(S.exam); return Object.keys(u).map(function(k){return u[k];}); };
  /* --- v2: el autoguardado no lee todas las versiones en cada cambio (como mucho cada 2 min) --- */
  var crs0=createRecoverySnapshot, ultimaVer={};
  createRecoverySnapshot=function(exam,reason,force){
    if(!force&&exam&&ultimaVer[exam.id]&&Date.now()-ultimaVer[exam.id]<120000) return Promise.resolve(false);
    if(exam) ultimaVer[exam.id]=Date.now();
    return crs0.apply(this,arguments);
  };
  /* --- v3: el CSS y las fuentes del editor son archivos propios. Para el PDF del Cuaderno se
     reúne su texto (las hojas enlazadas + los <style> internos) y las fuentes con rutas absolutas. --- */
  function textoDe(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); }); }
  async function cssDelEditor(){
    var partes=[], enlaces=[].slice.call(document.querySelectorAll('link[rel="stylesheet"][data-css-editor]'));
    for(var i=0;i<enlaces.length;i++){ try{ partes.push(await textoDe(enlaces[i].href)); }catch(e){} }
    [].slice.call(document.querySelectorAll('style')).forEach(function(x){ partes.push(x.textContent); });
    return partes.join('\n');
  }
  async function fontCssAbsoluto(){
    var l=document.getElementById('embeddedFontFaces'); if(!l||!l.href) return '';
    try{ var css=await textoDe(l.href); return css.replace(/url\(([^)]+)\)/g,function(m,u){ u=u.replace(/^["']|["']$/g,''); return 'url('+new URL(u,l.href).href+')'; }); }catch(e){ return ''; }
  }
  /* --- v2: PDF. En iPad, imprimir desde un iframe imprime la página entera; se
     usa la vista previa de impresión del Cuaderno (la misma de las hojas de corrección). --- */
  var epd0=exportPdfDirect;
  exportPdfDirect=async function(){
    var P=null; try{ P=window.parent&&window.parent!==window&&window.parent.exImprimirDesdeEditor?window.parent:null; }catch(e){ P=null; }
    if(!P) return epd0.apply(this,arguments);
    if(!S.exam.body.length) return toast('Añade contenido al examen antes de exportar');
    clearTimeout(renderTimer); await renderPreview();
    var css=(await cssDelEditor()).replace(/:root\b/g,'.doc-root');
    var doc='<!doctype html><html><head><meta charset="utf-8"><style>'+css+'\n.doc-root{display:block!important;height:auto!important;min-height:0!important;overflow:visible!important;background:transparent!important;box-shadow:none!important;padding:0!important}#pages{transform:none!important;display:block!important}.sheet{margin:0 auto 14px!important}@media print{.sheet{margin:0!important}}</style></head><body><div id="pagesOuter" style="width:auto;height:auto"><div id="pages">'+$('#pages').innerHTML+'</div></div></body></html>';
    P.exImprimirDesdeEditor(doc,S.exam.name||'Examen',await fontCssAbsoluto(),window.__eeFuentesWeb());
  };
  var rs0=renderSide;
  renderSide=function(){ rs0.apply(this,arguments); try{ critPane(); }catch(e){} };
  function critPane(){
    var L=window.__eeCriterios; if(!L||!L.length||S.tab!=='block'||!S.sel) return;
    var f=findNode(S.exam.body,S.sel); if(!f||(f.node.type!=='question'&&f.node.type!=='subquestion')) return;
    var n=f.node, cur=n.crit||[];
    var box=h('div',{class:'sec'},h('h3',{},'Criterios de evaluación'),h('small',{class:'hint'},'Se vincularán a esta pregunta (y a sus subpreguntas) al importar a la rúbrica.'));
    L.forEach(function(c){
      var cb=h('input',{type:'checkbox'}); cb.checked=cur.indexOf(c.id)>=0;
      cb.onchange=function(){ var a=(n.crit||[]).filter(function(x){return x!==c.id;}); if(cb.checked) a.push(c.id); n.crit=a; change({}); };
      box.append(h('label',{style:{display:'flex',gap:'6px',alignItems:'flex-start',margin:'4px 0',fontSize:'12px'}},cb,h('span',{},c.id+' · '+c.texto)));
    });
    $('#inspector').append(box);
  }
  window.__eeActivo=false;
  window.__ee={
    cargar:function(ex){ var e=sanitizeExam(ex); MEM[e.id]=JSON.stringify(e); try{ asegurarFuentesWeb(e); }catch(_){} loadExam(e); window.__eeActivo=true; },
    flush:function(){ if(saveTimer){ clearTimeout(saveTimer); saveTimer=0; } if(S.exam&&window.__eeActivo) saveExamLocal(S.exam); },
    get:function(){ return S.exam? JSON.parse(JSON.stringify(S.exam)) : null; },
    mezclar:function(){
      var ex=JSON.parse(JSON.stringify(S.exam));
      function sh(a){ var idx=[],q=[]; a.forEach(function(n,i){ if(n.type==='question'){ idx.push(i); q.push(n); } });
        for(var i=q.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q[i]; q[i]=q[j]; q[j]=t; }
        idx.forEach(function(p,k){ a[p]=q[k]; });
        a.forEach(function(n){ if(n.children) sh(n.children); }); }
      sh(ex.body); loadExam(sanitizeExam(ex));
    },
    estructura:function(){
      var ex=S.exam, lab=computeLabels(ex);
      function conv(list,inh){ var out=[]; list.forEach(function(n){
        if(n.type!=='section'&&n.type!=='question'&&n.type!=='subquestion') return;
        var has=String(n.points==null?'':n.points).trim()!=='', p=num(n.points,NaN), c=(n.crit&&n.crit.length)?n.crit:(inh||[]);
        var t1=plainOf(n.title).replace(/\s+/g,' ').trim(), t2=plainOf(n.text).replace(/\s+/g,' ').trim(), txt=t1||t2, numb=lab.get(n.id)||'', full=(t1&&t2)?t1+' — '+t2:txt;
        out.push({id:n.id,tipo:n.type,label:(numb+' '+txt).trim().slice(0,120),
                  num:numb,rotulo:(numb+' '+(full.length>400?full.slice(0,399)+'…':full)).trim(),
                  max:(has&&isFinite(p))?p:null,hijos:conv(n.children||[],c),crit:c}); });
        return out; }
      var nodos=conv(ex.body), desc=[];
      function sumaHijos(n){ var t=0,hay=false; (n.hijos||[]).forEach(function(h){ if(h.max!=null){ t+=h.max; hay=true; } else { var r=sumaHijos(h); if(r.hay){ t+=r.t; hay=true; } } }); return {t:t,hay:hay}; }
      (function w(l){ l.forEach(function(n){ if(n.max!=null){ var r=sumaHijos(n); if(r.hay&&Math.abs(r.t-n.max)>0.001) desc.push({label:n.label,max:n.max,suma:Math.round(r.t*100)/100}); } w(n.hijos); }); })(nodos);
      return {nombre:ex.name,nodos:nodos,descuadres:desc};
    }
  };
})();
