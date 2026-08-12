# CRON for Code — Pre-Packaging Truth Audit

## Architect instruction for CC/OpenCode

Venessa wants a detailed audit of CRON for Code before deciding what else must be added or repaired for packaging.

This is an audit/report slice only unless a tiny evidence-gathering change is absolutely required. Do not implement new features. Do not do Git actions.

## Required CC workflow for this session

ChatGPT/Codex is the Architect. CC/OpenCode audits only this approved prompt file.

Rules:

- Read this prompt file first.
- Confirm you have read it before auditing.
- Do not start unrelated fixes.
- Do not begin another Code task after this one.
- Do not claim something works unless you verified it.
- If something is unverified, say `UNVERIFIED`.
- If something is visible but not functional, mark/report it as `DEV`.
- Return the complete report to the CRON Architect for review.
- No Git actions unless Venessa explicitly approves them later.

## Audit goal

Produce a clear Code readiness report so Venessa and the Architect can decide what remains before packaging.

The report must answer:

1. What is done and working?
2. What is partially done?
3. What is visible but not wired?
4. What is marked DEV?
5. What should be marked DEV but is not?
6. What is broken/regressed?
7. What blocks packaging?
8. What blocks Code from being useful as a coding command centre?
9. What should be the next 5-10 finishing slices?

## Code baseline to audit

### Core shell

- launch/startup
- restart screen/flow and no second flash
- taskbar/icon/window behaviour
- dark CRON shell
- OpenCode-style layout progress
- sidebar/project pane
- top workspace strip
- right assistant panel
- status/footer

### Project management

- open project
- add/select project
- project row menu
- open in file explorer
- copy project path
- refresh project
- rename display name
- re-link folder
- remove from CRON
- CRON-styled picker flow
- DEV markers for unfinished actions

### Tasks/workflow

- create task
- task title/description
- approval/evidence panel
- execution queue if present
- safety lock/review/release states
- logs/checks/verification tabs
- footer tabs and DEV truthfulness

### Code/repo insight

- changed-files/review area
- Git status/additions/deletions
- file list/diff if present
- test/build/lint/check wiring
- no fake Git or check status

### Assistant/model

- CRON assistant panel
- message send/reply
- model selector
- model/status truthfulness
- DEV markers for unfinished AI/help features

### Packaging readiness

- build/test/typecheck/lint commands
- Electron/app packaging config if present
- icons/assets
- launcher/shortcut readiness
- Windows issues
- remaining blockers before first packaged build

## Verification to run

Run configured Code checks and report exact results:

- typecheck
- lint
- tests
- build
- git diff check
- git status

If a command does not exist, report that clearly.

## Live/manual verification

Launch Code and manually check at least:

- normal launch
- restart and no second flash
- project selection/open project
- project row menu actions
- CRON Online status is non-clickable
- Create Task
- right assistant/model control
- changed-files/review area
- DEV markers
- OpenCode-style layout fit

## Required output files

Create:

- `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_REPORT.md`
- `CRON_CODE_PRE_PACKAGING_TRUTH_AUDIT_EVIDENCE.md`

Update:

- `CRON_ARCHITECT_LOG.md`
- `PROJECT_LOG.md`

## Report format required

Use plain English and these sections:

1. Executive summary
2. Working / accepted
3. Partially working
4. Visible but DEV or not wired
5. Broken/regressed
6. Packaging blockers
7. Coding-workspace usefulness blockers
8. Risks / unknowns
9. Recommended finishing slices, ordered
10. Verification evidence
11. Git safety statement

## Boundaries

- No Git commit, push, merge, PR, tag, release, rebase, reset, restore, clean, or destructive history action.
- Do not implement new features in this audit.
- Do not fake Git/check/model status.
- Keep this focused on truthful readiness for packaging.
