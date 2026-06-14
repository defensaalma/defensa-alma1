// Generación documental: rellena las plantillas paramétricas (.docx) con los datos
// del caso. Las plantillas usan campos {{ASI}} y viven en templates_docx/.
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const DIR = path.join(__dirname, 'templates_docx');

// serviceId del catálogo -> archivo de plantilla
const TEMPLATE = {
  div:  '01_Divorcio_de_comun_acuerdo.docx',
  ali:  '02_Demanda_de_alimentos.docx',
  rdr:  '03_Regulacion_relacion_directa_y_regular.docx',
  sal:  '04_Autorizacion_salida_del_pais.docx',
  vtemp:'05_Solicitud_visa_temporal.docx',
  pdef: '06_Solicitud_permanencia_definitiva.docx',
  rec:  '07_Recurso_rechazo_SNM.docx',
  hijo: '08_Reconocimiento_inscripcion_hijo.docx',
  mand: '09_Mandato_general_o_especial.docx',
  prom: '10_Promesa_de_compraventa.docx',
  cv:   '11_Compraventa_bien_raiz.docx',
  liq:  '12_Liquidacion_sociedad_conyugal.docx',
  pos:  '13_Posesion_efectiva_intestada.docx',
  nom:  '14_Cambio_de_nombre_rectificacion.docx',
  marca:'15_Registro_de_marca_INAPI.docx',
  mera: '16_Escrito_de_mera_tramitacion.docx',
};

function templatePath(serviceId) {
  const f = TEMPLATE[serviceId];
  return f ? path.join(DIR, f) : null;
}
function hasTemplate(serviceId) {
  const p = templatePath(serviceId);
  return p && fs.existsSync(p);
}

// Lee los campos {{...}} de una plantilla (en orden de aparición, sin repetir).
function listPlaceholders(serviceId) {
  const p = templatePath(serviceId);
  if (!p || !fs.existsSync(p)) return [];
  const zip = new PizZip(fs.readFileSync(p));
  const xml = zip.file('word/document.xml').asText();
  const seen = new Set(); const out = [];
  const re = /\{\{([A-ZÁÉÍÓÚÑ0-9_]+)\}\}/g; let m;
  while ((m = re.exec(xml))) { if (!seen.has(m[1])) { seen.add(m[1]); out.push(m[1]); } }
  return out;
}

// Valores que se pueden prellenar automáticamente con los datos del caso.
function autofill(serviceId, ctx) {
  const keys = listPlaceholders(serviceId);
  const fecha = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const NOMBRE = ['NOMBRE_SOLICITANTE','NOMBRE_DEMANDANTE','NOMBRE_RECURRENTE','NOMBRE_MANDANTE','NOMBRE_PARTE','NOMBRE_CONYUGE_1'];
  const RUT = ['RUT_SOLICITANTE','RUT_DEMANDANTE','RUT_RECURRENTE','RUT_MANDANTE','RUT_PARTE','RUT_CONYUGE_1','RUT_O_IDENTIFICACION','RUT_O_PASAPORTE'];
  const out = {};
  for (const k of keys) {
    if (NOMBRE.includes(k)) out[k] = ctx.nombre || '';
    else if (RUT.includes(k)) out[k] = ctx.rut || '';
    else if (k === 'DOMICILIO') out[k] = ctx.domicilio || '';
    else if (k === 'CORREO') out[k] = ctx.correo || '';
    else if (k === 'TRIBUNAL') out[k] = ctx.tribunal || '';
    else if (k === 'ROL') out[k] = ctx.rol || '';
    else if (k === 'FECHA') out[k] = fecha;
    else out[k] = '';
  }
  return out;
}

// Genera el .docx con los datos dados. Devuelve un Buffer.
function generate(serviceId, data) {
  const p = templatePath(serviceId);
  if (!p) throw new Error('No hay plantilla para este servicio');
  const zip = new PizZip(fs.readFileSync(p, 'binary'));
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true, linebreaks: true,
    nullGetter: () => '', // campos sin valor quedan en blanco
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { TEMPLATE, hasTemplate, templatePath, listPlaceholders, autofill, generate };
