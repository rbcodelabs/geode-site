// Exercise official plugin release bytes in a disposable installed-Geode profile.
// PLAYWRIGHT_PACKAGE points to a package.json with @playwright/test installed.
// PLUGIN_ARTIFACTS contains one directory per plugin ID; GEODE_EXECUTABLE is explicit.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

for (const key of ['PLAYWRIGHT_PACKAGE', 'PLUGIN_ARTIFACTS', 'GEODE_EXECUTABLE']) {
  assert.ok(process.env[key], `Set ${key}`);
}
const { _electron: electron } = createRequire(process.env.PLAYWRIGHT_PACKAGE)('@playwright/test');
const ids = ['claude-threads', 'threads-design', 'threads-orchestrator'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'geode-core-cert-'));
const vault = path.join(temp, 'vault');
const profile = path.join(temp, 'profile');
const hashes = {};
for (const id of ids) {
  const source = path.join(process.env.PLUGIN_ARTIFACTS, id);
  const destination = path.join(vault, '.geode/plugins', id);
  fs.mkdirSync(destination, { recursive: true });
  hashes[id] = {};
  for (const file of ['manifest.json', 'main.js', 'styles.css']) {
    const input = path.join(source, file);
    if (file === 'styles.css' && !fs.existsSync(input)) continue;
    const bytes = fs.readFileSync(input);
    hashes[id][file] = createHash('sha256').update(bytes).digest('hex');
    fs.copyFileSync(input, path.join(destination, file));
  }
  assert.equal(JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'))).id, id);
}
const threadsData = {
  hasSeenWelcome: true, threads: [], projects: [], scheduledItems: [], skillSources: [],
  mcpServers: {}, statusLineCommand: '', autoSummarize: false, telemetryEnabled: false,
  wakeLockEnabled: false, remoteAccess: { enabled: false },
};
fs.writeFileSync(path.join(vault, '.geode/plugins/claude-threads/data.json'), JSON.stringify(threadsData));
fs.writeFileSync(path.join(vault, '.geode/plugins/threads-orchestrator/data.json'), JSON.stringify({ wakeWordEnabled: false }));
fs.writeFileSync(path.join(vault, '.geode/plugins.json'), JSON.stringify(ids));
fs.writeFileSync(path.join(vault, 'Demo.md'), '# Compatibility fixture\nSynthetic plugin certification note.\n');
fs.mkdirSync(profile);
fs.writeFileSync(path.join(profile, 'geode.json'), JSON.stringify({ recentVaults: [vault], lastVault: vault }));
const env = { ...process.env, GEODE_HEADLESS: '1' };
delete env.ELECTRON_RUN_AS_NODE;
let app;
const errors = [];
async function launch() {
  app = await electron.launch({ executablePath: process.env.GEODE_EXECUTABLE, args: [`--user-data-dir=${profile}`], env });
  const page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  await page.waitForFunction(ids => ids.every(id => window.app?.pluginManager?.isEnabled(id)), ids, { timeout: 60000 });
  await page.waitForFunction(() => window.app.pluginManager.getPlugin('threads-design')?.service != null, undefined, { timeout: 30000 });
  return page;
}
try {
  let page = await launch();
  const version = await app.evaluate(({ app }) => app.getVersion());
  console.log('Geode version:', version);
  const result = await page.evaluate(async () => {
    const a = window.app;
    const threads = a.pluginManager.getPlugin('claude-threads');
    const design = a.pluginManager.getPlugin('threads-design');
    const orchestrator = a.pluginManager.getPlugin('threads-orchestrator');
    const api = threads.api.v1;
    const { threadId } = await api.threads.create({ title: 'Catalog compatibility fixture' });
    await api.threads.open(threadId);
    const prepared = await design.service.prepare(threadId, 'Synthetic compatibility preview');
    const artifacts = await api.artifacts.list(threadId);
    const missingArtifact = await api.artifacts.invokeAction(threadId, 'missing-artifact', 'preview');
    await orchestrator.activateView();
    const peerThreads = await orchestrator.threadsApi.requireApi().threads.list();
    return {
      threadId, artifactId: artifacts[0]?.id, created: prepared.created,
      missingArtifact, peerFindsThread: peerThreads.some(thread => thread.id === threadId),
      artifactCount: artifacts.length,
      previewCount: a.workspace.getLeavesOfType('geode-artifact').length,
      voiceCount: a.workspace.getLeavesOfType('threads-orchestrator:voice-panel').length,
      versions: ['claude-threads', 'threads-design', 'threads-orchestrator'].map(id => a.pluginManager.getPlugin(id).manifest.version),
    };
  });
  assert.equal(result.created, true);
  assert.equal(result.artifactCount, 1);
  assert.equal(result.previewCount, 1);
  assert.equal(result.voiceCount, 1);
  await page.waitForFunction(async () => {
    const frame = document.querySelector('.artifact-view-frame');
    try { return await frame?.executeJavaScript('document.readyState === "complete"'); }
    catch { return false; }
  });
  const capture = await page.evaluate(async ({ threadId, artifactId }) => {
    return window.app.pluginManager.getPlugin('claude-threads').api.v1.artifacts.invokeAction(threadId, artifactId, 'capture');
  }, result);
  assert.equal(capture.status, 'ok', JSON.stringify(capture));
  assert.notEqual(result.missingArtifact.status, 'ok');
  assert.equal(result.peerFindsThread, true);
  assert.deepEqual(result.versions, ['0.44.0', '0.2.0', '0.2.0']);
  console.log('PASS: Threads creation/open, Design artifact creation/preview, Orchestrator panel', result);
  await page.evaluate(async () => {
    await window.app.pluginManager.reload('claude-threads');
  });
  await page.waitForFunction(() => window.app.pluginManager.getPlugin('threads-design')?.service != null);
  assert.equal(await page.evaluate(async id => (await window.app.pluginManager.getPlugin('claude-threads').api.v1.artifacts.list(id)).length, result.threadId), 1);
  console.log('PASS: peer reconnection and artifact retention after Threads reload');
  await app.close(); app = undefined;
  page = await launch();
  assert.equal(await page.evaluate(async id => (await window.app.pluginManager.getPlugin('claude-threads').api.v1.artifacts.list(id)).length, result.threadId), 1);
  await page.evaluate(async () => {
    for (const id of ['threads-design', 'threads-orchestrator', 'claude-threads']) await window.app.pluginManager.disable(id);
  });
  assert.equal(await page.evaluate(ids => ids.some(id => window.app.pluginManager.isEnabled(id)), ids), false);
  assert.deepEqual(errors, []);
  console.log('PASS: all three load after restart, artifact persists, plugins unload, no uncaught renderer errors');
  console.log('Artifact SHA-256:', JSON.stringify(hashes, null, 2));
} finally {
  await app?.close();
  fs.rmSync(temp, { recursive: true, force: true });
}
