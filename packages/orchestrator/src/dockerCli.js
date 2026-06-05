const { execFile } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DOCKER_BIN = process.env.DOCKER_BIN || 'docker';
const LEGACY_COMPOSE_BIN = process.env.DOCKER_COMPOSE_BIN || 'docker-compose';

function execCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: PROJECT_ROOT }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr || err.message}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function shouldFallbackToLegacyCompose(err) {
  const msg = String(err && err.message ? err.message : '');
  return (
    msg.includes("compose' is not a docker command") ||
    msg.includes('unknown command "compose"') ||
    msg.includes('unknown command: docker compose') ||
    (msg.includes('Usage:  docker [OPTIONS] COMMAND [ARG...]') &&
      (msg.includes('unknown flag:') || msg.includes('unknown shorthand flag:'))) ||
    msg.includes('spawn docker ENOENT') ||
    msg.includes('docker: not found')
  );
}

async function runCompose(args) {
  if (process.env.DOCKER_COMPOSE_BIN) {
    return execCommand(process.env.DOCKER_COMPOSE_BIN, args);
  }

  try {
    return await execCommand(DOCKER_BIN, ['compose', ...args]);
  } catch (dockerComposeErr) {
    if (!shouldFallbackToLegacyCompose(dockerComposeErr)) {
      throw dockerComposeErr;
    }
    try {
      return await execCommand(LEGACY_COMPOSE_BIN, args);
    } catch (legacyComposeErr) {
      throw new Error(
        `Docker Compose command failed. Tried "docker compose" (${dockerComposeErr.message}) and "${LEGACY_COMPOSE_BIN}" (${legacyComposeErr.message})`
      );
    }
  }
}

function runDocker(args) {
  return execCommand(DOCKER_BIN, args);
}

module.exports = { PROJECT_ROOT, execCommand, runDocker, runCompose };
