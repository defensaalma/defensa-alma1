require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const { query, token } = require('./db');
const { CATALOG, AREAS, byId, defaultMilestones } = require('./catalog');
const webpay = require('./webpay');
const docgen = require('./docgen');
const agenda = require('./agenda');
const { sendMail, accessEmail } = require('./mailer');
const V = require('./templates');

const DOCS_DIR = process.env.DOCS_DIR || path.join(__dirname, 'data', 'docs');
fs.mkdirSync(DOCS_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
app.set('trust proxy', 1);

// Seguridad
const TOKEN_TTL_DAYS = Number(process.env.TOKEN_TTL_DAYS || 90);
const LOGIN_MAX = Number(process.env.LOGIN_MAX || 5);
const LOGIN_LOCK_MIN = Number(process.env.LOGIN_LOCK_MIN || 15);
const loginAttempts = new Map();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambia-esto-en-produccion',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: String(process.env.SECURE_COOKIES) === 'true' },
}));
app.use('/static', express.static(path.join(__dirname, 'public')));

// ---------- utilidades ----------
const clp = n => '$' + Number(n).toLocaleString('es-CL');
const one = async (sql, p) => (await query(sql, p)).rows[0];
const many = async (sql, p) => (await query(sql, p)).rows;
function validRut(v){ v=String(v).replace(/[^0-9kK]/g,'').toUpperCase(); if(v.length<2)return false;
  const b=v.slice(0,-1),dv=v.slice(-1); if(!/^\d+$/.test(b))return false;
  let s=0,m=2; for(let i=b.length-1;i>=0;i--){s+=+b[i]*m;m=m===7?2:m+1;} const r=11-(s%11);
  const c=r===11?'0':r===10?'K':String(r); return c===dv; }
const fmtRut = v => { v=String(v).replace(/[^0-9kK]/g,'').toUpperCase(); if(v.length<2)return v;
  let b=v.slice(0,-1),d=v.slice(-1); return b.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+d; };
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));

// ---------- acceso a datos ----------
async function createCase({ nombre, rut, domicilio, correo, serviceId }) {
  const svc = byId(serviceId);
  if (!svc) throw new Error('Servicio no válido');
  const cl = await one('INSERT INTO clients (nombre,rut,domicilio,correo) VALUES ($1,$2,$3,$4) RETURNING id',
    [nombre, fmtRut(rut), domicilio, correo]);
  const tk = token();
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 86400000).toISOString();
  const cs = await one('INSERT INTO cases (client_id,service_id,service_name,area,price,token,token_expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [cl.id, svc.id, svc.name, svc.area, svc.price, tk, expires]);
  const labels = defaultMilestones(svc);
  for (let i = 0; i < labels.length; i++) {
    await query('INSERT INTO milestones (case_id,label,state,ord) VALUES ($1,$2,$3,$4)',
      [cs.id, labels[i], i === 0 ? 'done' : 'todo', i]);
  }
  return { caseId: cs.id, token: tk, svc };
}

const caseByToken = tk => one(`SELECT c.*, cl.nombre, cl.rut, cl.domicilio, cl.correo
  FROM cases c JOIN clients cl ON cl.id=c.client_id WHERE c.token=$1`, [tk]);
const caseById = id => one(`SELECT c.*, cl.nombre, cl.rut, cl.domicilio, cl.correo
  FROM cases c JOIN clients cl ON cl.id=c.client_id WHERE c.id=$1`, [id]);
const milestonesOf = id => many('SELECT * FROM milestones WHERE case_id=$1 ORDER BY ord', [id]);
const notifsOf = id => many('SELECT * FROM notifications WHERE case_id=$1 ORDER BY id DESC', [id]);
const docsOf = id => many('SELECT * FROM documents WHERE case_id=$1 ORDER BY id DESC', [id]);
const apptOf = id => one("SELECT * FROM appointments WHERE case_id=$1 AND status='agendada' ORDER BY id DESC", [id]);
const takenSlots = async () => (await many("SELECT starts_at FROM appointments WHERE status='agendada'")).map(r => r.starts_at);

// Estado del enlace del cliente: ok | expired | revoked | missing
function tokenStatus(c) {
  if (!c) return 'missing';
  if (c.token_revoked) return 'revoked';
  if (c.token_expires_at && Date.now() > new Date(c.token_expires_at).getTime()) return 'expired';
  return 'ok';
}
async function regenerateToken(caseId) {
  const tk = token();
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 86400000).toISOString();
  await query('UPDATE cases SET token=$1, token_expires_at=$2, token_revoked=0 WHERE id=$3', [tk, expires, caseId]);
  return { tk, expires };
}

async function markPaid(caseId) {
  await query("UPDATE cases SET status='pagado', paid_at=now(), paid_seen=0 WHERE id=$1", [caseId]);
  const ms = await milestonesOf(caseId);
  const pago = ms.find(m => /pago/i.test(m.label));
  if (pago) await query("UPDATE milestones SET state='done' WHERE id=$1", [pago.id]);
  const next = ms.find(m => m.state === 'todo' && (!pago || m.ord > pago.ord));
  if (next) await query("UPDATE milestones SET state='now' WHERE id=$1", [next.id]);
  const c = await caseById(caseId);
  const admin = process.env.ADMIN_EMAIL;
  if (admin && c) {
    sendMail(admin, `Nuevo pago recibido — ${c.service_name}`,
      `<p>Llegó una nueva solicitud <b>con pago</b>:</p>
       <p><b>${c.nombre}</b> · ${c.service_name} · $${Number(c.price).toLocaleString('es-CL')}</p>
       <p><a href="${BASE_URL}/admin/case/${c.id}">Ver el caso en el panel</a></p>`).catch(() => {});
  }
}

// Health check
app.get('/healthz', (req, res) => res.json({ ok: true }));

// ================= PÚBLICO =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/api/catalog', (req, res) => res.json({ areas: AREAS, services: CATALOG }));

app.get('/contratar/:sid', (req, res) => {
  const svc = byId(req.params.sid);
  if (!svc) return res.status(404).send('Servicio no encontrado');
  const err = req.query.e ? `<div class="flash err">${req.query.e}</div>` : '';
  const gratis = Number(svc.price) <= 0;
  res.send(V.layout(gratis ? 'Agendar atención' : 'Contratar', `
    <a href="/" class="muted">← Volver</a>
    <h1 class="serif" style="margin-top:.4rem">${gratis ? 'Agenda tu primera atención' : 'Contratar trámite'}</h1>
    <div class="case-box"><div class="t">${AREAS[svc.area]}</div><div class="n">${svc.name}</div>
      <div class="j">${gratis ? 'Primera atención gratuita por videollamada' : 'Tarifa fija ' + clp(svc.price) + ' · ' + svc.plazo}</div></div>
    ${err}
    <div class="card">
      <div class="eyebrow">Tus datos</div>
      <p class="muted">Con estos datos creamos tu cuenta y el enlace privado para seguir tu ${gratis ? 'atención' : 'trámite'}.</p>
      <form method="POST" action="/contratar/${svc.id}">
        <label>Nombre completo</label><input name="nombre" required placeholder="María José Pérez Soto">
        <label>RUT</label><input name="rut" required placeholder="12.345.678-9">
        <label>Domicilio</label><input name="domicilio" required placeholder="Calle, número, comuna, ciudad">
        <label>Correo electrónico</label><input name="correo" type="email" required placeholder="tu@correo.cl">
        <button class="btn full" style="margin-top:1rem">${gratis ? 'Registrarme y agendar' : 'Crear mi cuenta y continuar'}</button>
      </form>
      <p class="muted" style="text-align:center;margin-top:.5rem">${gratis ? 'Te contactaremos para coordinar tu videollamada gratuita' : 'Siguiente: pago seguro con Webpay'}</p>
    </div>
  `));
});

app.post('/contratar/:sid', async (req, res) => {
  const svc = byId(req.params.sid);
  if (!svc) return res.status(404).send('Servicio no encontrado');
  const { nombre, rut, domicilio, correo } = req.body;
  const back = m => res.redirect(`/contratar/${svc.id}?e=${encodeURIComponent(m)}`);
  if (!nombre || nombre.trim().length < 5) return back('Ingresa tu nombre completo.');
  if (!validRut(rut)) return back('Ingresa un RUT válido.');
  if (!domicilio || domicilio.trim().length < 5) return back('Ingresa tu domicilio.');
  if (!validEmail(correo)) return back('Ingresa un correo electrónico válido.');
  const { token: tk } = await createCase({ nombre: nombre.trim(), rut, domicilio: domicilio.trim(), correo: correo.trim(), serviceId: svc.id });
  const link = `${BASE_URL}/portal/${tk}`;
  try { await sendMail(correo.trim(), 'Tu cuenta en Defensa Alma', accessEmail(nombre.trim(), link)); } catch (e) {}
  res.redirect(`/portal/${tk}`);
});

app.post('/api/cases', async (req, res) => {
  const { nombre, rut, domicilio, correo, serviceId } = req.body;
  if (!nombre || nombre.trim().length < 5) return res.status(400).json({ error: 'nombre' });
  if (!validRut(rut)) return res.status(400).json({ error: 'rut' });
  if (!domicilio || domicilio.trim().length < 5) return res.status(400).json({ error: 'domicilio' });
  if (!validEmail(correo)) return res.status(400).json({ error: 'correo' });
  if (!byId(serviceId)) return res.status(400).json({ error: 'serviceId' });
  const { token: tk, caseId } = await createCase({ nombre: nombre.trim(), rut, domicilio: domicilio.trim(), correo: correo.trim(), serviceId });
  const link = `${BASE_URL}/portal/${tk}`;
  try { await sendMail(correo.trim(), 'Tu cuenta en Defensa Alma', accessEmail(nombre.trim(), link)); } catch (e) {}
  res.json({ caseId, token: tk, portalUrl: link });
});

// Portal del cliente
app.get('/portal/:token', async (req, res) => {
  const c = await caseByToken(req.params.token);
  const st = tokenStatus(c);
  if (st === 'missing') return res.status(404).send(V.layout('No encontrado', '<div class="card"><h1 class="serif">Enlace no válido</h1><p class="muted">Revisa el enlace que te enviamos por correo.</p></div>'));
  if (st === 'revoked') return res.status(403).send(V.linkBlocked('revoked', c));
  if (st === 'expired') return res.status(410).send(V.linkBlocked('expired', c));
  const docs = (await docsOf(c.id)).filter(d => d.visible_cliente);
  res.send(V.clientPortal(c, await milestonesOf(c.id), await notifsOf(c.id), docs, await apptOf(c.id), agenda.roomUrl));
});

const needsPayment = c => Number(c.price) > 0 && c.status === 'nuevo';

// Agenda de videollamada
app.get('/portal/:token/agenda', async (req, res) => {
  const c = await caseByToken(req.params.token);
  if (tokenStatus(c) !== 'ok') return res.status(403).send('Acceso no disponible');
  if (needsPayment(c)) return res.redirect(`/portal/${c.token}`);
  res.send(V.agendaPicker(c, agenda.availableSlots(await takenSlots())));
});
app.post('/portal/:token/agenda', async (req, res) => {
  const c = await caseByToken(req.params.token);
  if (tokenStatus(c) !== 'ok') return res.status(403).send('Acceso no disponible');
  if (needsPayment(c)) return res.redirect(`/portal/${c.token}`);
  const slots = agenda.availableSlots(await takenSlots());
  const chosen = slots.find(s => s.value === req.body.slot);
  if (!chosen) return res.redirect(`/portal/${c.token}/agenda`);
  await query("UPDATE appointments SET status='cancelada' WHERE case_id=$1 AND status='agendada'", [c.id]);
  const room = agenda.newRoom();
  await query('INSERT INTO appointments (case_id,starts_at,label,room) VALUES ($1,$2,$3,$4)', [c.id, chosen.value, chosen.label, room]);
  const ms = await milestonesOf(c.id);
  const vm = ms.find(m => /videollamada|atenci[oó]n|audiencia/i.test(m.label));
  if (vm) {
    await query("UPDATE milestones SET state='done' WHERE id=$1", [vm.id]);
    const next = ms.find(m => m.state === 'todo' && m.ord > vm.ord);
    if (next) await query("UPDATE milestones SET state='now' WHERE id=$1", [next.id]);
  }
  await query('INSERT INTO notifications (case_id,text) VALUES ($1,$2)', [c.id, `Videollamada agendada: ${chosen.label}`]);
  const link = agenda.roomUrl(room);
  sendMail(c.correo, 'Videollamada agendada — Defensa Alma',
    `<p>Hola, ${c.nombre.split(' ')[0]}. Tu videollamada quedó agendada para <b>${chosen.label}</b>.</p>
     <p>Entra a la sala desde tu panel, o directamente aquí a la hora indicada: <a href="${link}">${link}</a></p>`).catch(() => {});
  if (process.env.ADMIN_EMAIL) sendMail(process.env.ADMIN_EMAIL, `Nueva videollamada agendada — ${c.nombre}`,
    `<p><b>${c.nombre}</b> agendó videollamada para <b>${chosen.label}</b> (${c.service_name}).</p><p>Sala: <a href="${link}">${link}</a></p><p><a href="${BASE_URL}/admin/case/${c.id}">Ver el caso</a></p>`).catch(() => {});
  res.redirect(`/portal/${c.token}`);
});

// Descarga de documento por el cliente
app.get('/portal/:token/doc/:docId', async (req, res) => {
  const c = await caseByToken(req.params.token);
  if (tokenStatus(c) !== 'ok') return res.status(403).send('Acceso no disponible');
  const d = await one('SELECT * FROM documents WHERE id=$1 AND case_id=$2 AND visible_cliente=1', [req.params.docId, c.id]);
  if (!d) return res.status(404).send('Documento no encontrado');
  res.download(path.join(DOCS_DIR, d.filename), d.label.replace(/[^\w\sÁÉÍÓÚÑáéíóúñ.-]/g, '') + '.docx');
});

// Enlace nuevo cuando venció
app.post('/portal/:token/relink', async (req, res) => {
  const c = await caseByToken(req.params.token);
  if (!c) return res.status(404).send(V.layout('No encontrado', '<div class="card"><h1 class="serif">Enlace no válido</h1></div>'));
  if (c.token_revoked) return res.status(403).send(V.linkBlocked('revoked', c));
  const { tk } = await regenerateToken(c.id);
  const link = `${BASE_URL}/portal/${tk}`;
  try { await sendMail(c.correo, 'Tu nuevo enlace de acceso — Defensa Alma', accessEmail(c.nombre, link)); } catch (e) {}
  res.send(V.linkSent(c.correo));
});

// ---------- Pago Webpay ----------
app.post('/pay/start/:caseId', async (req, res) => {
  const c = await caseById(req.params.caseId);
  if (!c) return res.status(404).send('Caso no encontrado');
  if (c.status !== 'nuevo' || c.price <= 0) return res.redirect(`/portal/${c.token}`);
  const buyOrder = ('DA' + c.id + 'T' + Date.now()).slice(0, 26);
  const sessionId = ('s' + c.id + '-' + token().slice(0, 8)).slice(0, 61);
  const returnUrl = `${BASE_URL}/pay/return`;
  await query('INSERT INTO payments (case_id,buy_order,session_id,amount) VALUES ($1,$2,$3,$4)', [c.id, buyOrder, sessionId, c.price]);
  if (webpay.isDemo()) {
    await query("UPDATE payments SET status='aprobado', token_ws='DEMO' WHERE buy_order=$1", [buyOrder]);
    await markPaid(c.id);
    return res.redirect(`/pay/return?demo=1&order=${encodeURIComponent(buyOrder)}`);
  }
  try {
    const { url, token: tkws } = await webpay.createTransaction({ buyOrder, sessionId, amount: c.price, returnUrl });
    await query('UPDATE payments SET token_ws=$1 WHERE buy_order=$2', [tkws, buyOrder]);
    res.send(`<!DOCTYPE html><html><body onload="document.forms[0].submit()">
      <form method="POST" action="${url}"><input type="hidden" name="token_ws" value="${tkws}"></form>
      <p style="font-family:sans-serif">Redirigiendo a Webpay…</p></body></html>`);
  } catch (e) {
    console.error('webpay create', e.message);
    res.send(V.payResult(false, c, 'No se pudo iniciar el pago. Verifica la conexión o las credenciales de Transbank. (' + e.message + ')'));
  }
});

async function handleReturn(req, res) {
  if (req.query.demo) {
    const p = await one('SELECT * FROM payments WHERE buy_order=$1', [req.query.order]);
    const c = p ? await caseById(p.case_id) : null;
    return res.send(V.payResult(true, c, `Pago aprobado por ${clp(c ? c.price : 0)} (ambiente demo).`));
  }
  const tkws = req.body.token_ws || req.query.token_ws;
  if (!tkws) return res.send(V.payResult(false, null, 'Pago anulado o sin token.'));
  const pay = await one('SELECT * FROM payments WHERE token_ws=$1', [tkws]);
  const c = pay ? await caseById(pay.case_id) : null;
  try {
    const r = await webpay.commitTransaction(tkws);
    const approved = r.status === 'AUTHORIZED' && r.response_code === 0;
    await query('UPDATE payments SET status=$1, authorization_code=$2 WHERE token_ws=$3',
      [approved ? 'aprobado' : 'rechazado', r.authorization_code || null, tkws]);
    if (approved && c) await markPaid(c.id);
    res.send(V.payResult(approved, c, approved
      ? `Pago aprobado por ${clp(r.amount)}. Código de autorización ${r.authorization_code}.`
      : 'El pago no fue aprobado. Puedes intentarlo nuevamente desde tu panel.'));
  } catch (e) {
    console.error('webpay commit', e.message);
    res.send(V.payResult(false, c, 'No se pudo confirmar el pago: ' + e.message));
  }
}
app.post('/pay/return', handleReturn);
app.get('/pay/return', handleReturn);

// ================= ADMIN =================
function requireAdmin(req, res, next) { if (req.session.adminId) return next(); res.redirect('/admin/login'); }

app.get('/admin/login', (req, res) => res.send(V.adminLogin(req.query.e)));
app.post('/admin/login', async (req, res) => {
  const key = req.ip || 'x';
  let rec = loginAttempts.get(key);
  if (rec && rec.lockedUntil && rec.lockedUntil > Date.now()) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    return res.send(V.adminLogin(`Demasiados intentos fallidos. Vuelve a intentar en ${mins} minuto(s).`));
  }
  const a = await one('SELECT * FROM admins WHERE email=$1', [(req.body.email || '').trim().toLowerCase()]);
  const ok = a && bcrypt.compareSync(req.body.password || '', a.password_hash);
  if (!ok) {
    if (!rec || (rec.lockedUntil && rec.lockedUntil <= Date.now())) rec = { count: 0, lockedUntil: 0 };
    rec.count += 1;
    let msg = 'Credenciales incorrectas.';
    if (rec.count >= LOGIN_MAX) { rec.lockedUntil = Date.now() + LOGIN_LOCK_MIN * 60000; rec.count = 0; msg = `Demasiados intentos fallidos. Acceso bloqueado por ${LOGIN_LOCK_MIN} minutos.`; }
    else { msg += ` Te quedan ${LOGIN_MAX - rec.count} intento(s) antes del bloqueo.`; }
    loginAttempts.set(key, rec);
    return res.send(V.adminLogin(msg));
  }
  loginAttempts.delete(key);
  req.session.adminId = a.id;
  res.redirect('/admin');
});
app.get('/admin/logout', (req, res) => { req.session.destroy(() => res.redirect('/admin/login')); });

app.get('/admin', requireAdmin, async (req, res) => {
  const cases = await many(`SELECT c.*, cl.nombre FROM cases c JOIN clients cl ON cl.id=c.client_id ORDER BY c.id DESC`);
  const groups = {
    alertas: cases.filter(c => c.paid_at && Number(c.paid_seen) === 0),
    conPago: cases.filter(c => c.paid_at),
    sinPago: cases.filter(c => !c.paid_at && Number(c.price) > 0 && c.status === 'nuevo'),
    consultas: cases.filter(c => Number(c.price) === 0),
  };
  res.send(V.adminList(groups, webpay.mode()));
});
app.post('/admin/alerts/seen', requireAdmin, async (req, res) => {
  await query('UPDATE cases SET paid_seen=1 WHERE paid_at IS NOT NULL AND paid_seen=0');
  res.redirect('/admin');
});
app.get('/admin/case/:id', requireAdmin, async (req, res) => {
  const c = await caseById(req.params.id); if (!c) return res.status(404).send('No encontrado');
  await query('UPDATE cases SET paid_seen=1 WHERE id=$1', [c.id]);
  res.send(V.adminCase(c, await milestonesOf(c.id), await notifsOf(c.id), await docsOf(c.id), docgen.hasTemplate(c.service_id), await apptOf(c.id), agenda.roomUrl));
});
app.post('/admin/case/:id/appt/:aid/:action', requireAdmin, async (req, res) => {
  const map = { done: 'realizada', cancel: 'cancelada' };
  const st = map[req.params.action];
  if (st) await query('UPDATE appointments SET status=$1 WHERE id=$2 AND case_id=$3', [st, req.params.aid, req.params.id]);
  res.redirect('/admin/case/' + req.params.id);
});

// Generación documental
app.get('/admin/case/:id/doc', requireAdmin, async (req, res) => {
  const c = await caseById(req.params.id); if (!c) return res.status(404).send('No encontrado');
  if (!docgen.hasTemplate(c.service_id)) return res.send('Este servicio no tiene plantilla asociada.');
  res.send(V.docForm(c, docgen.listPlaceholders(c.service_id), docgen.autofill(c.service_id, c)));
});
app.post('/admin/case/:id/doc', requireAdmin, async (req, res) => {
  const c = await caseById(req.params.id); if (!c) return res.status(404).send('No encontrado');
  if (!docgen.hasTemplate(c.service_id)) return res.status(400).send('Sin plantilla');
  const fields = docgen.listPlaceholders(c.service_id);
  const data = {}; fields.forEach(k => { data[k] = (req.body[k] || '').trim(); });
  let buffer;
  try { buffer = docgen.generate(c.service_id, data); }
  catch (e) { console.error('docgen', e.message); return res.status(500).send('Error al generar el documento: ' + e.message); }
  const filename = `caso${c.id}_${c.service_id}_${Date.now()}.docx`;
  fs.writeFileSync(path.join(DOCS_DIR, filename), buffer);
  const visible = req.body.visible_cliente ? 1 : 0;
  await query('INSERT INTO documents (case_id,label,filename,visible_cliente) VALUES ($1,$2,$3,$4)', [c.id, c.service_name, filename, visible]);
  res.redirect('/admin/case/' + c.id);
});
app.get('/admin/case/:id/doc/:docId/download', requireAdmin, async (req, res) => {
  const d = await one('SELECT * FROM documents WHERE id=$1 AND case_id=$2', [req.params.docId, req.params.id]);
  if (!d) return res.status(404).send('No encontrado');
  res.download(path.join(DOCS_DIR, d.filename), d.label.replace(/[^\w\sÁÉÍÓÚÑáéíóúñ.-]/g, '') + '.docx');
});
app.post('/admin/case/:id/doc/:docId/delete', requireAdmin, async (req, res) => {
  const d = await one('SELECT * FROM documents WHERE id=$1 AND case_id=$2', [req.params.docId, req.params.id]);
  if (d) { try { fs.unlinkSync(path.join(DOCS_DIR, d.filename)); } catch (e) {} await query('DELETE FROM documents WHERE id=$1', [d.id]); }
  res.redirect('/admin/case/' + req.params.id);
});
app.post('/admin/case/:id/meta', requireAdmin, async (req, res) => {
  await query('UPDATE cases SET rol=$1, tribunal=$2, status=$3 WHERE id=$4',
    [req.body.rol || null, req.body.tribunal || null, req.body.status, req.params.id]);
  res.redirect('/admin/case/' + req.params.id);
});
app.post('/admin/case/:id/milestone/:mid', requireAdmin, async (req, res) => {
  await query('UPDATE milestones SET state=$1 WHERE id=$2 AND case_id=$3', [req.body.state, req.params.mid, req.params.id]);
  res.redirect('/admin/case/' + req.params.id);
});
app.post('/admin/case/:id/revoke', requireAdmin, async (req, res) => {
  await query('UPDATE cases SET token_revoked=1 WHERE id=$1', [req.params.id]);
  res.redirect('/admin/case/' + req.params.id);
});
app.post('/admin/case/:id/relink', requireAdmin, async (req, res) => {
  const c = await caseById(req.params.id);
  if (c) {
    const { tk } = await regenerateToken(c.id);
    const link = `${BASE_URL}/portal/${tk}`;
    try { await sendMail(c.correo, 'Tu nuevo enlace de acceso — Defensa Alma', accessEmail(c.nombre, link)); } catch (e) {}
  }
  res.redirect('/admin/case/' + req.params.id);
});
app.post('/admin/case/:id/notify', requireAdmin, async (req, res) => {
  const c = await caseById(req.params.id);
  if (c && req.body.text) {
    await query('INSERT INTO notifications (case_id,text) VALUES ($1,$2)', [c.id, req.body.text.trim()]);
    try { await sendMail(c.correo, 'Novedad en tu trámite — Defensa Alma',
      `<p>Hola, ${c.nombre.split(' ')[0]}. Tienes una novedad en tu caso:</p><p><b>${req.body.text}</b></p><p><a href="${BASE_URL}/portal/${c.token}">Ver mi caso</a></p>`); } catch (e) {}
  }
  res.redirect('/admin/case/' + req.params.id);
});

// Arranque: auto-crea el admin y levanta el servidor.
(async function start() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (email && process.env.ADMIN_PASSWORD) {
    const exists = await one('SELECT id FROM admins WHERE email=$1', [email]);
    if (!exists) {
      await query('INSERT INTO admins (email,password_hash) VALUES ($1,$2)', [email, bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)]);
      console.log('Admin creado:', email);
    }
  }
  app.listen(PORT, () => {
    console.log(`Defensa Alma — plataforma escuchando en ${BASE_URL}`);
    console.log('Pago:', webpay.mode());
  });
})();
