// Catálogo de servicios — única fuente de verdad (área ↔ tipología ↔ tarifa).
// Mismos datos que el sitio público. price en CLP (entero).
const AREAS = {
  familia: 'Derecho de familia',
  migracion: 'Derecho migratorio',
  escrituras: 'Escrituras y trámites',
  marcas: 'Propiedad industrial',
  consulta: 'Otros casos',
};

const CATALOG = [
  { id:'div',  area:'familia',    name:'Divorcio de común acuerdo',                 price:200000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Redacción y presentación de la solicitud conjunta, acuerdo regulador y representación hasta la sentencia.', requiere:'Certificado de matrimonio y cédulas de ambas partes.' },
  { id:'ali',  area:'familia',    name:'Demanda de alimentos',                      price:300000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Demanda, representación en audiencia y gestión de la resolución.', requiere:'Comprobantes de ingresos del demandado y de los gastos del menor.' },
  { id:'rdr',  area:'familia',    name:'Regulación de relación directa y regular',  price:350000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Solicitud o demanda, propuesta de régimen y representación.', requiere:'Datos de los hijos y antecedentes de la relación parental.' },
  { id:'sal',  area:'familia',    name:'Autorización judicial de salida del país',  price:220000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Solicitud, representación y gestión de la autorización.', requiere:'Datos del viaje y del otro progenitor.' },
  { id:'vtemp',area:'migracion',  name:'Solicitud de visa temporal',                price:240000, plazo:'Según Servicio Nacional de Migraciones', incluye:'Preparación y presentación de la solicitud ante el SNM.', requiere:'Pasaporte vigente, antecedentes y documentos según categoría.' },
  { id:'pdef', area:'migracion',  name:'Solicitud de permanencia definitiva',       price:280000, plazo:'Según Servicio Nacional de Migraciones', incluye:'Preparación y presentación de la solicitud de permanencia definitiva.', requiere:'Visa vigente y acreditación del tiempo de residencia.' },
  { id:'rec',  area:'migracion',  name:'Recurso administrativo ante rechazo SNM',   price:350000, plazo:'Plazo legal acotado', hot:true, incluye:'Análisis del rechazo y presentación del recurso administrativo correspondiente.', requiere:'Resolución de rechazo y antecedentes del caso.' },
  { id:'hijo', area:'migracion',  name:'Reconocimiento e inscripción de hijo de migrante', price:180000, plazo:'Según Registro Civil', incluye:'Gestión del reconocimiento e inscripción ante el Registro Civil.', requiere:'Certificado de nacimiento y documentos de identidad.' },
  { id:'mand', area:'escrituras', name:'Mandato general o especial (poder)',         price:80000,  plazo:'24 a 48 horas', hot:true, incluye:'Redacción del poder según las facultades a otorgar.', requiere:'Datos del mandante, del mandatario y facultades requeridas.' },
  { id:'prom', area:'escrituras', name:'Promesa de compraventa',                    price:250000, plazo:'Según las partes', incluye:'Redacción de la promesa con las condiciones acordadas.', requiere:'Antecedentes del inmueble y de las partes.' },
  { id:'cv',   area:'escrituras', name:'Compraventa de bien raíz (redacción)',      price:400000, plazo:'Según trámite (notaría y CBR)', incluye:'Redacción de la escritura de compraventa.', requiere:'Antecedentes del inmueble y de las partes. Aranceles notariales y del Conservador aparte.' },
  { id:'liq',  area:'escrituras', name:'Liquidación de sociedad conyugal',          price:500000, plazo:'Variable', incluye:'Redacción y gestión de la liquidación del régimen.', requiere:'Antecedentes de los bienes y del matrimonio.' },
  { id:'pos',  area:'escrituras', name:'Posesión efectiva intestada',               price:250000, plazo:'2 a 4 meses', incluye:'Tramitación de la posesión efectiva de la herencia.', requiere:'Certificado de defunción y antecedentes de los bienes y herederos.' },
  { id:'nom',  area:'escrituras', name:'Cambio de nombre o rectificación de partida', price:200000, plazo:'4 a 8 meses', incluye:'Solicitud y gestión del cambio o rectificación.', requiere:'Partida a rectificar y antecedentes que fundan la solicitud.' },
  { id:'mera', area:'escrituras', name:'Escritos de mera tramitación, sin patrocinio de abogado', price:20000, plazo:'48 horas hábiles', hot:true, incluye:'Redacción de escritos de mera tramitación para una causa en curso. No incluye patrocinio ni poder.', requiere:'Rol y tribunal de la causa, y el escrito específico requerido.' },
  { id:'marca',area:'marcas',     name:'Registro de marca en INAPI',                price:150000, plazo:'4 a 8 meses (según INAPI)', incluye:'Búsqueda de antecedentes, presentación ante INAPI y seguimiento hasta la resolución.', requiere:'Signo a registrar, clases de Niza y datos del solicitante.' },
  { id:'otros',area:'consulta',   name:'Consulta por otro caso (fuera del catálogo)', price:0,    plazo:'Primera atención gratuita', incluye:'Videollamada inicial gratuita con la abogada para evaluar tu caso y orientarte sobre los pasos a seguir.', requiere:'Una breve descripción de lo que necesitas.' },
];

const byId = id => CATALOG.find(s => s.id === id);

// Hitos por defecto según el tipo de gestión.
function defaultMilestones(service) {
  if (service.area === 'consulta' || service.price === 0) {
    return ['Registro recibido','Videollamada agendada','Primera atención realizada','Próximos pasos definidos'];
  }
  if (service.juicio) {
    return ['Diagnóstico realizado','Pago confirmado','Documentos firmados','Demanda ingresada','Audiencia agendada','Sentencia notificada'];
  }
  if (service.area === 'migracion' || service.area === 'marcas') {
    return ['Diagnóstico realizado','Pago confirmado','Antecedentes reunidos','Solicitud presentada','Resolución de la autoridad'];
  }
  return ['Diagnóstico realizado','Pago confirmado','Documento preparado','Revisión y firma','Trámite completado'];
}

module.exports = { AREAS, CATALOG, byId, defaultMilestones };
