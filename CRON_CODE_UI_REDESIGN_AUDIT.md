# CRON for Code — UI Redesign Audit (current state map)

Read this before building. It maps what exists today so the redesign wraps working functionality instead of breaking it. Companion to `CRON_CODE_UI_REDESIGN_SPEC.md`.

## Repo shape

pnpm monorepo (Node ≥24, pnpm 11.x). React + Electron + Vite + zustand + TypeScript.

- `packages/core` — all React UI, store, chat runtime, LLM types
- `packages/data-service` — persistence + execution (OpenCode runner, safe harness, project management)
- `packages/contracts` — shared domain types + factories
- `packages/host-adapter` — `HostAdapter` interface + standalone/mock impls
- `apps/standalone` — Electron main + preload + Vite renderer
- `shared/design-tokens` — CSS custom properties
- `shared/config` — shared tsconfig

## The live UI (what's actually rendered)

Entry: `apps/standalone/src/main.tsx` → `CronCodeApp` (`packages/core/src/components/App.tsx`) → `Layout` (`packages/core/src/components/Layout.tsx`).

The current app is effectively a **single-column shell**, made of three components:

- **`Layout.tsx`** — the real structure: a 46px top bar (hamburger, New Project, New Session, session readout, `CRON ready` pill, review-pane toggle, Restart, Settings), a main workspace holding the chat + an optional resizable right "review" pane (default 380px), an `EmptyState` entry screen when no project is open, and overlays: `ProjectDrawer`, `ModelSettings`, `RestartOverlay`, `PickerModal`.
- **`CronAssistant.tsx`** — the whole chat/planner surface: messages, composer, route badge, and inline OpenCode "execution trail" cards with Approve/Reject.
- **`EmptyState.tsx`** — the entry screen (Open Project CTA, resume list, role chips).

### Dead code (leave alone, do NOT delete)

These are exported from `index.ts` but only referenced in tests — legacy/alternative views not used by the live layout: `Sidebar`, `TaskWorkspace`, `TaskComposer`, `TaskCard`, `ProjectArea`, `ProjectContextMenu`, `ConfirmDialog`, `RenameDialog`, `CronFooter`, `CronNavBar`, `WorkflowStrip`. `LlmSettings.tsx` is a deprecated shim re-exporting `ModelSettings`.

## The wiring to PRESERVE (narrow + stable)

OpenCode integration surface:
- Renderer client: `packages/core/src/opencode-client.ts` (`OpenCodeRunnerClient`: `runTask`, `replyToApproval`, `onEvent`)
- Runner: `packages/data-service/src/opencode-runner.ts` (`OpenCodeRunner`)
- IPC: `cron:opencode:run-task`, `cron:opencode:reply-approval`, `cron:opencode:event`
- Store methods: `createDraftTask`, `refreshTasks`/`refreshApprovals`/`refreshExecutions`, `approveApproval`/`rejectApproval`

### Chat/prompt flow

`CronAssistant.handleSubmit` → `inferRoute(prompt, attachments)` (image→local-vision; go-signal/code→opencode-flash; else local-chat) → two branches:
- Executor (`opencode-flash`): `buildOpenCodeHandoffPrompt` → `createDraftTask` → `openCodeRunner.runTask`.
- Planner (`local-chat`/`local-vision`): `llm.chat(...)` read-only.

Note: `pro-escalation` is a defined route but unreachable today (never returned by `inferRoute`, and `OpenCodeRunner.runTask` blocks the escalation model). Leave as-is.

### Approvals

Two paths; the chat-visible one is what matters: OpenCode permission approvals created in `OpenCodeRunner.requestOpenCodeApproval`, surfaced as `awaiting_approval` events, resolved via `replyToApproval` → `adapter.replyToPermission`. UI: inline in `CronAssistant.HandoffExecutionCard` (Approve/Reject). The Review pane's "Approvals"/"Evidence" tabs are **static labels** — only "Changed Files" is functional today.

### Persistence + routing

`DataService`/`DataStore` in `packages/data-service/src/types.ts`. Domains: projects, tasks, approvals, executions, audit, preferences. JSON impl `createJsonDataService` (`json-store.ts`) writes one `store.json`. Renderer proxy `createIpcDataService`. Storage dir: `<userData>/cron-for-code-data/store.json` (`%APPDATA%/CRON for Code Dev` in dev, else `%APPDATA%/CRON for Code`). Project management: `project-management.ts`. Project boundary: `project-boundary.ts` (`resolveProjectRoot` finds git root, `assertPathInsideProject`).

## What does NOT exist (net-new, do not fake)

- **No live app preview** — no iframe, no served build, no `webview`. Nothing shows the built app today. The only `capturePage()` usage is dev-only diagnostics of the CRON window itself. This is the biggest single new piece.
- No build-progress %/timeline mapping, no tools/integrations, no quick-actions panel, no friendly approval-card UI (approvals are a terse inline card), no error-translation layer, no left nav, no project-browser column.

## Styling

Inline `CSSProperties` constants per component (no Tailwind/CSS modules/styled-components). Icons: `lucide-react`. Design tokens: `shared/design-tokens/index.css` `:root` custom properties (imported once in `main.tsx`). Key tokens: `--cron-app-bg #050812`, `--cron-panel-bg #0b1628`, `--cron-surface-bg #0d1b31`, `--cron-blue-accent #3b82f6`, text `--cron-text-primary #eaf2ff` / secondary `#8da4c7` / tertiary `#5f7392`, status running `#3b82f6` / completed `#22c55e` / error `#ef4444` / warning `#f59e0b`, radii 4/6/8, spacing 4/8/16/24/32.

The spec's palette (bg `#050A12`, accent `#176BFF`/`#1F82FF`) is close to the existing tokens; align where cheap, don't rip out the token system.

## State

zustand (`createStore` vanilla). `createWorkspaceStore(deps)` in `packages/core/src/store.ts`. `WorkspaceState` holds `projects, activeProjectId, tasks, approvals, executions, commands, selectedTaskId, isRestarting, pickerActive, …`. React binding via `WorkspaceProvider` + `useWorkspaceStore(selector)` in `context.tsx`. Store created once in `App.tsx`.

## What this means for the redesign

- The redesign reshapes `Layout.tsx` + adds new components (left nav, project browser, right sidebar panels). The center conversation rework touches `CronAssistant.tsx` (slice 2). The OpenCode pipe stays untouched.
- Project-browser column can be driven by the existing `projects` state + the existing `selectProject`/`PickerModal` flow.
- The build plan/progress (slices 2–3) must translate existing `OpenCodeRunEvent`s into friendly phases — extend `activity-english.ts`/`summarizeActivity`, don't invent new event streams.
- Live preview (slice 5) is greenfield — plan it separately; don't fake it.
