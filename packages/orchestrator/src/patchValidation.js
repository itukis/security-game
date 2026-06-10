const { validatePatchSafety, validatePatch } = require('./patchPolicy');
const { PROBLEM_META } = require('./problemMeta');

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

module.exports = { validatePatchRequest };
