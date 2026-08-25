const PROBLEM_META = {
  'sqli-login': {
    id: 'sqli-login',
    title: 'SQL Injection in Login Form',
    vulnerability: 'sqli',
    description:
      'The login endpoint builds SQL queries by concatenating user input directly into the query string. ' +
      'An attacker can inject SQL syntax through the username or password field to bypass authentication entirely. ' +
      'Your goal is to rewrite the query to use parameterized statements so user input is never interpreted as SQL.',
    targetEndpoint: 'POST /login',
    hints: [
      "What happens if a user types a single quote (') into the username field? Look at how the query is built.",
      'The vulnerability is that user input becomes part of the SQL syntax. Most SQL libraries support a way to send data separately from the query structure.',
      'Look up "parameterized queries" or "prepared statements" for the better-sqlite3 library. The fix changes 2 lines.',
    ],
  },
  'xss-comments': {
    id: 'xss-comments',
    title: 'Cross-Site Scripting in Comment Board',
    vulnerability: 'xss',
    description:
      'The comment board renders user-submitted text directly into HTML without escaping. ' +
      'An attacker can submit a comment containing <script> tags or event handlers that execute when other users view the page. ' +
      'Your goal is to escape user input before rendering it.',
    targetEndpoint: 'GET /comments',
    hints: [
      'Try submitting a comment containing the text <b>hello</b>. What happens when you view the comments page?',
      'The server is treating user input as part of the HTML structure. You need to convert special characters (<, >, &, ", \') into their HTML entity equivalents before rendering.',
      'Write a small helper function that replaces those 5 characters, and apply it to both author and text in the render path.',
    ],
  },
  'idor-profile': {
    id: 'idor-profile',
    title: 'Insecure Direct Object Reference in Profile API',
    vulnerability: 'auth-bypass',
    description:
      'The profile endpoint returns user data based on the ID in the URL, but never verifies that the requesting user owns that profile. ' +
      "Any logged-in user can view anyone else's data by changing the ID. " +
      'Your goal is to add an authorization check so users can only view their own profile.',
    targetEndpoint: 'GET /profile/:id',
    hints: [
      'Try requesting /profile/user-2 while sending X-User-Id: user-1. What happens? Is that what should happen?',
      'The server knows who is making the request (req.userId from the session header) and which profile is being requested (req.params.id). What it does not do is compare them.',
      'Add a check at the top of the handler: if these two values are different, respond with 403 Forbidden before looking up the profile.',
    ],
  },
  'path-traversal-files': {
    id: 'path-traversal-files',
    title: 'Path Traversal in File Downloader',
    vulnerability: 'path-traversal',
    description:
      'The download endpoint joins an untrusted filename to the public directory without checking the resolved path. ' +
      'An attacker can use ../ segments to read files outside the intended directory. ' +
      'Your goal is to resolve the requested path and reject anything outside the public directory.',
    targetEndpoint: 'GET /download?name=<filename>',
    hints: [
      'Try requesting ../secret/flag.txt and compare it with a normal request for readme.txt.',
      'Resolve both the public directory and requested target to absolute paths before comparing them.',
      'Only allow targets that start with the public directory plus path.sep.',
    ],
  },
  'cmd-injection-ping': {
    id: 'cmd-injection-ping',
    title: 'Command Injection in Ping Tool',
    vulnerability: 'command-injection',
    description:
      'The ping endpoint interpolates an untrusted host directly into a shell command. ' +
      'Shell metacharacters can append arbitrary commands whose output is returned by the API. ' +
      'Your goal is to validate the hostname and invoke ping without a shell.',
    targetEndpoint: 'POST /ping',
    hints: [
      'Try adding a semicolon and a harmless printf command after the hostname.',
      'exec passes one string to a shell; execFile accepts the executable and its argument array separately.',
      'Allow only hostname characters before passing the value to execFile.',
    ],
  },
  'csrf-transfer': {
    id: 'csrf-transfer',
    title: 'Cross-Site Request Forgery in Transfer API',
    vulnerability: 'csrf',
    description:
      'The /transfer endpoint accepts POSTs without verifying that the request originated from the app itself. ' +
      "Any third-party page can submit a hidden form on the victim's behalf, silently moving money out of their account. " +
      'Your goal is to add a CSRF token check that ties each state-changing request back to the legitimate UI.',
    targetEndpoint: 'POST /transfer',
    hints: [
      'Try POSTing to /transfer from a completely unrelated page. Does the server check anything beyond the request body?',
      'Issue a token from a GET endpoint, store it server-side, and require the POST to present that same token before debiting the account.',
      'Reject the request with 403 if X-CSRF-Token is missing or unknown, and consume the token after a successful transfer so it cannot be replayed.',
    ],
  },
  'hardcoded-secrets': {
    id: 'hardcoded-secrets',
    title: 'Hardcoded Admin Key Exposed to Browser',
    vulnerability: 'hardcoded-secrets',
    description:
      'The dashboard page inlines the admin API key directly into the HTML/JS that ships to the browser. ' +
      'Anyone who opens DevTools (or even just View Source) can read the key and call the admin API themselves. ' +
      'Your goal is to remove the key from the client-side bundle and proxy data through a server-side endpoint.',
    targetEndpoint: 'GET /',
    hints: [
      'Open the page and use View Source (or DevTools → Sources). Can you find a long opaque string in the HTML?',
      'Secrets that reach the browser are public. Anything the client needs from a protected API should pass through a server route that adds the auth header.',
      'Add a server-side proxy endpoint that returns only the non-sensitive fields, and drop the API_KEY constant from the rendered HTML entirely.',
    ],
  },
  'open-redirect': {
    id: 'open-redirect',
    title: 'Open Redirect in Login Success Page',
    vulnerability: 'open-redirect',
    description:
      'The /login-success page reads ?redirect= and passes it straight to res.redirect with no validation. ' +
      'An attacker can craft a link that bounces the victim to a phishing site immediately after a legitimate-looking login. ' +
      'Your goal is to restrict the redirect destination to safe, in-origin paths.',
    targetEndpoint: 'GET /login-success?redirect=<url>',
    hints: [
      'What happens if you hit /login-success?redirect=https://evil.example.com? Where does your browser end up?',
      'A safe redirect target should be a relative path that lives inside our own app — not a full URL, and not a protocol-relative //evil.com.',
      'Reject the request with 400 unless the value starts with a single "/" and does not begin with "//".',
    ],
  },
  'file-upload': {
    id: 'file-upload',
    title: 'Insecure File Upload',
    vulnerability: 'file-upload',
    description:
      'The /upload endpoint accepts any file type and serves the result through Express static middleware. ' +
      'An attacker can upload malicious.html containing <script>, then load /files/malicious.html and execute JavaScript in the app origin. ' +
      'Your goal is to restrict the accepted extensions and sanitize the saved filename.',
    targetEndpoint: 'POST /upload',
    hints: [
      'What happens if you upload malicious.html with a <script> inside? Try GET /files/malicious.html — what Content-Type comes back?',
      'multer accepts a fileFilter option. Use it to allow only a known-safe extension whitelist (.txt, .png, .jpg).',
      'Also sanitize the saved filename. Run path.basename on req.file.originalname and strip non [A-Za-z0-9._-] characters before writing to disk.',
    ],
  },
  'review-support-portal': {
    id: 'review-support-portal',
    title: 'Support Portal Composite Review',
    vulnerability: 'review-support-portal',
    description:
      'A support portal combines three beginner vulnerabilities in one workflow: SQL injection in agent login, stored XSS in ticket comments, and open redirect in handoff. ' +
      'Your goal is to fix all three context boundaries: parameterized SQL, HTML escaping, and internal-only redirects.',
    targetEndpoint: 'POST /agent/login + GET /tickets/:id + GET /handoff',
    hints: [
      'Find where email/password enter a SQL string, where comments enter HTML, and where next enters res.redirect.',
      'Each sink needs its own defense. Do not try to solve SQL, HTML, and redirects with one generic blacklist.',
      'Use bound SQL parameters, escape comment output, and allow only paths that start with / but not //.',
    ],
  },
  'review-account-workflow': {
    id: 'review-account-workflow',
    title: 'Account Workflow Boundary Review',
    vulnerability: 'review-account-workflow',
    description:
      'The account center combines IDOR, CSRF, and hardcoded secret exposure. ' +
      'Your goal is to check the requesting user against the target account, require a CSRF token for transfers, and remove the admin key from browser-delivered HTML.',
    targetEndpoint: 'GET /account/:id + POST /transfer + GET /',
    hints: [
      'Compare req.userId with req.params.id before returning account data.',
      'State-changing POSTs need a server-issued token that attacker pages cannot mint.',
      'Anything embedded in HTML or browser JavaScript is public. Move secret-backed access behind a server endpoint.',
    ],
  },
  'review-file-workbench': {
    id: 'review-file-workbench',
    title: 'File Workbench Input Review',
    vulnerability: 'review-file-workbench',
    description:
      'The file workbench combines path traversal, command injection, and insecure file upload. ' +
      'Your goal is to constrain resolved file paths, call ping without a shell, and accept only safe upload extensions with sanitized filenames.',
    targetEndpoint: 'GET /download + POST /ping + POST /upload',
    hints: [
      'Resolve the requested path and verify it remains under the public directory.',
      'Use execFile with an argument array and validate hostnames with an allowlist.',
      'Whitelist upload extensions and sanitize the saved filename; blocking only .html is not enough.',
    ],
  },
};

module.exports = { PROBLEM_META };
