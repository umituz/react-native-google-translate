#!/usr/bin/env node

/**
 * Sync Translations Script
 * Synchronizes translation keys from en-US.ts to all other language files
 */

import fs from 'fs';
import path from 'path';
import {
  parseTypeScriptFile,
  generateTypeScriptContent,
} from './utils/file-parser';
import {
  addMissingKeys,
  removeExtraKeys,
  type SyncStats,
} from './utils/sync-helper';
import { detectNewKeys } from './utils/key-detector';
import { extractUsedKeys } from './utils/key-extractor';
import { setDeep, countKeys } from './utils/object-helper';

export interface SyncTranslationsOptions {
  targetDir: string;
  srcDir?: string;
}

export interface SyncLanguageFileResult {
  added?: number;
  newKeys?: string[];
  removed?: number;
  removedKeys?: string[];
  changed: boolean;
  detectedNewKeys: unknown[];
}

export function syncLanguageFile(
  enUSPath: string,
  targetPath: string,
  langCode: string
): SyncLanguageFileResult {
  const enUS = parseTypeScriptFile(enUSPath);
  let target: Record<string, unknown>;

  try {
    target = parseTypeScriptFile(targetPath);
  } catch {
    target = {};
  }

  const detectedNewKeys = detectNewKeys(enUS, target);
  const addStats: SyncStats = { added: 0, newKeys: [] };
  const removeStats: SyncStats = { removed: 0, removedKeys: [] };

  addMissingKeys(enUS, target, addStats);
  removeExtraKeys(enUS, target, removeStats);

  const changed = (addStats.added || 0) > 0 || (removeStats.removed || 0) > 0;

  if (changed) {
    const content = generateTypeScriptContent(target, langCode);
    fs.writeFileSync(targetPath, content);
  }

  return {
    added: addStats.added,
    newKeys: addStats.newKeys,
    removed: removeStats.removed,
    removedKeys: removeStats.removedKeys,
    changed,
    detectedNewKeys,
  };
}

function processExtraction(srcDir: string | undefined, enUSPath: string): void {
  if (!srcDir) return;

  console.log(`🔍 Scanning source code and dependencies: ${srcDir}...`);
  const usedKeyMap = extractUsedKeys(srcDir);
  console.log(`   Found ${usedKeyMap.size} unique keys.`);

  const oldEnUS = parseTypeScriptFile(enUSPath);
  const newEnUS: Record<string, unknown> = {};

  let addedCount = 0;
  for (const [key, defaultValue] of usedKeyMap) {
    // Try to keep existing translation if it exists
    const existingValue = key.split('.').reduce((obj: unknown, k: string) => {
      if (obj && typeof obj === 'object' && k in obj) {
        return (obj as Record<string, unknown>)[k];
      }
      return undefined;
    }, oldEnUS);

    // We treat it as "not translated" if the value is exactly the key string
    const isActuallyTranslated = typeof existingValue === 'string' && existingValue !== key;
    const valueToSet = isActuallyTranslated ? existingValue : defaultValue;

    if (setDeep(newEnUS, key, valueToSet)) {
      if (!isActuallyTranslated) addedCount++;
    }
  }

  const oldTotal = countKeys(oldEnUS);
  const newTotal = countKeys(newEnUS);
  const removedCount = Math.max(0, oldTotal - (newTotal - addedCount));

  console.log(`   ✨ Optimized en-US.ts: ${addedCount} keys populated/updated, pruned ${removedCount} unused.`);
  const content = generateTypeScriptContent(newEnUS, 'en-US');
  fs.writeFileSync(enUSPath, content);
}

export function syncTranslations(options: SyncTranslationsOptions): boolean {
  const { targetDir, srcDir } = options;
  const localesDir = path.resolve(process.cwd(), targetDir);
  const enUSPath = path.join(localesDir, 'en-US.ts');

  if (!fs.existsSync(localesDir) || !fs.existsSync(enUSPath)) {
    console.error(`❌ Localization files not found in: ${localesDir}`);
    return false;
  }

  processExtraction(srcDir, enUSPath);

  const files = fs.readdirSync(localesDir)
    .filter(f => f.match(/^[a-z]{2}-[A-Z]{2}\.ts$/) && f !== 'en-US.ts')
    .sort();

  console.log(`📊 Languages to sync: ${files.length}\n`);
  files.forEach(file => {
    const langCode = file.replace('.ts', '');
    const targetPath = path.join(localesDir, file);
    const result = syncLanguageFile(enUSPath, targetPath, langCode);
    if (result.changed) {
      console.log(`   🌍 ${langCode}: ✏️  +${result.added || 0} keys, -${result.removed || 0} keys`);
    }
  });

  console.log(`\n✅ Synchronization completed!`);
  return true;
}

// CLI interface
export function runSyncTranslations(): void {
  const targetDir = process.argv[2] || 'src/infrastructure/locales';
  const srcDir = process.argv[3];
  console.log('🚀 Starting translation synchronization...\n');
  syncTranslations({ targetDir, srcDir });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSyncTranslations();
}
