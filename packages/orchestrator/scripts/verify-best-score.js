#!/usr/bin/env node
// Verifies that the backend-only record_verified_submission RPC keeps the best
// score and records exactly one history row per verified request.
//
// Prerequisites:
//   1. schema.sql, migrations/add_best_score.sql, rls.sql, and seed.sql are applied
//   2. seed.sql has been run (sqli-login must exist in the problems table)
//   3. SUPABASE_URL and SUPABASE_SECRET_KEY must be set (or .env present)
//
// Usage:
//   TEST_USER_ID=<your-real-user-uuid> node scripts/verify-best-score.js
//
// The script creates and cleans up its own rows in completed_problems using the
// supplied user ID, so it never modifies other users' data.

'use strict';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { getServerClient } = require('../src/auth/supabaseClient');

const PROBLEM_ID = 'sqli-login';
const PATCH_A = '--- a/src/server.js\n+++ b/src/server.js\n@@ -1 +1 @@\n-placeholder\n+patch-a\n';
const PATCH_B = '--- a/src/server.js\n+++ b/src/server.js\n@@ -1 +1 @@\n-placeholder\n+patch-b\n';
const PATCH_C = '--- a/src/server.js\n+++ b/src/server.js\n@@ -1 +1 @@\n-placeholder\n+patch-c\n';

const userId = process.env.TEST_USER_ID;
if (!userId) {
  console.error('Usage: TEST_USER_ID=<uuid> node scripts/verify-best-score.js');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}`);
    failed++;
  }
}

async function cleanup(supabase) {
  const { error: historyError } = await supabase
    .from('submission_history')
    .delete()
    .eq('user_id', userId)
    .eq('problem_id', PROBLEM_ID);
  if (historyError) throw new Error(`History cleanup failed: ${historyError.message}`);

  const { error: completionError } = await supabase
    .from('completed_problems')
    .delete()
    .eq('user_id', userId)
    .eq('problem_id', PROBLEM_ID);
  if (completionError) throw new Error(`Completion cleanup failed: ${completionError.message}`);
}

async function call(supabase, score, patch) {
  const { data, error } = await supabase.rpc('record_verified_submission', {
    p_user_id: userId,
    p_problem_id: PROBLEM_ID,
    p_patch: patch,
    p_passed: true,
    p_score: score,
    p_score_mode: 'editPreview',
    p_duration_ms: 10,
  });
  if (error) throw new Error(`record_verified_submission error: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return { bestScore: row.best_score, firstClear: row.first_clear };
}

async function read(supabase) {
  const { data, error } = await supabase
    .from('completed_problems')
    .select('score, patch')
    .eq('user_id', userId)
    .eq('problem_id', PROBLEM_ID)
    .single();
  if (error) throw new Error(`Read error: ${error.message}`);
  return data;
}

async function historyCount(supabase) {
  const { count, error } = await supabase
    .from('submission_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('problem_id', PROBLEM_ID);
  if (error) throw new Error(`History count error: ${error.message}`);
  return count || 0;
}

async function run() {
  const supabase = getServerClient();

  console.log(`User: ${userId}\nProblem: ${PROBLEM_ID}\n`);

  // ── Test 1: First clear at 60 ────────────────────────────────────────────
  console.log('Test 1 — First clear: score=60');
  await cleanup(supabase);
  const t1 = await call(supabase, 60, PATCH_A);
  assert(t1.firstClear === true,   `first_clear = true   (got ${t1.firstClear})`);
  assert(t1.bestScore === 60,      `best_score  = 60     (got ${t1.bestScore})`);
  const db1 = await read(supabase);
  assert(db1.score === 60,         `DB score    = 60     (got ${db1.score})`);
  assert(db1.patch === PATCH_A,    `DB patch    = PATCH_A`);

  // ── Test 2: Re-clear at 40 (worse) — score must not drop ────────────────
  console.log('\nTest 2 — Re-clear with worse score: score=40 → expect DB stays at 60');
  const t2 = await call(supabase, 40, PATCH_B);
  assert(t2.firstClear === false,  `first_clear = false  (got ${t2.firstClear})`);
  assert(t2.bestScore === 60,      `best_score  = 60     (got ${t2.bestScore})`);
  const db2 = await read(supabase);
  assert(db2.score === 60,         `DB score    = 60     (got ${db2.score})`);
  assert(db2.patch === PATCH_A,    `DB patch    = PATCH_A (not replaced by lower-score run)`);

  // ── Test 3: Re-clear at 80 (better) — score must update ─────────────────
  console.log('\nTest 3 — Re-clear with better score: score=80 → expect DB updates to 80');
  const t3 = await call(supabase, 80, PATCH_C);
  assert(t3.firstClear === false,  `first_clear = false  (got ${t3.firstClear})`);
  assert(t3.bestScore === 80,      `best_score  = 80     (got ${t3.bestScore})`);
  const db3 = await read(supabase);
  assert(db3.score === 80,         `DB score    = 80     (got ${db3.score})`);
  assert(db3.patch === PATCH_C,    `DB patch    = PATCH_C (updated with better run's patch)`);

  // ── Test 4: Another re-clear at 40 after 80 — score stays at 80 ─────────
  console.log('\nTest 4 — Re-clear with worse score again: score=40 → expect DB stays at 80');
  const t4 = await call(supabase, 40, PATCH_B);
  assert(t4.firstClear === false,  `first_clear = false  (got ${t4.firstClear})`);
  assert(t4.bestScore === 80,      `best_score  = 80     (got ${t4.bestScore})`);
  const db4 = await read(supabase);
  assert(db4.score === 80,         `DB score    = 80     (got ${db4.score})`);
  assert(db4.patch === PATCH_C,    `DB patch    = PATCH_C (still best run's patch)`);
  assert(await historyCount(supabase) === 4, 'history has exactly four rows');

  // ── Test 5: Fresh first clear at 40 ─────────────────────────────────────
  console.log('\nTest 5 — Fresh first clear at 40 (after cleanup)');
  await cleanup(supabase);
  const t5 = await call(supabase, 40, PATCH_B);
  assert(t5.firstClear === true,   `first_clear = true   (got ${t5.firstClear})`);
  assert(t5.bestScore === 40,      `best_score  = 40     (got ${t5.bestScore})`);
  const db5 = await read(supabase);
  assert(db5.score === 40,         `DB score    = 40     (got ${db5.score})`);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  await cleanup(supabase);
  console.log('\n──────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
