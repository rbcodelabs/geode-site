// Single source of truth for docs category ordering + display labels.
// Shared by DocsLayout, DocsSidebar, and the /docs index page so sidebar
// grouping, prev/next ordering, and the landing page category cards never
// drift out of sync with each other.

export const CATEGORY_ORDER = [
  'overview',
  'core-app',
  'plugins-api',
  'formats-platform',
  'architecture-decisions',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  overview: 'Overview',
  'core-app': 'Core App',
  'plugins-api': 'Plugins & API',
  'formats-platform': 'Formats & Platform',
  'architecture-decisions': 'Architecture Decisions',
};

/** Sorts docs collection entries by category order, then by their `order` frontmatter field. */
export function sortDocs<T extends { data: { category: string; order: number } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.data.category as (typeof CATEGORY_ORDER)[number]) -
      CATEGORY_ORDER.indexOf(b.data.category as (typeof CATEGORY_ORDER)[number]);
    if (catDiff !== 0) return catDiff;
    return a.data.order - b.data.order;
  });
}
