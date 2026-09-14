import registryData from '../data/supported-plugins.v1.json' with { type: 'json' };

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const GITHUB_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const PLUGIN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const EVIDENCE_URL_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/blob\/[a-f0-9]{40}\/[^?#]+$/;
const PLATFORMS = new Set(['desktop', 'mobile']);
const STATUSES = new Set(['active', 'withdrawn']);
const REQUIRED_ARTIFACTS = ['main.js', 'manifest.json'];
const ALLOWED_ARTIFACTS = new Set([...REQUIRED_ARTIFACTS, 'styles.css']);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function requireExactKeys(value, path, allowedKeys) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${path} contains unexpected field ${key}`);
  }
}

function requireRecord(value, path) {
  if (!isRecord(value)) throw new TypeError(`${path} must be an object`);
  return value;
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new TypeError(`${path} must be a non-empty trimmed string`);
  }
  return value;
}

function requireSemver(value, path) {
  const version = requireString(value, path);
  const withoutBuild = version.split('+', 1)[0];
  const prereleaseStart = withoutBuild.indexOf('-');
  const hasLeadingZeroNumericPrerelease = prereleaseStart !== -1
    && withoutBuild
      .slice(prereleaseStart + 1)
      .split('.')
      .some((identifier) => /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0'));
  if (!SEMVER_PATTERN.test(version) || hasLeadingZeroNumericPrerelease) {
    throw new TypeError(`${path} must be a semantic version`);
  }
}

function validateEntry(value, index) {
  const path = `plugins[${index}]`;
  const entry = requireRecord(value, path);
  requireExactKeys(entry, path, [
    'id', 'name', 'description', 'github', 'manifest', 'platforms',
    'minimumGeodeVersion', 'certifiedWithGeodeVersion', 'artifactHashes',
    'evidenceUrl', 'status',
  ]);

  const id = requireString(entry.id, `${path}.id`);
  if (!PLUGIN_ID_PATTERN.test(id)) throw new TypeError(`${path}.id is invalid`);
  requireString(entry.name, `${path}.name`);
  requireString(entry.description, `${path}.description`);

  const github = requireRecord(entry.github, `${path}.github`);
  requireExactKeys(github, `${path}.github`, ['owner', 'repo']);
  for (const field of ['owner', 'repo']) {
    const name = requireString(github[field], `${path}.github.${field}`);
    if (!GITHUB_NAME_PATTERN.test(name)) {
      throw new TypeError(`${path}.github.${field} is not a valid GitHub name`);
    }
  }

  const manifest = requireRecord(entry.manifest, `${path}.manifest`);
  requireExactKeys(manifest, `${path}.manifest`, ['version', 'releaseTag', 'minAppVersion']);
  requireSemver(manifest.version, `${path}.manifest.version`);
  requireString(manifest.releaseTag, `${path}.manifest.releaseTag`);
  requireSemver(manifest.minAppVersion, `${path}.manifest.minAppVersion`);

  if (!Array.isArray(entry.platforms) || entry.platforms.length === 0) {
    throw new TypeError(`${path}.platforms must contain at least one platform`);
  }
  for (const platform of entry.platforms) {
    if (!PLATFORMS.has(platform)) throw new TypeError(`${path}.platforms contains unsupported platform ${platform}`);
  }
  if (new Set(entry.platforms).size !== entry.platforms.length) {
    throw new TypeError(`${path}.platforms must not contain duplicates`);
  }

  requireSemver(entry.minimumGeodeVersion, `${path}.minimumGeodeVersion`);
  requireSemver(entry.certifiedWithGeodeVersion, `${path}.certifiedWithGeodeVersion`);

  const artifactHashes = requireRecord(entry.artifactHashes, `${path}.artifactHashes`);
  requireExactKeys(artifactHashes, `${path}.artifactHashes`, ALLOWED_ARTIFACTS);
  for (const filename of REQUIRED_ARTIFACTS) {
    if (!(filename in artifactHashes)) throw new TypeError(`${path}.artifactHashes.${filename} is required`);
  }
  for (const [filename, hash] of Object.entries(artifactHashes)) {
    if (typeof hash !== 'string' || !SHA256_PATTERN.test(hash)) {
      throw new TypeError(`${path}.artifactHashes.${filename} must be a lowercase SHA-256 hash`);
    }
  }

  const evidenceUrl = requireString(entry.evidenceUrl, `${path}.evidenceUrl`);
  if (!EVIDENCE_URL_PATTERN.test(evidenceUrl)) {
    throw new TypeError(`${path}.evidenceUrl must be a GitHub blob URL pinned to a full commit`);
  }

  if (!STATUSES.has(entry.status)) throw new TypeError(`${path}.status is unsupported`);
}

export function validateSupportedPluginsRegistry(value) {
  const registry = requireRecord(value, 'registry');
  requireExactKeys(registry, 'registry', ['schemaVersion', 'plugins']);
  if (registry.schemaVersion !== 1) throw new TypeError('registry.schemaVersion must be 1');
  if (!Array.isArray(registry.plugins)) throw new TypeError('registry.plugins must be an array');

  const ids = new Set();
  registry.plugins.forEach((entry, index) => {
    validateEntry(entry, index);
    if (ids.has(entry.id)) throw new TypeError(`duplicate plugin id: ${entry.id}`);
    ids.add(entry.id);
  });

  return registry;
}

export const supportedPluginsRegistry = validateSupportedPluginsRegistry(registryData);
