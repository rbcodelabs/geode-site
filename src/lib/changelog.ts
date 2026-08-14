// Single source of truth for grouping changelog entries by minor version.
// Shared by the /changelog page (and any future changelog view) so the
// jump-to-version list, group headings, and version ordering never drift
// out of sync with each other.

import type { CollectionEntry } from 'astro:content';

export interface ChangelogGroup {
  /** e.g. "0.25" */
  key: string;
  /** e.g. "0.25.x" */
  label: string;
  /** URL-safe anchor id, e.g. "v0-25" */
  id: string;
  entries: CollectionEntry<'changelog'>[];
}

/** Extracts the minor-version group key (e.g. "0.25") from a release tag like "v0.25.3". */
function minorVersionKey(tag: string): string {
  const match = tag.match(/^v?(\d+\.\d+)/);
  return match ? match[1] : tag;
}

/** Builds the anchor id for a minor-version group, e.g. "0.25" -> "v0-25". */
export function groupAnchorId(key: string): string {
  return `v${key.replace(/\./g, '-')}`;
}

/** Builds the anchor id for a single version entry, e.g. "0.25.3" -> "v0-25-3". */
export function versionAnchorId(version: string): string {
  return `v${version.replace(/\./g, '-')}`;
}

/**
 * Groups changelog entries by minor version (e.g. "0.25"), preserving the
 * descending order of the input within and across groups. Callers should
 * pass entries already sorted by publish date descending.
 */
export function groupByMinor(entries: CollectionEntry<'changelog'>[]): ChangelogGroup[] {
  const groups: ChangelogGroup[] = [];
  const groupsByKey = new Map<string, ChangelogGroup>();

  for (const entry of entries) {
    const key = minorVersionKey(entry.data.tag);
    let group = groupsByKey.get(key);
    if (!group) {
      group = { key, label: `${key}.x`, id: groupAnchorId(key), entries: [] };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return groups;
}
