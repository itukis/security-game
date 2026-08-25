const { getServerClient } = require('./supabaseClient');

// Mirrors packages/frontend/lib/difficultyConfig.ts SCORE_CAPS. Keep in sync.
const SCORE_CAPS = {
  Easy: {
    multipleChoice: 60,
    editPreview: 80,
    editOnly: 100,
  },
  Medium: {
    editPreview: 200,
    editOnly: 250,
  },
  Hard: {
    editPreview: 200,
    editOnly: 250,
  },
};

const HARD_PROBLEM_IDS = new Set([
  'review-support-portal',
  'review-account-workflow',
  'review-file-workbench',
]);

const VALID_SCORE_MODES = new Set(['multipleChoice', 'editPreview', 'editOnly']);
const DEFAULT_SCORE_MODE = 'editPreview';

function getDifficulty(problemId) {
  return HARD_PROBLEM_IDS.has(problemId) ? 'Hard' : 'Easy';
}

function normalizeScoreMode(scoreMode) {
  return VALID_SCORE_MODES.has(scoreMode) ? scoreMode : DEFAULT_SCORE_MODE;
}

function computeScore({ scoreMode, problemId }) {
  const mode = normalizeScoreMode(scoreMode);
  return SCORE_CAPS[getDifficulty(problemId)]?.[mode] ?? null;
}

async function recordSubmission({ userId, problemId, patch, passed, scoreMode, durationMs }) {
  if (!userId) {
    return { recorded: false, firstClear: false, score: null };
  }

  let supabase;
  try {
    supabase = getServerClient();
  } catch (err) {
    console.error('Supabase client error:', err.message);
    return { recorded: false, firstClear: false, score: null };
  }

  const normalizedMode = normalizeScoreMode(scoreMode);
  const scoreToRecord = passed
    ? computeScore({ scoreMode: normalizedMode, problemId })
    : null;

  if (passed && scoreToRecord == null) {
    console.error(`No score rule for ${problemId} in mode ${normalizedMode}`);
    return { recorded: false, firstClear: false, score: null };
  }

  // A service-role-only RPC records the history row and best-score upsert in
  // one transaction. Browser roles have no EXECUTE or table write privilege.
  const { data, error } = await supabase.rpc('record_verified_submission', {
    p_user_id: userId,
    p_problem_id: problemId,
    p_patch: patch,
    p_passed: passed,
    p_score: scoreToRecord,
    p_score_mode: normalizedMode,
    p_duration_ms: durationMs ?? null,
  });

  if (error) {
    console.error('Failed to record verified submission:', error.message);
    return { recorded: false, firstClear: false, score: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    recorded: true,
    firstClear: Boolean(row && row.first_clear),
    score: row && typeof row.best_score === 'number' ? row.best_score : null,
  };
}

module.exports = { computeScore, normalizeScoreMode, recordSubmission };
