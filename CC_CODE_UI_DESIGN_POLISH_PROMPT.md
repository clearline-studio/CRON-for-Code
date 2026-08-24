# BB — CRON for Code UI — design polish (footer, profile card, background, fonts, restart, shield)

**ROLE**
You are BB, the builder (DeepSeek V4 Flash). Implement exactly as specified; do not redesign or invent. Gem owns the design. Plain English in anything you hand back to Venessa.

**REPO**
`C:\Users\venes\projects\CRON APPS\CRON for Code` (pnpm monorepo, Node ≥24)

**READ FIRST (in order)**
1. `CRON_CODE_UI_REDESIGN_SPEC.md` (esp. §2 colours, §5 account, §19 status bar, §20 plain-English)
2. `CRON_CODE_UI_REDESIGN_AUDIT.md`

**CONTEXT**
The shell, Home, screens, logo, edge tabs, and the recent profile-footer change are built and green. This is a design-polish pass. The right sidebar is OUT OF SCOPE (leave it alone). Keep placeholder identity values ("Alex Smith" / "Creator Plan" / credits 1,250/2,000) — no real auth.

**OBJECTIVE — seven changes**

1. **Restart/loading splash ~3s.** The "loading code"/restart screen currently flashes ~1s and feels like a glitch. Make the loading/restart splash hold for a **~3 second minimum** before the app reveals, on both initial launch and restart. (Find the splash in `apps/standalone/index.html` + `main.tsx` and the `RestartOverlay`; enforce a ~3s minimum display, e.g. don't hide the splash until `max(3000ms, ready)`.)

2. **Slim global footer + fix taskbar clipping.** The current bottom-left profile footer is being hidden by the Windows taskbar and looks cramped. Replace it with a proper **slim global footer bar** across the bottom of the app (spec §19): ~24px tall, a divider line on top, minimal content — a green dot + "All Systems Operational" on the left, `v1.0.0` on the right, subtle. It must sit **above the taskbar** (fix the vertical layout so nothing overflows `100vh`; account/footer must never be clipped).

3. **Profile avatar + browser-style profile card.** Move the profile/account content OUT of the footer. Put a compact clickable **avatar at the bottom of the left rail** (above the footer). Clicking opens a **dark, elevated profile card** styled like the CRON Browser app's profile panel: rounded ~12px, dark panel background, clean sections separated by thin dividers. Contents, top to bottom:
   - Avatar + "Alex Smith" + "Creator Plan"
   - **"OpenCode Credits"** section (the token monitor): the progress bar (1,250 / 2,000) + "Resets in 12 days"
   - Divider, then `v1.0.0` + green "All Systems Operational"
   Reuse/restyle `AccountArea.tsx`; the credits bar moves inside this card (it is the "token monitor").

4. **Code-safety shield in the left rail.** Add a small **shield icon** to the bottom of the left rail, just above the profile avatar, separated by a subtle divider. It reflects the real code-execution governance state:
   - **Green `ShieldCheck`** by default = "Code safety active — approvals on" (governed).
   - **Amber `ShieldAlert`** when there are pending approvals (real: approvals with status `requested`), with a small count badge; clicking it opens the Review panel (approvals).
   - A tooltip explaining the state. This is a read-only indicator — do NOT touch OpenCode wiring; just read `approvals` from the store.

5. **Oryx background → Home only; glow elsewhere.** Currently the oryx/shell background (`--cron-shell-bg-image`, the `backdropStyle` in `Layout.tsx`) shows on all pages. Change it so the oryx background appears **only on the Home screen**, and all other screens (Templates, My Apps, Deployments, Learn, and the project conversation view) get a **subtle blue radial glow** ambience instead (no oryx image, more glow).

6. **Crisper, brighter-white font.** Brighten the primary text token (`--cron-text-primary`) toward pure white (e.g. `#ffffff` or `#f5f9ff`), and add `-webkit-font-smoothing: antialiased` / `text-rendering: optimizeLegibility` on the app root for crisper text.

**IN-SCOPE**
`apps/standalone/index.html`, `apps/standalone/src/main.tsx`, `packages/core/src/components/Layout.tsx`, `HomeScreen.tsx`, `AccountArea.tsx`, `ProfileFooter.tsx` (rework or replace), `LeftTabStrip.tsx` (shield placement), `RestartOverlay.tsx`, `shared/design-tokens/index.css`, `index.ts` exports, and affected tests.

**OUT-OF-SCOPE (do NOT touch)**
OpenCode wiring, `CronAssistant.tsx` + centre chat, the right sidebar, the plan/build pipeline, the MP4, dead components.

**GIT SAFETY**
No commits, no pushes, no deletes, no `git add .`. Back up any file before editing (`*.bak-<date>`, gitignored).

**ACCEPTANCE**
- Loading/restart splash shows ~3s (not a 1s flash).
- A slim global footer sits above the taskbar (not clipped): "All Systems Operational" + `v1.0.0`.
- Profile avatar at the bottom of the left rail opens a dark browser-style card with name/plan/credits/version.
- A shield icon shows green normally, amber (with count) when approvals are pending, and opens Review on click.
- Oryx background only on Home; other screens have a blue glow, no oryx.
- Text is brighter white and crisper.
- Right sidebar unchanged. No "LM Studio"/"Gemma" wording. Centre chat + OpenCode still work (regression).

**VERIFY (run all, report real results)**
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

**FINAL REPORT (copy this back)**
1. Exact files changed + purpose.
2. What you preserved.
3. What you did NOT change.
4. Test/typecheck/lint/build results.
5. Gaps/questions — max 10 lines.

Do not commit. Stop and report back when done.
