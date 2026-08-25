// How to get TEST_JWT:
// 1. Supabase dashboard -> Authentication -> Users -> "Add user" with email + password
// 2. curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
//      -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" \
//      -d '{"email":"test@example.com","password":"..."}'
// 3. Copy access_token from response, export as TEST_JWT

const fs = require('fs');
const path = require('path');

function exitWithHelp() {
  console.error('Missing TEST_JWT. Set it to a Supabase access_token.');
  console.error('See instructions at the top of this file.');
  process.exit(1);
}

const testJwt = process.env.TEST_JWT;
if (!testJwt) {
  exitWithHelp();
}

const patchPath = path.resolve(__dirname, '..', '..', 'vulnerable-apps', 'sqli-login', 'solution.patch');
const patch = fs.readFileSync(patchPath, 'utf8');

async function run() {
  const response = await fetch('http://localhost:4000/problems/sqli-login/verify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${testJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patch }),
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));

  if (!data.passed) {
    throw new Error('Expected passed=true');
  }
  if (!data.recording) {
    throw new Error('Expected recording to be present for authenticated request');
  }
  if (data.recording.recorded !== true) {
    throw new Error('Expected recording.recorded=true');
  }

  console.log('OK: authenticated verify recorded a submission.');
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
