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
| `del-cuaderno` | «📥 Del Cuaderno»: sin duplicar, vinculando identificadores, deshacer |
| `suspensos` | Importar suspensos por identificador y por nombre parecido |
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
| `avisos-encima` | Los avisos y ventanas de contraseña salen por encima de la ventana desde la que se abren |
| `que-me-falta` | Avisos de notas a medias y comentarios pendientes |
| `calificar` | Calificar con Intro y guardado de notas |
| `corregir-desplegable` | Corregir: puntuación de cada ítem en un desplegable y «No presentado» |
| `rubrica-resumida` | Imprimir la rúbrica resumida |
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
