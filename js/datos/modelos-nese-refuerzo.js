/* ============================================================================
   Cuaderno del profesor · Constantes de NESE, refuerzo y repetición (modelos, leyendas, medidas)
   js/datos/modelos-nese-refuerzo.js
   ============================================================================ */

const TIPOS=["Actividad diaria de clase","Actividad para casa","Exposición oral","Trabajo / proyecto","Comentario de fuentes","Actitud y hábitos de trabajo","Prueba objetiva / examen"];
const ESCALA=[{etq:"Realizada con éxito",v:10},{etq:"Realizada",v:7.5},{etq:"Incompleta",v:5},{etq:"No realizada",v:0}];
const TRIMESTRES=["1ª evaluación","2ª evaluación","3ª evaluación"];
const NIVELES_NESE=["1º de Primaria","2º de Primaria","3º de Primaria","4º de Primaria","5º de Primaria","6º de Primaria","1º de ESO","2º de ESO","3º de ESO","4º de ESO","Altas Capacidades"];
/* Plantillas de seguimiento NESE (3 modelos por ciclo de Primaria), Bloque 3 del
   currículum de Conocimiento del Medio (Decreto 106/2022, Anexo III), acordadas
   con el usuario. Cada modelo se copia al crear un plan para un alumno/a. */
const NESE_MODELOS={
  "1":[
    { titulo:"Bloque 3.1 — Retos del mundo actual (transversal)", filas:[
      { saber:"Estrategias para la emisión de opiniones sencillas", criterio:"Expresar una opinión sencilla sobre una situación cercana, con apoyo de una pauta", ce:"Transversal", cc:"CCL, CPSAA" },
      { saber:"Conjeturas y planificación de tareas sencillas", criterio:"Anticipar, con ayuda, los pasos de una tarea sencilla antes de realizarla", ce:"Transversal", cc:"CPSAA, CE" },
      { saber:"Noción de desigualdad", criterio:"Reconocer una situación sencilla de desigualdad en su entorno cercano y nombrarla", ce:"Transversal", cc:"CC, CPSAA" },
    ]},
    { titulo:"Bloque 3.2 — Sociedades en el tiempo (CE6, CE8)", filas:[
      { saber:"Uso del tiempo y de las formas convencionales para medirlo", criterio:"Utilizar, con apoyo, las unidades de tiempo básicas (día, semana, mes, año) para ordenar hechos cercanos", ce:"CE6", cc:"CCL, CMCT" },
      { saber:"Nociones básicas de tiempo y unidades de medida", criterio:"Ordenar dos o tres hechos de su propia vida según el orden en que sucedieron", ce:"CE6", cc:"CCL, CMCT" },
      { saber:"Nociones de causa, consecuencia y empatía", criterio:"Explicar, de forma sencilla, por qué ha ocurrido algo y cómo se siente alguien afectado por ello", ce:"CE6", cc:"CPSAA, CC" },
      { saber:"Identificación del patrimonio material como elemento del municipio", criterio:"Reconocer y nombrar un elemento destacado del patrimonio de su municipio", ce:"CE8", cc:"CCEC" },
      { saber:"Propuestas de cuidado del patrimonio a pequeña escala", criterio:"Proponer, con ayuda, una acción sencilla de cuidado de un elemento patrimonial cercano", ce:"CE8", cc:"CC, CCEC" },
      { saber:"Biografía de personajes relevantes desde una perspectiva coeducativa", criterio:"Conocer y explicar, de forma sencilla, algún dato de una persona relevante de la historia, con ejemplos femeninos y masculinos", ce:"CE6", cc:"CCL, CCEC" },
    ]},
    { titulo:"Bloque 3.3 — Alfabetización cívica (CE7)", filas:[
      { saber:"La familia y la relación entre sus miembros: responsabilidades domésticas", criterio:"Identificar y asumir una responsabilidad doméstica sencilla y explicar para qué sirve", ce:"CE7", cc:"CPSAA, CC" },
      { saber:"Identificación y uso de los equipamientos básicos del entorno social (educativos, sanitarios, culturales)", criterio:"Reconocer y nombrar los equipamientos básicos de su entorno cercano y para qué se usan", ce:"CE7", cc:"CC" },
      { saber:"Seguridad vial; la ciudad como espacio de convivencia; normas de circulación básicas", criterio:"Reconocer y respetar una norma básica de seguridad vial o de convivencia en la calle", ce:"CE7", cc:"CC" },
    ]},
    { titulo:"Bloque 3.4 — Conciencia ecosocial (CE5)", filas:[
      { saber:"Uso de planos y mapas sencillos; la Tierra en planos y mapas sencillos", criterio:"Localizar un elemento conocido (su casa, el colegio) en un plano muy sencillo, con ayuda", ce:"CE5", cc:"CMCT" },
      { saber:"El cambio estacional", criterio:"Reconocer y nombrar la estación del año en curso y alguna característica sencilla", ce:"CE5", cc:"CMCT" },
      { saber:"El tiempo y el clima: características y diferencias", criterio:"Diferenciar, con ejemplos, si hace sol, lluvia o viento en un momento dado", ce:"CE5", cc:"CMCT" },
      { saber:"La Tierra en su concepto geológico y geográfico", criterio:"Reconocer que vivimos en un planeta llamado Tierra e identificar tierra y agua en una imagen sencilla", ce:"CE5", cc:"CMCT" },
      { saber:"El uso responsable del agua como recurso escaso", criterio:"Reconocer y practicar, con recordatorio, un hábito sencillo de ahorro de agua", ce:"CE5", cc:"CC, CPSAA" },
    ]},
  ],
  "2":[
    { titulo:"Bloque 3.1 — Retos del mundo actual (transversal)", filas:[
      { saber:"Estrategias para la emisión de opiniones sencillas a partir de una información dada", criterio:"Emitir una opinión razonada, sencilla, a partir de una información que se le facilita", ce:"Transversal", cc:"CCL, CPSAA" },
      { saber:"Aceptación de otros puntos de vista, asunción de diversos roles, aportación de ideas propias constructivas", criterio:"Participar en un trabajo en equipo aceptando otros puntos de vista y aportando ideas propias", ce:"Transversal", cc:"CPSAA, CC" },
      { saber:"Noción de desigualdad social y conflicto social", criterio:"Identificar una situación de desigualdad o conflicto social sencilla y describir sus consecuencias", ce:"Transversal", cc:"CC" },
      { saber:"Noción de diversidad cultural", criterio:"Reconocer y valorar una manifestación de diversidad cultural en su entorno", ce:"Transversal", cc:"CC, CCEC" },
    ]},
    { titulo:"Bloque 3.2 — Sociedades en el tiempo (CE6, CE8)", filas:[
      { saber:"Cronología histórica: periodos y grandes edades de la Historia; unidades de medida (década, siglo)", criterio:"6.1. Reconocer y utilizar las unidades de tiempo, década y siglo, para situar y ordenar cronológicamente hechos relevantes del pasado", ce:"CE6", cc:"CCL, CMCT" },
      { saber:"Ordenación cronológica de hechos sociales y personas relevantes de la historia reciente, con perspectiva de género", criterio:"6.2. Ordenar cronológicamente hechos sociales y personas relevantes de la historia reciente utilizando herramientas básicas de medida de tiempo e incorporando la perspectiva de género", ce:"CE6", cc:"CCL, CC, CCEC" },
      { saber:"Hechos especialmente relevantes de la historia de la Comunidad Valenciana", criterio:"6.3. Ordenar temporal y espacialmente algunos hechos especialmente relevantes de la historia de la Comunidad Valenciana", ce:"CE6", cc:"CCL, CMCT" },
      { saber:"Reconocimiento de las características de las sociedades prehistóricas y de la Antigüedad", criterio:"6.4. Describir algunas formas de vida representativas de los grandes periodos históricos hasta la Edad Antigua", ce:"CE6", cc:"CCL, CCEC" },
      { saber:"Conocimiento de la cultura griega y la romanización", criterio:"6.5. Explicar y comparar las características principales de los diferentes periodos históricos hasta la Edad Antigua", ce:"CE6", cc:"CCL, CCEC" },
      { saber:"Reconocimiento de las mujeres como sujetos individuales o colectivos de la historia y su aportación al patrimonio", criterio:"8.1. Identificar y valorar algunos elementos destacados del patrimonio natural, histórico y cultural de la Comunidad Valenciana y describir sus características más destacadas", ce:"CE8", cc:"CC, CCEC" },
      { saber:"Reconocimiento de otros tipos de patrimonio (inmaterial) y localización de expresiones culturales e históricas próximas", criterio:"8.2. Desarrollar conductas de respeto, cuidado y mantenimiento del patrimonio natural, histórico y cultural del municipio y de la Comunidad Valenciana y proponer acciones para su conservación y difusión", ce:"CE8", cc:"CC, CCEC" },
      { saber:"Nociones de causa, consecuencia, empatía y simultaneidad e interpretación histórica", criterio:"Establecer relaciones sencillas de causa-consecuencia entre dos hechos históricos próximos", ce:"CE6", cc:"CPSAA, CC" },
    ]},
    { titulo:"Bloque 3.3 — Alfabetización cívica (CE7)", filas:[
      { saber:"Economía doméstica: dinero, gastos e ingresos, ahorro, cuenta bancaria, tarjeta de crédito", criterio:"Aplicar nociones básicas de economía doméstica a un supuesto sencillo (gastos, ingresos, ahorro)", ce:"CE7", cc:"CMCT, CE" },
      { saber:"Reconocimiento de la organización social, política y territorial: las Comunidades Autónomas y España", criterio:"7.2. Distinguir las características y funcionamiento de la estructura política y territorial de su municipio, la provincia y la Comunidad Valenciana", ce:"CE7", cc:"CC" },
      { saber:"Identificación de los órganos de gobierno del municipio, la provincia y la Comunitat Valenciana", criterio:"7.1. Identificar los principales órganos de gobierno del municipio, de la provincia y de la Comunitat Valenciana e identificar su función y responsabilidad en la mejora de la vida de las personas y de la convivencia social", ce:"CE7", cc:"CC, CCL" },
      { saber:"Características del sector privado y del sector público; organización de la Administración Pública a través de la Generalitat", criterio:"7.3. Conocer las funciones de la administración del municipio, destacando la importancia y el valor de las mismas para la ciudadanía y la participación ciudadana", ce:"CE7", cc:"CC" },
      { saber:"Medio urbano y rural de la Comunidad Valenciana", criterio:"Diferenciar, con ejemplos propios, el medio urbano y el medio rural", ce:"CE7", cc:"CMCT, CC" },
      { saber:"Distribución de la población: natalidad y mortalidad, movimientos migratorios y riesgos naturales", criterio:"Identificar y describir algunos factores demográficos relevantes de la comunidad de la que forma parte (natalidad, mortalidad, movimientos migratorios)", ce:"CE7", cc:"CMCT, CC" },
    ]},
    { titulo:"Bloque 3.4 — Conciencia ecosocial (CE5)", filas:[
      { saber:"Representación cartográfica", criterio:"Utilizar un plano o mapa sencillo para localizar y describir un elemento del entorno", ce:"CE5", cc:"CMCT" },
      { saber:"Factores climáticos", criterio:"5.1. Relacionar las acciones que realizan las personas en la vida cotidiana y el medio en el que viven, teniendo en cuenta los factores naturales y sociales", ce:"CE5", cc:"CMCT, CC" },
      { saber:"El cambio climático: toma de conciencia del impacto en el entorno", criterio:"5.2. Argumentar las ventajas y los inconvenientes de una actuación humana relevante y significativa con un fuerte impacto en el medio ambiente y el paisaje próximo", ce:"CE5", cc:"CC, CE" },
      { saber:"El Sistema Solar", criterio:"Describir, de forma sencilla, la posición de la Tierra en el Sistema Solar", ce:"CE5", cc:"CMCT" },
      { saber:"Elementos básicos del relieve; elementos del relieve a nivel local y nacional", criterio:"Identificar y nombrar los elementos básicos del relieve de su entorno próximo", ce:"CE5", cc:"CMCT" },
      { saber:"Conservación y cuidado de los elementos paisajísticos del entorno", criterio:"5.3. Participar activamente en la elaboración y formulación de propuestas de actuación orientadas a la solución de problemas ecológicos presentes en el entorno próximo", ce:"CE5", cc:"CC, CE" },
      { saber:"El uso responsable del agua como recurso escaso y su conservación", criterio:"5.5. Identificar las acciones propias realizadas diariamente en beneficio del consumo responsable de materiales escolares, alimentos, agua y electricidad", ce:"CE5", cc:"CC, CPSAA" },
    ]},
  ],
  "3":[
    { titulo:"Bloque 3.1 — Retos del mundo actual (transversal)", filas:[
      { saber:"Estrategias para la emisión de opiniones y juicios de valor a partir de diferentes tipos de fuentes", criterio:"Emitir un juicio de valor razonado a partir de dos o más fuentes de información distintas", ce:"Transversal", cc:"CCL, CPSAA" },
      { saber:"Uso de fuentes diversas (primarias y secundarias): textos, fotografías, mapas, obras de arte, edificios históricos, documentos audiovisuales", criterio:"Seleccionar y contrastar información procedente de al menos dos tipos de fuentes distintas sobre un mismo hecho", ce:"Transversal", cc:"CCL, CD" },
      { saber:"Adquisición de habilidades para la expresión de conclusiones a través de textos expositivos y elementos gráficos", criterio:"Presentar una conclusión sencilla combinando texto y un elemento gráfico (esquema, línea del tiempo, mapa)", ce:"Transversal", cc:"CCL, CCEC" },
      { saber:"Noción de derechos y libertades; noción de obligaciones", criterio:"Explicar, con ejemplos, la relación entre un derecho y una obligación correspondiente", ce:"Transversal", cc:"CC" },
    ]},
    { titulo:"Bloque 3.2 — Sociedades en el tiempo (CE6, CE8)", filas:[
      { saber:"Unidades de tiempo: década, lustro, siglo y milenio", criterio:"6.1. Reconocer y utilizar las unidades de tiempo, década, lustro, siglo y milenio, para situar y ordenar cronológicamente hechos relevantes del pasado", ce:"CE6", cc:"CCL, CMCT" },
      { saber:"Hechos sociales y personas relevantes de la historia de la Comunidad Valenciana y de España, con perspectiva de género", criterio:"6.2. Situar espacial y temporalmente los hechos sociales y personas relevantes de la historia de la Comunidad Valenciana y de España mostrando su interrelación e incorporando la perspectiva de género", ce:"CE6", cc:"CCL, CC, CCEC" },
      { saber:"Sociedades y culturas de la Época Medieval y Moderna", criterio:"6.3. Situar y ordenar cronológicamente los cambios de mayor relevancia en la humanidad, desde la Edad Media hasta la actualidad", ce:"CE6", cc:"CCL, CMCT" },
      { saber:"La sociedad del antiguo régimen y la revolución liberal; cambios sociales y económicos en España", criterio:"6.4. Describir la evolución de algunas formas de vida representativas desde la Edad Media hasta la actualidad", ce:"CE6", cc:"CCL, CCEC" },
      { saber:"Aproximación a la historia reciente (Guerra Civil, dictadura y transición) y a la memoria democrática", criterio:"6.5. Identificar y analizar relaciones de causalidad, simultaneidad y sucesión entre elementos destacados del medio social y cultural desde la Edad Media hasta la actualidad", ce:"CE6", cc:"CPSAA, CC" },
      { saber:"Tipología, papel social y cultural del patrimonio; elementos patrimoniales aplicando nociones temporales básicas", criterio:"8.1. Identificar y valorar algunos elementos destacados del patrimonio natural, histórico y cultural de España y describir sus características más destacadas, incluyendo su localización geográfica y su origen histórico", ce:"CE8", cc:"CC, CCEC" },
      { saber:"Emisión de juicios de valor sobre el origen del patrimonio y su relación con los acontecimientos históricos", criterio:"8.2. Desarrollar conductas de respeto, cuidado y mantenimiento del patrimonio natural, histórico y cultural de España y proponer acciones para su conservación y difusión", ce:"CE8", cc:"CC, CCEC" },
      { saber:"Noción de cambio, continuidad, simultaneidad, duración y evidencia", criterio:"Justificar si dos hechos históricos son simultáneos o sucesivos, aportando evidencias", ce:"CE6", cc:"CPSAA" },
    ]},
    { titulo:"Bloque 3.3 — Alfabetización cívica (CE7)", filas:[
      { saber:"La Constitución Española; identificación de la organización social de España", criterio:"Explicar, de forma sencilla, qué es la Constitución Española y su papel como norma fundamental", ce:"CE7", cc:"CC, CCL" },
      { saber:"Instituciones de gobierno municipales, autonómicas y estatales; aproximación a la Unión Europea", criterio:"7.1. Identificar y describir los elementos, estructura y funciones de los principales órganos de gobierno del municipio, la provincia, la Comunidad Valenciana, España y la Unión Europea", ce:"CE7", cc:"CC, CCL" },
      { saber:"Reconocimiento de la organización política y territorial de España", criterio:"7.2. Distinguir las características y funcionamiento de la estructura política y territorial del municipio, la Comunidad Valenciana, España y la Unión Europea", ce:"CE7", cc:"CC" },
      { saber:"La monarquía parlamentaria; diferenciación entre regímenes democráticos y autoritarios", criterio:"7.3. Distinguir las funciones de la administración del municipio y de la Comunidad Valenciana, destacando la importancia y el valor de las mismas para la ciudadanía, la participación ciudadana y el desarrollo de los principios del funcionamiento democrático", ce:"CE7", cc:"CC" },
      { saber:"Movimientos migratorios en la Comunidad Valenciana, España y Europa", criterio:"Explicar una causa y una consecuencia de un movimiento migratorio estudiado", ce:"CE7", cc:"CC, CPSAA" },
      { saber:"Identificación de las características demográficas de países desarrollados y subdesarrollados", criterio:"Comparar una característica demográfica entre dos países con distinto nivel de desarrollo", ce:"CE7", cc:"CMCT, CC" },
      { saber:"Reconocimiento y respeto por la diversidad cultural y lingüística de España", criterio:"Reconocer y valorar la diversidad lingüística de España, citando alguna de sus lenguas oficiales", ce:"CE7", cc:"CCL, CCEC" },
    ]},
    { titulo:"Bloque 3.4 — Conciencia ecosocial (CE5)", filas:[
      { saber:"Representación cartográfica (mayor complejidad)", criterio:"Interpretar un mapa temático sencillo (físico, político o climático)", ce:"CE5", cc:"CMCT" },
      { saber:"Factores climáticos: distribución de los climas", criterio:"5.1. Analizar y explicar las relaciones que se producen en un ecosistema o un paisaje significativo para el alumnado teniendo en cuenta los factores naturales y sociales", ce:"CE5", cc:"CMCT, CC" },
      { saber:"El cambio climático: acciones de afrontamiento", criterio:"5.2. Analizar críticamente el impacto que supone la acción humana en el medio tanto a nivel local como global", ce:"CE5", cc:"CC, CE" },
      { saber:"El Universo", criterio:"Describir, de forma sencilla, los principales componentes del Universo", ce:"CE5", cc:"CMCT" },
      { saber:"Elementos del relieve a nivel europeo; redes de transporte y comunicaciones", criterio:"Localizar en un mapa un elemento del relieve o una vía de comunicación a nivel europeo", ce:"CE5", cc:"CMCT" },
      { saber:"Reconocimiento de los paisajes agropecuarios y turísticos; turismo sostenible", criterio:"5.3. Participar activamente en la elaboración y formulación de propuestas de actuación razonadas, viables y sostenibles orientadas a la conservación y cuidado del medio ambiente y el paisaje", ce:"CE5", cc:"CC, CE" },
      { saber:"Identificación y justificación de acciones de consumo responsable de bienes y servicios", criterio:"5.5. Identificar y justificar las acciones propias realizadas habitualmente en el entorno próximo en beneficio del consumo responsable de bienes y servicios", ce:"CE5", cc:"CC, CPSAA" },
    ]},
  ],
  "4":[
    { titulo:"Bloque 1 — Tiempo histórico y fuentes: Prehistoria y primeras civilizaciones (CE1, CE2, CE3)", filas:[
      { saber:"Nociones de Prehistoria e Historia: qué son las fuentes históricas y arqueológicas", criterio:"Diferenciar, con ejemplos, la Prehistoria de la Historia a partir de la existencia o no de escritura", ce:"CE1", cc:"CCL, CC" },
      { saber:"Etapas de la Prehistoria: Paleolítico y Neolítico", criterio:"Reconocer y ordenar, con apoyo de una línea del tiempo, las etapas básicas de la Prehistoria y una característica de cada una", ce:"CE1", cc:"CCL, CC" },
      { saber:"Las primeras civilizaciones fluviales: Mesopotamia y Egipto", criterio:"Identificar, con ayuda de un mapa, el río y el territorio donde se desarrolló una civilización fluvial estudiada", ce:"CE3", cc:"CCL, CC" },
      { saber:"La civilización griega: la polis y la vida cotidiana", criterio:"Describir, de forma sencilla, una característica de la organización social o política de la antigua Grecia", ce:"CE1", cc:"CCL, CCEC" },
      { saber:"Búsqueda guiada de información en fuentes sencillas (textos adaptados, imágenes, mapas)", criterio:"Extraer, con apoyo de preguntas guía, un dato relevante de una fuente histórica sencilla", ce:"CE2", cc:"CCL, CD" },
    ]},
    { titulo:"Bloque 2 — El espacio geográfico: el planeta Tierra, el relieve y el clima (CE5)", filas:[
      { saber:"El planeta Tierra: los continentes y los océanos en el mapa", criterio:"Reconocer, sobre un planisferio, los continentes y océanos", ce:"CE5", cc:"STEM" },
      { saber:"El relieve terrestre: formas básicas (montaña, llanura, meseta)", criterio:"Identificar, con apoyo visual, una forma básica de relieve en una imagen o mapa", ce:"CE5", cc:"STEM" },
      { saber:"El clima: elementos y factores básicos (temperatura, precipitaciones)", criterio:"Diferenciar, con ejemplos, dos tipos de clima estudiados a partir de su temperatura y sus precipitaciones", ce:"CE5", cc:"STEM, CC" },
      { saber:"Los paisajes naturales y la acción humana sobre ellos", criterio:"Reconocer un elemento natural y otro humanizado en un paisaje conocido", ce:"CE5", cc:"STEM, CC" },
      { saber:"El uso responsable de los recursos naturales", criterio:"Proponer, con ayuda, una acción sencilla de cuidado del medio ambiente", ce:"CE5", cc:"CC, CPSAA" },
    ]},
    { titulo:"Bloque 3 — Sociedad, identidad y convivencia (CE4, CE6, CE7, CE8)", filas:[
      { saber:"La organización social en las primeras civilizaciones y en Grecia", criterio:"Reconocer un grupo social de una civilización estudiada y explicar, de forma sencilla, su función", ce:"CE6", cc:"CC" },
      { saber:"Identidad personal y grupal: semejanzas y diferencias con otras culturas", criterio:"Identificar una semejanza y una diferencia entre su propia forma de vida y la de una civilización estudiada", ce:"CE4", cc:"CC, CCEC" },
      { saber:"Convivencia y trabajo cooperativo en el aula", criterio:"Participar en una tarea de grupo asumiendo un papel sencillo y respetando el turno de palabra", ce:"CE8", cc:"CPSAA, CC" },
      { saber:"Problemas sociales cercanos y actitud crítica", criterio:"Reconocer una situación sencilla de desigualdad o injusticia y expresar una opinión respetuosa al respecto", ce:"CE7", cc:"CC, CPSAA" },
    ]},
    { titulo:"Bloque 4 — Patrimonio cultural y natural (CE9)", filas:[
      { saber:"El patrimonio arqueológico e histórico: monumentos y restos", criterio:"Reconocer, mediante imágenes, un monumento o resto arqueológico de una civilización estudiada", ce:"CE9", cc:"CCEC" },
      { saber:"El patrimonio natural y cultural cercano", criterio:"Nombrar un elemento del patrimonio natural o cultural de su localidad o comarca", ce:"CE9", cc:"CCEC, CC" },
      { saber:"Actitudes de respeto y cuidado del patrimonio", criterio:"Proponer, con ayuda, una acción sencilla de cuidado de un bien patrimonial cercano", ce:"CE9", cc:"CC, CCEC" },
    ]},
  ],
  "5":[
    { titulo:"Bloque 1 — Tiempo histórico y fuentes: Roma y la Edad Media (CE1, CE2, CE3)", filas:[
      { saber:"La Antigua Roma: expansión y romanización", criterio:"Reconocer, sobre un mapa, el territorio ocupado por el Imperio romano en su época de mayor extensión", ce:"CE1", cc:"CCL, CC" },
      { saber:"El legado romano en la vida actual", criterio:"Identificar un elemento de origen romano presente en la actualidad (lengua, derecho, obra pública)", ce:"CE3", cc:"CCL, CC" },
      { saber:"Al-Ándalus y los reinos cristianos peninsulares", criterio:"Diferenciar, con apoyo de un mapa, el territorio de Al-Ándalus y el de los reinos cristianos en un momento estudiado", ce:"CE1", cc:"CCL, CC" },
      { saber:"La sociedad feudal: reyes, nobleza, clero y campesinado", criterio:"Reconocer y nombrar un grupo social de la sociedad feudal y una característica básica de su forma de vida", ce:"CE3", cc:"CCL, CC" },
      { saber:"Búsqueda guiada de información en fuentes históricas sencillas (textos, mapas, imágenes de arte)", criterio:"Extraer, con apoyo de preguntas guía, un dato relevante de una fuente histórica o artística sencilla", ce:"CE2", cc:"CCL, CD" },
    ]},
    { titulo:"Bloque 2 — El espacio geográfico: población, ciudad y actividades económicas (CE5)", filas:[
      { saber:"La población: conceptos básicos (natalidad, mortalidad, migración)", criterio:"Explicar, de forma sencilla, qué es un movimiento migratorio y citar un motivo por el que se produce", ce:"CE5", cc:"STEM, CC" },
      { saber:"La ciudad y el mundo rural: diferencias básicas", criterio:"Reconocer, con apoyo visual, una diferencia entre un paisaje urbano y uno rural", ce:"CE5", cc:"STEM, CC" },
      { saber:"Los sectores de actividad económica (primario, secundario, terciario)", criterio:"Clasificar, con ejemplos sencillos y con ayuda, una actividad económica en su sector correspondiente", ce:"CE5", cc:"STEM, CE" },
      { saber:"El uso sostenible de los recursos en el medio urbano y rural", criterio:"Proponer, con ayuda, una acción sencilla de consumo responsable en su vida cotidiana", ce:"CE5", cc:"CC, CPSAA" },
    ]},
    { titulo:"Bloque 3 — Sociedad, identidad y convivencia (CE4, CE6, CE7, CE8)", filas:[
      { saber:"Desigualdades sociales en la Edad Media y en la actualidad", criterio:"Comparar, con un ejemplo sencillo, una desigualdad social de la Edad Media con otra actual", ce:"CE6", cc:"CC" },
      { saber:"La diversidad cultural y religiosa en la Península Ibérica medieval", criterio:"Reconocer y respetar la existencia de distintas culturas y religiones conviviendo en un mismo territorio (Al-Ándalus)", ce:"CE4", cc:"CC, CCEC" },
      { saber:"Convivencia y trabajo cooperativo en el aula", criterio:"Participar en una tarea de grupo asumiendo un papel sencillo y respetando las aportaciones de los demás", ce:"CE8", cc:"CPSAA, CC" },
      { saber:"Problemas sociales actuales y valores democráticos", criterio:"Reconocer una situación sencilla de desigualdad o conflicto social y proponer, con ayuda, una actitud de respeto ante ella", ce:"CE7", cc:"CC, CPSAA" },
    ]},
    { titulo:"Bloque 4 — Patrimonio cultural y natural (CE9)", filas:[
      { saber:"El patrimonio artístico medieval: prerrománico, románico y mudéjar", criterio:"Reconocer, mediante imágenes, un edificio o elemento artístico de la época medieval estudiada", ce:"CE9", cc:"CCEC" },
      { saber:"El patrimonio histórico y cultural cercano de época medieval", criterio:"Nombrar un elemento del patrimonio medieval de su localidad o comarca (castillo, muralla, iglesia)", ce:"CE9", cc:"CCEC, CC" },
      { saber:"Actitudes de respeto y cuidado del patrimonio", criterio:"Proponer, con ayuda, una acción sencilla de cuidado o difusión de un bien patrimonial cercano", ce:"CE9", cc:"CC, CCEC" },
    ]},
  ],
};
/* Descripciones de las competencias específicas citadas en los modelos, agrupadas
   por familia curricular para evitar que coincidan códigos iguales (p. ej. "CE5")
   de currículums distintos: Bloque 3 de Conocimiento del Medio (Primaria, modelos
   1-3) y Geografía e Historia de ESO (modelos 4-5, Decreto 107/2022). */
const NESE_CE_PRIMARIA={
  CE5:"Identificar, analizar y proponer soluciones a los problemas generados por la acción humana en el entorno, tanto a nivel local como de manera global, derivados de los factores demográficos, históricos, económicos, tecnológicos y ambientales.",
  CE6:"Situar cronológica y espacialmente los acontecimientos que marcan el inicio y el final de los grandes periodos históricos mediante el uso de diferentes fuentes históricas y unidades de tiempo, e identificar y explicar los principales procesos de cambio subyacentes y su interrelación.",
  CE7:"Identificar y describir la organización y estructura política y territorial municipal, de la Comunidad Valenciana, de España y de Europa, así como las características más destacadas de sus principales instituciones y funciones.",
  CE8:"Reconocer algunos elementos destacados del patrimonio natural, histórico y cultural de la Comunidad Valenciana y España, y explorar y formular propuestas para promover su reconocimiento y protección."
};
const NESE_CE_ESO_GH={
  CE1:"Describir y contextualizar en el tiempo y el espacio los acontecimientos y procesos más relevantes de la historia propia y universal, identificando referentes de la evolución hacia la sociedad actual y valorando su diversidad.",
  CE2:"Buscar, identificar y seleccionar la información referente a hechos históricos, geográficos y artísticos a partir de diferentes fuentes documentales, realizando un tratamiento correcto en cuanto a investigación, clasificación, recogida, organización, crítica y respeto.",
  CE3:"Explicar las nociones básicas de cambio y continuidad en la historia empleando una perspectiva causal y contextualizada, reconociendo en el pasado el origen y evolución de las cuestiones más relevantes del mundo actual y expresando juicios y opiniones sobre el presente y el futuro.",
  CE4:"Contrastar las identidades individuales con las colectivas, identificando las aportaciones decisivas en su construcción, reconociendo y valorando las actuaciones de tolerancia y respeto.",
  CE5:"Explicar las interrelaciones económicas fundamentales entre los elementos del espacio físico y las actividades de las sociedades humanas, así como su repercusión en la sostenibilidad.",
  CE6:"Contrastar los principales modelos de ocupación territorial y de organización política y económica que explican la desigualdad entre los seres humanos, tanto a escala local como global.",
  CE7:"Dar argumentos desde una perspectiva crítica, fundamentada en conocimientos históricos y geográficos acerca de problemas sociales relevantes, asumiendo valores democráticos y pronunciándose en su defensa.",
  CE8:"Promover y participar en proyectos cooperativos de convivencia, tomando como base la construcción histórica de la Unión Europea, que favorezcan un entorno más justo y solidario mediante la aplicación de valores y procedimientos democráticos.",
  CE9:"Identificar el origen y reconocer el valor del patrimonio cultural y natural, especialmente de sus elementos geográficos, históricos y artísticos, tanto a escala local como a escala global, participando en la elaboración y difusión de propuestas que favorezcan su preservación y puesta en valor."
};
const NESE_CE={ "1":NESE_CE_PRIMARIA, "2":NESE_CE_PRIMARIA, "3":NESE_CE_PRIMARIA, "4":NESE_CE_ESO_GH, "5":NESE_CE_ESO_GH };
/* Etiquetas legibles de cada modelo/ciclo de plan NESE, usadas en badges e informes. */
const NE_MODELO_LABELS={ "1":"1er ciclo de Primaria (1º-2º)", "2":"2º ciclo de Primaria (3º-4º)", "3":"3er ciclo de Primaria (5º-6º)", "4":"1º de ESO", "5":"2º de ESO" };
/* Modelos de Plan de Refuerzo (1º-3º ESO) y Plan de Repetición (1º-4º ESO),
   generados a partir de las propuestas pedagógicas de departamento: objetivos
   = criterios de evaluación (con CE y competencia clave), medidas = saberes
   básicos por CE + dossier de actividades, repartidos en 3 evaluaciones
   (CE1-3 / CE4-6 / CE7-9). Compartido entre ambos tipos de plan. */
const RFRP_MODELOS={
  "1":[
    { gruposCE:[
      { ce:"CE1", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"1.1. Construir un relato cronológicamente ordenado y coherente sobre hechos y personajes relevantes del pasado y sobre su relación con el presente.", trabajado:false },
        { texto:"1.2. Reconocer la distinta relevancia otorgada a unos hechos históricos sobre otros en diferentes momentos del pasado y en el presente.", trabajado:false },
        { texto:"1.3. Manifestar interés y respeto por la diversidad histórica y cultural de las sociedades humanas.", trabajado:false },
      ]},
      { ce:"CE2", cc:"CCL, CD, CPSAA", criterios:[
        { texto:"2.1. Comparar la información obtenida con sus ideas previas, desterrando posibles prejuicios.", trabajado:false },
        { texto:"2.2. Seleccionar y utilizar la información más relevante para explicar determinados hechos históricos, geográficos y artísticos contenida en diferentes fuentes documentales.", trabajado:false },
        { texto:"2.3. Identificar la información contenida en diferentes fuentes documentales de hechos históricos, geográficos y artísticos.", trabajado:false },
        { texto:"2.4. Formular y comunicar sus propias conclusiones sobre hechos históricos, geográficos y artísticos, representándolas de una manera textual, gráfica o audiovisual.", trabajado:false },
      ]},
      { ce:"CE3", cc:"CCL, CC", criterios:[
        { texto:"3.1. Reconocer causas y consecuencias respecto de los hechos y procesos históricos más relevantes de diferentes épocas.", trabajado:false },
        { texto:"3.2. Contextualizar y valorar decisiones históricamente relevantes tomadas por personas representativas del pasado, tanto en el contexto propio como en otros contextos sociales, políticos y culturales.", trabajado:false },
        { texto:"3.3. Producir opiniones y manifestar actitudes de tolerancia y respeto hacia otras culturas y cosmovisiones.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE4", cc:"CCL, CC, CCEC", criterios:[
        { texto:"4.1. Identificar los elementos definitorios más significativos de las identidades individuales y colectivas del propio entorno.", trabajado:false },
        { texto:"4.2. Expresar opiniones de respeto y tolerancia hacia otras identidades, tanto individuales como colectivas.", trabajado:false },
        { texto:"4.3. Mostrar actitudes de interés y respeto hacia otras identidades, tanto individuales como colectivas.", trabajado:false },
      ]},
      { ce:"CE5", cc:"STEM, CPSAA, CC, CCEC", criterios:[
        { texto:"5.1. Ubicar las actividades económicas y los recursos naturales más importantes en el espacio geográfico.", trabajado:false },
        { texto:"5.2. Detectar los problemas territoriales y medioambientales más importantes, tanto a escala global como local, y hacer propuestas con criterios de sostenibilidad.", trabajado:false },
        { texto:"5.3. Identificar y describir el impacto sobre el territorio de las principales actividades económicas, diferenciando entre las que son sostenibles y las que no lo son.", trabajado:false },
      ]},
      { ce:"CE6", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"6.1. Identificar y localizar los principales modelos de organización territorial, política y económica.", trabajado:false },
        { texto:"6.2. Distinguir las entidades políticas y formas de organización económica más importantes dentro de los principales modelos de organización territorial, política y económica, y explicar cómo inciden en la vida cotidiana de sus habitantes.", trabajado:false },
        { texto:"6.3. Señalar los principales problemas territoriales, políticos y económicos, así como los agentes sociales que intervienen a escala local, regional, estatal y supraestatal.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE7", cc:"CC, CE", criterios:[
        { texto:"7.1. Identificar los problemas sociales más relevantes de la actualidad, utilizando como guía los Objetivos de Desarrollo Sostenible.", trabajado:false },
        { texto:"7.2. Establecer relaciones causales entre las acciones humanas y el origen de los problemas sociales más relevantes de la actualidad.", trabajado:false },
        { texto:"7.3. Mostrar interés por los problemas sociales más relevantes y proponer soluciones a los mismos fundamentadas en saberes geográficos e históricos.", trabajado:false },
      ]},
      { ce:"CE8", cc:"CC, CCEC", criterios:[
        { texto:"8.1. Participar en proyectos cooperativos, asumiendo varios roles con responsabilidad y reconociendo las aportaciones de sus iguales.", trabajado:false },
        { texto:"8.2. Denunciar las situaciones injustas y de exclusión en cualquier ámbito, tomando como ejemplo la historia de Europa.", trabajado:false },
        { texto:"8.3. Aplicar los principios democráticos y el diálogo para resolver los conflictos.", trabajado:false },
      ]},
      { ce:"CE9", cc:"CC, CCEC", criterios:[
        { texto:"9.1. Identificar bienes patrimoniales históricos, geográficos y artísticos, tanto a escala global como local.", trabajado:false },
        { texto:"9.2. Elaborar trabajos de síntesis sobre el patrimonio más cercano que reconozcan su variedad e importancia como elemento identitario.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
  ],
  "2":[
    { gruposCE:[
      { ce:"CE1", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"1.1. Construir un relato cronológicamente ordenado y coherente sobre hechos y personajes relevantes del pasado y sobre su relación con el presente.", trabajado:false },
        { texto:"1.2. Reconocer la distinta relevancia otorgada a unos hechos históricos sobre otros en diferentes momentos del pasado y en el presente.", trabajado:false },
        { texto:"1.3. Manifestar interés y respeto por la diversidad histórica y cultural de las sociedades humanas.", trabajado:false },
      ]},
      { ce:"CE2", cc:"CCL, CD, CPSAA", criterios:[
        { texto:"2.1. Comparar la información obtenida con sus ideas previas, desterrando posibles prejuicios.", trabajado:false },
        { texto:"2.2. Seleccionar y utilizar la información más relevante para explicar determinados hechos históricos, geográficos y artísticos contenida en diferentes fuentes documentales.", trabajado:false },
        { texto:"2.3. Identificar la información contenida en diferentes fuentes documentales de hechos históricos, geográficos y artísticos.", trabajado:false },
        { texto:"2.4. Formular y comunicar sus propias conclusiones sobre hechos históricos, geográficos y artísticos, representándolas de una manera textual, gráfica o audiovisual.", trabajado:false },
      ]},
      { ce:"CE3", cc:"CCL, CC", criterios:[
        { texto:"3.1. Reconocer causas y consecuencias respecto de los hechos y procesos históricos más relevantes de diferentes épocas.", trabajado:false },
        { texto:"3.2. Contextualizar y valorar decisiones históricamente relevantes tomadas por personas representativas del pasado, tanto en el contexto propio como en otros contextos sociales, políticos y culturales.", trabajado:false },
        { texto:"3.3. Producir opiniones y manifestar actitudes de tolerancia y respeto hacia otras culturas y cosmovisiones.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE4", cc:"CCL, CC, CCEC", criterios:[
        { texto:"4.1. Identificar los elementos definitorios más significativos de las identidades individuales y colectivas del propio entorno.", trabajado:false },
        { texto:"4.2. Expresar opiniones de respeto y tolerancia hacia otras identidades, tanto individuales como colectivas.", trabajado:false },
        { texto:"4.3. Mostrar actitudes de interés y respeto hacia otras identidades, tanto individuales como colectivas.", trabajado:false },
      ]},
      { ce:"CE5", cc:"STEM, CPSAA, CC, CCEC", criterios:[
        { texto:"5.1. Ubicar las actividades económicas y los recursos naturales más importantes en el espacio geográfico.", trabajado:false },
        { texto:"5.2. Detectar los problemas territoriales y medioambientales más importantes, tanto a escala global como local, y hacer propuestas con criterios de sostenibilidad.", trabajado:false },
        { texto:"5.3. Identificar y describir el impacto sobre el territorio de las principales actividades económicas, diferenciando entre las que son sostenibles y las que no lo son.", trabajado:false },
      ]},
      { ce:"CE6", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"6.1. Identificar y localizar los principales modelos de organización territorial, política y económica.", trabajado:false },
        { texto:"6.2. Distinguir las entidades políticas y formas de organización económica más importantes dentro de los principales modelos de organización territorial, política y económica, y explicar cómo inciden en la vida cotidiana de sus habitantes.", trabajado:false },
        { texto:"6.3. Señalar los principales problemas territoriales, políticos y económicos, así como los agentes sociales que intervienen a escala local, regional, estatal y supraestatal.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE7", cc:"CC, CE", criterios:[
        { texto:"7.1. Identificar los problemas sociales más relevantes de la actualidad, utilizando como guía los Objetivos de Desarrollo Sostenible.", trabajado:false },
        { texto:"7.2. Establecer relaciones causales entre las acciones humanas y el origen de los problemas sociales más relevantes de la actualidad.", trabajado:false },
        { texto:"7.3. Mostrar interés por los problemas sociales más relevantes y proponer soluciones a los mismos fundamentadas en saberes geográficos e históricos.", trabajado:false },
      ]},
      { ce:"CE8", cc:"CC, CCEC", criterios:[
        { texto:"8.1. Participar en proyectos cooperativos, asumiendo varios roles con responsabilidad y reconociendo las aportaciones de sus iguales.", trabajado:false },
        { texto:"8.2. Denunciar las situaciones injustas y de exclusión en cualquier ámbito, tomando como ejemplo la historia de Europa.", trabajado:false },
        { texto:"8.3. Aplicar los principios democráticos y el diálogo para resolver los conflictos.", trabajado:false },
      ]},
      { ce:"CE9", cc:"CC, CCEC", criterios:[
        { texto:"9.1. Identificar bienes patrimoniales históricos, geográficos y artísticos, tanto a escala global como local.", trabajado:false },
        { texto:"9.2. Elaborar trabajos de síntesis sobre el patrimonio más cercano que reconozcan su variedad e importancia como elemento identitario.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
  ],
  "3":[
    { gruposCE:[
      { ce:"CE1", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"1.1. Construir un relato o una síntesis, cronológicamente ordenada, coherente y empleando la terminología adecuada, sobre hechos, procesos y personajes relevantes del pasado y su relación con el presente.", trabajado:false },
        { texto:"1.2. Aportar posibles motivos sobre la distinta relevancia otorgada a unos hechos históricos sobre otros en diferentes momentos del pasado y en el presente.", trabajado:false },
        { texto:"1.3. Debatir sobre situaciones históricas de intolerancia y formular argumentos que fomenten la tolerancia y el respeto hacia la diversidad histórica y cultural de las sociedades humanas.", trabajado:false },
      ]},
      { ce:"CE2", cc:"CCL, CD, CPSAA", criterios:[
        { texto:"2.1. Contrastar la información seleccionada para comprender hechos históricos, geográficos y artísticos procedente de diferentes fuentes con la proveniente de organismos oficiales o emisores de prestigio reconocido.", trabajado:false },
        { texto:"2.2. Identificar y rechazar prejuicios y estereotipos, distinguiendo opiniones no fundamentadas en hechos y saberes y comparándolas con información obtenida a partir de fuentes fiables.", trabajado:false },
        { texto:"2.3. Utilizar la información contenida en diferentes fuentes documentales para explicar hechos históricos, geográficos y artísticos relacionándolos con su época.", trabajado:false },
        { texto:"2.4. Formular y comunicar de manera textual, gráfica o audiovisual conclusiones y valoraciones propias sobre hechos históricos, geográficos y artísticos, mostrando un dominio adecuado de los conceptos y la metodología de trabajo de este ámbito de conocimiento.", trabajado:false },
      ]},
      { ce:"CE3", cc:"CCL, CC", criterios:[
        { texto:"3.1. Explicar las dinámicas de cambio y continuidad en los procesos históricos más relevantes de diferentes épocas identificando relaciones causales complejas y entre factores de distinto ámbito.", trabajado:false },
        { texto:"3.2. Contextualizar y valorar decisiones tomadas por personas del pasado y/o de contextos sociales, políticos y culturales diferentes del propio, y debatir sobre los motivos de sus acciones.", trabajado:false },
        { texto:"3.3. Producir opiniones y juicios de valor coherentes sobre cuestiones sociales y políticas del pasado y del presente, manifestando actitudes de tolerancia, respeto e interés hacia otras culturas y cosmovisiones.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE4", cc:"CCL, CC, CCEC", criterios:[
        { texto:"4.1. Identificar los elementos definitorios de las identidades individuales y colectivas más significativas del presente estableciendo su conexión con hechos del pasado.", trabajado:false },
        { texto:"4.2. Argumentar a favor de las actitudes tolerantes, respetuosas y de interés hacia otras identidades, tanto individuales como colectivas.", trabajado:false },
        { texto:"4.3. Promover y ejercer propuestas prácticas de convivencia en el aula y en el propio entorno social.", trabajado:false },
      ]},
      { ce:"CE5", cc:"STEM, CPSAA, CC, CCEC", criterios:[
        { texto:"5.1. Identificar y describir las interrelaciones entre los grupos y las sociedades humanas y el medio ambiente que han dado lugar a problemas y conflictos por el acceso a los recursos naturales.", trabajado:false },
        { texto:"5.2. Explicar las causas de problemas y conflictos territoriales y medioambientales, diferenciando y relacionando las distintas variables que intervienen.", trabajado:false },
        { texto:"5.3. Plantear alternativas sostenibles argumentadas a los problemas e impactos ocasionados por las actividades humanas.", trabajado:false },
      ]},
      { ce:"CE6", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"6.1. Describir las principales características de los diferentes modelos de organización territorial, política y económica.", trabajado:false },
        { texto:"6.2. Exponer razonadamente las desigualdades generadas por los modelos de organización territorial, política y económica y explicar sus causas.", trabajado:false },
        { texto:"6.3. Explicar los principales problemas territoriales, políticos y económicos generados por las desigualdades y cómo afectan a la vida cotidiana de las personas.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE7", cc:"CC, CE", criterios:[
        { texto:"7.1. Justificar cómo las acciones personales incides directamente en los problemas sociales relevantes.", trabajado:false },
        { texto:"7.2. Proporcionar argumentos propios, fundamentados en la historia y en la geografía, sobre los problemas sociales más relevantes, reconociendo la incidencia que su resolución tendrá en la mejora de las condiciones de vida de las personas.", trabajado:false },
        { texto:"7.3. Proponer soluciones para los problemas basadas en argumentos históricos y geográficos que consideren los Objetivos de Desarrollo Sostenible (ODS).", trabajado:false },
      ]},
      { ce:"CE8", cc:"CC, CCEC", criterios:[
        { texto:"8.1. Participar en proyectos cooperativos, asumiendo varios roles con eficacia y responsabilidad, apoyando a compañeros y compañeras y demostrando empatía.", trabajado:false },
        { texto:"8.2. Denunciar las situaciones injustas y de exclusión, argumentando a favor del diálogo y la inclusión como formas de superarlas.", trabajado:false },
        { texto:"8.3. Argumentar y aplicar los principios democráticos y el diálogo para plantear la resolución de los conflictos, tanto en el ámbito cotidiano como a escala global, utilizando especialmente el referente de la construcción histórica de la Unión Europea.", trabajado:false },
      ]},
      { ce:"CE9", cc:"CC, CCEC", criterios:[
        { texto:"9.1. Identificar las características de los elementos patrimoniales, relacionándolas con estilos artísticos, época histórica y entorno geográfico.", trabajado:false },
        { texto:"9.2. Elaborar y exponer propuestas argumentadas que contribuyan a la preservación del patrimonio y su puesta en valor, y que lo reconozcan como bien social.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
  ],
  "4":[
    { gruposCE:[
      { ce:"CE1", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"1.1. Construir un relato o una síntesis, cronológicamente ordenada, coherente y empleando la terminología adecuada, sobre hechos, procesos y personajes relevantes del pasado y su relación con el presente.", trabajado:false },
        { texto:"1.2. Aportar posibles motivos sobre la distinta relevancia otorgada a unos hechos históricos sobre otros en diferentes momentos del pasado y en el presente.", trabajado:false },
        { texto:"1.3. Debatir sobre situaciones históricas de intolerancia y formular argumentos que fomenten la tolerancia y el respeto hacia la diversidad histórica y cultural de las sociedades humanas.", trabajado:false },
      ]},
      { ce:"CE2", cc:"CCL, CD, CPSAA", criterios:[
        { texto:"2.1. Contrastar la información seleccionada para comprender hechos históricos, geográficos y artísticos procedente de diferentes fuentes con la proveniente de organismos oficiales o emisores de prestigio reconocido.", trabajado:false },
        { texto:"2.2. Identificar y rechazar prejuicios y estereotipos, distinguiendo opiniones no fundamentadas en hechos y saberes y comparándolas con información obtenida a partir de fuentes fiables.", trabajado:false },
        { texto:"2.3. Utilizar la información contenida en diferentes fuentes documentales para explicar hechos históricos, geográficos y artísticos relacionándolos con su época.", trabajado:false },
        { texto:"2.4. Formular y comunicar de manera textual, gráfica o audiovisual conclusiones y valoraciones propias sobre hechos históricos, geográficos y artísticos, mostrando un dominio adecuado de los conceptos y la metodología de trabajo de este ámbito de conocimiento.", trabajado:false },
      ]},
      { ce:"CE3", cc:"CCL, CC", criterios:[
        { texto:"3.1. Explicar las dinámicas de cambio y continuidad en los procesos históricos más relevantes de diferentes épocas identificando relaciones causales complejas y entre factores de distinto ámbito.", trabajado:false },
        { texto:"3.2. Contextualizar y valorar decisiones tomadas por personas del pasado y/o de contextos sociales, políticos y culturales diferentes del propio, y debatir sobre los motivos de sus acciones.", trabajado:false },
        { texto:"3.3. Producir opiniones y juicios de valor coherentes sobre cuestiones sociales y políticas del pasado y del presente, manifestando actitudes de tolerancia, respeto e interés hacia otras culturas y cosmovisiones.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE4", cc:"CCL, CC, CCEC", criterios:[
        { texto:"4.1. Identificar los elementos definitorios de las identidades individuales y colectivas más significativas del presente estableciendo su conexión con hechos del pasado.", trabajado:false },
        { texto:"4.2. Argumentar a favor de las actitudes tolerantes, respetuosas y de interés hacia otras identidades, tanto individuales como colectivas.", trabajado:false },
        { texto:"4.3. Promover y ejercer propuestas prácticas de convivencia en el aula y en el propio entorno social.", trabajado:false },
      ]},
      { ce:"CE5", cc:"STEM, CPSAA, CC, CCEC", criterios:[
        { texto:"5.1. Identificar y describir las interrelaciones entre los grupos y las sociedades humanas y el medio ambiente que han dado lugar a problemas y conflictos por el acceso a los recursos naturales.", trabajado:false },
        { texto:"5.2. Explicar las causas de problemas y conflictos territoriales y medioambientales, diferenciando y relacionando las distintas variables que intervienen.", trabajado:false },
        { texto:"5.3. Plantear alternativas sostenibles argumentadas a los problemas e impactos ocasionados por las actividades humanas.", trabajado:false },
      ]},
      { ce:"CE6", cc:"CCL, CPSAA, CC, CCEC", criterios:[
        { texto:"6.1. Describir las principales características de los diferentes modelos de organización territorial, política y económica.", trabajado:false },
        { texto:"6.2. Exponer razonadamente las desigualdades generadas por los modelos de organización territorial, política y económica y explicar sus causas.", trabajado:false },
        { texto:"6.3. Explicar los principales problemas territoriales, políticos y económicos generados por las desigualdades y cómo afectan a la vida cotidiana de las personas.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
    { gruposCE:[
      { ce:"CE7", cc:"CC, CE", criterios:[
        { texto:"7.1. Justificar cómo las acciones personales incides directamente en los problemas sociales relevantes.", trabajado:false },
        { texto:"7.2. Proporcionar argumentos propios, fundamentados en la historia y en la geografía, sobre los problemas sociales más relevantes, reconociendo la incidencia que su resolución tendrá en la mejora de las condiciones de vida de las personas.", trabajado:false },
        { texto:"7.3. Proponer soluciones para los problemas basadas en argumentos históricos y geográficos que consideren los Objetivos de Desarrollo Sostenible (ODS).", trabajado:false },
      ]},
      { ce:"CE8", cc:"CC, CCEC", criterios:[
        { texto:"8.1. Participar en proyectos cooperativos, asumiendo varios roles con eficacia y responsabilidad, apoyando a compañeros y compañeras y demostrando empatía.", trabajado:false },
        { texto:"8.2. Denunciar las situaciones injustas y de exclusión, argumentando a favor del diálogo y la inclusión como formas de superarlas.", trabajado:false },
        { texto:"8.3. Argumentar y aplicar los principios democráticos y el diálogo para plantear la resolución de los conflictos, tanto en el ámbito cotidiano como a escala global, utilizando especialmente el referente de la construcción histórica de la Unión Europea.", trabajado:false },
      ]},
      { ce:"CE9", cc:"CC, CCEC", criterios:[
        { texto:"9.1. Identificar las características de los elementos patrimoniales, relacionándolas con estilos artísticos, época histórica y entorno geográfico.", trabajado:false },
        { texto:"9.2. Elaborar y exponer propuestas argumentadas que contribuyan a la preservación del patrimonio y su puesta en valor, y que lo reconozcan como bien social.", trabajado:false },
      ]},
    ], actividades:["Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos."], calificacion:"", valoracion:"", justificacion:"" },
  ],
};
const RFRP_CE_LEGEND=[
  { ce:"CE1", enunciado:"Describir y contextualizar en el tiempo y el espacio los acontecimientos y procesos más relevantes de la historia propia y universal, identificando referentes de la evolución hacia la sociedad actual y valorando su diversidad." },
  { ce:"CE2", enunciado:"Buscar, identificar y seleccionar la información referente a hechos históricos, geográficos y artísticos a partir de diferentes fuentes documentales, realizando un tratamiento correcto en cuanto a investigación, clasificación, recogida, organización, crítica y respeto." },
  { ce:"CE3", enunciado:"Explicar las nociones básicas de cambio y continuidad en la historia empleando una perspectiva causal y contextualizada, reconociendo en el pasado el origen y evolución de las cuestiones más relevantes del mundo actual y expresando juicios y opiniones sobre el presente y el futuro." },
  { ce:"CE4", enunciado:"Contrastar las identidades individuales con las colectivas, identificando las aportaciones decisivas en su construcción, reconociendo y valorando las actuaciones de tolerancia y respeto." },
  { ce:"CE5", enunciado:"Explicar las interrelaciones económicas fundamentales entre los elementos del espacio físico y las actividades de las sociedades humanas, así como su repercusión en la sostenibilidad." },
  { ce:"CE6", enunciado:"Contrastar los principales modelos de ocupación territorial y de organización política y económica que explican la desigualdad entre los seres humanos, tanto a escala local como global." },
  { ce:"CE7", enunciado:"Dar argumentos desde una perspectiva crítica, fundamentada en conocimientos históricos y geográficos acerca de problemas sociales relevantes, asumiendo valores democráticos y pronunciándose en su defensa." },
  { ce:"CE8", enunciado:"Promover y participar en proyectos cooperativos de convivencia, tomando como base la construcción histórica de la Unión Europea, que favorezcan un entorno más justo y solidario mediante la aplicación de valores y procedimientos democráticos." },
  { ce:"CE9", enunciado:"Identificar el origen y reconocer el valor del patrimonio cultural y natural, especialmente de sus elementos geográficos, históricos y artísticos, tanto a escala local como a escala global, participando en la elaboración y difusión de propuestas que favorezcan su preservación y puesta en valor." },
];
const RFRP_CC_LEGEND=[
  { sigla:"CCL", nombre:"Competencia en comunicación lingüística" },
  { sigla:"CP", nombre:"Competencia plurilingüe" },
  { sigla:"CMCT", nombre:"Competencia matemática, ciencia y tecnológica" },
  { sigla:"CD", nombre:"Competencia digital" },
  { sigla:"CPSAA", nombre:"Competencia personal, social y de aprender a aprender" },
  { sigla:"CC", nombre:"Competencia ciudadana" },
  { sigla:"CE", nombre:"Competencia emprendedora" },
  { sigla:"CCEC", nombre:"Competencia en conciencia y expresión culturales" },
];
function rfrpCeLegendHTML(){
  return `<div class="card">
  <h2 style="font-size:14.5px">Leyenda — Competencias específicas</h2>
  <div class="grid" style="gap:5px;margin-top:6px">
    ${RFRP_CE_LEGEND.map(l=>`<div style="font-size:12px;line-height:1.45"><strong>${l.ce}</strong> — ${esc(l.enunciado)}</div>`).join("")}
  </div>
  <h2 style="font-size:14.5px;margin-top:16px">Leyenda — Competencias clave</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:5px;margin-top:6px">
    ${RFRP_CC_LEGEND.map(l=>`<div style="font-size:12px"><strong>${l.sigla}</strong> — ${esc(l.nombre)}</div>`).join("")}
  </div>
</div>`;
}
function rfrpCeLegendPrintHTML(){
  return `<h2>Leyenda — Competencias específicas</h2>
    <table><tbody>
    ${RFRP_CE_LEGEND.map(l=>`<tr><th style="width:50px">${l.ce}</th><td style="font-size:12px">${esc(l.enunciado)}</td></tr>`).join("")}
    </tbody></table>
    <h2>Leyenda — Competencias clave</h2>
    <table><tbody>
    ${RFRP_CC_LEGEND.map(l=>`<tr><th style="width:70px">${l.sigla}</th><td style="font-size:12px">${esc(l.nombre)}</td></tr>`).join("")}
    </tbody></table>`;
}
const RFRP_MOTIVOS=[
  {id:"absentismo",label:"Absentismo"},
  {id:"dificultadesAprendizaje",label:"Dificultades de aprendizaje"},
  {id:"enfermedad",label:"Enfermedad"},
  {id:"problematicaSociofamiliar",label:"Problemática sociofamiliar"},
  {id:"faltaMotivacion",label:"Falta de motivación"},
  {id:"faltaTrabajoEstudio",label:"Falta de trabajo y estudio"},
  {id:"otros",label:"Otros"}
];
const RP_MEDIDAS_II=[
  {id:"multinivel",label:"Programaciones didácticas multinivel"},
  {id:"actividadesRefuerzo",label:"Actividades de refuerzo"},
  {id:"trabajoCooperativo",label:"Trabajo cooperativo"},
  {id:"ajusteEvaluacion",label:"Ajuste de procedimientos e instrumentos de evaluación"},
  {id:"docenciaCompartida",label:"Docencia compartida"},
  {id:"otros",label:"Otros"}
];
const RP_MEDIDAS_III=[
  {id:"adecuacionPersonalizada",label:"Adecuación personalizada de las propuestas didácticas"},
  {id:"acompanamientoPT",label:"Acompañamiento y soporte personalizado (PT)"},
  {id:"ensenanzaIntensivaLenguas",label:"Enseñanza intensiva de las lenguas oficiales (alumnado recién llegado)"},
  {id:"repiteProgramaPAC",label:"Repite con programa PAC"},
  {id:"repiteProgramaPDC3",label:"Repite con programa PDC 3.º"},
  {id:"repiteProgramaPDC4",label:"Repite con programa PDC 4.º"},
  {id:"repiteProgramaFPB",label:"Repite con FPB"},
  {id:"otros",label:"Otros"}
];
const RFRP_VALORACION_PN=[
  {id:"",label:"— Sin valorar —",color:"var(--mut)"},
  {id:"positiva",label:"Positiva",color:"#16a34a"},
  {id:"negativa",label:"Negativa",color:"#dc2626"}
];
function rfrpValoracionPNInfo(id){ return RFRP_VALORACION_PN.find(v=>v.id===id)||RFRP_VALORACION_PN[0]; }
function rfrpMotivosDefault(){ const o={}; RFRP_MOTIVOS.forEach(m=>o[m.id]=false); o.otrosTexto=""; return o; }
function rpMedidasDefault(lista){ const o={}; lista.forEach(m=>o[m.id]=false); o.otrosTexto=""; return o; }
const RFRP_DOSSIER_DEFECTO="Elaboración de un dossier de actividades de evaluación y consolidación de los saberes básicos no conseguidos.";
function rfrpTrimestreVacio(){ return {gruposCE:[],actividades:[RFRP_DOSSIER_DEFECTO],calificacion:"",valoracion:"",justificacion:""}; }
function rfrpGrupoCEVacio(){ return {ce:"",cc:"",criterios:[{texto:"",trabajado:false}]}; }
function rfrpTrimestresIniciales(nivelModelo){
  if(nivelModelo && RFRP_MODELOS[nivelModelo]){
    return JSON.parse(JSON.stringify(RFRP_MODELOS[nivelModelo]));
  }
  return [rfrpTrimestreVacio(),rfrpTrimestreVacio(),rfrpTrimestreVacio()];
}
const NIV={
  excelente:{etq:"Excelente",bg:"#dcece0",fg:"#1e5631"},
  adecuado:{etq:"Adecuado",bg:"#d9e6f2",fg:"#1d4e74"},
  enProceso:{etq:"En proceso",bg:"#f6eccf",fg:"#8a5a12"},
  necesita:{etq:"Necesita mejorar",bg:"#f3dcdc",fg:"#912525"}
};
const NIVCUANT=[
  {max:4.9,etq:"Insuficiente",bg:"#f3dcdc",fg:"#912525"},
  {max:5.9,etq:"Suficiente",bg:"#f6eccf",fg:"#8a5a12"},
  {max:6.9,etq:"Bien",bg:"#d9e6f2",fg:"#1d4e74"},
  {max:8.9,etq:"Notable",bg:"#e3f0df",fg:"#3a6b2a"},
  {max:10,etq:"Sobresaliente",bg:"#dcece0",fg:"#1e5631"}
];
