/* ============================================================================
   Formato común Cuaderno ↔ Tutoría
   js/comun/formato-tutoria.js — lo cargan el Cuaderno (index.html) y el Gestor
   de Tutoría (tutoria/index.html). Es el «contrato» entre las dos apps: si se
   cambia, se cambia aquí y las dos lo ven igual.
   ============================================================================

   Un PAQUETE es lo que el Cuaderno de un profesor/a manda a Tutoría sobre UN
   grupo y SU materia. Llega de dos formas:
     - como archivo «👥 Para la tutoría» (Resultados), de cualquier profesor/a;
     - en el mismo navegador, sin archivos: el Cuaderno deja una copia de los
       paquetes de todos sus grupos en una base IndexedDB PROPIA (FT_IDB), aparte
       de la de sus datos, para no competir nunca con su guardado; Tutoría la lee
       (solo lee: nunca escribe en nada del Cuaderno).

   {
     formato: 'cuaderno-a-tutoria', version: 2,
     materia, curso, grupo, profesor, generado (fecha ISO),
     regla: 'Nota de acta; suspenso = acta < 5',
     periodos: { 1: {desde, hasta} | null, 2: …, 3: … },   // fechas de cada evaluación (Ajustes del grupo)
     alumnos: [{
       id, nombre, apellidos, nombrePropio,
       notas:       { 1: n, 2: n, 3: n, final: n },          // nota de acta (ya en la versión 1)
       faltas:      { 1: {justificadas, injustificadas, retrasos}, 2: …, 3: …, curso: … },
       convivencia: { 1: {ac, rc, pa}, 2: …, 3: …, curso: … },  // AC, reconocimientos y partes
       comentarios: { 1: '', 2: '', 3: '', final: '' },      // comentario de evaluación
       // Solo en la copia del mismo navegador (no van en el archivo que se envía):
       fechaNacimiento, nese, repetidor, familia: [{parentesco, nombre, email}]
     }]
   }
   Las faltas y la convivencia de una evaluación solo van si esa evaluación tiene
   fechas en el Cuaderno; «curso» es todo lo registrado hasta la fecha.
   Un archivo de la versión 1 (solo notas) se sigue leyendo igual.
*/
const FT_FORMATO = 'cuaderno-a-tutoria';
const FT_VERSION = 2;
const FT_IDB = 'cuaderno-para-tutoria';  // base propia (no la de los datos del Cuaderno)
const FT_IDB_ALMACEN = 'paquetes';
const FT_IDB_CLAVE = 'ultima';          // {generado, paquetes: […]}
const FT_PERIODOS = ['1', '2', '3'];
const FT_NOMBRE_PERIODO = { 1: 'I Evaluación', 2: 'II Evaluación', 3: 'III Evaluación', final: 'Final', curso: 'Curso' };

function ftEsPaquete(o) {
  return !!(o && typeof o === 'object' && o.formato === FT_FORMATO && Array.isArray(o.alumnos));
}

/* Copia limpia de un paquete (de un archivo que puede venir de cualquier sitio):
   solo los campos conocidos, textos acotados, números válidos. Devuelve null si no es un paquete. */
function ftNormalizarPaquete(o) {
  if (!ftEsPaquete(o)) return null;
  const txt = (v, max) => String(v == null ? '' : v).slice(0, max || 300).trim();
  const nota = v => { const n = Number(v); return (v !== null && v !== '' && isFinite(n) && n >= 0 && n <= 10) ? n : undefined; };
  const cuenta = v => { const n = Math.round(Number(v)); return isFinite(n) && n > 0 ? Math.min(n, 9999) : 0; };
  const fecha = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
  const porPeriodo = (src, claves, fn) => {
    const out = {};
    if (src && typeof src === 'object') claves.forEach(k => { if (src[k] != null) { const v = fn(src[k]); if (v !== undefined && v !== null) out[k] = v; } });
    return out;
  };
  const faltas = f => (f && typeof f === 'object') ? { justificadas: cuenta(f.justificadas), injustificadas: cuenta(f.injustificadas), retrasos: cuenta(f.retrasos) } : undefined;
  const conv = c => (c && typeof c === 'object') ? { ac: cuenta(c.ac), rc: cuenta(c.rc), pa: cuenta(c.pa) } : undefined;
  const periodos = {};
  FT_PERIODOS.forEach(k => {
    const p = o.periodos && o.periodos[k];
    periodos[k] = (p && fecha(p.desde) && fecha(p.hasta)) ? { desde: fecha(p.desde), hasta: fecha(p.hasta) } : null;
  });
  const alumnos = o.alumnos.filter(a => a && typeof a === 'object' && txt(a.nombre)).slice(0, 500).map(a => {
    const al = {
      id: a.id == null ? null : txt(a.id, 80),
      nombre: txt(a.nombre), apellidos: txt(a.apellidos), nombrePropio: txt(a.nombrePropio),
      notas: porPeriodo(a.notas, [...FT_PERIODOS, 'final'], nota),
      faltas: porPeriodo(a.faltas, [...FT_PERIODOS, 'curso'], faltas),
      convivencia: porPeriodo(a.convivencia, [...FT_PERIODOS, 'curso'], conv),
      comentarios: porPeriodo(a.comentarios, [...FT_PERIODOS, 'final'], c => txt(c, 4000) || undefined),
    };
    if (a.fechaNacimiento !== undefined) al.fechaNacimiento = fecha(a.fechaNacimiento);
    if (a.nese !== undefined) al.nese = !!a.nese;
    if (a.repetidor !== undefined) al.repetidor = !!a.repetidor;
    if (Array.isArray(a.familia)) {
      al.familia = a.familia.slice(0, 4).map(f => ({ parentesco: txt(f && f.parentesco, 60), nombre: txt(f && f.nombre, 120), email: txt(f && f.email, 160) }))
        .filter(f => f.nombre || f.email);
    }
    return al;
  });
  return {
    formato: FT_FORMATO, version: Number(o.version) || 1,
    materia: txt(o.materia, 120), curso: txt(o.curso, 60), grupo: txt(o.grupo, 80),
    profesor: txt(o.profesor, 120), generado: txt(o.generado, 40), periodos, alumnos,
  };
}

/* Nombre de una persona en formato «Apellidos, Nombre», como se escriben en las actas.
   Si ya lleva coma, solo se ordenan los espacios. Si no, se toma la PRIMERA palabra como
   nombre («Ana López Martín» → «López Martín, Ana»): con nombres compuestos («Ana María…»)
   hay que retocarlo a mano. Una sola palabra se deja como está. */
function ftApellidosNombre(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.includes(',')) {
    const [ap, ...resto] = t.split(',');
    const nom = resto.join(',').trim();
    return nom ? `${ap.trim()}, ${nom}` : ap.trim();
  }
  const p = t.split(' ');
  if (p.length < 2) return t;
  return `${p.slice(1).join(' ')}, ${p[0]}`;
}
function ftTieneFormatoApellidos(s) { return String(s || '').includes(','); }

/* ---------------------------------------------------------------------------
   FICHA DEL GRUPO (de Tutoría al Cuaderno del profesorado)
   La genera el tutor/a desde la sesión de evaluación de Tutoría; cada profesor/a
   la carga en su Cuaderno (Resultados → «📥 De la tutoría»). Lleva solo lo que el
   equipo docente necesita para su materia, nunca contactos ni entrevistas:
   {
     formato: 'tutoria-a-cuaderno', version: 1,
     nivel, grupo, tutor, evaluacion ('1'|'2'|'3'), fechaSesion, generado,
     acuerdosGrupo, valoracion,
     alumnos: [{
       idsCuaderno: [...], nombre, nese, recursosNese: [...], repetidor, compensatoria,
       pap, enriquecimiento, pendientesAnteriores: ['Matemáticas (1º ESO)', ...],
       propuesta: {tipo, destino}, acuerdos
     }]
   }
   --------------------------------------------------------------------------- */
const FT_FORMATO_FICHA = 'tutoria-a-cuaderno';
const FT_VERSION_FICHA = 1;
function ftNormalizarFichaGrupo(o) {
  if (!o || typeof o !== 'object' || o.formato !== FT_FORMATO_FICHA || !Array.isArray(o.alumnos)) return null;
  const txt = (v, max) => String(v == null ? '' : v).slice(0, max || 300).trim();
  const lista = (v, max) => (Array.isArray(v) ? v : []).slice(0, 40).map(x => txt(x, max || 160)).filter(Boolean);
  return {
    formato: FT_FORMATO_FICHA, version: Number(o.version) || 1,
    nivel: txt(o.nivel, 60), grupo: txt(o.grupo, 60), tutor: txt(o.tutor, 120),
    evaluacion: ['1', '2', '3'].includes(String(o.evaluacion)) ? String(o.evaluacion) : '',
    fechaSesion: /^\d{4}-\d{2}-\d{2}$/.test(String(o.fechaSesion || '')) ? String(o.fechaSesion) : '',
    generado: txt(o.generado, 40),
    acuerdosGrupo: txt(o.acuerdosGrupo, 6000), valoracion: txt(o.valoracion, 6000),
    alumnos: o.alumnos.filter(a => a && typeof a === 'object' && txt(a.nombre)).slice(0, 500).map(a => ({
      idsCuaderno: lista(a.idsCuaderno, 80), nombre: txt(a.nombre),
      nese: !!a.nese, recursosNese: lista(a.recursosNese, 40), repetidor: !!a.repetidor, compensatoria: !!a.compensatoria,
      pap: !!a.pap, enriquecimiento: !!a.enriquecimiento, pendientesAnteriores: lista(a.pendientesAnteriores),
      propuesta: { tipo: txt(a.propuesta && a.propuesta.tipo, 60), destino: txt(a.propuesta && a.propuesta.destino, 80) },
      acuerdos: txt(a.acuerdos, 4000),
    })),
  };
}
const FT_NOMBRE_EVAL = { 1: 'I Evaluación', 2: 'II Evaluación', 3: 'Evaluación final' };
