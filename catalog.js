// Catálogo de servicios — única fuente de verdad (área ↔ tipología ↔ tarifa).
// Mismos datos que el sitio público. price en CLP (entero).
const AREAS = {
  familia: 'Derecho de familia',
  consulta: 'Otros casos',
};

const CATALOG = [
  { id:'div',  area:'familia',    name:'Divorcio de común acuerdo',                 price:400000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Redacción y presentación de la solicitud conjunta, acuerdo regulador y representación hasta la sentencia.', requiere:'Certificado de matrimonio y cédulas de ambas partes.' },
  { id:'divu', area:'familia',    name:'Divorcio unilateral',                       price:600000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Demanda de divorcio unilateral por cese de la convivencia, representación en el juicio y gestión hasta la sentencia.', requiere:'Certificado de matrimonio, datos del otro cónyuge y acreditación del cese de la convivencia.' },
  { id:'ali',  area:'familia',    name:'Demanda de alimentos',                      price:600000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Demanda, representación en audiencia y gestión de la resolución.', requiere:'Comprobantes de ingresos del demandado y de los gastos del menor.' },
  { id:'rdr',  area:'familia',    name:'Regulación de relación directa y regular',  price:600000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Solicitud o demanda, propuesta de régimen y representación.', requiere:'Datos de los hijos y antecedentes de la relación parental.' },
  { id:'sal',  area:'familia',    name:'Autorización judicial de salida del país',  price:350000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Solicitud, representación y gestión de la autorización.', requiere:'Datos del viaje y del otro progenitor.' },
  { id:'cuid', area:'familia',    name:'Cuidado personal',                          price:600000, plazo:'Desde 4 meses, sujeto a agenda del tribunal', juicio:true,  incluye:'Demanda o solicitud de cuidado personal, representación en audiencia y gestión hasta la sentencia.', requiere:'Datos de los hijos y antecedentes del caso.' },
  { id:'prot', area:'familia',    name:'Medidas de protección',                     price:350000, plazo:'Sujeto a agenda del tribunal', juicio:true,  incluye:'Solicitud de medidas de protección, representación y seguimiento ante el tribunal de familia.', requiere:'Antecedentes del caso y datos de las personas involucradas.' },
  { id:'vif',  area:'familia',    name:'Causas de violencia intrafamiliar (VIF)',   price:350000, plazo:'Sujeto a agenda del tribunal', juicio:true,  incluye:'Denuncia o demanda por VIF, solicitud de medidas cautelares y representación en audiencia.', requiere:'Relato de los hechos y datos de las partes.' },
  { id:'comp', area:'familia',    name:'Comparecencia a audiencia',                 price:70000,  plazo:'Según fecha de la audiencia', incluye:'Comparecencia y representación de la abogada en una audiencia determinada.', requiere:'Rol y tribunal de la causa y fecha de la audiencia.' },
  { id:'escr', area:'familia',    name:'Presentación de escritos',                  price:25000,  plazo:'48 horas hábiles', incluye:'Redacción y presentación de escritos en una causa de familia en curso.', requiere:'Rol y tribunal de la causa y el escrito requerido.' },
  { id:'otros',area:'consulta',   name:'Asesoría inicial (se descuenta al contratar)', price:15000, plazo:'Videollamada · se agenda tras el pago', incluye:'Videollamada de asesoría con la abogada para evaluar tu caso y orientarte. Su valor de $15.000 se descuenta si luego contratas un servicio.', requiere:'Una breve descripción de lo que necesitas.' },
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
