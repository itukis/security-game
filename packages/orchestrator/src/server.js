const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { verify } = require('./verify');
const { summarizePatch } = require('./patchPolicy');
const { optionalAuth } = require('./auth/authMiddleware');
const { recordSubmission } = require('./auth/scoring');
const { runCompose } = require('./dockerCli');
const { applyPatch, ContainerCrashError, PROBLEMS, resetProblemContainer } = require('./applyPatch');
const { enqueueContainerMutation } = require('./containerMutationQueue');
const { validatePatchRequest } = require('./patchValidation');
const { PROBLEM_META } = require('./problemMeta');
const { createUserRouter } = require('./routes/userRoutes');

const ORCHESTRATOR_VERSION = '0.5.0';
const PROBLEMS_DIR = path.resolve(__dirname, '../../vulnerable-apps');

// Optional whitelist of problem IDs that are actually backed by live Docker
// containers in this deployment. When set (typical low-memory VM that only
// runs the 3 composite review problems), /health and /admin/reset operate on
// just this subset so we don't try to probe / restart containers that were
// never started. verify / reset / preview reject out-of-scope problem IDs so
// accidental requests cannot start containers outside this deployment scope.
// Format: comma-separated, e.g. "review-support-portal,review-account-workflow"
const LIVE_DOCKER_PROBLEM_IDS = (() => {
  const raw = process.env.LIVE_DOCKER_PROBLEM_IDS;
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
})();

function activeProblemIds() {
  const all = Object.keys(PROBLEM_META);
  if (!LIVE_DOCKER_PROBLEM_IDS) return all;
  return all.filter((id) => LIVE_DOCKER_PROBLEM_IDS.has(id));
}

const STATIC_ONLY_DEPLOYMENT_ERROR = 'This problem is static-only on this deployment';

function isLiveDockerProblem(problemId) {
  return !LIVE_DOCKER_PROBLEM_IDS || LIVE_DOCKER_PROBLEM_IDS.has(problemId);
}

function rejectStaticOnlyDeployment(problemId, res) {
  if (!PROBLEM_META[problemId]) {
    res.status(404).json({ error: `Problem not found: ${problemId}` });
    return true;
  }
  if (!isLiveDockerProblem(problemId)) {
    res.status(400).json({ error: STATIC_ONLY_DEPLOYMENT_ERROR });
    return true;
  }
  return false;
}

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

const previewUseByUserProblem = new Set();

function previewUseKey(userId, problemId) {
  return `${userId}:${problemId}`;
}

function markPreviewUsed(user, problemId) {
  if (!user) return;
  previewUseByUserProblem.add(previewUseKey(user.id, problemId));
}

function clearPreviewUse(user, problemId) {
  if (!user) return;
  previewUseByUserProblem.delete(previewUseKey(user.id, problemId));
}

function resolveScoreMode({ user, problemId, requestedMode }) {
  if (
    user &&
    previewUseByUserProblem.has(previewUseKey(user.id, problemId))
  ) {
    // Touching the live preview disqualifies stricter score modes.
    return 'editPreview';
  }
  if (requestedMode === 'editOnly' || requestedMode === 'multipleChoice') {
    return requestedMode;
  }
  return 'editPreview';
}

app.get('/health', async (req, res) => {
  const problemIds = activeProblemIds();
  const checks = await Promise.allSettled(
    problemIds.map((id) => {
      const problem = PROBLEMS[id];
      if (!problem) return Promise.reject(new Error('no port'));
      return axios.get(`http://localhost:${problem.port}/health`, { timeout: 1000 });
    })
  );

  const containersHealthy = checks.every(
    (c) => c.status === 'fulfilled' && c.value && c.value.status === 200
  );

  res.json({
    status: 'ok',
    version: ORCHESTRATOR_VERSION,
    problems: problemIds,
    containersHealthy,
    liveDockerScope: LIVE_DOCKER_PROBLEM_IDS ? Array.from(LIVE_DOCKER_PROBLEM_IDS) : null,
  });
});

app.get('/problems/:id', optionalAuth, (req, res) => {
  const { id } = req.params;
  const meta = PROBLEM_META[id];
  if (!meta) return res.status(404).json({ error: `Problem not found: ${id}` });

  const serverPath = path.join(PROBLEMS_DIR, id, 'src', 'server.js');
  let initialCode;
  try {
    initialCode = fs.readFileSync(serverPath, 'utf8');
  } catch (err) {
    return res.status(404).json({ error: `Source file not found for problem: ${id}` });
  }

  res.json({ ...meta, initialCode });
});

app.post('/problems/:id/verify', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { patch, mode } = req.body;
  if (rejectStaticOnlyDeployment(id, res)) return;

  const validationError = validatePatchRequest(id, patch);
  if (validationError) {
    return res.status(validationError.status).json({ error: validationError.error });
  }

  try {
    const result = await enqueueContainerMutation(async () => {
      const os = require('os');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-verify-'));
      const patchPath = path.join(tmpDir, 'user.patch');
      fs.writeFileSync(patchPath, patch);

      try {
        return await verify({ problemId: id, patchPath });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    if (req.user) {
      const scoreMode = resolveScoreMode({
        user: req.user,
        problemId: id,
        requestedMode: mode,
      });
      const recording = await recordSubmission({
        userId: req.user.id,
        problemId: id,
        patch,
        passed: result.passed,
        scoreMode,
        durationMs: result.attackAfter && result.attackAfter.durationMs,
      });

      res.json({
        ...result,
        recording: { firstClear: recording.firstClear, score: recording.score },
        appliedPatchSummary: summarizePatch(patch),
      });
    } else {
      res.json(result);
    }

    enqueueContainerMutation(() => resetProblemContainer(id)).catch((err) => {
      console.error(`Post-verify baseline reset failed for ${id}:`, err.message);
    });
    return;
  } catch (err) {
    const msg = err.message || 'Internal error';
    if (msg.includes('patch does not apply') || msg.includes('--check')) {
      res.status(400).json({ error: 'Patch failed validation: patch does not apply cleanly' });
    } else if (err.name === 'ContainerCrashError') {
      console.error('Verify error: container crashed after patch:', err.message);
      res.status(400).json({
        error: `Patch applied but the app failed to start — check for syntax errors or runtime crashes in your patch.\n\nContainer output:\n${err.containerLogs}`,
      });
    } else {
      console.error('Verify error:', msg);
      res.status(500).json({ error: 'Verification failed due to an internal error' });
    }
  }
});

app.post('/problems/:id/reset', optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (rejectStaticOnlyDeployment(id, res)) return;

  try {
    await enqueueContainerMutation(() => resetProblemContainer(id));
    clearPreviewUse(req.user, id);
    res.json({ reset: true });
  } catch (err) {
    console.error(`Reset failed for ${id}:`, err.message);
    res.status(500).json({ error: 'Reset failed' });
  }
});

app.patch('/problems/:id/preview', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { patch } = req.body;
  if (rejectStaticOnlyDeployment(id, res)) return;

  const validationError = validatePatchRequest(id, patch);
  if (validationError) {
    return res.status(validationError.status).json({ error: validationError.error });
  }

  try {
    await enqueueContainerMutation(async () => {
      await resetProblemContainer(id);
      await applyPatch({ problemId: id, patchString: patch });
    });
    markPreviewUsed(req.user, id);
    res.json({ applied: true });
  } catch (err) {
    const msg = err.message || 'Internal error';
    if (msg.includes('patch does not apply') || msg.includes('--check')) {
      res.status(400).json({ error: 'Patch failed validation: patch does not apply cleanly' });
    } else if (err.name === 'ContainerCrashError') {
      console.error('Preview apply error: container crashed after patch:', err.message);
      res.status(400).json({
        error: `Patch applied but the app failed to start — check for syntax errors or runtime crashes in your patch.\n\nContainer output:\n${err.containerLogs}`,
      });
    } else {
      console.error('Preview apply error:', msg);
      res.status(500).json({ error: 'Preview apply failed due to an internal error' });
    }
  }
});

app.post('/admin/reset', async (req, res) => {
  if (process.env.ALLOW_RESET !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  const start = Date.now();
  try {
    if (LIVE_DOCKER_PROBLEM_IDS) {
      // Only tear down + rebuild the services this deployment actually runs.
      // `compose down` without service names would also drop the network and
      // any out-of-scope containers, so target by service instead.
      const services = activeProblemIds()
        .map((id) => PROBLEMS[id]?.composeService)
        .filter(Boolean);
      if (services.length > 0) {
        await runCompose(['rm', '-fs', ...services]);
        await runCompose(['up', '-d', '--build', ...services]);
      }
    } else {
      await runCompose(['down']);
      await runCompose(['up', '-d', '--build']);
    }
    previewUseByUserProblem.clear();
    res.json({ reset: true, durationMs: Date.now() - start });
  } catch (err) {
    console.error('Admin reset failed:', err.message);
    res.status(500).json({ error: 'Reset failed' });
  }
});

app.use(createUserRouter());

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Orchestrator API listening on port ${PORT}`);
});
