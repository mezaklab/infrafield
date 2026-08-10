import { Location } from '../types';

export interface LocationTreeItem {
  location: Location;
  depth: number;
  label: string;
  fullPath: string;
}

/**
 * Returns the structured full path of a Location, e.g. "Matriz » TI » Suporte".
 */
export function getLocationFullName(loc: Location, allLocations?: Location[]): string {
  if (!loc) return '';

  if (loc.parent?.name) {
    return `${loc.parent.name} » ${loc.name}`;
  }

  const parentId = loc.parentId || loc.parent_id;
  if (parentId && allLocations && allLocations.length > 0) {
    const parentLoc = allLocations.find((l) => l.id === parentId);
    if (parentLoc && parentLoc.id !== loc.id) {
      return `${getLocationFullName(parentLoc, allLocations)} » ${loc.name}`;
    }
  }

  return loc.name;
}

/**
 * Builds an ordered tree of locations with depth-first hierarchy so every Parent is followed by its children.
 */
export function buildLocationTree(allLocations: Location[]): LocationTreeItem[] {
  if (!allLocations || allLocations.length === 0) return [];

  const childrenMap = new Map<string | null, Location[]>();
  allLocations.forEach((loc) => {
    const parentId = loc.parentId || loc.parent_id || null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(loc);
  });

  // Sort children by name alphabetically within each group
  childrenMap.forEach((list) => {
    list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  const result: LocationTreeItem[] = [];

  function traverse(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) || [];
    children.forEach((child) => {
      const indent = depth > 0 ? `${'  '.repeat(depth - 1)}» ` : '';
      const fullPath = getLocationFullName(child, allLocations);
      result.push({
        location: child,
        depth,
        label: `${indent}${child.name}`,
        fullPath,
      });
      traverse(child.id, depth + 1);
    });
  }

  traverse(null, 0);

  // Fallback for orphan locations
  const processedIds = new Set(result.map((item) => item.location.id));
  allLocations.forEach((loc) => {
    if (!processedIds.has(loc.id)) {
      const fullPath = getLocationFullName(loc, allLocations);
      result.push({
        location: loc,
        depth: 0,
        label: loc.name,
        fullPath,
      });
    }
  });

  return result;
}

/**
 * Filters location tree preserving parent-child hierarchy and sorting.
 */
export function filterAndSortLocationTree(allLocations: Location[], searchQuery: string): LocationTreeItem[] {
  const tree = buildLocationTree(allLocations);
  if (!searchQuery || !searchQuery.trim()) {
    return tree;
  }

  const query = searchQuery.trim().toLowerCase();
  const matchingIds = new Set<string>();

  allLocations.forEach((loc) => {
    const fullPath = getLocationFullName(loc, allLocations).toLowerCase();
    const nameMatch = loc.name.toLowerCase().includes(query);
    const bldMatch = (loc.building || '').toLowerCase().includes(query);
    const roomMatch = (loc.room || '').toLowerCase().includes(query);
    const pathMatch = fullPath.includes(query);

    if (nameMatch || bldMatch || roomMatch || pathMatch) {
      matchingIds.add(loc.id);
      // Include all parent ancestors so child remains nested under parent
      let parentId = loc.parentId || loc.parent_id;
      while (parentId) {
        matchingIds.add(parentId);
        const parentLoc = allLocations.find((l) => l.id === parentId);
        parentId = parentLoc ? (parentLoc.parentId || parentLoc.parent_id) : undefined;
      }
    }
  });

  return tree.filter((item) => matchingIds.has(item.location.id));
}
