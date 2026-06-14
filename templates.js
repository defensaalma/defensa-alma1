// Vistas renderadas en el servidor (portal del cliente y panel de la abogada).
const clp = n => '$' + Number(n).toLocaleString('es-CL');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ts = v => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? esc(v) : d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

function layout(title, body, opts = {}) {
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · Defensa Alma</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--blue:#4B5BA0;--blue-deep:#3D4D8C;--blue-ink:#33406F;--coral:#E8915B;--coral-deep:#D9783F;--peach:#FBEEDF;--cream:#FBF6EE;--cream2:#F4ECDD;--ink:#2E3350;--muted:#7C84A1;--line:#E7E0D0;--green:#4FA079}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;background:var(--cream);color:var(--ink);line-height:1.6}
a{color:var(--blue-deep)}.serif{font-family:'Cormorant Garamond',serif}
.top{background:var(--blue-deep);color:#fff;padding:1rem 1.4rem;display:flex;align-items:center;justify-content:space-between}
.top .b{font-family:'Cormorant Garamond';font-weight:700;font-size:1.4rem}
.top .b small{font-family:'Inter';font-weight:600;font-size:.62rem;letter-spacing:.3em;color:var(--coral);display:block;margin-top:-4px}
.top a{color:rgba(255,255,255,.85);font-size:.85rem}
.wrap{max-width:760px;margin:0 auto;padding:1.6rem 1.2rem}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:1.6rem;box-shadow:0 12px 30px -20px rgba(51,64,111,.4);margin-bottom:1.1rem}
h1.serif{font-size:1.9rem;color:var(--blue-ink);font-weight:700}
.case-box{background:var(--blue-deep);color:#fff;border-radius:12px;padding:1.1rem 1.3rem;margin:1rem 0}
.case-box .t{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--coral);font-weight:700}
.case-box .n{font-family:'Cormorant Garamond';font-size:1.5rem;font-weight:700;margin:.1rem 0}
.case-box .j{font-size:.8rem;color:rgba(255,255,255,.75)}
.eyebrow{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--coral-deep);margin-bottom:.5rem}
.tl{list-style:none}.tl li{display:flex;align-items:center;gap:.7rem;padding:.45rem 0;font-size:.95rem}
.tl .ic{width:24px;height:24px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:13px}
.tl .done .ic{background:var(--green);color:#fff}.tl .now .ic{background:var(--coral);color:#fff;box-shadow:0 0 0 4px var(--peach)}
.tl .todo{color:var(--muted)}.tl .todo .ic{background:#fff;border:2px solid var(--line)}
.note{background:var(--peach);border-radius:10px;padding:.85rem 1rem;margin-top:.6rem}
.note .t{font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--coral-deep);font-weight:700}
.btn{display:inline-block;background:var(--coral);color:#fff;border:none;border-radius:999px;padding:.8rem 1.5rem;font-weight:600;font-size:.95rem;cursor:pointer;text-decoration:none}
.btn:hover{background:var(--coral-deep)}.btn.blue{background:var(--blue-deep)}.btn.full{display:block;text-align:center;width:100%}
.tag{display:inline-block;font-size:.66rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.25rem .6rem;border-radius:7px;color:#fff}
.tag.nuevo{background:#B98A33}.tag.pagado{background:var(--green)}.tag.en_proceso{background:var(--blue)}.tag.cerrado{background:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid var(--line)}th{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
input,select{font-family:'Inter';font-size:.95rem;padding:.7rem .85rem;border:1.5px solid var(--line);border-radius:10px;width:100%;background:#fff;color:var(--ink)}
label{display:block;font-size:.76rem;font-weight:600;color:var(--blue-ink);margin:.7rem 0 .25rem}
.row{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}
.muted{color:var(--muted);font-size:.88rem}
.pill{font-size:.8rem;color:var(--muted)}
form.inline{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.flash{background:#E4F3EC;border:1px solid #BFE3CF;color:#2C6B49;border-radius:10px;padding:.7rem 1rem;margin-bottom:1rem;font-size:.9rem}
.flash.err{background:#FDF2F0;border-color:#F3C9C2;color:#A23B2E}
.slotbtn{display:block;width:100%;text-align:left;background:#fff;border:1.5px solid var(--line);border-radius:11px;padding:.8rem 1rem;margin-bottom:.55rem;cursor:pointer;font-family:'Inter';font-size:.95rem;color:var(--ink)}
.slotbtn:hover{border-color:var(--coral);background:var(--peach)}
.live{display:inline-flex;align-items:center;gap:.4rem;font-size:.74rem;color:var(--muted);margin-top:.3rem}
.live .dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(79,160,121,.6);animation:lp 2s infinite}
@keyframes lp{0%{box-shadow:0 0 0 0 rgba(79,160,121,.5)}70%{box-shadow:0 0 0 7px rgba(79,160,121,0)}100%{box-shadow:0 0 0 0 rgba(79,160,121,0)}}
</style>${opts.head||''}</head><body>
<div class="top"><div class="b">Defensa Alma<small>ESTUDIO JURÍDICO</small></div><div>${opts.topRight||''}</div></div>
<div class="wrap">${body}</div>
</body></html>`;
}

const ICON_CHECK = '✓';

function clientPortal(c, milestones, notifications, documents = [], appt = null, roomUrl = (r => '#')) {
  const tl = milestones.map(m => `<li class="${m.state}"><span class="ic">${m.state==='done'?ICON_CHECK:m.state==='now'?'●':''}</span>${esc(m.label)}</li>`).join('');
  const notif = notifications.length
    ? notifications.map(n => `<div class="note"><div class="t">Notificación</div><div>${esc(n.text)}</div><div class="muted" style="font-size:.72rem">${ts(n.created_at)}</div></div>`).join('')
    : '<p class="muted">Aún no hay notificaciones.</p>';

  const needsPay = Number(c.price) > 0 && c.status === 'nuevo';
  const payBlock = needsPay
    ? `<div class="card"><div class="eyebrow">Pago pendiente</div>
        <p>Para iniciar tu trámite, paga la tarifa fija de <b>${clp(c.price)}</b> con Webpay.</p>
        <form method="POST" action="/pay/start/${c.id}" style="margin-top:1rem"><button class="btn full">Pagar ${clp(c.price)} con Webpay</button></form>
        <p class="muted" style="text-align:center;margin-top:.5rem">Pago seguro · Transbank Webpay</p></div>`
    : (appt
        ? `<div class="card"><div class="eyebrow">Tu videollamada</div>
            <p><b>${esc(appt.label)}</b>${Number(c.price) <= 0 ? ' · primera atención gratuita' : ''}</p>
            <a class="btn full" style="margin-top:.6rem" href="${roomUrl(appt.room)}" target="_blank" rel="noopener">Entrar a la videollamada</a>
            <p style="text-align:center;margin-top:.5rem"><a class="muted" href="/portal/${c.token}/agenda">Cambiar horario</a></p></div>`
        : `<div class="card"><div class="eyebrow">Atención por videollamada${Number(c.price) <= 0 ? ' · gratuita' : ''}</div>
            <p>Agenda tu videollamada con la abogada para conversar tu caso${Number(c.price) <= 0 ? '. Tu primera atención es gratuita.' : '.'}</p>
            <a class="btn full" style="margin-top:.6rem" href="/portal/${c.token}/agenda">Agendar mi videollamada</a></div>`);

  return layout('Mi caso', `
    <h1 class="serif">Hola, ${esc(c.nombre.split(' ')[0])}</h1>
    <p class="muted">Este es tu panel privado. Aquí sigues el estado de tu trámite.</p>
    <div class="live"><span class="dot"></span>Se actualiza automáticamente con cada avance de tu causa</div>
    <div class="case-box">
      <div class="t">${esc(c.service_name)} <span class="tag ${c.status}">${esc(c.status.replace('_',' '))}</span></div>
      <div class="n">${c.rol ? 'Causa N° '+esc(c.rol) : esc(c.service_name)}</div>
      <div class="j">${esc(c.tribunal || 'Tarifa fija ' + clp(c.price))}</div>
    </div>
    ${payBlock}
    <div class="card"><div class="eyebrow">Hitos del proceso</div><ul class="tl">${tl}</ul></div>
    <div class="card"><div class="eyebrow">Novedades</div>${notif}</div>
    <div class="card"><div class="eyebrow">Documentos de tu caso</div>
      ${documents.length
        ? documents.map(d => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:.5rem 0">
            <span>📄 ${esc(d.label)} <span class="muted" style="font-size:.74rem">· ${ts(d.created_at)}</span></span>
            <a class="btn blue" style="padding:.4rem .9rem;font-size:.82rem" href="/portal/${c.token}/doc/${d.id}">Descargar</a></div>`).join('')
        : '<p class="muted">Cuando la abogada prepare documentos de tu caso, aparecerán aquí para descargar.</p>'}
    </div>
    <p class="muted" style="text-align:center">Titular: ${esc(c.nombre)} · ${esc(c.rut)} · ${esc(c.correo)}</p>
  `, { head: '<meta http-equiv="refresh" content="45">' });
}

function payResult(ok, c, detail) {
  return layout(ok ? 'Pago aprobado' : 'Pago no completado', `
    <div class="card" style="text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:${ok?'#E4F3EC':'#FDF2F0'};display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:30px;color:${ok?'#4FA079':'#A23B2E'}">${ok?'✓':'✕'}</div>
      <h1 class="serif">${ok?'Pago aprobado':'Pago no completado'}</h1>
      <p class="muted">${esc(detail)}</p>
      ${c ? `<a class="btn blue" style="margin-top:1rem" href="/portal/${c.token}">Ir a mi caso</a>` : ''}
    </div>
  `);
}

function adminLogin(error) {
  return layout('Acceso', `
    <h1 class="serif">Panel de gestión</h1>
    <p class="muted">Ingreso del estudio jurídico.</p>
    ${error ? `<div class="flash err">${esc(error)}</div>` : ''}
    <div class="card"><form method="POST" action="/admin/login">
      <label>Correo</label><input name="email" type="email" required>
      <label>Contraseña</label><input name="password" type="password" required>
      <button class="btn full" style="margin-top:1rem">Entrar</button>
    </form></div>
  `);
}

function adminList(groups, payMode = '') {
  const row = c => `<tr>
    <td>#${c.id}</td>
    <td><a href="/admin/case/${c.id}">${esc(c.nombre)}</a><br><span class="muted">${esc(c.service_name)}</span></td>
    <td>${Number(c.price) > 0 ? clp(c.price) : 'Gratis'}</td>
    <td><span class="tag ${c.status}">${esc(c.status.replace('_',' '))}</span></td>
    <td class="muted">${ts(c.created_at)}</td>
  </tr>`;
  const table = (list, empty) => `<table>
      <tr><th>ID</th><th>Cliente / servicio</th><th>Tarifa</th><th>Estado</th><th>Ingreso</th></tr>
      ${list.length ? list.map(row).join('') : `<tr><td colspan="5" class="muted">${empty}</td></tr>`}
    </table>`;

  const alerta = groups.alertas.length ? `
    <div class="flash" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;background:#FBEEDF;border-color:#F3C9A2;color:#9A5A1E">
      <span>🔔 <b>${groups.alertas.length}</b> solicitud(es) <b>con pago</b> por revisar:
        ${groups.alertas.map(c => `<a href="/admin/case/${c.id}">${esc(c.nombre.split(' ')[0])} (${esc(c.service_name)})</a>`).join(' · ')}</span>
      <form method="POST" action="/admin/alerts/seen"><button class="btn" style="padding:.4rem .9rem;font-size:.82rem">Marcar vistas</button></form>
    </div>` : '';

  const payChip = payMode ? `<span class="pill" style="float:right;font-size:.8rem;color:${/PRODUCCI/.test(payMode) ? 'var(--green)' : 'var(--muted)'}">Pagos: <b>${esc(payMode)}</b></span>` : '';
  return layout('Casos', `
    ${payChip}
    <h1 class="serif">Casos</h1>
    ${alerta}
    <div class="row" style="gap:.6rem;margin-bottom:1rem">
      <span class="tag pagado">Con pago: ${groups.conPago.length}</span>
      <span class="tag nuevo">Sin pago: ${groups.sinPago.length}</span>
      <span class="tag" style="background:var(--blue)">Consultas gratuitas: ${groups.consultas.length}</span>
    </div>
    <div class="card"><div class="eyebrow">✅ Solicitudes con pago</div>${table(groups.conPago, 'Aún no hay solicitudes pagadas.')}</div>
    <div class="card"><div class="eyebrow">⏳ Registros sin pago</div>${table(groups.sinPago, 'No hay registros pendientes de pago.')}</div>
    <div class="card"><div class="eyebrow">💬 Consultas gratuitas (otros casos)</div>${table(groups.consultas, 'No hay consultas gratuitas.')}</div>
  `, { topRight: '<a href="/admin/logout">Salir</a>' });
}

function adminCase(c, milestones, notifications, documents = [], hasTemplate = false, appt = null, roomUrl = (r => '#')) {
  const ms = milestones.map(m => `<tr>
    <td>${esc(m.label)}</td>
    <td>
      <form class="inline" method="POST" action="/admin/case/${c.id}/milestone/${m.id}">
        <select name="state">
          <option value="todo" ${m.state==='todo'?'selected':''}>Pendiente</option>
          <option value="now" ${m.state==='now'?'selected':''}>En curso</option>
          <option value="done" ${m.state==='done'?'selected':''}>Completado</option>
        </select>
        <button class="btn blue" style="padding:.45rem .9rem;font-size:.82rem">Guardar</button>
      </form>
    </td></tr>`).join('');
  const notif = notifications.map(n => `<li>${esc(n.text)} <span class="muted" style="font-size:.72rem">· ${ts(n.created_at)}</span></li>`).join('') || '<li class="muted">Sin notificaciones.</li>';
  return layout('Caso #'+c.id, `
    <a href="/admin" class="muted">← Volver a casos</a>
    <h1 class="serif" style="margin-top:.4rem">${esc(c.nombre)} <span class="tag ${c.status}">${esc(c.status.replace('_',' '))}</span></h1>
    <div class="card">
      <div class="eyebrow">Datos del cliente y caso</div>
      <p><b>${esc(c.service_name)}</b> · ${clp(c.price)}</p>
      <p class="muted">${esc(c.rut)} · ${esc(c.domicilio)} · ${esc(c.correo)}</p>
      <p class="muted">Enlace del cliente: <a href="/portal/${c.token}">/portal/${c.token.slice(0,10)}…</a>
        — estado: <b style="color:${c.token_revoked?'#A23B2E':(c.token_expires_at&&Date.now()>Date.parse(c.token_expires_at)?'#B98A33':'#4FA079')}">${c.token_revoked?'Revocado':(c.token_expires_at&&Date.now()>Date.parse(c.token_expires_at)?'Vencido':'Vigente')}</b>
        ${c.token_expires_at?` · vence ${new Date(c.token_expires_at).toLocaleDateString('es-CL')}`:''}</p>
      <div class="row" style="margin-bottom:.4rem">
        <form method="POST" action="/admin/case/${c.id}/relink"><button class="btn blue" style="padding:.45rem .9rem;font-size:.82rem">Generar enlace nuevo</button></form>
        <form method="POST" action="/admin/case/${c.id}/revoke" onsubmit="return confirm('¿Revocar el acceso del cliente a este caso?')"><button class="btn" style="padding:.45rem .9rem;font-size:.82rem;background:#A23B2E">Revocar enlace</button></form>
      </div>
      <form class="row" method="POST" action="/admin/case/${c.id}/meta" style="margin-top:.8rem">
        <div style="flex:1;min-width:160px"><label>Rol de la causa</label><input name="rol" value="${esc(c.rol||'')}" placeholder="C-1234-2026"></div>
        <div style="flex:1;min-width:160px"><label>Tribunal</label><input name="tribunal" value="${esc(c.tribunal||'')}"></div>
        <div><label>Estado</label><select name="status">
          ${['nuevo','pagado','en_proceso','cerrado'].map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <button class="btn blue" style="margin-top:1.3rem">Guardar</button>
      </form>
    </div>
    <div class="card"><div class="eyebrow">Hitos</div><table>${ms}</table></div>
    <div class="card"><div class="eyebrow">Documentos</div>
      ${hasTemplate
        ? `<a class="btn" href="/admin/case/${c.id}/doc">Generar documento desde la plantilla</a>`
        : '<p class="muted">Este servicio no tiene plantilla paramétrica asociada.</p>'}
      ${documents.length ? `<table style="margin-top:1rem">${documents.map(d => `<tr>
          <td>📄 ${esc(d.label)} <span class="muted" style="font-size:.74rem">· ${ts(d.created_at)} · ${d.visible_cliente ? 'visible al cliente' : 'solo interno'}</span></td>
          <td style="text-align:right">
            <a class="btn blue" style="padding:.4rem .8rem;font-size:.8rem" href="/admin/case/${c.id}/doc/${d.id}/download">Descargar</a>
            <form class="inline" method="POST" action="/admin/case/${c.id}/doc/${d.id}/delete" style="display:inline" onsubmit="return confirm('¿Eliminar este documento?')"><button class="btn" style="padding:.4rem .7rem;font-size:.8rem;background:#A23B2E">Eliminar</button></form>
          </td></tr>`).join('')}</table>` : ''}
    </div>
    <div class="card"><div class="eyebrow">Atención · Videollamada</div>
      ${appt
        ? `<p><b>${esc(appt.label)}</b></p>
           <div class="row">
             <a class="btn blue" style="padding:.45rem .9rem;font-size:.82rem" href="${roomUrl(appt.room)}" target="_blank" rel="noopener">Entrar a la sala</a>
             <form class="inline" method="POST" action="/admin/case/${c.id}/appt/${appt.id}/done"><button class="btn" style="padding:.45rem .9rem;font-size:.82rem">Marcar realizada</button></form>
             <form class="inline" method="POST" action="/admin/case/${c.id}/appt/${appt.id}/cancel" onsubmit="return confirm('¿Cancelar esta videollamada?')"><button class="btn" style="padding:.45rem .9rem;font-size:.82rem;background:#A23B2E">Cancelar</button></form>
           </div>`
        : '<p class="muted">El cliente aún no agenda su videollamada.</p>'}
    </div>
    <div class="card"><div class="eyebrow">Notificaciones al cliente</div>
      <ul style="margin:.3rem 0 1rem 1rem">${notif}</ul>
      <form class="inline" method="POST" action="/admin/case/${c.id}/notify">
        <input name="text" placeholder="Ej: Audiencia agendada para el 18 de junio, 10:30 hrs" style="flex:1;min-width:240px" required>
        <button class="btn">Enviar</button>
      </form>
    </div>
  `, { topRight: '<a href="/admin/logout">Salir</a>' });
}

function agendaPicker(c, slots) {
  const opts = slots.length
    ? slots.map(s => `<form method="POST" action="/portal/${c.token}/agenda" style="margin:0"><input type="hidden" name="slot" value="${esc(s.value)}"><button class="slotbtn" type="submit">${esc(s.label)}</button></form>`).join('')
    : '<p class="muted">No hay horarios disponibles por ahora. Te contactaremos para coordinar tu atención.</p>';
  return layout('Agendar videollamada', `
    <a href="/portal/${c.token}" class="muted">← Volver a mi caso</a>
    <h1 class="serif" style="margin-top:.4rem">Agenda tu videollamada</h1>
    <p class="muted">Elige el horario que más te acomode para conversar por videollamada con tu abogada/o. La atención es en el navegador, sin descargar nada.</p>
    <div class="card">${opts}</div>
  `);
}

function docForm(c, fields, values) {
  const inputs = fields.map(k => {
    const label = k.replace(/_/g, ' ').toLowerCase().replace(/^./, x => x.toUpperCase());
    const v = esc(values[k] || '');
    const pre = values[k] ? ' <span class="muted" style="font-size:.7rem">(prellenado)</span>' : '';
    return `<label>${esc(label)}${pre}</label><input name="${esc(k)}" value="${v}">`;
  }).join('');
  return layout('Generar documento', `
    <a href="/admin/case/${c.id}" class="muted">← Volver al caso</a>
    <h1 class="serif" style="margin-top:.4rem">Generar documento</h1>
    <div class="case-box"><div class="t">${esc(c.service_name)}</div><div class="n">${esc(c.nombre)}</div><div class="j">${esc(c.rut)}</div></div>
    <div class="card">
      <p class="muted">Los campos con datos del cliente vienen prellenados. Completa o ajusta el resto y genera el documento Word. Recuerda revisarlo antes de presentarlo.</p>
      <form method="POST" action="/admin/case/${c.id}/doc">
        ${inputs}
        <label style="display:flex;align-items:center;gap:.5rem;margin-top:1rem;font-weight:500">
          <input type="checkbox" name="visible_cliente" checked style="width:auto"> Visible para el cliente en su portal
        </label>
        <button class="btn full" style="margin-top:1rem">Generar documento Word</button>
      </form>
    </div>
  `, { topRight: '<a href="/admin/logout">Salir</a>' });
}

function linkBlocked(kind, c) {
  const expired = kind === 'expired';
  return layout(expired ? 'Enlace vencido' : 'Acceso no disponible', `
    <div class="card" style="text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:${expired?'#FBEEDF':'#FDF2F0'};display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:28px">${expired?'⏳':'🔒'}</div>
      <h1 class="serif">${expired?'Tu enlace venció':'Acceso desactivado'}</h1>
      <p class="muted">${expired
        ? 'Por seguridad, los enlaces de acceso tienen una fecha de vencimiento. Pídenos uno nuevo y lo enviamos a tu correo registrado.'
        : 'El estudio desactivó este enlace de acceso. Si crees que es un error, escríbenos y lo restablecemos.'}</p>
      ${expired
        ? `<form method="POST" action="/portal/${c.token}/relink"><button class="btn" style="margin-top:1rem">Enviar un nuevo enlace a mi correo</button></form>`
        : `<a class="btn blue" style="margin-top:1rem" href="https://wa.me/56951891633">Contactar al estudio</a>`}
    </div>
  `);
}

function linkSent(correo) {
  return layout('Enlace enviado', `
    <div class="card" style="text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:#E4F3EC;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:28px;color:#4FA079">✓</div>
      <h1 class="serif">Enlace enviado</h1>
      <p class="muted">Te enviamos un enlace de acceso nuevo a <b>${esc(correo)}</b>. Revisa tu correo (y la carpeta de spam). El enlace anterior quedó deshabilitado.</p>
    </div>
  `);
}

module.exports = { layout, clientPortal, payResult, adminLogin, adminList, adminCase, docForm, agendaPicker, linkBlocked, linkSent, clp };
