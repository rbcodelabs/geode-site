# Supported-plugin catalog re-certification — Geode 0.30.0

Verified October 13, 2026 on macOS (Apple silicon) desktop with the **installed
Geode 0.30.0** application (`/Applications/Geode.app`, `CFBundleShortVersionString`
0.30.0, matching the published `v0.30.0` release) and unmodified GitHub release
assets. Every catalog entry was re-certified in full against its latest stable
upstream release; the conservative minimum Geode version for every entry is
therefore 0.30.0, the version tested here. Earlier Geode versions are not
certified by this run. Desktop only; mobile is a separate certification.

| Plugin ID | Repository | Previously certified | Certified now | Manifest minimum |
| --- | --- | --- | --- | --- |
| `claude-threads` | `rbcodelabs/agent-threads` | `v0.44.0` | `v0.62.1` | `1.0.0` |
| `threads-design` | `rbcodelabs/threads-design` | `v0.2.0` | `v0.5.0` | `1.7.2` |
| `threads-orchestrator` | `rbcodelabs/threads-orchestrator` | `v0.2.0` | `v0.2.0` (re-certified against Threads 0.62.1) | `1.10.2` |
| `terminal` | `polyipseity/obsidian-terminal` | `3.27.2` | `3.28.0` | `1.4.11` |
| `kanban-bases-view` | `xiwcx/obsidian-bases-kanban` | `0.10.4` | `0.10.6` | `1.10.2` |
| `obsidian-minimal-settings` | `kepano/obsidian-minimal-settings` | `9.0.0` | `9.0.0` (hashes re-verified) | `1.13.0` |
| `calendar` | `liamcain/obsidian-calendar-plugin` | `1.5.10` | `1.5.10` (hashes re-verified) | `0.9.11` |

Calendar's only newer GitHub releases are the 2021 `2.0.0-beta` / `2.0.0-beta.2`
pre-releases, which are intentionally not adopted: the catalog certifies stable
releases only, so Calendar stays on `1.5.10`.

Install and enable Agent Threads 0.62.1 first, then Design and/or Orchestrator.
This catalog does not install peer dependencies automatically. Design 0.5.0 and
Orchestrator 0.2.0 were tested with Threads 0.62.1; no claim is made about other
Threads releases.

## Verification

Release `main.js`, `manifest.json` and (when shipped) `styles.css` were fetched
with `gh release download` from each repository's tagged release, hashed with
SHA-256, and their manifests read (`id`, `version`, `minAppVersion` below match
the catalog). The hashes of the three plugins whose release did not change
(Orchestrator 0.2.0, Minimal Settings 9.0.0, Calendar 1.5.10) are byte-identical
to those previously published.

Each test launches the installed application (`GEODE_HEADLESS=1`, hidden window,
separate throwaway `--user-data-dir`) against a synthetic vault.

**Threads family** — `scripts/verify-core-plugins.mjs` (version assertion bumped
to `0.62.1 / 0.5.0 / 0.2.0`). All assertions passed:

- all three plugins enable with the exact versions above;
- Threads creates and opens a thread through public API v1 without starting a
  paid agent session;
- Design creates and attaches a static artifact, opens Geode's secure preview, and
  captures a screenshot after the guest document finishes loading; a missing
  artifact yields a structured error;
- Orchestrator opens its voice panel and discovers the new thread through its real
  peer API client;
- reloading Threads reconnects Design and retains the artifact;
- after a full app restart all three load and the artifact persists;
- all three disable cleanly; no uncaught renderer errors.

**Terminal, Kanban Bases View, Minimal Settings, Calendar** —
`scripts/verify-community-plugins.mjs` re-runs Geode's own E2E specs
(`terminal-plugin-cert`, `bases-plugin-view`, `bases-kanban-interaction`,
`minimal-settings-compat`, `calendar-plugin`) against the installed 0.30.0 app and
the unmodified release assets instead of the vendored fixtures. 7 tests, all
passed:

- Kanban 0.10.6: board renders from a `.base` file through the real release bundle,
  grouped by frontmatter and by a formula property; `createDiv` Document/Element
  semantics; drag between columns, quick-add, open, and cover images write the
  vault correctly.
- Minimal Settings 9.0.0: theme, toggles, dropdowns and sliders render and drive
  body classes and font variables; settings persist across an app restart; an
  untested modern plugin remains blocked.
- Calendar 1.5.10: existing daily notes are marked and opened rather than
  recreated; creation of a missing note still works; no console errors.
- Terminal 3.28.0: the plugin enables, registers its commands and ribbon icon,
  spawns a real shell (integrated terminal), the shell **executes a typed command
  and writes a marker file** (real pty round trip, asserted by the test), terminal
  hotkey scope is released on blur, and the profile-picker modal scope is created
  and cleaned up.

### Terminal 3.28.0 notes

The Terminal spec tolerates one known upstream emitter error
(`<x>.value is not a function`, thrown inside the plugin's own bundled
`@polyipseity/obsidian-plugin-library`/xterm event emitter during pty data
delivery; not a Geode API gap). In 3.28.0 the minifier renamed the variable
(`_` to `B`), so the spec's literal `_.value` filter no longer matched. The filter
was generalised to `\w+.value is not a function`. As a control, the previous
release 3.27.2 run on the same installed app produced the same error class at a
comparable volume (89 vs 86 occurrences in one run), so 3.28.0 behaves the same
as the previously certified release. Any other page or console error still fails
the test.

## Scope and limitations

This is desktop host-integration coverage, not certification of every plugin
feature. Not tested: live Claude/Codex turns, paid OpenAI Realtime sessions, real
microphone input, wake-word recognition (Orchestrator wake-word stayed disabled;
its optional model downloads are outside the manifest/main.js/styles.css hash
contract), Terminal on non-macOS shells, Calendar 2.0 betas, and all mobile
execution. Provider accounts and their usual setup are still required for live
agents or voice. The tests use only synthetic notes and isolated app profiles; they
do not modify the user's vault or contact an AI provider.

## Reproduce

Download `main.js`, `manifest.json` and `styles.css` (when present) from each release
into a directory named for the plugin ID beneath one artifact root (Design,
Calendar have no `styles.css`). Check the hashes below, then:

```sh
PLAYWRIGHT_PACKAGE=/path/to/geode/package.json \
PLUGIN_ARTIFACTS=/path/to/release-assets \
GEODE_EXECUTABLE=/Applications/Geode.app/Contents/MacOS/Geode \
node scripts/verify-core-plugins.mjs

GEODE_REPO=/path/to/geode \
PLUGIN_ARTIFACTS=/path/to/release-assets \
GEODE_EXECUTABLE=/Applications/Geode.app/Contents/MacOS/Geode \
node scripts/verify-community-plugins.mjs
```

`GEODE_REPO` supplies the specs, `test-vault` and `node_modules`, and is not
modified. The community artifact root must also contain `terminal/`, `calendar/`,
`obsidian-minimal-settings/` and `kanban-bases-view/`. No plugin binaries are
committed to this repository.

## Artifact SHA-256

| Plugin | File | SHA-256 |
| --- | --- | --- |
| Threads 0.62.1 | manifest.json | `e804feade10d81e2fb64eadc737d820018345dfc405eb8a0074a8e0457254ea0` |
| Threads 0.62.1 | main.js | `05e26d0843125f05974687f79eab75200713faa2c04f990d567bea4242c1f48e` |
| Threads 0.62.1 | styles.css | `853ac08cd381176e88e456298940820e01cf237a86e8d797f0fbde515ad973c6` |
| Design 0.5.0 | manifest.json | `4c3def757459cc9aa1e2a8fe76b5b4b876cc98db7b6848e8aed8cf263567bb6f` |
| Design 0.5.0 | main.js | `f173f899fd91f15d577725f4b019ca85393e2c4c7991f377c7dddda0682328d8` |
| Orchestrator 0.2.0 | manifest.json | `4e74591b933f8a8727cfb8cb50b85d884506172cd5da28e7eac6b59b6e97f8fd` |
| Orchestrator 0.2.0 | main.js | `e7a99e1068392460c20274bb18d9eea141fd9368601e2d06ec0fd65243ed3719` |
| Orchestrator 0.2.0 | styles.css | `42e4fbd2fbd3b9ce0a1b5614564cb2784b6e77bca7fd72348438f117ee793ac8` |
| Terminal 3.28.0 | manifest.json | `01aae391be0037b4b978967b6ccdccc11de59628771c3b594878bf7480415a4c` |
| Terminal 3.28.0 | main.js | `60a01a191fd9eafb7af775a7e8c4cc63c54d882344876707ba59d9b5b6dceae1` |
| Terminal 3.28.0 | styles.css | `39ab74656d85ed316e92d94b891eb9800a6244bb2a4375916065e51703f572bb` |
| Kanban Bases View 0.10.6 | manifest.json | `fe6222590b00dd6da8ebc6338111147c004bcf865757b5084bda6d2396ed3e19` |
| Kanban Bases View 0.10.6 | main.js | `154cec90036c1f582c7b1ad270c5ee56466909259dd31bb9e60b91f139c597e3` |
| Kanban Bases View 0.10.6 | styles.css | `fe444af65f188f5b8bbf6739364154be498a62fb393e394f0cb3eb23debe2299` |
| Minimal Settings 9.0.0 | manifest.json | `2038f9c1f5ca026ebc1f3e156bad97c671d2c401a20718384508ef72071e8c5f` |
| Minimal Settings 9.0.0 | main.js | `f754e0ce6523e433bff8e7995a848f7d7fac205399f9ab3b1258430261fd90c4` |
| Minimal Settings 9.0.0 | styles.css | `50084760da927a5bf5ac1b9d3b960dc52e1d0a3bf690e54df8f4d76f8212628c` |
| Calendar 1.5.10 | manifest.json | `f3e9581338648512baa12d5b458490f7fd367918f7bdb6bd86171ce57be7d08b` |
| Calendar 1.5.10 | main.js | `7fb339e9cf9fdbe5a801fa2b8ab85b366b5b3777fbd193cbc8728bc27711d125` |
