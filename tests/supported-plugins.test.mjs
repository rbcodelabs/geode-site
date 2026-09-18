import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateSupportedPluginsRegistry } from '../src/lib/supportedPlugins.mjs';
import { GET as getSupportedPluginsRegistry } from '../src/pages/supported-plugins/v1.json.ts';

const projectFile = (path) => new URL(`../${path}`, import.meta.url);

const validRegistry = () => ({
  schemaVersion: 1,
  plugins: [
    {
      id: 'example-plugin',
      name: 'Example Plugin',
      description: 'A fixture used to exercise the public registry contract.',
      github: { owner: 'example', repo: 'example-plugin' },
      manifest: { version: '1.2.3', releaseTag: '1.2.3', minAppVersion: '1.0.0' },
      platforms: ['desktop'],
      minimumGeodeVersion: '0.2.19',
      certifiedWithGeodeVersion: '0.2.19',
      artifactHashes: {
        'main.js': 'a'.repeat(64),
        'manifest.json': 'b'.repeat(64),
      },
      evidenceUrl: `https://github.com/example/evidence/blob/${'d'.repeat(40)}/compatibility/example-plugin.md`,
      status: 'active',
    },
  ],
});

test('accepts a complete schema-v1 registry and preserves optional distributable hashes', () => {
  const registry = validRegistry();
  registry.plugins[0].artifactHashes['styles.css'] = 'c'.repeat(64);

  assert.deepEqual(validateSupportedPluginsRegistry(registry), registry);
});

test('rejects missing required entry fields', () => {
  const registry = validRegistry();
  delete registry.plugins[0].manifest.minAppVersion;

  assert.throws(() => validateSupportedPluginsRegistry(registry), /minAppVersion/);
});

test('rejects duplicate plugin IDs', () => {
  const registry = validRegistry();
  registry.plugins.push(structuredClone(registry.plugins[0]));

  assert.throws(() => validateSupportedPluginsRegistry(registry), /duplicate plugin id/i);
});

test('rejects unsupported enums, invalid versions, and malformed artifact hashes', () => {
  const invalidCases = [
    ['platform', (entry) => { entry.platforms = ['web']; }],
    ['status', (entry) => { entry.status = 'experimental'; }],
    ['minimumGeodeVersion', (entry) => { entry.minimumGeodeVersion = 'latest'; }],
    ['main.js', (entry) => { entry.artifactHashes['main.js'] = 'not-a-hash'; }],
  ];

  for (const [expectedMessage, mutate] of invalidCases) {
    const registry = validRegistry();
    mutate(registry.plugins[0]);
    assert.throws(
      () => validateSupportedPluginsRegistry(registry),
      new RegExp(expectedMessage, 'i'),
    );
  }
});

test('matches the app parser for plugin IDs, trimmed strings, and strict semantic versions', () => {
  const valid = validRegistry();
  valid.plugins[0].manifest.version = '1.2.3-alpha.1+build.5';
  valid.plugins[0].manifest.minAppVersion = '0.0.0-beta';
  valid.plugins[0].minimumGeodeVersion = '10.20.30+release.1';
  assert.deepEqual(validateSupportedPluginsRegistry(valid), valid);

  const invalidCases = [
    ['id', (entry) => { entry.id = 'example.plugin'; }],
    ['name', (entry) => { entry.name = ' Example Plugin'; }],
    ['description', (entry) => { entry.description = 'Example plugin '; }],
    ['owner', (entry) => { entry.github.owner = ' example'; }],
    ['repo', (entry) => { entry.github.repo = 'example/plugin'; }],
    ['releaseTag', (entry) => { entry.manifest.releaseTag = ' 1.2.3'; }],
    ['version', (entry) => { entry.manifest.version = '01.2.3'; }],
    ['minAppVersion', (entry) => { entry.manifest.minAppVersion = '1.02.3'; }],
    ['minimumGeodeVersion', (entry) => { entry.minimumGeodeVersion = '1.2.03'; }],
    ['certifiedWithGeodeVersion', (entry) => { entry.certifiedWithGeodeVersion = '1.2.3-alpha..1'; }],
  ];

  for (const [expectedMessage, mutate] of invalidCases) {
    const registry = validRegistry();
    mutate(registry.plugins[0]);
    assert.throws(
      () => validateSupportedPluginsRegistry(registry),
      new RegExp(expectedMessage, 'i'),
      `expected invalid ${expectedMessage} example to fail`,
    );
  }
});

test('rejects leading zeros only in all-numeric prerelease identifiers', () => {
  const invalid = validRegistry();
  invalid.plugins[0].manifest.version = '1.0.0-01';
  assert.throws(() => validateSupportedPluginsRegistry(invalid), /version.*semantic version/i);

  const valid = validRegistry();
  valid.plugins[0].manifest.version = '1.0.0-01a';
  assert.deepEqual(validateSupportedPluginsRegistry(valid), valid);
});

test('requires evidence to be an immutable full-commit GitHub blob URL', () => {
  const invalidUrls = [
    `http://github.com/example/evidence/blob/${'d'.repeat(40)}/evidence.md`,
    'https://github.com/example/evidence/blob/abc123/evidence.md',
    `https://github.com/example/evidence/tree/${'d'.repeat(40)}/evidence.md`,
    `https://raw.githubusercontent.com/example/evidence/${'d'.repeat(40)}/evidence.md`,
    `https://gitlab.com/example/evidence/blob/${'d'.repeat(40)}/evidence.md`,
    `https://github.com/example/evidence/blob/${'d'.repeat(40)}/evidence.md?plain=1`,
  ];

  for (const evidenceUrl of invalidUrls) {
    const registry = validRegistry();
    registry.plugins[0].evidenceUrl = evidenceUrl;
    assert.throws(
      () => validateSupportedPluginsRegistry(registry),
      /evidenceUrl.*GitHub.*full commit/i,
      `expected ${evidenceUrl} to fail`,
    );
  }
});

test('rejects unknown fields at every object boundary', () => {
  const invalidCases = [
    (registry) => { registry.updatedAt = '2026-09-09'; },
    (registry) => { registry.plugins[0].homepage = 'https://example.com'; },
    (registry) => { registry.plugins[0].github.url = 'https://github.com/example/example-plugin'; },
    (registry) => { registry.plugins[0].manifest.betaVersions = {}; },
    (registry) => { registry.plugins[0].artifactHashes['README.md'] = 'd'.repeat(64); },
  ];

  for (const mutate of invalidCases) {
    const registry = validRegistry();
    mutate(registry);
    assert.throws(() => validateSupportedPluginsRegistry(registry), /unexpected field/i);
  }
});

test('publishes one canonical schema-v1 registry source', async () => {
  const registryUrl = projectFile('src/data/supported-plugins.v1.json');

  assert.equal(existsSync(registryUrl), true, 'the canonical supported-plugin registry must exist');

  const registry = JSON.parse(await readFile(registryUrl, 'utf8'));
  assert.equal(registry.schemaVersion, 1);
  assert.deepEqual(registry.plugins.map(({ id }) => id), [
    'calendar',
    'obsidian-minimal-settings',
    'terminal',
    'kanban-bases-view',
  ]);
});

test('the plugins page renders the canonical registry with an exact-version support claim', async () => {
  const pageUrl = projectFile('src/pages/plugins/index.astro');

  assert.equal(existsSync(pageUrl), true, 'the human-readable /plugins/ page must exist');

  const page = await readFile(pageUrl, 'utf8');
  assert.match(page, /supportedPluginsRegistry/);
  assert.match(page, /exact release/i);
  assert.match(page, /newer releases are not covered/i);
  assert.match(page, /plugins\.map/);
  assert.match(page, /plugin\.minimumGeodeVersion/);
  assert.match(page, /plugin\.certifiedWithGeodeVersion/);
});

test('the JSON endpoint serializes the same validated registry used by the page', async () => {
  const endpointUrl = projectFile('src/pages/supported-plugins/v1.json.ts');

  assert.equal(existsSync(endpointUrl), true, 'the /supported-plugins/v1.json endpoint must exist');

  const endpoint = await readFile(endpointUrl, 'utf8');
  assert.match(endpoint, /supportedPluginsRegistry/);
  assert.match(endpoint, /JSON\.stringify\(supportedPluginsRegistry/);
  assert.match(endpoint, /application\/json/);

  const canonical = JSON.parse(await readFile(projectFile('src/data/supported-plugins.v1.json'), 'utf8'));
  const response = getSupportedPluginsRegistry();
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await response.json(), canonical);
});

test('global download navigation points to the homepage install section', async () => {
  const nav = await readFile(projectFile('src/components/Nav.astro'), 'utf8');

  assert.match(nav, /href="\/#install"[^>]*>Download for macOS/);
  assert.doesNotMatch(nav, /href="#install"[^>]*>Download for macOS/);
});

test('mobile visitors can discover the plugin catalog from the footer', async () => {
  const footer = await readFile(projectFile('src/components/Footer.astro'), 'utf8');

  assert.match(footer, /href="\/plugins\/"[^>]*>[\s\n]*Plugins/);
});

test('the human catalog describes the manifest field without implying an API floor', async () => {
  const page = await readFile(projectFile('src/pages/plugins/index.astro'), 'utf8');

  assert.match(page, /Declared minimum Obsidian version/);
  assert.doesNotMatch(page, /Obsidian API floor/);
});
