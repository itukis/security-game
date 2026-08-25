const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let jwksCache = null;
let jwksCacheExpiresAt = 0;

function getProjectUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

function getIssuer() {
  const projectUrl = getProjectUrl();
  return projectUrl ? `${projectUrl}/auth/v1` : undefined;
}

function getJwksUrl() {
  if (process.env.SUPABASE_JWKS_URL) return process.env.SUPABASE_JWKS_URL;

  const projectUrl = getProjectUrl();
  return projectUrl ? `${projectUrl}/auth/v1/.well-known/jwks.json` : null;
}

async function getJwks() {
  const now = Date.now();
  if (jwksCache && now < jwksCacheExpiresAt) return jwksCache;

  const jwksUrl = getJwksUrl();
  if (!jwksUrl) {
    throw new Error('SUPABASE_JWKS_URL is not configured');
  }

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Supabase JWKS: ${response.status}`);
  }

  const jwks = await response.json();
  if (!Array.isArray(jwks.keys)) {
    throw new Error('Supabase JWKS response is missing keys');
  }

  jwksCache = jwks;
  jwksCacheExpiresAt = now + 10 * 60 * 1000;
  return jwks;
}

async function verifyJwt(token) {
  const decoded = jwt.decode(token, { complete: true });
  const alg = decoded && decoded.header && decoded.header.alg;
  const kid = decoded && decoded.header && decoded.header.kid;
  const verifyOptions = {
    audience: 'authenticated',
    issuer: getIssuer(),
  };

  if (alg === 'HS256') {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET is not configured');
    }
    return jwt.verify(token, secret, { ...verifyOptions, algorithms: ['HS256'] });
  }

  if (alg === 'ES256' || alg === 'RS256') {
    const jwks = await getJwks();
    const jwk = jwks.keys.find((key) => key.kid === kid);
    if (!jwk) {
      throw new Error(`No Supabase JWKS key found for kid: ${kid || '(none)'}`);
    }

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return jwt.verify(token, publicKey, { ...verifyOptions, algorithms: [alg] });
  }

  throw new Error(`Unsupported JWT alg: ${alg || '(none)'}`);
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    req.user = null;
    return next();
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Malformed Authorization header' });
  }

  try {
    const payload = await verifyJwt(match[1]);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    if (err.message && err.message.includes('is not configured')) {
      console.error(err.message);
      return res.status(500).json({ error: 'Auth not configured' });
    }
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { optionalAuth };
