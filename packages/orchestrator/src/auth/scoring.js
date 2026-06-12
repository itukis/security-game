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

  const { error: historyError } = await supabase.from('submission_history').insert({
    user_id: userId,
    problem_id: problemId,
    patch,
    passed,
    duration_ms: durationMs ?? null,
  });

  if (historyError) {
    console.error('Failed to insert submission history:', historyError.message);
    return { recorded: false, firstClear: false, score: null };
  }

  if (!passed) {
    return { recorded: true, firstClear: false, score: null };
  }

  const computedScore = computeScore({ scoreMode, problemId });

  let scoreToRecord = computedScore;
  if (scoreToRecord == null) {
    // Unknown scoreMode for this problem — fall back to the per-problem
    // base_score so we never write null. Keeps backwards compat if the
    // frontend ever sends a mode the orchestrator doesn't know.
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('base_score')
      .eq('id', problemId)
      .single();

    if (problemError || !problem) {
      console.error('Failed to load problem base score:', problemError && problemError.message);
      return { recorded: true, firstClear: false, score: null };
    }
    scoreToRecord = problem.base_score;
  }

  const { data: completed, error: completedError } = await supabase
    .from('completed_problems')
    .insert({
      user_id: userId,
      problem_id: problemId,
      score: scoreToRecord,
    })
    .select('score')
    .single();

  if (completedError) {
    if (completedError.code === '23505') {
      return { recorded: true, firstClear: false, score: 0 };
    }
    console.error('Failed to insert completed problem:', completedError.message);
    return { recorded: true, firstClear: false, score: null };
  }

  return { recorded: true, firstClear: true, score: completed.score };
}

module.exports = { recordSubmission };
