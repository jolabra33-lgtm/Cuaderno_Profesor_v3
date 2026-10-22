# Cuaderno del profesor v3 · Evaluación, Corrector y Tutoría

Aplicación web para Geografía e Historia, pensada para usarse como una app (PWA) en el
iPad, el móvil o el ordenador: sin cuenta, sin servidor y **sin datos dentro**. Al
publicarla se abre vacía; todo lo que se escribe se guarda solo en el navegador del
dispositivo.

Contiene dos aplicaciones independientes (no comparten alumnado ni notas):

- **Cuaderno del profesor** (`index.html`): evaluación por competencias, Corrector de
  exámenes con diseño de examen y rúbrica, programación de aula, calendario, planes…
- **Gestor de Tutoría** (`tutoria/index.html`).

## Contenido del repositorio

```
index.html              → Cuaderno del profesor (estructura y lista de scripts)
css/                    → estilos de la aplicación
js/                     → código de la aplicación en módulos (ver README_ESTRUCTURA.md)
tests/                  → pruebas del cálculo de notas (abre tests/calculo-notas.html)
editor/                 → editor de exámenes (página propia, con sus fuentes Lora e Inter)
tools/                  → Planificación temporal de la materia
sw.js                   → service worker: funcionamiento sin conexión y versión de la caché
manifest.json, icons/   → instalación como app
guia_mejorada.html      → guía de uso actual (también enlazada desde la app)
tutoria/                → Gestor de Tutoría (independiente): index.html, css/, js/ y librerías en vendor/
.nojekyll               → evita que GitHub procese el sitio como Jekyll
README.md               → este archivo
README_ESTRUCTURA.md    → mapa técnico: qué hace cada módulo y cómo modificarla
```

## 1. Subir el repositorio a GitHub

1. Crea un repositorio nuevo en [github.com/new](https://github.com/new). Con una cuenta
   gratuita de GitHub, Pages solo funciona en repositorios **públicos** (no pasa nada: el
   repositorio no contiene ningún dato del alumnado).
2. Entra en el repositorio → **Add file → Upload files**.
3. Arrastra **todo el contenido de esta carpeta** (sus archivos y carpetas, no la carpeta
   en sí) a la raíz del repositorio, de modo que `index.html` quede en la raíz.
   Son unos 125 archivos: si GitHub te limita a 100 por subida, hazlo en dos tandas
   (por ejemplo, primero `js/` y `editor/`, luego el resto). El archivo `.nojekyll` empieza
   por punto y el ordenador suele ocultarlo: si no se sube, no pasa nada grave.
4. Pulsa **Commit changes** y comprueba que se ven las carpetas `css/`, `js/`, `editor/`,
   `tools/`, `icons/` y `tutoria/`.

Con git, desde esta carpeta:

```bash
git init
git add .
git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

## 2. Activar GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Build and deployment → Source* elige **Deploy from a branch**; rama `main`,
   carpeta **/ (root)**. Guarda.
3. Espera uno o dos minutos. La dirección será
   `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.

> La aplicación **debe abrirse desde esa dirección**. Abierta con doble clic
> (`file://`) arranca, pero el navegador no deja cargar el editor de exámenes ni la
> Planificación temporal.

## 3. Instalarla como app

- **Chrome (ordenador o Android):** abre la dirección y pulsa el icono de instalar en la
  barra de direcciones (o menú ⋮ → *Instalar Cuaderno del profesor*).
- **iPad / iPhone:** debe hacerse desde **Safari**: Compartir → *Añadir a la pantalla de
  inicio*.

## 4. Funciona sin conexión

La primera vez que se abre **con internet**, el service worker (`sw.js`) guarda todos los
archivos (aplicación, editor, fuentes, planificador y Tutoría). Después se abre incluso en
modo avión. Solo las fuentes opcionales del examen marcadas «requiere conexión» necesitan
internet, y solo la primera vez que se usan.

Para que los gráficos y la vista previa de PDF de Tutoría también funcionen sin conexión,
sigue `tutoria/vendor/LEEME.txt` (en este repositorio ya vienen incluidas las librerías).

## 5. Actualizar la aplicación

1. Antes, en el dispositivo de trabajo: **Exportar copia** en la app.
2. Sube los archivos que cambien al repositorio, respetando las carpetas.
3. **Cambia `CACHE_NAME` en `sw.js`** (`'1'` → `'2'`, etc., en la línea
   `const CACHE_NAME = CACHE_PREFIJO + '1';`). Es imprescindible: es lo que avisa a los
   dispositivos de que hay versión nueva.
4. Abre la app con conexión. En unos segundos aparece abajo el aviso **«Hay una versión
   nueva · Actualizar»**: púlsalo y la app se recarga con la versión nueva. Si pulsas
   «Luego», seguirás con la versión anterior hasta que actualices.

Si has tocado el cálculo de notas, abre también `…/tests/calculo-notas.html` en el
navegador: todas las pruebas deben salir en verde.

Actualizar los archivos no toca tus datos: viven en el navegador, no en GitHub.

## Cosas importantes

- **Los datos no salen del dispositivo.** Se guardan en el almacenamiento del navegador
  (localStorage e IndexedDB), ligados a la dirección de GitHub Pages. Nadie más los ve.
- **Exporta copias de seguridad con regularidad.** La app avisa si llevas tiempo sin hacerlo.
  Si borras los datos del sitio o desinstalas la app sin copia, se pierden.
- **Cada navegador y cada dispositivo tienen sus propios datos.** Usa «Exportar/Importar
  copia» para pasarlos de uno a otro.
- El almacenamiento va ligado a tu usuario de GitHub (`TU-USUARIO.github.io`), no al
  repositorio. Por eso **la v2 y la v3 comparten los datos** si las usas en el mismo
  navegador: la v3 se abre con lo que ya tenías. No las tengas abiertas las dos a la vez
  (una podría sobrescribir lo que guarda la otra); cuando estés a gusto con la v3,
  desinstala la v2. Cambiar de usuario de GitHub sí cambia la dirección y el
  almacenamiento (haz copia antes).
- Tutoría puede copiar la lista de alumnado de un grupo del Cuaderno con el botón
  **📥 Del Cuaderno** de cada grupo (solo nombres y fechas de nacimiento).
