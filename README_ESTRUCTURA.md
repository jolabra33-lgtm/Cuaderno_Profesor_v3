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
| `sw.js` | Service worker: lista de archivos para el uso sin conexión y versión de la caché |
| `guia_mejorada.html` | Guía de uso |

| `js/una-ventana.js` | Solo una ventana guarda a la vez: si la app ya está abierta en otra (o en la otra versión, v2/v3), esta se bloquea con un aviso y «Usar esta ventana». Es el **primer** script de `index.html` y de `tutoria/index.html` |
| `js/registro-sw.js` | Registro del service worker y aviso «Hay una versión nueva · Actualizar» (lo usan el Cuaderno y Tutoría) |
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
| `js/nucleo/guardado-copias.js` | Guardado a prueba de pérdidas, deshacer/rehacer y copias automáticas |
| `js/nucleo/cifrado.js` | Copias cifradas con contraseña |
| `js/nucleo/copia-carpeta.js` | Copia automática en una carpeta elegida (ordenador, Chrome/Edge): un archivo por día y dispositivo; avisa si otro dispositivo ha dejado una copia más reciente |
| `js/curriculo/catalogos-importador.js` | Autocarga del currículo e importador de materias propias |
| `js/evaluacion/calculo-notas.js` | Motor de cálculo de notas (criterios, CE, CC, bloques, trimestres, final) y recuperaciones |
| `js/ui/barra-superior.js` | Barra superior y navegación entre las aplicaciones |
| `js/inicio/cronometro.js` | Cronómetro flotante |
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
| `js/resultados/informe-detallado.js` | Distribución, evolución del alumno e informe detallado de cálculo |
| `js/resultados/resultados.js` | Comentarios sugeridos, paso a Tutoría y pantalla de Resultados |
| `js/resultados/cobertura-diagnostico.js` | Cobertura de la evaluación, «Revisar mis datos» y novedades |
| `js/clase/asistencia.js` | Asistencia (y constantes de convivencia y familias) |
| `js/clase/convivencia.js` | Convivencia: AC, RC y parte de amonestación |
| `js/clase/familias.js` | Contacto con familias |
| `js/clase/diario.js` | Diario de clase |
| `js/programacion/programacion-aula.js` | Programación de aula: lista, SdA y recursos |
| `js/programacion/actividades-y-texto-rico.js` | Editor de texto enriquecido y actividades de la programación |
| `js/programacion/detalle-imprimir.js` | Detalle de la programación e impresión |
| `js/programacion/planificacion-temporal.js` | Planificación temporal de la materia (herramienta incrustada) |
| `js/memoria/memoria-curso.js` | Memoria de curso |
| `js/ajustes/ajustes-grupo.js` | Ajustes del grupo |
| `js/informes/exportaciones.js` | Informes y exportaciones (CSV) |
| `js/informes/impresion.js` | Impresión sin ventanas emergentes e informe del alumno |
| `js/informes/informe-final.js` | Informe final de curso |
| `js/resumen/resumen-grupo.js` | Resumen del grupo: aprobados, SdA y estadísticas |
| `js/corrector/motor-rubricas.js` | Corrector de exámenes: motor de rúbricas |
| `js/corrector/programacion-corrector.js` | Programación ↔ Corrector: rúbricas para los exámenes planificados |
| `js/corrector/navegacion-lista-crear.js` | Navegación del Corrector, lista de exámenes y crear examen |
| `js/corrector/editor-rubrica.js` | Editor de rúbrica y rúbricas adaptadas (NESE) |
| `js/corrector/corregir.js` | Corregir, estadísticas por ítem e impresión de la rúbrica corregida |
| `js/ui/buscador.js` | Buscador global |
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
| `js/22-importar-del-cuaderno.js` | Botón «📥 Del Cuaderno»: copia nombres y fechas de nacimiento de un grupo del Cuaderno |

Los bloques de HTML que había entre los scripts (ventanas de historial, asistencia, plano…) siguen en
`tutoria/index.html`, en el mismo sitio, para que cada script encuentre lo que necesita al cargarse.

## Pruebas del cálculo de notas (`tests/`)

`tests/calculo-notas.html` carga los mismos archivos que `index.html` (los lee de su lista, así que no hay
que mantenerla aparte) y comprueba más de 30 casos calculados a mano: nota de actividad, bloque, evaluación
y final; pesos; recuperaciones (nota más alta, sustituye, media, tope y exentos); competencias específicas y
clave; avisos de bloques sin nota; y redondeo de la nota mostrada y de la nota de acta.
Ábrela en el navegador (desde GitHub Pages o un servidor local) después de tocar
`js/evaluacion/calculo-notas.js` o `js/nucleo/utilidades.js`: todas deben salir en verde. No guarda nada.

## Reglas para modificar la aplicación

1. **Todos los scripts son «clásicos»** y comparten el mismo ámbito global (igual que cuando era un solo archivo). Una función definida en un archivo se puede llamar desde cualquier otro **una vez cargada la página**.
2. **Al cargar, un archivo solo puede usar lo definido en los anteriores.** Las funciones que se *ejecutan* al cargar (listeners, constantes calculadas) deben quedar después de aquello de lo que dependen. Lo que se ejecuta solo cuando el usuario hace algo no tiene esta restricción.
3. **Archivo nuevo = línea nueva** en `index.html` (y en `APP_SHELL` de `sw.js`).
4. **Tras cualquier cambio, cambia `CACHE_NAME` en `sw.js`** (`CACHE_PREFIJO + '1'` → `'2'`…). Es lo que hace que los dispositivos descarguen la versión nueva y muestren el aviso «Actualizar».
5. La app se entrega **vacía**: ningún archivo contiene datos de alumnado. Los datos viven en el navegador de cada dispositivo.

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
- **Pruebas del cálculo de notas** en `tests/calculo-notas.html`.
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

- **Rúbrica = estructura del Diseño.** «Importar a la rúbrica →» copia ahora apartado → pregunta → subpregunta, en el mismo orden y con los puntos de cada parte (antes solo importaba una línea por pregunta). El código está en `js/corrector/editor-examenes.js` (`cxImportarEstructura`, `exHojas`, `exPrevisionReimport`); el puente `editor/js/puente-cuaderno.js` entrega ahora el texto completo y la numeración de cada nodo. Los bloques importados llevan `tipo` («apartado», «pregunta», «subpregunta») y las preguntas sueltas dentro de un nivel mixto son bloques de un solo ítem (`unico`).
