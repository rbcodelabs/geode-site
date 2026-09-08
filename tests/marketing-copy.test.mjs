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
    readProjectFile('src/content/changelog/0.13.0.md'),
  ]);

  assert.match(hero, /const VERSION = '0\.13\.0';/);
  assert.match(currentRelease, /^version: "0\.13\.0"$/m);
  assert.match(currentRelease, /^tag: "v0\.13\.0"$/m);
});

test('Markdown comments guide identifies the released macOS version', async () => {
  const guide = await readProjectFile('src/content/docs/core-app/markdown-comments.md');

  assert.match(guide, /Available in Geode v0\.13\.0 and later for macOS/);
  assert.doesNotMatch(guide, /Upcoming feature/i);
});

test('generated changelog entries end with exactly one newline', async () => {
  const changelogDirectory = new URL('../src/content/changelog/', import.meta.url);
  const filenames = (await readdir(changelogDirectory)).filter((filename) => filename.endsWith('.md'));
  const entries = await Promise.all(
    filenames.map((filename) => readFile(new URL(filename, changelogDirectory), 'utf8')),
  );

  assert.equal(entries.length, 95);
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

test('community themes guide documents the current Geode workflow and limits', async () => {
  const guide = await readProjectFile('src/content/docs/guides/community-themes.md');

  assert.match(guide, /Settings.*Community plugins & themes.*Install from GitHub.*Add…/s);
  assert.match(guide, /`owner\/repo`/);
  assert.match(guide, /\bAuto-detect\b/);
  assert.match(guide, /\bTheme\b/);
  assert.match(guide, /\bCheck\b/);
  assert.match(guide, /Enable \/ apply after installing/);
  assert.match(guide, /Settings.*Appearance.*Theme/s);
  assert.match(guide, /multiple community themes installed/i);
  assert.match(guide, /only one.*active/is);
  assert.match(guide, /\bDefault\b/);
  assert.match(guide, /auto-update is off by default/i);
  assert.match(guide, /\bAuto-update\b/);
  assert.match(guide, /\bpin\b/);
  assert.match(guide, /\bUpdate now\b/);
  assert.match(guide, /\bStop updating\b/);
  assert.match(guide, /\bUninstall\b/);
  assert.match(guide, /<vault>\/\.geode\/themes\/<name>\//);
  assert.match(guide, /`theme\.css`/);
  assert.match(guide, /`manifest\.json`/);
  assert.match(guide, /no browsable (?:theme )?(?:catalog|marketplace)/i);
});
