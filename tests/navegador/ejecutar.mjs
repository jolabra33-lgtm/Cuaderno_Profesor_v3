/* Ejecuta las pruebas de navegador: «npm test» (todas) o «npm test -- dos-ventanas suspensos» (solo esas).
   Arranca su propio servidor sobre la app y un Chromium sin ventana; no toca tus datos reales. */
import path from 'node:path';
import { chromium } from 'playwright';
import { servir } from './utilidades.mjs';
import { PRUEBAS } from './pruebas.mjs';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const filtro = process.argv.slice(2);
const elegidas = filtro.length ? PRUEBAS.filter(p => filtro.includes(p.nombre)) : PRUEBAS;
if (!elegidas.length) { console.log('No hay pruebas con ese nombre. Disponibles: ' + PRUEBAS.map(p => p.nombre).join(', ')); process.exit(2); }

const srv = await servir(RAIZ);
const navegador = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fallos = 0, comprobaciones = 0;
const inicio = Date.now();
for (const prueba of elegidas) {
  const contexto = await navegador.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const res = [];
  const t = { url: srv.url, contexto, navegador, ok: (cond, desc, detalle) => res.push({ cond: !!cond, desc, detalle }) };
  try { await prueba.fn(t); } catch (e) { res.push({ cond: false, desc: 'la prueba se ha interrumpido', detalle: e.message.split('\n')[0] }); }
  await contexto.close();
  const malas = res.filter(r => !r.cond);
  fallos += malas.length; comprobaciones += res.length;
  console.log(`${malas.length ? '✗' : '✓'} ${prueba.nombre} — ${prueba.descripcion}`);
  for (const r of res) if (!r.cond || filtro.length) console.log(`    ${r.cond ? '✓' : '✗'} ${r.desc}${!r.cond && r.detalle ? '\n        ' + String(r.detalle).slice(0, 400) : ''}`);
}
await navegador.close(); await srv.cerrar();
console.log(`\n${fallos ? '✗' : '✓'} ${comprobaciones - fallos} de ${comprobaciones} comprobaciones correctas en ${elegidas.length} pruebas (${Math.round((Date.now() - inicio) / 1000)} s)`);
process.exit(fallos ? 1 : 0);
