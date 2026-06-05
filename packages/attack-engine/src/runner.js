const { runSqliAttack } = require('./attacks/sqli');
const { runXssAttack } = require('./attacks/xss');
const { runAuthBypassAttack } = require('./attacks/authBypass');

const ATTACKS = {
  sqli: runSqliAttack,
  xss: runXssAttack,
  'auth-bypass': runAuthBypassAttack,
};

async function runAttack({ attackName, baseUrl }) {
  const handler = ATTACKS[attackName];
  if (!handler) {
    throw new Error(`Unknown attack: "${attackName}". Available: ${Object.keys(ATTACKS).join(', ')}`);
  }
  return handler({ baseUrl });
}

module.exports = { runAttack };
