const { getServerClient } = require('./supabaseClient');

async function recordSubmission({ userId, problemId, patch, passed, durationMs }) {
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

  const { data: problem, error: problemError } = await supabase
    .from('problems')
    .select('base_score')
    .eq('id', problemId)
    .single();

  if (problemError || !problem) {
    console.error('Failed to load problem base score:', problemError && problemError.message);
    return { recorded: true, firstClear: false, score: null };
  }

  const { data: completed, error: completedError } = await supabase
    .from('completed_problems')
    .insert({
      user_id: userId,
      problem_id: problemId,
      score: problem.base_score,
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