const axios = require('axios');

const EVIL = 'https://evil.example.com/phish';

// Open redirect: GET /login-success?redirect=<external> should never bounce
// the user off-site. We send the request without following redirects and look
// at the Location header.
async function runOpenRedirectAttack({ baseUrl }) {
  const start = Date.now();

  try {
    const res = await axios.get(`${baseUrl}/login-success`, {
      params: { redirect: EVIL },
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const location = res.headers && (res.headers.location || res.headers.Location);

    if (res.status >= 300 && res.status < 400 && typeof location === 'string') {
      // Anything that resolves outside the app's origin is exploitation. The
      // simplest check is whether the value parses as an absolute URL with a
      // host — relative paths (/dashboard) start with `/`.
      const looksAbsolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(location) || location.startsWith('//');
      if (looksAbsolute) {
        return {
          vulnerability: 'open-redirect',
          exploited: true,
          payload: `GET /login-success?redirect=${EVIL}`,
          evidence: `Server redirected to external URL: Location=${location}`.slice(0, 200),
          durationMs: Date.now() - start,
        };
      }
    }

    return {
      vulnerability: 'open-redirect',
      exploited: false,
      payload: null,
      evidence: `GET /login-success?redirect=${EVIL} → ${res.status}${location ? ` (Location=${location})` : ''}`.slice(0, 200),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      vulnerability: 'open-redirect',
      exploited: false,
      payload: null,
      evidence: `Request failed: ${err.message}`.slice(0, 200),
      durationMs: Date.now() - start,
    };
  }
}

module.exports = { runOpenRedirectAttack };
