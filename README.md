# CRON for Code

Governed AI coding workspace — standalone Electron application and reusable Code workspace.

## Architecture

```
CRON for Code/
├── apps/standalone/       Electron desktop host
├── packages/
│   ├── contracts/          Typed domain contracts
│   ├── core/               Reusable React workspace
│   ├── data-service/       Persistence abstraction (JSON-backed)
│   └── host-adapter/       Host integration boundary
└── shared/
    ├── config/             Shared TypeScript configuration
    └── design-tokens/      CSS design tokens
```

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

Current state (v1.1.7 working tree, not yet committed):

- Electron shell with tray and window-state persistence;
- LM Studio local-model chat (settings, connection test, chat completion) via IPC;
- JSON-backed project/task/approval persistence;
- reusable `@cron-code/core` React workspace with host adapters;
- project selection deduplicates repository paths;
- packaged installer builds to the Desktop via `electron-builder`.

Not yet implemented:

- real task/agent execution (the task runner still uses a placeholder executor);
- approval UI gates;
- Git release gate;
- OpenCode integration.

Phase: foundation + shell + local-model chat. No release gate yet.
