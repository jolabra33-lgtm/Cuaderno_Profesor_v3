/* Huella de la versión publicada (ver tests/README.md, «Versión de la caché»).

   Los dispositivos solo descargan una versión nueva cuando cambia CACHE_NAME en sw.js. Para que no dependa de
   acordarse, sw.js guarda además HUELLA: un resumen (SHA-256) de todos los archivos que se guardan para el uso
   sin conexión. Si cambia cualquier archivo, la huella calculada ya no coincide con la guardada:
     - «npm run sellar» sube CACHE_NAME y anota la huella nueva;
     - la prueba «version-cache» (npm test, y GitHub en cada subida) falla hasta que se haga. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TEXTO = new Set(['.js', '.mjs', '.css', '.html', '.json', '.txt', '.md']);

/* Archivos que sw.js guarda en la caché (APP_SHELL y OPTIONAL_ASSETS), sin las entradas de carpeta («./»). */
export function listaCache(raiz) {
  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  const bloque = n => { const m = sw.match(new RegExp('const ' + n + ' = \\[([\\s\\S]*?)\\];')); return m ? [...m[1].matchAll(/'\.\/([^']*)'/g)].map(x => x[1]) : []; };
  return [...bloque('APP_SHELL'), ...bloque('OPTIONAL_ASSETS')].filter(f => f && !f.endsWith('/'));
}

/* sw.js sin las dos líneas que cambian al sellar: su lógica también cuenta para la huella. */
function swSinSello(raiz) {
  return fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8').replace(/\r\n/g, '\n')
    .replace(/^const CACHE_NAME = .*$/m, '').replace(/^const HUELLA = .*$/m, '');
}

export function calcularHuella(raiz) {
  const h = crypto.createHash('sha256');
  for (const f of [...new Set(listaCache(raiz))].sort()) {
    const ruta = path.join(raiz, f);
    if (!fs.existsSync(ruta)) { h.update(f + '\0(falta)\0'); continue; }
    let datos = fs.readFileSync(ruta);
    // Los archivos de texto se comparan sin los saltos de línea de Windows, para que la huella sea la misma en cualquier equipo.
    if (TEXTO.has(path.extname(f).toLowerCase())) datos = Buffer.from(datos.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    h.update(f + '\0'); h.update(datos); h.update('\0');
  }
  h.update('sw.js\0' + swSinSello(raiz));
  return h.digest('hex').slice(0, 16);
}

export function selloActual(raiz) {
  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  const v = sw.match(/^const CACHE_NAME = CACHE_PREFIJO \+ '(\d+)';/m), h = sw.match(/^const HUELLA = '([0-9a-f]*)';/m);
  return { version: v ? Number(v[1]) : null, huella: h ? h[1] : null };
}

/* Sube la versión y anota la huella si los archivos han cambiado. Devuelve lo que ha hecho. */
export function sellar(raiz) {
  const antes = selloActual(raiz), nueva = calcularHuella(raiz);
  if (antes.version == null || antes.huella == null) throw new Error('sw.js no tiene las líneas CACHE_NAME y HUELLA con el formato esperado');
  if (antes.huella === nueva) return { cambiado: false, version: antes.version, huella: nueva };
  const ruta = path.join(raiz, 'sw.js');
  const sw = fs.readFileSync(ruta, 'utf8')
    .replace(/^const CACHE_NAME = CACHE_PREFIJO \+ '\d+';/m, `const CACHE_NAME = CACHE_PREFIJO + '${antes.version + 1}';`)
    .replace(/^const HUELLA = '[0-9a-f]*';/m, `const HUELLA = '${nueva}';`);
  fs.writeFileSync(ruta, sw);
  return { cambiado: true, version: antes.version + 1, huella: nueva };
}
