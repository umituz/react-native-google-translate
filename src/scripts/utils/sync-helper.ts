/**
 * Sync Helper
 * Helper functions for synchronizing translation keys
 */

export interface SyncStats {
  added?: number;
  newKeys?: string[];
  removed?: number;
  removedKeys?: string[];
}

export function addMissingKeys(
  sourceObj: Record<string, unknown>,
  targetObj: Record<string, unknown>,
  stats: SyncStats = {}
): SyncStats {
  stats.added = stats.added || 0;
  stats.newKeys = stats.newKeys || [];

  for (const key in sourceObj) {
    const sourceValue = sourceObj[key];
    const isNewKey = !Object.prototype.hasOwnProperty.call(targetObj, key);

    if (isNewKey) {
      targetObj[key] = sourceValue;
      stats.added++;
      stats.newKeys.push(key);
    } else if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue)
    ) {
      if (!targetObj[key] || typeof targetObj[key] !== 'object') {
        targetObj[key] = {};
      }
      addMissingKeys(
        sourceValue as Record<string, unknown>,
        targetObj[key] as Record<string, unknown>,
        stats
      );
    }
  }
  return stats;
}

export function removeExtraKeys(
  sourceObj: Record<string, unknown>,
  targetObj: Record<string, unknown>,
  stats: SyncStats = {}
): SyncStats {
  stats.removed = stats.removed || 0;
  stats.removedKeys = stats.removedKeys || [];

  for (const key in targetObj) {
    const isExtraKey = !Object.prototype.hasOwnProperty.call(sourceObj, key);

    if (isExtraKey) {
      delete targetObj[key];
      stats.removed++;
      stats.removedKeys.push(key);
    } else if (
      typeof sourceObj[key] === 'object' &&
      sourceObj[key] !== null &&
      !Array.isArray(sourceObj[key]) &&
      typeof targetObj[key] === 'object' &&
      targetObj[key] !== null &&
      !Array.isArray(targetObj[key])
    ) {
      removeExtraKeys(
        sourceObj[key] as Record<string, unknown>,
        targetObj[key] as Record<string, unknown>,
        stats
      );
    }
  }
  return stats;
}
