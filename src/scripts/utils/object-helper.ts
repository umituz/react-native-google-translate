/**
 * Object Helper
 * Utilities for deep object manipulation
 */

/**
 * Set a value in a nested object, creating intermediate objects if necessary
 * Returns true if the key was newly added, false if it already existed
 */
export function setDeep(obj: Record<string, unknown>, path: string, value: unknown): boolean {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (current[lastKey] === undefined) {
    current[lastKey] = value;
    return true;
  }

  return false;
}

/**
 * Count all leaf keys in a nested object
 */
export function countKeys(obj: Record<string, unknown>): number {
  let count = 0;

  const walk = (o: Record<string, unknown>): void => {
    for (const k in o) {
      if (typeof o[k] === 'object' && o[k] !== null) {
        walk(o[k] as Record<string, unknown>);
      } else {
        count++;
      }
    }
  };

  walk(obj);
  return count;
}
