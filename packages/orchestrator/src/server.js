const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { verify } = require('./verify');
const { validatePatchSafety, validatePatch, summarizePatch } = require('./patchPolicy');
const { optionalAuth } = require('./auth/authMiddleware');
const { recordSubmission } = require('./auth/scoring');
const { runCompose } = require('./dockerCli');
const axios = require('axios');
const { applyPatch, PROBLEMS, resetProblemContainer } = require('./applyPatch');
const { getServerClient } = require('./auth/supabaseClient');

const ORCHESTRATOR_VERSION = '0.5.0';

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '1mb' }));

const PROBLEMS_DIR = path.resolve(__dirname, '../../vulnerable-apps');

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
};

// Verify and preview apply both mutate shared Docker state. Serialize requests
// to avoid cross-user races between container rebuilds/restarts.
let containerMutationQueue = Promise.resolve();
function enqueueContainerMutation(task) {
  const next = containerMutationQueue.then(
    () => task(),
    (prevErr) => {
      console.error('Previous container mutation task failed:', prevErr.message);
      return task();
    }
  );
  containerMutationQueue = next.catch(() => {});
  return next;
}

function validatePatchRequest(problemId, patch) {
  if (!PROBLEM_META[problemId]) {
    return { status: 404, error: `Problem not found: ${problemId}` };
  }
  if (!patch || typeof patch !== 'string') {
    return { status: 400, error: 'Missing or invalid "patch" field (must be a string)' };
  }

  const generic = validatePatch(patch);
  if (!generic.ok) {
    return { status: 400, error: `Patch failed validation: ${generic.reason}` };
  }

  try {
    validatePatchSafety({ problemId, patchString: patch });
  } catch (err) {
    return { status: 400, error: `Patch failed validation: ${err.message}` };
  }

  return null;
}

app.get('/health', async (req, res) => {
  const problemIds = Object.keys(PROBLEM_META);
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
  });
});

app.get('/problems/:id', optionalAuth, (req, res) => {
  const { id } = req.params;
  const meta = PROBLEM_META[id];
  if (!meta) return res.status(404).json({ error: `Problem not found: ${id}` });

  // Read the vulnerable app's main source file
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
  const { patch } = req.body;

  const validationError = validatePatchRequest(id, patch);
  if (validationError) {
    return res.status(validationError.status).json({ error: validationError.error });
  }

  try {
    const result = await enqueueContainerMutation(async () => {
      // Write patch to a temp file so verify() can read it.
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
    const recording = await recordSubmission({
      userId: req.user && req.user.id,
      problemId: req.params.id,
      patch: req.body.patch,
      passed: result.passed,
      durationMs: result.attackAfter && result.attackAfter.durationMs,
    });

    if (req.user) {
      res.json({
        ...result,
        recording: { firstClear: recording.firstClear, score: recording.score },
        appliedPatchSummary: summarizePatch(patch),
      });
    } else {
      res.json(result);
    }

    // Reset container back to baseline AFTER responding so the next Step 1
    // attempt sees a fresh vulnerable container. Enqueued on the same queue
    // so the next verify/preview call waits for it to finish.
    enqueueContainerMutation(() => resetProblemContainer(id)).catch((err) => {
      console.error(`Post-verify baseline reset failed for ${id}:`, err.message);
    });
    return;
  } catch (err) {
    const msg = err.message || 'Internal error';
    if (msg.includes('patch does not apply') || msg.includes('--check')) {
      res.status(400).json({ error: 'Patch failed validation: patch does not apply cleanly' });
    } else {
      console.error('Verify error:', msg);
      res.status(500).json({ error: 'Verification failed due to an internal error' });
    }
  }
});

app.patch('/problems/:id/preview', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { patch } = req.body;

  const validationError = validatePatchRequest(id, patch);
  if (validationError) {
    return res.status(validationError.status).json({ error: validationError.error });
  }

  try {
    await enqueueContainerMutation(async () => {
      await resetProblemContainer(id);
      await applyPatch({ problemId: id, patchString: patch });
    });
    res.json({ applied: true });
  } catch (err) {
    const msg = err.message || 'Internal error';
    if (msg.includes('patch does not apply') || msg.includes('--check')) {
      res.status(400).json({ error: 'Patch failed validation: patch does not apply cleanly' });
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
    await runCompose(['down']);
    await runCompose(['up', '-d', '--build']);
    res.json({ reset: true, durationMs: Date.now() - start });
  } catch (err) {
    console.error('Admin reset failed:', err.message);
    res.status(500).json({ error: 'Reset failed' });
  }
});

app.get('/me/dashboard', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let supabase;
  try {
    supabase = getServerClient();
  } catch (err) {
    console.error('Supabase client error:', err.message);
    return res.status(500).json({ error: 'Supabase client not configured' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name,email')
    .eq('id', req.user.id)
    .single();

  if (profileError || !profile) {
    console.error('Failed to load profile:', profileError && profileError.message);
    return res.status(500).json({ error: 'Failed to load profile' });
  }

  const { data: completedRows, error: completedError } = await supabase
    .from('completed_problems')
    .select('*, problems(title, vulnerability)')
    .eq('user_id', req.user.id);

  if (completedError) {
    console.error('Failed to load completed problems:', completedError.message);
    return res.status(500).json({ error: 'Failed to load completed problems' });
  }

  const { data: submissionRows, error: submissionError } = await supabase
    .from('submission_history')
    .select('problem_id, passed, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (submissionError) {
    console.error('Failed to load submission history:', submissionError.message);
    return res.status(500).json({ error: 'Failed to load submission history' });
  }

  const completed = (completedRows || []).map((row) => ({
    problem_id: row.problem_id,
    title: row.problems ? row.problems.title : null,
    score: row.score,
    completed_at: row.completed_at,
  }));

  const totalScore = (completedRows || []).reduce((sum, row) => sum + (row.score || 0), 0);

  const recentSubmissions = (submissionRows || []).map((row) => ({
    problem_id: row.problem_id,
    passed: row.passed,
    created_at: row.created_at,
  }));

  res.json({
    profile: { display_name: profile.display_name, email: profile.email },
    totalScore,
    completedCount: completed.length,
    completed,
    recentSubmissions,
  });
});

app.get('/leaderboard', async (req, res) => {
  let supabase;
  try {
    supabase = getServerClient();
  } catch (err) {
    console.error('Supabase client error:', err.message);
    return res.status(500).json({ error: 'Supabase client not configured' });
  }

  const { data: entries, error: leaderboardError } = await supabase
    .rpc('get_leaderboard', { limit_n: 50 });

  if (leaderboardError) {
    console.error('Failed to load leaderboard:', leaderboardError.message);
    return res.status(500).json({ error: 'Failed to load leaderboard' });
  }

  const missingIds = (entries || [])
    .filter((entry) => !entry.display_name && entry.user_id)
    .map((entry) => entry.user_id);

  let emailByUserId = {};
  if (missingIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,email')
      .in('id', missingIds);

    if (profileError) {
      console.error('Failed to load profile emails for leaderboard:', profileError.message);
    } else if (profiles) {
      emailByUserId = profiles.reduce((acc, row) => {
        acc[row.id] = row.email;
        return acc;
      }, {});
    }
  }

  const normalizedEntries = (entries || []).map((entry) => {
    let displayName = entry.display_name;
    const fallbackEmail = entry.email || emailByUserId[entry.user_id];
    if (!displayName && fallbackEmail) {
      displayName = fallbackEmail.split('@')[0];
    }

    return {
      user_id: entry.user_id,
      rank: entry.rank,
      display_name: displayName,
      total_score: entry.total_score,
      completed_count: entry.completed_count,
    };
  });

  res.json({ entries: normalizedEntries });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Orchestrator API listening on port ${PORT}`);
});
