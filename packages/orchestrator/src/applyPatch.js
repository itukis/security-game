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
  'path-traversal-files': {
    container: 'arena-path-traversal-files',
    composeService: 'path-traversal-files',
    attackName: 'path-traversal',
    patchTarget: 'src/server.js',
    port: 3004,
  },
  'cmd-injection-ping': {
    container: 'arena-cmd-injection-ping',
    composeService: 'cmd-injection-ping',
    attackName: 'command-injection',
    patchTarget: 'src/server.js',
    port: 3005,
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
  'review-support-portal': {
    container: 'arena-review-support-portal',
    composeService: 'review-support-portal',
    attackName: 'review-support-portal',
    patchTarget: 'src/server.js',
    port: 3010,
  },
  'review-account-workflow': {
    container: 'arena-review-account-workflow',
    composeService: 'review-account-workflow',
    attackName: 'review-account-workflow',
    patchTarget: 'src/server.js',
    port: 3011,
  },
  'review-file-workbench': {
    container: 'arena-review-file-workbench',
    composeService: 'review-file-workbench',
    attackName: 'review-file-workbench',
    patchTarget: 'src/server.js',
    port: 3012,
  },
};

// Raise via SANDBOX_HEALTH_TIMEOUT_MS if your Docker host is slow (e.g. macOS + Docker Desktop).
const HEALTH_TIMEOUT_MS = Number(process.env.SANDBOX_HEALTH_TIMEOUT_MS) || 45000;

// Thrown when a container exits unexpectedly during startup (e.g. the patched
// code has a syntax error or crashes immediately). Callers can distinguish this
// from a generic timeout and surface a meaningful error to the user.
class ContainerCrashError extends Error {
  constructor(container, logs) {
    super(
      `Container ${container} exited during startup — the patch may have introduced a syntax error or runtime crash.`
    );
    this.name = 'ContainerCrashError';
    this.containerLogs = logs;
  }
}

async function getContainerStatus(container) {
  try {
    const { stdout } = await runDocker([
      'inspect', '--format', '{{.State.Status}}', container,
    ]);
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

async function getContainerLogs(container, lines = 40) {
  try {
    const { stdout, stderr } = await runDocker(['logs', '--tail', String(lines), container]);
    return (stdout + stderr).trim() || '(no output)';
  } catch (e) {
    return `(could not retrieve logs: ${e.message})`;
  }
}

// Poll the /health endpoint until it responds 200 or the timeout is reached.
// Signature changed from (port, ms) to (container, port, ms) so we can inspect
// the container state on failure.
async function waitForHealth(container, port, timeoutMs = HEALTH_TIMEOUT_MS) {
  const start = Date.now();
  let lastProbeErr = null;
  let probeCount = 0;

  while (Date.now() - start < timeoutMs) {
    probeCount++;
    const elapsed = Date.now() - start;

    try {
      await axios.get(`http://localhost:${port}/health`, { timeout: 1000 });
      console.error(
        `[health:${container}] healthy after ${elapsed}ms (${probeCount} probe${probeCount === 1 ? '' : 's'})`
      );
      return;
    } catch (e) {
      lastProbeErr = e.code || e.message;
    }

    // After a failed probe check whether the container is still running. If it
    // has exited, no amount of waiting will help — fail fast with the log tail.
    const status = await getContainerStatus(container);
    if (status === 'exited' || status === 'dead') {
      const logs = await getContainerLogs(container);
      console.error(
        `[health:${container}] container ${status} after ${elapsed}ms ` +
        `(${probeCount} probe${probeCount === 1 ? '' : 's'}).\nContainer logs:\n${logs}`
      );
      throw new ContainerCrashError(container, logs);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // Timed out — gather full diagnostics before throwing.
  const elapsed = Date.now() - start;
  const status = await getContainerStatus(container);
  const logs = await getContainerLogs(container);
  console.error(
    `[health:${container}] TIMEOUT after ${elapsed}ms, ${probeCount} probe${probeCount === 1 ? '' : 's'}.\n` +
    `  Container status : ${status}\n` +
    `  Last probe error : ${lastProbeErr}\n` +
    `  Container logs   :\n${logs}`
  );
  throw new Error(
    `Container did not become healthy within ${timeoutMs}ms ` +
    `(status: ${status}, last probe error: ${lastProbeErr})`
  );
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
  await waitForHealth(problem.container, problem.port);
}

async function applyPatch({ problemId, patchString }) {
  const problem = PROBLEMS[problemId];
  if (!problem) throw new Error(`Unknown problem: ${problemId}`);
  validatePatchSafety({ problemId, patchString });

  const t0 = Date.now();
  const tag = `[applyPatch:${problemId}]`;
  console.error(`${tag} start`);

  // Write patch to a temp file on the host
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-patch-'));
  const patchPath = path.join(tmpDir, 'user.patch');
  fs.writeFileSync(patchPath, patchString);

  try {
    // Ensure patches directory exists inside the container
    await runDocker(['exec', problem.container, 'mkdir', '-p', '/app/patches']);

    // Copy patch into the container
    await runDocker(['cp', patchPath, `${problem.container}:/app/patches/user.patch`]);
    console.error(`${tag} cp done (${Date.now() - t0}ms)`);

    // Validate the patch inside the container. Force single-file apply for defense-in-depth.
    await runDocker([
      'exec', problem.container, 'git', '-C', '/app', 'apply',
      '--check', `--include=${problem.patchTarget}`, '--exclude=*',
      '/app/patches/user.patch',
    ]);
    console.error(`${tag} git apply --check done (${Date.now() - t0}ms)`);

    // Apply the patch
    await runDocker([
      'exec', problem.container, 'git', '-C', '/app', 'apply',
      `--include=${problem.patchTarget}`, '--exclude=*',
      '/app/patches/user.patch',
    ]);
    console.error(`${tag} git apply done (${Date.now() - t0}ms)`);

    // Restart the container so the app picks up patched files
    await runCompose(['restart', problem.composeService]);
    console.error(`${tag} restart done (${Date.now() - t0}ms)`);

    // Wait for healthcheck
    await waitForHealth(problem.container, problem.port);
    console.error(`${tag} healthy (${Date.now() - t0}ms total)`);

    return { applied: true };
  } finally {
    // Clean up temp file
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = { applyPatch, ContainerCrashError, PROBLEMS, resetProblemContainer };
