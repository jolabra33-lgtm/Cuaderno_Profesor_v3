# Cuaderno del profesor · estructura de la aplicación (versión modular)

La aplicación es **estática**: no necesita compilar nada. Se publica tal cual en GitHub Pages
(sube todo el contenido de esta carpeta respetando las subcarpetas) y funciona sin conexión gracias a `sw.js`.

> Importante: debe abrirse desde su dirección web (GitHub Pages, o cualquier servidor local).
> Abierta con doble clic (`file://`) arranca, pero el navegador no deja cargar el editor de exámenes
> ni la Planificación temporal (se muestra un aviso).

## Carpetas

| Ruta | Qué contiene |
|---|---|
| `index.html` | Cabecera, estructura de la pantalla y lista ordenada de scripts |
| `css/app.css` | Estilos de toda la aplicación |
| `js/` | Código de la aplicación en módulos (ver tabla), cargados **en este orden** |
| `js/99-arranque.js` | Arranque: crea el estado, aplica migraciones y dibuja la primera pantalla. Siempre el último |
| `editor/` | Editor de exámenes (página propia que se carga dentro de la pestaña «Diseño»): `index.html`, `css/`, `js/` y `fonts/` (Lora e Inter) |
| `editor/js/puente-cuaderno.js` | Conexión del editor con el Cuaderno: guardado, criterios, estructura y PDF |
| `tools/planificacion.html` | Herramienta de Planificación temporal (se incrusta en cada Programación) |
| `tools/fonts/` | Fuentes de la Planificación (Fraunces, Public Sans, IBM Plex Mono; licencia OFL). Se incrustan en la herramienta al cargarla: no se pide nada a internet |
| `sw.js` | Service worker: lista de archivos para el uso sin conexión y versión de la caché |
| `guia_mejorada.html` | Guía de uso |

| `js/una-ventana.js` | Solo una ventana guarda a la vez: si la app ya está abierta en otra (o en la otra versión, v2/v3), esta se bloquea con un aviso y «Usar esta ventana». Es el **primer** script de `index.html` y de `tutoria/index.html` |
| `js/bloqueo.js` | Bloqueo con PIN (opcional): tapa la app hasta escribir el PIN, al abrir y tras unos minutos sin usarla. En `<head>` del Cuaderno y de Tutoría. Sus ajustes están en `js/ui/privacidad.js` |
| `js/registro-sw.js` | Registro del service worker y aviso «Hay una versión nueva · Actualizar» (lo usan el Cuaderno y Tutoría) |
| `js/comun/formato-tutoria.js` | **Contrato Cuaderno ↔ Tutoría**: formato del paquete «Para la tutoría» (versión 2: notas, faltas, convivencia y comentarios por evaluación), `ftNormalizarPaquete` (limpia lo que llega de un archivo) y `ftApellidosNombre`. Lo cargan las dos apps. También el formato de la ficha del grupo (Tutoría → Cuaderno, `ftNormalizarFichaGrupo`) |
| `tutoria/` | Gestor de Tutoría, aplicación independiente (ver más abajo) |
| `tests/calculo-notas.html` | Pruebas del motor de cálculo de notas (ver más abajo) |

Completan el repositorio: `manifest.json` e `icons/` (instalación como app), `.nojekyll` y `README.md` (instrucciones de publicación).

## Módulos de `js/` (en orden de carga)

| Archivo | Contenido |
|---|---|
| `js/00-preferencias-ui.js` | Preferencias de pantalla del dispositivo: tema claro/oscuro y ancho iPad/escritorio |
| `js/datos/competencias.js` | Diccionario de competencias clave (LOMLOE) |
| `js/datos/catalogos-curriculares.js` | Catálogo curricular precargado (propuestas pedagógicas) y saberes básicos |
| `js/datos/modelos-nese-refuerzo.js` | Constantes de NESE, refuerzo y repetición (modelos, leyendas, medidas) |
| `js/nucleo/utilidades.js` | Nota de acta, utilidades (uid, esc), avisos, toasts y diálogos |
| `js/nucleo/plantillas-materias.js` | Gestión de plantillas de materias: editar y eliminar/ocultar |
| `js/nucleo/modelo-datos.js` | Modelo de datos: grupos, alumnado, columnas de la lista |
| `js/nucleo/estado-migraciones.js` | Estado global de la app y migraciones de datos antiguos |
| `js/nucleo/guardado-copias.js` | Guardado (IndexedDB es el almacén que manda; localStorage, copia rápida si cabe), deshacer/rehacer y copias automáticas |
| `js/nucleo/cifrado.js` | Copias cifradas con contraseña |
| `js/nucleo/copia-carpeta.js` | Copia automática en una carpeta elegida (ordenador, Chrome/Edge): un archivo por día y dispositivo; avisa si otro dispositivo ha dejado una copia más reciente; cifrado opcional con contraseña |
| `js/curriculo/catalogos-importador.js` | Autocarga del currículo e importador de materias propias |
| `js/evaluacion/calculo-notas.js` | Motor de cálculo de notas (criterios, CE, CC, bloques, trimestres, final) y recuperaciones |
| `js/ui/barra-superior.js` | Barra superior y navegación entre las aplicaciones |
| `js/inicio/cronometro.js` | Cronómetro flotante |
| `js/inicio/herramientas-clase.js` | Sorteo de alumno/a y creación de grupos (pestañas del panel del cronómetro) |
| `js/inicio/calendario.js` | Calendario de Inicio: eventos, exámenes y entregas |
| `js/inicio/reuniones.js` | Registro de reuniones con familias, alumnado y equipo |
| `js/alumnado/plan-refuerzo.js` | Plan de refuerzo: seguimiento individualizado |
| `js/alumnado/plan-repeticion.js` | Plan de repetición: expediente formal |
| `js/alumnado/alumnos-nese.js` | Alumnado NESE: plan de seguimiento curricular adaptado |
| `js/inicio/horario.js` | Horario semanal, franjas horarias y vista «Hoy» |
| `js/inicio/alertas-home.js` | Alertas automáticas y pantalla de Inicio |
| `js/ui/grupo-y-copias.js` | Navegación por grupo, pantalla inicial vacía, exportar/importar todo |
| `js/alumnado/plano-aula.js` | Plano de aula y lista de alumnado |
| `js/alumnado/ficha-familia.js` | Correos de la familia y papelera de alumnado |
| `js/evaluacion/actividades.js` | Actividades y recuperaciones (interfaz) |
| `js/evaluacion/calificar.js` | Calificar, entrada rápida de notas y marcas NP/Exento |
| `js/evaluacion/puntos-extra.js` | Puntos extra en actividades/exámenes y en la nota de cada evaluación o la final (ventana «➕ Puntos extra», píldoras y textos de informe). El cálculo está en `calculo-notas.js` |
| `js/resultados/informe-detallado.js` | Distribución, evolución del alumno e informe detallado de cálculo |
| `js/resultados/de-la-tutoria.js` | «📥 De la tutoría»: carga la ficha del grupo que envía Tutoría (vista previa; NESE, repite, pendientes de la materia, `alumno.deTutoria` y `grupo.deTutoria`) y los bloques que lo muestran en la ficha del alumno/a y en Resultados. Va justo después de `resultados.js` |
| `js/resultados/resultados.js` | Comentarios sugeridos, paso a Tutoría (`paqueteParaTutoria`, archivo «Para la tutoría» y copia para Tutoría en IndexedDB, `guardarCopiaParaTutoria`) y pantalla de Resultados |
| `js/resultados/cobertura-diagnostico.js` | Cobertura de la evaluación, «Revisar mis datos» y novedades |
| `js/clase/asistencia.js` | Asistencia (y constantes de convivencia y familias) |
| `js/clase/convivencia.js` | Convivencia: AC, RC y parte de amonestación |
| `js/clase/familias.js` | Contacto con familias |
| `js/clase/diario.js` | Diario de clase |
| `js/programacion/programacion-aula.js` | Programación de aula: lista, SdA y recursos |
| `js/programacion/actividades-y-texto-rico.js` | Editor de texto enriquecido y actividades de la programación |
| `js/programacion/detalle-imprimir.js` | Detalle de la programación e impresión |
| `js/programacion/documentos-referencia.js` | Modelo de Programación de Aula y Propuesta Pedagógica de cada programación: enlace y PDF guardado en la app, visor con pdf.js |
| `js/programacion/planificacion-temporal.js` | Planificación temporal de la materia (herramienta incrustada) |
| `js/memoria/memoria-curso.js` | Memoria de curso |
| `js/ajustes/ajustes-grupo.js` | Ajustes del grupo |
| `js/informes/exportaciones.js` | Informes y exportaciones (CSV) |
| `js/informes/impresion.js` | Impresión sin ventanas emergentes e informe del alumno |
| `js/informes/informe-final.js` | Informe final de curso |
| `js/resumen/resumen-grupo.js` | Resumen del grupo: aprobados, SdA y estadísticas |
| `js/corrector/motor-rubricas.js` | Corrector de exámenes: motor de rúbricas |
| `js/corrector/programacion-corrector.js` | Programación ↔ Corrector: rúbricas para los exámenes planificados y sus versiones adaptadas (`progAct.variantes`; diseño en «prog:<actividad>:<versión>») |
| `js/corrector/navegacion-lista-crear.js` | Navegación del Corrector, lista de exámenes y crear examen |
| `js/corrector/editor-rubrica.js` | Editor de rúbrica y rúbricas adaptadas (NESE): `cxCrearVariante`, aviso de alumnado NESE sin versión (`cxAvisoNeseHTML`, `act.neseGeneral`) |
| `js/corrector/modelo-b.js` | Modelo B: se reconstruye desde el general con su orden (`act.modeloB.orden`), reparto A/B (`act.modeloB.alumnos`), rúbrica en el orden del B al corregir (`mbRubricaVista`) y enlace de rúbricas hechas a mano con el diseño (`mbEnlazarRubrica`) |
| `js/corrector/corregir.js` | Corregir, estadísticas por ítem e impresión de la rúbrica corregida |
| `js/corrector/rubrica-niveles.js` | Rúbrica por niveles de logro (categorías × niveles, como una matriz analítica): editor en tabla, corrección pinchando casillas y afinando con puntos, impresión y reparto por niveles. Se guarda con la forma de una rúbrica normal (`formato:"niveles"`), así que el cálculo de notas, NESE, plantillas y Programación funcionan igual |
| `js/nucleo/nuevo-curso.js` | Asistente «Empezar curso nuevo»: archiva el curso y deja lo reutilizable |
| `js/ui/buscador.js` | Buscador global |
| `js/ui/privacidad.js` | Modo proyector (difumina nombres y notas) y ajustes del bloqueo con PIN |
| `js/ui/bienvenida.js` | Pantalla de bienvenida y conservación de scroll |
| `js/ui/render-accesibilidad.js` | Accesibilidad y render principal |
| `js/corrector/editor-examenes.js` | Editor de exámenes dentro del Corrector (pestaña «Diseño») |
| `js/99-arranque.js` | Arranque: estado inicial, migraciones y primer dibujo |

## Gestor de Tutoría (`tutoria/`)

Antes era un único `index.html` de casi 20.000 líneas. En la v3 está dividido igual que el Cuaderno:
`tutoria/index.html` solo tiene la estructura de la pantalla y la lista de archivos; los estilos están en
`tutoria/css/` y el código en `tutoria/js/`, cargado **en este orden**. Valen las mismas reglas que abajo.

| Archivo | Contenido |
|---|---|
| `css/tutoria.css` · `css/asistencia.css` | Estilos generales · estilos de la asistencia a la sesión |
| `css/tema-cuaderno.css` | Identidad del Cuaderno (navy + latón, letra del sistema) en claro y oscuro: redefine las variables de `tutoria.css`. El tema es el mismo que el del Cuaderno (`geohist_tema`) |
| `js/01-avisos-y-vista-documentos.js` | Avisos y confirmaciones, vista de documentos dentro de la app, accesibilidad |
| `js/02-datos.js` | Datos: niveles, grupos, estado global y deshacer |
| `js/03-tabla.js` | Tabla del grupo: pintado, columnas, modo compacto, teclado, selección múltiple |
| `js/04-acciones-nese-pap.js` | Acciones sobre el alumnado, NESE, PAP y enriquecimiento curricular |
| `js/05-alumnado-importar-exportar.js` | Alta de alumnado, exportación e importación CSV |
| `js/06-materias.js` | Compensatoria, propuestas, colegio de procedencia y materias |
| `js/07-actas.js` | Informes de evaluación y actas no oficiales |
| `js/08-grupos-niveles-vacantes.js` | Gestión de grupos y niveles, unidades vacantes |
| `js/09-informes-promocion.js` | Informes de propuestas, promoción, destino y pendientes |
| `js/10-notas-y-mover-alumnado.js` | Deshacer, notas, mover alumnado e informe de Bachillerato |
| `js/11-acta-oficial-y-seguimiento.js` | Acta oficial, estadísticas en PDF e informe de seguimiento |
| `js/12-calendario-y-convivencia.js` | Calendario de sesiones, convivencia e informe académico |
| `js/13-panel-direccion.js` | Panel de dirección y gráficos |
| `js/14-inicio-y-curso.js` | Arranque, menú del curso, versiones, convocatoria, tema e importación del centro |
| `js/15-guardado-y-archivos.js` | Autoguardado, búsqueda, archivos y copias de seguridad |
| `js/16-foto-y-horario.js` | Foto del grupo y horario |
| `js/17-historial.js` | Historial académico del alumno |
| `js/18-plano-del-grupo.js` | Plano del grupo |
| `js/19-seguimiento.js` | Seguimiento individual del alumnado |
| `js/20-equipo-docente.js` | Equipo docente |
| `js/21-asistencia.js` | Asistencia a la sesión de evaluación |
| `js/22-importar-del-cuaderno.js` | Botón «📥 Del Cuaderno»: añade el alumnado de un grupo del Cuaderno y completa fecha de nacimiento, NESE, repetición y contactos de la familia de quien ya estaba (con vista previa); ofrece traer lo de tu materia desde la copia que deja el Cuaderno |
| `js/23-informacion-equipo.js` | «📬 Información del equipo docente»: lo recibido de cada materia (`alumno.porMateria`), recordatorio por correo y relleno del seguimiento con familia |
| `js/24-ficha-alumno.js` | Ficha completa del alumno/a (`openFichaAlumno`) y entrevistas con la familia (`alumno.entrevistas`, acta imprimible) |
| `js/25-alertas-y-pendientes.js` | Alertas del alumnado (`_alertasAlumno`, umbrales en `_alertasCfg` de `02-datos.js`), «🧭 Qué me falta» en Inicio y ventana de umbrales |
| `js/26-sesion-evaluacion.js` | «🎓 Sesión de evaluación» a pantalla completa (`openSesionEvaluacion`), acta de la sesión (`generarActaSesion`) y ficha del grupo para el profesorado (`fichaGrupoParaProfesorado`, `exportarFichaGrupo`) |

Antes de `js/01` se carga `../js/comun/formato-tutoria.js`, el formato común con el Cuaderno (ver abajo).

Los bloques de HTML que había entre los scripts (ventanas de historial, asistencia, plano…) siguen en
`tutoria/index.html`, en el mismo sitio, para que cada script encuentre lo que necesita al cargarse.

## Pruebas (`tests/`)

- `tests/calculo-notas.html`: más de 30 casos del motor de notas, calculados a mano. Se abre en el navegador.
- `tests/navegador/`: 54 pruebas que abren la app en Chromium y la usan como una persona (Tutoría, apóstrofos,
  importaciones, dos ventanas, versión del curso, sin conexión, almacenamiento lleno, copia en carpeta, texto hostil,
  curso nuevo, modo proyector, PIN, accesibilidad y contraste, actualización…).
- `tests/version/`: huella de la versión (`npm run sellar`) y su comprobación.
  `npm test` las ejecuta todas; GitHub también, en cada subida (`.github/workflows/pruebas.yml`).
  Instrucciones y lista completa en `tests/README.md`.

**Antes de publicar un cambio, ejecuta `npm test`.** Si añades una función, añade su prueba.

## Reglas para modificar la aplicación

1. **Todos los scripts son «clásicos»** y comparten el mismo ámbito global (igual que cuando era un solo archivo). Una función definida en un archivo se puede llamar desde cualquier otro **una vez cargada la página**.
2. **Al cargar, un archivo solo puede usar lo definido en los anteriores.** Las funciones que se *ejecutan* al cargar (listeners, constantes calculadas) deben quedar después de aquello de lo que dependen. Lo que se ejecuta solo cuando el usuario hace algo no tiene esta restricción.
3. **Archivo nuevo = línea nueva** en `index.html` (y en `APP_SHELL` de `sw.js`).
4. **Tras cualquier cambio, ejecuta `npm run sellar`**: sube `CACHE_NAME` en `sw.js` y anota la huella de los archivos. Es lo que hace que los dispositivos descarguen la versión nueva y muestren el aviso «Actualizar». La prueba `version-cache` falla si se sube un cambio sin sellar.
5. La app se entrega **vacía**: ningún archivo contiene datos de alumnado. Los datos viven en el navegador de cada dispositivo.
6. **Texto de una persona → siempre escapado.** En el Cuaderno, `esc()` para HTML y `escJS()` si va dentro del código de un botón (`onclick="f('…')"`). En Tutoría, `_tEsc()` y `jsAttr()`. Las pruebas `tutoria-texto-hostil` y `cuaderno-texto-hostil` lo comprueban.

## Cómo se comprobó que el troceado no pierde nada

- El código JavaScript de los 52 módulos, unido en orden, es **idéntico byte a byte** al de la versión de un solo archivo (`index_beta_v2_1.html`); solo se cambiaron de sitio tres bloques de arranque (estado inicial, migraciones y primer dibujo) para que se ejecuten al final.
- Los únicos cambios de código respecto a esa versión son: el editor de exámenes y la Planificación temporal se cargan desde sus archivos (antes iban incrustados en el HTML), el PDF del editor lee su CSS y sus fuentes por ruta, y se eliminó el botón oculto «Preparar sin conexión».
- Con los mismos datos, 24 pantallas generan **exactamente el mismo HTML** en las dos versiones; el estado guardado coincide y la recarga con datos y diseño abierto funciona igual.
- Pruebas completas con datos: diseño → cobertura → rúbrica → corrección → reimportación con alumnos corregidos → copia de seguridad → paquete → PDF → versión B.
- Sin conexión (service worker): la app, el editor, el PDF con Lora/Inter y la Planificación temporal cargan desde la caché, sin peticiones a internet.

## Novedades de la v3

- **Aviso de versión nueva.** Al publicar una versión (cambiando `CACHE_NAME`), la app la descarga en segundo
  plano y muestra «Hay una versión nueva · Actualizar». La versión nueva solo se activa al pulsarlo, y la caché
  sirve siempre archivos de una misma versión. Se comprueba también al volver a la app.
- **v2 y v3 en la misma cuenta.** Las cachés de la v3 empiezan por `cuaderno-v3-` y solo se borran las suyas;
  los manifiestos usan `"id": "./"`, así que cada versión se instala como una app distinta.
- **Tutoría dividida en módulos** (`tutoria/css/` y `tutoria/js/`), sin cambiar su funcionamiento.
- **Importar alumnado del Cuaderno en Tutoría** (botón «📥 Del Cuaderno» en cada grupo). Lee los datos del
  Cuaderno sin modificarlos; no duplica a quien ya está y se puede deshacer con Ctrl+Z.
- **Pruebas** en `tests/`: cálculo de notas y 14 pruebas de navegador (`npm test`).
- **Copia automática en una carpeta** (`js/nucleo/copia-carpeta.js`): 🛟 Copias → «Elegir carpeta». Guarda
  `copia-cuaderno-auto-AAAA-MM-DD-<dispositivo>.json` unos minutos después de cada cambio y al ocultar la app;
  conserva 10 por dispositivo. Al abrir, si otro dispositivo dejó una copia más reciente, Inicio ofrece cargarla.
  En iPad/Safari (sin esta función del navegador) se ofrece «Compartir copia».
- **Qué me falta** (Inicio, `queMeFaltaHTML` en `js/inicio/alertas-home.js`): actividades corregidas a medias y
  comentarios de evaluación vacíos (solo en grupos que ya los usan) del periodo elegido.
- **Importar suspensos en Tutoría**: si un nombre no coincide exactamente, se propone el más parecido
  (`_tSimilitud` en `tutoria/js/01-avisos-y-vista-documentos.js`): marcado si el parecido es muy alto, desmarcado si es dudoso.
- **Una sola identidad visual.** Tutoría usa la paleta, la letra y el tema (claro/oscuro, compartido) del Cuaderno
  y se llama «Gestor de Tutoría» (los datos siguen marcados como `EvalIES` para que los archivos sean compatibles).
  En Tutoría, «Alumno / a» es la primera columna y queda fija; las herramientas menos usadas del grupo están en
  «⋯ Más». En el Cuaderno, Calificar (modo Tarjetas) ocupa la mitad de alto por alumno.
- **Una sola ventana guardando a la vez** (`js/una-ventana.js`). Antes, con la app abierta en dos ventanas, la
  última en guardar borraba sin aviso los cambios de la otra. Ahora la segunda ventana queda bloqueada (no puede
  escribir en localStorage, IndexedDB ni archivos) y muestra «Usar esta ventana» para pedir el relevo: la otra
  guarda lo pendiente y se bloquea. Una ventana dormida que despierta después de un relevo se bloquea sola.
  Para que cubra también la v2, la v2 lleva el mismo archivo.
- **«Guardar versión del curso» en Tutoría** mete dentro del .html el código, los estilos y la librería de
  gráficos (`_htmlAutocontenido` en `tutoria/js/14-inicio-y-curso.js`), así que se abre sin servidor y ahora
  también con gráficos.
- **Accesibilidad.** En Tutoría, los campos de la tabla y los desplegables tienen nombre para los lectores de
  pantalla (la cabecera de su columna); en el editor de exámenes, las pestañas se anuncian como pestañas. Las
  29 pantallas revisadas con axe-core (WCAG 2 A/AA) no dan ningún error (no se ha revisado el contraste de color).

## Cambios recientes

### Tutoría · fase 4: sesión de evaluación, acta y ficha del grupo para el profesorado (noviembre de 2026)

- **🎓 Sesión de evaluación** (`tutoria/js/26-sesion-evaluacion.js`): pantalla completa (`.sesion-ov`), grupo y alumno por alumno,
  flechas del teclado. Datos sin claves nuevas en el estado: `alumno.sesionEval[k] = {acuerdos, revisado}` y
  `_asistenciaData['nivel-grupo'].actasSesion[k] = {valoracion, acuerdosGrupo, horaInicio, horaFin}` (viajan con `asistenciaData`);
  la propuesta es `propuesta1`/`propuesta2` y, en la 3.ª, `promociona`. Cada decisión hace `_undoPush`.
- **Acta de la sesión** (`generarActaSesion`) en la vista de documentos.
- **Ficha del grupo para el profesorado** (formato `tutoria-a-cuaderno` en `js/comun/formato-tutoria.js`): sin contactos ni
  entrevistas. El Cuaderno la carga con «📥 De la tutoría» (`js/resultados/de-la-tutoria.js`): empareja por `idsCuaderno` o por
  nombre; marca NESE/repite (nunca desmarca), añade pendientes de su materia («Materia (2º ESO)» → `pendientes` «2») y guarda
  `alumno.deTutoria` / `grupo.deTutoria` (ficha del alumno/a en `plano-aula.js` y Resultados).

### Tutoría · fase 3: ficha, entrevistas, alertas y «Qué me falta» (noviembre de 2026)

- **Ficha completa del alumno/a** (`tutoria/js/24-ficha-alumno.js`): botón 👤 en la columna del nombre; pestañas Resumen,
  Académico, Faltas y convivencia, Entrevistas y Seguimientos; observaciones (`alumno.notas`) editables.
- **Entrevistas con la familia** en `alumno.entrevistas` (campo nuevo; sin él, la lista está vacía): alta y edición con
  borrador, próxima cita, acta (`_entActa`, vista de documentos), borrar con Ctrl+Z.
- **Alertas** (`tutoria/js/25-alertas-y-pendientes.js`): reglas sobre lo de Tutoría y lo recibido de los Cuadernos (se toma el
  mayor, no se suman). La evaluación en curso sale de las fechas de evaluación. Umbrales en `_alertasCfg` (nuevo `alertasCfg`
  en el estado): `buildState`, `loadFromLocalStorage`, `applyFilePayload` (un archivo sin umbrales vuelve a los de por defecto),
  importar JSON (sustituir y combinar) y la versión del curso.
- **«🧭 Qué me falta»** al principio de Inicio; cuenta solo las materias del equipo docente del grupo y las que ya han enviado algo.
- La columna del nombre es algo más ancha (230 px) y la insignia ⚠ va bajo el nombre.

### Tutoría · fase 2: conexión con el Cuaderno (noviembre de 2026)

- **Formato común** `js/comun/formato-tutoria.js` (versión 2, lee también la 1). El Cuaderno arma el paquete en
  `paqueteParaTutoria(grupo, local)`: nota de acta, faltas y retrasos (`asistContarPeriodo`), AC/RC/partes
  (`convContarTipos`) y comentarios, por evaluación según las fechas de Ajustes y del curso entero. El archivo no
  lleva datos personales; la copia local (`local=true`) añade fecha de nacimiento, NESE, repetición y familia.
- **Copia para Tutoría en el mismo navegador**: el Cuaderno la guarda en una base IndexedDB propia (`cuaderno-para-tutoria`,
  aparte de la de sus datos para no competir con su guardado) 4 s después de cada cambio y al abrir, cuando el navegador está
  desocupado y solo desde la ventana que guarda. Tutoría solo la lee y avisa si el Cuaderno tiene cambios posteriores.
- **Tutoría guarda lo de cada materia** en `alumno.porMateria[materia]` (campo nuevo; los datos antiguos no lo tienen y
  todo funciona igual). Importar varios archivos a la vez (`_tImpCuadernoCola`), Ctrl+Z, y el profesor/a entra solo en
  el equipo docente (`_tProfesorDelPaquete`).
- **Contactos de la familia** en `alumno.familia` (campo nuevo), en el seguimiento con familia y desde «📥 Del Cuaderno».
- **Equipo docente en «Apellidos, Nombre»**, con aviso y orden por apellidos (las sesiones de asistencia se reordenan igual).
- **📬 Información del equipo docente** (`tutoria/js/23-informacion-equipo.js`).

### Tutoría · fase 1 de mejoras (noviembre de 2026)

**Fallos corregidos**
- **«📥 Del Cuaderno» no rellenaba nada a quien ya estaba en el grupo** (p. ej. cargado antes por CSV): solo lo vinculaba,
  y la fecha de nacimiento se quedaba vacía. Además, un nombre escrito de otra forma («ANA GARCÍA LÓPEZ» frente a
  «García López, Ana») se duplicaba. Ahora (`tutoria/js/22-importar-del-cuaderno.js`, `_planImportarCuaderno`) se empareja
  por identificador, por nombre y por las mismas palabras en otro orden; a quien ya está se le completan fecha de
  nacimiento, NESE y repetición; un dato distinto solo se cambia si se marca «Sustituir»; los nombres parecidos se
  preguntan; y antes de aplicar se ve qué pasará con cada alumno/a.
- **«Buscar alumno…» no encontraba a nadie**: buscaba en el texto de la fila y el nombre está en una casilla editable.
  `applySearch` busca en el nombre, sin tildes ni mayúsculas.
- **Suspensos del Cuaderno**: al reenviar un aprobado, la materia salía de la lista pero el número de suspensas no bajaba.
- **CSV de Excel en Windows**: se leían como UTF-8 y las tildes salían como «�». `_tLeerTextoArchivo` prueba UTF-8 y, si no
  lo es, Windows-1252. Una columna sin título ya no se asigna a ningún campo.
- **Fechas de evaluación**: cambiarlas no se guardaba hasta tocar otra cosa (`_tFijarFechaEval`); en Seguimientos y Actas no
  Oficiales se quedaba la barra del nivel anterior; si las tres son iguales (sin poner) se avisa.
- **Interfaz**: los niveles van justo después de Inicio (antes quedaban fuera de la pantalla en un portátil); ✏ y ✕ de cada
  grupo, en la fila del nombre y visibles en tema claro; en el móvil la cabecera cabe en dos filas y nada se sale por la derecha.


### Auditoría y mejoras (noviembre de 2026)

**Fallos corregidos**
- **Tutoría ejecutaba HTML metido en un nombre** (y en otros ~200 puntos: niveles, grupos, materias, destinos, tutores,
  observaciones, en pantalla y en los documentos). Ahora todo pasa por `_tEsc()` / `jsAttr()`; se retiran las 17 funciones
  `esc` locales. `tests/navegador/texto-hostil.mjs` rellena todos los campos con texto preparado para colarse, pulsa
  cada botón de cada pantalla y comprueba que nada se inyecta, se ejecuta ni se escapa dos veces.
  Las actas guardadas (HTML editado) pasan por `_tHtmlSeguro()`, que conserva el formato y quita lo que ejecuta código.
- **Asistencia → «Este mes» se desplazaba un día** (fecha en UTC). `fechaISOLocal()` en el Cuaderno y `_hoyLocal()` en Tutoría.
- **El almacén de 5 MB compartido**: IndexedDB pasa a ser el almacén principal en las dos apps (ver abajo).
- **Avisos tapados**: las confirmaciones abiertas desde una ventana (p. ej. «Restaurar» en 🛟 Copias) quedaban debajo de ella.
- **Sin conexión**: `./editor/` está en la lista de `sw.js`; la Planificación ya no pide fuentes a Google; la prueba
  `sin-conexion` apaga el servidor (antes el service worker seguía teniendo red en la prueba).

**Almacenamiento**
- *Cuaderno* (`js/nucleo/guardado-copias.js`, `js/99-arranque.js`): se guarda siempre en IndexedDB. localStorage lleva la
  misma copia mientras quepa (abre al instante). Si no cabe, se retira la copia antigua y se pone la marca `KEY_EN_IDB`:
  al abrir, los datos se leen de IndexedDB como un arranque normal, y hasta tenerlos no se guarda nada (`_guardadoEnPausa`).
- *Tutoría* (`tutoria/js/15-guardado-y-archivos.js`): estado completo en IndexedDB (base `evalies-estado`); en localStorage,
  copia ligera sin imágenes (`enIDB`). `_tutCargarDeIDB()` reconcilia al abrir. Las fotos y horarios se reducen al cargarlos
  (`_tutReducirImagen`) y se guardan al momento.

**Mejoras**
- **Copia en carpeta cifrada** (`ccCifrar`, `cifrarConClave`): la clave derivada, no extraíble, se guarda en IndexedDB.
- **Versión sellada** (`tests/version/`): `npm run sellar` y la prueba `version-cache`. `sw.js` instala con `{cache:'reload'}`.
- **Empezar curso nuevo** (`js/nucleo/nuevo-curso.js`): `ncAplicar(opciones)` hace el cambio; antes exige guardar el archivo.
- **Modo proyector** (`js/ui/privacidad.js`): tras cada cambio de la página marca con `.priv` los textos y campos que
  coinciden con un nombre del alumnado y las notas de su fila. `data-sin-privacidad` excluye una zona.
- **Bloqueo con PIN** (`js/bloqueo.js`): `window.BloqueoPIN`. Guarda el resumen del PIN en localStorage (`cuaderno_bloqueo_pin`).
- **Sorteo y grupos** (`js/inicio/herramientas-clase.js`): `claseRepartir()` reparte en equipos igualados.
- **Cabecera y pestañas**: en ≤640 px la cabecera cabe en dos filas (`.tb-txt`, `.tb-fuera-movil`); en ≥1000 px las secciones
  del grupo son pestañas (`.gtabs`, `GRUPO_PESTANAS`).
- **Importar con identificadores seguros** (`idsNoValidos`): una copia, grupo, programación o materia con identificadores
  que la app no genera no se carga.

- **Rúbrica = estructura del Diseño.** «Importar a la rúbrica →» copia ahora apartado → pregunta → subpregunta, en el mismo orden y con los puntos de cada parte (antes solo importaba una línea por pregunta). El código está en `js/corrector/editor-examenes.js` (`cxImportarEstructura`, `exHojas`, `exPrevisionReimport`); el puente `editor/js/puente-cuaderno.js` entrega ahora el texto completo y la numeración de cada nodo. Los bloques importados llevan `tipo` («apartado», «pregunta», «subpregunta») y las preguntas sueltas dentro de un nivel mixto son bloques de un solo ítem (`unico`).
- **Comentarios de la rúbrica con color.** El comentario de cada pregunta y el comentario general del examen admiten letra en color (rojo, azul, verde, naranja, morado, negro u otro) y negrita: la barra sale debajo del comentario al escribir en él. Se guardan en `grupo.examComentarios` como antes: **texto plano** si no llevan formato y **HTML saneado** (`progSanitizarHTML`) si lo llevan; `comentRicoHTML()` muestra los dos en pantalla y en la rúbrica impresa. Código en `js/corrector/editor-examenes.js` (`comentEditorHTML`, `comentValorDe`, `comentRicoHTML`).
- **Programación: SdA de cada actividad.** La sección «Situaciones de Aprendizaje que cubre» solo sale en las actividades marcadas como examen, y plegada (`progActividadSdasHTML`, `state.ui.progActSdasAbiertas`). Las demás actividades se crean ya dentro de su SdA; si una no está en ninguna o está en varias, la sección se sigue mostrando para poder corregirlo.
- **Resumen «De dónde sale la nota».** El informe detallado y el informe individual empiezan con una tabla que resume el cálculo de la nota cuantitativa de la evaluación elegida (o de la final): cada bloque con su peso, sus notas, su media y lo que aporta, y la suma final con los puntos extra. `resumenCalculoNotaHTML()` en `js/resultados/informe-detallado.js`; usa las mismas funciones del motor de notas.
- **Maquetación del informe detallado.** Cada actividad del desglose es una pieza que no se parte entre páginas; la cabecera de cada bloque va pegada a su primera actividad; los títulos no se quedan solos al pie de una página (`break-after:avoid`) y, si un cuadro no cabe en una página, se corta entre actividades o criterios y repite el borde. Los títulos de todos los informes (`abrirVentanaInforme`) tampoco se quedan solos.

### Rapidez, pantallas táctiles y pruebas al día (noviembre de 2026)

Medido con un curso grande ficticio (6 grupos × 30 alumnos × 60 actividades, y un examen de 24 ítems) en un procesador 4 veces más lento.

- **Corregir con rúbrica, el doble de rápido.** Cada desplegable de puntuación llevaba todas sus opciones (0; 0,05; 0,1…): unas 1.400 en un examen largo, y se volvían a crear con cada puntuación. Ahora `cxSelectPuntuacionHTML` (`js/corrector/corregir.js`) pinta solo «—», «NP» y el valor guardado (`data-cx-max`), y `cxRellenarPuntuacion` crea la lista completa justo antes de usarse (`pointerdown`, `mousedown`, `touchstart`, `focusin` o `keydown` sobre el desplegable). Cada puntuación tarda más o menos la mitad: de unos 170 a unos 75 ms por alumno/a y de unos 150 a unos 65 ms por pregunta (medianas de 9 medidas). Lo guardado y el aspecto no cambian. En las pruebas, `elegir(locator, valor)` (`tests/navegador/utilidades.mjs`) toca el desplegable antes de elegir, como una persona.
- **Accesibilidad más ligera.** `accesibilidadPasada` calcula el texto de cada cabecera de tabla una vez por pasada (antes, una vez por fila) y solo clona la cabecera si contiene botones o campos. Es un ahorro pequeño (no se distingue del ruido de la medida); el grueso del tiempo de Alumnado es la maquetación de la tabla.
- **Pantallas táctiles.** El bloque `@media (pointer:coarse)` del principio de `css/app.css` pedía casillas de 22 px y la × de cada grupo de 34 px, pero las reglas generales escritas después lo anulaban; ahora se repite al final de la hoja. Las casillas no se encogen junto a un texto largo (`flex-shrink:0`). En el iPad en vertical (641–900 px), las pestañas de grupo no muestran la materia y caben en una fila. Actividades ya no se sale de la pantalla en el móvil (desplegable de bloque con `max-width:100%`).
- **Novedades.** La tarjeta de Inicio (`NOVEDADES_V3`, versión `v3-6`) y la guía (`guia_mejorada.html`: «Lo más reciente», rúbrica por niveles en 6.5, desplegable de puntuación en 6.7, «De dónde sale la nota» en Resultados) recogen lo publicado desde el modelo B.
- **Pruebas.** Playwright 1.56 → 1.63: con un Chromium más nuevo, la prueba `copia-carpeta` se cerraba a mitad.

### Documentos de referencia de cada Programación (noviembre de 2026)

- **Qué es.** Cada Programación de Aula tiene dos huecos fijos (`PROG_DOCS`): «Modelo de Programación de Aula» (`modelo`) y «Propuesta Pedagógica» (`propuesta`). En cada uno, un enlace (OneDrive) y/o el PDF guardado en la app. Código en `js/programacion/documentos-referencia.js`; la tarjeta sale en el detalle (`progDocsCardHTML`) y los accesos rápidos en el listado (`progDocsChipsHTML`).
- **Datos.** En el estado solo va la referencia: `programacion.documentos[tipo] = {enlace, archivo:{id,nombre,tamano,fecha}}` (sin migración: si falta, el hueco está vacío). El PDF va como `data:application/pdf;base64,…` en la base de datos de los diseños de examen, con la clave `prog:doc:<id>`. Así entra sin más en «Exportar copia», la copia cifrada, la copia en carpeta y el archivo de «Empezar curso nuevo» (`_examenesDiseno`), y vuelve al importarlos; no infla localStorage ni la pila de deshacer. Las claves `prog:…` ya las respetan la limpieza de diseños huérfanos y «Empezar curso nuevo» (se conservan si se conservan las Programaciones). La copia diaria de diseños (`exCopiaDiaria`) no los incluye.
- **Archivos.** Cada PDF subido recibe un id nuevo, así que un id es siempre el mismo contenido: «Duplicar» comparte el archivo y `progDocBorrarSiNoSeUsa` solo lo borra cuando ninguna programación lo usa (al quitarlo, cambiarlo o eliminar la programación). Deshacer devuelve la referencia pero no el archivo: el visor avisa y pide volver a guardarlo.
- **Exportar/importar una programación.** El .json lleva `documentosPDF: {id: datos}`; al importar, cada PDF válido se guarda con un id nuevo (`progDocsDeImportada`).
- **Seguridad.** Solo se aceptan PDF (cabecera `%PDF-`, máximo 25 MB) y enlaces `http(s)`; el enlace se vuelve a comprobar al mostrarlo (`progDocEnlace`), por si una copia manipulada trae `javascript:`.
- **Visor.** `progDocVer` abre una ventana dentro de la app y dibuja las páginas con pdf.js (`tutoria/vendor/`, ya en la caché sin conexión), solo las que se acercan a la vista. Prueba: `documentos-programacion`.
- De paso: el desplegable «📋 Programación (SdA, metodología, recursos…)» ya no ensancha la página en el móvil.

### Aspecto de Geografía e Historia (noviembre de 2026)

El personaje va en el «marco» (cabecera, Inicio, bienvenida, icono, pantallas vacías); las pantallas de trabajo no cambian.
- **Letra.** Títulos (`h1`, `h2`, `.hero-title`, `.bienvenida-title`) en Lora (`--font-serif`), con los archivos del editor (`editor/fonts/lora-*.woff`, ya en la caché sin conexión). El resto, la letra del sistema.
- **Dibujos** en `img/` (SVG, en `APP_SHELL`): `mapa-fondo.svg` (retícula de una proyección cónica y curvas de nivel; fondo de la cabecera, `.hero` y la bienvenida, con máscara que lo aparta del texto), `rosa-vientos.svg` (junto al título de la cabecera, emblema de la bienvenida y marca de agua de Inicio, que gira muy despacio salvo con «reducir movimiento»), `vacio-globo.svg` y `vacio-columna.svg` (pantallas vacías: `vacioHTML(texto, dibujo, extra)` en `js/nucleo/utilidades.js`). Son decorativos (`alt=""`).
- **Icono** (`icons/icon-*.png`): la rosa de los vientos sobre el azul marino con el mapa tenue, con margen para el recorte «maskable». Tutoría conserva el suyo.
- El servidor de las pruebas (`tests/navegador/utilidades.mjs`) sirve ahora `.svg` como `image/svg+xml`.

### Alumnado en riesgo, mapa de criterios y autoevaluación (noviembre de 2026)

Las tres usan los cálculos de siempre (`notaTrimestre`, `notaActa`, `scoreCriterio`, `nivel`, `cxEvalRubrica`): no hay fórmulas nuevas.
- **Alumnado en riesgo** (`js/inicio/aviso-riesgo.js`, tarjeta en Inicio tras «Qué me falta»): para `state.ui.trim`, quien tiene nota de acta < 5, quien baja `RIESGO_BAJADA` (2) puntos o más respecto a la evaluación anterior y quien tiene `RIESGO_NP` (2) o más NP. Ordenado por gravedad; 8 a la vista. `riesgoIr` abre Resultados con su informe (`state.ui.resAl`).
- **Mapa de criterios** (`js/resultados/mapa-criterios.js`): `state.ui.resVista==="mapa"` sustituye la tabla de Resultados. Columnas: criterios de las actividades de la evaluación (sin recuperaciones), en el orden del currículo y agrupados por CE. El color va en `--mc-fg` y no en `color:` porque el tema oscuro aclara algunos `color:` escritos en el atributo `style`. `mapaImprimir` usa `abrirVentanaInforme` en horizontal.
- **Autoevaluación y coevaluación** (`js/corrector/autoevaluacion.js`): `grupo.autoeval[alId][actId] = {auto:{items,fecha}, co:{items,por,fecha}}` (en `defGrupo`/`normalizarGrupo`; «Empezar curso nuevo» lo vacía al crear grupos nuevos). Puntos por ítem, como `rubricScores`; `aeNota` aplica la misma conversión a 10 que `cxNotaCuant`. Solo se compara una hoja completa (`aeCompleto`). Hojas: `aeImprimirHojas(actId,{tipo,hojas,desc,refl})`, con `mbRubricaVista` para el orden del modelo y la rúbrica del examen alternativo. No toca `notasCuant` ni `notas`.
- Prueba: `riesgo-mapa-autoevaluacion`. Nota para pruebas: la vista de impresión pinta el documento en un *shadow DOM* (`#printOverlay .print-hoja`), así que hay que leerlo con `shadowRoot` o con un `locator`.

### Guía completa y descargable (noviembre de 2026)

- `guia_mejorada.html` sigue siendo un único archivo sin dependencias (estilos dentro, sin imágenes ni scripts externos). Botones nuevos en la cabecera: **⬇ Descargar** (vuelve a pedir la propia página y la guarda como `Guia-Cuaderno-del-profesor.html`, con el botón «Inicio» apuntando a la dirección completa de la app; si se abre como archivo sin esa dirección, «Inicio» se oculta) e **🖨️ Imprimir** (los botones no salen en papel). El nombre del archivo va sin tildes ni espacios: con ellos, Chrome descarta el nombre y guarda «download».
- Secciones nuevas: Planificación temporal (en 4), 21 Inicio (Hoy, Qué me falta, Alumnado en riesgo, avisos), 22 Herramientas de clase, 23 Modo proyector y PIN, 24 Empezar curso nuevo y Revisar mis datos, 25 Deshacer; Preguntas frecuentes pasa a 26.
- Prueba `guia-descargable`: índice sin enlaces rotos, descarga, apertura como archivo suelto e impresión.

### Informes por evaluación y final (noviembre de 2026)

- **«Informes de»** (Resultados, `#repGrupoSel`, `resElegirPeriodo`): una evaluación cambia `state.ui.trim` (la tabla, el Periodo de la cabecera y todos los informes van a la vez); «Evaluación final» pone `state.ui.resInfFinal` y solo afecta a «Informe de grupo» e «Informes detallados». Cambiar el Periodo de la cabecera quita `resInfFinal`. Antes, el desplegable solo movía esos dos botones y parecía no hacer nada.
- **Informe final** (`informeFinalAlumnoBodyHTML`): incluye `resumenCalculoNotaHTML(grupo,al,"final")`, «De dónde sale la nota» de la nota final, tras la tabla de evaluaciones. No se repite el de cada evaluación porque el informe final ya lleva el desglose de actividades de todo el curso.
- Prueba: `informes-por-evaluacion`.

### Redondeo de la nota de acta por curso (noviembre de 2026)

- `modoRedondeoActa(grupo)` (`js/nucleo/utilidades.js`) mira primero `state.ajustesNota.redondeoPorCurso[grupo.catalogoKey]` y, si el curso no tiene regla propia, la general `state.ajustesNota.redondeoActa` (la de siempre: una copia antigua no cambia ninguna nota). Sin grupo, usa el grupo abierto. `notaActa(v,grupo)` se la pasa; en las pantallas de varios grupos (Inicio, Memoria, Resumen) se llama siempre con el grupo.
- Ajustes del grupo guarda la regla para su materia y curso, dice qué grupos la comparten y enseña la de los demás cursos («Tus otros cursos»). La migración descarta reglas no válidas.
- Prueba: `redondeo-por-curso`.

### Informe para la familia en el móvil (noviembre de 2026)

- `js/informes/panel-familias.js`: `panelFamiliaHTML(grupo,al,periodo)` genera un documento HTML completo (periodo 0–2 o `"final"`) con 8 pestañas: Resumen, De dónde sale la nota (`resumenCalculoNotaHTML`), Pruebas objetivas (nota y `examComentarios[al][act]`, nunca los de cada pregunta), Trabajos de clase (por SdA: nota, NP, exento o sin nota), Competencias (criterios, CE y CC; en el final, media anual con `mediaAnualPonderada`), Asistencia y Convivencia (en las fechas de la evaluación de Ajustes; sin fechas, todo el curso) e Informe (`informeAlumnoBodyHTML` / `informeFinalAlumnoBodyHTML`).
- **Sin JavaScript** (la vista previa de adjuntos del iPhone no lo ejecuta): las pestañas son `input[type=radio]` + `label` + CSS generado para N pestañas. Sin recursos externos. `@media print` muestra solo la pestaña Informe.
- Botones: «📱 Para la familia» en la ventana del ojo (`pfDescargarAlumno(alId,periodo)`) y «📱 Informes para las familias» en Resultados (`pfDescargarGrupo`, periodo de «Informes de»), que guarda un `.zip` sin compresión hecho a mano (`pfZip`, CRC-32, nombres UTF-8). Nombres de archivo sin tildes (`pfSinTildes`).
- **Comentario final de curso**: `alumno.comentarioFinal` (en `normalizarAlumno`; «Empezar curso nuevo» lo vacía), editable en el informe de cada alumno de Resultados; sale en el informe final y en el panel final.
- La tabla «De dónde sale la nota» (`rsnCSS`) se compacta por debajo de 600 px (también en la app).
- **Todas las actividades** con las que se ha evaluado cada competencia y criterio: la pestaña Competencias las lista («Evaluado con: …») y el informe oficial del panel se genera con `{actsCompletas:true}`, sin el «+N más» de `abrevActs`. Los informes PDF de siempre siguen abreviando a 4.
- Pruebas: `panel-familias` y `panel-familias-actividades`.
