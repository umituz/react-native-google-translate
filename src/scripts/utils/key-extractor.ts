import fs from 'fs';
import path from 'path';

/**
 * Generic Key Extractor
 * Scans source code for i18n translation keys
 */

const IGNORED_DOMAINS = ['.com', '.org', '.net', '.io', '.co', '.app', '.ai', '.gov', '.edu'];
const IGNORED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf',
  '.mp4', '.mov', '.avi', '.mp3', '.wav', '.css', '.scss', '.md'
];
const IGNORED_LAYOUT_VALS = new Set([
  'center', 'row', 'column', 'flex', 'absolute', 'relative', 'hidden', 'visible',
  'transparent', 'bold', 'normal', 'italic', 'contain', 'cover', 'stretch',
  'top', 'bottom', 'left', 'right', 'middle', 'auto', 'none', 'underline',
  'capitalize', 'uppercase', 'lowercase', 'solid', 'dotted', 'dashed', 'wrap',
  'nowrap', 'space-between', 'space-around', 'flex-start', 'flex-end', 'baseline',
  'react', 'index', 'default', 'string', 'number', 'boolean', 'key', 'id'
]);

function extractFromFile(content: string, keyMap: Map<string, string>): void {
  // Pattern 1: t('key') or t("key")
  const tRegex = /(?:^|\W)t\(['"`]([^'"`]+)['"`]\)/g;
  let match: RegExpExecArray | null;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    if (!key.includes('${') && !keyMap.has(key)) {
      keyMap.set(key, key);
    }
  }

  // Pattern 2: Dot-notation strings (potential i18n keys)
  const dotRegex = /['"`]([a-z][a-z0-9_]*\.(?:[a-z0-9_]+\.)+[a-z0-9_]+)['"`]/gi;
  while ((match = dotRegex.exec(content)) !== null) {
    const key = match[1];
    const isIgnoredDomain = IGNORED_DOMAINS.some(ext => key.toLowerCase().endsWith(ext));
    const isIgnoredExt = IGNORED_EXTENSIONS.some(ext => key.toLowerCase().endsWith(ext));
    if (!isIgnoredDomain && !isIgnoredExt && !key.includes(' ') && !keyMap.has(key)) {
      keyMap.set(key, key);
    }
  }

  // Pattern 3: Template literals t(`prefix.${var}`)
  const templateRegex = /t\(\`([a-z0-9_.]+)\.\$\{/g;
  while ((match = templateRegex.exec(content)) !== null) {
    const prefix = match[1];
    const arrayMatches = content.matchAll(/\[([\s\S]*?)\]/g);
    for (const arrayMatch of arrayMatches) {
      const inner = arrayMatch[1];
      const idMatches = inner.matchAll(/['"`]([a-z0-9_]{2,40})['"`]/g);
      for (const idMatch of idMatches) {
        const id = idMatch[1];
        if (IGNORED_LAYOUT_VALS.has(id.toLowerCase())) continue;
        if (/^[0-9]+$/.test(id)) continue;

        const dynamicKey = `${prefix}.${id}`;
        if (!keyMap.has(dynamicKey)) {
          keyMap.set(dynamicKey, dynamicKey);
        }
      }
    }
  }
}

function walkDirectory(
  dir: string,
  keyMap: Map<string, string>,
  skipDirs: string[] = ['node_modules', '.expo', '.git', 'build', 'ios', 'android', 'assets', 'locales', '__tests__']
): void {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!skipDirs.includes(file)) {
        walkDirectory(fullPath, keyMap, skipDirs);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      extractFromFile(content, keyMap);
    }
  }
}

export function extractUsedKeys(srcDir: string): Map<string, string> {
  const keyMap = new Map<string, string>();
  if (!srcDir) return keyMap;

  const projectRoot = process.cwd();
  const absoluteSrcDir = path.resolve(projectRoot, srcDir);

  // Scan project source
  walkDirectory(absoluteSrcDir, keyMap);

  // Scan @umituz packages for shared keys
  const packagesDir = path.resolve(projectRoot, 'node_modules/@umituz');
  if (fs.existsSync(packagesDir)) {
    walkDirectory(packagesDir, keyMap);
  }

  return keyMap;
}
