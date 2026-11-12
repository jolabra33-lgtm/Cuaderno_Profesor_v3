/* Pruebas de navegador de la app (Cuaderno + Tutoría). Cada prueba recibe:
     t.url       dirección del servidor de pruebas (la app tal cual, como en GitHub Pages)
     t.contexto  navegador limpio (sin datos), solo para esa prueba
     t.ok(condición, descripción, detalle)   apunta una comprobación
   Se ejecutan con «npm test» (ver tests/README.md). */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { servir, nuevaPagina, esperar, cuadernoConGrupo, tutoriaConAlumnos, llenarLocalStorage, vaciarRelleno } from './utilidades.mjs';
import { rastrearTutoria } from './texto-hostil.mjs';
import { calcularHuella, selloActual, listaCache } from '../version/huella.mjs';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

export const PRUEBAS = [

  { nombre: 'calculo-notas', descripcion: 'Las pruebas del cálculo de notas (tests/calculo-notas.html) pasan', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await p.goto(t.url + '/tests/calculo-notas.html'); await esperar(3000);
    const r = await p.evaluate(() => window.__resultadoPruebas);
    t.ok(r && r.total >= 30, `se han ejecutado ${r && r.total} casos`);
    t.ok(r && !r.fallos.length && !r.error, 'ningún caso falla', r && (r.fallos.join('; ') || r.error));
  } },

  { nombre: 'version-cache', descripcion: 'sw.js: la versión de la caché está sellada y la lista de archivos sin conexión está completa', async fn(t) {
    const sello = selloActual(RAIZ), huella = calcularHuella(RAIZ);
    t.ok(sello.huella === huella, 'la versión está sellada: ningún archivo ha cambiado sin subir CACHE_NAME',
      `Han cambiado archivos desde que se selló la versión ${sello.version}. Ejecuta «npm run sellar» y sube también sw.js.`);
    const lista = new Set(listaCache(RAIZ));
    const faltan = [...lista].filter(f => !fs.existsSync(path.join(RAIZ, f)));
    t.ok(!faltan.length, 'todos los archivos de la lista existen', faltan.join(', '));
    // Todo lo que cargan las páginas (scripts, estilos, iconos, fuentes) tiene que estar en la lista.
    const sinLista = [];
    for (const pag of ['index.html', 'tutoria/index.html', 'editor/index.html', 'tools/planificacion.html']) {
      const html = fs.readFileSync(path.join(RAIZ, pag), 'utf8'), dir = path.dirname(pag);
      for (const m of html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"#?]+)"/g)) {
        if (/^(https?:|data:|#|mailto:)/.test(m[1])) continue;
        const f = path.normalize(path.join(dir, m[1])).replace(/\\/g, '/');
        if (!lista.has(f) && fs.existsSync(path.join(RAIZ, f)) && fs.statSync(path.join(RAIZ, f)).isFile()) sinLista.push(`${pag} → ${f}`);
      }
    }
    for (const css of ['editor/css/fuentes.css', 'tools/fonts/fuentes.css'])
      for (const m of fs.readFileSync(path.join(RAIZ, css), 'utf8').matchAll(/url\(([^)]+)\)/g)) {
        const f = path.normalize(path.join(path.dirname(css), m[1].replace(/["']/g, ''))).replace(/\\/g, '/'); if (!lista.has(f)) sinLista.push(`${css} → ${f}`);
      }
    t.ok(!sinLista.length, 'todo lo que cargan las páginas está en la lista de sw.js (funciona sin conexión)', sinLista.join('; '));
  } },

  { nombre: 'carga', descripcion: 'Todas las páginas cargan sin errores ni archivos que falten', async fn(t) {
    for (const ruta of ['/', '/tutoria/', '/editor/', '/tools/planificacion.html', '/guia_mejorada.html']) {
      const p = await nuevaPagina(t.contexto); const fallos = [];
      p.on('response', r => { if (r.status() >= 400) fallos.push(r.status() + ' ' + r.url()); });
      await p.goto(t.url + ruta); await esperar(1500);
      t.ok(!p.errores.length && !fallos.length, `${ruta} carga limpia`, [...p.errores, ...fallos].join('; '));
      await p.close();
    }
  } },

  { nombre: 'tutoria-guardado', descripcion: 'Tutoría: alta de alumnado, guardado y recarga', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis']);
    t.ok(await p.evaluate(() => /2 alumnos registrados/.test(document.body.innerText)), 'el contador dice «2 alumnos registrados»');
    t.ok(await p.evaluate(() => document.querySelector('table[id^="tbl-"] thead th:not(.cb-col)').textContent.includes('Alumno')), '«Alumno / a» es la primera columna');
    await p.reload(); await esperar(1500);
    t.ok((await p.evaluate(() => data['1º ESO'].A.map(a => a.nombre))).length === 2, 'tras recargar sigue el alumnado');
    for (const pest of ['Calendario', 'Informe Académico', 'Seguimientos', 'Informe Convivencia', 'Inicio']) {
      await p.locator(`.nivel-tab:has-text("${pest}")`).first().click(); await esperar(300);
    }
    t.ok(!p.errores.length, 'las pestañas generales se abren sin errores', p.errores.join('; '));
  } },

  { nombre: 'tutoria-manifiesto', descripcion: 'Tutoría solo declara su manifiesto fuera de la app instalada del Cuaderno', async fn(t) {
    // Dentro de la ventana de la app del Cuaderno, un manifiesto distinto hacía que Chrome
    // mostrara sin fin «Actualización de aplicación disponible».
    const contar = async (enApp) => {
      const ctx = await t.navegador.newContext();
      if (enApp) await ctx.addInitScript(() => { const o = window.matchMedia.bind(window); window.matchMedia = q => /display-mode: standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : o(q); });
      const p = await nuevaPagina(ctx); await p.goto(t.url + '/tutoria/'); await esperar(800);
      const n = await p.evaluate(() => document.querySelectorAll('link[rel="manifest"]').length); await ctx.close(); return n;
    };
    t.ok(await contar(false) === 1, 'en una pestaña normal se puede instalar (tiene manifiesto)');
    t.ok(await contar(true) === 0, 'dentro de la app del Cuaderno no declara manifiesto propio');
  } },

  { nombre: 'tutoria-apostrofo', descripcion: 'Tutoría: grupos y niveles con apóstrofo («PMAR d\'Alt», «FPB l\'Horta»)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', "PMAR d'Alt", ["D'Amico Ruiz, Pau"]);
    const visible = s => p.locator(s + ':visible').first();
    for (const [desc, accion] of [
      ['pestaña II Evaluación', () => p.locator('text=II Evaluación').first().click()],
      ['Columnas', () => visible('.col-manager-btn').click()],
      ['Del Cuaderno', () => visible('button:has-text("Del Cuaderno")').click()],
      ['⋯ Más → Equipo docente', async () => { await visible('details.mas-menu > summary').click(); await visible('.mas-menu-lista > button:has-text("Equipo docente")').click(); }],
    ]) {
      await p.evaluate(() => { selectNivel('1º ESO'); currentGrupos['1º ESO'] = "PMAR d'Alt"; renderMain(); }); await esperar(300);
      const antes = p.errores.length;
      try { await accion(); await esperar(400); t.ok(p.errores.length === antes, `botón «${desc}»`, p.errores.slice(antes).join('; ')); }
      catch (e) { t.ok(false, `botón «${desc}»`, e.message.split('\n')[0]); }
      await p.reload(); await esperar(1300);
    }
    await p.evaluate(() => { openAddNivelModal(); document.getElementById('addNivelNombre').value = "FPB l'Horta"; confirmAddNivel(); });
    await esperar(400);
    await p.locator('.nivel-tab', { hasText: "FPB l'Horta" }).first().click(); await esperar(400);
    t.ok(await p.evaluate(() => currentNivel === "FPB l'Horta"), 'la pestaña del nivel con apóstrofo funciona');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-texto-hostil', descripcion: 'Tutoría: un nombre, grupo, materia u observación con HTML o comillas no se cuela como código', async fn(t) {
    const completo = process.env.RASTREO === 'completo';
    for (const modo of ['hostil', 'doble']) {
      // Cada modo en un navegador limpio: el primero deja datos y su ventana como «activa».
      const ctx = await t.navegador.newContext({ viewport: { width: 1366, height: 900 } });
      const p = await nuevaPagina(ctx); p.setDefaultTimeout(0);
      await p.goto(t.url + '/tutoria/'); await esperar(1500);
      const r = await rastrearTutoria(p, { modo, completo });
      t.ok(r.clics > (completo ? 1500 : 250) && !r.fallos.length, `[${modo}] el rastreo recorre las pantallas (${r.clics} pulsaciones)`, r.fallos.join('; '));
      if (modo === 'hostil') {
        t.ok(!r.inyectados.length, 'ningún texto se convierte en un elemento de la página o de un documento', r.inyectados.slice(0, 6).join('\n        '));
        t.ok(!r.ejecutados.length, 'ningún texto se ejecuta como código', r.ejecutados.slice(0, 6).join('\n        '));
      } else t.ok(!r.dobles.length, 'ningún texto se escapa dos veces (no se ve «&amp;» ni «&#39;»)', r.dobles.slice(0, 6).join('\n        '));
      t.ok(!p.errores.length, `[${modo}] sin errores de JavaScript`, p.errores.slice(0, 3).join('; '));
      await ctx.close();
    }
  } },

  { nombre: 'cuaderno-texto-hostil', descripcion: 'Cuaderno: los textos con HTML o comillas no se cuelan como código y los archivos con identificadores manipulados no se cargan', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async () => {
      const P = tag => `Zq"'><img src=x onerror=top.__x(/${tag}/)>');top.__x(/${tag}_js/);('&#39;);top.__x(/${tag}_ent/);(&#39;`;
      const hits = {}; let donde = ''; window.__x = re => { hits[re.source + ' @ ' + donde] = 1; };
      const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.nombre = '1º A ' + P('grupo');
      g.alumnos.forEach((a, i) => { a.apellidos = 'Pérez ' + P('apellidos'); a.nombreP = 'Ana' + i + P('nombreP'); a.nombre = a.apellidos + ', ' + a.nombreP; a.observaciones = P('obs'); a.comentariosEval = [P('coment'), '', ''];
        a.nese = true; a.neseNivel = P('neseNivel'); a.familia = [{ parentesco: P('parentesco'), nombre: P('famNombre'), email: P('email') }, { parentesco: '', nombre: '', email: '' }]; });
      g.actividades = [{ id: 'e1', nombre: 'Examen ' + P('actividad'), tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, sda: P('sda'), criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 7 } };
      g.bloques.forEach(b => { b.label += P('bloque'); });
      const hoy = agHoyStr();
      g.diario[hoy] = { nota: P('diario'), incidencias: P('incidencias'), unidadId: '' };
      g.asistencia[hoy] = { [g.alumnos[0].id]: { estado: 'retraso', nota: P('asistNota') } };
      g.convivencia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: hoy, tipo: 'AC', descripcion: P('conv'), medidas: P('medidas') });
      g.contactosFamilia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: hoy, medio: 'otro', asunto: P('asunto'), notas: P('famNotas') });
      state.eventos.push({ id: uid(), fecha: hoy, titulo: P('evento'), tipo: 'examen', grupoIds: [g.id], nota: P('eventoNota') });
      state.reuniones.push({ id: uid(), fecha: hoy, tipo: 'familia', titulo: P('reunion'), asistentes: P('asistentes'), temas: P('temas'), acuerdos: P('acuerdos'), grupoId: g.id, alumnoId: g.alumnos[0].id });
      state.centroNombre = P('centro'); state.profesorNombreGlobal = P('profesor');
      state.programaciones = [{ id: 'p1', nombre: P('prog'), catalogoKey: 'GeH_1ESO', sdas: [{ id: 's1', titulo: P('sdaTitulo'), trimestre: 0, sesionesPrevistas: 6 }], actividades: [] }];
      migrarEstado(); state.ui.grupoId = g.id; save();
      const inyectados = () => [...document.querySelectorAll('img[onerror*="__x"]')].map(im => (im.getAttribute('onerror').match(/__x\(\/(\w+)\//) || [])[1] + ' @ ' + donde);
      const malos = new Set(); const mira = async d => { donde = d; _mostrarBienvenida = false; render(); await new Promise(r => setTimeout(r, 120)); inyectados().forEach(x => malos.add(x)); };
      for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) { state.ui.appMode = 'competencial'; state.ui.grupoId = g.id; state.ui.tab = tab; await mira('pestaña ' + tab); }
      state.ui.resAl = g.alumnos[0].id; state.ui.tab = 'resultados'; await mira('informe del alumno');
      for (const m of ['inicio', 'corrector', 'programacion', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) { state.ui.appMode = m; await mira('modo ' + m); }
      state.ui.appMode = 'programacion'; state.ui.progTab = 'detalle'; state.ui.progId = 'p1'; await mira('programación abierta');
      buscarAbrir(); const inp = document.querySelector('.modal-overlay input'); if (inp) { inp.value = 'Zq'; inp.dispatchEvent(new Event('input', { bubbles: true })); } await mira('buscador');
      return { malos: [...malos], hits: Object.keys(hits) };
    });
    t.ok(!r.malos.length, 'ningún texto se convierte en un elemento de la página (20 pantallas y el buscador)', r.malos.slice(0, 6).join('; '));
    t.ok(!r.hits.length, 'ningún texto se ejecuta como código', r.hits.slice(0, 6).join('; '));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
    // Una copia con un identificador manipulado no se carga y lo que había sigue igual.
    const q = await nuevaPagina(t.contexto); await cuadernoConGrupo(q, t.url, { nombres: ['Propio, Dato'] });
    const imp = await q.evaluate(async () => {
      const mala = JSON.parse(JSON.stringify(state)); mala.grupos[0].nombre = 'Ajeno'; mala.grupos[0].alumnos[0].id = "x');window.__colado=1;('";
      window.__dialogosAuto = { confirmar: true };
      _procesarArchivoCopiaJSON(new File([JSON.stringify(mala)], 'copia-mala.json', { type: 'application/json' }));
      await new Promise(r => setTimeout(r, 600));
      const buena = JSON.parse(JSON.stringify(state)); buena.grupos[0].nombre = 'Importado bien';
      const antes = state.grupos[0].nombre, avisos = (window.__dialogosLog || []).join(' | ');
      _procesarArchivoCopiaJSON(new File([JSON.stringify(buena)], 'copia-buena.json', { type: 'application/json' }));
      await new Promise(r => setTimeout(r, 900));
      return { antes, avisos, despues: state.grupos[0].nombre, colado: !!window.__colado };
    });
    t.ok(imp.antes === '1º ESO A' && /identificadores/.test(imp.avisos) && !imp.colado, 'la copia con un identificador manipulado se rechaza con un aviso', JSON.stringify(imp));
    t.ok(imp.despues === 'Importado bien', 'una copia normal se sigue cargando', JSON.stringify(imp));
  } },

  { nombre: 'tutoria-actas-guardadas', descripcion: 'Tutoría: un acta guardada conserva su formato y no puede traer código dentro', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Prueba, Ana']);
    const r = await p.evaluate(() => {
      window.__colado = 0;
      const malo = '<p><strong>Acuerdo</strong> en <em>negrita</em></p><table><tr><td>Celda</td></tr></table>' +
        '<img src="x" onerror="window.__colado++"><script>window.__colado++<\/script><a href="javascript:window.__colado++">enlace</a>' +
        '<iframe srcdoc="<script>parent.__colado++<\/script>"></iframe><div onclick="window.__colado++" style="color:red">texto</div>';
      const limpio = _tHtmlSeguro(malo);
      const d = document.createElement('div'); d.innerHTML = limpio; document.body.appendChild(d);
      d.querySelectorAll('a,div').forEach(x => { try { x.click(); } catch (e) {} });
      return { limpio, formato: /<strong>Acuerdo<\/strong>/.test(limpio) && /<em>negrita<\/em>/.test(limpio) && /<table>/.test(limpio) && /style="color:red"/.test(limpio),
        peligroso: /onerror|onclick|<script|javascript:|<iframe/i.test(limpio) };
    });
    await esperar(300);
    const colado = await p.evaluate(() => window.__colado);
    t.ok(r.formato, 'se conservan negritas, cursivas, tablas y estilos', r.limpio);
    t.ok(!r.peligroso && colado === 0, 'se quitan scripts, eventos, enlaces javascript: y marcos', r.limpio + ' · ejecutado ' + colado);
    // De punta a punta: un acta guardada con código dentro se abre sin ejecutarlo.
    const ok = await p.evaluate(async () => {
      window.__colado = 0; window._actasData = window._actasData || {};
      window._actasData[_actaKey('1º ESO', 'A', 1)] = { html: '<p>Mi acta</p><img src="x" onerror="window.__colado++">', savedAt: new Date().toISOString() };
      openInforme('1º ESO', 'A', 1);
      await new Promise(r => setTimeout(r, 600));
      return { texto: (document.getElementById('informeContent') || {}).innerHTML || '', colado: window.__colado };
    });
    t.ok(/Mi acta/.test(ok.texto) && ok.colado === 0, 'un acta guardada con código dentro se abre sin ejecutarlo', JSON.stringify(ok).slice(0, 200));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'del-cuaderno', descripcion: 'Tutoría: «📥 Del Cuaderno» copia la lista sin duplicar y se puede deshacer', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis'] });
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['garcia lopez, ana']);
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(1200);
    const lista = await p.evaluate(() => data['1º ESO'].A.map(a => [a.nombre, (a.idsCuaderno || []).length]));
    t.ok(lista.length === 2, 'no duplica a quien ya estaba (por nombre, sin tildes ni mayúsculas)', JSON.stringify(lista));
    t.ok(lista.every(([, n]) => n === 1), 'todos quedan vinculados con su identificador del Cuaderno', JSON.stringify(lista));
    await p.evaluate(() => _undoPop()); await esperar(300);
    t.ok(await p.evaluate(() => data['1º ESO'].A.length) === 1, 'Ctrl+Z deshace la importación');
  } },

  { nombre: 'suspensos', descripcion: 'Tutoría: importar suspensos por identificador y por nombre parecido', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis'] });
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García-López Benet, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria María']);
    // Ana ya está vinculada por identificador aunque su nombre sea otro
    await p.evaluate(id => { data['1º ESO'].A[0].idsCuaderno = [id]; }, ids[0]);
    const archivo = { formato: 'cuaderno-a-tutoria', version: 1, materia: 'Geografía e Historia', curso: '1.º ESO', grupo: '1º ESO A', generado: new Date().toISOString(),
      alumnos: [{ id: ids[0], nombre: 'García López, Ana', notas: { 1: 3 } }, { id: ids[1], nombre: 'Pérez Ruiz, Luis', notas: { 1: 8 } }, { nombre: 'Sanz Marti, Iria', notas: { 1: 2 } }] };
    await p.evaluate(o => _tImpCuadernoModal(o, 'para-tutoria.json'), archivo); await esperar(500);
    const resumen = await p.locator('#impCResumen').innerText();
    t.ok(/Sanz Marti, Iria.*Sanz Martí, Íria María/s.test(resumen), 'propone «Sanz Martí, Íria María» para «Sanz Marti, Iria»', resumen);
    t.ok(await p.evaluate(() => document.querySelector('#impCResumen input[data-prop]').checked), 'la propuesta muy parecida viene marcada');
    await p.click('#impCOk'); await esperar(600);
    const pend = await p.evaluate(() => data['1º ESO'].A.map(a => a.pendientes1.length));
    t.ok(JSON.stringify(pend) === '[1,0,1]', 'suspensos: Ana (por identificador) y Íria (por parecido); Luis aprueba', JSON.stringify(pend));
  } },

  { nombre: 'dos-ventanas', descripcion: 'Una sola ventana guarda a la vez; relevo con «Usar esta ventana»', async fn(t) {
    const A = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(A, t.url, { nombres: ['Base, Uno'] });
    const B = await nuevaPagina(t.contexto); await B.goto(t.url + '/'); await esperar(1500);
    t.ok(await B.evaluate(() => UnaVentana.estado) === 'bloqueada', 'la segunda ventana queda bloqueada');
    const anadir = (p, n) => p.evaluate(n => { state.grupos[0].alumnos.push(normalizarAlumno({ id: uid(), nombre: n })); save(); }, n);
    await anadir(A, 'Ventana A, Ana'); await esperar(300); await anadir(B, 'Ventana B, Luis'); await esperar(800);
    const guardado = () => A.evaluate(() => JSON.parse(localStorage.getItem('geohist_multigrupo_v1')).grupos[0].alumnos.map(a => a.nombre));
    t.ok(JSON.stringify(await guardado()) === '["Base, Uno","Ventana A, Ana"]', 'la ventana bloqueada no pisa lo de la activa', JSON.stringify(await guardado()));
    await B.click('#unaVentanaUsar'); await esperar(3000);
    t.ok(await B.evaluate(() => UnaVentana.estado) === 'activa' && await A.evaluate(() => UnaVentana.estado) === 'bloqueada', 'el relevo cambia la ventana activa');
    t.ok((await B.evaluate(() => state.grupos[0].alumnos.length)) === 2, 'la nueva activa tiene los datos al día');
  } },

  { nombre: 'almacen-lleno', descripcion: 'Cuaderno: con localStorage lleno por otra app, se guarda y se abre desde IndexedDB sin avisos ni pérdidas', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await esperar(1000);
    await llenarLocalStorage(p);
    const anadir = n => p.evaluate(n => { state.grupos[0].alumnos.push(normalizarAlumno({ id: uid(), nombre: n })); save(); }, n);
    await anadir('Nuevo, Uno'); await esperar(900);
    let e = await p.evaluate(() => ({ ls: localStorage.getItem(KEY) !== null, marca: localStorage.getItem(KEY_EN_IDB) !== null, aviso: !!document.getElementById('saveWarnBar'), idbOk: saveState.idbOk, lsOk: saveState.ok }));
    t.ok(!e.lsOk && e.idbOk && !e.aviso, 'se guarda en IndexedDB y no aparece ningún aviso de guardado', JSON.stringify(e));
    t.ok(!e.ls && e.marca, 'la copia antigua de localStorage se retira (no queda una versión vieja)', JSON.stringify(e));
    await p.reload(); await esperar(2500);
    e = await p.evaluate(async () => ({ alumnos: state.grupos[0]?.alumnos.length, toast: (document.getElementById('toastGlobal') || {}).innerText || '', aviso: !!document.getElementById('saveWarnBar'), copias: (await idbAll('copias')).map(c => c.motivo) }));
    t.ok(e.alumnos === 4, 'al reabrir están todos los datos, también el último cambio', JSON.stringify(e));
    t.ok(!/recuperado/i.test(e.toast) && !e.aviso && !e.copias.some(m => /recuperar/i.test(m)), 'es un arranque normal: sin mensajes de recuperación ni copias de emergencia', JSON.stringify(e));
    await anadir('Nuevo, Dos'); await esperar(900); await p.reload(); await esperar(2500);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length) === 5, 'se sigue guardando y abriendo así las veces que haga falta');
    // En cuanto vuelve a haber sitio, localStorage recupera su copia rápida.
    await vaciarRelleno(p); await anadir('Nuevo, Tres'); await esperar(900);
    e = await p.evaluate(() => ({ ls: localStorage.getItem(KEY) !== null, marca: localStorage.getItem(KEY_EN_IDB) !== null }));
    t.ok(e.ls && !e.marca, 'al liberarse espacio vuelve la copia rápida de localStorage', JSON.stringify(e));
    await p.reload(); await esperar(2000);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length) === 6 && !p.errores.length, 'y los datos siguen completos', p.errores.join('; '));
    // Caso límite: en localStorage queda una copia ANTERIOR (el último guardado no cupo) y además está lleno.
    const viejo = await p.evaluate(() => localStorage.getItem(KEY));
    await anadir('Nuevo, Cuatro'); await esperar(1200);
    await p.evaluate(v => Storage.prototype.setItem.call(localStorage, KEY, v), viejo); await llenarLocalStorage(p);
    await p.reload(); await esperar(3000);
    e = await p.evaluate(() => ({ alumnos: state.grupos[0]?.alumnos.length, ls: localStorage.getItem(KEY) !== null, marca: localStorage.getItem(KEY_EN_IDB) !== null }));
    t.ok(e.alumnos === 7 && !e.ls && e.marca, 'si localStorage se quedó con una copia anterior, manda la de IndexedDB (más reciente) y la vieja se retira', JSON.stringify(e));
    await p.reload(); await esperar(2500);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length === 7 && !/recuperado/i.test((document.getElementById('toastGlobal') || {}).innerText || '')) && !p.errores.length, 'y la siguiente apertura vuelve a ser normal', p.errores.join('; '));
  } },

  { nombre: 'tutoria-almacen', descripcion: 'Tutoría: fotos y actas van a IndexedDB, localStorage queda ligero y nada se pierde aunque esté lleno', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Prueba, Ana']);
    const FOTO = 300000;
    await p.evaluate(n => { window._fotoData['1º ESO-A'] = { src: 'data:image/png;base64,' + 'A'.repeat(n), name: 'foto' }; markDirty(); }, FOTO);
    await esperar(1500);
    const leerIdb = () => p.evaluate(async () => { const r = await _tutIdbLeer(); const st = r ? JSON.parse(r.json) : null; return st ? { foto: ((st.fotoData || {})['1º ESO-A'] || {}).src?.length || 0, alumnos: (st.data['1º ESO'].A || []).length } : null; });
    let ls = await p.evaluate(() => { const raw = localStorage.getItem('evalies_data'), st = JSON.parse(raw); return { bytes: raw.length, foto: !!(st.fotoData && Object.keys(st.fotoData).length), enIDB: st.enIDB }; });
    t.ok(!ls.foto && ls.enIDB && ls.enIDB.imagenes && ls.bytes < 60000, 'la copia de localStorage no lleva la foto', JSON.stringify(ls));
    t.ok((await leerIdb())?.foto > FOTO, 'la foto está en IndexedDB');
    await p.reload(); await esperar(2000);
    t.ok(await p.evaluate(() => (window._fotoData['1º ESO-A'] || {}).src?.length || 0) > FOTO, 'al reabrir, la foto sigue ahí');
    // Datos guardados con la versión anterior (foto dentro de localStorage, nada en IndexedDB): se pasan solos.
    await p.evaluate(async () => { const st = buildState(true, true); delete st.enIDB; Storage.prototype.setItem.call(localStorage, 'evalies_data', JSON.stringify(st));
      const db = await _tutIdb(); await new Promise(ok => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('estado'); tx.oncomplete = ok; }); });
    await p.reload(); await esperar(2500);
    ls = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('evalies_data')); return { foto: !!(st.fotoData && Object.keys(st.fotoData).length), mem: (window._fotoData['1º ESO-A'] || {}).src?.length || 0 }; });
    t.ok(ls.mem > FOTO && !ls.foto && (await leerIdb())?.foto > FOTO, 'los datos de la versión anterior pasan a IndexedDB sin perder la foto', JSON.stringify(ls));
    // localStorage lleno por otra app: se sigue guardando.
    await llenarLocalStorage(p);
    await p.evaluate(() => { selectNivel('1º ESO'); currentGrupos['1º ESO'] = 'A'; renderMain(); openAddAlumno(); document.getElementById('mNombre').value = 'Segunda, Luisa'; addAlumno(); });
    await esperar(1500);
    t.ok(await p.evaluate(() => document.getElementById('autosaveLabel')?.textContent) === 'Guardado', 'con localStorage lleno el guardado sigue correcto');
    await p.reload(); await esperar(2500);
    const tras = await p.evaluate(() => ({ alumnos: data['1º ESO'].A.filter(a => a.nombre).length, foto: (window._fotoData['1º ESO-A'] || {}).src?.length || 0 }));
    t.ok(tras.alumnos === 2 && tras.foto > FOTO, 'y al reabrir están el alumnado nuevo y la foto', JSON.stringify(tras));
    await vaciarRelleno(p);
    // Una foto grande se reduce al cargarla y se guarda al momento.
    const red = await p.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 3200; c.height = 2400; const g = c.getContext('2d');
      for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${i * 7},70%,${30 + i % 50}%)`; g.fillRect((i * 97) % 3200, (i * 53) % 2400, 400, 300); }
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      openFotoGaleria('1º ESO', 'A'); handleFotoFile(new File([blob], 'grande.png', { type: 'image/png' }));
      await new Promise(r => setTimeout(r, 2500));
      const src = window._fotoData['1º ESO-A'].src; const img = new Image(); await new Promise(r => { img.onload = r; img.src = src; });
      return { original: blob.size, guardada: src.length, ancho: img.naturalWidth, tipo: src.slice(0, 15) };
    });
    t.ok(red.ancho === 1800 && red.tipo === 'data:image/jpeg', 'una foto grande se reduce a 1800 px al cargarla', JSON.stringify(red));
    t.ok((await leerIdb())?.foto === red.guardada, 'y queda guardada sin tener que tocar nada más', JSON.stringify(red));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'version-del-curso', descripcion: 'Tutoría: «Guardar versión del curso» genera un .html que se abre sin servidor', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Instantánea, Alumna']);
    const descarga = p.waitForEvent('download');
    await p.evaluate(() => guardarVersionCurso());
    const ruta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'version-')), 'version.html'); await (await descarga).saveAs(ruta);
    const ctx2 = await t.navegador.newContext(); const q = await nuevaPagina(ctx2); const fallos = [];
    q.on('requestfailed', r => fallos.push(r.url()));
    await q.goto('file://' + ruta); await esperar(2000);
    const r = await q.evaluate(() => ({ app: typeof renderAll, datos: typeof data !== 'undefined' ? (data['1º ESO']?.A || []).map(a => a.nombre) : [], graficos: typeof Chart }));
    t.ok(r.app === 'function' && r.datos.includes('Instantánea, Alumna'), 'se abre con la app y los datos', JSON.stringify(r));
    t.ok(r.graficos === 'function', 'incluye la librería de gráficos');
    t.ok(!fallos.length && !q.errores.length, 'no le falta ningún archivo ni da errores', [...fallos, ...q.errores].join('; '));
    await ctx2.close();
  } },

  { nombre: 'sin-conexion', descripcion: 'Todo funciona sin conexión tras la primera visita', async fn(t) {
    // Servidor propio que se APAGA: así no hay red de verdad, tampoco para el service worker
    // (cortar la conexión solo en el navegador no afecta al service worker en todas las versiones).
    const srv = await servir(RAIZ);
    try {
      const p = await nuevaPagina(t.contexto); await p.goto(srv.url + '/');
      await p.evaluate(() => navigator.serviceWorker.ready); await esperar(3000);
      await cuadernoConGrupo(p, srv.url);
      await srv.cerrar();
      for (const ruta of ['/', '/tutoria/', '/editor/', '/editor/index.html', '/tools/planificacion.html', '/guia_mejorada.html']) {
        const q = await nuevaPagina(t.contexto); const fallos = [];
        q.on('response', r => { if (r.status() >= 400) fallos.push(r.status() + ' ' + r.url()); });
        q.on('requestfailed', r => fallos.push('sin respuesta: ' + r.url()));
        await q.goto(srv.url + ruta).catch(e => fallos.push(e.message.split('\n')[0])); await esperar(1200);
        t.ok(!fallos.length && !q.errores.length, `${ruta} sin conexión`, [...fallos, ...q.errores].join('; '));
        await q.close();
      }
      // La Planificación temporal, dentro del Cuaderno: carga y lleva sus letras incrustadas (no pide nada a internet).
      const fuera = []; p.on('request', r => { if (!r.url().startsWith(srv.url) && !/^(data|blob|about):/.test(r.url())) fuera.push(r.url()); });
      await p.reload(); await esperar(1500);
      const plan = await p.evaluate(async () => { _mostrarBienvenida = false;
        state.programaciones = [{ id: 'p1', nombre: 'Prueba', catalogoKey: 'GeH_1ESO', sdas: [], actividades: [] }]; migrarEstado();
        state.ui.appMode = 'programacion'; state.ui.progTab = 'detalle'; state.ui.progId = 'p1'; state.ui.progDetTab = 'planificacion'; render();
        await new Promise(r => setTimeout(r, 2500));
        return { hay: !!document.querySelector('#planTempWrap iframe') }; });
      t.ok(plan.hay, 'la Planificación temporal se abre sin conexión dentro del Cuaderno', JSON.stringify(plan));
      const marco = p.frames().find(f => f !== p.mainFrame());
      const letras = marco ? await marco.evaluate(async () => { await document.fonts.ready; return ['700 20px Fraunces', '400 14px "Public Sans"', '500 12px "IBM Plex Mono"'].map(f => document.fonts.check(f)); }) : [];
      t.ok(letras.length === 3 && letras.every(Boolean), 'la Planificación usa sus letras propias sin conexión', JSON.stringify(letras));
      t.ok(!fuera.length, 'el Cuaderno no pide nada a servidores externos', fuera.slice(0, 3).join('; '));
    } finally { await srv.cerrar().catch(() => {}); }
  } },

  { nombre: 'copia-carpeta', descripcion: 'Copia automática en una carpeta: escribe, poda y ofrece la de otro dispositivo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Desde A, Alumna'] });
    // La «carpeta» es el almacenamiento privado de archivos del navegador (el selector real necesita a una persona).
    await p.evaluate(async () => { localStorage.setItem('cc_dispositivo', 'aaaaa');
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('copias', { create: true });
      for (let i = 1; i <= 12; i++) { const f = await dir.getFileHandle(`copia-cuaderno-auto-2026-01-${String(i).padStart(2, '0')}-aaaaa.json`, { create: true }); const w = await f.createWritable(); await w.write('{"grupos":[]}'); await w.close(); }
      _ccHandle = dir; await idbPut('kv', dir, 'carpetaCopias'); _ccEstado = 'activa'; });
    t.ok(await p.evaluate(() => ccEscribir()), 'escribe la copia de hoy');
    const n = await p.evaluate(async () => { let n = 0; for await (const _ of _ccHandle.entries()) n++; return n; });
    t.ok(n === 10, 'conserva las 10 más recientes de este dispositivo', 'hay ' + n);
    await p.evaluate(() => { localStorage.setItem('cc_dispositivo', 'bbbbb'); state._guardadoEn = Date.now() - 3600e3; localStorage.setItem(KEY, JSON.stringify(state)); });
    await p.reload(); await esperar(3500);
    t.ok(await p.evaluate(() => !!_ccMasReciente), 'otro dispositivo ve que hay una copia más reciente');
  } },

  { nombre: 'copia-carpeta-cifrada', descripcion: 'Copia automática en carpeta cifrada: el archivo es ilegible sin la contraseña y se abre con ella', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Secreto Confidencial, Alumna'] });
    const r = await p.evaluate(async () => {
      localStorage.setItem('cc_dispositivo', 'aaaaa');
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('copias-cifradas', { create: true });
      _ccHandle = dir; _ccEstado = 'activa';
      await ccEscribir();
      const leer = async () => (await (await dir.getFileHandle(_ccNombreHoy())).getFile()).text();
      const claro = await leer();
      const ok = await ccActivarCifrado('una contraseña larga');
      const cifrado = await leer(), sobre = JSON.parse(cifrado);
      const conPass = JSON.parse(await descifrarTexto(sobre, 'una contraseña larga'));
      let malaPass = false; try { await descifrarTexto(sobre, 'otra contraseña'); } catch (e) { malaPass = true; }
      const conClave = await ccIntentarDescifrar(sobre);
      // Otro dispositivo (otra clave guardada o ninguna) ve que hay una copia más reciente, por la fecha que va fuera del cifrado.
      localStorage.setItem('cc_dispositivo', 'bbbbb'); const fecha = sobre._guardadoEn; state._guardadoEn = fecha - 3600e3; _ccClave = null;
      await ccBuscarMasReciente();
      return { claroLegible: claro.includes('Secreto Confidencial'), ok, cifradoLegible: cifrado.includes('Secreto') || cifrado.includes('grupos'), formato: sobre.formato, fechaFuera: typeof fecha === 'number' && fecha > 0,
        conPass: conPass.grupos[0].alumnos[0].nombre, malaPass, conClave: conClave && conClave.grupos[0].alumnos[0].nombre, otroLoVe: !!_ccMasReciente && _ccMasReciente.fecha === fecha, sinClaveNoAbre: (await ccIntentarDescifrar(sobre)) === null };
    });
    t.ok(r.claroLegible && r.ok && !r.cifradoLegible && r.formato === 'cuaderno-profesor-cifrado', 'al activar el cifrado, la copia de la carpeta deja de ser legible', JSON.stringify(r));
    t.ok(r.conPass === 'Secreto Confidencial, Alumna' && r.malaPass, 'se abre con la contraseña y no con otra', JSON.stringify(r));
    t.ok(r.conClave === 'Secreto Confidencial, Alumna' && r.sinClaveNoAbre, 'este dispositivo la abre sin pedirla; otro, no', JSON.stringify(r));
    t.ok(r.fechaFuera && r.otroLoVe, 'otro dispositivo sigue viendo que hay una copia más reciente', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'nuevo-curso', descripcion: 'Empezar curso nuevo: archiva el curso entero y deja los grupos, las programaciones y el horario listos', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 7 } }; g.bloques[0].peso = 70; g.bloques[1].peso = 30; g.umbrales.excelente = 90;
      g.diario['2026-10-01'] = { nota: 'Clase', incidencias: '', unidadId: '' }; g.asistencia['2026-10-01'] = { [g.alumnos[1].id]: { estado: 'retraso', nota: '' } };
      g.alumnos[0].observaciones = 'Observación del curso pasado'; g.alumnos[0].nese = true; g.alumnos[0].fechaNacimiento = '2013-05-02';
      state.programaciones = [{ id: 'p1', nombre: 'Prog 1º', catalogoKey: 'GeH_1ESO', sdas: [{ id: 's1', titulo: 'SdA 1', trimestre: 0, sesionesPrevistas: 6 }], actividades: [] }]; g.programacionId = 'p1';
      state.horario.celdas['0-lun'] = { tipo: 'clase', materia: 'GeH', nivelGrupo: '1º A', aula: '12', nota: '', grupoId: g.id };
      state.eventos = [{ id: 'ev1', fecha: '2026-11-02', titulo: 'Examen', tipo: 'examen', grupoIds: [g.id] }]; state.festivos = [{ id: 'f1', fechaInicio: '2026-10-09', fechaFin: '2026-10-09', etiqueta: '9 d\'Octubre' }];
      state.reuniones = [{ id: 'r1', fecha: '2026-10-05', tipo: 'familia', titulo: 'Reunión' }]; state.planesRefuerzo = [{ id: 'pr1', alumnoId: g.alumnos[0].id, estado: 'activo' }];
      state.cursoEscolarGlobal = '2026-2027'; _mostrarBienvenida = false; migrarEstado(); state.ui.grupoId = null; save(); render(); });
    await p.evaluate(() => exPut({ key: 'e1', exam: { titulo: 'Diseño del examen' } })); await p.evaluate(() => exPut({ key: 'prog:pa1', exam: { titulo: 'Plantilla' } }));
    await p.click('button:has-text("Empezar curso nuevo")'); await esperar(300);
    t.ok(await p.inputValue('#ncCurso') === '2027-2028', 'propone el curso siguiente');
    await p.click('button:has-text("Preparar el archivo")'); await esperar(600);
    const antes = await p.evaluate(() => state.grupos[0].alumnos.length);
    const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#ncConfirmar')]);
    const archivo = JSON.parse(fs.readFileSync(await descarga.path(), 'utf8'));
    t.ok(/^curso-2026-2027-cuaderno-\d{4}-\d\d-\d\d\.json$/.test(descarga.suggestedFilename()) && archivo.grupos[0].alumnos.length === 3 && archivo.grupos[0].notasCuant[ids[0]].e1 === 7 && archivo._examenesDiseno.length === 2,
      'el archivo descargado contiene el curso completo (alumnado, notas y diseños de examen)', descarga.suggestedFilename());
    await esperar(1200);
    const r = await p.evaluate(async () => { const g = state.grupos[0]; return { antes: 0, curso: state.cursoEscolarGlobal, grupo: g.nombre, alumnos: g.alumnos.length, acts: g.actividades.length, notas: Object.keys(g.notasCuant).length, diario: Object.keys(g.diario).length, asist: Object.keys(g.asistencia).length,
      pesos: g.bloques.map(b => b.peso).join('/'), umbral: g.umbrales.excelente, prog: g.programacionId, progs: state.programaciones.length, cursoProg: state.programaciones[0].cursoEscolar, horario: (state.horario.celdas['0-lun'] || {}).grupoId === g.id,
      eventos: state.eventos.length, festivos: state.festivos.length, reuniones: state.reuniones.length, planes: state.planesRefuerzo.length, disenos: (await exLeerTodos()).map(x => x.key).join(','), copias: (await idbAll('copias')).map(c => c.motivo).join(' | ') }; });
    t.ok(antes === 3 && r.curso === '2027-2028' && r.alumnos === 0 && r.acts === 0 && r.notas === 0 && r.diario === 0 && r.asist === 0 && r.eventos === 0 && r.festivos === 0 && r.reuniones === 0 && r.planes === 0,
      'se vacía lo que es de un solo curso', JSON.stringify(r));
    t.ok(r.grupo === '1º ESO A' && r.pesos === '70/30' && r.umbral === 90 && r.prog === 'p1' && r.progs === 1 && r.cursoProg === '2027-2028' && r.horario,
      'se conservan el grupo con su configuración, la programación y el horario', JSON.stringify(r));
    t.ok(r.disenos === 'prog:pa1' && /Antes de empezar el curso 2027-2028/.test(r.copias), 'quedan las plantillas de examen y una copia interna del curso anterior', JSON.stringify(r));
    // Deshacer devuelve el curso anterior.
    await p.evaluate(() => deshacer()); await esperar(400);
    t.ok(await p.evaluate(() => state.grupos[0].alumnos.length === 3 && state.cursoEscolarGlobal === '2026-2027'), '↶ Deshacer devuelve el curso anterior');
    await p.evaluate(() => rehacer()); await esperar(300);
    // Con «también su alumnado»: nombres sí, datos del curso no. Y si se cancela la descarga, no cambia nada.
    await p.evaluate(arch => { delete arch._examenesDiseno; cargarEstadoCompleto(arch); _mostrarBienvenida = false; render(); }, archivo); await esperar(300);
    await p.evaluate(() => { window.__guardarArchivoReal = guardarArchivo; guardarArchivo = async () => false; abrirNuevoCurso(); document.getElementById('ncAlumnado').checked = true; });
    await p.click('button:has-text("Preparar el archivo")'); await esperar(500);
    await p.click('#ncConfirmar'); await esperar(600);
    t.ok(await p.evaluate(() => state.grupos[0].actividades.length === 1 && state.cursoEscolarGlobal === '2026-2027'), 'si el archivo no se guarda, no se cambia nada');
    await p.evaluate(() => { guardarArchivo = async () => true; }); await p.click('#ncConfirmar'); await esperar(1200);
    const c = await p.evaluate(() => { const g = state.grupos[0], a = g.alumnos.find(x => x.fechaNacimiento); return { alumnos: g.alumnos.length, nac: a && a.fechaNacimiento, nese: a && a.nese, obs: g.alumnos.map(x => x.observaciones).join(''), notas: Object.keys(g.notasCuant).length }; });
    t.ok(c.alumnos === 3 && c.nac === '2013-05-02' && c.nese === true && c.obs === '' && c.notas === 0, 'con «también su alumnado» quedan los nombres, sin observaciones ni notas', JSON.stringify(c));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'sorteo-y-grupos', descripcion: 'Herramientas de clase: sorteo sin repetir y sin ausentes, y reparto en grupos igualados', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url, { nombres: ['A, Uno', 'B, Dos', 'C, Tres', 'D, Cuatro', 'E, Cinco', 'F, Seis', 'G, Siete'] });
    await p.evaluate(ids => { _mostrarBienvenida = false; const g = state.grupos[0]; g.asistencia[agHoyStr()] = { [ids[6]]: { estado: 'falta_no_justificada', nota: '' }, [ids[5]]: { estado: 'retraso', nota: '' } };
      state.ui.appMode = 'competencial'; state.ui.grupoId = g.id; save(); render(); }, ids);
    await p.click('#cronoFab'); await p.click('[data-clase-tab="sorteo"]'); await esperar(200);
    const salen = [];
    for (let i = 0; i < 6; i++) { await p.click('button:has-text("Elegir a alguien"), button:has-text("Otra persona")'); await esperar(900); salen.push(await p.innerText('#claseElegido')); }
    t.ok(new Set(salen).size === 6, 'en seis sorteos salen las seis personas presentes, sin repetir', salen.join(' · '));
    t.ok(!salen.includes('Siete G') && salen.includes('Seis F'), 'quien falta hoy no entra en el sorteo; quien llega tarde, sí', salen.join(' · '));
    t.ok(/Quedan 0 de 6 · 1 ausente hoy/.test(await p.innerText('#claseOtra')), 'indica cuántos quedan y cuántos faltan', await p.innerText('#claseOtra'));
    await p.click('button:has-text("Otra persona")'); await esperar(900);
    t.ok(/Quedan 5 de 6/.test(await p.innerText('#claseOtra')), 'cuando han salido todos, empieza otra vuelta');
    await p.click('[data-clase-tab="grupos"]'); await p.fill('#claseNum', '3'); await p.click('button:has-text("Hacer grupos")'); await esperar(200);
    let eq = await p.evaluate(() => claseEquipos.equipos);
    t.ok(eq.length === 3 && eq.every(e => e.length === 2) && new Set(eq.flat()).size === 6, 'tres grupos de dos, con todos los presentes una sola vez', JSON.stringify(eq));
    await p.selectOption('#claseOtra select[aria-label="Cómo repartir"]', 'tam'); await p.fill('#claseNum', '4'); await p.click('button:has-text("Repartir otra vez"), button:has-text("Hacer grupos")'); await esperar(200);
    eq = await p.evaluate(() => claseEquipos.equipos);
    t.ok(eq.length === 2 && eq.map(e => e.length).sort().join() === '3,3', '«de cuatro en cuatro» con seis personas da dos grupos igualados (3 y 3)', JSON.stringify(eq));
    const rep = await p.evaluate(() => { const al = Array.from({ length: 23 }, (_, i) => ({ id: 'x' + i })); return [claseRepartir(al, 'num', 5), claseRepartir(al, 'tam', 4), claseRepartir(al, 'num', 40), claseRepartir([], 'num', 3)].map(r => r.map(e => e.length).sort((a, b) => b - a).join('+')); });
    t.ok(rep[0] === '5+5+5+4+4' && rep[1] === '4+4+4+4+4+3' && rep[2] === Array(23).fill(1).join('+') && rep[3] === '', 'los tamaños nunca difieren en más de uno', JSON.stringify(rep));
    t.ok(await p.evaluate(() => JSON.stringify(state.grupos[0].alumnos.map(a => a.id))) === JSON.stringify(ids) && !p.errores.length, 'no toca los datos ni da errores', p.errores.join('; '));
  } },

  { nombre: 'modo-proyector', descripcion: 'Modo proyector: los nombres del alumnado y sus notas se difuminan en todas las pantallas', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Xilófono Quetzal, Wenceslao', 'Ñandú Kiwi, Brígida', 'Yunque Zafiro, Úrsula'] });
    await p.evaluate(() => { _mostrarBienvenida = false; const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.alumnos.forEach((a, i) => { g.notasCuant[a.id] = { e1: 3 + i * 2.5 }; g.notas[a.id] = { e1: { [cr]: 5 + i } }; a.familia[0] = { parentesco: 'Madre', nombre: 'Familiar Reconocible ' + i, email: 'familia' + i + '@correo.es' }; });
      g.convivencia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: agHoyStr(), tipo: 'AC', descripcion: 'Incidencia' });
      state.ui.appMode = 'competencial'; state.ui.grupoId = g.id; state.ui.tab = 'resultados'; save(); render(); });
    // Nombres (o trozos) que quedan legibles: textos y campos que los contienen y no están difuminados.
    const visibles = () => p.evaluate(() => {
      const marcas = /xil[oó]fono|quetzal|wenceslao|[ñn]and[uú]|kiwi|br[ií]gida|yunque|zafiro|[uú]rsula|familiar reconocible|@correo\.es/i, out = [];
      const oculto = el => !!el.closest('.priv') || !!el.closest('[data-sin-privacidad]') || el.closest('script,style');
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const pe = n.parentElement; if (!pe || !marcas.test(n.nodeValue)) continue; if (pe.tagName === 'OPTION') { if (pe.selected && !oculto(pe.parentElement)) out.push('opción: ' + n.nodeValue.trim().slice(0, 30)); continue; } if (!oculto(pe) && pe.getBoundingClientRect().width > 0) out.push(pe.tagName + ': ' + n.nodeValue.trim().slice(0, 40)); }
      document.querySelectorAll('input,textarea').forEach(el => { if (el !== document.activeElement && marcas.test(el.value || '') && !oculto(el) && el.getBoundingClientRect().width > 0) out.push('campo: ' + el.value.slice(0, 30)); });
      return out; });
    t.ok((await visibles()).length >= 3, 'sin el modo proyector los nombres se ven');
    await p.click('#proyectorBtn'); await esperar(200);
    const fallos = {};
    const mira = async (nombre) => { await esperar(250); const v = await visibles(); if (v.length) fallos[nombre] = v.slice(0, 4); };
    for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) {
      await p.evaluate(tab => { state.ui.appMode = 'competencial'; state.ui.tab = tab; render(); }, tab); await mira('pestaña ' + tab); }
    await p.evaluate(() => { state.ui.tab = 'calificar'; state.ui.calViewMode = 'table'; render(); }); await mira('calificar (tabla)');
    await p.evaluate(() => { state.ui.tab = 'resultados'; state.ui.resAl = state.grupos[0].alumnos[0].id; render(); }); await mira('informe del alumno');
    for (const m of ['inicio', 'corrector', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) { await p.evaluate(m => { state.ui.appMode = m; render(); }, m); await mira('modo ' + m); }
    await p.evaluate(() => { buscarAbrir(); const i = document.querySelector('.modal-overlay input'); i.focus(); i.value = 'quetzal'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await mira('buscador');
    t.ok(!Object.keys(fallos).length, 'ningún nombre de alumno/a ni de su familia queda legible (20 pantallas y el buscador)', JSON.stringify(fallos));
    await p.keyboard.press('Escape');
    await p.evaluate(() => { state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; state.ui.resAl = ''; render(); }); await esperar(200);
    const notas = await p.evaluate(() => {
      const filas = [...document.querySelectorAll('#tabContent table tbody tr')].slice(0, 3);
      return { filas: filas.length, notasOcultas: filas.every(tr => [...tr.querySelectorAll('td')].filter(td => /^\s*\d{1,2},\d\s*$/.test(td.textContent)).every(td => td.classList.contains('priv')) && [...tr.querySelectorAll('.pill')].every(x => x.classList.contains('priv'))),
        grupoVisible: !document.querySelector('.gpill.on').closest('.priv'), blur: getComputedStyle(document.querySelector('.priv')).filter }; });
    t.ok(notas.filas === 3 && notas.notasOcultas && /blur/.test(notas.blur), 'las notas de cada fila también se difuminan', JSON.stringify(notas));
    t.ok(notas.grupoVisible, 'el resto (grupo, actividades, botones) se sigue viendo');
    await p.click('#cronoFab'); await p.click('[data-clase-tab="sorteo"]'); await p.click('button:has-text("Elegir a alguien")'); await esperar(900);
    t.ok(await p.evaluate(() => !document.getElementById('claseElegido').closest('.priv') && /Wenceslao|Brígida|Úrsula/.test(document.getElementById('claseElegido').textContent)), 'el sorteo sí muestra el nombre (está pensado para proyectarlo)');
    await p.reload(); await esperar(1500);
    await p.evaluate(() => { _mostrarBienvenida = false; state.ui.appMode = 'competencial'; state.ui.grupoId = state.grupos[0].id; state.ui.tab = 'resultados'; render(); }); await esperar(250);
    t.ok(await p.evaluate(() => document.body.getAttribute('data-proyector') === '1') && !(await visibles()).length, 'el modo se recuerda al reabrir la app');
    await p.click('#proyectorBtn'); await esperar(200);
    t.ok(await p.evaluate(() => !document.querySelector('.priv')) && (await visibles()).length >= 3, 'al desactivarlo todo vuelve a verse');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'bloqueo-pin', descripcion: 'Bloqueo con PIN: la app se abre tapada, solo entra el PIN correcto y el código de recuperación lo quita', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Dato Privado, Alumna'] });
    await p.evaluate(() => { _mostrarBienvenida = false; state.ui.appMode = 'inicio'; render(); abrirCopias(); }); await esperar(400);
    await p.click('button:has-text("Activar el PIN")'); await p.fill('#bqp1', '2468'); await p.fill('#bqp2', '2468'); await p.click('#bqpSi'); await esperar(1500);
    const aviso = await p.innerText('.dlg-msg');
    const codigo = (aviso.match(/[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}/) || [])[0];
    t.ok(!!codigo, 'al activarlo muestra un código de recuperación', aviso.slice(0, 120));
    await p.click('.dlg-si'); await esperar(200);
    t.ok(await p.evaluate(() => BloqueoPIN.activo && getComputedStyle(document.getElementById('bloqueoBtn')).display !== 'none' && !/2468/.test(localStorage.getItem('cuaderno_bloqueo_pin'))), 'queda activado, aparece el botón 🔒 y el PIN no se guarda en claro');
    await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada), 'recargar en la misma pestaña no vuelve a pedirlo');
    // Pestaña nueva (como al abrir la app): tapada hasta escribir el PIN.
    await p.evaluate(() => sessionStorage.clear()); await p.reload(); await esperar(1500);
    const tapada = () => p.evaluate(() => ({ bloqueada: BloqueoPIN.bloqueada, visibles: [...document.body.children].filter(e => e.id !== 'bloqueoOverlay' && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0).map(e => e.tagName + '#' + e.id),
      seLee: (() => { const el = document.elementFromPoint(300, 300); return !!(el && el.closest('#bloqueoOverlay')); })() }));
    let e = await tapada();
    t.ok(e.bloqueada && !e.visibles.length && e.seLee, 'al abrir, la app está tapada y no se ve nada de ella', JSON.stringify(e));
    await p.fill('#bqCampo', '1111'); await p.click('.bq-btn'); await esperar(900);
    t.ok((await tapada()).bloqueada && /incorrecto/.test(await p.innerText('#bqError')), 'un PIN incorrecto no entra');
    await p.fill('#bqCampo', '2468'); await p.click('.bq-btn'); await esperar(900);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada && !document.getElementById('bloqueoOverlay') && state.grupos[0].alumnos[0].nombre === 'Dato Privado, Alumna'), 'con el PIN correcto se entra y los datos están intactos');
    await p.evaluate(() => { _mostrarBienvenida = false; render(); }); await p.click('#bloqueoBtn'); await esperar(300);
    t.ok((await tapada()).bloqueada, 'el botón 🔒 bloquea al momento');
    // Tutoría comparte el bloqueo.
    await p.goto(t.url + '/tutoria/'); await esperar(1500);
    t.ok((await tapada()).bloqueada, 'Tutoría también se abre tapada');
    for (let i = 0; i < 5; i++) { await p.fill('#bqCampo', '0000'); await p.click('.bq-btn'); await esperar(500); }
    await p.fill('#bqCampo', '2468'); await p.click('.bq-btn'); await esperar(700);
    t.ok((await tapada()).bloqueada && /Espera/.test(await p.innerText('#bqError')), 'tras cinco intentos fallidos hay que esperar, aunque después se escriba el PIN bueno');
    // Olvidado: el código de recuperación quita el PIN sin tocar los datos.
    await p.reload(); await esperar(1500);
    await p.fill('#bqCampo', '2468'); await p.click('.bq-btn'); await esperar(700);
    t.ok((await tapada()).bloqueada && /Espera/.test(await p.innerText('#bqError')), 'recargar la página no salta la espera');
    await p.evaluate(() => { const i = JSON.parse(localStorage.getItem('cuaderno_bloqueo_intentos')); i.hasta = Date.now() - 1; Storage.prototype.setItem.call(localStorage, 'cuaderno_bloqueo_intentos', JSON.stringify(i)); });
    await p.reload(); await esperar(1500);   // (pasados los 30 s)
    await p.click('#bqOtro'); await p.fill('#bqCampo', 'AAAA-BBBB-CCCC'); await p.click('.bq-btn'); await esperar(900);
    t.ok((await tapada()).bloqueada, 'un código de recuperación inventado no sirve');
    await p.fill('#bqCampo', codigo.toLowerCase().replace(/-/g, ' ')); await p.click('.bq-btn'); await esperar(900);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada && !BloqueoPIN.activo), 'el código de recuperación (aunque se escriba en minúsculas y con espacios) quita el PIN');
    await p.goto(t.url + '/'); await esperar(1500);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada && state.grupos[0].alumnos.length === 1) && !p.errores.length, 'y la app vuelve a abrirse sin PIN, con sus datos', p.errores.join('; '));
  } },

  { nombre: 'avisos-encima', descripcion: 'Los avisos y las ventanas de contraseña salen por encima de la ventana desde la que se abren', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const encima = sel => p.evaluate(sel => { const el = document.querySelector(sel); if (!el) return 'no existe'; const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top === el || el.contains(top) ? 'encima' : 'tapado por ' + (top && (top.className || top.tagName)); }, sel);
    await p.evaluate(async () => { _mostrarBienvenida = false; state.ui.appMode = 'inicio'; render(); await abrirCopias(); await copiaManualAhora(); }); await esperar(600);
    await p.click('#copiasCuerpo button:has-text("Restaurar")'); await esperar(400);
    t.ok(await encima('.dlg-si') === 'encima', '«Restaurar» en 🛟 Copias: la confirmación se ve y se puede pulsar', await encima('.dlg-si'));
    await p.click('.dlg-no'); await esperar(200);
    await p.click('#copiasCuerpo button:has-text("Exportar copia cifrada")'); await esperar(400);
    t.ok(await encima('#pwd1') === 'encima', '«Exportar copia cifrada»: la ventana de la contraseña se ve', await encima('#pwd1'));
    await p.click('#pwdNo'); await esperar(200);
    await p.click('#copiasCuerpo button:has-text("Activar el PIN")'); await esperar(300);
    t.ok(await encima('#bqp1') === 'encima', '«Activar el PIN»: la ventana del PIN se ve', await encima('#bqp1'));
  } },

  { nombre: 'examen-adaptado', descripcion: 'Examen adaptado NESE: aviso, creación desde el Diseño, corrección con su rúbrica y paso por la Programación a otro grupo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema'] });
    await p.evaluate(() => { _mostrarBienvenida = false; const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.alumnos[1].nese = true;
      state.programaciones = [{ id: 'p1', nombre: 'Prog', catalogoKey: 'GeH_1ESO', sdas: [], actividades: [{ id: 'pa1', nombre: 'Examen tema 1', tipo: TIPOS[0], esExamen: true, criterios: [{ critId: cr, peso: 100 }], sdaIds: [] }] }];
      migrarEstado(); g.programacionId = 'p1';
      const act = progCrearActividadEnGrupo(g, state.programaciones[0].actividades[0], 0); g.actividades.push(act);
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = act.id; state.ui.corTab = 'diseno'; save(); render(); });
    await esperar(800);
    const texto = () => p.evaluate(() => document.getElementById('tabContent').innerText);
    t.ok(/Alumno\/a NESE con el examen general:.*Beta, Bruno/s.test(await texto()), 'el Diseño avisa de que hay alumnado NESE sin versión adaptada');
    await p.click('#tabContent button:has-text("+ Examen adaptado (NESE)")'); await esperar(1500);
    let r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], v = act.variantes[0];
      return { v: v && v.nombre, alumnos: (v ? v.alumnos : []).map(id => g.alumnos.find(a => a.id === id).nombre), editando: state.ui.corVarId === (v && v.id), tab: state.ui.corTab, aviso: !!document.querySelector('.cx-aviso-nese') }; });
    t.ok(r.v === 'Adaptada (NESE)' && r.alumnos.join() === 'Beta, Bruno' && r.editando && r.tab === 'diseno' && !r.aviso, 'desde el Diseño se crea el examen adaptado, con el alumnado NESE, y se abre para editarlo', JSON.stringify(r));
    // La rúbrica adaptada es distinta y Corregir la usa con Bruno.
    await p.evaluate(() => { const act = state.grupos[0].actividades[0]; cxItemsFlat(act.variantes[0].rubrica)[0].label = 'Pregunta adaptada'; cxItemsFlat(act.rubrica)[0].label = 'Pregunta general'; save(); });
    // Diseño adaptado propio, guardado como plantilla de la Programación (con su rúbrica).
    await p.evaluate(async () => { const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get(); ex.name = 'Examen adaptado de prueba'; w.__ee.cargar(ex); w.__ee.flush && w.__ee.flush(); });
    await esperar(400);
    await p.click('#tabContent button:has-text("Plantilla de la Programación")'); await esperar(800);
    r = await p.evaluate(async () => { const pa = state.programaciones[0].actividades[0], v = state.grupos[0].actividades[0].variantes[0];
      const d = await exGet('prog:pa1:' + v.progVarId);
      return { pv: (pa.variantes || []).map(x => x.nombre + ':' + cxItemsFlat(x.rubrica)[0].label), alumnosEnProg: (pa.variantes || []).some(x => x.alumnos), diseno: d && d.exam.name }; });
    t.ok(r.pv.join() === 'Adaptada (NESE):Pregunta adaptada' && !r.alumnosEnProg && r.diseno === 'Examen adaptado de prueba', 'la versión adaptada (rúbrica y diseño) queda en la Programación, sin alumnado', JSON.stringify(r));
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = state.grupos[0].alumnos[1].id; render(); }); await esperar(300);
    const bruno = await texto();
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[0].id; render(); }); await esperar(300);
    const ana = await texto();
    t.ok(/Pregunta adaptada/.test(bruno) && /Pregunta general/.test(ana) && !/Pregunta adaptada/.test(ana), 'al corregir, Bruno abre la rúbrica adaptada y Ana la general');
    // Guardar también la rúbrica: la Programación no duplica la versión.
    await p.evaluate(() => cxGuardarRubricaEnProgramacion(state.grupos[0].actividades[0].id)); await esperar(300);
    t.ok(await p.evaluate(() => state.programaciones[0].actividades[0].variantes.length === 1), 'guardar la rúbrica en la Programación no duplica la versión adaptada');
    // Otro grupo trae el examen: nace con la versión adaptada, su alumnado NESE y el diseño adaptado.
    r = await p.evaluate(async () => {
      const g2 = defGrupo('1º ESO B', 'GeH_1ESO'); g2.programacionId = 'p1';
      g2.alumnos = ['Delta, Dani', 'Épsilon, Eva'].map(n => normalizarAlumno({ id: uid(), nombre: n })); g2.alumnos[1].nese = true;
      state.grupos.push(g2);
      const act = progCrearActividadEnGrupo(g2, state.programaciones[0].actividades[0], 0); g2.actividades.push(act);
      state.ui.grupoId = g2.id; state.ui.corExamId = act.id; state.ui.corVarId = act.variantes[0] && act.variantes[0].id; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow;
      return { v: (act.variantes || []).map(v => v.nombre + ':' + cxItemsFlat(v.rubrica)[0].label), alumnos: ((act.variantes[0] || {}).alumnos || []).map(id => g2.alumnos.find(a => a.id === id).nombre),
        rubEva: cxItemsFlat(cxRubricaDe(act, g2.alumnos[1].id))[0].label, rubDani: cxItemsFlat(cxRubricaDe(act, g2.alumnos[0].id))[0].label, diseno: w.__ee.get().name };
    });
    t.ok(r.v.join() === 'Adaptada (NESE):Pregunta adaptada' && r.alumnos.join() === 'Épsilon, Eva', 'en otro grupo el examen nace con la versión adaptada y su alumnado NESE', JSON.stringify(r));
    t.ok(r.rubEva === 'Pregunta adaptada' && r.rubDani === 'Pregunta general' && r.diseno === 'Examen adaptado de prueba', 'con la rúbrica y el diseño adaptados de la plantilla', JSON.stringify(r));
    // «Hace el general» y un NESE nuevo después.
    r = await p.evaluate(async () => { const g2 = state.grupos[1], act = g2.actividades[0];
      const nuevo = normalizarAlumno({ id: uid(), nombre: 'Zeta, Zoe' }); nuevo.nese = true; g2.alumnos.push(nuevo);
      state.ui.corVarId = ''; state.ui.corTab = 'editor'; render(); await new Promise(r => setTimeout(r, 200));
      const avisa = /Zeta, Zoe/.test((document.querySelector('.cx-aviso-nese') || {}).innerText || '');
      document.querySelector('.cx-aviso-nese button.btn').click(); await new Promise(r => setTimeout(r, 200));
      const anadida = act.variantes[0].alumnos.includes(nuevo.id);
      const otro = normalizarAlumno({ id: uid(), nombre: 'Omega, Olga' }); otro.nese = true; g2.alumnos.push(otro); render(); await new Promise(r => setTimeout(r, 200));
      [...document.querySelectorAll('.cx-aviso-nese button')].find(b => /general/.test(b.textContent)).click(); await new Promise(r => setTimeout(r, 200));
      return { avisa, anadida, sinAviso: !document.querySelector('.cx-aviso-nese'), rubOlga: cxItemsFlat(cxRubricaDe(act, otro.id))[0].label };
    });
    t.ok(r.avisa && r.anadida, 'un alumno marcado NESE más tarde aparece en el aviso y se añade con un toque', JSON.stringify(r));
    t.ok(r.sinAviso && r.rubOlga === 'Pregunta general', '«Hace el general» deja de avisar y se corrige con la general', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'modelo-b', descripcion: 'Modelo B: sigue al general, reparto A/B, rúbrica en el orden del B y enlace de una rúbrica hecha a mano', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema', 'Delta, Dani'].length ? { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema', 'Delta, Dani'] } : {});
    // Examen general con 4 preguntas (la 3.ª con dos subpreguntas) y su rúbrica importada del diseño.
    const r0 = await p.evaluate(async () => { _mostrarBienvenida = false; const g = state.grupos[0];
      g.actividades = [{ id: 'e1', nombre: 'Examen', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [] }];
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = 'e1'; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const q = (id, txt, pts, hijos) => ({ id, type: 'question', title: '', text: txt, points: hijos ? '' : String(pts), children: hijos || [] });
      const sq = (id, txt, pts) => ({ id, type: 'subquestion', title: '', text: txt, points: String(pts), children: [] });
      ex.body = ex.body.filter(n => n.type === 'title').concat([q('q1', 'Define latitud', 2), q('q2', 'Define longitud', 2), q('q3', 'Mapa', 0, [sq('s31', 'Escala del mapa', 2), sq('s32', 'Leyenda del mapa', 2)]), q('q4', 'Explica el clima', 2)]);
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 500));
      return (await exGet('e1')).exam.body.filter(n => n.type === 'question').length; });
    t.ok(r0 === 4, 'el examen general de prueba tiene 4 preguntas', String(r0));
    await p.click('#tabContent button:has-text("Importar a la rúbrica")'); await esperar(800);
    await p.evaluate(() => { const b = document.querySelector('.dlg-si'); if (b) b.click(); }); await esperar(600);
    // Modelo B: se crea barajado y con las mismas preguntas.
    t.ok(await p.evaluate(() => !!state.grupos[0].actividades[0].rubrica), 'la rúbrica se importa del diseño');
    await p.evaluate(() => { state.ui.corTab = 'diseno'; exVerB(); }); await esperar(2200);
    let r = await p.evaluate(async () => { const act = state.grupos[0].actividades[0], B = (await exGet('e1:B')).exam, G = (await exGet('e1')).exam;
      const qs = e => e.body.filter(n => n.type === 'question').map(n => n.id);
      return { hayModelo: !!act.modeloB, a: qs(G), b: qs(B), eyebrow: (B.body.find(n => n.type === 'title') || {}).eyebrow, numB: act.modeloB && act.modeloB.numB }; });
    t.ok(r.hayModelo && r.b.slice().sort().join() === r.a.slice().sort().join() && r.b.join() !== r.a.join(), 'el modelo B tiene las mismas preguntas en otro orden', JSON.stringify(r));
    t.ok(/Modelo B/.test(r.eyebrow || '') && r.numB && Object.keys(r.numB).length === 4, 'lleva «Modelo B» encima del título y guarda la numeración de cada pregunta', JSON.stringify(r));
    const ordenB = r.b;
    // Se cambia el general: el B lo sigue (nueva pregunta incluida) sin perder su orden.
    r = await p.evaluate(async () => { exSel(''); await new Promise(r => setTimeout(r, 2000));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      ex.body.find(n => n.id === 'q1').text = 'Define latitud (CAMBIADO)'; ex.body.push({ id: 'q5', type: 'question', title: '', text: 'Pregunta nueva', points: '1', children: [] });
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 1200));
      const B = (await exGet('e1:B')).exam;
      return { b: B.body.filter(n => n.type === 'question').map(n => n.id), texto: B.body.find(n => n.id === 'q1').text }; });
    t.ok(r.texto === 'Define latitud (CAMBIADO)' && r.b.includes('q5') && r.b.filter(id => id !== 'q5').join() === ordenB.join(), 'al cambiar el general, el modelo B se pone al día y conserva su orden', JSON.stringify(r));
    // En el B solo cuenta el orden: un cambio de texto allí no se guarda.
    r = await p.evaluate(async () => { window.__dialogosAuto = { confirmar: true }; exVerB(); await new Promise(r => setTimeout(r, 2200));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const qs = ex.body.filter(n => n.type === 'question'); const i0 = ex.body.indexOf(qs[0]), i1 = ex.body.indexOf(qs[1]); [ex.body[i0], ex.body[i1]] = [ex.body[i1], ex.body[i0]];
      ex.body.find(n => n.id === 'q2').text = 'TEXTO CAMBIADO EN EL B';
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 1200));
      const B = (await exGet('e1:B')).exam, act = state.grupos[0].actividades[0];
      return { ordenGuardado: act.modeloB.orden._raiz, b: B.body.filter(n => n.type === 'question').map(n => n.id), texto: B.body.find(n => n.id === 'q2').text, aviso: (window.__dialogosLog || []).some(m => /solo cuenta el ORDEN/.test(m)) }; });
    t.ok(r.b.join() === r.ordenGuardado.join() && r.texto === 'Define longitud' && r.aviso, 'en el modelo B el orden manual se guarda y los cambios de texto no (con aviso)', JSON.stringify(r));
    // Reparto y corrección.
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = ''; render(); }); await esperar(300);
    await p.click('button:has-text("Alternar A/B por lista")'); await esperar(300);
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0]; return { deB: act.modeloB.alumnos.map(id => g.alumnos.find(a => a.id === id).nombre), botones: document.querySelectorAll('.mb-ab').length }; });
    t.ok(r.deB.join() === 'Beta, Bruno,Delta, Dani' && r.botones === 4, '«Alternar por lista» reparte A, B, A, B y cada alumno/a tiene su selector', JSON.stringify(r));
    await p.evaluate(() => { const g = state.grupos[0]; mbSetModelo(g.alumnos[2].id, 'B'); }); await esperar(200);
    const orden = () => p.evaluate(() => { const act = state.grupos[0].actividades[0], ids = [];
      (function w(l) { l.forEach(n => { if (n.fuenteId && /^q/.test(n.fuenteId) && !ids.includes(n.fuenteId)) ids.push(n.fuenteId); (n.items || []).forEach(it => { if (it.fuenteId && /^q/.test(it.fuenteId) && !ids.includes(it.fuenteId)) ids.push(it.fuenteId); }); w(n.subs || []); }); })(mbRubricaVista(act, state.ui.corAlId));
      return ids; });
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[1].id; render(); }); await esperar(300);
    const vistaB = await orden(), textoB = await p.evaluate(() => document.getElementById('tabContent').innerText);
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[0].id; render(); }); await esperar(300);
    const vistaA = await orden(), textoA = await p.evaluate(() => document.getElementById('tabContent').innerText);
    const ordenFinal = await p.evaluate(() => state.grupos[0].actividades[0].modeloB.orden._raiz);
    t.ok(vistaB.join() === ordenFinal.filter(id => id !== 'q5').join() && vistaA.join() === 'q1,q2,q3,q4',   // q5 se añadió al diseño después de importar la rúbrica
       'al corregir, el modelo B sale en el orden del B y el A en el suyo', JSON.stringify({ vistaA, vistaB, ordenFinal }));
    t.ok(/Modelo B/.test(textoB) && /modelo A: \d/.test(textoB) && !/Modelo B/.test(textoA), 'el B lleva «Modelo B» y el número de cada pregunta en el A', textoB.slice(0, 200));
    // Mismas puntuaciones, misma nota: corregir a Bruno con el B y comprobar su nota.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], al = g.alumnos[1];
      const sc = g.rubricScores[al.id] = g.rubricScores[al.id] || {}; sc[act.id] = {}; cxItemsFlat(act.rubrica).forEach(it => { sc[act.id][it.id] = Number(it.max); });
      cxRecalcAlumno(g, act, al.id); return g.notasCuant[al.id][act.id]; });
    t.ok(r === 10, 'con todo bien en el modelo B la nota es 10: la rúbrica es la misma', String(r));
    // Impresión en el orden del B.
    const imp = await p.evaluate(() => { const g = state.grupos[0]; return cxRubricaBodyHTML(g, g.actividades[0], g.alumnos[1], {}); });
    t.ok(/Modelo B/.test(imp), 'la rúbrica impresa del modelo B lo indica');
    // Plano de aula: damero.
    r = await p.evaluate(() => { const g = state.grupos[0]; g.plano.posiciones = { [g.alumnos[0].id]: { fila: 0, col: 0 }, [g.alumnos[1].id]: { fila: 0, col: 1 }, [g.alumnos[2].id]: { fila: 1, col: 0 }, [g.alumnos[3].id]: { fila: 1, col: 1 } };
      save(); render(); mbAlternarPlano(); return g.actividades[0].modeloB.alumnos.map(id => g.alumnos.find(a => a.id === id).nombre).sort(); });
    t.ok(r.join() === 'Beta, Bruno,Gamma, Gema', '«Alternar según el plano» reparte en damero (ni al lado ni delante el mismo modelo)', JSON.stringify(r));
    // Rúbrica hecha a mano (sin enlaces): se enlaza por el texto sin tocar lo corregido.
    r = await p.evaluate(async () => { const g = state.grupos[0], act = g.actividades[0];
      const antes = JSON.stringify(g.rubricScores), ids = cxItemsFlat(act.rubrica).map(i => i.id).join();
      (function w(l) { l.forEach(n => { delete n.fuenteId; (n.items || []).forEach(it => { delete it.fuenteId; }); w(n.subs || []); }); })(act.rubrica);
      const sinEnlace = mbRubricaEnlazada(act);
      state.ui.corTab = 'diseno'; state.ui.corVerB = false; render(); await new Promise(r => setTimeout(r, 2200));
      const boton = [...document.querySelectorAll('#tabContent button')].find(b => /Enlazar la rúbrica/.test(b.textContent));
      await mbEnlazarRubrica(); await new Promise(r => setTimeout(r, 300));
      document.getElementById('mbSi').click(); await new Promise(r => setTimeout(r, 300));
      return { boton: !!boton, sinEnlace, enlazada: mbRubricaEnlazada(act), sinEnlazar: mbSinEnlazar(act), mismosIds: cxItemsFlat(act.rubrica).map(i => i.id).join() === ids, mismasNotas: JSON.stringify(g.rubricScores) === antes,
        bloqueQ3: (cxNodosFlat(act.rubrica).find(x => (x.n.items || []).some(it => it.fuenteId === 's31')) || {}).n.fuenteId }; });
    t.ok(r.boton && !r.sinEnlace && r.enlazada && r.sinEnlazar === 0 && r.bloqueQ3 === 'q3', 'una rúbrica sin enlazar se enlaza con el diseño (ítems y bloques)', JSON.stringify(r));
    t.ok(r.mismosIds && r.mismasNotas, 'enlazar no cambia ningún ítem ni lo ya corregido', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'que-me-falta', descripcion: 'Inicio: «Qué me falta» detecta notas a medias y comentarios pendientes', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['A, Uno', 'B, Dos', 'C, Tres', 'D, Cuatro'] });
    const txt = await p.evaluate(() => { const g = state.grupos[0], [A, B, C, D] = g.alumnos.map(a => a.id), cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen tema 1', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] },
                       { id: 't2', nombre: 'Sin corregir', trimestre: 0, bloqueId: 'b1', criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [A]: { e1: 7 }, [B]: { e1: 5 } }; g.marcas = { [C]: { e1: 'NP' } }; g.alumnos[0].comentariosEval = ['Bien', '', ''];
      state.ui.appMode = 'inicio'; save(); render(); return document.querySelector('.que-falta')?.innerText || ''; });
    t.ok(/Examen tema 1.*falta 1 nota.*D, Cuatro/s.test(txt), 'avisa de la nota que falta (sin contar NP)', txt);
    t.ok(!/Sin corregir/.test(txt), 'no avisa de actividades sin empezar a corregir');
    t.ok(/1 alumno con nota y sin comentario/.test(txt), 'avisa del comentario pendiente', txt);
  } },

  { nombre: 'calificar', descripcion: 'Calificar (Tarjetas): Intro pasa al siguiente y las notas se guardan', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      state.ui.appMode = 'competencial'; state.ui.tab = 'calificar'; state.ui.calViewMode = 'cards'; save(); render(); });
    await esperar(400);
    await p.locator('[data-cal-col="cuant"]').first().fill('7,5'); await p.keyboard.press('Enter'); await esperar(200);
    t.ok(await p.evaluate(() => document.activeElement?.getAttribute('data-cal-al') === state.grupos[0].alumnos[1].id), 'Intro pasa al siguiente alumno');
    await p.keyboard.type('4'); await p.keyboard.press('Enter'); await esperar(200);
    const notas = await p.evaluate(() => state.grupos[0].alumnos.map(a => state.grupos[0].notasCuant[a.id]?.e1 ?? null));
    t.ok(JSON.stringify(notas) === '[7.5,4,null]', 'las notas se guardan', JSON.stringify(notas));
  } },

  { nombre: 'corregir-desplegable', descripcion: 'Corregir: la puntuación de cada ítem se elige en un desplegable de 0,05 en 0,05 y permite «No presentado»', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: state.ui.trim, bloqueId: 'b0', esExamen: true, criterios: [],
        rubrica: [{ id: 's1', title: 'Pregunta 1', items: [{ id: 'i1', label: 'Ítem 1', max: 2, links: [] }, { id: 'i2', label: 'Ítem 2', max: 0.5, links: [] }], subs: [] }] }];
      g.rubricScores = { [A]: { e1: { i2: 0.33 } } };
      state.ui.appMode = 'corrector'; state.ui.corTab = 'corregir'; state.ui.corExamId = 'e1'; state.ui.corAlId = A; state.ui.corModoPreg = false; save(); render(); });
    await esperar(300);
    const sel = p.locator('select[aria-label^="Puntuación"]');
    t.ok(await sel.count() === 2, 'hay un desplegable por ítem', String(await sel.count()));
    const ops = await sel.first().evaluate(s => [...s.options].map(o => o.textContent));
    t.ok(ops.length === 43 && ops[0] === '—' && ops[1] === 'NP' && ops[2] === '0' && ops[3] === '0,05' && ops[4] === '0,1' && ops[42] === '2', 'va de 0 a 2 de 0,05 en 0,05 y tiene NP', ops.join(' '));
    t.ok(await sel.nth(1).inputValue() === '0.33', 'conserva una nota guardada que no cae en la rejilla (0,33)');
    await sel.first().selectOption('1.75'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[0].id].e1.i1; }) === 1.75, 'guarda la puntuación elegida (1,75)');
    t.ok(await p.locator('select[aria-label^="Puntuación"]').first().inputValue() === '1.75', 'el desplegable muestra lo elegido tras redibujar');
    await p.locator('select[aria-label^="Puntuación"]').first().selectOption('NP'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id; return g.marcas[A].e1 === 'NP' && g.notasCuant[A].e1 === 0; }), '«NP» marca No presentado y la nota del examen es 0');
    t.ok(await p.locator('select[aria-label^="Puntuación"]').first().inputValue() === 'NP', 'con NP marcado el desplegable muestra NP');
    await p.locator('select[aria-label^="Puntuación"]').first().selectOption('1.5'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id; return !(g.marcas[A] || {}).e1 && g.rubricScores[A].e1.i1 === 1.5; }), 'elegir una puntuación quita la marca NP');
    await p.evaluate(() => { state.ui.corAlId = ''; state.ui.corModoPreg = true; state.ui.corPregSel = 'i1'; save(); render(); });
    await esperar(300);
    const filas = p.locator('select.ex-preg-in');
    t.ok(await filas.count() === 3, 'por pregunta: un desplegable por alumno/a');
    await filas.nth(1).selectOption('0.45'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[1].id].e1.i1; }) === 0.45, 'por pregunta: guarda la puntuación');
    await p.locator('select.ex-preg-in').nth(2).selectOption('NP'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], C = g.alumnos[2].id; return g.marcas[C].e1 === 'NP' && g.notasCuant[C].e1 === 0; }), 'por pregunta: NP marca No presentado (nota 0)');
    t.ok(await p.locator('select.ex-preg-in').nth(2).inputValue() === 'NP', 'por pregunta: la fila muestra NP');
    await filas.nth(1).selectOption(''); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[1].id].e1.i1; }) === undefined, '«—» deja el ítem sin puntuar');
  } },

  { nombre: 'rubrica-resumida', descripcion: 'Imprimir rúbrica resumida: puntuaciones y anotaciones, sin el detalle de lo que había que contestar', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(() => {
      const g = state.grupos[0], [A, B] = g.alumnos.map(a => a.id);
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: state.ui.trim, bloqueId: 'b0', esExamen: true, criterios: [],
        rubrica: [{ id: 's1', title: 'Pregunta 1', items: [{ id: 'i1', label: 'Explica la causa', desc: ['DETALLE-LARGO-DE-LA-RESPUESTA'], max: 2, links: [] }], subs: [] }] }];
      g.rubricScores = { [A]: { e1: { i1: 1.5 } }, [B]: { e1: { i1: 2 } } };
      g.examComentarios = { [A]: { e1: 'COMENTARIO-GENERAL', 'e1|i1': 'ANOTACION-PREGUNTA' } };
      cxRecalcAlumno(g, g.actividades[0], A); cxRecalcAlumno(g, g.actividades[0], B);
      const sal = {}; const orig = window.abrirVentanaInforme;
      window.abrirVentanaInforme = (titulo, html) => { sal.titulo = titulo; sal.html = html; };
      cxImprimirRubrica(A, 'e1'); sal.normal = sal.html;
      cxImprimirRubrica(A, 'e1', true); sal.res = sal.html; sal.tituloRes = sal.titulo;
      cxImprimirRubricasTodos('e1'); sal.todos = sal.html;
      cxImprimirRubricasTodos('e1', true); sal.todosRes = sal.html;
      window.abrirVentanaInforme = orig;
      return sal;
    });
    t.ok(r.normal.includes('DETALLE-LARGO-DE-LA-RESPUESTA'), 'la rúbrica normal sigue incluyendo el detalle');
    t.ok(!r.res.includes('DETALLE-LARGO-DE-LA-RESPUESTA'), 'la resumida no incluye el detalle de lo que había que contestar');
    t.ok(r.res.includes('Explica la causa') && r.res.includes('1,5') && r.res.includes('ANOTACION-PREGUNTA') && r.res.includes('COMENTARIO-GENERAL'), 'la resumida conserva pregunta, puntuación y anotaciones del profesor');
    t.ok(/resumen/i.test(r.res) && /resumida/.test(r.tituloRes), 'se identifica como resumen');
    t.ok(r.res.length < r.normal.length + 1500 && r.res.includes('cx-total-box'), 'incluye el total');
    t.ok(r.todos.includes('Cada uno ocupa su propia página'), 'imprimir todas (normal) mantiene la portada');
    t.ok(!r.todosRes.includes('Cada uno ocupa su propia página') && !r.todosRes.includes('DETALLE-LARGO-DE-LA-RESPUESTA'), 'todas resumidas: sin portada ni detalle');
    t.ok((r.todosRes.match(/class="cx-alumno"/g) || []).length === 2 && (r.todosRes.match(/break-before:page/g) || []).length === 1, 'todas resumidas: un bloque por alumno/a corregido y salto de página entre ellos');
  } },

  { nombre: 'accesibilidad', descripcion: 'Accesibilidad WCAG 2 A/AA (axe-core) en las pantallas principales', async fn(t) {
    const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    // Sin animaciones: con ellas se medía el texto a medio aparecer y salían contrastes bajos que no son reales.
    const ctx = await t.navegador.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    const p = await nuevaPagina(ctx);
    let contraste = 0; const bajos = [];   // (los avisos breves se excluyen: mientras se desvanecen son semitransparentes)
    const auditar = async (pant) => {
      await p.addScriptTag({ content: axe });
      const v = await p.evaluate(async () => (await axe.run({ exclude: [['#appToast'], ['#toastGlobal']] }, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => ({ id: v.id, n: v.nodes.length, donde: v.nodes.slice(0, 2).map(n => n.target.join(' ').slice(0, 70)) })));
      const otras = v.filter(x => x.id !== 'color-contrast');
      const cc = v.find(x => x.id === 'color-contrast'); if (cc) { contraste += cc.n; bajos.push(pant + ': ' + cc.donde.join(' | ')); }
      t.ok(!otras.length, `${pant}: sin errores de accesibilidad`, otras.map(x => x.id + '×' + x.n).join(', '));
    };
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 7 } }; save(); });
    // Todas las pestañas del grupo y todos los modos (la pantalla de bienvenida está quitada: si no, se auditaría solo ella).
    for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) {
      await p.evaluate(tab => { _mostrarBienvenida = false; state.ui.appMode = 'competencial'; state.ui.tab = tab; render(); }, tab); await esperar(300); await auditar('Cuaderno · ' + tab); }
    for (const modo of ['inicio', 'corrector', 'programacion', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) {
      await p.evaluate(m => { _mostrarBienvenida = false; state.ui.appMode = m; render(); }, modo); await esperar(300); await auditar('Cuaderno · modo ' + modo); }
    // Ventanas y paneles nuevos.
    await p.evaluate(() => { state.ui.appMode = 'inicio'; render(); abrirCopias(); }); await esperar(500); await auditar('Cuaderno · ventana Copias'); await p.evaluate(() => cerrarCopias());
    await p.evaluate(() => abrirNuevoCurso()); await esperar(300); await auditar('Cuaderno · Empezar curso nuevo'); await p.evaluate(() => ncCerrar());
    await p.evaluate(() => { cronoTogglePanel(); claseIrTab('sorteo'); claseSortear(); }); await esperar(900); await auditar('Cuaderno · Sorteo');
    await p.evaluate(() => { claseIrTab('grupos'); claseCrearGrupos(); }); await esperar(200); await auditar('Cuaderno · Grupos'); await p.evaluate(() => { claseIrTab('crono'); cronoTogglePanel(); });
    await p.evaluate(() => { state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; render(); toggleProyector(); }); await esperar(300); await auditar('Cuaderno · modo proyector'); await p.evaluate(() => toggleProyector());
    await p.evaluate(async () => { await BloqueoPIN.configurar('1234', 5); BloqueoPIN.bloquear(); }); await esperar(300); await auditar('Bloqueo con PIN');
    await p.evaluate(() => { BloqueoPIN.quitar(); document.documentElement.classList.remove('app-bloqueada'); const o = document.getElementById('bloqueoOverlay'); if (o) o.remove(); });
    // Lo mismo en el tema oscuro.
    for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) {
      await p.evaluate(tab => { document.body.setAttribute('data-tema', 'oscuro'); _mostrarBienvenida = false; state.ui.appMode = 'competencial'; state.ui.grupoId = state.grupos[0].id; state.ui.tab = tab; render(); }, tab); await esperar(200); await auditar('Cuaderno (oscuro) · ' + tab); }
    for (const modo of ['inicio', 'corrector', 'programacion', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) {
      await p.evaluate(m => { state.ui.appMode = m; render(); }, modo); await esperar(200); await auditar('Cuaderno (oscuro) · modo ' + modo); }
    await p.evaluate(() => document.body.setAttribute('data-tema', 'claro'));
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Prueba, Ana']); await auditar('Tutoría · grupo');
    for (const e of ['__home__', '__calendario__', '__informe__', '__convivencia__', '__materias__']) { await p.evaluate(e => selectNivel(e), e); await esperar(300); await auditar('Tutoría · ' + e); }
    await p.goto(t.url + '/editor/'); await esperar(1200); await auditar('Editor de exámenes');
    t.ok(contraste === 0, `contraste: ningún texto por debajo de 4,5:1 (${contraste})`, bajos.slice(0, 6).join('\n        '));
    await ctx.close();
  } },

  { nombre: 'actualizacion', descripcion: 'Aviso «Hay una versión nueva · Actualizar»', async fn(t) {
    // Se trabaja sobre una copia de la app, porque la prueba cambia sw.js.
    const copia = fs.mkdtempSync(path.join(os.tmpdir(), 'cuaderno-'));
    fs.cpSync(RAIZ, copia, { recursive: true, filter: s => !/[\\/](\.git|node_modules)([\\/]|$)/.test(s) });
    const swRuta = path.join(copia, 'sw.js'), version = n => fs.writeFileSync(swRuta, fs.readFileSync(swRuta, 'utf8').replace(/CACHE_PREFIJO \+ '\d+'/, `CACHE_PREFIJO + '${n}'`));
    const srv = await servir(copia);
    try {
      version(900);
      const p = await nuevaPagina(t.contexto); await p.goto(srv.url + '/'); await esperar(2500); await p.reload(); await esperar(1500);
      version(901);
      await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); await esperar(3000);
      t.ok(await p.evaluate(() => !!document.getElementById('avisoVersionNueva')), 'aparece el aviso al publicar una versión');
      const recarga = p.waitForNavigation({ timeout: 10000 }).then(() => true).catch(() => false);
      await p.click('#avisoVersionNueva button:has-text("Actualizar")');
      t.ok(await recarga, '«Actualizar» recarga la app');
      await esperar(1500);
      t.ok(JSON.stringify(await p.evaluate(() => caches.keys())) === '["cuaderno-v3-901"]', 'queda solo la caché de la versión nueva');
    } finally { await srv.cerrar(); fs.rmSync(copia, { recursive: true, force: true }); }
  } },
];
