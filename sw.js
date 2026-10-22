// sw.js — hace que la suite funcione sin conexión.
//
// Cómo funciona: la PRIMERA vez que se abre con wifi/datos, este Service Worker
// guarda en una caché local todos los archivos de la app. A partir de ese
// momento cada archivo se sirve desde esa caché, así que funciona sin conexión
// y siempre con archivos de la MISMA versión (nunca mezcla viejos y nuevos).
//
// Actualizar: si cambias CUALQUIER archivo de la app, cambia también el
// CACHE_NAME de abajo (cuaderno-v3-1 -> cuaderno-v3-2, etc.). Así el navegador
// detecta que hay versión nueva, la descarga entera en segundo plano y la app
// muestra el aviso «Hay una versión nueva · Actualizar» (ver js/registro-sw.js).
// La versión nueva solo se activa cuando se pulsa «Actualizar».
//
// Las cachés de esta versión empiezan por CACHE_PREFIJO. Al activarse solo se
// borran las cachés antiguas con ese prefijo: así no se estropea la caché de
// otra versión de la app publicada en la misma cuenta de GitHub (por ejemplo,
// Cuaderno_Profesor_v2), que comparte el mismo almacenamiento del navegador.

const CACHE_PREFIJO = 'cuaderno-v3-';
const CACHE_NAME = CACHE_PREFIJO + '2';

// El "esqueleto" de las dos apps: HTML, manifest e iconos.
const APP_SHELL = [
  './',
  './index.html',
  './css/app.css',
  './tools/planificacion.html',
  './js/00-preferencias-ui.js',
  './js/datos/competencias.js',
  './js/datos/catalogos-curriculares.js',
  './js/datos/modelos-nese-refuerzo.js',
  './js/nucleo/utilidades.js',
  './js/nucleo/plantillas-materias.js',
  './js/nucleo/modelo-datos.js',
  './js/nucleo/estado-migraciones.js',
  './js/nucleo/guardado-copias.js',
  './js/nucleo/cifrado.js',
  './js/curriculo/catalogos-importador.js',
  './js/evaluacion/calculo-notas.js',
  './js/ui/barra-superior.js',
  './js/inicio/cronometro.js',
  './js/inicio/calendario.js',
  './js/inicio/reuniones.js',
  './js/alumnado/plan-refuerzo.js',
  './js/alumnado/plan-repeticion.js',
  './js/alumnado/alumnos-nese.js',
  './js/inicio/horario.js',
  './js/inicio/alertas-home.js',
  './js/ui/grupo-y-copias.js',
  './js/alumnado/plano-aula.js',
  './js/alumnado/ficha-familia.js',
  './js/evaluacion/actividades.js',
  './js/evaluacion/calificar.js',
  './js/resultados/informe-detallado.js',
  './js/resultados/resultados.js',
  './js/resultados/cobertura-diagnostico.js',
  './js/clase/asistencia.js',
  './js/clase/convivencia.js',
  './js/clase/familias.js',
  './js/clase/diario.js',
  './js/programacion/programacion-aula.js',
  './js/programacion/actividades-y-texto-rico.js',
  './js/programacion/detalle-imprimir.js',
  './js/programacion/planificacion-temporal.js',
  './js/memoria/memoria-curso.js',
  './js/ajustes/ajustes-grupo.js',
  './js/informes/exportaciones.js',
  './js/informes/impresion.js',
  './js/informes/informe-final.js',
  './js/resumen/resumen-grupo.js',
  './js/corrector/motor-rubricas.js',
  './js/corrector/programacion-corrector.js',
  './js/corrector/navegacion-lista-crear.js',
  './js/corrector/editor-rubrica.js',
  './js/corrector/corregir.js',
  './js/ui/buscador.js',
  './js/ui/bienvenida.js',
  './js/ui/render-accesibilidad.js',
  './js/corrector/editor-examenes.js',
  './js/99-arranque.js',
  './js/registro-sw.js',
  './editor/index.html',
  './editor/css/editor.css',
  './editor/css/fuentes.css',
  './editor/js/01-nucleo.js',
  './editor/js/02-maquetacion.js',
  './editor/js/03-interfaz-arbol.js',
  './editor/js/04-inspector.js',
  './editor/js/05-dialogos.js',
  './editor/js/06-exportacion-docx.js',
  './editor/js/07-archivos-y-calidad.js',
  './editor/js/08-arranque.js',
  './editor/js/puente-cuaderno.js',
  './editor/fonts/inter-400.woff',
  './editor/fonts/inter-400i.woff',
  './editor/fonts/inter-700.woff',
  './editor/fonts/inter-700i.woff',
  './editor/fonts/lora-400.woff',
  './editor/fonts/lora-400i.woff',
  './editor/fonts/lora-700.woff',
  './editor/fonts/lora-700i.woff',
  './guia_mejorada.html',
  './manifest.json',
  './icons/icon-32.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './tutoria/',
  './tutoria/index.html',
  './tutoria/css/asistencia.css',
  './tutoria/css/tutoria.css',
  './tutoria/js/01-avisos-y-vista-documentos.js',
  './tutoria/js/02-datos.js',
  './tutoria/js/03-tabla.js',
  './tutoria/js/04-acciones-nese-pap.js',
  './tutoria/js/05-alumnado-importar-exportar.js',
  './tutoria/js/06-materias.js',
  './tutoria/js/07-actas.js',
  './tutoria/js/08-grupos-niveles-vacantes.js',
  './tutoria/js/09-informes-promocion.js',
  './tutoria/js/10-notas-y-mover-alumnado.js',
  './tutoria/js/11-acta-oficial-y-seguimiento.js',
  './tutoria/js/12-calendario-y-convivencia.js',
  './tutoria/js/13-panel-direccion.js',
  './tutoria/js/14-inicio-y-curso.js',
  './tutoria/js/15-guardado-y-archivos.js',
  './tutoria/js/16-foto-y-horario.js',
  './tutoria/js/17-historial.js',
  './tutoria/js/18-plano-del-grupo.js',
  './tutoria/js/19-seguimiento.js',
  './tutoria/js/20-equipo-docente.js',
  './tutoria/js/21-asistencia.js',
  './tutoria/js/22-importar-del-cuaderno.js',
  './tutoria/manifest.json',
  './tutoria/icon-192.png',
  './tutoria/icon-512.png'
];

// Librerías vendorizadas que Tutoría necesita para los gráficos y la vista
// previa de PDF (ver tutoria/vendor/LEEME.txt). Son opcionales: si no las
// has descargado, simplemente no se cachean y esas dos funciones concretas
// no estarán disponibles sin conexión (el resto de la app sí).
const OPTIONAL_ASSETS = [
  './tutoria/vendor/chart.umd.min.js',
  './tutoria/vendor/pdf.min.js',
  './tutoria/vendor/pdf.worker.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await Promise.all(OPTIONAL_ASSETS.map(async url => {
      try {
        const resp = await fetch(url);
        if (resp && resp.status === 200) await cache.put(url, resp);
      } catch (e) { /* no está descargado; no pasa nada */ }
    }));
    // No se llama a skipWaiting() aquí: si ya hay una versión funcionando, la
    // nueva espera a que el usuario pulse «Actualizar» (mensaje de abajo).
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.tipo === 'ACTIVAR_VERSION_NUEVA') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIJO) && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Las páginas se buscan sin la parte «?…» de la dirección.
    const cached = await cache.match(event.request,
      { ignoreSearch: event.request.mode === 'navigate' });
    // Lo que ya está en la caché se sirve tal cual: pertenece a esta versión.
    // Las versiones nuevas llegan enteras al cambiar CACHE_NAME, no archivo a archivo.
    if (cached) return cached;
    try {
      const resp = await fetch(event.request);
      // Lo que no venía en la lista (p. ej. fuentes opcionales del editor) se guarda al usarlo.
      if (resp && (resp.status === 200 || resp.type === 'opaque')) {
        cache.put(event.request, resp.clone());
      }
      return resp;
    } catch (e) {
      return new Response('Sin conexión y todavía no hay una copia guardada de este archivo.', {
        status: 503, statusText: 'Offline'
      });
    }
  })());
});
