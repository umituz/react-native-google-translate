import fs from 'fs';
import path from 'path';
import { getLanguageDisplayName } from '../../infrastructure/utils/textValidator.util';

/**
 * File Parser
 * Parse and generate TypeScript translation files
 */

export function parseTypeScriptFile(filePath: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, 'utf8');

  // Match: export default { ... } OR export const NAME = { ... }
  const match = content.match(/export\s+(?:default|const\s+\w+\s*=)\s*(\{[\s\S]*\});?\s*$/);

  if (!match) {
    throw new Error(`Could not parse TypeScript file: ${filePath}`);
  }

  const objectStr = match[1].replace(/;$/, '');

  try {
    // Basic evaluation for simple objects (safe for generated translation files)
    // Only contains string literals, numbers, booleans, and nested objects
    // eslint-disable-next-line no-eval
    return eval(`(${objectStr})`) as Record<string, unknown>;
  } catch (error) {
    // File might be a barrel file with named imports
    const dir = path.dirname(filePath);
    const importMatches = [...content.matchAll(/import\s*\{\s*(\w+)\s*\}\s*from\s*["']\.\/(\w+)["']/g)];

    if (importMatches.length > 0) {
      const result: Record<string, unknown> = {};
      for (const [, varName, moduleName] of importMatches) {
        const subFilePath = path.join(dir, `${moduleName}.ts`);
        if (fs.existsSync(subFilePath)) {
          try {
            result[varName] = parseTypeScriptFile(subFilePath);
          } catch (subError) {
            // Log sub-file parse errors but continue with other files
            console.warn(`Warning: Could not parse sub-file ${subFilePath}: ${subError instanceof Error ? subError.message : 'Unknown error'}`);
          }
        }
      }
      if (Object.keys(result).length > 0) {
        return result;
      }
    }
  }

  return {};
}

export function stringifyValue(value: unknown, indent = 2): string {
  if (typeof value === 'string') {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(v => stringifyValue(v, indent + 2));
    return `[${items.join(', ')}]`;
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return '{}';
    }

    const spaces = ' '.repeat(indent);
    const innerSpaces = ' '.repeat(indent + 2);
    const entriesStr = entries
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
        return `${innerSpaces}${key}: ${stringifyValue(v, indent + 2)}`;
      })
      .join(',\n');
    return `{\n${entriesStr},\n${spaces}}`;
  }

  return String(value);
}

export function generateTypeScriptContent(obj: Record<string, unknown>, langCode: string): string {
  const langName = getLanguageDisplayName(langCode);
  const isBase = langCode === 'en-US';
  const objString = stringifyValue(obj, 0);

  return `/**
 * ${langName} Translations
 * ${isBase ? 'Base translations file' : 'Auto-synced from en-US.ts'}
 */

export default ${objString};
`;
}
