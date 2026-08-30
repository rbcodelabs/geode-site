import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('landing page distinguishes the validated iOS MVP from public availability', async () => {
  const [hero, install] = await Promise.all([
    readProjectFile('src/components/Hero.astro'),
    readProjectFile('src/components/InstallSteps.astro'),
  ]);

  assert.match(hero, /iOS managed-vault MVP/i);
  assert.match(install, /physical-device validation/i);
  assert.match(install, /not yet (?:a )?public iOS (?:release|download)/i);
});

test('landing page and changelog publish the current Geode release', async () => {
  const [hero, currentRelease] = await Promise.all([
    readProjectFile('src/components/Hero.astro'),
    readProjectFile('src/content/changelog/0.9.2.md'),
  ]);

  assert.match(hero, /const VERSION = '0\.9\.2';/);
  assert.match(currentRelease, /^version: "0\.9\.2"$/m);
  assert.match(currentRelease, /^tag: "v0\.9\.2"$/m);
});

test('generated changelog entries end with exactly one newline', async () => {
  const changelogDirectory = new URL('../src/content/changelog/', import.meta.url);
  const filenames = (await readdir(changelogDirectory)).filter((filename) => filename.endsWith('.md'));
  const entries = await Promise.all(
    filenames.map((filename) => readFile(new URL(filename, changelogDirectory), 'utf8')),
  );

  assert.equal(entries.length, 80);
  for (const entry of entries) {
    assert.match(entry, /[^\n]\n$/);
  }
});

test('roadmap documents the validated iOS scope and its remaining gates', async () => {
  const overview = await readProjectFile('src/content/docs/overview/scope-and-roadmap.md');

  assert.match(overview, /managed-vault iOS MVP/i);
  assert.match(overview, /File Provider/i);
  assert.match(overview, /community plugin/i);
  assert.match(overview, /public release/i);
  assert.doesNotMatch(overview, /\*\*Mobile\*\* \(Capacitor\).*priority/i);
});

test('platform documentation no longer describes Geode as macOS-only', async () => {
  const platforms = await readProjectFile('src/content/docs/formats-platform/formats-and-platform.md');

  assert.doesNotMatch(platforms, /Geode currently targets desktop \(macOS\) only/i);
  assert.match(platforms, /managed-vault iOS MVP/i);
});
