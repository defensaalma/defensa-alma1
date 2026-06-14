// Integración con Transbank Webpay Plus.
// Por defecto usa el AMBIENTE DE INTEGRACIÓN (pruebas) con las credenciales
// públicas de Transbank. Para producción, define en el .env:
//   TBK_ENV=produccion
//   TBK_COMMERCE_CODE=<tu código de comercio>
//   TBK_API_KEY=<tu llave secreta>
const TBK = require('transbank-sdk');

// Compatibilidad con distintas versiones del SDK.
const WebpayPlus = TBK.WebpayPlus;
const Options = TBK.Options;
const Environment = TBK.Environment;
const IntegrationCommerceCodes = TBK.IntegrationCommerceCodes;
const IntegrationApiKeys = TBK.IntegrationApiKeys;

const isProd = () => String(process.env.TBK_ENV).toLowerCase() === 'produccion';

function buildTx() {
  const prod = isProd();
  if (prod && (!process.env.TBK_COMMERCE_CODE || !process.env.TBK_API_KEY)) {
    throw new Error('Faltan TBK_COMMERCE_CODE y/o TBK_API_KEY para producción. Cárgalas en las variables de entorno.');
  }
  const commerceCode = prod ? process.env.TBK_COMMERCE_CODE : IntegrationCommerceCodes.WEBPAY_PLUS;
  const apiKey = prod ? process.env.TBK_API_KEY : IntegrationApiKeys.WEBPAY;
  const env = prod ? Environment.Production : Environment.Integration;
  return new WebpayPlus.Transaction(new Options(commerceCode, apiKey, env));
}

// Texto del modo de pago activo (para mostrar en el panel y los logs).
function mode() {
  if (isDemo()) return 'Demo (sin Transbank)';
  return isProd() ? 'Transbank PRODUCCIÓN' : 'Transbank Integración (pruebas)';
}

// Crea una transacción y devuelve { url, token } para redirigir al usuario.
async function createTransaction({ buyOrder, sessionId, amount, returnUrl }) {
  const tx = buildTx();
  const resp = await tx.create(buyOrder, sessionId, amount, returnUrl);
  return { url: resp.url, token: resp.token };
}

// Confirma la transacción tras el retorno de Webpay.
async function commitTransaction(tokenWs) {
  const tx = buildTx();
  return await tx.commit(tokenWs);
}

const isDemo = () => String(process.env.PAY_DEMO) === 'true';

module.exports = { createTransaction, commitTransaction, isDemo, isProd, mode };
