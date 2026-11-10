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
      const p = await nuevaPagina(t.contexto); p.setDefaultTimeout(0);
      await p.goto(t.url + '/tutoria/'); await esperar(1500);
      const r = await rastrearTutoria(p, { modo, completo });
      t.ok(r.clics > (completo ? 1500 : 250) && !r.fallos.length, `[${modo}] el rastreo recorre las pantallas (${r.clics} pulsaciones)`, r.fallos.join('; '));
      if (modo === 'hostil') {
        t.ok(!r.inyectados.length, 'ningún texto se convierte en un elemento de la página o de un documento', r.inyectados.slice(0, 6).join('\n        '));
        t.ok(!r.ejecutados.length, 'ningún texto se ejecuta como código', r.ejecutados.slice(0, 6).join('\n        '));
      } else t.ok(!r.dobles.length, 'ningún texto se escapa dos veces (no se ve «&amp;» ni «&#39;»)', r.dobles.slice(0, 6).join('\n        '));
      t.ok(!p.errores.length, `[${modo}] sin errores de JavaScript`, p.errores.slice(0, 3).join('; '));
      await p.close();
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
    const p = await nuevaPagina(t.contexto);
    let contraste = 0;
    const auditar = async (pant) => {
      await p.addScriptTag({ content: axe });
      const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => ({ id: v.id, n: v.nodes.length })));
      const otras = v.filter(x => x.id !== 'color-contrast');
      contraste += (v.find(x => x.id === 'color-contrast') || { n: 0 }).n;
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
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Prueba, Ana']); await auditar('Tutoría · grupo');
    await p.goto(t.url + '/editor/'); await esperar(1200); await auditar('Editor de exámenes');
    t.ok(contraste <= 15, `contraste: ${contraste} textos por debajo de 4,5:1 (máximo admitido 15)`);
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
