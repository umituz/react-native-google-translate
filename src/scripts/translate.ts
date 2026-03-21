#!/usr/bin/env node

/**
 * Translate Missing Script
 * Automatically translates missing strings using Google Translate
 */

import fs from 'fs';
import path from 'path';
import {
  parseTypeScriptFile,
  generateTypeScriptContent,
} from './utils/file-parser';
import { googleTranslateService, getTargetLanguage, getLanguageDisplayName } from '../infrastructure/services';
import type { TranslationStats } from '../domain';

// Width of terminal line to clear for progress updates
const PROGRESS_LINE_WIDTH = 80;

export interface TranslateMissingOptions {
  targetDir: string;
  srcDir?: string;
  skipSync?: boolean;
}

export async function translateMissing(options: TranslateMissingOptions): Promise<void> {
  const { targetDir, srcDir, skipSync = false } = options;

  // Initialize the translation service
  googleTranslateService.initialize({
    minDelay: 100,
    maxRetries: 3,
    timeout: 10000,
  });

  const localesDir = path.resolve(process.cwd(), targetDir);
  const enUSPath = path.join(localesDir, 'en-US.ts');

  if (!fs.existsSync(localesDir) || !fs.existsSync(enUSPath)) {
    console.error(`❌ Localization files not found in: ${localesDir}`);
    return;
  }

  const files = fs.readdirSync(localesDir)
    .filter(f => f.match(/^[a-z]{2}-[A-Z]{2}\.ts$/) && f !== 'en-US.ts')
    .sort();

  console.log(`\n📊 Languages to translate: ${files.length}\n`);

  const enUS = parseTypeScriptFile(enUSPath);

  for (const file of files) {
    const langCode = file.replace('.ts', '');

    // Skip English variants
    const targetLang = getTargetLanguage(langCode);
    if (!targetLang || targetLang === 'en') {
      console.log(`⏭️  Skipping ${langCode} (English variant)`);
      continue;
    }

    const langName = getLanguageDisplayName(langCode);
    console.log(`🌍 Translating ${langCode} (${langName})...`);

    const targetPath = path.join(localesDir, file);
    const target = parseTypeScriptFile(targetPath);

    const stats: TranslationStats = {
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      translatedKeys: [],
    };

    await googleTranslateService.translateObject(
      enUS,
      target,
      targetLang,
      '',
      stats
    );

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(PROGRESS_LINE_WIDTH) + '\r');

    if (stats.successCount > 0) {
      const content = generateTypeScriptContent(target, langCode);
      fs.writeFileSync(targetPath, content);

      console.log(`      ✅ Successfully translated ${stats.successCount} keys:`);

      // Detailed logging of translated keys
      const displayCount = Math.min(stats.translatedKeys.length, 15);
      stats.translatedKeys.slice(0, displayCount).forEach(item => {
        console.log(`         • ${item.key}: "${item.from}" → "${item.to}"`);
      });

      if (stats.translatedKeys.length > displayCount) {
        console.log(`         ... and ${stats.translatedKeys.length - displayCount} more.`);
      }
    } else {
      console.log(`      ✨ Already up to date.`);
    }
  }

  console.log('\n✅ All translations completed!');
}

// CLI interface
export function runTranslateMissing(): void {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const targetDir = args[0] || 'src/infrastructure/locales';
  const srcDir = args[1];
  const skipSync = process.argv.includes('--no-sync');

  console.log('🚀 Starting integrated translation workflow...');
  translateMissing({ targetDir, srcDir, skipSync }).catch(err => {
    console.error('\n❌ Translation workflow failed:', err.message);
    process.exit(1);
  });
}

// Check if this file is being run directly
if (require.main === module || process.argv[1].endsWith('/translate.js') || process.argv[1].endsWith('\\translate.js')) {
  runTranslateMissing();
}
