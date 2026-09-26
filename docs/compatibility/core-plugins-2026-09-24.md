# Core plugin compatibility — Geode 0.23.0

Verified September 24, 2026 on macOS desktop with the installed Geode 0.23.0
application and unmodified GitHub release assets. The certification applies
to the following exact releases, on desktop only:

| Plugin ID | Repository | Release | Manifest minimum |
| --- | --- | --- | --- |
| `claude-threads` | `rbcodelabs/agent-threads` | `v0.44.0` | `1.0.0` |
| `threads-design` | `rbcodelabs/threads-design` | `v0.2.0` | `1.7.2` |
| `threads-orchestrator` | `rbcodelabs/threads-orchestrator` | `v0.2.0` | `1.10.2` |

The conservative minimum Geode version is 0.23.0, the version tested here.
Earlier versions have not been certified by this run. Install and enable
Agent Threads first, then Design and/or Orchestrator. This catalog does not
automatically install peer dependencies. Both peers were tested with Threads
0.44.0; no claim is made about older Threads releases.

## Verification

`scripts/verify-core-plugins.mjs` copies the release files into a fresh synthetic
vault, launches the real installed application with a separate profile, and
asserts the following:

- All three plugins enable successfully, with the exact versions above.
- Threads creates and opens a thread through public API v1 without starting a
  paid agent session.
- Design registers its contributions, creates and attaches a static artifact,
  opens Geode's secure preview, and captures a screenshot after its document
  finishes loading. A missing artifact produces a structured error.
- Orchestrator opens its voice panel and discovers the newly created thread
  through its real peer API client.
- Reloading Threads reconnects Design and retains the artifact.
- After a full application restart, all three plugins load and the artifact
  remains attached.
- All three plugins disable cleanly. No uncaught renderer errors are observed.

All assertions passed. The initial test attempted capture before the preview
finished loading and received `UnknownVizError`; the reproducible check now
waits for the guest document's ready state before capturing.

All three repositories and the exact release manifests were also verified as
publicly accessible without GitHub authentication. The SHA-256 values below
were calculated from the downloaded files and matched GitHub's asset digests.

## Scope and limitations

This is desktop host integration coverage, not certification of every plugin
feature. Live Claude/Codex turns, paid OpenAI Realtime sessions, real microphone
input, wake-word recognition/calibration, and mobile execution were not tested.
Orchestrator wake-word listening stayed disabled. Its optional model downloads
are outside the catalog's manifest/main.js/styles.css hash contract. Provider
accounts and their usual setup are still required to use live agents or voice.

The test uses only synthetic notes, threads, artifacts, and an isolated app
profile. It does not modify the user's vault, install plugins into that vault,
or submit prompts to an AI provider.

## Reproduce

Download `main.js`, `manifest.json`, and `styles.css` when present from each
release into a directory named for its plugin ID beneath one artifact root.
Design 0.2.0 has no `styles.css`. Check their hashes against this report, then:

```sh
PLAYWRIGHT_PACKAGE=/path/to/geode/package.json \
PLUGIN_ARTIFACTS=/path/to/release-assets \
GEODE_EXECUTABLE=/path/to/Geode.app/Contents/MacOS/Geode \
node scripts/verify-core-plugins.mjs
```

`PLAYWRIGHT_PACKAGE` must resolve an installed `@playwright/test` dependency.
The script removes only its own disposable fixture directory after the app
closes. No plugin binaries are committed to this site repository.

## Artifact SHA-256

| Plugin | File | SHA-256 |
| --- | --- | --- |
| Threads | manifest.json | `bb3b53b174b0033fd640a098939e804d1f3425bb1ec9f2cdd761eca16d0a10ae` |
| Threads | main.js | `183227d0ffad0539bf1008684d28250d01d47f0c8ff87cdf4040ab830f14c8ff` |
| Threads | styles.css | `3c657949adf95a1bb73bc93e067129b0ebf974c7fd70912598b877e3b33f50ca` |
| Design | manifest.json | `5ba4c0cefd13b09d95ea29ff705523cc23aaaddfd9fa49099e6206d1917bcd12` |
| Design | main.js | `4318cd10a16c7207986eb08c6292b9a62c38319dcbeb718750d275de03e025a7` |
| Orchestrator | manifest.json | `4e74591b933f8a8727cfb8cb50b85d884506172cd5da28e7eac6b59b6e97f8fd` |
| Orchestrator | main.js | `e7a99e1068392460c20274bb18d9eea141fd9368601e2d06ec0fd65243ed3719` |
| Orchestrator | styles.css | `42e4fbd2fbd3b9ce0a1b5614564cb2784b6e77bca7fd72348438f117ee793ac8` |
