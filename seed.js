// Crea (o actualiza) la cuenta de administración de la abogada.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./db');

(async () => {
  const email = (process.env.ADMIN_EMAIL || 'contacto@defensaalma.cl').toLowerCase();
  const pass = process.env.ADMIN_PASSWORD || 'cambiar1234';
  const hash = bcrypt.hashSync(pass, 10);
  const ex = (await query('SELECT id FROM admins WHERE email=$1', [email])).rows[0];
  if (ex) {
    await query('UPDATE admins SET password_hash=$1 WHERE email=$2', [hash, email]);
    console.log('Admin actualizado:', email);
  } else {
    await query('INSERT INTO admins (email,password_hash) VALUES ($1,$2)', [email, hash]);
    console.log('Admin creado:', email);
  }
  if (!process.env.ADMIN_PASSWORD) console.log(`Contraseña por defecto: "${pass}" — cámbiala definiendo ADMIN_PASSWORD en el .env`);
  process.exit(0);
})();
