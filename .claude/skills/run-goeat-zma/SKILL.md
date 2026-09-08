---
name: run-goeat-zma
description: Run, start, launch, smoke-test, screenshot, or drive the GoEat Zalo Mini App (goeat-zma) — zmp-cli dev simulator on localhost:3000 with the real app in an iframe on :2999. Use for "run goeat", "start the mini app", "khởi chạy goeat", "screenshot goeat", "verify goeat renders".
---

# Run goeat-zma

All paths are relative to the `goeat-zma/` root (this app's directory).

GoEat is a Zalo Mini App (React 18 + Vite + zmp-ui + jotai, react-router v7).
Employee screens read through `src/api/ordering.ts`; with `VITE_API_MODE=mock`
(default in `.env`) that is an in-app spartronics-shaped mock whose orders live
in `localStorage["goeat.mock.orders.v1"]` — clear it to reset. Staff screens
(scan / kitchen) go through `src/api/staff.ts` with a mock in
`src/api/mock/staff.mock.ts`. In mock mode there is no backend and no login;
in `live` mode `AuthGate` (`src/components/auth-gate.tsx`) logs in via Zalo or,
in the simulator, via `VITE_DEV_EMPLOYEE_CODE` → `/api/zma/auth/dev-login`.
The dev server is the **zmp-cli simulator**: a phone-shell page on
`http://localhost:3000` that embeds the actual app (served on `:2999`) inside
`iframe#zalo-frame`. Drive it with the **Playwright MCP** browser tools.

## Run (agent path)

```bash
bash .claude/skills/run-goeat-zma/smoke.sh
```

Idempotent: reuses a running server or cold-starts one via
`npx -y zmp-cli@latest start` (log: `/tmp/goeat-zma-dev.log`), then verifies
the simulator shell (:3000), the app root (:2999), and the entry module
`/src/app.ts` all answer 200. `SMOKE PASS` = the app really renders, not just
the shell.

Then interact via Playwright MCP:

- `browser_navigate` → `http://localhost:3000/`
- `browser_snapshot` → app content appears nested under the `iframe` node;
  click the refs directly — Playwright pierces the frame
  (`#zalo-frame` → `contentFrame()`) automatically.
- `browser_take_screenshot` for visual verification. Resize to 390×844 first
  for a phone-shaped viewport.

Verified flows (2026-09-06): tapping a dish saves immediately (pill "Đã
chọn", day badge "N suất"), Ca 3 pick shows "Ngoài ca làm việc" + toast,
weekly tabs Tuần này/Tuần sau with locked past days, QR card, orders list,
profile → "Chế độ Quầy & Bếp" → scan screen; manual scan of `0007248201`
(served), `0007248203` (already picked), `0007248204` (no order), own card
`0007248113`; kitchen board with per-shift dish counts.

Depth pass (2026-09-08): the 2026-09-07 all-white restyle was rejected as "uglier than the prototype". Page ground for Home/Orders/Profile is `--ge-sage`; cards are white and separated by `--ge-shadow-card`/`--ge-shadow-lift`, NEVER by a 2px `inset` ring. Home and Profile use `<GreenHeader>` (`src/components/green-header.tsx`) — the prototype's radial-gradient green header with an SVG wave; the QR screens use a flat `--teal-700` ground so the ticket notches match exactly. The weekly page (`pages/weekly.tsx`, `components/ordering/*`) stays white and must not be touched — the user approved it as-is. See PLAN.md §11.2.

Layout (2026-09-08): app shell is `.ge-shell` (height 100%/100dvh, max-width 560px centered) — never use `h-screen`/100vh for the shell. Home (`pages/home.tsx`) is a "today" page (status card + Hiện mã nhận cơm + today menu + upcoming rows), NOT a copy of weekly; do not embed `DayCard` there.

Design (2026-09-07): the whole app follows the spartronics web
`/ordering` page look — white pages, forest green `--fd-wd-solid` actions,
terracotta calendar leaf (`.ge-daynum`) for day numbers, orange "Hôm nay"
pill, no gradients. Tokens live in `src/css/tokens.css` (`--fd-*`), shared
CSS in `src/css/app.scss` (`.ge-daycard`, `.ge-daynum`, `.ge-pickbtn`…).
Reference screenshots: `.playwright-mcp/restyle-*.png`. Screenshots taken
with `browser_take_screenshot` land in the app root, not `.playwright-mcp/`
— move them afterwards.

Employee routes: `/` (hôm nay), `/weekly` (đăng ký), `/qr`, `/orders`,
`/profile`. Standalone app (no shell) works at `http://localhost:2999/<route>`
for quick screenshots. Today is computed in Asia/Ho_Chi_Minh; on a Sunday the
"Hôm nay" card is absent (kitchen closed) — pick a weekday to see it.
Staff routes: `/admin/scan` (card scan; zmp `scanQRCode` fails in the
simulator — use the manual input) and `/admin/kitchen`; `/admin` redirects to
scan. Reachable in-app via Cá nhân → "Chế độ Quầy & Bếp", which only shows
when `bootstrap.staff.canScan || canKitchen` (mock: both true).

## Run (human path)

```bash
npx -y zmp-cli@latest start
```

Open `http://localhost:3000`. Ctrl-C to stop (but see Stop below — a child
process can survive).

## Stop

```bash
for p in 3000 2999; do lsof -ti tcp:$p -sTCP:LISTEN | xargs kill 2>/dev/null; done
```

Killing only the `npx zmp-cli` wrapper leaves an orphaned node listener on
:3000 (observed) — always free both ports by PID as above.

## Gotchas

- **Root `index.html` is load-bearing.** zmp-cli v4 serves from the project
  root and ignores `vite.config.mts`'s `root: "./src"`. Without a root
  `index.html` (a copy of `src/index.html`, whose `/src/app.ts` script path
  happens to be correct from the root) the simulator shell loads but the app
  iframe 404s → **black screen**. It was added for exactly this; don't delete
  either copy.
- **Don't run plain `./node_modules/.bin/vite`.** With `root: "./src"` the
  page requests `/src/app.ts` which resolves to `src/src/app.ts` → 404 →
  blank page. Always go through zmp-cli.
- **Port 3000 collision with vinhhoa.** The goerp vinhhoa Next.js dev server
  also defaults to :3000. If `curl -s -o /dev/null -w '%{http_code}'
  http://localhost:3000/` returns **307** (redirect to `/vi/sign-in`), you're
  talking to vinhhoa, not GoEat. Free the port (Stop section) before starting
  zmp — and warn the user their vinhhoa dev server was stopped.
- **The app is a cross-origin iframe.** `iframe#zalo-frame` (:3000 → :2999)
  has `contentDocument === null` from the shell page. Playwright MCP snapshot
  refs pierce it transparently; raw `browser_evaluate` from the top document
  cannot.
- Startup warning `Could not auto-determine entry point` is harmless.
- `.env` has `APP_ID`; `ZMP_TOKEN` is empty — only `zmp deploy` needs it,
  dev does not.
- No test suite exists (`package.json` has no test script).

## Troubleshooting

- **Simulator shows a black screen; :2999 returns 404 on `/`** → root
  `index.html` is missing (see Gotchas). Restore it and reload.
- **`zmp: command not found`** → zmp-cli isn't installed globally; always use
  `npx -y zmp-cli@latest <cmd>` (verified with v4.0.3).
- **`:3000` answers but it's the wrong app (307 redirect)** → vinhhoa Next.js
  is holding the port; run the Stop command, then re-run smoke.sh.
- **Server won't restart after a kill** → an orphaned listener survived; run
  the Stop command (kills by listening PID, not by name).
