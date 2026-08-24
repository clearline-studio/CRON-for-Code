# CRON for Code

Governed AI coding workspace — standalone Electron application and reusable Code workspace.

## What this is

CRON for Code is a **non-coder's coder app**. You describe what you want in plain English,
and CRON turns it into a real build/fix/create task, keeps you informed in plain language,
asks for approval when something needs it, and shows you what changed.

- **OpenCode is the real coding engine.** CRON for Code is the friendly, safe wrapper around it.
- Cloud-first model routing (OpenAI-compatible cloud API) with a local **Ollama** fallback.
- No Git commit/push/reset/clean happens without explicit approval.
- The same engine is designed to be reusable so CRON Intelligence can call it later as a module
  — no duplicated coding engine.

## Architecture

```
CRON for Code/
├── apps/standalone/       Electron desktop host (standalone-only shell)
├── packages/
│   ├── contracts/          Typed domain contracts
│   ├── core/               Reusable React workspace + OpenCode client (shared capability)
│   ├── data-service/       Persistence, OpenCode runner, safety/audit (shared capability)
│   └── host-adapter/       Host integration boundary
└── shared/
    ├── config/             Shared TypeScript configuration
    └── design-tokens/      CSS design tokens
```

### Embeddable boundary (for CRON Intelligence, later)

The shared capability is host-neutral; `packages/core` receives its dependencies
(`dataService`, `hostAdapter`, `llm`, `openCodeRunner`, `tray`, `folderPicker`) by injection.

- **Input a later Intelligence module would provide:** project + plain-language task +
  attachments/context.
- **Output:** status/progress, approval requests, changed files, verification evidence.
- **Shared engine (one copy, never duplicated):** OpenCode runner, safety/approval/audit,
  contracts, model routing (cloud-first + Ollama fallback).
- **Standalone-only (never shared):** Electron shell, tray, folder picker, window/restart controls.

## Model providers

- Default: **Cloud AI** (OpenAI-compatible endpoint, e.g. `https://api.openrouter.ai/api/v1`).
- Fallback: **Local AI via Ollama** (`http://127.0.0.1:11434/v1`) when the cloud is unavailable.
- Routing is automatic; model labels shown in the app reflect the configured models only.
- OpenCode performs the actual coding using the configured coding model.

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev                  # Start Vite + Electron
```

For a hidden development launch that can be pinned to the taskbar:

```powershell
scripts\create-code-dev-shortcut.ps1
```

This creates `CRON for Code Dev.lnk` on the Desktop. Right-click the shortcut and
choose **Pin to taskbar**, then use that icon to launch the development app. The
launcher writes logs under `.runtime/` and never runs `pnpm install` automatically.

## Testing

```bash
pnpm test                 # Run all workspace tests
pnpm typecheck            # TypeScript type checking
pnpm lint                 # ESLint
pnpm format:check         # Prettier format check
```

## Building

```bash
pnpm build                # Build all packages + standalone app
```

## Status

Current state (working tree, not yet committed):

- Electron shell with tray, window-state persistence, and a CRON-styled folder picker;
- Cloud-first AI settings (Cloud AI + local Ollama fallback) with connection test;
- OpenCode-driven coding: prompt → task → real OpenCode session → approval/resume → evidence;
- JSON-backed project/task/approval/execution/audit persistence;
- plain-English activity/progress, changed-file review, and approval gates;
- reusable `@cron-code/core` React workspace with host adapters;
- project selection deduplicates repository paths;
- packaged installer builds to the Desktop via `electron-builder`.

Not yet implemented:

- preview/test/export/deploy guidance surfaces;
- live rollback/checkpoint restore UI;
- Intelligence module handoff (boundary documented; not built yet).
