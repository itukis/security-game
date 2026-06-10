const { runSqliAttack } = require('./attacks/sqli');
const { runXssAttack } = require('./attacks/xss');
const { runAuthBypassAttack } = require('./attacks/authBypass');
const { runCsrfAttack } = require('./attacks/csrf');
const { runHardcodedSecretsAttack } = require('./attacks/hardcodedSecrets');
const { runOpenRedirectAttack } = require('./attacks/openRedirect');
const { runFileUploadAttack } = require('./attacks/fileUpload');

const ATTACKS = {
  sqli: runSqliAttack,
  xss: runXssAttack,
  'auth-bypass': runAuthBypassAttack,
  csrf: runCsrfAttack,
  'hardcoded-secrets': runHardcodedSecretsAttack,
  'open-redirect': runOpenRedirectAttack,
  'file-upload': runFileUploadAttack,
};

async function runAttack({ attackName, baseUrl }) {
  const handler = ATTACKS[attackName];
  if (!handler) {
    throw new Error(`Unknown attack: "${attackName}". Available: ${Object.keys(ATTACKS).join(', ')}`);
  }
  return handler({ baseUrl });
}

module.exports = { runAttack };
