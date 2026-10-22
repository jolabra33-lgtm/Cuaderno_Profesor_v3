/* Utilidades comunes de las pruebas de navegador (ver tests/README.md). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.woff':'font/woff', '.txt':'text/plain; charset=utf-8' };

/* Servidor estático mínimo (como GitHub Pages) sobre la carpeta indicada. */
export function servir(carpeta) {
  return new Promise(ok => {
    const srv = http.createServer((req, res) => {
      let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (ruta.endsWith('/')) ruta += 'index.html';
      const archivo = path.join(carpeta, ruta);
      if (!archivo.startsWith(carpeta) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); res.end('No existe'); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(archivo).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}`, cerrar: () => new Promise(r => srv.close(r)) }));
  });
}

/* Página nueva que apunta los errores de JavaScript y acepta los diálogos nativos. */
export async function nuevaPagina(ctx) {
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', e => p.errores.push(e.message));
  p.on('dialog', d => d.accept());
  return p;
}
export const esperar = ms => new Promise(r => setTimeout(r, ms));

/* Cuaderno con un grupo de prueba ya creado (devuelve los ids de los alumnos). */
export async function cuadernoConGrupo(p, url, { nombres = ['García López, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria'] } = {}) {
  await p.goto(url + '/'); await esperar(1500);
  return p.evaluate(nombres => {
    _mostrarBienvenida = false;
    const g = defGrupo('1º ESO A', 'GeH_1ESO');
    g.alumnos = nombres.map(n => normalizarAlumno({ id: uid(), nombre: n }));
    state.grupos = [g]; state.ui.grupoId = g.id; state.ui.trim = 0; save();
    return g.alumnos.map(a => a.id);
  }, nombres);
}

/* Tutoría con alumnado en un grupo. */
export async function tutoriaConAlumnos(p, url, nivel, grupo, nombres) {
  await p.goto(url + '/tutoria/'); await esperar(1500);
  await p.evaluate(({ nivel, grupo, nombres }) => {
    if (!(GRUPOS_POR_NIVEL[nivel] || []).includes(grupo)) {
      openAddGrupoModal(); document.getElementById('addGrupoNivel').value = nivel; document.getElementById('addGrupoLetra').value = grupo; confirmAddGrupo();
    }
    selectNivel(nivel); currentGrupos[nivel] = grupo; renderMain();
    nombres.forEach(n => { openAddAlumno(); document.getElementById('mNombre').value = n; addAlumno(); });
  }, { nivel, grupo, nombres });
  await esperar(1200);   // autoguardado de Tutoría (800 ms)
}
