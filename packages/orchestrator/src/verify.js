const fs = require('fs');
const { runAttack } = require('../../attack-engine/src/runner');
const { applyPatch, PROBLEMS, resetProblemContainer } = require('./applyPatch');

async function verify({ problemId, patchPath }) {
  const patchString = fs.readFileSync(patchPath, 'utf8');
  const problem = PROBLEMS[problemId];
  if (!problem) throw new Error(`Unknown problem: ${problemId}`);

  const baseUrl = `http://localhost:${problem.port}`;
  const attackName = problem.attackName;

  // Step 1: Reset to baseline to ensure clean state
  console.error('Resetting container to baseline...');
  await resetProblemContainer(problemId);

  // Step 2: Run attack on baseline (should succeed)
  console.error('Running baseline attack...');
  const attackBefore = await runAttack({ attackName, baseUrl });
  console.error(`  exploited: ${attackBefore.exploited}`);

  // Step 3: Apply the patch
  console.error('Applying patch...');
  await applyPatch({ problemId, patchString });

  // Step 4: Run attack on patched version (should fail)
  console.error('Running post-patch attack...');
  const attackAfter = await runAttack({ attackName, baseUrl });
  console.error(`  exploited: ${attackAfter.exploited}`);

  // Step 5: Compute result
  const passed = attackBefore.exploited === true && attackAfter.exploited === false;

  const result = { attackBefore, attackAfter, passed };
  console.log(JSON.stringify(result, null, 2));

  // Caller (server.js) is responsible for the post-verify baseline reset.
  // Done outside this function so it can be enqueued onto the orchestrator's
  // container mutation queue — the previous fire-and-forget here raced with
  // subsequent verify calls and left containers in a "name already in use"
  // state.

  return result;
}

// CLI entry point
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (!args.problem || !args.patch) {
    console.error('Usage: node src/verify.js --problem <id> --patch <path>');
    process.exit(1);
  }

  verify({ problemId: args.problem, patchPath: args.patch }).catch((err) => {
    console.error('Verification failed:', err.message);
    process.exit(1);
  });
}

module.exports = { verify };
