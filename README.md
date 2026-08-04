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

Phase 0 — Foundation scaffold. No OpenCode/model integration yet.
