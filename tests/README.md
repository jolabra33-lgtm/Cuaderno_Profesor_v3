# Pruebas

Hay dos tipos de prueba. Ninguna usa ni modifica tus datos reales.

## 1. Cálculo de notas (sin instalar nada)

Abre `tests/calculo-notas.html` en el navegador, desde la dirección de la app
(`https://TU-USUARIO.github.io/Cuaderno_Profesor_v3/tests/calculo-notas.html`)
o desde un servidor local. Todas las filas deben salir en verde. Úsala después de
tocar `js/evaluacion/calculo-notas.js` o el redondeo de `js/nucleo/utilidades.js`.

## 2. Pruebas de navegador (todo lo demás)

Abren la app en un Chromium sin ventana y comprueban que funciona de verdad:

| Prueba | Qué comprueba |
|---|---|
| `calculo-notas` | Las de arriba, automáticamente |
| `version-cache` | La versión de la caché está sellada y la lista de archivos sin conexión de `sw.js` está completa |
| `carga` | Las cinco páginas cargan sin errores ni archivos que falten |
| `tutoria-guardado` | Alta de alumnado en Tutoría, contador, columna del nombre, recarga |
| `tutoria-manifiesto` | Tutoría no provoca «Actualización de aplicación disponible» dentro de la app del Cuaderno |
| `tutoria-apostrofo` | Grupos y niveles con apóstrofo («PMAR d'Alt», «FPB l'Horta») |
| `tutoria-texto-hostil` | Tutoría: ningún nombre, grupo, materia u observación con HTML o comillas se cuela como código ni se escapa dos veces |
| `cuaderno-texto-hostil` | Cuaderno: lo mismo en 20 pantallas y el buscador; una copia con identificadores manipulados no se carga |
| `tutoria-actas-guardadas` | Un acta guardada conserva su formato y no puede traer código dentro |
| `del-cuaderno` | «📥 Del Cuaderno»: añade a quien falta, completa fecha de nacimiento, NESE y repetición de quien ya estaba (nombre en otro orden o en mayúsculas), no cambia datos distintos sin pedirlo, pregunta por nombres parecidos, deshacer |
| `suspensos` | Importar suspensos por identificador y por nombre parecido; al reenviar un aprobado, la materia sale y el número de suspensas baja |
| `tutoria-csv` | Un CSV de Excel en Windows (ANSI) conserva tildes y ñ; una columna sin título no se asigna a ningún campo; UTF-8 con BOM |
| `tutoria-buscar` | «Buscar alumno…» encuentra por el nombre, sin tildes ni mayúsculas, y el contador cuadra |
| `tutoria-equipo-docente` | Equipo docente en «Apellidos, Nombre»: aviso sin perder el cursor, cambio automático, orden por apellidos que arrastra la asistencia a la sesión |
| `tutoria-familia` | Contactos de la familia traídos del Cuaderno sin repetir, editables en el seguimiento y guardados |
| `cuaderno-a-tutoria` | Paquete v2 (notas, faltas, convivencia, comentarios) en el mismo navegador y por archivos (varios a la vez); equipo docente automático; el archivo no lleva datos personales; deshacer |
| `tutoria-informacion-equipo` | «📬 Información del equipo docente»: recibido y pendiente por materia, recordatorio por correo, vista por alumno/a y relleno del seguimiento |
| `tutoria-interfaz` | Niveles junto a Inicio, aviso y guardado de las fechas de evaluación, barra de fechas solo en los niveles, botones de los grupos, móvil sin desbordar |
| `dos-ventanas` | Una sola ventana guarda; relevo con «Usar esta ventana» |
| `almacen-lleno` | Cuaderno: con localStorage lleno por otra app, se guarda y se abre desde IndexedDB sin avisos ni pérdidas |
| `tutoria-almacen` | Tutoría: fotos y actas en IndexedDB, localStorage ligero, datos de la versión anterior, fotos reducidas |
| `version-del-curso` | El .html de «Guardar versión del curso» se abre sin servidor |
| `sin-conexion` | Todas las páginas funcionan sin conexión (se apaga el servidor), también la Planificación con sus letras |
| `copia-carpeta` | Copia automática en carpeta: escribe, conserva 10, avisa de otra más reciente |
| `copia-carpeta-cifrada` | La copia de la carpeta cifrada es ilegible sin la contraseña y se abre con ella |
| `nuevo-curso` | «Empezar curso nuevo»: archivo completo, qué se vacía, qué se conserva, deshacer |
| `sorteo-y-grupos` | Sorteo sin repetir y sin ausentes; reparto en grupos igualados |
| `modo-proyector` | Los nombres del alumnado y sus notas se difuminan en todas las pantallas |
| `bloqueo-pin` | PIN: app tapada, PIN incorrecto, espera tras 5 fallos, código de recuperación, Tutoría |
| `puntos-extra` | Puntos extra: se apuntan en Calificar y en Resultados, suben la nota (tope 10), se ven en los informes y sobreviven a la papelera |
| `comentarios-sda-resumen` | Comentarios de la rúbrica con color (y los antiguos de texto plano igual), la sección de SdA de la Programación solo en exámenes y plegada, y el resumen «De dónde sale la nota» en los informes |
| `avisos-encima` | Los avisos y ventanas de contraseña salen por encima de la ventana desde la que se abren |
| `examen-adaptado` | Examen adaptado NESE: aviso, creación desde el Diseño, corrección con su rúbrica, paso por la Programación a otro grupo |
| `modelo-b` | Modelo B: sigue al general, reparto A/B (lista y plano), rúbrica en el orden del B, enlace de una rúbrica hecha a mano |
| `que-me-falta` | Avisos de notas a medias y comentarios pendientes |
| `calificar` | Calificar con Intro y guardado de notas |
| `corregir-desplegable` | Corregir: puntuación de cada ítem en un desplegable (que crea su lista al ir a usarse: ratón, dedo o teclado) y «No presentado» |
| `rubrica-resumida` | Imprimir la rúbrica resumida |
| `rubrica-niveles` | Rúbrica por niveles de logro: crear, corregir pinchando casillas, afinar, cambiar valores y pesos, imprimir, por categoría, plantillas, cambio de tipo y accesibilidad |
| `rubrica-niveles-programacion` | Examen traído de la Programación: al abrirlo en el Corrector pregunta el tipo de rúbrica y pasa a niveles con una categoría por criterio |
| `documentos-programacion` | Programación de Aula: Modelo y Propuesta Pedagógica con enlace y PDF guardado (ver, rechazar lo que no es PDF ni web, copia de seguridad, exportar/importar, duplicar, quitar, eliminar) |
| `riesgo-mapa-autoevaluacion` | Inicio avisa de quien suspende, baja 2 puntos o acumula NP; mapa de criterios (porcentajes, colores, media, imprimir); autoevaluación y coevaluación (tarjeta, comparación, distintivos, hojas por puntos y por niveles) sin tocar la nota |
| `guia-descargable` | La guía: índice sin enlaces rotos y «⬇ Descargar» genera un único .html que se abre sin servidor, con el enlace a la app |
| `informes-por-evaluacion` | Resultados: «Informes de» mueve la tabla y los informes a la vez; el informe final (uno o todo el grupo) lleva «De dónde sale la nota» de la nota final |
| `redondeo-por-curso` | El redondeo de la nota de acta se elige por curso (materia y curso): lo comparten sus grupos y una copia antigua conserva su regla |
| `panel-familias` | Informe para la familia: contenido (y lo que no debe llevar), pestañas sin JavaScript, solo el informe oficial al imprimir, final de curso y .zip del grupo |
| `panel-familias-actividades` | En el informe para la familia, cada competencia y criterio lista todas sus actividades (sin «+N más»); el PDF de siempre no cambia |
| `accesibilidad` | WCAG 2 A/AA (axe-core) en todas las pestañas y modos, y contraste |
| `actualizacion` | Aviso «Hay una versión nueva · Actualizar» |

### Ejecutarlas en tu ordenador

Hace falta [Node.js](https://nodejs.org) 18 o posterior. Desde la carpeta del repositorio:

```bash
npm install                        # solo la primera vez
npx playwright install chromium    # solo la primera vez
npm test                           # todas (tarda 1 o 2 minutos)
npm test -- dos-ventanas suspensos # solo esas, con el detalle de cada comprobación
RASTREO=completo npm test -- tutoria-texto-hostil   # el rastreo entero de Tutoría (varios minutos)
```

Al final dice cuántas comprobaciones son correctas; si alguna falla, muestra cuál y por qué.

### En GitHub, solas

El archivo `.github/workflows/pruebas.yml` hace que GitHub las ejecute cada vez que subes
un cambio. El resultado se ve en la pestaña **Actions** del repositorio (✓ verde o ✗ rojo).
No afecta a la app publicada en GitHub Pages.

### Añadir una prueba

Cada prueba es una entrada de `tests/navegador/pruebas.mjs` con un `nombre`, una
`descripcion` y una función que usa `t.ok(condición, descripción, detalle)`. Las utilidades
de `tests/navegador/utilidades.mjs` crean un Cuaderno o una Tutoría con datos de prueba.

## 3. Versión de la caché («sellar»)

Los dispositivos solo descargan una versión nueva cuando cambia `CACHE_NAME` en `sw.js`. Para no depender de
acordarse, `sw.js` guarda también `HUELLA`, un resumen de todos los archivos que se guardan para el uso sin conexión.

```bash
npm run sellar
```

Si algún archivo ha cambiado, sube `CACHE_NAME` y anota la huella nueva; si no, no toca nada. Hazlo antes de subir
cambios y sube también `sw.js`. La prueba `version-cache` falla si se sube un cambio sin sellar.
