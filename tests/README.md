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
| `carga` | Las cinco páginas cargan sin errores ni archivos que falten |
| `tutoria-guardado` | Alta de alumnado en Tutoría, contador, columna del nombre, recarga |
| `tutoria-apostrofo` | Grupos y niveles con apóstrofo («PMAR d'Alt», «FPB l'Horta») |
| `del-cuaderno` | «📥 Del Cuaderno»: sin duplicar, vinculando identificadores, deshacer |
| `suspensos` | Importar suspensos por identificador y por nombre parecido |
| `dos-ventanas` | Una sola ventana guarda; relevo con «Usar esta ventana» |
| `version-del-curso` | El .html de «Guardar versión del curso» se abre sin servidor |
| `sin-conexion` | Todas las páginas funcionan sin conexión |
| `copia-carpeta` | Copia automática en carpeta: escribe, conserva 10, avisa de otra más reciente |
| `que-me-falta` | Avisos de notas a medias y comentarios pendientes |
| `calificar` | Calificar con Intro y guardado de notas |
| `accesibilidad` | WCAG 2 A/AA (axe-core) en todas las pestañas y modos, y contraste |
| `actualizacion` | Aviso «Hay una versión nueva · Actualizar» |

### Ejecutarlas en tu ordenador

Hace falta [Node.js](https://nodejs.org) 18 o posterior. Desde la carpeta del repositorio:

```bash
npm install                        # solo la primera vez
npx playwright install chromium    # solo la primera vez
npm test                           # todas (tarda 1 o 2 minutos)
npm test -- dos-ventanas suspensos # solo esas, con el detalle de cada comprobación
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
