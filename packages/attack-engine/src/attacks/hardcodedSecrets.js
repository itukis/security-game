const axios = require('axios');

// Information exposure: the vulnerable server inlines the admin API key into
// the HTML it sends to the browser. We just GET / and grep for the marker.
const KEY_MARKERS = [/sk-secret/i, /API_KEY\s*=\s*['"]/];

async function runHardcodedSecretsAttack({ baseUrl }) {
  const start = Date.now();

  try {
    const res = await axios.get(`${baseUrl}/`, {
      timeout: 5000,
      responseType: 'text',
      transformResponse: [(d) => d],
      validateStatus: () => true,
    });

    const body = typeof res.data === 'string' ? res.data : String(res.data);
    const hit = KEY_MARKERS.find((re) => re.test(body));

    if (hit) {
      const match = body.match(hit);
      const idx = match ? body.indexOf(match[0]) : -1;
      const snippet =
        idx === -1
          ? body.slice(0, 200)
          : body.slice(Math.max(0, idx - 40), Math.min(body.length, idx + 120));
      return {
        vulnerability: 'hardcoded-secrets',
        exploited: true,
        payload: 'GET /',
        evidence: `Secret marker visible in HTML: ${snippet.trim()}`.slice(0, 200),
        durationMs: Date.now() - start,
      };
    }

    return {
      vulnerability: 'hardcoded-secrets',
      exploited: false,
      payload: null,
      evidence: `GET / returned ${res.status} with no secret markers in the body`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      vulnerability: 'hardcoded-secrets',
      exploited: false,
      payload: null,
      evidence: `GET / failed: ${err.message}`.slice(0, 200),
      durationMs: Date.now() - start,
    };
  }
}

module.exports = { runHardcodedSecretsAttack };
