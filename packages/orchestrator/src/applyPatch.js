const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { runDocker, runCompose } = require('./dockerCli');
const { validatePatchSafety } = require('./patchPolicy');

// Map problem IDs to container names and ports
const PROBLEMS = {
  'sqli-login': {
    container: 'arena-sqli-login',
    composeService: 'sqli-login',
    attackName: 'sqli',
    patchTarget: 'src/server.js',
    port: 3001,
  },
  'xss-comments': {
    container: 'arena-xss-comments',
    composeService: 'xss-comments',
    attackName: 'xss',
    patchTarget: 'src/server.js',
    port: 3002,
  },
  'idor-profile': {
    container: 'arena-idor-profile',
    composeService: 'idor-profile',
    attackName: 'auth-bypass',
    patchTarget: 'src/server.js',
    port: 3003,
  },
  'csrf-transfer': {
    container: 'arena-csrf-transfer',
    composeService: 'csrf-transfer',
    attackName: 'csrf',
    patchTarget: 'src/server.js',
    port: 3006,
  },
  'hardcoded-secrets': {
    container: 'arena-hardcoded-secrets',
    composeService: 'hardcoded-secrets',
    attackName: 'hardcoded-secrets',
    patchTarget: 'src/server.js',
    port: 3007,
  },
  'open-redirect': {
    container: 'arena-open-redirect',
    composeService: 'open-redirect',
    attackName: 'open-redirect',
    patchTarget: 'src/server.js',
    port: 3008,
  },
  'file-upload': {
    container: 'arena-file-upload',
    composeService: 'file-upload',
    attackName: 'file-upload',
    patchTarget: 'src/server.js',
    port: 3009,
  },
};

async function waitForHealth(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await axios.get(`http://localhost:${port}/health`, { timeout: 1000 });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Container did not become healthy within ${timeoutMs}ms`);
}

async function resetProblemContainer(problemId) {
  const problem = PROBLEMS[problemId];
  if (!problem) throw new Error(`Unknown problem: ${problemId}`);

  // Force-remove the existing container first so `up` creates a clean one.
  // `--force-recreate` alone races on the legacy docker-compose 5.x in this
  // env (rename to tmp name conflicts on a hot restart), leaving the next
  // verify call to fail with "container name already in use".
  try {
    await runDocker(['rm', '-f', problem.container]);
  } catch {
    // Container may not exist; ignore.
  }
  await runCompose(['up', '--build', '-d', problem.composeService]);
  await waitForHealth(problem.port, 30000);
}

async function applyPatch({ problemId, patchString }) {
  const problem = PROBLEMS[problemId];
  if (!problem) throw new Error(`Unknown problem: ${problemId}`);
  validatePatchSafety({ problemId, patchString });

  // Write patch to a temp file on the host
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-patch-'));
  const patchPath = path.join(tmpDir, 'user.patch');
  fs.writeFileSync(patchPath, patchString);

  try {
    // Ensure patches directory exists inside the container
    await runDocker(['exec', problem.container, 'mkdir', '-p', '/app/patches']);

    // Copy patch into the container
    await runDocker(['cp', patchPath, `${problem.container}:/app/patches/user.patch`]);

    // Validate the patch inside the container. Force single-file apply for defense-in-depth.
    await runDocker([
      'exec',
      problem.container,
      'git',
      '-C',
      '/app',
      'apply',
      '--check',
      `--include=${problem.patchTarget}`,
      '--exclude=*',
      '/app/patches/user.patch',
    ]);

    // Apply the patch
    await runDocker([
      'exec',
      problem.container,
      'git',
      '-C',
      '/app',
      'apply',
      `--include=${problem.patchTarget}`,
      '--exclude=*',
      '/app/patches/user.patch',
    ]);

    // Restart the container so the app picks up patched files
    await runCompose(['restart', problem.composeService]);

    // Wait for healthcheck
    await waitForHealth(problem.port);

    return { applied: true };
  } finally {
    // Clean up temp file
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = { applyPatch, PROBLEMS, resetProblemContainer };
