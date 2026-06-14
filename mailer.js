// Envío de correos. En producción usa SMTP (tu correo de Hostinger u otro
// proveedor) vía variables de entorno. Si no hay SMTP configurado, funciona en
// "modo desarrollo": guarda los correos en data/outbox.log y los muestra en consola.
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const FROM = process.env.MAIL_FROM || 'Defensa Alma <contacto@defensaalma.cl>';
let transport = null;

if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail(to, subject, html) {
  if (transport) {
    await transport.sendMail({ from: FROM, to, subject, html });
    return { ok: true, mode: 'smtp' };
  }
  // Modo desarrollo: registrar el correo.
  const line = `\n[${new Date().toISOString()}] PARA: ${to}\nASUNTO: ${subject}\n${html}\n${'-'.repeat(60)}\n`;
  const out = path.join(__dirname, 'data', 'outbox.log');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.appendFileSync(out, line);
  console.log(`[mailer:dev] correo registrado en data/outbox.log → ${to} · ${subject}`);
  return { ok: true, mode: 'dev' };
}

function accessEmail(nombre, link) {
  return `
  <div style="font-family:Arial,sans-serif;color:#2E3350;max-width:520px">
    <h2 style="color:#33406F">Hola, ${nombre.split(' ')[0]}</h2>
    <p>Tu cuenta en Defensa Alma está lista. Con este enlace privado puedes seguir tu trámite en línea cuando quieras:</p>
    <p><a href="${link}" style="background:#E8915B;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Ver mi caso</a></p>
    <p style="font-size:13px;color:#7C84A1">O copia este enlace: ${link}</p>
    <hr style="border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#9aa">Defensa Alma · Estudio Jurídico · defensaalma.cl</p>
  </div>`;
}

module.exports = { sendMail, accessEmail };
