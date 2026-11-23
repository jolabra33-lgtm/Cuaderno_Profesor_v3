/* Auditoría de tablas: ¿el título de cada columna está alineado como sus casillas?
   (p. ej. «Nota» a la izquierda y las notas centradas debajo; ver tests/README.md)

   No mira el CSS sino dónde queda de verdad el texto dentro de cada casilla: a la izquierda,
   centrado o a la derecha (así cuenta también el texto metido en un <div> o un <span> centrado).
   Las casillas que el texto llena casi entera no cuentan (ahí no se nota la alineación), ni las
   vacías, ni las que ocupan varias columnas. Una columna se compara solo si todas sus casillas
   con texto van igual.

   instalarAuditoriaTablas(pagina) deja en la página window.__auditarTablas(documento, donde, salida),
   que añade a «salida» (un objeto) una línea por cada columna desalineada. */

export function instalarAuditoriaTablas(p) {
  return p.evaluate(() => {
    window.__auditarTablas = function (doc, donde, salida) {
      const win = doc.defaultView; if (!win || !doc.body) return;
      const posicion = cel => {
        const r = cel.getBoundingClientRect(); if (r.width < 8 || r.height < 4) return null;
        if (!(cel.textContent || '').trim() || cel.querySelector('input, select, textarea, button, ul, ol')) return null;   // con listas, la sangría engaña
        const cs = win.getComputedStyle(cel);
        const izq = r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), der = r.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
        const rg = doc.createRange(); rg.selectNodeContents(cel);
        const rs = [...rg.getClientRects()].filter(x => x.width > 0 && x.height > 0); if (!rs.length) return null;
        const tIzq = Math.min(...rs.map(x => x.left)), tDer = Math.max(...rs.map(x => x.right));
        const hueco1 = tIzq - izq, hueco2 = der - tDer;
        if (hueco1 + hueco2 < 12) return null;   // el texto llena la casilla: no se nota
        if (Math.abs(hueco1 - hueco2) <= Math.max(4, (hueco1 + hueco2) * 0.15)) return 'centrado';
        return hueco1 < hueco2 ? 'a la izquierda' : 'a la derecha';
      };
      doc.querySelectorAll('table').forEach(tb => {
        if (!tb.getBoundingClientRect().width) return;
        // Rejilla de la tabla (con rowspan y colspan): qué casilla ocupa cada fila y columna.
        const filas = [...tb.rows], rejilla = filas.map(() => []);
        filas.forEach((fila, i) => {
          let c = 0;
          for (const cel of fila.cells) {
            while (rejilla[i][c]) c++;
            for (let a = 0; a < cel.rowSpan && i + a < filas.length; a++) for (let b = 0; b < cel.colSpan; b++) rejilla[i + a][c + b] = { cel, origen: a === 0 };
            c += cel.colSpan;
          }
        });
        const cab = tb.tHead && tb.tHead.rows.length ? filas.indexOf(tb.tHead.rows[tb.tHead.rows.length - 1])
          : (filas[0] && [...filas[0].cells].every(c => c.tagName === 'TH') ? 0 : -1);
        if (cab < 0) return;
        const cuerpo = filas.map((f, i) => i).filter(i => i > cab && (!tb.tHead || filas[i].parentElement !== tb.tHead)).slice(0, 15);
        const n = Math.max(...rejilla.map(f => f.length));
        for (let j = 0; j < n; j++) {
          const h = rejilla[cab][j]; if (!h || h.cel.colSpan !== 1) continue;
          const ph = posicion(h.cel); if (!ph) continue;
          const pc = cuerpo.map(i => rejilla[i][j]).filter(x => x && x.origen && x.cel.colSpan === 1).map(x => posicion(x.cel)).filter(Boolean);
          if (!pc.length || pc.some(x => x !== pc[0]) || pc[0] === ph) continue;
          const nombre = (tb.caption && tb.caption.textContent.trim()) || [...filas[cab].cells].map(c => c.textContent.trim()).filter(Boolean).slice(0, 3).join(' | ');
          salida[`${donde} · tabla «${nombre.slice(0, 60)}» · columna «${h.cel.textContent.trim().slice(0, 30)}»: el título va ${ph} y las casillas ${pc[0]}`] = 1;
        }
      });
    };
  });
}
