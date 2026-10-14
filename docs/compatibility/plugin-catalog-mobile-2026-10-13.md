# Mobile certification — Calendar 1.5.10 and Kanban Bases View 0.10.6

Verified October 13, 2026 in Geode's **mobile runtime** (the `dist/mobile` bundle built
from Geode `main` at `435cb78`, which includes the Supported plugins list from
Geode PR #358; `package.json` version `0.30.0`), driven by Geode's Playwright mobile
harness on the `iPhone 13` and `iPad Pro 11` device projects (Chromium emulation).

This certifies only the two plugins below for mobile. Every other catalog entry stays
desktop-only. Desktop certification is unchanged (see `plugin-catalog-2026-10-13.md`).

| Plugin ID | Release | iPhone 13 | iPad Pro 11 |
| --- | --- | --- | --- |
| `calendar` | `1.5.10` | pass | pass |
| `kanban-bases-view` | `0.10.6` | pass | pass |

## Method

The real GitHub release assets (`main.js`, `manifest.json`, `styles.css` where shipped)
were downloaded, and their SHA-256 hashes were checked against the catalog hashes
before testing (identical to the table in `plugin-catalog-2026-10-13.md`). The
harness serves those exact bytes for the plugin's GitHub release URLs and serves a
catalog with `platforms: ["desktop", "mobile"]` for these two entries. For each plugin the spec:

1. opens Settings > Community plugins & themes on a mobile vault;
2. taps **Install** on the plugin's row in the Supported plugins list (hash-verified
   tested-release install) and checks it reports `Installed <name>`, is *not* enabled,
   and is listed as `Mobile compatible` (manifest `isDesktopOnly: false`);
3. taps **Enable** and checks the plugin manager reports it enabled;
4. exercises core function (below) while recording every console `error`/`warning`
   and uncaught page error. **Zero** were recorded for each plugin on each device.

**Calendar 1.5.10** — the three commands register (`show-calendar-view`,
`open-weekly-note`, `reveal-active-note`); the Calendar tab appears in the details
drawer; the month grid renders (Oct 2026, 42 day cells, today highlighted); tapping
today prompts `File 2026-10-13 does not exist` and **Create** makes and opens
`2026-10-13.md`; on iPad the day then shows the daily-note dot in the docked sidebar.

**Kanban Bases View 0.10.6** — a `.base` file with `type: kanban-view` and
`groupByProperty: note.status` over four notes renders three columns
(Doing 1, Done 1, Todo 2) with four cards; plugin stylesheet injected. Columns scroll
horizontally on the phone viewport (Todo is off-screen until scrolled), as designed.

## Not tested

- A real iOS device or the native `CapacitorHttp` download path. The harness is
  browser emulation with route-stubbed network (CSP bypassed for the fixtures only),
  so on-device install transport, WKWebView quirks and real touch drag are unverified.
- Kanban drag-and-drop between columns, quick-add and cover images on touch (desktop
  drag is covered by the desktop certification); Calendar weekly notes and the
  Daily-notes/Periodic-notes settings.
- Geode builds other than `main@435cb78`; the entries keep
  `minimumGeodeVersion` 0.30.0 and are only offered by clients that ship the mobile list.

## Reproduce

Download the release assets for both plugins into `<dir>/calendar/` and
`<dir>/kanban-bases-view/`, then in a Geode checkout at the commit above, copy
`scripts/verify-mobile-plugins.spec.ts` to `tests/mobile/` and run:

```sh
npm run build:mobile
CATALOG_JSON=/path/to/supported-plugins.v1.json ARTIFACTS=<dir> SHOTS=/tmp/shots \
  npx playwright test --config playwright.mobile.config.ts \
  tests/mobile/verify-mobile-plugins.spec.ts --workers=2
```

Expected: 4 passed (2 plugins x 2 devices). Screenshots are written to `SHOTS`.
