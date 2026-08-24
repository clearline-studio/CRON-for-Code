# BB — CRON for Code UI Redesign — Slice 1: 4-column shell + left nav + project browser

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). You implement UI exactly as specified. You do NOT redesign, do NOT invent features, do NOT "improve" the plan. Gem (the architect) owns the design; you build it and report back. Talk in plain English in any note you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in this order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md` — the full product vision. The rule you must internalise: **build a "make me an app" interface, NOT a prettier developer IDE. OpenCode is the invisible mechanic.**
2. `CRON_CODE_UI_REDESIGN_AUDIT.md` — the current-state map and what must NOT break.

**CURRENT VERIFIED STATE (from Gem's audit — trust this, don't re-derive)**
- The live app is a single-column shell: `Layout.tsx` (46px top bar + chat + optional right review pane + `EmptyState` + overlays) and `CronAssistant.tsx` (the chat). No left nav, no project-browser column, no progress sidebar exist today.
- The OpenCode wiring you must preserve is narrow: renderer `packages/core/src/opencode-client.ts`, runner `packages/data-service/src/opencode-runner.ts`, IPC `cron:opencode:run-task` / `cron:opencode:reply-approval` / `cron:opencode:event`, and store methods `createDraftTask` / `approveApproval` / `rejectApproval` / `refreshTasks|Approvals|Executions`. Approvals already work inline in `CronAssistant`.
- Projects come from the zustand store (`createWorkspaceStore` in `packages/core/src/store.ts`, state `projects` / `activeProjectId`; `selectProject` / `openProjectPath` actions; `PickerModal` = the dark folder browser; `selectProject` is the existing New-Project flow).
- Styling = inline `CSSProperties` constants + design tokens (`shared/design-tokens/index.css`). Icons = `lucide-react`. No Tailwind/CSS modules.
- There is NO live-preview mechanism. Do not build one in this slice.

**OBJECTIVE — Slice 1 only**
Build the **4-column shell + left navigation + project browser** (spec §3, §4, §5, §7). Concretely:
1. Reshape `Layout.tsx` into a 4-column grid: left nav (220px) | project browser (290px) | centre (flex, dominant) | right sidebar (330px). App opens maximized; no horizontal overflow; account area not clipped by the taskbar (spec §26).
2. New `LeftNav` component (spec §4): CRON logo + `CRON` / `for Code`; items Home, Projects, Create New, Templates, My Apps, Deployments, Learn, Settings with the specified Lucide icons, ~48px tall, selected = electric-blue rounded rect + subtle glow. "Create New" triggers the existing New-Project (`selectProject`/`PickerModal`) flow; "Settings" opens the existing `ModelSettings`. Items with no real function yet (Templates, My Apps, Deployments, Learn) are visible but clearly secondary/inert — do NOT build fake screens for them.
3. New `ProjectBrowser` column (spec §7): `Your Projects` heading, `+ New Project` primary button, `Search projects...` + filter, project cards (icon, name, type, last-updated) driven by the **real** `projects` state, selected card highlighted (brighter bg + electric-blue border + subtle glow), `View all projects →` at bottom. Show a friendly empty state when there are no projects (do NOT invent sample data).
4. New user/account area (spec §5): avatar, name, plan, `OpenCode Credits` with progress bar, `v1.0.0` + `All Systems Operational`. Use placeholder values; keep it above the taskbar.
5. New slim top app bar (spec §6): `Build mode: OpenCode (local)` + green dot left; Help, bell, `Speak to CRON` blue button right (the button is present but can be inert this slice).
6. **Centre panel:** keep the existing `CronAssistant` + `EmptyState` EXACTLY as they are — do not rework them (that's slice 2).
7. **Right sidebar:** a structural placeholder panel only — a titled empty panel (e.g. "Build Progress — coming next"). No fake data. Its real content is slice 3.

**IN-SCOPE**
New: `LeftNav`, `ProjectBrowser` (or equivalent), account area, top bar; `Layout.tsx` reshaped into the 4-column grid; a minimal right-sidebar placeholder. Wiring the project browser to the existing `projects` state + `selectProject` flow. Keeping centre chat intact.

**OUT-OF-SCOPE (do NOT touch)**
- OpenCode runner/client/IPC/approval logic and `CronAssistant` internals.
- Build conversation rework, friendly build plan, live preview, build-progress/engine/tools/quick-actions panels, approval-card restyle, error translation, responsive collapse below 1400px/1200px (just don't overflow at current size).
- Deleting dead components (`Sidebar`, `TaskWorkspace`, etc.) — leave them.
- Any backend/build-logic change.

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Only add new files and edit the files needed for this slice. Back up any file before you edit it (copy to `*.bak-<date>`, which is gitignored). If you touch something outside scope by accident, revert it and say so.

**ACCEPTANCE**
- App opens maximized with four visible columns; centre is dominant; no horizontal scrollbar.
- Left nav shows all 8 items; Create New opens the picker; Settings opens ModelSettings.
- Project browser lists the user's real projects from the store and highlights the active one; `+ New Project` works.
- The centre chat still opens a project and sends a message exactly as before (regression check).
- Account area + `v1.0.0` are visible and not clipped by the taskbar.
- No "LM Studio" wording anywhere; labels use the spec's plain-English copy.

**VERIFY (run all, report real results)**
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

**FINAL REPORT (copy this back)**
1. Exact files changed (added/edited) + purpose of each.
2. What existing functionality you preserved (list).
3. What you intentionally did NOT change.
4. Test/typecheck/lint/build results (counts).
5. Any gaps, mismatches with the spec, or questions — max 10 lines total.

Do not commit. Stop and report back when done.
