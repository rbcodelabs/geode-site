// Re-run Geode's own community-plugin E2E specs against an INSTALLED Geode build
// and the unmodified upstream release assets (instead of the vendored fixtures
// and the dev-built app those specs normally use).
//
//   GEODE_REPO         checkout of rbcodelabs/geode (source of the specs, test-vault, node_modules)
//   PLUGIN_ARTIFACTS   dir holding one sub-directory per plugin ID with manifest.json/main.js/styles.css:
//                      terminal/, calendar/, obsidian-minimal-settings/, kanban-bases-view/
//   GEODE_EXECUTABLE   e.g. /Applications/Geode.app/Contents/MacOS/Geode
//
// The specs are copied to a scratch directory and rewritten there; nothing in
// GEODE_REPO is modified. Rewrites: fixture dirs -> PLUGIN_ARTIFACTS, launch via
// the installed executable (headless), screenshots -> scratch dir, and for the
// Terminal spec (a) the benign-error filter matches the plugin's minified
// `<name>.value is not a function` emitter noise whatever the bundler names the
// variable, and (b) the typed command writes a marker file so the real shell
// round trip is asserted, not just inferred.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

for (const key of ['GEODE_REPO', 'PLUGIN_ARTIFACTS', 'GEODE_EXECUTABLE']) assert.ok(process.env[key], `Set ${key}`);
const repo = path.resolve(process.env.GEODE_REPO);
const artifacts = path.resolve(process.env.PLUGIN_ARTIFACTS);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'geode-community-cert-'));
const out = path.join(scratch, 'out');
const vault = path.join(scratch, 'test-vault');
fs.mkdirSync(out);
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(scratch, 'node_modules'));

// The Bases specs copy test-vault; swap the vendored Kanban plugin for the release under test.
fs.cpSync(path.join(repo, 'test-vault'), vault, { recursive: true });
for (const file of ['manifest.json', 'main.js', 'styles.css']) {
  fs.copyFileSync(path.join(artifacts, 'kanban-bases-view', file), path.join(vault, '.geode/plugins/kanban-bases-view', file));
}

const specs = {
  'terminal-plugin-cert.spec.ts': 'terminal',
  'calendar-plugin.spec.ts': 'calendar',
  'minimal-settings-compat.spec.ts': 'obsidian-minimal-settings',
  'bases-plugin-view.spec.ts': null,
  'bases-kanban-interaction.spec.ts': null,
};
for (const [name, id] of Object.entries(specs)) {
  let s = fs.readFileSync(path.join(repo, 'tests/e2e', name), 'utf8');
  s = s.replace('const repoRoot = path.resolve(__dirname, "..", "..");', `const repoRoot = ${JSON.stringify(repo)};`);
  s = s.replace(/const fixtureDir = path\.join\(repoRoot[^;]*\);/, `const fixtureDir = ${JSON.stringify(path.join(artifacts, id ?? ''))};`);
  s = s.replace(/const testVaultFixturePath = [^;]*;/, `const testVaultFixturePath = ${JSON.stringify(vault)};`);
  s = s.replace(/path\.join\(repoRoot, "docs", "screenshots", /g, `path.join(${JSON.stringify(out)}, `);
  s = s.replace(/args: \[repoRoot, /g, 'executablePath: process.env.GEODE_EXECUTABLE!, env: { ...process.env, GEODE_HEADLESS: "1", ELECTRON_RUN_AS_NODE: undefined } as any, args: [');
  s = s.replace(/,\s*cwd: repoRoot/g, '').replace(/cwd: repoRoot,\s*/g, '');
  if (name === 'terminal-plugin-cert.spec.ts') {
    s = s.replace('const pageErrors: string[] = [];', 'const pageErrors: string[] = []; let benign = 0;');
    s = s.replace('if (text.includes("_.value is not a function")) return;', 'if (/\\b\\w+\\.value is not a function/.test(text)) { benign++; return; }');
    s = s.replace('await window.keyboard.type(`echo ${marker}`);', 'await window.keyboard.type(`echo ${marker} > /tmp/${marker}.txt`);');
    s = s.replace('await window.waitForTimeout(1500); // let the shell round-trip and xterm repaint', `await window.waitForTimeout(1500);
    const markerFile = \`/tmp/\${marker}.txt\`;
    await expect.poll(() => (fs.existsSync(markerFile) ? fs.readFileSync(markerFile, "utf8").trim() : "")).toBe(marker);
    fs.rmSync(markerFile, { force: true });
    console.log("SHELL ROUND TRIP OK (marker file written by the spawned shell); benign emitter errors so far:", benign);`);
  }
  assert.ok(!/repoRoot[,\]]/.test(s.replace(/const repoRoot = .*/, '')), `unrewritten repoRoot launch in ${name}`);
  fs.writeFileSync(path.join(scratch, name), s);
}
fs.writeFileSync(path.join(scratch, 'playwright.config.ts'), `import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: ".", fullyParallel: false, workers: 1, retries: 0, reporter: [["list"]], timeout: 90_000 });
`);
const run = spawnSync(path.join(scratch, 'node_modules/.bin/playwright'), ['test', '-c', 'playwright.config.ts'], {
  cwd: scratch, stdio: 'inherit', env: process.env,
});
fs.rmSync(scratch, { recursive: true, force: true });
process.exit(run.status ?? 1);
