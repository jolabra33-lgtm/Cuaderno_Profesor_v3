/* Pruebas de navegador de la app (Cuaderno + Tutoría). Cada prueba recibe:
     t.url       dirección del servidor de pruebas (la app tal cual, como en GitHub Pages)
     t.contexto  navegador limpio (sin datos), solo para esa prueba
     t.ok(condición, descripción, detalle)   apunta una comprobación
   Se ejecutan con «npm test» (ver tests/README.md). */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { servir, nuevaPagina, esperar, elegir, cuadernoConGrupo, tutoriaConAlumnos, llenarLocalStorage, vaciarRelleno } from './utilidades.mjs';
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

  { nombre: 'tutoria-interfaz', descripcion: 'Tutoría: niveles junto a Inicio, fechas de evaluación (aviso y guardado), botones de los grupos y móvil sin desbordar', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana']);
    const pest = await p.evaluate(() => [...document.querySelectorAll('#nivelTabs .nivel-tab')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    const iNivel = pest.findIndex(x => x.startsWith('1º ESO')), iCal = pest.findIndex(x => x.includes('Calendario'));
    t.ok(pest[0].includes('Inicio') && iNivel === 1 && iCal > iNivel, 'los niveles van justo después de Inicio, antes de las herramientas', JSON.stringify(pest));
    t.ok(await p.evaluate(() => !!document.querySelector('.grupo-tab .tab-top-row .grupo-tab-edit')), 'el ✏ del grupo está en la fila del nombre');
    t.ok(/Pon la fecha de cada sesión/.test(await p.textContent('#evalDatesBar')), 'avisa si las tres fechas de evaluación son iguales');
    await p.fill('#dateEval1', '2026-12-18'); await p.dispatchEvent('#dateEval1', 'change'); await esperar(1300);
    t.ok(!/Pon la fecha de cada sesión/.test(await p.textContent('#evalDatesBar')), 'el aviso se va al poner una fecha distinta');
    await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(() => evalDates['1º ESO'].eval1) === '2026-12-18', 'la fecha de evaluación se guarda sin tocar nada más');
    await p.evaluate(() => { hideWelcomeScreen(); selectNivel('1º ESO'); selectNivel('__segfam__'); }); await esperar(300);
    t.ok(await p.evaluate(() => getComputedStyle(document.getElementById('evalDatesBar')).display === 'none'), 'en Seguimientos no se quedan las fechas del nivel anterior');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.evaluate(() => selectNivel('1º ESO')); await esperar(400);
    const ancho = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    t.ok(ancho[0] <= ancho[1], 'en el móvil (390 px) la página no se sale por la derecha', JSON.stringify(ancho));
    await p.setViewportSize({ width: 1280, height: 800 });
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-equipo-docente', descripcion: 'Tutoría: equipo docente en formato «Apellidos, Nombre», con aviso, cambio automático y orden por apellidos', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana']);
    await p.evaluate(() => { openEquipoDocente('1º ESO', 'A'); _eqAddProf(); _eqAddProf(); }); await esperar(200);
    t.ok(await p.locator('#eqDocenteBody input[placeholder^="Apellidos, Nombre"]').count() === 2, 'el campo pide «Apellidos, Nombre»');
    const campos = p.locator('#eqDocenteBody input[placeholder^="Apellidos, Nombre"]');
    await campos.nth(0).fill('Zapata Ruiz, Luis');
    await campos.nth(1).fill('Ana López Martín'); await esperar(200);
    const aviso = await p.textContent('#eqDocenteBody');
    t.ok(/Cambiar a «López Martín, Ana»/.test(aviso), 'avisa si falta la coma y propone «López Martín, Ana»', aviso.slice(0, 200));
    t.ok(await p.evaluate(() => document.activeElement && document.activeElement.value === 'Ana López Martín'), 'el aviso sale sin perder el cursor del campo');
    await p.locator('#eqDocenteBody button:has-text("Cambiar a")').first().click(); await esperar(200);
    await p.evaluate(() => { _getAsistenciaData('1º ESO', 'A').sesiones.eval1[0].asistio = true; });   // Zapata asistió
    await p.click('#eqDocenteBody button:has-text("Ordenar por apellidos")'); await esperar(200);
    const r = await p.evaluate(() => { const d = _getAsistenciaData('1º ESO', 'A'); return { nombres: d.profesores.map(x => x.nombre), asistio: d.sesiones.eval1.map(x => x.asistio) }; });
    t.ok(JSON.stringify(r.nombres) === JSON.stringify(['López Martín, Ana', 'Zapata Ruiz, Luis']), 'ordena por apellidos', JSON.stringify(r));
    t.ok(r.asistio[1] === true && r.asistio[0] !== true, 'la asistencia a la sesión se mueve con cada profesor/a', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
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

  { nombre: 'del-cuaderno', descripcion: 'Tutoría: «📥 Del Cuaderno» añade a quien falta, completa fecha, NESE y repetición de quien ya estaba, no duplica y se puede deshacer', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria', 'Lopes Vidal, Marta'] });
    await p.evaluate(() => { const al = state.grupos[0].alumnos;
      al[0].fechaNacimiento = '2012-03-15'; al[0].nese = true;
      al[1].fechaNacimiento = '2012-11-02'; al[1].repetidor = true;
      al[2].fechaNacimiento = '2013-01-20'; al[3].fechaNacimiento = '2012-05-05'; save(); });
    await esperar(1200);
    // En Tutoría ya están tres, sin fecha y con el nombre escrito de otra forma; una tiene ya otra fecha.
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['garcia lopez, ana', 'LUIS PÉREZ RUIZ', 'López Vidal, Marta']);
    await p.evaluate(() => { data['1º ESO'].A[1].fecha = '2012-01-01'; });
    const tabla = () => p.evaluate(() => data['1º ESO'].A.map(a => ({ n: a.nombre, f: a.fecha, nese: a.nese, rep: a.repetidor, ids: (a.idsCuaderno || []).length })));
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    const vista = (await p.textContent('#impCuadPlan')).replace(/\s+/g, ' ');
    t.ok(/2 nuevos/.test(vista) && /se completa/i.test(vista) && /distint/i.test(vista), 'la vista previa dice qué se añade, qué se completa y qué es distinto', vista.slice(0, 300));
    t.ok(await p.isChecked('#importCuadernoOverlay [data-duda]') === false, 'un nombre solo parecido (Lopes ↔ López) se pregunta y no se marca de entrada');
    await p.check('#importCuadernoOverlay [data-duda]'); await esperar(200);
    await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(1200);
    let l = await tabla();
    t.ok(l.length === 4, 'no duplica a quien ya estaba aunque el nombre esté en mayúsculas o en otro orden', JSON.stringify(l));
    t.ok(l[0].f === '2012-03-15' && l[0].nese === 'Sí', 'a quien ya estaba se le completan la fecha de nacimiento y NESE', JSON.stringify(l[0]));
    t.ok(l[1].f === '2012-01-01' && l[1].rep === 'Sí', 'un dato distinto no se cambia sin pedirlo; lo vacío sí se completa', JSON.stringify(l[1]));
    t.ok(l[2].f === '2012-05-05' && l[2].n === 'López Vidal, Marta', 'el nombre parecido confirmado se completa sin cambiarle el nombre', JSON.stringify(l[2]));
    t.ok(l[3].n === 'Sanz Martí, Íria' && l[3].f === '2013-01-20', 'quien falta se añade con su fecha de nacimiento', JSON.stringify(l[3]));
    t.ok(l.every(a => a.ids === 1), 'todos quedan vinculados con su identificador del Cuaderno', JSON.stringify(l));
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    await p.check('#impCuadSustituir'); await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(800);
    t.ok((await tabla())[1].f === '2012-11-02', '«Sustituir los datos distintos» pone el dato del Cuaderno');
    await p.evaluate(() => { _undoPop(); _undoPop(); }); await esperar(300);
    l = await tabla();
    t.ok(l.length === 3 && !l[0].f, 'Ctrl+Z deshace la importación', JSON.stringify(l));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-familia', descripcion: 'Tutoría: contactos de la familia traídos del Cuaderno, editables en el seguimiento y guardados', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis'] });
    await p.evaluate(() => { const a = state.grupos[0].alumnos[0];
      a.familia[0] = { parentesco: 'Madre', nombre: 'López Sanz, Marta', email: 'marta@correo.es' };
      a.familia[1] = { parentesco: 'Padre', nombre: 'García Ruiz, Juan', email: '' }; save(); });
    await esperar(1200);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana']);
    await p.evaluate(() => { data['1º ESO'].A[0].familia = [{ parentesco: 'Madre', nombre: 'López Sanz, Marta', email: 'MARTA@correo.es', telefono: '600111222' }]; });
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    t.ok(/1 contacto de la familia \(García Ruiz, Juan\)/.test(await p.textContent('#impCuadPlan')), 'la vista previa dice qué contacto falta (el que ya está no se repite)');
    await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(600);
    let fam = await p.evaluate(() => data['1º ESO'].A.map(a => (a.familia || []).map(f => f.nombre + '|' + f.telefono)));
    t.ok(JSON.stringify(fam[0]) === JSON.stringify(['López Sanz, Marta|600111222', 'García Ruiz, Juan|']), 'añade el contacto que faltaba sin tocar el que ya estaba', JSON.stringify(fam));
    t.ok(fam[1] && fam[1].length === 0, 'el alumno/a nuevo sin contactos en el Cuaderno empieza sin contactos', JSON.stringify(fam));
    await p.evaluate(() => openSegFamilia('1º ESO', 'A', 0)); await esperar(300);
    t.ok(await p.locator('#famContactos .fam-contacto').count() === 2, 'el seguimiento con familia muestra los contactos');
    await p.locator('#famContactos .fam-contacto').nth(1).locator('input[type=tel]').fill('611 333 444');
    await esperar(1300); await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(() => data['1º ESO'].A[0].familia[1].telefono) === '611 333 444', 'un teléfono escrito en el seguimiento se guarda');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'cuaderno-a-tutoria', descripcion: 'Del Cuaderno a Tutoría: notas, faltas, convivencia y comentarios (en el mismo navegador y por archivos, varios a la vez) y equipo docente automático', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis'] });
    const { materia, archivo } = await p.evaluate(async () => {
      const g = state.grupos[0], cr = getCatalogo(g.catalogoKey).ces[0].criterios[0].id, [ana, luis] = g.alumnos;
      state.profesorNombreGlobal = 'Ana López Martín';
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant[ana.id] = { e1: 3 }; g.notas[ana.id] = { e1: { [cr]: 3 } };
      g.notasCuant[luis.id] = { e1: 8 }; g.notas[luis.id] = { e1: { [cr]: 8 } };
      g.fechasTrimestre = [{ inicio: '2026-09-08', fin: '2026-12-19' }, { inicio: '', fin: '' }, { inicio: '', fin: '' }];
      g.asistencia = { '2026-10-01': { [ana.id]: { estado: 'falta_no_justificada' } }, '2026-10-02': { [ana.id]: { estado: 'retraso' } } };
      g.convivencia = [{ id: 'c1', alumnoId: ana.id, fecha: '2026-10-05', tipo: 'ac' }];
      ana.comentariosEval[0] = 'Necesita organizar mejor el estudio.'; ana.fechaNacimiento = '2012-03-15';
      ana.familia[0] = { parentesco: 'Madre', nombre: 'López Sanz, Marta', email: 'marta@correo.es' };
      save(); await guardarCopiaParaTutoria();
      return { materia: getCatalogo(g.catalogoKey).materia, archivo: paqueteParaTutoria(g, false) };
    });
    t.ok(archivo.version === 2 && !('familia' in archivo.alumnos[0]) && !('fechaNacimiento' in archivo.alumnos[0]), 'el archivo «Para la tutoría» es de la versión 2 y no lleva datos personales ni contactos');
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis']);
    // 1) Mismo navegador, sin archivos
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    t.ok(await p.isChecked('#impCuadTraerMateria'), '«📥 Del Cuaderno» ofrece traer también lo de tu materia');
    await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(900);
    const resumen = await p.textContent('#impCResumen');
    t.ok(/Se añade al equipo docente: López Martín, Ana/.test(resumen), 'propone añadir al profesor/a al equipo docente en «Apellidos, Nombre»', resumen);
    await p.click('#impCOk'); await esperar(600);
    const r = await p.evaluate(m => { const ana = data['1º ESO'].A[0], pm = (ana.porMateria || {})[m] || {};
      return { pend: ana.pendientes1, eval1: ana.eval1, fam: (ana.familia || []).length, faltas: pm.faltas && pm.faltas['1'], conv: pm.convivencia && pm.convivencia['1'], com: pm.comentarios && pm.comentarios['1'],
        equipo: _getAsistenciaData('1º ESO', 'A').profesores.map(x => x.nombre + '|' + x.materia) }; }, materia);
    t.ok(r.pend.includes(materia) && r.eval1 === 1, 'la materia suspensa queda pendiente en la I Evaluación', JSON.stringify(r));
    t.ok(r.faltas && r.faltas.injustificadas === 1 && r.faltas.retrasos === 1, 'llegan las faltas y retrasos de la evaluación', JSON.stringify(r.faltas));
    t.ok(r.conv && r.conv.ac === 1 && r.com === 'Necesita organizar mejor el estudio.', 'llegan la convivencia y el comentario de evaluación', JSON.stringify(r));
    t.ok(r.fam === 1, 'y los contactos de la familia');
    t.ok(JSON.stringify(r.equipo) === JSON.stringify(['López Martín, Ana|' + materia]), 'el profesor/a entra en el equipo docente con su materia', JSON.stringify(r.equipo));
    // 2) Dos archivos de otras materias a la vez
    const otro = (mat, prof) => ({ name: 'para-tutoria-' + mat + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...archivo, materia: mat, profesor: prof })) });
    const elegir = p.waitForEvent('filechooser');
    await p.evaluate(() => importarDelCuaderno());
    await (await elegir).setFiles([otro('Matemáticas', 'Pérez Gil, Luis'), otro('Inglés', 'Marta Ruiz Sanz')]); await esperar(600);
    t.ok(/archivo 1 de 2/.test(await p.textContent('#impCT')), 'con varios archivos, se revisan de uno en uno («archivo 1 de 2»)');
    await p.click('#impCOk'); await esperar(500);
    t.ok(/archivo 2 de 2/.test(await p.textContent('#impCT')), 'y después el siguiente');
    await p.click('#impCOk'); await esperar(600);
    const r2 = await p.evaluate(() => ({ mats: Object.keys(data['1º ESO'].A[0].porMateria || {}).sort(), equipo: _getAsistenciaData('1º ESO', 'A').profesores.map(x => x.nombre) }));
    t.ok(r2.mats.length === 3 && r2.mats.includes('Inglés') && r2.mats.includes('Matemáticas'), 'cada materia guarda lo suyo', JSON.stringify(r2));
    t.ok(r2.equipo.includes('Pérez Gil, Luis') && r2.equipo.includes('Ruiz Sanz, Marta'), 'los nombres del profesorado se pasan a «Apellidos, Nombre»', JSON.stringify(r2.equipo));
    await p.evaluate(() => _undoPop()); await esperar(200);
    t.ok(await p.evaluate(() => Object.keys(data['1º ESO'].A[0].porMateria || {}).length) === 2, 'Ctrl+Z deshace la última importación');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-informacion-equipo', descripcion: 'Tutoría: «📬 Información del equipo docente» (recibido y pendiente por materia, recordatorio por correo, vista por alumno/a) y relleno del seguimiento con familia', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis']);
    const mats = await p.evaluate(() => {
      const ms = getMateriasParaNivel('1º ESO', 'A'); const [m1, m2] = ms; const [ana, luis] = data['1º ESO'].A;
      const reg = (n, f, c, com) => ({ profesor: 'Zapata Ruiz, Luis', generado: '2026-12-15T10:00:00.000Z', notas: { 1: n }, faltas: { 1: f, curso: f }, convivencia: { 1: c, curso: c }, comentarios: { 1: com } });
      ana.porMateria = { [m1]: reg(3, { justificadas: 0, injustificadas: 2, retrasos: 1 }, { ac: 1, rc: 0, pa: 1 }, 'Debe entregar las tareas.') };
      luis.porMateria = { [m1]: reg(7, { justificadas: 1, injustificadas: 0, retrasos: 0 }, { ac: 0, rc: 2, pa: 0 }, '') };
      const d = _getAsistenciaData('1º ESO', 'A');
      d.profesores.push({ id: 'p1', nombre: 'Zapata Ruiz, Luis', materia: m1, correo: 'zapata@gva.es' }, { id: 'p2', nombre: 'Gil Mora, Eva', materia: m2, correo: 'gil@gva.es' });
      ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: null, justificacion: '' }, { asistio: null, justificacion: '' }));
      openInformacionEquipo('1º ESO', 'A'); return [m1, m2, ms.length];
    }); await esperar(300);
    const fila = await p.locator(`#infEquipoBody tr[data-materia="${mats[0]}"]`).innerText();
    t.ok(/Recibido/.test(fila) && /2\/2/.test(fila), 'la materia que ha enviado datos sale como recibida (2/2 con nota)', fila);
    t.ok(await p.locator('#infEquipoBody tr[data-recibido="0"]').count() === mats[2] - 1, 'las demás salen como pendientes');
    const correo = await p.evaluate(() => _infCorreoRecordatorio('1º ESO', 'A', '1'));
    t.ok(correo.correos.length === 1 && correo.correos[0] === 'gil@gva.es' && /Para%20la%20tutor/.test(correo.url), 'el recordatorio va solo a quien falta, con el correo ya redactado', JSON.stringify(correo.correos));
    await p.click('#infEquipoBody button:has-text("Por alumno")'); await esperar(200);
    const vista = await p.textContent('#infEquipoBody');
    t.ok(/2 sin justificar/.test(vista) && /1 partes/.test(vista) && /Debe entregar las tareas/.test(vista), 'la vista por alumno/a muestra faltas, convivencia y comentario', vista.slice(0, 300));
    await p.click('#infEquipoBody button:has-text("Llevar al seguimiento")'); await esperar(400);
    const borrador = await p.evaluate(m => _segCtx.draft.materias.find(x => x.nombre === m), mats[0]);
    t.ok(/I Ev\.: 3/.test(borrador.examenes) && borrador.trabajo === 'Debe entregar las tareas.' && /AC: 1/.test(borrador.comportamiento), 'el seguimiento con familia se rellena con lo recibido', JSON.stringify(borrador));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
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
    // El profesor/a corrige la nota de Ana (3 → 6) y reenvía el archivo: la materia sale y el número baja.
    archivo.alumnos[0].notas = { 1: 6 };
    await p.evaluate(o => _tImpCuadernoModal(o, 'para-tutoria.json'), archivo); await esperar(500);
    await p.click('#impCOk'); await esperar(600);
    const ana = await p.evaluate(() => { const a = data['1º ESO'].A[0]; return [a.pendientes1.length, a.eval1]; });
    t.ok(JSON.stringify(ana) === '[0,0]', 'al reenviar un aprobado, se quita la materia y baja el número de suspensas', JSON.stringify(ana));
  } },

  { nombre: 'tutoria-csv', descripcion: 'Tutoría: un CSV de Excel en Windows (ANSI) conserva las tildes y una columna sin título no se confunde', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', []);
    const leer = (bytes) => p.evaluate(async bytes => {
      openImportModal();
      readCSVFile(new File([new Uint8Array(bytes)], 'lista.csv'));
      await new Promise(r => setTimeout(r, 300));
      return { cab: importState.headers, filas: importState.rows, nombre: importState.mapping.nombre, fecha: importState.mapping.fecha };
    }, bytes);
    // «;García Núñez, Íñigo;12/03/2012» en Windows-1252 (como lo guarda Excel en español), con una primera columna sin título.
    const ansi = [...Buffer.from(';Alumno;Fecha de nacimiento\r\n;García Núñez, Íñigo;12/03/2012\r\n', 'latin1')];
    let r = await leer(ansi);
    t.ok(r.filas[0] && r.filas[0][1] === 'García Núñez, Íñigo', 'las tildes y la ñ se leen bien en un CSV ANSI', JSON.stringify(r.filas));
    t.ok(r.nombre === 1 && r.fecha === 2, 'la columna sin título no se asigna al nombre ni a la fecha', JSON.stringify([r.nombre, r.fecha]));
    const utf8 = [0xEF, 0xBB, 0xBF, ...Buffer.from('Alumno;Fecha\r\nSanz Martí, Íria;20/01/2013\r\n', 'utf8')];
    r = await leer(utf8);
    t.ok(r.cab[0] === 'Alumno' && r.filas[0][0] === 'Sanz Martí, Íria', 'un CSV en UTF-8 con BOM se sigue leyendo bien', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-buscar', descripcion: 'Tutoría: «Buscar alumno…» encuentra por el nombre, sin tildes ni mayúsculas', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria']);
    await p.fill('#alumnoSearch', 'GARCIA'); await esperar(300);
    const vis = () => p.evaluate(() => [...document.querySelectorAll('#mainContent table tbody tr[data-idx]')].filter(r => getComputedStyle(r).display !== 'none').map(r => data['1º ESO'].A[+r.dataset.idx].nombre));
    let v = await vis();
    t.ok(v.length === 1 && v[0] === 'García López, Ana', '«GARCIA» encuentra solo a García López', JSON.stringify(v));
    t.ok(/1\/3/.test(await p.textContent('#searchResultCount')), 'el contador dice 1/3');
    await p.fill('#alumnoSearch', 'iria'); await esperar(300);
    v = await vis();
    t.ok(v.length === 1 && v[0] === 'Sanz Martí, Íria', '«iria» encuentra a Íria', JSON.stringify(v));
    await p.fill('#alumnoSearch', ''); await esperar(300);
    t.ok((await vis()).length === 3, 'al borrar la búsqueda se ve todo el grupo');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
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
    await p.click('#tabContent button:has-text("+ Examen alternativo")'); await esperar(400);
    await p.check('input[name="altTipo"][value="nese"]'); await p.click('#altSi'); await esperar(1500);
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
      return { hayModelo: !!mbModelo(act, 'B'), a: qs(G), b: qs(B), eyebrow: (B.body.find(n => n.type === 'title') || {}).eyebrow, numB: mbModelo(act, 'B') && mbModelo(act, 'B').num }; });
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
      return { ordenGuardado: mbModelo(act, 'B').orden._raiz, b: B.body.filter(n => n.type === 'question').map(n => n.id), texto: B.body.find(n => n.id === 'q2').text, aviso: (window.__dialogosLog || []).some(m => /solo cuenta el ORDEN/.test(m)) }; });
    t.ok(r.b.join() === r.ordenGuardado.join() && r.texto === 'Define longitud' && r.aviso, 'en el modelo B el orden manual se guarda y los cambios de texto no (con aviso)', JSON.stringify(r));
    // Reparto y corrección.
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = ''; render(); }); await esperar(300);
    await p.click('button:has-text("Alternar A/B por lista")'); await esperar(300);
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0]; return { deB: g.alumnos.filter(a => mbModeloDe(act, a.id) === 'B').map(a => a.nombre), botones: document.querySelectorAll('.mb-ab').length }; });
    t.ok(r.deB.join() === 'Beta, Bruno,Delta, Dani' && r.botones === 4, '«Alternar por lista» reparte A, B, A, B y cada alumno/a tiene su selector', JSON.stringify(r));
    await p.evaluate(() => { const g = state.grupos[0]; mbSetModelo(g.alumnos[2].id, 'B'); }); await esperar(200);
    const orden = () => p.evaluate(() => { const act = state.grupos[0].actividades[0], ids = [];
      (function w(l) { l.forEach(n => { if (n.fuenteId && /^q/.test(n.fuenteId) && !ids.includes(n.fuenteId)) ids.push(n.fuenteId); (n.items || []).forEach(it => { if (it.fuenteId && /^q/.test(it.fuenteId) && !ids.includes(it.fuenteId)) ids.push(it.fuenteId); }); w(n.subs || []); }); })(mbRubricaVista(act, state.ui.corAlId));
      return ids; });
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[1].id; render(); }); await esperar(300);
    const vistaB = await orden(), textoB = await p.evaluate(() => document.getElementById('tabContent').innerText);
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[0].id; render(); }); await esperar(300);
    const vistaA = await orden(), textoA = await p.evaluate(() => document.getElementById('tabContent').innerText);
    const ordenFinal = await p.evaluate(() => mbModelo(state.grupos[0].actividades[0], 'B').orden._raiz);
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
      save(); render(); mbAlternarPlano(); return g.alumnos.filter(a => mbModeloDe(g.actividades[0], a.id) === 'B').map(a => a.nombre).sort(); });
    t.ok(r.join() === 'Beta, Bruno,Gamma, Gema', '«Alternar según el plano» reparte en damero (ni al lado ni delante el mismo modelo)', JSON.stringify(r));
    // Rúbrica hecha a mano (sin enlaces): se enlaza por el texto sin tocar lo corregido.
    r = await p.evaluate(async () => { const g = state.grupos[0], act = g.actividades[0];
      const antes = JSON.stringify(g.rubricScores), ids = cxItemsFlat(act.rubrica).map(i => i.id).join();
      (function w(l) { l.forEach(n => { delete n.fuenteId; (n.items || []).forEach(it => { delete it.fuenteId; }); w(n.subs || []); }); })(act.rubrica);
      const sinEnlace = mbRubricaEnlazada(act);
      state.ui.corTab = 'diseno'; state.ui.corModelo = ''; render(); await new Promise(r => setTimeout(r, 2200));
      const boton = [...document.querySelectorAll('#tabContent button')].find(b => /Enlazar la rúbrica/.test(b.textContent));
      await mbEnlazarRubrica(); await new Promise(r => setTimeout(r, 300));
      document.getElementById('mbSi').click(); await new Promise(r => setTimeout(r, 300));
      return { boton: !!boton, sinEnlace, enlazada: mbRubricaEnlazada(act), sinEnlazar: mbSinEnlazar(act), mismosIds: cxItemsFlat(act.rubrica).map(i => i.id).join() === ids, mismasNotas: JSON.stringify(g.rubricScores) === antes,
        bloqueQ3: (cxNodosFlat(act.rubrica).find(x => (x.n.items || []).some(it => it.fuenteId === 's31')) || {}).n.fuenteId }; });
    t.ok(r.boton && !r.sinEnlace && r.enlazada && r.sinEnlazar === 0 && r.bloqueQ3 === 'q3', 'una rúbrica sin enlazar se enlaza con el diseño (ítems y bloques)', JSON.stringify(r));
    t.ok(r.mismosIds && r.mismasNotas, 'enlazar no cambia ningún ítem ni lo ya corregido', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'modelos-abc', descripcion: 'Modelos A, B y C: tres órdenes distintos, máximo tres, reparto A/B/C (lista y plano), corrección en el orden del C, quitar un modelo y paso del formato antiguo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema', 'Delta, Dani', 'Eta, Eva', 'Zeta, Zoe'] });
    await p.evaluate(async () => { _mostrarBienvenida = false; const g = state.grupos[0];
      g.actividades = [{ id: 'e1', nombre: 'Examen', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [] }];
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = 'e1'; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const q = (id, txt) => ({ id, type: 'question', title: '', text: txt, points: '2', children: [] });
      ex.body = ex.body.filter(n => n.type === 'title').concat([q('q1', 'Define latitud'), q('q2', 'Define longitud'), q('q3', 'Explica la escala'), q('q4', 'Explica el clima'), q('q5', 'Comenta el mapa')]);
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 500)); });
    await p.click('#tabContent button:has-text("Importar a la rúbrica")'); await esperar(800);
    await p.evaluate(() => { const b = document.querySelector('.dlg-si'); if (b) b.click(); }); await esperar(600);
    await p.evaluate(() => { state.ui.corTab = 'diseno'; render(); }); await esperar(2000);
    await p.click('#tabContent button:has-text("+ Modelo B")'); await esperar(2200);
    await p.click('#tabContent button:has-text("+ Modelo C")'); await esperar(2200);
    let r = await p.evaluate(async () => { const act = state.grupos[0].actividades[0], qs = e => e.body.filter(n => n.type === 'question').map(n => n.id);
      const A = (await exGet('e1')).exam, B = (await exGet('e1:B')).exam, C = (await exGet('e1:C')).exam;
      return { letras: mbLista(act).map(m => m.letra), a: qs(A), b: qs(B), c: qs(C), eyC: (C.body.find(n => n.type === 'title') || {}).eyebrow, viendo: state.ui.corModelo,
        masModelos: [...document.querySelectorAll('#tabContent button')].some(b => /\+ Modelo/.test(b.textContent)) }; });
    t.ok(r.letras.join() === 'B,C' && r.viendo === 'C' && /Modelo C/.test(r.eyC), 'se crean los modelos B y C, y el C lleva «Modelo C» encima del título', JSON.stringify(r));
    t.ok(new Set([r.a.join(), r.b.join(), r.c.join()]).size === 3 && r.b.slice().sort().join() === r.a.join() && r.c.slice().sort().join() === r.a.join(), 'los tres modelos tienen las mismas preguntas en tres órdenes distintos', JSON.stringify(r));
    t.ok(!r.masModelos, 'con A, B y C ya no se ofrece crear otro modelo (máximo tres)');
    // Reparto A/B/C por lista.
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = ''; render(); }); await esperar(300);
    await p.click('button:has-text("Alternar A/B/C por lista")'); await esperar(300);
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0];
      return { rep: g.alumnos.map(a => mbModeloDe(act, a.id)).join(''), botones: [...document.querySelectorAll('.mb-ab')].map(x => x.querySelectorAll('button').length) }; });
    t.ok(r.rep === 'ABCABC' && r.botones.length === 6 && r.botones.every(n => n === 3), '«Alternar por lista» reparte A, B, C, A, B, C y cada alumno/a tiene el selector A/B/C', JSON.stringify(r));
    // Corregir a Gema (modelo C): la rúbrica sale en el orden del C; la nota no cambia.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], al = g.alumnos[2]; state.ui.corAlId = al.id; render();
      const vista = mbRubricaVista(act, al.id).flatMap(n => [n.fuenteId, ...(n.items || []).map(i => i.fuenteId)]).filter(id => /^q/.test(id || '')).filter((v, i, a) => a.indexOf(v) === i);
      const sc = g.rubricScores[al.id] = g.rubricScores[al.id] || {}; sc[act.id] = {}; cxItemsFlat(act.rubrica).forEach(it => { sc[act.id][it.id] = Number(it.max); });
      cxRecalcAlumno(g, act, al.id);
      return { vista, ordenC: mbModelo(act, 'C').orden._raiz, texto: document.getElementById('tabContent').innerText, nota: g.notasCuant[al.id][act.id],
        imp: cxRubricaBodyHTML(g, act, al, {}) }; });
    t.ok(r.vista.join() === r.ordenC.join() && /Modelo C/.test(r.texto) && /Modelo C/.test(r.imp), 'al corregir e imprimir, el modelo C sale en su orden y lo indica', JSON.stringify({ vista: r.vista, ordenC: r.ordenC }));
    t.ok(r.nota === 10, 'con todo bien en el modelo C la nota es 10: la rúbrica es la misma', String(r.nota));
    // Plano con tres modelos: ni el de al lado ni el de delante tienen el mismo.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], pos = {};
      g.alumnos.forEach((a, i) => { pos[a.id] = { fila: Math.floor(i / 3), col: i % 3 }; }); g.plano.posiciones = pos; state.ui.corAlId = ''; save(); render(); mbAlternarPlano();
      const m = (f, c) => mbModeloDe(act, g.alumnos[f * 3 + c].id); const mal = [];
      for (let f = 0; f < 2; f++) for (let c = 0; c < 3; c++) { if (c < 2 && m(f, c) === m(f, c + 1)) mal.push(`${f},${c} lado`); if (f < 1 && m(f, c) === m(f + 1, c)) mal.push(`${f},${c} delante`); }
      return { mal, filas: [0, 1].map(f => [0, 1, 2].map(c => m(f, c)).join('')) }; });
    t.ok(!r.mal.length && r.filas[0].length === 3 && new Set(r.filas[0]).size === 3, '«Alternar según el plano» con tres modelos: ni al lado ni delante el mismo', JSON.stringify(r));
    // Quitar el B: su alumnado pasa al A y el C pasa a llamarse B (con su alumnado y su orden).
    r = await p.evaluate(async () => { const g = state.grupos[0], act = g.actividades[0]; window.__dialogosAuto = { confirmar: true };
      const ordenC = mbModelo(act, 'C').orden._raiz.join(), deC = g.alumnos.filter(a => mbModeloDe(act, a.id) === 'C').map(a => a.id).join(), deB = g.alumnos.filter(a => mbModeloDe(act, a.id) === 'B').map(a => a.id);
      state.ui.corTab = 'diseno'; state.ui.corModelo = 'B'; render(); await new Promise(r => setTimeout(r, 2000));
      await exQuitarModelo(); await new Promise(r => setTimeout(r, 2000));
      return { letras: mbLista(act).map(m => m.letra).join(), ordenB: mbModelo(act, 'B').orden._raiz.join(), ordenC, nuevosB: g.alumnos.filter(a => mbModeloDe(act, a.id) === 'B').map(a => a.id).join(), deC,
        antiguosBenA: deB.every(id => mbModeloDe(act, id) === 'A'), disenoC: !!(await exGet('e1:C')), viendo: state.ui.corModelo }; });
    t.ok(r.letras === 'B' && r.ordenB === r.ordenC && r.nuevosB === r.deC && r.antiguosBenA && !r.disenoC && r.viendo === '', 'al quitar el modelo B, su alumnado pasa al A y el C pasa a ser el B', JSON.stringify(r));
    // Datos de la versión anterior (act.modeloB) pasan al formato nuevo sin perder nada.
    r = await p.evaluate(() => { const g = state.grupos[0], ids = g.alumnos.map(a => a.id);
      g.actividades.push({ id: 'e2', nombre: 'Viejo', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [],
        modeloB: { orden: { _raiz: ['q2', 'q1'] }, alumnos: [ids[1], ids[3]], numA: { q1: '1.', q2: '2.' }, numB: { q1: '2.', q2: '1.' }, examId: 'xB' } });
      migrarEstado(); const a = g.actividades.find(x => x.id === 'e2');
      return { sinViejo: !a.modeloB, b: mbModelo(a, 'B'), numA: a.modelos.numA, quien: ids.map(id => mbModeloDe(a, id)).join('') }; });
    t.ok(r.sinViejo && r.b && r.b.orden._raiz.join() === 'q2,q1' && r.b.examId === 'xB' && r.b.num.q1 === '2.' && r.numA.q1 === '1.' && r.quien === 'ABABAA', 'un modelo B de la versión anterior se conserva: orden, numeración y quién lo hace', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'examen-otro-dia', descripcion: 'Examen alternativo «otro día»: se crea para quien no vino, con fecha y en blanco, sin alumnado NESE; sale en la misma lista y se corrige con su rúbrica', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema'] });
    await p.evaluate(async () => { _mostrarBienvenida = false; const g = state.grupos[0]; g.alumnos[1].nese = true;
      g.actividades = [{ id: 'e1', nombre: 'Examen Unidad 1', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [], escalarA10: true,
        rubrica: [{ id: 's1', title: 'Preguntas', items: [{ id: 'i1', label: 'Pregunta general', max: 10, links: [] }], subs: [] }] }];
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = 'e1'; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      ex.body = ex.body.filter(n => n.type === 'title').concat([{ id: 'q1', type: 'question', title: '', text: 'Pregunta del día del examen', points: '10', children: [] }]);
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 500)); });
    await p.click('#tabContent button:has-text("+ Examen alternativo")'); await esperar(400);
    let r = await p.evaluate(() => ({ nombre: document.getElementById('altNombre').value, fecha: document.getElementById('altFecha').value,
      marcados: [...document.querySelectorAll('#altAlumnos input:checked')].length }));
    t.ok(r.nombre === 'Otro día' && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) && r.marcados === 0, 'por defecto es «Otro día», con la fecha de hoy y sin nadie marcado (tampoco el alumnado NESE)', JSON.stringify(r));
    await p.fill('#altNombre', 'Unidad 1 · recuperación de falta'); await p.fill('#altFecha', '2026-11-20');
    await p.check('input[name="altInicio"][value="blanco"]');
    await p.check('#altAlumnos input[value="' + await p.evaluate(() => state.grupos[0].alumnos[0].id) + '"]');
    await p.click('#altSi'); await esperar(2200);
    r = await p.evaluate(async () => { const g = state.grupos[0], act = g.actividades[0], v = act.variantes[0], d = await exGet('e1:' + v.id);
      return { tipo: v.tipo, fecha: v.fecha, nombre: v.nombre, alumnos: v.alumnos.map(id => g.alumnos.find(a => a.id === id).nombre), editando: state.ui.corVarId === v.id,
        preguntas: d ? d.exam.body.filter(n => n.type === 'question').length : -1, avisoNese: /Beta, Bruno/.test((document.querySelector('.cx-aviso-nese') || {}).innerText || ''),
        ofreceAnadir: !!document.querySelector('.cx-aviso-nese select, .cx-aviso-nese button.btn[onclick*="cxAnadirNese"]') }; });
    t.ok(r.tipo === 'ausencia' && r.fecha === '2026-11-20' && r.nombre === 'Unidad 1 · recuperación de falta' && r.alumnos.join() === 'Alfa, Ana' && r.editando, 'se crea el examen alternativo para Ana, con su nombre y su fecha, y se abre para diseñarlo', JSON.stringify(r));
    t.ok(r.preguntas === 0, 'empieza en blanco (no copia las preguntas del general)', JSON.stringify(r));
    t.ok(r.avisoNese && !r.ofreceAnadir, 'el alumnado NESE no entra en el examen de otro día, y el aviso NESE no lo ofrece como versión adaptada', JSON.stringify(r));
    // Misma lista de corrección, con su rúbrica.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0]; cxItemsFlat(act.variantes[0].rubrica)[0].label = 'Pregunta del otro día';
      state.ui.corTab = 'corregir'; state.ui.corAlId = ''; state.ui.corVarId = ''; render();
      const lista = document.getElementById('tabContent').innerText;
      state.ui.corAlId = g.alumnos[0].id; render(); const ana = document.getElementById('tabContent').innerText;
      state.ui.corAlId = g.alumnos[2].id; render(); const gema = document.getElementById('tabContent').innerText;
      return { filas: (lista.match(/Corregir/g) || []).length, badge: /Unidad 1 · recuperación de falta · 20\/11\/2026/.test(lista), ana: /Pregunta del otro día/.test(ana) && /otro día/.test(ana), gema: /Pregunta general/.test(gema) && !/Pregunta del otro día/.test(gema) }; });
    t.ok(r.badge && r.filas >= 3, 'Ana sale en la misma lista de corrección, con el nombre y la fecha de su examen', JSON.stringify(r));
    t.ok(r.ana && r.gema, 'Ana se corrige con la rúbrica del otro día y Gema con la general', JSON.stringify(r));
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
    // La lista completa se crea al ir a usarlo (rapidez): antes solo están «—», «NP» y el valor guardado.
    t.ok(await sel.first().evaluate(s => s.options.length) === 2 && await sel.nth(1).evaluate(s => s.options.length) === 3, 'antes de usarlo, el desplegable solo lleva —, NP y lo guardado');
    const llenoCon = async (i, como) => { await p.evaluate(() => render()); const s = p.locator('select[aria-label^="Puntuación"]').nth(i); await como(s); return s.evaluate(s => s.options.length); };
    t.ok(await llenoCon(0, s => s.dispatchEvent('pointerdown')) === 43 && await llenoCon(0, s => s.dispatchEvent('touchstart')) === 43 && await llenoCon(0, s => s.focus()) === 43,
      'se rellena al pulsarlo con el ratón o el dedo y al llegar con el teclado');
    { const n = await llenoCon(1, s => s.focus()), v = await sel.nth(1).inputValue(); t.ok(n === 14 && v === '0.33', 'al rellenarse (de 0 a 0,5) conserva lo elegido, aunque no caiga en la rejilla', n + ' ' + v); }
    await p.evaluate(() => render());
    const ops = await sel.first().evaluate(s => { s.dispatchEvent(new Event('focusin', { bubbles: true })); return [...s.options].map(o => o.textContent); });
    t.ok(ops.length === 43 && ops[0] === '—' && ops[1] === 'NP' && ops[2] === '0' && ops[3] === '0,05' && ops[4] === '0,1' && ops[42] === '2', 'va de 0 a 2 de 0,05 en 0,05 y tiene NP', ops.join(' '));
    t.ok(await sel.nth(1).inputValue() === '0.33', 'conserva una nota guardada que no cae en la rejilla (0,33)');
    await elegir(sel.first(), '1.75'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[0].id].e1.i1; }) === 1.75, 'guarda la puntuación elegida (1,75)');
    t.ok(await p.locator('select[aria-label^="Puntuación"]').first().inputValue() === '1.75', 'el desplegable muestra lo elegido tras redibujar');
    await elegir(p.locator('select[aria-label^="Puntuación"]').first(), 'NP'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id; return g.marcas[A].e1 === 'NP' && g.notasCuant[A].e1 === 0; }), '«NP» marca No presentado y la nota del examen es 0');
    t.ok(await p.locator('select[aria-label^="Puntuación"]').first().inputValue() === 'NP', 'con NP marcado el desplegable muestra NP');
    await elegir(p.locator('select[aria-label^="Puntuación"]').first(), '1.5'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id; return !(g.marcas[A] || {}).e1 && g.rubricScores[A].e1.i1 === 1.5; }), 'elegir una puntuación quita la marca NP');
    await p.evaluate(() => { state.ui.corAlId = ''; state.ui.corModoPreg = true; state.ui.corPregSel = 'i1'; save(); render(); });
    await esperar(300);
    const filas = p.locator('select.ex-preg-in');
    t.ok(await filas.count() === 3, 'por pregunta: un desplegable por alumno/a');
    await elegir(filas.nth(1), '0.45'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[1].id].e1.i1; }) === 0.45, 'por pregunta: guarda la puntuación');
    await elegir(p.locator('select.ex-preg-in').nth(2), 'NP'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], C = g.alumnos[2].id; return g.marcas[C].e1 === 'NP' && g.notasCuant[C].e1 === 0; }), 'por pregunta: NP marca No presentado (nota 0)');
    t.ok(await p.locator('select.ex-preg-in').nth(2).inputValue() === 'NP', 'por pregunta: la fila muestra NP');
    await elegir(filas.nth(1), ''); await esperar(200);
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

  { nombre: 'rubrica-niveles', descripcion: 'Rúbrica por niveles de logro: crear, corregir pinchando casillas, afinar, cambiar valores y pesos, imprimir, plantillas y cambio de tipo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const [A, B] = await cuadernoConGrupo(p, t.url);
    const cr = await p.evaluate(() => getCatalogo('GeH_1ESO').ces[0].criterios.slice(0, 2).map(c => c.id));
    // Crear desde el formulario «Nuevo examen», con dos criterios marcados.
    await p.evaluate(cr => { state.ui.appMode = 'corrector'; state.ui.corTab = 'crear';
      state.ui.corForm = { nombre: 'Exposición oral', bloqueId: '', sda: '', fecha: '', plantillaId: '', criterios: cr, tipoRub: 'niveles' }; save(); render(); }, cr);
    await esperar(300);
    t.ok(await p.locator('input[name="cxfTipo"][value="niveles"]').isChecked(), 'el formulario ofrece el tipo «por niveles»');
    await p.locator('#cxfBtn').click(); await esperar(300);
    const r0 = await p.evaluate(() => { const a = state.grupos[0].actividades[0]; return { esExamen: a.esExamen, f: a.rubrica[0].formato, niv: a.rubrica[0].niveles.map(l => l.nombre + ':' + l.valor).join(','), cats: a.rubrica[0].items.map(i => i.max + '|' + i.links.map(l => l.critId).join('')), tab: state.ui.corTab }; });
    t.ok(r0.esExamen && r0.f === 'niveles' && r0.tab === 'editor', 'se crea un examen con rúbrica por niveles y se abre el editor');
    t.ok(r0.niv === 'Experto:4,Avanzado:3,Aprendiz:2,Novel:1', 'niveles por defecto 4-3-2-1', r0.niv);
    t.ok(r0.cats.length === 2 && r0.cats[0] === '5|' + cr[0] && r0.cats[1] === '5|' + cr[1], 'una categoría por criterio, 50 % cada una y vinculada', r0.cats.join(' '));
    t.ok(await p.locator('table.cxn-editor').count() === 1 && await p.locator('table.cxn-editor tbody textarea').count() === 2 * 5, 'el editor muestra la tabla (nombre + 4 casillas por categoría)');
    await p.locator('table.cxn-editor tbody tr').first().locator('td textarea').first().fill('Habla con un volumen adecuado TEXTO-EXPERTO');
    await p.locator('table.cxn-editor tbody tr').first().locator('td textarea').first().dispatchEvent('change');
    const ids = await p.evaluate(() => { const r = state.grupos[0].actividades[0].rubrica[0]; return { act: state.grupos[0].actividades[0].id, c1: r.items[0].id, c2: r.items[1].id, n: r.niveles.map(l => l.id) }; });
    t.ok(await p.evaluate(ids => state.grupos[0].actividades[0].rubrica[0].items[0].celdas[ids.n[0]], ids) === 'Habla con un volumen adecuado TEXTO-EXPERTO', 'se guarda el descriptor de la casilla');
    // Corregir pinchando casillas.
    await p.evaluate(A => { state.ui.corTab = 'corregir'; state.ui.corAlId = A; save(); render(); }, A); await esperar(300);
    const filas = p.locator('table.cxn-corr tbody tr');
    t.ok(await filas.count() === 2 && await p.locator('table.cxn-corr td.cxn-op button').count() === 8, 'al corregir sale la tabla con 2 × 4 casillas');
    await filas.nth(0).locator('td.cxn-op button').nth(1).click(); await esperar(200);
    await p.locator('table.cxn-corr tbody tr').nth(1).locator('td.cxn-op button').nth(0).click(); await esperar(200);
    const nota = () => p.evaluate(({ A, act }) => { const g = state.grupos[0]; return { n: g.notasCuant[A][act], c: g.notas[A][act], sc: g.rubricScores[A][act] }; }, { A, act: ids.act });
    let r = await nota();
    t.ok(r.sc[ids.c1] === 3.75 && r.sc[ids.c2] === 5 && r.n === 8.75, 'Avanzado (3/4 de 5) + Experto = 8,75', JSON.stringify(r));
    t.ok(r.c[cr[0]] === 7.5 && r.c[cr[1]] === 10, 'la nota de cada criterio sale de su categoría', JSON.stringify(r.c));
    t.ok(await p.locator('table.cxn-corr td.cxn-op.on').count() === 2 && await p.locator('table.cxn-corr td.cxn-op.on button[aria-pressed="true"]').count() === 2, 'las casillas elegidas se marcan (también para lectores de pantalla)');
    // Afinar con el desplegable.
    await elegir(p.locator('table.cxn-corr tbody tr').first().locator('select'), '3.4'); await esperar(200);
    r = await nota();
    t.ok(r.sc[ids.c1] === 3.4 && r.n === 8.4, 'afinar: 3,4 puntos', JSON.stringify(r));
    t.ok((await p.locator('.cxn-entre').first().textContent()).includes('entre Avanzado y Aprendiz') && await p.locator('td.cxn-op.parcial').count() === 2, 'una nota afinada se ve «entre» dos niveles');
    // Cambiar el valor de los niveles y el peso: lo corregido sigue en su nivel.
    await p.locator('table.cxn-corr tbody tr').first().locator('td.cxn-op button').nth(1).click(); await esperar(200);
    await p.evaluate(() => { state.ui.corTab = 'editor'; save(); render(); }); await esperar(200);
    await p.evaluate(ids => { cxnSetNivel(ids.n[0], 'valor', '10'); cxnSetNivel(ids.n[1], 'valor', '7'); cxnSetNivel(ids.n[3], 'valor', '0'); }, ids);
    r = await nota();
    t.ok(r.sc[ids.c1] === 3.5 && r.sc[ids.c2] === 5 && r.n === 8.5, 'al cambiar los valores (10-7-2-0), Avanzado pasa a valer 7/10 y Experto sigue al máximo', JSON.stringify(r));
    await p.evaluate(ids => cxnSetPeso(ids.c1, '30'), ids);
    r = await nota();
    t.ok(r.sc[ids.c1] === 2.1 && r.n === 8.88, 'al cambiar el peso a 30 % la categoría sigue en Avanzado (2,1 de 3) y la nota se convierte a 10', JSON.stringify(r));
    t.ok((await p.locator('.pill').filter({ hasText: 'Suma de pesos' }).textContent()).includes('80 %'), 'el editor avisa de que los pesos suman 80 %');
    await p.evaluate(() => cxnIgualarPesos());
    r = await nota();
    t.ok(r.sc[ids.c1] === 3.5 && r.n === 8.5, 'repartir los pesos a partes iguales', JSON.stringify(r));
    // Imprimir.
    const imp = await p.evaluate(({ A, act }) => { const sal = {}; const o = window.abrirVentanaInforme; window.abrirVentanaInforme = (ti, h) => { sal.h = h; };
      cxImprimirRubrica(A, act); sal.n = sal.h; cxImprimirRubrica(A, act, true); sal.r = sal.h; window.abrirVentanaInforme = o; return sal; }, { A, act: ids.act });
    t.ok(imp.n.includes('cxn-imp-on') && imp.n.includes('TEXTO-EXPERTO') && (imp.n.match(/cxn-imp-on/g) || []).length >= 3, 'la rúbrica impresa marca la casilla de cada categoría');
    t.ok(imp.r.includes('cxn-imp-chip') && imp.r.includes('Avanzado') && !imp.r.includes('TEXTO-EXPERTO'), 'la resumida dice el nivel sin los descriptores');
    // Corregir por categoría (todo el grupo).
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = ''; state.ui.corModoPreg = true; state.ui.corPregSel = ''; save(); render(); }); await esperar(300);
    t.ok(await p.locator('.cxn-mini-btn').count() === 12, 'por categoría: botones de nivel para cada alumno/a');
    await p.locator('.cxn-mini-btn').nth(4 + 2).click(); await esperar(200);
    t.ok(await p.evaluate(({ B, act, c1 }) => state.grupos[0].rubricScores[B][act][c1], { B, act: ids.act, c1: ids.c1 }) === 1, 'por categoría: pulsar «Aprendiz» guarda sus puntos (2/10 de 5)');
    await p.evaluate(() => { state.ui.corModoPreg = false; save(); render(); });
    // Estadísticas: reparto por niveles.
    await p.evaluate(() => { state.ui.cxVerEstadisticas = true; render(); }); await esperar(200);
    t.ok(await p.getByText('Reparto por niveles').count() === 1, 'las estadísticas incluyen el reparto por niveles');
    // Plantilla reutilizable en otro examen.
    await p.evaluate(() => { window.pedirTexto = async () => 'Exposición oral'; window.confirmar = async () => true; window.mostrarAviso = () => {}; });
    await p.evaluate(act => cxGuardarComoPlantilla(act), ids.act); await esperar(100);
    await p.evaluate(act => cxGuardarComoPlantilla(act), ids.act); await esperar(100);
    t.ok(await p.evaluate(() => state.plantillasRubrica.length) === 1, 'guardar con el mismo nombre sustituye la plantilla en vez de duplicarla');
    await p.evaluate(() => { const pl = state.plantillasRubrica[0]; state.ui.corTab = 'crear'; state.ui.corForm = { nombre: 'Proyecto', bloqueId: '', sda: '', fecha: '', plantillaId: pl.id, criterios: [] }; save(); render(); });
    await esperar(200); await p.locator('#cxfBtn').click(); await esperar(300);
    const r2 = await p.evaluate(() => { const [a, b] = state.grupos[0].actividades; const sinId = n => JSON.stringify(n.map(l => ({ ...l, id: 0 }))); return { f: b.rubrica[0].formato, mismo: sinId(b.rubrica[0].niveles) === sinId(a.rubrica[0].niveles) && b.rubrica[0].niveles[0].id !== a.rubrica[0].niveles[0].id, txt: Object.values(b.rubrica[0].items[0].celdas).includes('Habla con un volumen adecuado TEXTO-EXPERTO'), otroId: b.rubrica[0].items[0].id !== a.rubrica[0].items[0].id }; });
    t.ok(r2.f === 'niveles' && r2.mismo && r2.txt && r2.otroId, 'un examen nuevo desde la plantilla copia niveles, valores y descriptores', JSON.stringify(r2));
    // Cambio de tipo: lo corregido se conserva.
    await p.evaluate(act => { state.ui.corExamId = act; state.ui.corTab = 'editor'; save(); render(); }, ids.act); await esperar(200);
    await p.evaluate(() => cxCambiarTipoRubrica()); await esperar(200);
    r = await nota();
    const r3 = await p.evaluate(() => { const a = state.grupos[0].actividades[0]; return { f: a.rubrica[0].formato || '', desc: (a.rubrica[0].items[0].desc || []).join(' ') }; });
    t.ok(!r3.f && r3.desc.includes('TEXTO-EXPERTO') && r.n === 8.5, 'pasar a «por puntos» conserva notas y guarda los descriptores', JSON.stringify(r3));
    await p.evaluate(() => cxCambiarTipoRubrica()); await esperar(200);
    r = await nota();
    t.ok(await p.evaluate(() => state.grupos[0].actividades[0].rubrica[0].formato) === 'niveles' && r.n === 8.5, 'y volver a «por niveles» también');
    // Accesibilidad del editor y de la corrección.
    const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    for (const [nom, fn, zona] of [['editor', () => { state.ui.corTab = 'editor'; render(); }, '.cxn-card'], ['corregir', () => { state.ui.corTab = 'corregir'; state.ui.corAlId = state.grupos[0].alumnos[0].id; render(); }, '#tabContent']]) {
      await p.evaluate(fn); await esperar(300); await p.addScriptTag({ content: axe });
      const v = await p.evaluate(async zona => (await axe.run({ include: [[zona]] }, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + '×' + v.nodes.length + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')), zona);
      t.ok(!v.length, `accesibilidad (${nom})`, v.join('; '));
    }
  } },

  { nombre: 'rubrica-niveles-programacion', descripcion: 'Examen traído de la Programación: al abrirlo en el Corrector se puede elegir rúbrica por niveles', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(() => {
      const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios.slice(0, 3).map(c => c.id);
      const pa = { id: 'pa1', nombre: 'Proyecto de investigación', tipo: 'Prueba objetiva / examen', esExamen: true, criterios: cr.map(c => ({ critId: c, peso: 100 })) };
      const act = progCrearActividadEnGrupo(g, pa, state.ui.trim); save();
      const viejo = { id: 'old', nombre: 'Examen antiguo', trimestre: state.ui.trim, esExamen: true, bloqueId: g.bloques[0].id, criterios: [], rubrica: cxRubricaDesdeCriterios(cr.map(c => ({ critId: c, peso: 100 })), g.catalogoKey) };
      g.actividades.push(viejo);
      return { id: act.id, cr, pend: cxTipoPendiente(g, act), pendViejo: cxTipoPendiente(g, viejo) };
    });
    t.ok(r.pend && r.pendViejo, 'la rúbrica creada automáticamente queda pendiente de elegir tipo (también en exámenes traídos antes)');
    await p.evaluate(id => cxAbrirDesdeOtroModo(id), r.id); await esperar(300);
    t.ok(await p.evaluate(() => state.ui.corTab) === 'editor' && await p.getByText('¿Con qué tipo de rúbrica quieres corregir').count() === 1, '«Abrir en el Corrector» lleva al editor y pregunta el tipo');
    await p.getByRole('button', { name: '▦ Por niveles de logro' }).click(); await esperar(300);
    const r2 = await p.evaluate(id => { const g = state.grupos[0], a = g.actividades.find(x => x.id === id); return { f: a.rubrica[0].formato, cats: a.rubrica[0].items.map(i => i.links[0].critId), pend: cxTipoPendiente(g, a) }; }, r.id);
    t.ok(r2.f === 'niveles' && r2.cats.join() === r.cr.join() && !r2.pend, 'pasa a rúbrica por niveles con una categoría por criterio', JSON.stringify(r2));
    t.ok(await p.locator('table.cxn-editor').count() === 1 && await p.getByText('¿Con qué tipo de rúbrica quieres corregir').count() === 0, 'se ve la tabla y ya no pregunta');
    await p.evaluate(() => cxElegirTipoInicial('old', 'puntos'));
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return !cxTipoPendiente(g, g.actividades.find(a => a.id === 'old')); }), 'elegir «por puntos» deja de preguntar');
    await p.evaluate(() => { const g = state.grupos[0]; const pa = { id: 'pa2', nombre: 'Otro', tipo: 'Prueba objetiva / examen', esExamen: true, criterios: [{ critId: getCatalogo('GeH_1ESO').ces[0].criterios[0].id, peso: 100 }] };
      const a = progCrearActividadEnGrupo(g, pa, state.ui.trim); g.rubricScores = { [g.alumnos[0].id]: { [a.id]: { [a.rubrica[0].items[0].id]: 5 } } }; window._a2 = a.id; });
    t.ok(await p.evaluate(() => !cxTipoPendiente(state.grupos[0], state.grupos[0].actividades.find(a => a.id === window._a2))), 'si ya hay alumnado corregido, no pregunta');
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
  { nombre: 'puntos-extra', descripcion: 'Puntos extra: se apuntan en Calificar y en Resultados, suben la nota, se ven en los informes y sobreviven a la papelera', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => {
      const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 6.5 }, [g.alumnos[1].id]: { e1: 9.5 } };
      state.ui.appMode = 'competencial'; state.ui.tab = 'calificar'; state.ui.calAct = 'e1'; save(); render();
    });
    // Calificar → ➕ Puntos extra
    await p.getByRole('button', { name: /Puntos extra/ }).first().click();
    const filas = p.locator('.modal-overlay tbody tr');
    t.ok(await filas.count() === 3, 'la ventana lista a todo el alumnado');
    await filas.nth(0).locator('[data-pts]').fill('1');
    await filas.nth(1).locator('[data-pts]').fill('1');
    await p.locator('#extraMotivoComun').fill(`Voluntaria <img src=x onerror=top.__x()> "exposición"`);
    await filas.nth(2).locator('[data-pts]').fill('abc');
    await p.locator('#extraSi').click();
    t.ok(await p.locator('.modal-overlay tbody tr').count() === 3, 'con un valor no válido avisa y no cierra');
    await p.locator('.dlg-overlay #dlgOk').click();
    await filas.nth(2).locator('[data-pts]').fill('');
    await p.locator('#extraSi').click(); await esperar(200);
    const r1 = await p.evaluate(ids => { const g = state.grupos[0], a = g.actividades[0];
      return { ex: g.extras, n0: notaActividad(g, ids[0], a), n1: notaActividad(g, ids[1], a), guardada: g.notasCuant[ids[0]].e1,
        pills: document.querySelectorAll('.extra-pill').length, colado: !!document.querySelector('img[onerror]') }; }, ids);
    t.ok(r1.ex[ids[0]].e1.pts === 1 && /Voluntaria/.test(r1.ex[ids[0]].e1.motivo), 'se guardan los puntos y el motivo común', JSON.stringify(r1.ex));
    t.ok(!r1.ex[ids[2]], 'quien no tiene puntos no guarda nada');
    t.ok(r1.n0 === 7.5 && r1.guardada === 6.5, 'la nota del examen sube 6,5 + 1 = 7,5 y la nota corregida no se toca', JSON.stringify(r1));
    t.ok(r1.n1 === 10, 'la nota nunca pasa de 10 (9,5 + 1 = 10)');
    t.ok(r1.pills === 2 && !r1.colado, 'Calificar muestra «+1 extra» y el motivo no se cuela como código');
    // Resultados → extra de la evaluación desde la ficha del alumno/a
    await p.evaluate(ids => { state.ui.tab = 'resultados'; state.ui.resAl = ids[0]; save(); render(); }, ids);
    const campo = p.locator('[data-extra="eval"][data-clave="0"] [data-extra-pts]');
    await campo.fill('0,5'); await campo.dispatchEvent('change'); await esperar(200);
    const r2 = await p.evaluate(ids => { const g = state.grupos[0];
      return { t: notaTrimestre(g, ids[0], 0), sin: notaTrimestreSinExtra(g, ids[0], 0), f: notaFinal(g, ids[0]),
        texto: document.getElementById('tabContent').textContent,
        inf: informeAlumnoBodyHTML(g, g.alumnos[0]), det: informeDetalladoBodyHTML(g, g.alumnos[0], 0) }; }, ids);
    t.ok(r2.sin === 7.5 && r2.t === 8, 'la evaluación suma el extra: 7,5 + 0,5 = 8', JSON.stringify([r2.sin, r2.t]));
    t.ok(r2.f === 8, 'la nota final recoge la evaluación con su extra');
    t.ok(/7,5 \+ 0,5 = 8,0/.test(r2.texto), 'Resultados explica la cuenta');
    t.ok(/incluye \+1 extra/.test(r2.inf) && /incluye \+0,5 extra/.test(r2.inf), 'el informe del alumno/a indica los extras');
    t.ok(/Puntos extra/.test(r2.det) && /6,5 \+ 1 extra = <strong>7,5/.test(r2.det), 'el informe detallado desglosa los extras');
    // Papelera: borrar y restaurar al alumno/a y la actividad conserva los extras
    const r3 = await p.evaluate(async ids => { window.__dialogosAuto = { confirmar: true };
      await delAlumno(ids[0]); let g = grupoActual(); const borrado = !g.extras[ids[0]] && !g.extrasEval[ids[0]];
      restaurarAlumnoPapelera(0); g = grupoActual();
      const vuelve = g.extras[ids[0]]?.e1?.pts === 1 && g.extrasEval[ids[0]]?.['0']?.pts === 0.5;
      await delActividad('e1'); g = grupoActual(); const sinAct = !g.extras[ids[1]]?.e1;
      restaurarActividadPapelera(0); g = grupoActual();
      return { borrado, vuelve, sinAct, actVuelve: g.extras[ids[1]]?.e1?.pts === 1 }; }, ids);
    t.ok(r3.borrado && r3.vuelve, 'borrar y restaurar al alumno/a conserva sus extras', JSON.stringify(r3));
    t.ok(r3.sinAct && r3.actVuelve, 'borrar y restaurar la actividad conserva sus extras', JSON.stringify(r3));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },

  { nombre: 'comentarios-sda-resumen', descripcion: 'Comentarios de la rúbrica con color, SdA plegable solo en exámenes y resumen del cálculo de la nota en los informes', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    await p.evaluate(ids => {
      const g = state.grupos[0], cr = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.bloques = [{ id: 'b0', label: 'Exámenes', peso: 70 }, { id: 'b1', label: 'Actividades diarias', peso: 30 }];
      g.actividades = [
        { id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }],
          rubrica: [{ id: 's1', title: 'A', items: [{ id: 'i1', label: 'Pregunta 1', max: 10, critId: cr }] }] },
        { id: 'e2', nombre: 'Examen 2', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] },
        { id: 'a1', nombre: 'Actividad 1', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b1', esExamen: false, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [ids[0]]: { e1: 7, e2: 9 } }; g.rubricScores = { [ids[0]]: { e1: { i1: 7 } } }; g.notas = { [ids[0]]: { a1: { [cr]: 8 } } };
      g.examComentarios = { [ids[1]]: { 'e1|i1': 'a < b\nsegunda <img src=x onerror=top.__x()>' } };
      state.ui.appMode = 'corrector'; state.ui.corTab = 'corregir'; state.ui.corExamId = 'e1'; state.ui.corAlId = ids[0]; save(); render();
    }, ids);
    await esperar(300);
    // 1) Comentario de un ítem: parte en rojo y salto de línea
    const ed = p.locator('.ex-coment .coment-rico-ed').first();
    await ed.click(); await p.keyboard.type('Bien. Revisa la fecha');
    await p.evaluate(() => { const e = document.querySelector('.ex-coment .coment-rico-ed'), n = e.firstChild, i = n.textContent.indexOf('Revisa');
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, n.textContent.length); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await p.locator('.ex-coment').first().getByRole('button', { name: 'Letra en rojo' }).click();
    await p.locator('.cx-coment-general .coment-rico-ed').click();
    await p.keyboard.type('Comentario general');
    await p.mouse.click(5, 5); await esperar(200);
    const r1 = await p.evaluate(ids => { const g = state.grupos[0], c = g.examComentarios[ids[0]];
      return { c, imp: cxRubricaBodyHTML(g, g.actividades[0], g.alumnos[0], {}), viejo: cxRubricaBodyHTML(g, g.actividades[0], g.alumnos[1], {}) }; }, ids);
    t.ok(/<span style="color: ?rgb\(185, 28, 28\);?">Revisa la fecha<\/span>/.test(r1.c['e1|i1']) && /^Bien\. /.test(r1.c['e1|i1']), 'el comentario del ítem guarda el texto en rojo', JSON.stringify(r1.c));
    t.ok(r1.c.e1 === 'Comentario general', 'el comentario general sin formato se guarda como texto, como antes', JSON.stringify(r1.c));
    t.ok(/color: ?rgb\(185, 28, 28\)/.test(r1.imp) && /Comentario general/.test(r1.imp), 'la rúbrica impresa lleva el color');
    t.ok(/a &lt; b<br>segunda &lt;img/.test(r1.viejo), 'un comentario antiguo de texto plano se imprime igual (con < y saltos de línea)', r1.viejo.match(/✎[^\n]*/)?.[0]);
    // 2) Programación: la sección de SdA solo sale en los exámenes y va plegada
    await p.evaluate(() => {
      const pr = progNueva('Prog', 'GeH_1ESO'), s1 = progSdaDefault(0), s2 = progSdaDefault(0); s1.titulo = 'SdA Uno'; s2.titulo = 'SdA Dos'; pr.sdas = [s1, s2];
      const a1 = progActividadDefault(); a1.nombre = 'Normal'; a1.sdaIds = [s1.id];
      const a2 = progActividadDefault(); a2.nombre = 'Conjunto'; a2.esExamen = true; a2.sdaIds = [s1.id, s2.id];
      pr.actividades = [a1, a2]; state.programaciones = [pr];
    });
    const r2 = await p.evaluate(() => { const pr = state.programaciones[0], [a1, a2] = pr.actividades;
      const plegada = progActividadCardHTML(0, a2, pr, pr.sdas[0].id, 0, 2);
      progToggleActividadSdas(a2.id);
      const abierta = progActividadCardHTML(0, a2, pr, pr.sdas[0].id, 0, 2);
      return { normal: progActividadCardHTML(0, a1, pr, pr.sdas[0].id, 0, 2), plegada, abierta }; });
    t.ok(!/Situaciones de Aprendizaje que cubre/.test(r2.normal), 'una actividad que no es examen no muestra la sección de SdA');
    t.ok(/Situaciones de Aprendizaje que cubre — 2 marcadas/.test(r2.plegada) && !/progToggleActividadSda\(/.test(r2.plegada), 'en un examen sale plegada, con el resumen de las SdA marcadas');
    t.ok((r2.abierta.match(/progToggleActividadSda\(/g) || []).length === 2, 'al desplegarla se pueden marcar las SdA');
    // 3) Resumen del cálculo en los dos informes
    const r3 = await p.evaluate(ids => { const g = state.grupos[0], al = g.alumnos[0], txt = h => { const d = document.createElement('div'); d.innerHTML = h; d.querySelectorAll('style').forEach(s => s.remove()); return d.textContent.replace(/\s+/g, ' '); };
      return { det: txt(informeDetalladoBodyHTML(g, al, 0)), ind: txt(informeAlumnoBodyHTML(g, al)), fin: txt(resumenCalculoNotaHTML(g, al, 'final')), n: notaTrimestre(g, al.id, 0) }; }, ids);
    t.ok(/\(7 \+ 9\) \/ 2 = 8/.test(r3.det) && /8 × 0,7 = 5,6/.test(r3.det) && /8 × 0,3 = 2,4/.test(r3.det) && /5,6 \+ 2,4 = 8/.test(r3.det) && r3.n === 8,
      'el informe detallado explica la cuenta: (7 + 9) / 2 = 8 × 0,7 = 5,6; 8 × 0,3 = 2,4; 5,6 + 2,4 = 8', r3.det.slice(0, 600));
    t.ok(/De dónde sale la nota/.test(r3.ind) && /5,6 \+ 2,4 = 8/.test(r3.ind), 'el informe individual lleva el mismo resumen');
    t.ok(/Nota final/.test(r3.fin) && /Sin nota todavía: 2ª evaluación, 3ª evaluación/.test(r3.fin), 'el resumen de la nota final reparte entre las evaluaciones con nota', r3.fin);
    t.ok(!p.errores.length && !(await p.evaluate(() => window.__x)), 'sin errores de JavaScript ni código colado', p.errores.slice(0, 3).join('; '));
  } },

  { nombre: 'documentos-programacion', descripcion: 'Programación de Aula: modelo y Propuesta Pedagógica con enlace y PDF guardado en la app (ver, exportar, importar, duplicar, quitar)', async fn(t) {
    // Un PDF de verdad, de 3 páginas, hecho por el propio navegador.
    const gen = await t.contexto.newPage();
    await gen.setContent('<h1>Modelo de programación</h1>' + '<p style="page-break-after:always">Página</p>'.repeat(2) + '<p>Fin</p>');
    const pdf = await gen.pdf({ format: 'A4' }); await gen.close();
    const p = await nuevaPagina(t.contexto);
    await p.goto(t.url + '/'); await esperar(1500);
    await p.evaluate(() => { _mostrarBienvenida = false; const pr = progNueva('Prog 1º ESO', 'GeH_1ESO'); state.programaciones = [pr];
      state.ui.appMode = 'programacion'; state.ui.progTab = 'detalle'; state.ui.progId = pr.id; save(); render(); });
    await esperar(300);
    const txt = await p.textContent('#app');
    t.ok(txt.includes('Documentos de referencia') && txt.includes('Modelo de Programación de Aula') && txt.includes('Propuesta Pedagógica') && !/Propuesta Didáctica/i.test(txt), 'la programación tiene los dos huecos: Modelo y Propuesta Pedagógica');
    // Guardar el PDF del modelo.
    await p.setInputFiles('input[aria-label="⬆ Guardar el PDF en la app: Modelo de Programación de Aula"]', { name: 'modelo.pdf', mimeType: 'application/pdf', buffer: pdf });
    await p.waitForFunction(() => progDocArchivo(state.programaciones[0], 'modelo'), null, { timeout: 5000 }).catch(() => {});
    const r1 = await p.evaluate(async () => { const a = progDocArchivo(state.programaciones[0], 'modelo'); const rec = a && await exGet('prog:doc:' + a.id);
      return { nombre: a && a.nombre, tam: a && a.tamano, ok: !!(rec && progDocDatosValidos(rec.doc.datos)), enLS: (localStorage.getItem(KEY) || '').includes('JVBERi0') }; });
    t.ok(r1.nombre === 'modelo.pdf' && r1.tam === pdf.length && r1.ok, 'el PDF se guarda en la app (en la base de datos de los diseños)', JSON.stringify(r1));
    t.ok(!r1.enLS, 'el PDF no va en localStorage ni en el estado (solo su referencia)');
    // Un archivo que no es PDF no se guarda.
    await p.setInputFiles('input[aria-label="⬆ Guardar el PDF en la app: Propuesta Pedagógica"]', { name: 'falso.pdf', mimeType: 'application/pdf', buffer: Buffer.from('esto no es un pdf') });
    await esperar(400);
    t.ok(await p.evaluate(() => !progDocArchivo(state.programaciones[0], 'propuesta')) && await p.locator('.dlg-overlay').count() === 1, 'un archivo que no es PDF se rechaza con un aviso');
    await p.locator('.dlg-overlay button').first().click(); await esperar(200);
    // Enlace de OneDrive: sin https se completa; uno que no es web se rechaza.
    const enlace = p.locator('input[aria-label="Enlace: Propuesta Pedagógica"]');
    await enlace.fill('onedrive.live.com/redir?resid=ABC'); await enlace.press('Tab'); await esperar(300);
    t.ok(await p.evaluate(() => progDoc(state.programaciones[0], 'propuesta').enlace) === 'https://onedrive.live.com/redir?resid=ABC'
      && await p.locator('a:has-text("Abrir en OneDrive")').getAttribute('href') === 'https://onedrive.live.com/redir?resid=ABC', 'el enlace se guarda (con https://) y sale «Abrir en OneDrive»');
    await p.locator('input[aria-label="Enlace: Modelo de Programación de Aula"]').fill('javascript:alert(1)');
    await p.locator('input[aria-label="Enlace: Modelo de Programación de Aula"]').press('Tab'); await esperar(300);
    { const e = await p.evaluate(() => progDoc(state.programaciones[0], 'modelo').enlace), n = await p.locator('.dlg-overlay').count(); t.ok(!e && n === 1, 'un enlace que no es una dirección web se rechaza', JSON.stringify({ e, n, html: await p.evaluate(() => [...document.querySelectorAll('.dlg-overlay')].map(x => x.textContent.slice(0, 80))) })); }
    await p.locator('.dlg-overlay button').first().click(); await esperar(200);
    // Ver el PDF dentro de la app.
    await p.click('button:has-text("Ver el PDF")');
    await p.waitForFunction(() => document.querySelectorAll('.prog-doc-visor canvas').length > 0, null, { timeout: 15000 }).catch(() => {});
    const v = await p.evaluate(() => ({ paginas: document.querySelectorAll('.prog-doc-visor .prog-doc-pagina').length, lienzos: document.querySelectorAll('.prog-doc-visor canvas').length, descargar: !!document.querySelector('.prog-doc-visor a[download="modelo.pdf"]') }));
    t.ok(v.paginas === 3 && v.lienzos >= 1 && v.descargar, 'el visor muestra las 3 páginas del PDF y permite descargarlo', JSON.stringify(v));
    await p.keyboard.press('Escape'); await esperar(200);
    t.ok(await p.locator('.prog-doc-visor').count() === 0, 'Escape cierra el visor');
    // Una copia manipulada con un enlace «javascript:» no se muestra como enlace.
    await p.evaluate(() => { state.programaciones[0].documentos.propuesta.enlace = 'javascript:window.__x=1'; render(); });
    t.ok(await p.locator('a[href^="javascript"]').count() === 0, 'un enlace «javascript:» guardado en una copia manipulada no se muestra');
    await p.evaluate(() => { state.programaciones[0].documentos.propuesta.enlace = 'https://onedrive.live.com/redir?resid=ABC'; save(); });
    // Las copias de seguridad completas llevan el PDF (como los diseños de examen) y lo devuelven al importarlas.
    const r2 = await p.evaluate(async () => { const a = progDocArchivo(state.programaciones[0], 'modelo'), clave = 'prog:doc:' + a.id;
      const copia = JSON.parse(JSON.stringify({ ...state, _examenesDiseno: exTodosSync() || await exLeerTodos() }));
      const va = copia._examenesDiseno.some(r => r.key === clave);
      await exBorrar(clave); const borrado = !(await exGet(clave));
      await exGuardarVarios(copia._examenesDiseno); const vuelve = !!(await exGet(clave));
      await exCopiaDiaria(true); const diaria = (await exTx('readonly', s => s.getAll(), 'copias')).some(c => c.disenos.some(r => r.key === clave));
      return { va, borrado, vuelve, diaria }; });
    t.ok(r2.va && r2.borrado && r2.vuelve, 'la copia de seguridad completa lleva el PDF y lo restaura', JSON.stringify(r2));
    t.ok(!r2.diaria, 'la copia diaria de los diseños no duplica los PDF');
    // Exportar la programación (.json) con su PDF e importarla: nueva programación, PDF con id nuevo.
    await p.evaluate(() => { state.ui.progTab = 'lista'; render(); });
    t.ok(await p.locator('button:has-text("📄 Modelo")').count() === 1 && await p.locator('button:has-text("📄 Propuesta Pedagógica")').count() === 1, 'el listado tiene accesos rápidos a los dos documentos');
    const [desc] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Exportar (.json)")')]);
    const json = JSON.parse(fs.readFileSync(await desc.path(), 'utf8'));
    const idOrig = await p.evaluate(() => progDocArchivo(state.programaciones[0], 'modelo').id);
    t.ok(json.documentosPDF && json.documentosPDF[idOrig] && json.documentosPDF[idOrig].startsWith('data:application/pdf;base64,'), 'la programación exportada lleva el PDF dentro');
    const tmp = path.join(os.tmpdir(), 'prog-con-pdf-' + Date.now() + '.json'); fs.writeFileSync(tmp, JSON.stringify(json));
    await p.setInputFiles('input[type=file][onchange^="progImportarArchivo"]', tmp); await esperar(800); fs.unlinkSync(tmp);
    const r3 = await p.evaluate(async () => { const n = state.programaciones[1]; const a = n && progDocArchivo(n, 'modelo'); const rec = a && await exGet('prog:doc:' + a.id);
      return { hay: state.programaciones.length, id: a && a.id, ok: !!(rec && progDocDatosValidos(rec.doc.datos)), enlace: n && progDoc(n, 'propuesta').enlace }; });
    t.ok(r3.hay === 2 && r3.id && r3.id !== idOrig && r3.ok && r3.enlace === 'https://onedrive.live.com/redir?resid=ABC', 'al importarla, llegan el PDF (con id nuevo) y el enlace', JSON.stringify(r3));
    // Duplicar comparte el PDF; quitarlo de una no lo borra de la otra; eliminar la última que lo usa sí lo borra.
    await p.evaluate(() => progDuplicar(state.programaciones[0].id)); await esperar(200);
    const r4 = await p.evaluate(async () => { const [o, , d] = state.programaciones, id = progDocArchivo(o, 'modelo').id;
      const comparte = progDocArchivo(d, 'modelo').id === id;
      state.ui.progTab = 'detalle'; state.ui.progId = d.id; render(); return { comparte, id }; });
    await p.click('button:has-text("Quitar PDF")'); await esperar(200); await p.locator('.dlg-overlay button:has-text("Quitar")').click(); await esperar(400);
    const r5 = await p.evaluate(async id => ({ quitado: !progDocArchivo(state.programaciones[2], 'modelo'), sigue: !!(await exGet('prog:doc:' + id)) }), r4.id);
    t.ok(r4.comparte && r5.quitado && r5.sigue, 'duplicar comparte el PDF y quitarlo de la copia no lo borra del original', JSON.stringify({ ...r4, ...r5 }));
    await p.evaluate(() => { state.ui.progTab = 'lista'; render(); });
    await p.locator('.card', { hasText: 'Prog 1º ESO' }).first().locator('button:has-text("Eliminar")').click(); await esperar(200);
    await p.locator('.dlg-overlay button').filter({ hasNotText: 'Cancelar' }).first().click(); await esperar(500);
    t.ok(await p.evaluate(async id => !(await exGet('prog:doc:' + id)), r4.id), 'al eliminar la última programación que lo usa, el PDF se borra del dispositivo');
    // Deshacer devuelve la referencia, pero no el archivo: el visor lo dice en vez de fallar.
    await p.evaluate(() => { deshacer(); state.ui.progTab = 'detalle'; state.ui.progId = state.programaciones[0].id; render(); }); await esperar(300);
    await p.click('button:has-text("Ver el PDF")'); await esperar(400);
    t.ok(await p.locator('.dlg-overlay', { hasText: 'no está guardado en este dispositivo' }).count() === 1, 'si el PDF ya no está (tras deshacer), se avisa de que hay que volver a guardarlo');
    t.ok(!p.errores.length && !(await p.evaluate(() => window.__x)), 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'riesgo-mapa-autoevaluacion', descripcion: 'Aviso de alumnado en riesgo en Inicio, mapa de criterios en Resultados y autoevaluación/coevaluación con la rúbrica', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const [A, B, C] = await cuadernoConGrupo(p, t.url, { nombres: ['Alba Baja, Ana', 'Beltrán Suspende, Blas', 'Cano Faltas, Carla'] });
    const cr = await p.evaluate(() => { const g = state.grupos[0], c = getCatalogo('GeH_1ESO').ces[0].criterios.map(x => x.id), [A, B, C] = g.alumnos.map(a => a.id);
      const act = (id, t, crits) => ({ id, nombre: 'Actividad ' + id, trimestre: t, bloqueId: 'b1', esExamen: false, criterios: crits.map(x => ({ critId: x, peso: 1 })) });
      g.actividades = [act('a1', 0, [c[0]]), act('b1', 1, [c[0]]), act('b2', 1, [c[1]]), act('b3', 1, [c[1]])];
      g.notas = { [A]: { a1: { [c[0]]: 8 }, b1: { [c[0]]: 5 }, b2: { [c[1]]: 5 }, b3: { [c[1]]: 5 } },
                  [B]: { a1: { [c[0]]: 6 }, b1: { [c[0]]: 3 }, b2: { [c[1]]: 3 }, b3: { [c[1]]: 3 } },
                  [C]: { a1: { [c[0]]: 9 }, b1: { [c[0]]: 9 }, b2: {}, b3: {} } };
      g.marcas = { [C]: { b2: 'NP', b3: 'NP' } };
      state.ui.trim = 1; state.ui.appMode = 'inicio'; state.novedadesVistas = NOVEDADES_VERSION; save(); render(); return c; });
    await esperar(300);
    // 2 · Aviso temprano
    const txt = (await p.textContent('.aviso-riesgo')) || '';
    t.ok(/Alba Baja, Ana:[^·]*ha bajado de 8,0 a 5,0 respecto a la 1/.test(txt) && !/Alba Baja, Ana: 🔴/.test(txt), 'avisa de quien ha bajado 2 puntos o más (y no la da por suspensa con un 5)', txt);
    t.ok(/Beltrán Suspende, Blas: 🔴\ssuspende \(3,0\)/.test(txt), 'avisa de quien va suspendiendo, con su nota', txt);
    t.ok(/Cano Faltas, Carla:.*2 «No presentado»/.test(txt), 'avisa de quien acumula «No presentado»', txt);
    t.ok(txt.indexOf('Beltrán') < txt.indexOf('Alba'), 'primero lo más grave (suspende antes que baja)');
    await p.locator('.aviso-riesgo button:has-text("Ver")').nth(txt.indexOf('Beltrán') < txt.indexOf('Cano') ? 0 : 1).click(); await esperar(300);
    t.ok(await p.evaluate(B => state.ui.tab === 'resultados' && state.ui.resAl === B, B), '«Ver» abre Resultados con el informe de ese alumno/a');
    // 1 · Mapa de criterios
    await p.click('button:has-text("Mapa de criterios")'); await esperar(300);
    const m = await p.evaluate(() => ({ filas: document.querySelectorAll('.mc-tabla tbody tr').length, cols: [...document.querySelectorAll('.mc-tabla .mc-crit')].map(x => x.textContent),
      celdas: [...document.querySelectorAll('.mc-tabla tbody tr')].map(tr => [...tr.querySelectorAll('.mc-c')].map(td => td.textContent)),
      media: [...document.querySelectorAll('.mc-tabla tfoot .mc-c')].map(td => td.textContent), rojos: [...document.querySelectorAll('.mc-tabla tbody .mc-bajos')].map(td => td.textContent),
      fondoRojo: getComputedStyle(document.querySelectorAll('.mc-tabla tbody tr')[1].querySelector('.mc-c')).backgroundColor }));
    t.ok(m.filas === 3 && m.cols.join() === cr.slice(0, 2).join(), 'una fila por alumno/a y una columna por cada criterio trabajado en la evaluación', JSON.stringify(m));
    t.ok(m.celdas[0].join() === '50,50' && m.celdas[1].join() === '30,30' && m.celdas[2][0] === '90', 'cada casilla lleva el porcentaje de logro del criterio', JSON.stringify(m.celdas));
    t.ok(m.fondoRojo === 'rgb(243, 220, 220)' && m.rojos[1] === '2', 'color del nivel («Necesita mejorar» en rojo) y cuántos criterios tiene en rojo', JSON.stringify(m));
    t.ok(m.media[0] === '57', 'la última fila es la media del grupo en cada criterio', m.media.join());
    await p.click('button.mc-al:has-text("Cano Faltas")'); await esperar(300);
    t.ok(await p.evaluate(C => state.ui.resVista === '' && state.ui.resAl === C, C), 'tocar un nombre del mapa abre su informe');
    await p.evaluate(() => mapaVista(true)); await p.click('button:has-text("Imprimir")'); await esperar(300);
    t.ok(await p.locator('#printOverlay .mc-tabla').count() === 1, 'el mapa se puede imprimir');
    await p.click('#prtCerrar'); await esperar(200);
    // 4 · Autoevaluación y coevaluación
    await p.evaluate(([A, c]) => { const g = state.grupos[0];
      g.actividades.push({ id: 'e1', nombre: 'Examen 2', trimestre: 1, bloqueId: 'b0', esExamen: true, criterios: [{ critId: c[0], peso: 1 }],
        rubrica: [{ id: 's1', title: 'Pregunta 1', items: [{ id: 'i1', label: 'Ítem 1', max: 6, links: [{ critId: c[0], peso: 1 }] }, { id: 'i2', label: 'Ítem 2', max: 4, links: [] }], subs: [] }] });
      g.rubricScores = { [A]: { e1: { i1: 4, i2: 3 } } }; cxRecalcAlumno(g, g.actividades.find(a => a.id === 'e1'), A);
      state.ui.appMode = 'corrector'; state.ui.corTab = 'corregir'; state.ui.corExamId = 'e1'; state.ui.corAlId = A; state.ui.aeAbierto = true; save(); render(); }, [A, cr]);
    await esperar(300);
    await elegir(p.locator('select[aria-label="Autoevaluación: Ítem 1"]'), '5'); await esperar(200);
    t.ok((await p.textContent('.ae-detalles')).includes('Copiados 1 de 2 ítems'), 'con la hoja a medias, dice cuántos ítems lleva copiados en vez de comparar');
    await elegir(p.locator('select[aria-label="Autoevaluación: Ítem 2"]'), '4'); await esperar(200);
    await elegir(p.locator('select[aria-label="Coevaluación: Ítem 1"]'), '3'); await esperar(200);
    const r = await p.evaluate(A => { const g = state.grupos[0]; return { auto: g.autoeval[A].e1.auto.items, nota: g.notasCuant[A].e1, txt: document.querySelector('.ae-detalles').textContent }; }, A);
    t.ok(r.auto.i1 === 5 && r.auto.i2 === 4 && /Se pone: 9,0 · tu nota: 7,0\s*\+2/.test(r.txt), 'compara la autoevaluación con tu nota (9 frente a 7: +2)', JSON.stringify(r));
    t.ok(r.nota === 7, 'no cambia la nota del examen');
    await p.evaluate(() => { state.ui.corAlId = ''; render(); }); await esperar(300);
    const lista = await p.textContent('#tabContent');
    t.ok(lista.includes('🙋 9,0') && lista.includes('👥 …') && /9,0 frente a tu 7,0/.test(lista) && !/Coevaluación ·/.test(lista), 'la lista lleva los distintivos y el resumen del grupo solo cuenta hojas completas', lista.slice(0, 600));
    // Hojas para el alumnado: coevaluación en blanco (una por alumno/a) y autoevaluación con nombre.
    await p.click('button:has-text("🙋 Autoevaluación")'); await esperar(200);
    await p.check('input[name=aeTipo][value=co]'); await p.check('input[name=aeHojas][value=blanco]');
    await p.click('button:has-text("Preparar las hojas")'); await esperar(400);
    const h = await p.evaluate(() => { const o = document.querySelector('#printOverlay .print-hoja').shadowRoot; return { n: o.querySelectorAll('.ae-hoja').length, txt: o.textContent, cajas: o.querySelectorAll('.ae-hoja')[0].querySelectorAll('.ae-caja').length }; });
    t.ok(h.n === 3 && h.txt.includes('Evalúo a:') && h.txt.includes('Le doy') && h.cajas === 3, 'hojas de coevaluación en blanco: una por alumno/a, con casilla por ítem y total', JSON.stringify({ n: h.n, cajas: h.cajas }));
    await p.click('#prtCerrar'); await esperar(200);
    await p.evaluate(() => aeImprimirHojas('e1', { tipo: 'auto', hojas: 'nombre', desc: true, refl: true })); await esperar(300);
    const h2 = await p.evaluate(() => document.querySelector('#printOverlay .print-hoja').shadowRoot.textContent);
    t.ok(h2.includes('Nombre: Alba Baja, Ana') && h2.includes('Me doy') && h2.includes('Lo que tengo que mejorar'), 'hojas de autoevaluación con el nombre de cada alumno/a y preguntas para reflexionar');
    await p.click('#prtCerrar'); await esperar(200);
    // Rúbrica por niveles: en la hoja se marca la casilla del nivel; en la tarjeta se elige el nivel.
    await p.evaluate(A => { const g = state.grupos[0], e = g.actividades.find(a => a.id === 'e1');
      e.rubrica = [{ id: 'n', title: '', sinTitulo: true, formato: 'niveles', niveles: [{ id: 'l1', nombre: 'Experto', valor: 4 }, { id: 'l2', nombre: 'Aprendiz', valor: 2 }],
        items: [{ id: 'c1', label: 'Contenido', max: 10, desc: [], links: [], celdas: { l1: 'Lo explica todo', l2: 'Lo explica en parte' } }], subs: [] }];
      aeImprimirHojas('e1', { tipo: 'auto', hojas: 'blanco', desc: true, refl: false }); }, A);
    await esperar(300);
    const h3 = await p.evaluate(() => { const o = document.querySelector('#printOverlay .print-hoja').shadowRoot, hoja = o.querySelector('.ae-hoja'); return { niv: !!hoja.querySelector('.ae-niv'), txt: hoja.textContent, cajas: hoja.querySelectorAll('.ae-caja').length }; });
    t.ok(h3.niv && h3.txt.includes('Experto') && h3.txt.includes('Lo explica todo') && h3.cajas === 2 && h3.txt.includes('marca con una X'), 'con rúbrica por niveles, la hoja tiene la tabla de niveles con una casilla en cada uno', JSON.stringify(h3));
    await p.click('#prtCerrar'); await esperar(200);
    await p.evaluate(A => { state.ui.corAlId = A; render(); }, A); await esperar(300);
    const ops = await p.locator('select[aria-label="Autoevaluación: Contenido"]').evaluate(s => [...s.options].map(o => o.textContent));
    t.ok(ops.join('|') === '—|Experto (10)|Aprendiz (5)', 'en la tarjeta, con rúbrica por niveles se elige el nivel (en el orden de la rúbrica)', ops.join('|'));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'guia-descargable', descripcion: 'Guía de uso: «Descargar» guarda un único .html que se abre solo, sin conexión, con el enlace a la app', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await p.goto(t.url + '/guia_mejorada.html'); await esperar(500);
    const indice = await p.evaluate(() => [...document.querySelectorAll('nav.toc a[href^="#"]')].filter(a => !document.getElementById(a.getAttribute('href').slice(1))).map(a => a.getAttribute('href')));
    t.ok(!indice.length, 'cada entrada del índice lleva a una sección que existe', indice.join(', '));
    const [desc] = await Promise.all([p.waitForEvent('download'), p.click('#guiaDescargar')]);
    const html = fs.readFileSync(await desc.path(), 'utf8');
    t.ok(desc.suggestedFilename() === 'Guia-Cuaderno-del-profesor.html' && html.includes('26. Preguntas frecuentes') && html.includes(`id="guiaInicio" href="${t.url}/index.html"`), 'descarga la guía completa con el enlace a la app', [desc.suggestedFilename(), html.includes('26. Preguntas frecuentes'), html.includes(`id="guiaInicio" href="${t.url}/index.html"`), html.length].join(' '));
    t.ok(!/<(script|link|img)[^>]+(src|href)="(?!https?:|#|data:)[^"]+"/i.test(html.replace(/id="guiaInicio" href="[^"]+"/, '')), 'no necesita ningún otro archivo');
    // Abierta como archivo suelto, sin servidor.
    const tmp = path.join(os.tmpdir(), 'guia-' + Date.now() + '.html'); fs.writeFileSync(tmp, html);
    const q = await nuevaPagina(t.contexto); await q.goto('file://' + tmp); await esperar(300);
    t.ok((await q.textContent('h1')).includes('Guía de uso') && await q.locator('#guiaInicio').isVisible() && await q.locator('h2#privacidad').count() === 1, 'el archivo descargado se abre solo y conserva el botón «Inicio» a la app');
    fs.unlinkSync(tmp);
    await p.emulateMedia({ media: 'print' });
    t.ok(!(await p.locator('#guiaDescargar').isVisible()), 'al imprimir no salen los botones');
    t.ok(!p.errores.length && !q.errores.length, 'sin errores de JavaScript', p.errores.concat(q.errores).join('; '));
  } },

  { nombre: 'informes-por-evaluacion', descripcion: 'Resultados: «Informes de» cambia la tabla y los informes a la vez, y el informe final incluye «De dónde sale la nota» de la nota final', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const [A] = await cuadernoConGrupo(p, t.url, { nombres: ['Abellón Murcia, Alma'] });
    await p.evaluate(A => { const g = state.grupos[0], c = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'a1', nombre: 'Trabajo 1', trimestre: 0, bloqueId: 'b1', esExamen: false, criterios: [{ critId: c, peso: 1 }] },
                       { id: 'a2', nombre: 'Trabajo 2', trimestre: 1, bloqueId: 'b1', esExamen: false, criterios: [{ critId: c, peso: 1 }] }];
      g.notas = { [A]: { a1: { [c]: 4 }, a2: { [c]: 8 } } };
      state.ui.trim = 0; state.ui.appMode = 'grupo'; state.ui.tab = 'resultados'; save(); render(); }, A);
    await esperar(300);
    const col = () => p.evaluate(() => document.querySelector('#tabContent thead th:nth-child(2)').textContent + ' ' + document.querySelector('#tabContent tbody td:nth-child(2)').textContent.trim());
    t.ok((await col()).startsWith('1ª evaluación 4,0'), 'la tabla empieza en la 1.ª evaluación', await col());
    await p.selectOption('#repGrupoSel', '1'); await esperar(300);
    t.ok((await col()).startsWith('2ª evaluación 8,0') && await p.inputValue('#trimSel') === '1', 'elegir la 2.ª en «Informes de» cambia la tabla y el Periodo de la cabecera', await col());
    await p.click('tbody button:has-text("Informe")'); await esperar(300);
    const ind = await p.evaluate(() => document.querySelector('#printOverlay .print-hoja').shadowRoot.textContent);
    t.ok(ind.includes('2ª evaluación') && ind.includes('De dónde sale la nota · 2ª evaluación'), 'el informe del alumno/a es de la 2.ª evaluación, con «De dónde sale la nota»');
    await p.click('#prtCerrar'); await esperar(200);
    await p.selectOption('#repGrupoSel', 'final'); await esperar(300);
    t.ok(await p.inputValue('#repGrupoSel') === 'final' && (await col()).startsWith('2ª evaluación'), '«Evaluación final» se queda elegida y la tabla no cambia');
    await p.selectOption('#trimSel', '0'); await esperar(300);
    t.ok(await p.inputValue('#repGrupoSel') === '0', 'cambiar el Periodo de la cabecera también cambia «Informes de»');
    await p.click('tbody button:has-text("Informe final")'); await esperar(300);
    const fin = await p.evaluate(() => document.querySelector('#printOverlay .print-hoja').shadowRoot.textContent);
    t.ok(fin.includes('Informe final de curso') && fin.includes('De dónde sale la nota · Nota final de curso') && /1ª evaluación[\s\S]*2ª evaluación/.test(fin), 'el informe final incluye «De dónde sale la nota» de la nota final, con cada evaluación');
    await p.click('#prtCerrar'); await esperar(200);
    await p.click('button:has-text("Exportar informes finales de curso")'); await esperar(300);
    t.ok((await p.evaluate(() => document.querySelector('#printOverlay .print-hoja').shadowRoot.textContent)).includes('De dónde sale la nota · Nota final de curso'), 'también en «Exportar informes finales de curso» (todo el grupo)');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'redondeo-por-curso', descripcion: 'Redondeo de la nota de acta por curso: lo comparten los grupos del mismo curso y no cambia el de los demás', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await p.goto(t.url + '/'); await esperar(1500);
    const acta = () => p.evaluate(() => state.grupos.map(g => g.nombre + ':' + notaActa(notaTrimestre(g, g.alumnos[0].id, 0), g)).join(' '));
    await p.evaluate(() => { _mostrarBienvenida = false;
      const nuevo = (nombre, cat) => { const g = defGrupo(nombre, cat), c = getCatalogo(cat).ces[0].criterios[0].id, al = normalizarAlumno({ id: uid(), nombre: 'Prueba, Ana' });
        g.alumnos = [al]; g.actividades = [{ id: uid(), nombre: 'Trabajo', trimestre: 0, bloqueId: 'b1', esExamen: false, criterios: [{ critId: c, peso: 1 }] }];
        g.notas = { [al.id]: { [g.actividades[0].id]: { [c]: 4.6 } } }; return g; };
      state.grupos = [nuevo('1A', 'GeH_1ESO'), nuevo('1B', 'GeH_1ESO'), nuevo('2A', 'GeH_2ESO')];
      state.ajustesNota = { redondeoActa: 'estandar' }; migrarEstado();   // copia antigua: una regla para todos
      state.ui.trim = 0; state.ui.grupoId = state.grupos[2].id; state.ui.appMode = 'grupo'; state.ui.tab = 'ajustes'; save(); render(); });
    await esperar(300);
    t.ok(await acta() === '1A:5 1B:5 2A:5', 'una copia antigua conserva su regla en todos los grupos (4,6 → 5 con redondeo normal)', await acta());
    t.ok((await p.textContent('#tabContent')).includes('todos tus grupos de Geografía e Historia · 2.º ESO'), 'Ajustes dice a qué curso se aplica');
    await p.selectOption('select[aria-label="Regla de redondeo de la nota de acta"]', 'sinAprobarPorRedondeo'); await esperar(300);
    t.ok(await acta() === '1A:5 1B:5 2A:4', 'cambiarla en un grupo de 2.º solo cambia 2.º', await acta());
    await p.evaluate(() => { state.ui.grupoId = state.grupos[0].id; render(); }); await esperar(300);
    t.ok(await p.inputValue('select[aria-label="Regla de redondeo de la nota de acta"]') === 'estandar' && (await p.textContent('#tabContent')).includes('(1A, 1B)'), 'en 1.º se ve su propia regla y los grupos que la comparten');
    await p.selectOption('select[aria-label="Regla de redondeo de la nota de acta"]', 'truncar'); await esperar(300);
    t.ok(await acta() === '1A:4 1B:4 2A:4' && await p.evaluate(() => state.ajustesNota.redondeoPorCurso.GeH_1ESO === 'truncar' && state.ajustesNota.redondeoPorCurso.GeH_2ESO === 'sinAprobarPorRedondeo'), 'cambiarla en 1.º A la cambia en 1.º B (mismo curso) y deja 2.º como estaba', await acta());
    await p.click('summary:has-text("Tus otros cursos")'); await esperar(100);
    t.ok((await p.textContent('#tabContent')).includes('2.º ESO: Redondeo normal, pero sin aprobar por redondeo'), '«Tus otros cursos» enseña la regla de cada curso');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'panel-familias', descripcion: 'Informe para la familia: un .html por alumno/a con pestañas que funcionan sin JavaScript, el informe oficial al imprimir, final de curso y .zip del grupo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const [A, B] = await cuadernoConGrupo(p, t.url, { nombres: ['García López, Lucía', 'Pérez Ruiz, Luis'] });
    await p.evaluate(([A, B]) => { const g = state.grupos[0], c = getCatalogo('GeH_1ESO').ces[0].criterios.map(x => x.id);
      g.actividades = [{ id: 'e1', nombre: 'Examen Prehistoria', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: c[0], peso: 1 }] },
        { id: 't1', nombre: 'Mapa del Neolítico', trimestre: 0, bloqueId: 'b1', esExamen: false, sda: 'SdA 1', tipo: 'Mapa', criterios: [{ critId: c[1], peso: 1 }] },
        { id: 't2', nombre: 'Exposición oral', trimestre: 0, bloqueId: 'b1', esExamen: false, sda: 'SdA 1', criterios: [{ critId: c[1], peso: 1 }] },
        { id: 'e2', nombre: 'Examen Egipto', trimestre: 1, bloqueId: 'b0', esExamen: true, criterios: [{ critId: c[0], peso: 1 }] }];
      g.notas = { [A]: { e1: { [c[0]]: 7 }, t1: { [c[1]]: 8 }, e2: { [c[0]]: 9 } } }; g.notasCuant = { [A]: { e1: 7, e2: 9 } };
      g.marcas = { [A]: { t2: 'NP' } };
      g.examComentarios = { [A]: { e1: 'Repasa <b>las fechas</b>', 'e1|i1': 'COMENTARIO DE PREGUNTA' } };
      g.alumnos[0].comentariosEval[0] = 'Trabaja con constancia.'; g.alumnos[0].comentarioFinal = 'Un curso excelente.'; g.alumnos[0].observaciones = 'OBSERVACION PRIVADA';
      g.asistencia = { '2026-10-03': { [A]: { estado: 'falta_no_justificada', nota: '' } } };
      g.convivencia = [{ id: 'cv1', alumnoId: A, fecha: '2026-10-15', tipo: 'rc', descripcion: 'Ayuda a un compañero.' }];
      state.ui.trim = 0; state.ui.appMode = 'grupo'; state.ui.tab = 'resultados'; save(); render(); }, [A, B]);
    await esperar(300);
    // Un alumno/a, desde la ventana del ojo
    await p.locator('tbody tr').first().locator('button[title^="Ver la evolución"]').click(); await esperar(300);
    const [d1] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("📱 Para la familia")')]);
    const h = fs.readFileSync(await d1.path(), 'utf8');
    t.ok(d1.suggestedFilename() === 'Informe_1a_evaluacion_1_ESO_A_Garcia_Lopez_Lucia.html', 'nombre del archivo sin tildes, con la evaluación y el alumno/a', d1.suggestedFilename());
    t.ok(!/<script/i.test(h) && !/(src|href)="https?:/.test(h), 'no lleva código ni carga nada de fuera');
    t.ok(['Resumen', 'De dónde sale la nota', 'Pruebas objetivas', 'Trabajos de clase', 'Competencias', 'Asistencia', 'Convivencia', 'Informe'].every(x => h.includes(`>${x}</label>`)), 'tiene las ocho pestañas');
    t.ok(h.includes('Trabaja con constancia.') && h.includes('Repasa <b>las fechas</b>') && h.includes('No presentado') && h.includes('3/10/2026') && h.includes('Reconocimiento positivo') && h.includes('De dónde sale la nota · 1ª evaluación') && h.includes('Informe individual de evaluación'),
      'lleva el comentario de la evaluación, el del examen, el NP, la asistencia, la convivencia, el cálculo de la nota y el informe oficial');
    t.ok(!h.includes('OBSERVACION PRIVADA') && !h.includes('COMENTARIO DE PREGUNTA') && !h.includes('Pérez Ruiz') && !h.includes('Examen Egipto'), 'no lleva observaciones privadas, ni comentarios por pregunta, ni a otros alumnos, ni otras evaluaciones');
    // Abierto como lo haría la vista previa de un móvil: sin JavaScript
    const tmp = path.join(os.tmpdir(), 'panel-' + Date.now() + '.html'); fs.writeFileSync(tmp, h);
    const mctx = await t.navegador.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: false });
    const m = await mctx.newPage(); await m.goto('file://' + tmp);
    const visibles = async () => m.evaluate(() => [...document.querySelectorAll('.pf-p')].map((s, i) => getComputedStyle(s).display !== 'none' ? i : -1).filter(i => i >= 0).join());
    let ok = await visibles() === '0';
    for (const i of [2, 5, 7]) { await m.click(`label[for=pf-${i}]`); ok = ok && await visibles() === String(i); }
    t.ok(ok, 'sin JavaScript, cada pestaña muestra solo lo suyo');
    t.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'cabe en la pantalla del móvil');
    await m.emulateMedia({ media: 'print' });
    t.ok(await visibles() === '7' && await m.evaluate(() => getComputedStyle(document.querySelector('.pf-nav')).display === 'none'), 'al imprimir sale solo el informe oficial');
    await mctx.close(); fs.unlinkSync(tmp);
    // Final de curso
    await p.click('button:has-text("Evaluación final")'); await esperar(300);
    const [d2] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("📱 Para la familia")')]);
    const f = fs.readFileSync(await d2.path(), 'utf8');
    t.ok(d2.suggestedFilename().startsWith('Informe_Final_de_curso_') && f.includes('Un curso excelente.') && f.includes('Examen Egipto') && f.includes('De dónde sale la nota · Nota final de curso') && f.includes('Informe final de curso'), 'el panel final lleva todo el curso, el comentario final y el informe final');
    await p.evaluate(() => cerrarEvolucionAlumno()); await esperar(200);
    // Todo el grupo en un .zip
    const [d3] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("📱 Informes para las familias")')]);
    const z = fs.readFileSync(await d3.path());
    const eocd = z.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    const n = z.readUInt16LE(eocd + 10), nombres = [];
    let off = z.readUInt32LE(eocd + 16);
    for (let i = 0; i < n; i++) { const ln = z.readUInt16LE(off + 28); nombres.push(z.slice(off + 46, off + 46 + ln).toString('utf8')); off += 46 + ln; }
    const primero = z.slice(30 + z.readUInt16LE(26), 30 + z.readUInt16LE(26) + 15).toString('utf8');
    t.ok(d3.suggestedFilename() === 'Informes_familias_1a_evaluacion_1_ESO_A.zip' && n === 2 && nombres.join() === 'Informe_1a_evaluacion_1_ESO_A_Garcia_Lopez_Lucia.html,Informe_1a_evaluacion_1_ESO_A_Perez_Ruiz_Luis.html' && primero === '<!DOCTYPE html>',
      'todo el grupo en un .zip, un informe por alumno/a', d3.suggestedFilename() + ' ' + nombres.join());
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'panel-familias-actividades', descripcion: 'Informe para la familia: en las competencias salen todas las actividades con las que se ha evaluado, sin «+N más»', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const [A] = await cuadernoConGrupo(p, t.url, { nombres: ['García López, Lucía'] });
    const r = await p.evaluate(A => { const g = state.grupos[0], c = getCatalogo('GeH_1ESO').ces[0].criterios[0].id;
      g.actividades = [1, 2, 3, 4, 5, 6].map(i => ({ id: 'a' + i, nombre: 'Actividad número ' + i, trimestre: 0, bloqueId: 'b1', esExamen: false, criterios: [{ critId: c, peso: 1 }] }));
      g.notas = { [A]: Object.fromEntries(g.actividades.map(a => [a.id, { [c]: 7 }])) }; state.ui.trim = 0; save();
      const html = panelFamiliaHTML(g, g.alumnos[0], 0), fin = panelFamiliaHTML(g, g.alumnos[0], 'final');
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const tab = id => doc.getElementById('pp-' + id).textContent;
      return { comp: tab(4), inf: tab(7), fin, pdf: informeAlumnoBodyHTML(g, g.alumnos[0]) };
    }, A);
    const todas = txt => [1, 2, 3, 4, 5, 6].every(i => txt.includes('Actividad número ' + i));
    t.ok(todas(r.comp) && /Evaluado con:/.test(r.comp), 'la pestaña Competencias dice con qué actividades se ha evaluado cada competencia y criterio');
    t.ok(todas(r.inf) && !/\+\d+ más/.test(r.inf), 'el informe oficial del panel lista todas las actividades, sin «+N más»');
    t.ok(!/\+\d+ más/.test(r.fin) && todas(r.fin), 'también en el panel de final de curso');
    t.ok(/\+2 más/.test(r.pdf), 'el informe PDF de siempre no cambia');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },
];
