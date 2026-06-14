# Defensa Alma — Plataforma (MVP operativo)

Plataforma legaltech funcional: catálogo de servicios, contratación con registro del
cliente, **pago real con Webpay (Transbank)**, **portal del cliente** con seguimiento de
la causa y **panel de gestión** para la abogada. Construida en Node.js + Express, con
base de datos PostgreSQL (Supabase en producción; Postgres local en proceso para desarrollo).

> Estado: **Hito 1 operativo**. Funciona de extremo a extremo. El pago corre en el
> ambiente de **integración** de Transbank hasta que tengas el contrato comercial.

---

## 1. Qué incluye

| Módulo | Ruta | Descripción |
|---|---|---|
| Sitio público | `/` | La landing (diagnóstico, catálogo, etc.). El botón "Continuar" lleva a `/contratar/:id`. |
| Contratación | `/contratar/:servicioId` | Registro del cliente (nombre, RUT, domicilio, correo) con validación. |
| Portal del cliente | `/portal/:token` | Enlace privado: estado, hitos, plazos, notificaciones y botón de pago. |
| Pago | `/pay/start/:casoId`, `/pay/return` | Webpay Plus (Transbank). |
| Panel de la abogada | `/admin` | Login, listado de casos, avance de hitos, rol/tribunal, notificaciones. |
| API | `/api/catalog`, `/api/cases` | Para integraciones. |

---

## 2. Correr en tu computador (prueba local)

Requisitos: **Node.js 18 o superior**. En desarrollo usa un Postgres local en proceso (PGlite), sin instalar nada; en producción se conecta a Supabase.

```bash
cd plataforma
cp .env.example .env          # ajusta valores si quieres
npm install
node seed.js                  # crea la cuenta de la abogada (admin)
npm start                     # abre http://localhost:3000
```

- Sitio: http://localhost:3000
- Panel abogada: http://localhost:3000/admin
  (usuario y clave definidos en `.env` → `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

Para probar el pago sin conexión a Transbank, pon `PAY_DEMO=true` en el `.env`
(aprueba el pago de inmediato). Con `PAY_DEMO=false` usa Webpay real (ver §4).

---

## 3. Publicarla en internet — Render (paso a paso)

El proyecto ya trae todo listo: `render.yaml` (configuración), `.node-version` (Node 22),
health check (`/healthz`) y auto-creación del usuario administrador al iniciar.

### Paso a paso
1. **Sube el proyecto a GitHub.** Crea un repositorio y sube esta carpeta `plataforma/`
   (sin `node_modules/` ni `data/`; el `.gitignore` ya los excluye).
2. **Crea el servicio en Render.** Entra a **render.com** → *New* → *Blueprint* → conecta tu
   repositorio. Render detecta `render.yaml` y crea el servicio web con su disco persistente.
3. **Completa las variables marcadas** (Render las pedirá; el resto vienen predefinidas):
   - `BASE_URL` → la URL de tu servicio (ej: `https://defensa-alma.onrender.com`, o tu dominio).
   - `ADMIN_EMAIL` y `ADMIN_PASSWORD` → tu correo y clave para entrar al panel `/admin`.
4. **Despliega.** Render instala, levanta el servidor y crea tu usuario admin automáticamente.
   Tu sitio queda en la URL de Render.
5. **Dominio propio (opcional).** En Render → *Settings* → *Custom Domains* agrega
   `app.defensaalma.cl` (o el que prefieras) y apunta el DNS según te indique Render. Luego
   actualiza `BASE_URL` a ese dominio.

> **Importante (persistencia):** el disco persistente del `render.yaml` requiere un plan de
> pago (Starter), y solo guarda los documentos generados. La base de datos va en **Supabase**
> (define DATABASE_URL). Si no usas Supabase, PGlite guarda los datos en el disco persistente.

### Conectar Supabase (Postgres)
1. Crea un proyecto en **supabase.com**.
2. Copia la cadena de conexión (Project → Settings → Database → Connection string, URI).
3. Pégala en la variable `DATABASE_URL` (en Render o en tu `.env`). La plataforma crea
   las tablas automáticamente al iniciar. Sin `DATABASE_URL`, usa Postgres local (PGlite).

---

## 4. Activar Webpay real (Transbank)

1. Contrata Webpay Plus con **Transbank** (https://www.transbank.cl). Te entregan un
   **código de comercio** y una **API Key** de producción.
2. En las variables de entorno define:
   ```
   TBK_ENV=produccion
   TBK_COMMERCE_CODE=<tu código de comercio>
   TBK_API_KEY=<tu llave secreta>
   PAY_DEMO=false
   ```
3. Mientras no las tengas, el sistema usa automáticamente el **ambiente de integración**
   (tarjetas de prueba de Transbank). Tarjetas de prueba: ver la documentación oficial
   de Transbank (VISA 4051 8856 0044 6623, CVV 123, cualquier fecha futura; RUT 11.111.111-1, clave 123).

---

## 5. Correos (envío del enlace y notificaciones)

Sin SMTP configurado, los correos se guardan en `data/outbox.log` (modo desarrollo).
Para envíos reales, define en el `.env` los datos SMTP de tu correo de Hostinger:
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contacto@defensaalma.cl
SMTP_PASS=tu-clave
```

---

## 6. Pendientes para "lanzamiento real" (siguientes hitos)

- **Seguridad/datos**: HTTPS (incluido en Render), `SECURE_COOKIES=true`, respaldo
  periódico de la base, y cumplimiento de la Ley 19.628 de protección de datos
  (consentimiento, finalidad, resguardo de datos sensibles del caso).
- **Documentos**: conectar la generación automática de las 15/16 plantillas paramétricas
  con los datos del cliente (carpeta `Plantillas/`).
- **Firma electrónica**: integrar un proveedor (firma simple/avanzada).
- **Videollamada**: integrar sala (p. ej. Jitsi/Whereby) y agenda con calendario.
- **Respaldos automáticos** de la base en Supabase (Point-in-time recovery).

---

*Defensa Alma — plataforma desarrollada como MVP operativo. Probada de extremo a extremo
(registro, portal, pago en modo integración/demo, panel de gestión).*
