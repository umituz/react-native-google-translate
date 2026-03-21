/**
 * Key Detector
 * Detects new, missing, and removed keys between source and target objects
 */

export interface NewKey {
  path: string;
  value: unknown;
}

export function detectNewKeys(
  sourceObj: Record<string, unknown>,
  targetObj: Record<string, unknown>,
  path = '',
  newKeys: NewKey[] = []
): NewKey[] {
  for (const key in sourceObj) {
    const currentPath = path ? `${path}.${key}` : key;
    const sourceValue = sourceObj[key];
    const targetValue = targetObj[key];

    if (!Object.prototype.hasOwnProperty.call(targetObj, key)) {
      newKeys.push({ path: currentPath, value: sourceValue });
    } else if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue)
    ) {
      if (typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
        detectNewKeys(
          sourceValue as Record<string, unknown>,
          targetValue as Record<string, unknown>,
          currentPath,
          newKeys
        );
      }
    }
  }
  return newKeys;
}

export function detectMissingKeys(
  sourceObj: Record<string, unknown>,
  targetObj: Record<string, unknown>,
  path = '',
  missingKeys: string[] = []
): string[] {
  for (const key in targetObj) {
    const currentPath = path ? `${path}.${key}` : key;

    if (!Object.prototype.hasOwnProperty.call(sourceObj, key)) {
      missingKeys.push(currentPath);
    } else if (
      typeof sourceObj[key] === 'object' &&
      sourceObj[key] !== null &&
      !Array.isArray(sourceObj[key]) &&
      typeof targetObj[key] === 'object' &&
      targetObj[key] !== null &&
      !Array.isArray(targetObj[key])
    ) {
      detectMissingKeys(
        sourceObj[key] as Record<string, unknown>,
        targetObj[key] as Record<string, unknown>,
        currentPath,
        missingKeys
      );
    }
  }
  return missingKeys;
}
