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
import { instalarAuditoriaTablas } from './tablas.mjs';
import { rastrearCuaderno } from './rastreo-cuaderno.mjs';
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
    // El tutor/a es uno más del equipo docente (con su materia), enlazado con el tutor/a del grupo.
    await p.evaluate(() => { const d = _getAsistenciaData('1º ESO', 'A'); d.profesores[1].materia = 'Matemáticas';
      d.profesores.push({ id: 'pt', nombre: 'Zapata Ruiz, Luis', materia: 'Tutoría', correo: 'zapata@gva.es' });
      ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: k === 'eval2' ? true : null, justificacion: '' }));
      d.sesiones.eval2[1].asistio = null; tutores['1º ESO-A'] = 'Zapata Ruiz, Luis'; renderEquipoDocenteBody(); }); await esperar(150);
    let tu = await p.evaluate(() => _getAsistenciaData('1º ESO', 'A').profesores.map(x => (x.esTutor ? '*' : '') + x.materia));
    t.ok(tu[1] === '*Matemáticas', 'los datos de antes: se marca como tutor/a la fila del mismo nombre que tiene materia', JSON.stringify(tu));
    t.ok(/aparece 2 veces/.test(await p.textContent('#eqDocenteBody')), 'avisa de que el tutor/a está repetido');
    await p.click('#eqDocenteBody button:has-text("Dejarlo una sola vez")'); await esperar(150);
    tu = await p.evaluate(() => { const d = _getAsistenciaData('1º ESO', 'A'); return { n: d.profesores.length, correo: d.profesores[1].correo, as: d.sesiones.eval2[1].asistio, ses: d.sesiones.eval1.length }; });
    t.ok(tu.n === 2 && tu.correo === 'zapata@gva.es' && tu.as === true && tu.ses === 2, 'al unirlo queda una sola vez, con el correo y la asistencia de la fila repetida', JSON.stringify(tu));
    await p.locator('#eqDocenteBody input[placeholder^="Apellidos, Nombre"]').nth(1).fill('Zapata Ruiz, Luisa'); await esperar(100);
    t.ok(await p.evaluate(() => tutores['1º ESO-A']) === 'Zapata Ruiz, Luisa', 'cambiar el nombre en el equipo docente cambia el del tutor/a del grupo');
    await p.locator('#eqDocenteBody .eq-tutor input').nth(0).check(); await esperar(150);
    tu = await p.evaluate(() => ({ t: tutores['1º ESO-A'], marcados: _getAsistenciaData('1º ESO', 'A').profesores.filter(x => x.esTutor).length }));
    t.ok(tu.t === 'López Martín, Ana' && tu.marcados === 1, 'marcar a otro profesor/a como tutor/a lo cambia (solo hay uno)', JSON.stringify(tu));
    await p.evaluate(() => { closeEquipoDocente(); currentGrupos['1º ESO'] = 'A'; selectNivel('1º ESO'); }); await esperar(200);
    await p.fill('#mainContent input[placeholder^="Apellidos, Nombre del tutor"]', 'López Martín, Ana María'); await esperar(1300);
    await p.reload(); await esperar(1500);
    tu = await p.evaluate(() => ({ t: tutores['1º ESO-A'], prof: _getAsistenciaData('1º ESO', 'A').profesores[0].nombre }));
    t.ok(tu.t === 'López Martín, Ana María' && tu.prof === 'López Martín, Ana María', 'el nombre escrito en la cabecera del grupo se guarda y cambia también el del profesor/a', JSON.stringify(tu));
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
      await instalarAuditoriaTablas(p);
      const r = await rastrearTutoria(p, { modo, completo });
      t.ok(r.clics > (completo ? 1500 : 250) && !r.fallos.length, `[${modo}] el rastreo recorre las pantallas (${r.clics} pulsaciones)`, r.fallos.join('; '));
      if (modo === 'hostil') {
        t.ok(!r.inyectados.length, 'ningún texto se convierte en un elemento de la página o de un documento', r.inyectados.slice(0, 6).join('\n        '));
        t.ok(!r.ejecutados.length, 'ningún texto se ejecuta como código', r.ejecutados.slice(0, 6).join('\n        '));
      } else {
        t.ok(!r.dobles.length, 'ningún texto se escapa dos veces (no se ve «&amp;» ni «&#39;»)', r.dobles.slice(0, 6).join('\n        '));
        // De paso, en todas las pantallas y documentos que recorre: el título de cada columna, alineado como sus casillas.
        const cols = [...new Set(r.desalineadas.map(x => x.slice(x.indexOf(' · tabla «') + 3)))];
        t.ok(!cols.length, 'en todas las tablas, el título de cada columna va alineado como sus casillas', cols.slice(0, 6).join('\n        '));
      }
      t.ok(!p.errores.length, `[${modo}] sin errores de JavaScript`, p.errores.slice(0, 3).join('; '));
      await ctx.close();
    }
  } },

  { nombre: 'cuaderno-tablas', descripcion: 'Cuaderno: en todas las tablas (pestañas, modos y las ventanas y documentos que abren sus botones), el título de cada columna va alineado como sus casillas', async fn(t) {
    const p = await nuevaPagina(t.contexto); p.setDefaultTimeout(0);
    await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria', 'Vidal Roca, Pau'] });
    await instalarAuditoriaTablas(p);
    const r = await rastrearCuaderno(p);
    t.ok(r.clics > 300 && !r.fallos.length, `el recorrido pasa por todas las pantallas (${r.clics} pulsaciones)`, r.fallos.join('; '));
    const cols = [...new Set(r.desalineadas.map(x => x.slice(x.indexOf(' · tabla «') + 3)))];
    t.ok(!cols.length, 'el título de cada columna va alineado como sus casillas', cols.slice(0, 6).join('\n        '));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
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
        a.nese = true; a.neseNivel = P('neseNivel'); a.familia = [{ parentesco: P('parentesco'), nombre: P('famNombre'), email: P('email') }, { parentesco: '', nombre: '', email: '' }];
        a.deTutoria = { evaluacion: '1', fechaSesion: '2026-12-18', tutor: P('dt_tutor'), propuesta: { tipo: P('dt_tipo'), destino: P('dt_destino') }, medidas: [P('dt_medida')], acuerdos: P('dt_acuerdos') }; });
      g.deTutoria = { evaluacion: '1', fechaSesion: '2026-12-18', tutor: P('dtg_tutor'), acuerdosGrupo: P('dtg_acuerdos'), valoracion: P('dtg_valoracion') };
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
      state.ui.resAl = ''; state.ui.tab = 'alumnos'; state.ui.fichaAlumnoId = g.alumnos[0].id; await mira('ficha del alumno (de la tutoría)'); state.ui.fichaAlumnoId = '';
      // Ventana «📥 De la tutoría» con una ficha del grupo hostil
      donde = 'De la tutoría'; _dtVentana(g, ftNormalizarFichaGrupo({ formato: 'tutoria-a-cuaderno', version: 1, nivel: P('f_nivel'), grupo: P('f_grupo'), tutor: P('f_tutor'), evaluacion: '1', acuerdosGrupo: P('f_acuerdos'), valoracion: P('f_val'),
        alumnos: g.alumnos.map(a => ({ nombre: a.nombre, idsCuaderno: [a.id], nese: true, recursosNese: [P('f_rec')], acuerdos: P('f_ac'), propuesta: { tipo: P('f_tipo') } })).concat([{ nombre: P('f_sin') }]) }));
      await new Promise(r => setTimeout(r, 100)); inyectados().forEach(x => malos.add(x)); document.getElementById('deTutoriaOv')?.remove();
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
      verActaAntigua('1º ESO', 'A', 1);   // las actas del modelo anterior se consultan (solo lectura)
      await new Promise(r => setTimeout(r, 600));
      return { texto: document.querySelector('#tdocOverlay iframe')?.contentDocument?.body?.innerHTML || '', colado: window.__colado };
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
    await p.evaluate(() => { data['1º ESO'].A.find(a => a.nombre === 'LUIS PÉREZ RUIZ').fecha = '2012-01-01'; });
    const tabla = () => p.evaluate(() => data['1º ESO'].A.map(a => ({ n: a.nombre, f: a.fecha, nese: a.nese, rep: a.repetidor, ids: (a.idsCuaderno || []).length })));
    // El grupo está en orden alfabético: a cada uno se le busca por su nombre.
    const de = (l, re) => l.find(a => re.test(a.n)) || {};
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    const vista = (await p.textContent('#impCuadPlan')).replace(/\s+/g, ' ');
    t.ok(/2 nuevos/.test(vista) && /se completa/i.test(vista) && /distint/i.test(vista), 'la vista previa dice qué se añade, qué se completa y qué es distinto', vista.slice(0, 300));
    t.ok(await p.isChecked('#importCuadernoOverlay [data-duda]') === false, 'un nombre solo parecido (Lopes ↔ López) se pregunta y no se marca de entrada');
    await p.check('#importCuadernoOverlay [data-duda]'); await esperar(200);
    await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(1200);
    let l = await tabla();
    t.ok(l.length === 4, 'no duplica a quien ya estaba aunque el nombre esté en mayúsculas o en otro orden', JSON.stringify(l));
    t.ok(de(l, /^garcia/).f === '2012-03-15' && de(l, /^garcia/).nese === 'Sí', 'a quien ya estaba se le completan la fecha de nacimiento y NESE', JSON.stringify(de(l, /^garcia/)));
    t.ok(de(l, /^LUIS/).f === '2012-01-01' && de(l, /^LUIS/).rep === 'Sí', 'un dato distinto no se cambia sin pedirlo; lo vacío sí se completa', JSON.stringify(de(l, /^LUIS/)));
    t.ok(de(l, /Vidal/).f === '2012-05-05' && de(l, /Vidal/).n === 'López Vidal, Marta', 'el nombre parecido confirmado se completa sin cambiarle el nombre', JSON.stringify(de(l, /Vidal/)));
    t.ok(de(l, /^Sanz/).n === 'Sanz Martí, Íria' && de(l, /^Sanz/).f === '2013-01-20', 'quien falta se añade con su fecha de nacimiento', JSON.stringify(de(l, /^Sanz/)));
    t.ok(JSON.stringify(l.map(a => a.n)) === JSON.stringify(['garcia lopez, ana', 'López Vidal, Marta', 'LUIS PÉREZ RUIZ', 'Sanz Martí, Íria']), 'y el grupo queda en orden alfabético', JSON.stringify(l.map(a => a.n)));
    t.ok(l.every(a => a.ids === 1), 'todos quedan vinculados con su identificador del Cuaderno', JSON.stringify(l));
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    await p.check('#impCuadSustituir'); await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(800);
    t.ok(de(await tabla(), /^LUIS/).f === '2012-11-02', '«Sustituir los datos distintos» pone el dato del Cuaderno');
    await p.evaluate(() => { _undoPop(); _undoPop(); }); await esperar(300);
    l = await tabla();
    t.ok(l.length === 3 && !de(l, /^garcia/).f, 'Ctrl+Z deshace la importación', JSON.stringify(l));
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

  { nombre: 'tutoria-alertas', descripcion: 'Tutoría: alertas del alumnado con umbrales configurables y guardados, «🧭 Qué me falta» en Inicio e insignia en la tabla', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria']);
    const claves = () => p.evaluate(() => data['1º ESO'].A.map(a => _alertasAlumno(a, '1º ESO').map(x => x.clave).sort().join(',')));
    await p.evaluate(() => {
      const [ana, luis, iria] = data['1º ESO'].A, hoy = _hoyLocal();
      const mas = n => { const d = new Date(hoy + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
      evalDates['1º ESO'] = { eval1: mas(-40), eval2: mas(-2), eval3: mas(100) };
      Object.assign(ana, { faltasInjust1: 6, faltasInjust2: 6 });                       // 12 en Tutoría
      luis.porMateria = { 'Inglés': { profesor: '', generado: '', notas: {}, faltas: {}, comentarios: {}, convivencia: { curso: { ac: 0, rc: 0, pa: 2 } } } };   // 2 partes en los Cuadernos
      Object.assign(iria, { eval1: 0, eval2: 3 });                                       // 3 suspensas en la II, venía de 0
      iria.entrevistas = [{ id: 'e1', fecha: mas(-30), medio: 'Teléfono', proximaCita: mas(-1) }];
      markDirty(); selectNivel('__home__');
    }); await esperar(400);
    let c = await claves();
    t.ok(c[0] === 'faltas,sin-contacto', 'faltas sin justificar (Tutoría) y sin contacto con la familia', JSON.stringify(c));
    t.ok(c[1] === 'partes,sin-contacto', 'partes recibidos de los Cuadernos', JSON.stringify(c));
    t.ok(c[2] === 'cita-vencida,empeora,suspensas', 'suspensas en la evaluación en curso, empeora y cita vencida sin registrar', JSON.stringify(c));
    const panel = await p.textContent('.qmf');
    t.ok(/3 alumnos con alertas/.test(panel) && /II Evaluación|Evaluación final/.test(panel), '«Qué me falta» resume el grupo en Inicio', panel.slice(0, 300));
    await p.click('.qmf button:has-text("Umbrales")'); await esperar(200);
    await p.fill('#umbralesOv [data-umbral="faltasInjust"]', '20');
    await p.uncheck('#umbralesOv [data-umbral-cb="sinContacto"]');
    await p.click('#umbralesOv button:has-text("Guardar")'); await esperar(1300);
    c = await claves();
    t.ok(c[0] === '' && c[1] === 'partes', 'al subir el umbral y quitar «sin contacto», esas alertas desaparecen', JSON.stringify(c));
    await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(() => _alertasCfg.faltasInjust === 20 && _alertasCfg.sinContacto === 0), 'los umbrales se guardan');
    t.ok(await p.evaluate(() => buildState().alertasCfg.faltasInjust === 20), 'y viajan en el archivo y en las copias');
    await p.evaluate(() => { hideWelcomeScreen(); currentGrupos['1º ESO'] = 'A'; selectNivel('1º ESO'); }); await esperar(300);
    t.ok(await p.locator('#mainContent .alerta-insignia').count() === 2, 'la tabla marca con «⚠» a quien tiene alertas');
    await p.evaluate(() => { const st = buildState(); delete st.alertasCfg; applyFilePayload(st); });
    t.ok(await p.evaluate(() => _alertasCfg.faltasInjust === ALERTAS_CFG_DEFECTO.faltasInjust), 'un archivo sin umbrales vuelve a los de por defecto');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-ficha', descripcion: 'Tutoría: ficha completa del alumno/a (pestañas, observaciones) y entrevistas con la familia (alta, edición, acta, próxima cita, deshacer)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis']);
    await p.evaluate(() => { const a = data['1º ESO'].A[0]; a.familia = [{ parentesco: 'Madre', nombre: 'López Sanz, Marta', email: 'm@correo.es', telefono: '' }]; tutores['1º ESO-A'] = 'Gil Mora, Eva'; renderMain(); });
    await p.locator('#mainContent button[aria-label="Ficha completa del alumno/a"]').first().click(); await esperar(300);
    t.ok(/García López, Ana/.test(await p.textContent('#fichaCab')), 'el botón 👤 abre la ficha del alumno/a');
    // «Notas recibidas del equipo docente»: los títulos I, II, III y Final, centrados sobre sus notas.
    await p.evaluate(() => { data['1º ESO'].A[0].porMateria = { 'Matemáticas': { profesor: 'Zapata Ruiz, Luis', notas: { 1: 4, 2: 6.5, 3: 7, final: 7 } } }; });
    await p.click('#fichaPestanas button:has-text("Académico")'); await esperar(150);
    const desvio = await p.evaluate(() => { const tablas = [...document.querySelectorAll('#fichaBody table')], medio = el => { const r = (el.querySelector('span') || el).getBoundingClientRect(); return r.left + r.width / 2; };
      const t2 = tablas[1], ths = [...t2.querySelectorAll('thead th')].slice(1), tds = [...t2.querySelectorAll('tbody tr:first-child td')];
      const t1 = tablas[0], th1 = t1.querySelectorAll('thead th')[1], td1 = t1.querySelector('tbody tr td');
      const centroTexto = th => { const rg = document.createRange(); rg.selectNodeContents(th); const r = rg.getBoundingClientRect(); return r.left + r.width / 2; };
      return [...ths.map((th, i) => Math.abs(centroTexto(th) - medio(tds[i]))), Math.abs(centroTexto(th1) - medio(td1))].map(Math.round); });
    t.ok(desvio.length === 5 && desvio.every(d => d <= 3), 'en «Académico», los títulos I, II, III, Final y Suspensas quedan centrados sobre sus números', JSON.stringify(desvio));
    for (const pest of ['Académico', 'Faltas y convivencia', 'Seguimientos', 'Resumen']) { await p.click(`#fichaPestanas button:has-text("${pest}")`); await esperar(120); }
    await p.fill('#fichaBody textarea[aria-label="Observaciones del alumno/a"]', 'Le cuesta organizarse.');
    await p.dispatchEvent('#fichaBody textarea[aria-label="Observaciones del alumno/a"]', 'change');
    await p.click('#fichaPestanas button:has-text("Entrevistas")');
    await p.click('#fichaBody button:has-text("Nueva entrevista")'); await esperar(200);
    t.ok(/López Sanz, Marta \(Madre\).*Gil Mora, Eva \(tutor\/a\)/.test(await p.inputValue('#fichaBody input[placeholder^="Familia, tutor"]')), 'los asistentes se proponen con la familia y el tutor/a');
    const cita = await p.evaluate(() => { const d = new Date(_hoyLocal() + 'T00:00:00'); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); });
    await p.fill('#fichaBody textarea[placeholder^="Por qué"]', 'Faltas a primera hora');
    await p.fill('#fichaBody textarea[placeholder^="Qué se acuerda"]', 'La familia avisará de cada falta');
    await p.locator('#fichaBody .ent-form input[type="date"]').nth(1).fill(cita);
    await p.click('#fichaBody button:has-text("Guardar entrevista")'); await esperar(300);
    let ents = await p.evaluate(() => data['1º ESO'].A[0].entrevistas);
    t.ok(ents.length === 1 && ents[0].motivo === 'Faltas a primera hora' && ents[0].proximaCita === cita, 'la entrevista se guarda con motivo, acuerdos y próxima cita', JSON.stringify(ents));
    t.ok(await p.evaluate(() => _alertasAlumno(data['1º ESO'].A[0], '1º ESO').some(x => x.clave === 'cita')), 'la próxima cita sale como aviso');
    await p.click('#fichaBody button:has-text("Editar")'); await esperar(150);
    await p.fill('#fichaBody textarea[placeholder^="Qué se acuerda"]', 'Acuerdo cambiado'); await p.click('#fichaBody button:has-text("Guardar entrevista")'); await esperar(200);
    ents = await p.evaluate(() => data['1º ESO'].A[0].entrevistas);
    t.ok(ents.length === 1 && ents[0].acuerdos === 'Acuerdo cambiado', 'editar cambia la misma entrevista, no crea otra');
    await p.click('#fichaBody button:has-text("Acta")'); await esperar(400);
    const acta = await p.evaluate(() => { const fr = document.querySelector('#tdocOverlay iframe'); return fr ? fr.srcdoc : ''; });
    t.ok(/Acta de entrevista con la familia/.test(acta) && /Acuerdo cambiado/.test(acta) && /Fdo\.: la familia/.test(acta), 'el acta de la entrevista se abre para imprimir, con los acuerdos y las firmas', acta.slice(0, 200));
    await p.evaluate(() => { window.__cerrarVistaDocT && window.__cerrarVistaDocT(); closeFichaAlumno(); }); await esperar(1300);
    await p.reload(); await esperar(1500);
    const r = await p.evaluate(() => ({ n: data['1º ESO'].A[0].notas, e: (data['1º ESO'].A[0].entrevistas || []).length }));
    t.ok(r.n === 'Le cuesta organizarse.' && r.e === 1, 'las observaciones y la entrevista se guardan', JSON.stringify(r));
    await p.evaluate(() => { hideWelcomeScreen(); currentGrupos['1º ESO'] = 'A'; selectNivel('1º ESO'); openFichaAlumno('1º ESO', 'A', 0, 'entrevistas'); }); await esperar(200);
    await p.click('#fichaBody button[aria-label="Borrar esta entrevista"]'); await esperar(200);
    await p.locator('.tdlg-ov .tdlg-si').click(); await esperar(200);
    t.ok(await p.evaluate(() => data['1º ESO'].A[0].entrevistas.length) === 0, 'una entrevista se puede borrar');
    await p.evaluate(() => _undoPop()); await esperar(200);
    t.ok(await p.evaluate(() => data['1º ESO'].A[0].entrevistas.length) === 1, 'y se recupera con Ctrl+Z');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'sesion-evaluacion', descripcion: 'Sesión de evaluación: asistencia, valoración, propuesta y acuerdos alumno por alumno, acta automática, y ficha del grupo que el Cuaderno carga con «📥 De la tutoría»', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis'] });
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['GARCÍA LÓPEZ, ANA', 'Pérez Ruiz, Luis']);
    await p.evaluate(() => {
      const [ana, luis] = data['1º ESO'].A;
      Object.assign(ana, { nese: 'Sí', recursoNese: ['AL'], eval1: 3, pendientes1: ['Matemáticas', 'Inglés', 'Música'], pendientesAnteriores: ['Geografía e Historia (1º ESO)'],
        familia: [{ parentesco: 'Madre', nombre: 'Contacto Privado', email: 'privado@correo.es', telefono: '' }], entrevistas: [{ id: 'e1', fecha: _hoyLocal(), motivo: 'Entrevista privada' }] });
      Object.assign(luis, { repetidor: 'Sí', eval1: 1, pendientes1: ['Música'] });
      const d = _getAsistenciaData('1º ESO', 'A');
      d.profesores.push({ id: 'p1', nombre: 'Zapata Ruiz, Luis', materia: 'Matemáticas', correo: '' });
      ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: null, justificacion: '' }));
      tutores['1º ESO-A'] = 'Gil Mora, Eva'; renderMain();
    });
    await p.click('#mainContent button:has-text("Sesión de evaluación")'); await esperar(300);
    await p.selectOption('#sesCab select', '1'); await esperar(150);
    t.ok(/Música \(2\)/.test(await p.textContent('#sesMain')), 'el grupo muestra las materias con más suspensos');
    await p.check('#sesMain input[type=radio] >> nth=1'); await esperar(150);
    await p.fill('#sesMain input[aria-label="Motivo de la ausencia"]', 'Formación');
    await p.fill('#sesMain textarea[aria-label="Valoración general del grupo"]', 'Grupo trabajador pero hablador.');
    await p.fill('#sesMain textarea[aria-label="Propuestas de mejora y acuerdos del equipo docente"]', 'Cambiar la distribución de las mesas.');
    await p.click('#sesMain button:has-text("Empezar")'); await esperar(200);
    t.ok(/García López|GARCÍA LÓPEZ/.test(await p.textContent('#sesMain .ses-alumno-nombre')) && /Matemáticas/.test(await p.textContent('#sesMain .ses-mats')), 'cada alumno/a sale con sus materias suspensas');
    await p.click('#sesMain .ses-prop:has-text("Promoción")'); await esperar(150);
    await p.fill('#sesMain textarea[aria-label="Acuerdos para este alumno/a"]', 'Plan de refuerzo en Matemáticas.');
    await p.click('#sesMain button:has-text("Revisado y siguiente")'); await esperar(200);
    t.ok(/Pérez Ruiz/.test(await p.textContent('#sesMain .ses-alumno-nombre')) && /1 de 2 revisados/.test(await p.textContent('#sesCab')), '«Revisado y siguiente» marca y pasa al siguiente');
    await p.keyboard.press('ArrowLeft'); await esperar(150);
    t.ok(/GARCÍA LÓPEZ/.test(await p.textContent('#sesMain .ses-alumno-nombre')), 'las flechas del teclado cambian de alumno/a');
    const r = await p.evaluate(() => { const ana = data['1º ESO'].A[0], d = _getAsistenciaData('1º ESO', 'A');
      return { prop: ana.propuesta1.tipo, ac: ana.sesionEval['1'].acuerdos, rev: ana.sesionEval['1'].revisado, val: d.actasSesion['1'].valoracion, as: d.sesiones.eval1[0] }; });
    t.ok(r.prop === 'Promoción' && r.ac === 'Plan de refuerzo en Matemáticas.' && r.rev && r.val === 'Grupo trabajador pero hablador.' && r.as.asistio === false && r.as.justificacion === 'Formación',
      'se guardan la propuesta, los acuerdos, la valoración y la asistencia', JSON.stringify(r));
    await p.click('#sesCab button:has-text("Acta de evaluación")'); await esperar(400);
    const acta = await p.evaluate(() => document.querySelector('#tdocOverlay iframe')?.srcdoc || '');
    t.ok(/ACTA DE LA PRIMERA EVALUACIÓN/.test(acta) && /Plan de refuerzo en Matemáticas/.test(acta) && /Promoción/.test(acta) && /Zapata Ruiz, Luis[\s\S]{0,200}Matemáticas[\s\S]{0,80}No asiste<\/span> — Formación/.test(acta) && /Cambiar la distribución/.test(acta),
      'el acta se genera con asistencia, valoración, acuerdos y la propuesta de cada alumno/a');
    await p.evaluate(() => { __cerrarVistaDocT(); closeSesionEvaluacion(); });
    const ficha = await p.evaluate(() => fichaGrupoParaProfesorado('1º ESO', 'A', '1'));
    const textoFicha = JSON.stringify(ficha);
    t.ok(ficha.alumnos[0].nese && ficha.alumnos[1].repetidor && ficha.alumnos[0].acuerdos === 'Plan de refuerzo en Matemáticas.', 'la ficha del grupo lleva NESE, repetición y acuerdos');
    t.ok(!/Contacto Privado|privado@correo|Entrevista privada/.test(textoFicha), 'y no lleva contactos de la familia ni entrevistas');
    await p.evaluate(() => _undoPop()); await esperar(200);
    t.ok(await p.evaluate(() => data['1º ESO'].A[0].propuesta1.tipo) === '', 'Ctrl+Z deshace la decisión tomada en la sesión');
    // En el Cuaderno de un profesor/a: «📥 De la tutoría»
    await p.goto(t.url + '/'); await esperar(1500);
    const elegir = p.waitForEvent('filechooser');
    await p.evaluate(() => { _mostrarBienvenida = false; state.ui.grupoId = state.grupos[0].id; state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; render(); importarDeTutoria(); });
    await (await elegir).setFiles([{ name: 'ficha-grupo.json', mimeType: 'application/json', buffer: Buffer.from(textoFicha) }]); await esperar(400);
    const vista = await p.textContent('#deTutoriaOv');
    t.ok(/2 alumnos encontrados/.test(vista) && /Marcar NESE[^(]*\(1\)/.test(vista) && /Repite curso[^(]*\(1\)/.test(vista) && /Geografía e Historia[^(]*\(1\)/.test(vista), 'la vista previa dice qué va a cambiar', vista.slice(0, 300));
    await p.click('#deTutoriaOv button:has-text("Aplicar")'); await esperar(400);
    const c = await p.evaluate(() => { const [ana, luis] = state.grupos[0].alumnos; return { nese: ana.nese, rep: luis.repetidor, pend: ana.pendientes, dt: ana.deTutoria && ana.deTutoria.acuerdos, g: state.grupos[0].deTutoria && state.grupos[0].deTutoria.acuerdosGrupo }; });
    t.ok(c.nese && c.rep && c.pend.includes('1') && c.dt === 'Plan de refuerzo en Matemáticas.' && c.g === 'Cambiar la distribución de las mesas.', 'el Cuaderno marca NESE, repite, la pendiente de su materia y guarda los acuerdos', JSON.stringify(c));
    await p.evaluate(() => { state.ui.appMode = 'competencial'; state.ui.tab = 'alumnos'; state.ui.fichaAlumnoId = state.grupos[0].alumnos[0].id; render(); }); await esperar(300);
    t.ok(/De la tutoría[\s\S]*Plan de refuerzo en Matemáticas/.test(await p.textContent('body')), 'la ficha del alumno/a en el Cuaderno muestra lo acordado en la sesión');
    await p.evaluate(() => { state.ui.fichaAlumnoId = ''; state.ui.tab = 'resultados'; render(); }); await esperar(300);
    t.ok(/Acuerdos de la sesión de evaluación/.test(await p.textContent('body')), 'y Resultados, los acuerdos del grupo');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-informe-equipo', descripcion: 'Tutoría: informe HTML para el equipo docente (previo y tras la sesión): suspensas por alumno/a y por materia, más y menos suspensos, evolución, casos, sin datos privados', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '2º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria', 'Vidal Roca, Pau']);
    const D = await p.evaluate(() => {
      const al = data['2º ESO'].A;
      Object.assign(al[0], { eval1: 3, pendientes1: ['Matemáticas', 'Inglés', 'Música'], eval2: 4, pendientes2: ['Matemáticas', 'Inglés', 'Música', 'Física y Química'], faltasInjust2: 6, nese: 'Sí',
        familia: [{ parentesco: 'Madre', nombre: 'Contacto Privado', email: 'privado@correo.es', telefono: '' }], entrevistas: [{ id: 'e1', fecha: _hoyLocal(), motivo: 'Entrevista privada' }] });
      Object.assign(al[1], { eval1: 2, pendientes1: ['Música', 'Inglés'], eval2: 1, pendientes2: ['Música'] });
      Object.assign(al[3], { eval1: 1, pendientes1: ['Matemáticas'], eval2: 3, pendientes2: ['Matemáticas', 'Inglés', 'Música'] });
      al[0].porMateria = { 'Matemáticas': { profesor: 'Zapata Ruiz, Luis', notas: { 2: 3 }, comentarios: { 2: 'No entrega las tareas.' } } };
      al[2].porMateria = { 'Matemáticas': { profesor: 'Zapata Ruiz, Luis', notas: { 2: 8 }, comentarios: {} } };
      const d = _getAsistenciaData('2º ESO', 'A'); d.profesores.push({ id: 'p1', nombre: 'Zapata Ruiz, Luis', materia: 'Matemáticas', correo: 'z@gva.es', esTutor: true }, { id: 'p2', nombre: 'Gil Mora, Eva', materia: 'Tecnología', correo: '' });
      ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: null, justificacion: '' }, { asistio: null, justificacion: '' }));
      const D = datosInformeEquipo('2º ESO', 'A', '2');
      return { dist: D.dist, mas: D.mas.map(m => m.materia + m.suspensos), menos: D.menos.map(m => m.materia), sin: D.sinSuspensos, mates: D.materias.find(m => m.materia === 'Matemáticas'),
        cambios: D.alumnos.map(x => x.cambio), casos: D.casos.map(c => c.nombre), tras: D.trasSesion, mejoran: D.mejoran, empeoran: D.empeoran };
    });
    t.ok(JSON.stringify(D.dist) === '[1,1,0,1,1,0]', 'reparte al alumnado por número de suspensas', JSON.stringify(D.dist));
    t.ok(D.mas[0] === 'Música3' && D.sin.includes('Tecnología') && !D.menos.some(m => D.mas.map(x => x.replace(/\d+$/, '')).includes(m)), 'materias con más y menos suspensos (sin repetirse) y las que no tienen', JSON.stringify(D));
    t.ok(D.mates.suspensos === 2 && D.mates.media === 5.5 && D.mates.profesor === 'Zapata Ruiz, Luis' && D.mates.antes === 2, 'cada materia: suspensos, nota media recibida, profesor/a y evolución', JSON.stringify(D.mates));
    t.ok(JSON.stringify(D.cambios) === '[1,-1,0,2]' && D.mejoran === 1 && D.empeoran === 2, 'compara con la evaluación anterior', JSON.stringify(D));
    t.ok(D.casos.includes('García López, Ana') && D.casos.includes('Vidal Roca, Pau') && !D.tras, 'propone los casos para comentar; sin sesión, es la versión previa', JSON.stringify(D.casos));
    await p.evaluate(() => { currentGrupos['2º ESO'] = 'A'; selectNivel('2º ESO'); });
    await p.click('#mainContent .mas-menu > summary'); await p.click('#mainContent button:has-text("Informe para el equipo docente")'); await esperar(200);
    await p.selectOption('#informeEquipoOv #ieEval', '2'); await esperar(100);
    t.ok(/Versión previa a la sesión/.test(await p.textContent('#informeEquipoOv')), 'la ventana avisa de que es la versión previa');
    // Correo: «Outlook web» abre la ventana de redactar de Outlook en el navegador (cuenta corporativa); el de siempre sigue.
    await p.evaluate(() => { const d = _getAsistenciaData('2º ESO', 'A'); d.profesores.forEach((x, i) => { x.correo = `profe${i}@edu.gva.es`; });
      window.__abiertas = []; window.open = (u, dest, op) => { window.__abiertas.push([u, dest, op]); return {}; }; });
    await p.selectOption('#informeEquipoOv #ieEval', '1'); await p.selectOption('#informeEquipoOv #ieEval', '2'); await esperar(100);
    await p.click('#informeEquipoOv button:has-text("Outlook web")'); await esperar(100);
    const ow = await p.evaluate(() => ({ abiertas: window.__abiertas, n: _getAsistenciaData('2º ESO', 'A').profesores.length, botones: [...document.querySelectorAll('#informeEquipoOv button')].map(b => b.textContent.trim()) }));
    const url = new URL(ow.abiertas[0]?.[0] || 'about:blank');
    t.ok(url.origin === 'https://outlook.office.com' && url.pathname === '/mail/deeplink/compose' && url.searchParams.get('to').split(',').length === ow.n && /^profe0@edu\.gva\.es/.test(url.searchParams.get('to')) &&
      /2º ESO A · II Evaluación · informe previo/.test(url.searchParams.get('subject')) && /Os adjunto el informe/.test(url.searchParams.get('body')) && ow.abiertas[0][1] === '_blank',
      '«✉ Outlook web» abre «Redactar» de Outlook en el navegador con destinatarios, asunto y texto', JSON.stringify(ow).slice(0, 400));
    t.ok(ow.botones.some(b => /Programa de correo/.test(b)) && /adjuntarlo: descárgalo antes/.test(await p.textContent('#informeEquipoOv')), 'sigue el botón del programa de correo del equipo y explica que el .html se adjunta a mano', JSON.stringify(ow.botones));
    const bajada = p.waitForEvent('download');
    await p.click('#informeEquipoOv button:has-text("Descargar")');
    const arch = await bajada; const fs = await import('node:fs');
    const html = fs.readFileSync(await arch.path(), 'utf8');
    t.ok(/previo\.html$/.test(arch.suggestedFilename()) && /Informe previo a la sesión/.test(html) && /García López, Ana/.test(html) && /No entrega las tareas/.test(html) && !/<script/i.test(html), 'descarga un .html sin scripts, con el alumnado y los comentarios del profesorado', arch.suggestedFilename());
    t.ok(!/Contacto Privado|privado@correo|Entrevista privada/.test(html), 'y sin contactos de la familia ni entrevistas');
    await p.evaluate(() => { const al = data['2º ESO'].A; al[0].propuesta2 = { tipo: 'Promoción', destino: '' }; al[0].sesionEval = { 2: { acuerdos: 'Plan de refuerzo en Matemáticas.', revisado: true } };
      _getAsistenciaData('2º ESO', 'A').actasSesion = { 2: { valoracion: 'Grupo trabajador.', acuerdosGrupo: 'Cambiar las mesas.' } }; });
    const tras = await p.evaluate(() => informeEquipoHTML('2º ESO', 'A', '2'));
    t.ok(/Actualizado tras la sesión/.test(tras) && /Plan de refuerzo en Matemáticas/.test(tras) && /Promoción/.test(tras) && /Cambiar las mesas/.test(tras), 'tras la sesión lleva propuestas, acuerdos y la valoración del grupo');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-datos-materia', descripcion: 'Tutoría: datos de una materia introducidos a mano (pegar de Excel, suspensa sin nota, validación, guardado, suspensas, equipo docente, 📬 e informe, deshacer)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '2º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria', 'Vidal Roca, Pau']);
    await p.evaluate(() => { currentGrupos['2º ESO'] = 'A'; selectNivel('2º ESO'); });
    await p.click('#mainContent .mas-menu > summary'); await p.click('#mainContent button:has-text("Introducir datos de una materia")'); await esperar(200);
    // La materia se elige en un desplegable; «➕ Otra materia…» deja escribir una que no está.
    await p.selectOption('#dmMateriaSel', '__otra'); await esperar(50);
    await p.fill('#dmMateriaOtra', 'Inglés'); await p.press('#dmMateriaOtra', 'Enter'); await esperar(150);
    await p.fill('#dmCab input[placeholder^="Se añade"]', 'Eva Gil Mora');
    // Dos columnas copiadas de Excel (nota y faltas sin justificar) pegadas en la primera nota.
    await p.evaluate(() => { const inp = document.querySelector('#dmBody input[data-r="0"][data-c="nota"]'), dt = new DataTransfer();
      dt.setData('text/plain', '3,5\t2\n7\t0\n4\t5\n'); inp.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
    let f = await p.evaluate(() => _dmCtx.filas.map(x => [x.nota, x.fi, x.susp]));
    t.ok(JSON.stringify(f.slice(0, 3)) === JSON.stringify([['3,5', '2', true], ['7', '0', false], ['4', '5', true]]), 'pegar de Excel reparte las columnas y marca «Susp.» con nota menor que 5', JSON.stringify(f));
    await p.check('#dmBody input[data-r="3"][data-c="susp"]');
    await p.fill('#dmBody input[data-r="0"][data-c="com"]', 'No entrega las tareas.');
    await p.fill('#dmBody input[data-r="1"][data-c="ac"]', 'dos');
    await p.click('#dmPie button:has-text("Guardar")'); await esperar(200);
    t.ok(await p.evaluate(() => !!document.querySelector('#dmBody .dm-mal') && !data['2º ESO'].A[0].porMateria), 'un valor que no vale se marca en rojo y no se guarda nada');
    await p.locator('.tdlg-ov .tdlg-si').click().catch(() => {}); await esperar(100);
    await p.fill('#dmBody input[data-r="1"][data-c="ac"]', '2');
    await p.click('#dmPie button:has-text("Guardar")'); await esperar(300);
    const r = await p.evaluate(() => { const al = data['2º ESO'].A, pm = a => (a.porMateria || {})['Inglés'] || {};
      return { pend: al.map(a => (a.pendientes1 || []).includes('Inglés')), eval1: al.map(a => a.eval1), nota0: pm(al[0]).notas['1'], com0: pm(al[0]).comentarios['1'], f2: pm(al[2]).faltas['1'].injustificadas, curso2: pm(al[2]).faltas.curso.injustificadas,
        ac1: pm(al[1]).convivencia['1'].ac, susp3: pm(al[3]).suspensa['1'], equipo: _getAsistenciaData('2º ESO', 'A').profesores.map(x => x.nombre + '|' + x.materia) }; });
    t.ok(JSON.stringify(r.pend) === '[true,false,true,true]' && JSON.stringify(r.eval1) === '[1,0,1,1]', 'las suspensas (también la marcada sin nota) pasan a la I Evaluación del grupo', JSON.stringify(r));
    t.ok(r.nota0 === 3.5 && r.com0 === 'No entrega las tareas.' && r.f2 === 5 && r.curso2 === 5 && r.ac1 === 2 && r.susp3 === true, 'se guardan nota, comentario, faltas (y el total del curso) y convivencia', JSON.stringify(r));
    t.ok(JSON.stringify(r.equipo) === JSON.stringify(['Gil Mora, Eva|Inglés']), 'el profesor/a entra en el equipo docente en «Apellidos, Nombre»', JSON.stringify(r.equipo));
    const panel = await p.evaluate(() => { closeDatosMateria(); openInformacionEquipo('2º ESO', 'A'); return document.querySelector('#infEquipoBody tr[data-materia="Inglés"]').innerText; });
    t.ok(/Introducido a mano/.test(panel) && /4\/4/.test(panel), '📬 lo cuenta como recibido e indica que se introdujo a mano', panel.replace(/\s+/g, ' '));
    const ie = await p.evaluate(() => { closeInformacionEquipo(); const m = datosInformeEquipo('2º ESO', 'A', '1').materias.find(x => x.materia === 'Inglés'); return [m.suspensos, m.media]; });
    t.ok(ie[0] === 3 && ie[1] === 4.83, 'el informe para el equipo docente lo usa (suspensos y nota media)', JSON.stringify(ie));
    await p.evaluate(() => openDatosMateria('2º ESO', 'A', '1', 'Inglés')); await esperar(150);
    t.ok(await p.inputValue('#dmBody input[data-r="0"][data-c="nota"]') === '3,5' && await p.isChecked('#dmBody input[data-r="3"][data-c="susp"]'), 'al volver a abrirlo sale lo guardado, para corregirlo');
    await p.fill('#dmBody input[data-r="1"][data-c="nota"]', '2'); await esperar(50);
    await p.evaluate(() => { closeDatosMateria(); }); await esperar(200);
    t.ok(/sin guardar/.test(await p.textContent('.tdlg-ov')), 'si se cierra con cambios sin guardar, lo pregunta');
    await p.locator('.tdlg-ov .tdlg-si').click(); await esperar(1300);
    await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(() => data['2º ESO'].A[0].porMateria['Inglés'].notas['1'] === 3.5 && data['2º ESO'].A[1].porMateria['Inglés'].notas['1'] === 7), 'lo guardado se conserva al recargar y lo no guardado no');
    await p.evaluate(() => { hideWelcomeScreen(); currentGrupos['2º ESO'] = 'A'; selectNivel('2º ESO'); openDatosMateria('2º ESO', 'A', '1', 'Inglés'); }); await esperar(150);
    await p.uncheck('#dmBody input[data-r="3"][data-c="susp"]'); await p.click('#dmPie button:has-text("Guardar")'); await esperar(200);
    t.ok(await p.evaluate(() => !data['2º ESO'].A[3].pendientes1.includes('Inglés') && data['2º ESO'].A[3].eval1 === 0), 'desmarcar «Susp.» la quita de las suspensas');
    await p.evaluate(() => _undoPop()); await esperar(150);
    t.ok(await p.evaluate(() => data['2º ESO'].A[3].pendientes1.includes('Inglés')), 'y Ctrl+Z lo deshace');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-acta-calificaciones', descripcion: 'Tutoría: cambiar de materia en «Datos de una materia» (desplegable, «Guardar y siguiente») y acta de calificaciones como la de Itaca (notas, S, recuentos, abreviaturas, sin nombres)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '2º Bach.', 'HS', ['Pérez Ruiz, Luis', 'Andrés Lozano, Claudia', 'Sanz Martí, Íria']);
    await p.evaluate(() => {
      ['Historia de España|Pérez Gil, Ana', 'Lengua Castellana y Literatura II|Gil Mora, Eva', 'Historia del Arte|Ruiz Sanz, Toni'].forEach(x => { const [m, pr] = x.split('|'); _tAplicarProfesor('2º Bach.', 'HS', m, pr); });
      data['2º Bach.'].HS.forEach(a => { a.familia = [{ parentesco: 'Madre', nombre: 'Contacto Privado', email: 'privado@correo.es', telefono: '600000000' }]; });
      currentGrupos['2º Bach.'] = 'HS'; selectNivel('2º Bach.'); openDatosMateria('2º Bach.', 'HS', '1');
    }); await esperar(200);
    const grupos = await p.$$eval('#dmMateriaSel optgroup', g => g.map(x => [x.label, [...x.children].map(o => o.value)]));
    t.ok(grupos[0][0] === 'Materias del grupo' && JSON.stringify(grupos[0][1]) === JSON.stringify(['Historia de España', 'Lengua Castellana y Literatura II', 'Historia del Arte']) && grupos[1][1].length > 5,
      'el desplegable ofrece todas las materias: las del grupo primero y después las demás del nivel', JSON.stringify(grupos).slice(0, 300));
    t.ok(await p.evaluate(() => _dmCtx.materia) === 'Historia de España', 'propone la primera materia del grupo sin datos');
    await p.selectOption('#dmMateriaSel', 'Historia del Arte'); await esperar(150);
    t.ok(await p.evaluate(() => _dmCtx.materia === 'Historia del Arte' && _dmCtx.profesor === 'Ruiz Sanz, Toni'), 'se puede cambiar a cualquier materia (y trae su profesor/a)');
    for (const [i, v] of ['4', '7,5', '9'].entries()) await p.fill(`#dmBody input[data-r="${i}"][data-c="nota"]`, v);
    await p.click('#dmPie button:has-text("Guardar y siguiente")'); await esperar(250);
    t.ok(await p.evaluate(() => _dmCtx.materia) === 'Historia de España', '«Guardar y siguiente» guarda y pasa a la siguiente materia del grupo sin datos');
    await p.check('#dmBody input[data-r="1"][data-c="susp"]');
    for (const [i, v] of [[0, '6'], [2, '3']]) await p.fill(`#dmBody input[data-r="${i}"][data-c="nota"]`, v);
    await p.click('#dmPie button:has-text("Guardar y siguiente")'); await esperar(250);
    t.ok(await p.evaluate(() => _dmCtx.materia) === 'Lengua Castellana y Literatura II', 'y luego a la siguiente');
    await p.selectOption('#dmMateriaSel', 'Historia de España'); await esperar(150);
    t.ok(await p.inputValue('#dmBody input[data-r="0"][data-c="nota"]') === '6' && await p.isChecked('#dmBody input[data-r="1"][data-c="susp"]'), 'al volver a una materia guardada sale lo que tenía');
    const D = await p.evaluate(() => { const d = datosActaCalificaciones('2º Bach.', 'HS', '1');
      return { nombres: d.filas.map(f => f.nombre), mats: d.porMateria.map(m => [m.abrev, m.calificados, m.suspensos, m.media, m.profesor]), celdas: d.filas.map(f => f.celdas.map(c => c ? c.texto : '')), susp: d.filas.map(f => f.susp), media: d.filas.map(f => f.media), reparto: d.reparto.map(r => r.n), sin: d.sinCalificar }; });
    t.ok(JSON.stringify(D.nombres) === JSON.stringify(['Andrés Lozano, Claudia', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria']), 'relación alfabética del alumnado', JSON.stringify(D.nombres));
    t.ok(JSON.stringify(D.mats) === JSON.stringify([['HE', 3, 2, 4.5, 'Pérez Gil, Ana'], ['LCL II', 0, 0, null, 'Gil Mora, Eva'], ['HA', 3, 1, 6.83, 'Ruiz Sanz, Toni']]),
      'cada materia con su abreviatura, calificados, suspensos, media y profesor/a, en el orden del nivel', JSON.stringify(D.mats));
    t.ok(JSON.stringify(D.celdas) === JSON.stringify([['6', '', '4'], ['S', '', '7,5'], ['3', '', '9']]) && JSON.stringify(D.susp) === '[1,1,1]' && JSON.stringify(D.media) === '[5,7.5,6]',
      'la nota de cada alumno/a en cada materia (S si suspende sin nota), sus suspensas y su media', JSON.stringify(D));
    t.ok(JSON.stringify(D.reparto) === '[0,3,0,0]' && JSON.stringify(D.sin) === JSON.stringify(['Lengua Castellana y Literatura II']), 'reparto por número de suspensas y aviso de la materia sin calificar', JSON.stringify(D));
    // Desde el pie de la tabla: ventana del acta, sin nombres y descarga.
    await p.click('#dmPie button:has-text("Acta de calificaciones")'); await esperar(200);
    t.ok(/2 de 3 materias con calificaciones/.test(await p.textContent('#actaCalifOv')) && /Faltan: Lengua Castellana/.test(await p.textContent('#actaCalifOv')), 'la ventana dice cuántas materias tienen notas y cuáles faltan');
    await p.check('#acSinNombres');
    const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#actaCalifOv [data-acc="descargar"]')]);
    const html = await (await import('node:fs/promises')).readFile(await descarga.path(), 'utf8');
    t.ok(descarga.suggestedFilename() === 'acta-calificaciones-2-bach-hs-eval1.html', 'se descarga con un nombre claro', descarga.suggestedFilename());
    t.ok(/ACTA DE CALIFICACIONES · PRIMERA EVALUACIÓN/i.test(html) && /Pérez Gil, Ana/.test(html) && /<td class="s">S<\/td>/.test(html) && /% de aprobados/.test(html), 'el acta lleva cabecera, notas, suspensas y recuentos', html.length);
    t.ok(!/Andrés Lozano|Pérez Ruiz|Sanz Martí/.test(html), 'con «Sin los nombres» solo va el número de orden');
    t.ok(!/<script/i.test(html) && !/privado@correo|Contacto Privado|600000000/.test(html), 'sin código ni contactos de las familias');
    await p.uncheck('#acSinNombres');
    await p.click('#actaCalifOv [data-acc="ver"]'); await esperar(400);
    const vista = await p.frameLocator('#tdocOverlay iframe').locator('table.acta').innerText();
    t.ok(/Andrés Lozano, Claudia/.test(vista) && /HE/.test(vista), '«Ver e imprimir» la abre en la vista de documentos, para imprimir o guardar en PDF', vista.slice(0, 120));
    // Abreviaturas propias, como en Itaca: se guardan, sirven para todos los grupos y viajan en los archivos.
    await p.evaluate(() => { __cerrarVistaDocT(); abrirActaCalificaciones('2º Bach.', 'HS', '1'); }); await esperar(150);
    await p.click('#acAbrevs summary');
    t.ok(await p.getAttribute('#actaCalifOv input[aria-label="Abreviatura de Historia del Arte"]', 'placeholder') === 'HA', 'cada materia muestra la abreviatura automática como sugerencia');
    await p.fill('#actaCalifOv input[aria-label="Abreviatura de Historia del Arte"]', 'HART'); await p.press('#actaCalifOv input[aria-label="Abreviatura de Historia del Arte"]', 'Enter');
    await p.fill('#actaCalifOv input[aria-label="Abreviatura de Historia de España"]', 'HA'); await p.press('#actaCalifOv input[aria-label="Abreviatura de Historia de España"]', 'Tab');
    await esperar(1300);
    const ab = await p.evaluate(() => datosActaCalificaciones('2º Bach.', 'HS', '1').abrevs);
    t.ok(JSON.stringify(ab) === JSON.stringify(['HA', 'LCL II', 'HART']), 'el acta usa las abreviaturas escritas (y no las cambia aunque se parezcan a otra automática)', JSON.stringify(ab));
    await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(() => _abrevMaterias['Historia del Arte'] === 'HART' && buildState().abrevMaterias['Historia de España'] === 'HA' && /<th scope="col" class="m" title="Historia del Arte">HART<\/th>/.test(actaCalificacionesHTML('2º Bach.', 'HS', '1'))),
      'se conservan al recargar, van en el archivo y salen en el acta');
    t.ok(await p.evaluate(() => { const st = buildState(); delete st.abrevMaterias; applyFilePayload(st); const vacio = !Object.keys(_abrevMaterias).length;
      st.abrevMaterias = { 'Historia del Arte': 'HART' }; applyFilePayload(st); return vacio && _abrevMaterias['Historia del Arte'] === 'HART'; }), 'un archivo sin abreviaturas vuelve a las automáticas, y uno con ellas las trae');
    await p.evaluate(() => { hideWelcomeScreen(); currentGrupos['2º Bach.'] = 'HS'; selectNivel('2º Bach.'); openActaOficialMenu('2º Bach.', 'HS'); }); await esperar(150);
    t.ok(await p.isVisible('#actaMenuOverlay button:has-text("Acta de calificaciones")'), 'también está en el menú del Acta Oficial');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-no-cursa', descripcion: 'Tutoría: materias que no cursa todo el grupo (optativas, Inglés/Francés): «No la cursa», ver solo a quien la cursa, pegar saltándolos, 📬 y acta con «—», «Sin nota» y columnas agrupadas como Itaca', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const N = '2º Bach.';
    await tutoriaConAlumnos(p, t.url, N, 'HS', ['Andrés Lozano, Claudia', 'Barabaschi Godoy, Santiago', 'Bataller Martínez, Nuria', 'Boente Barberá, Paula']);
    const pegar = (r, txt) => p.evaluate(({ r, txt }) => { const inp = document.querySelector(`#dmBody input[data-r="${r}"][data-c="nota"]`), dt = new DataTransfer(); dt.setData('text/plain', txt); inp.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, { r, txt });
    // Inglés II y Francés II no vienen en la plantilla de 2.º Bach.: se añaden a ⚙ Materias, como haría el tutor/a (ahí manda el catálogo).
    await p.evaluate(N => { ['Inglés II', 'Francés II'].forEach(m => _tAnadirAlCatalogo(N, 'HS', m));
      ['Historia de España|Pérez Gil, Ana', 'Inglés II|Gil Mora, Eva', 'Francés II|Roig Puig, Pau'].forEach(x => { const [m, pr] = x.split('|'); _tAplicarProfesor(N, 'HS', m, pr); });
      currentGrupos[N] = 'HS'; selectNivel(N); openDatosMateria(N, 'HS', '1', 'Francés II'); }, N); await esperar(200);
    // Francés: solo Barabaschi (1) y Boente (3). Se marca al resto, se ven solo quienes la cursan y se pega la columna del profesor/a.
    await p.check('#dmBody input[data-r="0"][data-c="nc"]'); await p.check('#dmBody input[data-r="2"][data-c="nc"]');
    t.ok(await p.isDisabled('#dmBody input[data-r="0"][data-c="nota"]'), 'quien no la cursa no tiene casillas para escribir');
    await p.check('#dmSolo');
    t.ok(!(await p.isVisible('#dmBody input[data-r="0"][data-c="nc"]')) && await p.isVisible('#dmBody input[data-r="1"][data-c="nc"]'), '«Ver solo a quien la cursa» esconde al resto');
    await pegar(1, '7\n4\n');
    const fr = await p.evaluate(() => _dmCtx.filas.map(f => f.nota));
    t.ok(JSON.stringify(fr) === JSON.stringify(['', '7', '', '4']), 'al pegar la columna del profesor/a, las notas caen solo en quien la cursa', JSON.stringify(fr));
    t.ok(/1 suspenso de 2 que la cursan \(2 no la cursan\)/.test(await p.textContent('#dmResumen')), 'el resumen cuenta solo a quien la cursa', await p.textContent('#dmResumen'));
    await p.click('#dmPie button:has-text("Guardar Francés II")'); await esperar(200);
    // Inglés: notas de los otros dos y «Quien está en blanco no la cursa».
    await p.uncheck('#dmSolo');
    await p.evaluate(() => _dmCambiar('materia', 'Inglés II')); await esperar(150);
    await p.fill('#dmBody input[data-r="0"][data-c="nota"]', '6'); await p.fill('#dmBody input[data-r="2"][data-c="nota"]', '3');
    await p.click('#dmBlancoNC'); await esperar(100);
    t.ok(JSON.stringify(await p.evaluate(() => _dmCtx.filas.map(f => f.nc))) === '[false,true,false,true]', '«Quien está en blanco no la cursa» marca al resto');
    await p.click('#dmPie button:has-text("Guardar Inglés II")'); await esperar(200);
    // Historia de España: falta la nota de una alumna.
    await p.evaluate(() => _dmCambiar('materia', 'Historia de España')); await esperar(150);
    for (const [r, v] of [[0, '6'], [1, '5'], [2, '3']]) await p.fill(`#dmBody input[data-r="${r}"][data-c="nota"]`, v);
    await p.click('#dmPie button:has-text("Guardar Historia")'); await esperar(200);
    const al = await p.evaluate(N => data[N].HS.map(a => [a.noCursa || [], Object.keys(a.porMateria || {}).sort()]), N);
    t.ok(JSON.stringify(al) === JSON.stringify([[['Francés II'], ['Historia de España', 'Inglés II']], [['Inglés II'], ['Francés II', 'Historia de España']], [['Francés II'], ['Historia de España', 'Inglés II']], [['Inglés II'], ['Francés II']]]),
      'se apunta qué no cursa cada uno y no se guardan datos vacíos ni de lo que no cursa', JSON.stringify(al));
    t.ok(await p.evaluate(N => data[N].HS[3].pendientes1.includes('Francés II') && !data[N].HS[3].pendientes1.includes('Inglés II'), N), 'las suspensas solo cuentan las materias que cursa');
    await p.evaluate(() => _dmCambiar('k', '2')); await p.evaluate(() => _dmCambiar('materia', 'Francés II')); await esperar(150);
    t.ok(JSON.stringify(await p.evaluate(() => _dmCtx.filas.map(f => f.nc))) === '[true,false,true,false]', 'en la II Evaluación ya sale marcado quién no la cursa');
    const bz = await p.evaluate(N => { closeDatosMateria(); openInformacionEquipo(N, 'HS', 'materias'); _infSet('periodo', '1');
      return ['Francés II', 'Inglés II', 'Historia de España'].map(m => document.querySelector(`#infEquipoBody tr[data-materia="${m}"] td:nth-child(4)`).textContent.trim()); }, N);
    t.ok(JSON.stringify(bz) === '["2/2","2/2","3/4"]', '📬 cuenta solo a quien la cursa (y se ve la nota que falta)', JSON.stringify(bz));
    // Acta: «—», fila «Sin nota» y columnas agrupadas (LE II con AN / FR, como Itaca).
    let D = await p.evaluate(N => { closeInformacionEquipo(); const d = datosActaCalificaciones(N, 'HS', '1'); return { cols: d.columnas.map(c => c.nombre), he: d.columnas[0].sinNota, faltan: d.faltanNotas, fr: d.filas.map(f => f.celdas[d.materias.indexOf('Francés II')].texto) }; }, N);
    t.ok(JSON.stringify(D.fr) === JSON.stringify(['—', '7', '—', '4']) && D.he === 1 && JSON.stringify(D.faltan) === JSON.stringify([{ materia: 'Historia de España', n: 1 }]),
      'en el acta «—» es que no la cursa y se avisa de la nota que falta', JSON.stringify(D));
    await p.evaluate(N => abrirActaCalificaciones(N, 'HS', '1'), N); await esperar(150);
    t.ok(/Alumnado sin nota .*Historia de España \(1\)/.test(await p.textContent('#actaCalifOv')), 'la ventana del acta avisa de quién no tiene nota');
    await p.click('#acAbrevs summary');
    for (const [m, ab] of [['Inglés II', 'AN'], ['Francés II', 'FR']]) {
      await p.fill(`#actaCalifOv input[aria-label="Abreviatura de ${m}"]`, ab); await p.press(`#actaCalifOv input[aria-label="Abreviatura de ${m}"]`, 'Tab');
      await p.fill(`#actaCalifOv input[aria-label="Columna del acta de ${m}"]`, 'LE II'); await p.press(`#actaCalifOv input[aria-label="Columna del acta de ${m}"]`, 'Tab');
    }
    await esperar(1300);
    D = await p.evaluate(N => { const d = datosActaCalificaciones(N, 'HS', '1'), le = d.columnas.findIndex(c => c.nombre === 'LE II');
      return { cols: d.columnas.map(c => c.nombre + (c.agrupada ? '*' : '')), le: d.filas.map(f => f.cols[le].items.map(i => i.abrev + ' ' + i.texto).join()), cifras: [d.columnas[le].calificados, d.columnas[le].suspensos, d.columnas[le].media],
        html: actaCalificacionesHTML(N, 'HS', '1') }; }, N);
    t.ok(JSON.stringify(D.cols) === JSON.stringify(['HE', 'LE II*']) && JSON.stringify(D.le) === JSON.stringify(['AN 6', 'FR 7', 'AN 3', 'FR 4']) && JSON.stringify(D.cifras) === '[4,2,5]',
      'Inglés y Francés van juntas en la columna LE II con su abreviatura delante, y sus cifras juntas', JSON.stringify(D.cols) + JSON.stringify(D.le) + JSON.stringify(D.cifras));
    t.ok(/<th scope="colgroup" colspan="2"[^>]*>LE II<\/th>/.test(D.html) && /<th scope="col" class="ab">Abr\.<\/th><th scope="col" class="m">Calif\.<\/th>/.test(D.html) && /<th colspan="2" scope="row">Sin nota<\/th>/.test(D.html),
      'el acta lleva la columna agrupada con «Abr.» y «Calif.» y la fila «Sin nota»');
    await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(N => _columnasActa['Inglés II'] === 'LE II' && buildState().columnasActa['Francés II'] === 'LE II' && (data[N].HS[0].noCursa || [])[0] === 'Francés II', N),
      'las columnas y quién no cursa qué se conservan al recargar y van en el archivo');
    t.ok(await p.evaluate(() => { const st = buildState(); delete st.columnasActa; applyFilePayload(st); return !Object.keys(_columnasActa).length; }), 'un archivo sin columnas agrupadas vuelve a una columna por materia');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-materias-catalogo', descripcion: 'Tutoría: la materia del equipo docente se elige de ⚙ Materias; las escritas a mano se ponen al día (también en el alumnado) y el desplegable de pendientes no esconde ni borra las que no están en el catálogo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '2º Bach.', 'HS', ['Fernández Fernández, Ismael', 'Andrés Lozano, Claudia']);
    await p.evaluate(() => {
      const d = _getAsistenciaData('2º Bach.', 'HS');
      [['Mora Gil, Iván', 'Historia de España'], ['Pérez Gil, Ana', 'Matemáticas aplicadas a la CCSS II'], ['Gil Mora, Eva', 'Lengua extranjera II (Inglés)'],
       ['Ruiz Sanz, Toni', 'Producción Musical'], ['Sanz Leal, Leo', 'Producción Musical (sustituto)'], ['Vidal Roig, Pau', 'Religión Católica']].forEach(([nombre, materia], i) => {
        d.profesores.push({ id: 'p' + i, nombre, materia, correo: '' });
        ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: null, justificacion: '' }));
      });
      const [a, b] = data['2º Bach.'].HS;
      a.pendientes1 = ['Historia de España', 'Matemáticas aplicadas a la CCSS II', 'Lengua extranjera II (Inglés)', 'historia de la filosofia']; a.eval1 = 4;
      a.porMateria = { 'Matemáticas aplicadas a la CCSS II': { origen: 'manual', notas: { 1: 3 }, faltas: {}, convivencia: {}, comentarios: {} } };
      b.porMateria = { 'Religión Católica': { origen: 'manual', notas: { 1: 8 } }, 'Religión': { origen: 'manual', notas: { 1: 7 } } };
      selectNivel('2º Bach.'); currentGrupos['2º Bach.'] = 'HS'; renderMain(); markDirty();
    }); await esperar(300);
    const abrirPend = () => p.evaluate(() => { const tbl = document.getElementById('tbl-2º Bach.-HS'); const el = tbl.querySelector('tbody tr[data-idx="0"] .pendientes-display[onclick*="\'pendientes1\'"]'); el.click(); });
    const panel = () => p.evaluate(() => { const pn = document.querySelector('.pendientes-panel'); return { titulo: pn.querySelector('.pendientes-panel-title').textContent.replace(/\s+/g, ' ').trim(), grupos: [...pn.querySelectorAll('.pendientes-group-header')].map(h => h.textContent),
      marcadas: [...pn.querySelectorAll('input:checked')].map(c => c.closest('label').textContent.trim()) }; });
    // 1. El desplegable de I PEND.: las que no están en el catálogo se ven, marcadas, y «Hecho» no las borra.
    await abrirPend(); await esperar(150);
    let r = await panel();
    t.ok(/4 seleccionadas/.test(r.titulo) && r.marcadas.length === 4, 'las 4 suspensas salen marcadas (antes solo se veían las del catálogo)', JSON.stringify(r));
    t.ok(r.grupos[0] === 'Fuera del catálogo' && r.marcadas.includes('Matemáticas aplicadas a la CCSS II') && r.marcadas.includes('Lengua extranjera II (Inglés)'), 'las que no están en ⚙ Materias aparecen arriba, en «Fuera del catálogo»', JSON.stringify(r));
    t.ok(r.marcadas.includes('Historia de la Filosofía'), 'una escrita con otras mayúsculas o sin tildes sale marcada en su sitio del catálogo', JSON.stringify(r));
    await p.click('.pendientes-panel button:has-text("Hecho")'); await esperar(150);
    let a0 = await p.evaluate(() => data['2º Bach.'].HS[0].pendientes1);
    t.ok(a0.length === 4 && a0.includes('Matemáticas aplicadas a la CCSS II') && a0.includes('historia de la filosofia'), '«Hecho» sin tocar nada no borra ninguna (ni renombra la que estaba escrita distinta)', JSON.stringify(a0));
    await abrirPend(); await esperar(150);
    await p.evaluate(() => { [...document.querySelectorAll('.pendientes-panel input')].find(c => c.value === 'Lengua extranjera II (Inglés)').click(); });
    await p.click('.pendientes-panel button:has-text("Hecho")'); await esperar(150);
    a0 = await p.evaluate(() => data['2º Bach.'].HS[0].pendientes1);
    t.ok(a0.length === 3 && !a0.includes('Lengua extranjera II (Inglés)'), 'desmarcar una de fuera del catálogo la quita solo a ella', JSON.stringify(a0));
    await p.evaluate(() => { data['2º Bach.'].HS[0].pendientes1.push('Lengua extranjera II (Inglés)'); });
    // 2. Equipo docente: la materia es un desplegable del catálogo y las escritas a mano se señalan.
    await p.evaluate(() => openEquipoDocente('2º Bach.', 'HS')); await esperar(200);
    r = await p.evaluate(() => ({ selects: document.querySelectorAll('#eqDocenteBody select.eq-materia').length, inputsMateria: document.querySelectorAll('#eqDocenteBody input[placeholder="Materia"]').length,
      opciones: [...document.querySelector('#eqDocenteBody select.eq-materia').options].map(o => o.textContent), avisos: [...document.querySelectorAll('#eqDocenteBody .eq-mat-hint')].map(h => h.textContent.replace(/\s+/g, ' ').trim()),
      banner: /4 materias están escritas con un nombre que no está en ⚙ Materias/.test(document.getElementById('eqDocenteBody').textContent) }));
    t.ok(r.selects === 6 && !r.inputsMateria && r.opciones.includes('Matemáticas CCSS II') && r.opciones.some(o => /Otra materia/.test(o)), 'la materia se elige en un desplegable con el catálogo del nivel y «＋ Otra materia»', JSON.stringify(r).slice(0, 300));
    t.ok(r.avisos.length === 4 && r.banner, 'señala las 4 materias escritas a mano que no están en el catálogo', JSON.stringify(r.avisos));
    t.ok(/¿Es «Matemáticas CCSS II»\?/.test(r.avisos[0]) && /1 alumno/.test(r.avisos[0]), 'propone la del catálogo que más se parece y dice a cuánto alumnado afecta', r.avisos[0]);
    t.ok(!/¿Es/.test(r.avisos[1]) && /Añadir «Lengua extranjera II \(Inglés\)»/.test(r.avisos[1]), '«(Inglés)» no se junta con «Lengua Extranjera II» a secas: propone añadirla', r.avisos[1]);
    await p.click('#eqDocenteBody button:has-text("Usar «Matemáticas CCSS II»")'); await esperar(200);
    r = await p.evaluate(() => { const a = data['2º Bach.'].HS[0]; return { prof: _getAsistenciaData('2º Bach.', 'HS').profesores[1].materia, pend: a.pendientes1, pm: Object.keys(a.porMateria) }; });
    t.ok(r.prof === 'Matemáticas CCSS II' && r.pend.includes('Matemáticas CCSS II') && !r.pend.includes('Matemáticas aplicadas a la CCSS II') && r.pm[0] === 'Matemáticas CCSS II',
      '«Usar» cambia la materia del profesor/a y también las suspensas y los datos del alumnado', JSON.stringify(r));
    await p.click('#eqDocenteBody button:has-text("Usar «Producción Musical»")'); await esperar(200);
    r = await p.evaluate(() => { const d = _getAsistenciaData('2º Bach.', 'HS'); return { p: d.profesores[4], quien: _tProfesorDeMateria(d.profesores, 'Producción Musical').nombre, texto: _tMateriaDeProfesor(d.profesores[4]),
      casilla: document.querySelectorAll('#eqDocenteBody .eq-sust input')[4].checked }; });
    t.ok(r.p.materia === 'Producción Musical' && r.p.sustituto && r.casilla && r.texto === 'Producción Musical (sustituto/a)', '«(sustituto)» pasa a ser la misma materia con la casilla «Sustituto/a»', JSON.stringify(r));
    t.ok(r.quien === 'Sanz Leal, Leo', 'con titular y sustituto/a, la materia es de quien da la clase ahora (para el correo y el acta)', r.quien);
    await p.click('#eqDocenteBody button:has-text("Añadir «Lengua extranjera II (Inglés)»")'); await esperar(200);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS'), prof: _getAsistenciaData('2º Bach.', 'HS').profesores[2].materia, pend: data['2º Bach.'].HS[0].pendientes1 }));
    t.ok(r.cat.includes('Lengua extranjera II (Inglés)') && r.prof === 'Lengua extranjera II (Inglés)' && r.pend.includes('Lengua extranjera II (Inglés)'), '«Añadir a ⚙ Materias» la pone en el catálogo del nivel y ya casa con las suspensas', JSON.stringify(r).slice(0, 200));
    // Elegir en el desplegable una materia del catálogo, cuando las dos tienen datos: no se mezclan.
    await p.evaluate(() => { window.__dialogosAuto = { confirmar: true }; });
    await p.selectOption('#eqMat-p5', 'Religión'); await esperar(300);
    r = await p.evaluate(() => ({ prof: _getAsistenciaData('2º Bach.', 'HS').profesores[5].materia, pm: data['2º Bach.'].HS[1].porMateria, dialogos: window.__dialogosLog || [] }));
    t.ok(r.prof === 'Religión' && r.pm['Religión Católica'].notas[1] === 8 && r.pm['Religión'].notas[1] === 7, 'si el alumnado tiene datos con los dos nombres, cambia solo el profesor/a y no mezcla las notas', JSON.stringify(r).slice(0, 300));
    t.ok(r.dialogos.some(m => /no se pueden juntar/.test(m)), 'y lo explica antes', JSON.stringify(r.dialogos).slice(0, 300));
    r = await p.evaluate(() => ({ avisos: document.querySelectorAll('#eqDocenteBody .eq-mat-hint').length, banner: /no está en ⚙ Materias de/.test(document.getElementById('eqDocenteBody').textContent) }));
    t.ok(!r.avisos && !r.banner, 'al terminar no queda ninguna materia fuera del catálogo', JSON.stringify(r));
    // «＋ Otra materia»: se escribe una vez y queda en el catálogo para todos los grupos del nivel.
    await p.evaluate(() => { window.__dialogosAuto = { confirmar: true, texto: 'Filosofía y Ciudadanía' }; _eqAddProf(); });
    const nuevo = await p.evaluate(() => _getAsistenciaData('2º Bach.', 'HS').profesores[6].id);
    await p.selectOption(`#eqMat-${nuevo}`, '__nueva__'); await esperar(300);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS').slice(-2), prof: _getAsistenciaData('2º Bach.', 'HS').profesores[6].materia }));
    t.ok(r.prof === 'Filosofía y Ciudadanía' && r.cat.includes('Filosofía y Ciudadanía'), '«＋ Otra materia» la añade a ⚙ Materias y se la pone al profesor/a', JSON.stringify(r));
    // Al importar del Cuaderno se propone el nombre del catálogo.
    r = await p.evaluate(() => { const cat = getMateriasParaNivel('2º Bach.', 'HS'); return ['Matemáticas aplicadas a la CCSS II', 'Empresa y diseño de modelos de negocio', 'Educación Física', 'Matemáticas', 'Lengua extranjera II (Francés)'].map(m => _tMateriaParecida(m, cat)); });
    t.ok(JSON.stringify(r) === JSON.stringify(['Matemáticas CCSS II', 'Empresa y Diseño de Mod. de Negocio', '', '', '']), 'nombres del Cuaderno → catálogo, sin inventar cuando no está claro', JSON.stringify(r));
    // Espacios de más (datos escritos a mano antes): fuera, en el equipo docente y en ⚙ Materias. Y el acta de la sesión dice quién es sustituto/a.
    r = await p.evaluate(() => { const d = _getAsistenciaData('2º Bach.', 'HS'); d.profesores.push({ id: 'pl', nombre: 'Pitarch Mafe, Gracia', materia: ' Latín II ', correo: '' });
      ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: true, justificacion: '' }));
      d.sesiones.eval1.forEach(x => { x.asistio = true; });
      _materiasCustom[_tClaveCatalogo('2º Bach.', 'HS')].push('  Griego II '); const cat = getMateriasParaNivel('2º Bach.', 'HS');
      const prof = _getAsistenciaData('2º Bach.', 'HS').profesores.find(x => x.id === 'pl').materia;
      closeEquipoDocente(); generarActaSesion('2º Bach.', 'HS', '1');
      return { prof, griego: cat.includes('Griego II') && !cat.some(m => m !== m.trim()) }; });
    await esperar(400);
    Object.assign(r, await p.evaluate(() => { const texto = document.querySelector('.tdoc-ov iframe')?.contentDocument?.body?.textContent || ''; window.__cerrarVistaDocT();
      return { sustituto: /Sanz Leal, Leo\s*Producción Musical \(sustituto\/a\)/.test(texto), latin: /Pitarch Mafe, Gracia\s*Latín II\s*Asiste/.test(texto) }; }));
    t.ok(r.prof === 'Latín II' && r.griego, 'los nombres de materia con espacios de más se limpian (equipo docente y ⚙ Materias)', JSON.stringify(r));
    t.ok(r.sustituto && r.latin, 'el acta de evaluación pone «(sustituto/a)» a quien sustituye y la materia sin espacios', JSON.stringify(r));
    await p.evaluate(() => openEquipoDocente('2º Bach.', 'HS')); await esperar(150);
    // «✍️ Datos de una materia»: solo se guardan materias de ⚙ Materias; los nombres antiguos se ven aparte y se pasan.
    await p.evaluate(() => { closeEquipoDocente(); window.__dialogosAuto = { confirmar: true }; window.__dialogosLog = [];
      const a = data['2º Bach.'].HS[0]; a.porMateria['Hist. del Arte'] = { origen: 'manual', notas: { 1: 4 }, faltas: {}, convivencia: {}, comentarios: {} }; a.pendientes1.push('Hist. del Arte');
      openDatosMateria('2º Bach.', 'HS', '1'); }); await esperar(200);
    r = await p.$$eval('#dmMateriaSel optgroup', g => g.map(x => [x.label, [...x.children].map(o => o.value)]));
    const fueraDm = (r.find(x => /Fuera de ⚙ Materias/.test(x[0])) || [])[1] || [], delGrupoDm = (r.find(x => x[0] === 'Materias del grupo') || [])[1] || [];
    t.ok(fueraDm.includes('Hist. del Arte') && fueraDm.includes('Religión Católica') && !delGrupoDm.includes('Hist. del Arte') && delGrupoDm.includes('Matemáticas CCSS II'),
      '«Datos de una materia»: las del grupo son las de ⚙ Materias; los nombres antiguos van aparte, «fuera de ⚙ Materias»', JSON.stringify(r).slice(0, 400));
    await p.selectOption('#dmMateriaSel', 'Hist. del Arte'); await esperar(200);
    r = await p.evaluate(() => ({ aviso: (document.querySelector('#dmBody .eq-mat-hint') || {}).textContent || '', guarda: guardarDatosMateria(), dialogos: window.__dialogosLog }));
    t.ok(/no está en ⚙ Materias/.test(r.aviso) && /Pasar a «Historia del Arte»/.test(r.aviso) && r.guarda === false && /no se guarda con ese nombre/.test(r.dialogos.join(' ')),
      'con un nombre antiguo se ven sus datos, pero no se guarda: propone pasarla a la del catálogo', JSON.stringify(r).slice(0, 300));
    await p.click('#dmBody button:has-text("Pasar a «Historia del Arte»")'); await esperar(300);
    r = await p.evaluate(() => { const a = data['2º Bach.'].HS[0]; return { m: _dmCtx.materia, pm: Object.keys(a.porMateria), pend: a.pendientes1, nota: (document.querySelector('#dmBody input[data-r="0"][data-c="nota"]') || {}).value }; });
    t.ok(r.m === 'Historia del Arte' && r.pm.includes('Historia del Arte') && !r.pm.includes('Hist. del Arte') && r.pend.includes('Historia del Arte') && r.nota === '4',
      '«Pasar a…» la cambia en el alumnado y la abre ya con su nombre del catálogo (con sus datos)', JSON.stringify(r));
    await p.evaluate(() => _dmOtraMateria('Economía de la Empresa')); await esperar(200);
    r = await p.evaluate(() => ({ m: _dmCtx.materia, cat: getMateriasParaNivel('2º Bach.', 'HS').includes('Economía de la Empresa') }));
    t.ok(r.m === 'Economía de la Empresa' && r.cat, '«➕ Otra materia» la añade a ⚙ Materias antes de usarla', JSON.stringify(r));
    await p.evaluate(() => { _dmCtx.cambios = false; closeDatosMateria(); }); await esperar(150);
    // Importar del Cuaderno: la materia se elige de ⚙ Materias (la más parecida ya elegida) o se añade.
    const paquete = nombre => ({ formato: 'cuaderno-a-tutoria', version: 1, materia: nombre, curso: '2.º Bach.', grupo: '2º Bach. HS', generado: new Date().toISOString(), alumnos: [{ nombre: 'Andrés Lozano, Claudia', notas: { 1: 3 } }] });
    await p.evaluate(o => _tImpCuadernoModal(o, 'a.json', { nivel: '2º Bach.', grupo: 'HS' }), paquete('Empresa y diseño de modelos de negocio')); await esperar(300);
    r = await p.evaluate(() => ({ tag: document.getElementById('impCMateria').tagName, valor: document.getElementById('impCMateria').value, resumen: document.getElementById('impCResumen').textContent }));
    t.ok(r.tag === 'SELECT' && r.valor === 'Empresa y Diseño de Mod. de Negocio' && /En el Cuaderno se llama/.test(r.resumen), 'al importar, la materia es un desplegable de ⚙ Materias con la equivalente ya elegida', JSON.stringify(r).slice(0, 300));
    await p.click('#impCOk'); await esperar(400);
    const claudia = () => data['2º Bach.'].HS.find(a => a.nombre === 'Andrés Lozano, Claudia');
    await p.addScriptTag({ content: `window.claudia = ${claudia.toString()};` });
    t.ok(await p.evaluate(() => (claudia().pendientes1 || []).includes('Empresa y Diseño de Mod. de Negocio')), 'y la suspensa llega con el nombre del catálogo');
    await p.evaluate(o => _tImpCuadernoModal(o, 'b.json', { nivel: '2º Bach.', grupo: 'HS' }), paquete('Psicología')); await esperar(300);
    r = await p.evaluate(() => { const s = document.getElementById('impCMateria'); return { valor: s.value, anadir: [...s.options].some(o => o.value === '__anadir' && /Añadir «Psicología»/.test(o.textContent)) }; });
    t.ok(r.valor === '' && r.anadir, 'si no está en ⚙ Materias, no se elige ninguna sola: se ofrece añadirla', JSON.stringify(r));
    await p.click('#impCOk'); await esperar(200);
    const ultimo = await p.evaluate(() => (window.__dialogosLog || []).slice(-1)[0] || '');
    t.ok(/Elige la materia de ⚙ Materias/.test(ultimo), 'sin elegir materia no se importa', ultimo);
    await p.selectOption('#impCMateria', '__anadir'); await esperar(200); await p.click('#impCOk'); await esperar(400);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS').includes('Psicología'), pend: claudia().pendientes1 }));
    t.ok(r.cat && r.pend.includes('Psicología'), '«＋ Añadir» la pone en ⚙ Materias y se importa con ella', JSON.stringify(r));
    // ⚙ Materias: cambiar un nombre lo cambia en todos los grupos que comparten la lista; quitar una avisa si se usa.
    await p.evaluate(() => { window.__dialogosAuto = undefined; window.__dialogosLog = [];
      const d = _getAsistenciaData('2º Bach.', 'A'); d.profesores.push({ id: 'pa', nombre: 'Soler Puig, Marta', materia: 'Matemáticas CCSS II', correo: '' });
      ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: null, justificacion: '' }));
      data['2º Bach.'].A = [{ nombre: 'Bosch Vila, Nil', pendientes1: ['Matemáticas CCSS II'], eval1: 1 }];
      closeEquipoDocente(); renderMaterias(); document.getElementById('matLevelTab-2__Bach_').click(); });
    await esperar(200);
    await p.locator('#matEditorArea .mat-name', { hasText: /^Matemáticas CCSS II$/ }).dblclick();
    await p.keyboard.press('Control+A'); await p.keyboard.type('Matemáticas aplicadas a las CCSS II'); await p.keyboard.press('Enter'); await esperar(300);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS'), catA: getMateriasParaNivel('2º Bach.', 'A'), hs: _getAsistenciaData('2º Bach.', 'HS').profesores[1].materia, a: _getAsistenciaData('2º Bach.', 'A').profesores.find(x => x.id === 'pa').materia,
      pendHS: data['2º Bach.'].HS[0].pendientes1, pmHS: Object.keys(data['2º Bach.'].HS[0].porMateria), pendA: data['2º Bach.'].A[0].pendientes1, toast: (document.getElementById('toast') || document.body).textContent }));
    const NUEVO = 'Matemáticas aplicadas a las CCSS II';
    t.ok(r.cat.includes(NUEVO) && !r.cat.includes('Matemáticas CCSS II') && r.catA.includes(NUEVO), 'renombrar en ⚙ Materias cambia la lista del curso (la comparten sus grupos)', JSON.stringify(r).slice(0, 200));
    t.ok(r.hs === NUEVO && r.a === NUEVO && r.pendHS.includes(NUEVO) && r.pmHS.includes(NUEVO) && r.pendA.includes(NUEVO) && !r.pendHS.includes('Matemáticas CCSS II'),
      'y también el equipo docente y las suspensas y notas del alumnado de todos esos grupos', JSON.stringify(r).slice(0, 400));
    r = await p.evaluate(() => { const res = _tRenombrarEnGruposDelCatalogo('2º Bach.', 'Religión Católica', 'Religión'); const pm = data['2º Bach.'].HS[1].porMateria; return { choque: res.choque.length, notas: [pm['Religión Católica']?.notas[1], pm['Religión']?.notas[1]] }; });
    t.ok(r.choque === 1 && r.notas[0] === 8 && r.notas[1] === 7, 'si renombrar juntaría las notas de dos materias en un alumno/a, no se toca ningún dato', JSON.stringify(r));
    const quitar = nombre => p.evaluate(n => { const i = getMateriasParaNivel('2º Bach.', 'HS').indexOf(n); return _matDel('2º Bach.', i); }, nombre);
    await quitar('Química'); await esperar(150);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS'), dialogos: window.__dialogosLog }));
    t.ok(!r.cat.includes('Química') && !r.dialogos.length, 'quitar una materia que nadie usa: sin preguntas', JSON.stringify(r.dialogos));
    await p.evaluate(() => { window.__dialogosAuto = { confirmar: false }; }); await quitar(NUEVO); await esperar(150);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS'), dialogos: window.__dialogosLog }));
    t.ok(r.cat.includes(NUEVO) && /la usan 2 profesores\/as del equipo docente y 2 alumnos\/as/.test(r.dialogos[0] || '') && /2º Bach\. A/.test(r.dialogos[0]) && /no se borra ningún dato/.test(r.dialogos[0]),
      'quitar una que se usa avisa antes (quién la usa y en qué grupos) y, si se cancela, no la quita', JSON.stringify(r.dialogos));
    await p.evaluate(() => { window.__dialogosAuto = { confirmar: true }; }); await quitar(NUEVO); await esperar(150);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS'), pend: data['2º Bach.'].HS[0].pendientes1, prof: _getAsistenciaData('2º Bach.', 'HS').profesores[1].materia }));
    t.ok(!r.cat.includes(NUEVO) && r.pend.includes(NUEVO) && r.prof === NUEVO, 'si se confirma, sale del catálogo pero no se borra ningún dato', JSON.stringify(r).slice(0, 300));
    await p.evaluate(() => { window.__dialogosAuto = undefined; openEquipoDocente('2º Bach.', 'HS'); }); await esperar(200);
    t.ok(await p.evaluate(() => document.querySelectorAll('#eqDocenteBody .eq-mat-hint').length) === 1, 'y el profesor/a que la tenía sale señalado en el equipo docente');
    // Todo se guarda.
    await esperar(1200); await p.reload(); await esperar(2000);
    r = await p.evaluate(() => ({ cat: getMateriasParaNivel('2º Bach.', 'HS'), profs: _getAsistenciaData('2º Bach.', 'HS').profesores.map(x => x.materia + (x.sustituto ? '*' : '')), pend: data['2º Bach.'].HS[0].pendientes1 }));
    t.ok(r.cat.includes('Lengua extranjera II (Inglés)') && r.cat.includes('Filosofía y Ciudadanía') && !r.cat.includes('Química') && r.profs.includes('Producción Musical*') && r.pend.includes('Matemáticas aplicadas a las CCSS II'), 'al reabrir sigue todo: catálogo, equipo docente y suspensas', JSON.stringify(r).slice(0, 400));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-acta-evaluacion', descripcion: 'Tutoría: una sola acta de evaluación, desde la sesión: asistencia real, notas editables que llegan a todas partes, «Para el acta», secciones del centro (ESO y Bachillerato), lo guardado antes pasa a la sesión y las actas antiguas se consultan', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria']);
    await p.evaluate(() => {
      const N = '1º ESO', G = 'A', d = _getAsistenciaData(N, G);
      [['Zapata Ruiz, Luis', 'Matemáticas'], ['Gil Mora, Eva', 'Geografía e Historia'], ['Roig Puig, Pau', 'Geografía e Historia']].forEach(([nombre, materia], i) => {
        d.profesores.push({ id: 'p' + i, nombre, materia, correo: '' }); ['eval1', 'eval2', 'eval3'].forEach(k => d.sesiones[k].push({ asistio: null, justificacion: '' })); });
      d.profesores[0].esTutor = true; d.profesores[2].sustituto = true; tutores['1º ESO-A'] = 'Zapata Ruiz, Luis';
      const [ana, luis, iria] = data[N][G];
      ana.repetidor = 'Sí'; ana.nese = 'Sí'; ana.recursoNese = ['PT']; ana.pendientesAnteriores = ['Matemáticas (6º Primaria)'];
      luis.pendientes2 = ['Geografía e Historia']; luis.eval2 = 1;
      // Lo guardado antes: Acta Oficial (acuerdos, firmas, decisión sobre una pendiente) y un acta del Calendario.
      window._actasOficialesData = { '1º ESO-A-eval2': { acuerdos: '<p>Reunión con <b>familias</b> en enero</p>', jefeEstudios: 'Mora Gil, Iván', director: 'Puig Roig, Toni', pendAnt: { '0-0': { estado: 'No recuperada', nota: '3', motivo: 'No entregó el cuadernillo' } } } };
      window._actasData = { [_actaKey(N, G, 2)]: { html: '<div class="inf-section"><div class="inf-section-title">Acta antigua</div><p contenteditable="true">Texto de antes</p></div>', savedAt: '2026-01-15T10:00:00Z' } };
      currentGrupos[N] = G; selectNivel(N); renderNivelTabs();
    }); await esperar(200);
    let r = await p.evaluate(() => ({ botones: [...document.querySelectorAll('#mainContent button')].map(b => b.textContent.trim()), pestanas: document.getElementById('nivelTabs').textContent }));
    t.ok(r.botones.some(b => /📋 Acta de evaluación/.test(b)) && !r.botones.some(b => /Acta Oficial|Actas no Oficiales/.test(b)) && !/Actas no Oficiales/.test(r.pestanas),
      'el grupo tiene «📋 Acta de evaluación»; ya no están el Acta Oficial ni las Actas no Oficiales', JSON.stringify(r.botones.filter(b => /Acta/.test(b))));
    await p.click('#mainContent button:has-text("📋 Acta de evaluación")'); await esperar(150);
    r = await p.$$eval('#actaMenuOverlay button', l => l.map(b => b.textContent.trim()));
    t.ok(['Acta I Evaluación', 'Acta II Evaluación', 'Acta Evaluación Final', 'Abrir la sesión', 'Acta de calificaciones', '📂 II Ev.'].every(x => r.some(b => b.includes(x))),
      'su menú: acta de cada evaluación, la sesión, el acta de calificaciones y la antigua guardada (solo consulta)', JSON.stringify(r));
    await p.click('#actaMenuOverlay button:has-text("📂 II Ev.")'); await esperar(500);
    r = await p.evaluate(() => { const b = document.querySelector('#tdocOverlay iframe')?.contentDocument?.body; const x = { texto: b ? b.textContent : '', editable: b ? b.querySelectorAll('[contenteditable]').length : -1 }; __cerrarVistaDocT(); return x; });
    t.ok(/Texto de antes/.test(r.texto) && /solo consulta/.test(r.texto) && r.editable === 0, 'el acta antigua se abre para consultarla, sin poder editarla', JSON.stringify(r).slice(0, 200));

    // La sesión (II Evaluación): lo del Acta Oficial pasa a la sesión.
    await p.evaluate(() => openSesionEvaluacion('1º ESO', 'A', '2')); await esperar(200);
    r = await p.evaluate(() => ({ acuerdos: document.querySelector('#sesMain textarea[aria-label^="Propuestas de mejora"]').value, jefe: document.querySelector('#sesMain input[placeholder="Apellidos, Nombre"]').value,
      pend: ((data['1º ESO'].A[0].sesionEval || {})['2'] || {}).pendAnt }));
    t.ok(/Reunión con familias en enero/.test(r.acuerdos) && r.jefe === 'Mora Gil, Iván' && r.pend['Matemáticas (6º Primaria)'].estado === 'No recuperada',
      'lo guardado en el antiguo Acta Oficial (acuerdos, firmas, decisión sobre pendientes) aparece en la sesión', JSON.stringify(r));
    await p.evaluate(() => { const d = _getAsistenciaData('1º ESO', 'A'); d.sesiones.eval2[0].asistio = true; d.sesiones.eval2[1].asistio = false; d.sesiones.eval2[1].justificacion = 'Formación'; d.sesiones.eval2[2].asistio = true; renderSesion(); });
    await p.fill('#sesMain .ses-rejilla textarea >> nth=0', 'Habladores pero respetuosos.');
    await p.fill('#sesMain textarea[aria-label="Valoración general del grupo"]', 'Buen grupo.');

    // Notas desde la sesión: se actualiza todo.
    await p.evaluate(() => _sesIr(1)); await esperar(150);   // Pérez Ruiz, Luis
    r = await p.$$eval('#sesMain input.ses-nota', l => l.map(x => x.getAttribute('aria-label')));
    t.ok(r.includes('Nota de Matemáticas') && r.includes('Nota de Geografía e Historia'), 'cada alumno/a tiene una casilla de nota por materia del equipo docente', JSON.stringify(r));
    await p.fill('#sesMain input[aria-label="Nota de Geografía e Historia"]', '7'); await p.keyboard.press('Enter'); await esperar(200);
    await p.fill('#sesMain input[aria-label="Nota de Matemáticas"]', '3,5'); await p.keyboard.press('Tab'); await esperar(200);
    r = await p.evaluate(() => { const a = data['1º ESO'].A[1]; const ac = actaCalificacionesHTML('1º ESO', 'A', '2');
      return { pend: a.pendientes2, n: a.eval2, notas: Object.fromEntries(Object.entries(a.porMateria).map(([m, d]) => [m, d.notas['2']])), acta: /3,5/.test(ac) && /7(,0)?</.test(ac), cifra: document.querySelector('#sesMain .ses-cifras strong').textContent }; });
    t.ok(JSON.stringify(r.pend) === '["Matemáticas"]' && r.n === 1 && r.notas['Matemáticas'] === 3.5 && r.notas['Geografía e Historia'] === 7 && r.cifra === '1',
      'cambiar una nota en la sesión actualiza sus suspensas (lista y número): aprobar quita la materia, suspender la añade', JSON.stringify(r));
    t.ok(r.acta, 'y el acta de calificaciones ya tiene las notas nuevas');

    // «📋 Para el acta»
    await p.evaluate(() => _sesIr(0)); await esperar(150);   // García López, Ana: repetidora, NESE, con pendiente
    await p.check('#sesMain .ses-casos label:has-text("Comportamiento") input'); await esperar(150);
    await p.fill('#sesMain .ses-para-acta input[placeholder^="Las materias"]', 'Lengua y Matemáticas');
    await p.fill('#sesMain .ses-para-acta textarea[placeholder^="¿Está funcionando"]', 'Le está costando, pero mejora.');
    await p.selectOption('#sesMain .ses-para-acta select >> nth=0', 'FPB'); await esperar(150);
    await p.fill('#sesMain .ses-para-acta label:has-text("Familia profesional") input', 'Informática y Comunicaciones');
    await p.fill('#sesMain .ses-para-acta textarea[placeholder^="Adaptaciones"]', 'ACI en Matemáticas; PT dos sesiones.');
    await p.selectOption('#sesMain select[aria-label="Estado de Matemáticas (6º Primaria)"]', 'Recuperada');
    await p.fill('#sesMain textarea[aria-label="Acuerdos para este alumno/a"]', 'Tutoría individual quincenal.');
    r = await p.evaluate(() => { const a = data['1º ESO'].A[0]; return { s: a.sesionEval['2'], rec: a.recuperadasAnteriores, norec: a.noRecuperadasAnteriores }; });
    t.ok(r.s.casos.includes('comportamiento') && r.s.programa === 'FPB' && r.s.fpbFamilia === 'Informática y Comunicaciones' && r.s.medidasNese && r.s.valoracionRepeticion && (r.rec || []).includes('Matemáticas (6º Primaria)') && !(r.norec || []).includes('Matemáticas (6º Primaria)'),
      '«📋 Para el acta» guarda caso particular, repetición, programa / FPB, medidas NESE y la decisión de cada pendiente (también en la tabla del grupo)', JSON.stringify(r).slice(0, 400));

    // El acta de la II Evaluación (ESO)
    const leer = async () => { await esperar(500); return p.evaluate(() => { const x = document.querySelector('#tdocOverlay iframe')?.contentDocument?.body?.innerText || ''; __cerrarVistaDocT(); return x; }); };
    await p.click('#sesCab button:has-text("Acta de evaluación")'); let acta = await leer();
    t.ok(/ACTA DE LA SEGUNDA EVALUACIÓN/.test(acta) && /Zapata Ruiz, Luis\s*tutor\/a\s*Matemáticas\s*Asiste/.test(acta) && /Gil Mora, Eva\s*Geografía e Historia\s*No asiste — Formación/.test(acta) && /Roig Puig, Pau\s*Geografía e Historia \(sustituto\/a\)\s*Asiste/.test(acta),
      'el acta lleva la asistencia marcada en la sesión: quién asiste, quién no y por qué, y quién es sustituto/a', acta.slice(0, 600));
    t.ok(/Comportamiento \/ Convivencia\s*García López, Ana\s*Lengua y Matemáticas\s*Tutoría individual quincenal/.test(acta) && /Le está costando, pero mejora/.test(acta) && /Nivel III/i.test(acta)
      && /García López, Ana\s*\S*\s*Informática y Comunicaciones/.test(acta.replace(/\n/g, ' ')) && /ACI en Matemáticas/.test(acta) && /Matemáticas \(6º Primaria\)\s*Recuperada\s*3\s*No entregó el cuadernillo/.test(acta),
      'y las secciones del centro: casos particulares, repetidores, Nivel III y FPB, NESE y pendientes de cursos anteriores', acta.slice(acta.indexOf('CASOS PARTICULARES'), acta.indexOf('CASOS PARTICULARES') + 900));
    t.ok(/Habladores pero respetuosos/.test(acta) && /Buen grupo/.test(acta) && /Reunión con familias en enero/.test(acta) && /Mora Gil, Iván/.test(acta) && /Puig Roig, Toni/.test(acta) && /Pérez Ruiz, Luis\s*1\s*Matemáticas/.test(acta),
      'el análisis del grupo, los acuerdos, las firmas y los resultados con las notas cambiadas en la sesión', acta.slice(-900));

    // Evaluación final (ESO): Plan de Repetición, Plan de Refuerzo y agrupación.
    await p.evaluate(() => { const [ana, luis] = data['1º ESO'].A; ana.pendientesIII = ['Matemáticas', 'Lengua']; ana.eval3 = 2; luis.pendientesIII = ['Matemáticas']; luis.eval3 = 1;
      _sesCambiarEval('3'); _sesIr(0); _sesPropuesta(0, 'tipo', 'Repetición'); _sesPropuesta(1, 'tipo', 'Promoción'); _sesIr(0); });
    await p.fill('#sesMain .ses-para-acta label:has-text("Motivos de la no promoción") textarea', 'Dos materias instrumentales.');
    await p.fill('#sesMain .ses-para-acta label:has-text("Agrupación") input', 'Separarla de Íria.');
    await p.evaluate(() => generarActaEvaluacion('1º ESO', 'A', '3')); acta = await leer();
    t.ok(/ACTA DE LA EVALUACIÓN FINAL/.test(acta) && /Plan de Repetición[\s\S]*García López, Ana[\s\S]*Dos materias instrumentales/i.test(acta) && /Plan de Refuerzo[\s\S]*Pérez Ruiz, Luis/i.test(acta) && /agrupación para el próximo curso[\s\S]*Separarla de Íria/i.test(acta),
      'en la final: Plan de Repetición con sus motivos, Plan de Refuerzo y agrupación para el próximo curso', acta.slice(acta.search(/PLAN DE REPETICIÓN/i), acta.search(/PLAN DE REPETICIÓN/i) + 500));

    // Bachillerato, evaluación final: extraordinaria y sin Nivel III.
    await p.evaluate(() => { closeSesionEvaluacion(); });
    await tutoriaConAlumnos(p, t.url, '2º Bach.', 'HS', ['Mascarell Haro, Ana']);
    await p.evaluate(() => { const a = data['2º Bach.'].HS[0]; a.pendientesIII = ['Historia de España']; a.eval3 = 1; generarActaEvaluacion('2º Bach.', 'HS', '3'); }); acta = await leer();
    t.ok(/Bachillerato · Evaluación Final/.test(acta) && /evaluación extraordinaria[\s\S]*Mascarell Haro, Ana\s*1\s*Historia de España/i.test(acta) && !/Nivel III/i.test(acta), 'en Bachillerato: alumnado para la extraordinaria y sin las secciones de ESO', acta.slice(0, 300));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-orden-alfabetico', descripcion: 'Tutoría: el alumnado queda en orden alfabético en toda la app al darlo de alta o cambiarle el nombre (selección, otras pantallas, recarga, deshacer, archivos antiguos)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '2º ESO', 'A', ['Pérez Ruiz, Luis', 'García López, Ana', 'Zapata Mora, Eva']);
    const orden = () => p.evaluate(() => data['2º ESO'].A.map(a => a.nombre));
    t.ok(JSON.stringify(await orden()) === JSON.stringify(['García López, Ana', 'Pérez Ruiz, Luis', 'Zapata Mora, Eva']), 'al dar de alta, el grupo queda en orden alfabético', JSON.stringify(await orden()));
    await p.evaluate(() => { currentGrupos['2º ESO'] = 'A'; selectNivel('2º ESO'); bulkToggleRow('2º ESO', 'A', 2, true); }); await esperar(150);
    // Cambiar el nombre desde la columna «Alumno/a» de la tabla.
    const inp = p.locator('#mainContent input.cell-input[value="Pérez Ruiz, Luis"]');
    await inp.fill('Aguilar Ruiz, Luis'); await inp.press('Tab'); await esperar(400);
    t.ok(JSON.stringify(await orden()) === JSON.stringify(['Aguilar Ruiz, Luis', 'García López, Ana', 'Zapata Mora, Eva']), 'al cambiar un nombre, el grupo se reordena', JSON.stringify(await orden()));
    t.ok(await p.evaluate(() => [..._bulkSel['2º ESO-A']].map(i => data['2º ESO'].A[i].nombre).join() === 'Zapata Mora, Eva'), 'la selección de filas sigue en los mismos alumnos/as');
    const pantallas = await p.evaluate(() => {
      openDatosMateria('2º ESO', 'A', '1', 'Inglés'); const dm = document.querySelector('#dmBody tbody th[scope="row"]').textContent.trim(); _dmCtx.cambios = false; closeDatosMateria();
      const ie = datosInformeEquipo('2º ESO', 'A', '1').alumnos.map(x => x.nombre)[0];
      return [dm, ie]; });
    t.ok(pantallas.every(x => x === 'Aguilar Ruiz, Luis'), 'las demás pantallas (datos de una materia, informe para el equipo) lo muestran ya en su sitio', JSON.stringify(pantallas));
    await esperar(1200); await p.reload(); await esperar(1500);
    t.ok(JSON.stringify(await orden()) === JSON.stringify(['Aguilar Ruiz, Luis', 'García López, Ana', 'Zapata Mora, Eva']), 'el orden se conserva al recargar');
    await p.evaluate(() => { hideWelcomeScreen(); currentGrupos['2º ESO'] = 'A'; selectNivel('2º ESO'); }); await esperar(150);
    const inp2 = p.locator('#mainContent input.cell-input[value="Zapata Mora, Eva"]');
    await inp2.fill('Bernal Mora, Eva'); await inp2.press('Tab'); await esperar(400);
    t.ok(JSON.stringify(await orden()) === JSON.stringify(['Aguilar Ruiz, Luis', 'Bernal Mora, Eva', 'García López, Ana']), 'otro cambio de nombre', JSON.stringify(await orden()));
    await p.evaluate(() => _undoPop()); await esperar(300);
    t.ok(JSON.stringify(await orden()) === JSON.stringify(['Aguilar Ruiz, Luis', 'García López, Ana', 'Zapata Mora, Eva']), 'Ctrl+Z devuelve el nombre y su sitio', JSON.stringify(await orden()));
    // Un archivo de antes, con el alumnado desordenado, se ve en orden alfabético.
    const r = await p.evaluate(() => { const st = JSON.parse(JSON.stringify(buildState())); st.data['2º ESO'].A.reverse(); applyFilePayload(st); renderAll(); return data['2º ESO'].A.map(a => a.nombre); });
    t.ok(JSON.stringify(r) === JSON.stringify(['Aguilar Ruiz, Luis', 'García López, Ana', 'Zapata Mora, Eva']), 'un archivo con el alumnado desordenado se muestra en orden alfabético', JSON.stringify(r));
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
    await anadir('Nuevo, Cuatro');
    // Antes de dejar en localStorage la copia anterior, IndexedDB tiene que tener ya este último guardado (con la máquina cargada, el volcado puede tardar).
    for (let i = 0; i < 100 && !(await p.evaluate(async () => (await idbGet('kv', 'estado'))?.guardadoEn === state._guardadoEn)); i++) await esperar(100);
    await p.evaluate(v => Storage.prototype.setItem.call(localStorage, KEY, v), viejo); await llenarLocalStorage(p);
    await p.reload(); await esperar(3000);
    e = await p.evaluate(() => ({ alumnos: state.grupos[0]?.alumnos.length, ls: localStorage.getItem(KEY) !== null, marca: localStorage.getItem(KEY_EN_IDB) !== null }));
    t.ok(e.alumnos === 7 && !e.ls && e.marca, 'si localStorage se quedó con una copia anterior, manda la de IndexedDB (más reciente) y la vieja se retira', JSON.stringify(e));
    await p.reload(); await esperar(2500);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length === 7 && !/recuperado/i.test((document.getElementById('toastGlobal') || {}).innerText || '')) && !p.errores.length, 'y la siguiente apertura vuelve a ser normal', p.errores.join('; '));
    // Tan lleno que ni el turno de la ventana (una-ventana.js) cabe: la ventana no debe creerse relevada y bloquearse a sí misma.
    await llenarLocalStorage(p); await anadir('Nuevo, Cinco');   // no cabe: va a IndexedDB y la copia de localStorage se retira
    for (let i = 0; i < 100 && !(await p.evaluate(async () => localStorage.getItem(KEY) === null && (await idbGet('kv', 'estado'))?.guardadoEn === state._guardadoEn)); i++) await esperar(100);
    // Desde un marco en blanco (mismo almacenamiento, sin el control de una-ventana.js): un turno corto y localStorage lleno hasta el último carácter.
    await p.evaluate(() => { const f = document.body.appendChild(document.createElement('iframe')), ls = f.contentWindow.localStorage;
      ls.setItem('una-ventana:cuaderno', '{"n":1}'); let n = ls.getItem('relleno_de_otra_app').length;
      for (let paso = 8192; paso >= 1; paso = Math.floor(paso / 2)) { try { while (true) { ls.setItem('relleno_de_otra_app', 'x'.repeat(n + paso)); n += paso; } } catch (e) {} } });
    await p.reload(); await esperar(2000);
    await anadir('Nuevo, Seis'); await esperar(900);
    e = await p.evaluate(() => ({ alumnos: state.grupos[0]?.alumnos.length, estado: UnaVentana.estado, bloqueo: !!document.getElementById('unaVentanaOverlay'), idbOk: saveState.idbOk, turno: localStorage.getItem('una-ventana:cuaderno') }));
    t.ok(e.turno === '{"n":1}', 'preparación: localStorage está tan lleno que no cabe ni el turno de la ventana', JSON.stringify(e));
    t.ok(e.alumnos === 9 && e.estado === 'activa' && !e.bloqueo && e.idbOk, 'aun así la ventana sigue activa (sin el aviso de «otra ventana») y guarda', JSON.stringify(e));
    await p.reload(); await esperar(2500);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length === 9 && !document.getElementById('unaVentanaOverlay')) && !p.errores.length, 'y al reabrir está también ese cambio', p.errores.join('; '));
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
    // No se guarda en IndexedDB: Chrome 153 (el de GitHub Actions) se cierra entero al volver a leer de IndexedDB
    // una carpeta de este almacenamiento privado (la que se elige con el selector es de otro tipo). Se le da a la app
    // directamente, como hace ccIniciar() al abrir con la carpeta guardada.
    const darCarpeta = () => p.evaluate(async () => {
      _ccHandle = await (await navigator.storage.getDirectory()).getDirectoryHandle('copias', { create: true }); _ccEstado = 'activa'; });
    await p.evaluate(async () => { localStorage.setItem('cc_dispositivo', 'aaaaa');
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('copias', { create: true });
      for (let i = 1; i <= 12; i++) { const f = await dir.getFileHandle(`copia-cuaderno-auto-2026-01-${String(i).padStart(2, '0')}-aaaaa.json`, { create: true }); const w = await f.createWritable(); await w.write('{"grupos":[]}'); await w.close(); } });
    await darCarpeta();
    t.ok(await p.evaluate(() => ccEscribir()), 'escribe la copia de hoy');
    const n = await p.evaluate(async () => { let n = 0; for await (const _ of _ccHandle.entries()) n++; return n; });
    t.ok(n === 10, 'conserva las 10 más recientes de este dispositivo', 'hay ' + n);
    await p.evaluate(() => { localStorage.setItem('cc_dispositivo', 'bbbbb'); state._guardadoEn = Date.now() - 3600e3; localStorage.setItem(KEY, JSON.stringify(state)); });
    await p.reload(); await esperar(3500);
    await darCarpeta(); await p.evaluate(() => ccBuscarMasReciente());
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
