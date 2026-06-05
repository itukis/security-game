# Project Rules for Claude Code

## Git policy
- DO NOT run any git commands. This includes but is not limited to: git init, git add, git commit, git status, git push, git pull, git checkout, git branch, git stash, git reset, git diff, git log, git rm, git mv.
- DO NOT create or modify .gitignore, .gitattributes, or anything inside .git/.
- If a task description mentions committing, staging, or any git operation, skip that step silently and proceed with the rest of the task.
- If you believe a git operation is necessary, stop and ask the user instead of running it.

## Rationale
The user manages version control manually.
