// Agenda de videollamadas.
// Disponibilidad: citas de 40 minutos, con inicios cada 30 minutos, de 15:00 a 19:00,
// de lunes a viernes, excluyendo feriados. Todo configurable por variables de entorno.
// La sala usa Jitsi Meet (https://meet.jit.si) — gratis y sin cuenta.
const crypto = require('crypto');

const hhmmToMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const minToHHMM = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

const DURATION_MIN = Number(process.env.SLOT_DURATION_MIN || 40); // duración de cada cita
const BREAK_MIN    = Number(process.env.SLOT_BREAK_MIN || 30);    // descanso entre citas
const STEP_MIN     = DURATION_MIN + BREAK_MIN;                    // separación entre inicios (cita + descanso)
const START_MIN    = hhmmToMin(process.env.SLOT_START || '15:00');
const END_MIN      = hhmmToMin(process.env.SLOT_END || '19:00');  // último inicio es < END_MIN
const SLOT_DAYS    = Number(process.env.SLOT_DAYS || 21);         // ventana de días hacia adelante

// Feriados legales de Chile (fijos, formato MM-DD). Los feriados movibles (Semana Santa,
// y los que se trasladan a lunes) deben agregarse cada año en HOLIDAYS (YYYY-MM-DD, separados por coma).
const HOLIDAYS_MD = new Set([
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '05-21', // Glorias Navales
  '06-29', // San Pedro y San Pablo
  '07-16', // Virgen del Carmen
  '08-15', // Asunción de la Virgen
  '09-18', // Independencia Nacional
  '09-19', // Glorias del Ejército
  '10-12', // Encuentro de Dos Mundos
  '10-31', // Día de las Iglesias Evangélicas
  '11-01', // Día de Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-25', // Navidad
]);
const HOLIDAYS_EXTRA = new Set((process.env.HOLIDAYS || '').split(',').map(s => s.trim()).filter(Boolean));
const isHoliday = ymd => HOLIDAYS_MD.has(ymd.slice(5)) || HOLIDAYS_EXTRA.has(ymd);

const fmtYMD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function labelFor(dateObj, startMin) {
  const ds = dateObj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${cap(ds)} · ${minToHHMM(startMin)} a ${minToHHMM(startMin + DURATION_MIN)} hrs`;
}
const parseDT = v => { const [d, t] = v.split(' '); return { ymd: d, min: hhmmToMin(t) }; };

// Horarios disponibles, excluyendo los que se solapan con citas ya agendadas.
function availableSlots(takenValues = []) {
  const booked = takenValues.map(parseDT);
  const out = [];
  const now = new Date();
  for (let d = 1; d <= SLOT_DAYS; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;       // sin fines de semana
    const ymd = fmtYMD(day);
    if (isHoliday(ymd)) continue;               // sin feriados
    for (let start = START_MIN; start + DURATION_MIN <= END_MIN; start += STEP_MIN) {
      const end = start + DURATION_MIN;
      // bloquear si se solapa con una cita ya tomada el mismo día
      const clash = booked.some(b => b.ymd === ymd && start < b.min + DURATION_MIN && end > b.min);
      if (clash) continue;
      out.push({ value: `${ymd} ${minToHHMM(start)}`, label: labelFor(day, start) });
    }
  }
  return out;
}

const newRoom = () => 'DefensaAlma-' + crypto.randomBytes(5).toString('hex');
const roomUrl = room => `https://meet.jit.si/${room}`;

module.exports = { availableSlots, newRoom, roomUrl, DURATION_MIN };
