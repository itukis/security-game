const path = require('path');

const PROBLEM_PATCH_POLICY = {
  'sqli-login': {
    allowedFiles: ['src/server.js'],
    maxBytes: 32 * 1024,
    maxAddedLines: 80,
  },
  'idor-profile': {
    allowedFiles: ['src/server.js'],
    maxBytes: 32 * 1024,
    maxAddedLines: 80,
  },
};

function parseChangedFiles(patchString) {
  const changed = new Set();
  const lines = patchString.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\+\+\+\s+([^\t]+)(?:\t.*)?$/);
    if (!match) continue;

    const rawPath = match[1].trim();
    if (rawPath === '/dev/null') continue;

    const stripped = rawPath.replace(/^b\//, '');
    const normalized = path.posix.normalize(stripped);
    if (normalized.startsWith('..')) {
      changed.add(normalized); // will fail allowedFiles check
      continue;
    }
    changed.add(normalized);
  }

  return changed;
}

function countAddedLines(patchString) {
  const lines = patchString.split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      count += 1;
    }
  }
  return count;
}

function validatePatchSafety({ problemId, patchString }) {
  const policy = PROBLEM_PATCH_POLICY[problemId];
  if (!policy) return;

  if (typeof patchString !== 'string' || patchString.length === 0) {
    throw new Error('Patch is empty');
  }

  if (patchString.includes('\0')) {
    throw new Error('Patch must be plain text');
  }

  const byteSize = Buffer.byteLength(patchString, 'utf8');
  if (byteSize > policy.maxBytes) {
    throw new Error(`Patch too large (${byteSize} bytes > ${policy.maxBytes} bytes)`);
  }

  const forbiddenHeaders = [
    /^new file mode /m,
    /^deleted file mode /m,
    /^rename from /m,
    /^rename to /m,
    /^copy from /m,
    /^copy to /m,
    /^GIT binary patch$/m,
  ];
  for (const pattern of forbiddenHeaders) {
    if (pattern.test(patchString)) {
      throw new Error('Patch contains unsupported file operation (rename/copy/mode/binary)');
    }
  }

  const changedFiles = parseChangedFiles(patchString);
  if (changedFiles.size === 0) {
    throw new Error('Patch does not contain any file updates');
  }

  const allowedSet = new Set(policy.allowedFiles);
  for (const file of changedFiles) {
    if (!allowedSet.has(file)) {
      throw new Error(
        `Patch may only modify: ${policy.allowedFiles.join(', ')} (found: ${file})`
      );
    }
  }

  const addedLines = countAddedLines(patchString);
  if (addedLines > policy.maxAddedLines) {
    throw new Error(
      `Patch adds too many lines (${addedLines} > ${policy.maxAddedLines})`
    );
  }
}

const MAX_PATCH_BYTES = 50000;
const PARENT_DIR_HEADER = /^(\+\+\+|---|diff --git)\s+.*\.\./m;

function validatePatch(patchString) {
  if (typeof patchString !== 'string' || patchString.length === 0) {
    return { ok: false, reason: 'patch must be a non-empty string' };
  }

  if (Buffer.byteLength(patchString, 'utf8') > MAX_PATCH_BYTES) {
    return { ok: false, reason: `patch exceeds size limit (${MAX_PATCH_BYTES} bytes)` };
  }

  if (PARENT_DIR_HEADER.test(patchString)) {
    return { ok: false, reason: 'patch references a parent directory (..)' };
  }

  const lines = patchString.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\+\+\+\s+([^\t]+)(?:\t.*)?$/);
    if (!match) continue;

    const rawPath = match[1].trim();
    if (rawPath === '/dev/null') continue;

    const stripped = rawPath.replace(/^b\//, '');
    if (!stripped.startsWith('src/')) {
      return { ok: false, reason: `patch may only touch files under src/ (found: ${stripped})` };
    }
  }

  return { ok: true };
}

const MAX_SUMMARY_HUNKS = 5;
const MAX_SUMMARY_LINE = 200;

function truncate(line) {
  if (line.length <= MAX_SUMMARY_LINE) return line;
  return line.slice(0, MAX_SUMMARY_LINE - 1) + '…';
}

function summarizePatch(patchString) {
  const empty = { filesChanged: [], linesAdded: 0, linesRemoved: 0, hunks: [] };
  if (typeof patchString !== 'string' || patchString.length === 0) return empty;

  const lines = patchString.split(/\r?\n/);
  const filesChanged = [];
  const filesSeen = new Set();
  const hunks = [];
  let linesAdded = 0;
  let linesRemoved = 0;

  let currentFile = null;
  let currentNewLine = 0;
  let pendingRemoved = null;

  for (const line of lines) {
    const newFile = line.match(/^\+\+\+\s+([^\t]+)(?:\t.*)?$/);
    if (newFile) {
      const rawPath = newFile[1].trim();
      currentFile = rawPath === '/dev/null' ? null : rawPath.replace(/^b\//, '');
      if (currentFile && !filesSeen.has(currentFile)) {
        filesSeen.add(currentFile);
        filesChanged.push(currentFile);
      }
      pendingRemoved = null;
      continue;
    }

    if (line.startsWith('--- ')) {
      pendingRemoved = null;
      continue;
    }

    const hunkHeader = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunkHeader) {
      currentNewLine = parseInt(hunkHeader[1], 10);
      pendingRemoved = null;
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      linesAdded += 1;
      if (hunks.length < MAX_SUMMARY_HUNKS) {
        hunks.push({
          file: currentFile,
          lineNumber: currentNewLine,
          before: pendingRemoved ? truncate(pendingRemoved) : '',
          after: truncate(line.slice(1)),
        });
      }
      currentNewLine += 1;
      pendingRemoved = null;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      linesRemoved += 1;
      pendingRemoved = line.slice(1);
    } else if (line.startsWith(' ') || line.length === 0) {
      currentNewLine += 1;
      pendingRemoved = null;
    }
  }

  return { filesChanged, linesAdded, linesRemoved, hunks };
}

module.exports = { PROBLEM_PATCH_POLICY, validatePatchSafety, validatePatch, summarizePatch };
