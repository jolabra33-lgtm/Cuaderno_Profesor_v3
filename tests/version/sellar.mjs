/* «npm run sellar»: si ha cambiado algún archivo de la app, sube CACHE_NAME en sw.js y anota la huella nueva.
   Hazlo antes de subir cambios: es lo que avisa a los dispositivos de que hay versión nueva. */
import path from 'node:path';
import { sellar } from './huella.mjs';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const r = sellar(RAIZ);
console.log(r.cambiado
  ? `✓ Versión de la caché: ${r.version} (huella ${r.huella}). Sube sw.js junto con tus cambios.`
  : `✓ Nada que sellar: los archivos no han cambiado desde la versión ${r.version}.`);
