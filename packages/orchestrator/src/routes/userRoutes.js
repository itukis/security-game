const express = require('express');
const { optionalAuth } = require('../auth/authMiddleware');
const { getServerClient } = require('../auth/supabaseClient');

function createUserRouter() {
  const router = express.Router();

  router.get('/me/dashboard', optionalAuth, async (req, res) => {
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

  router.get('/leaderboard', async (req, res) => {
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

  return router;
}

module.exports = { createUserRouter };
