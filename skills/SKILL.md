# react-native-google-translate Skill

Sets up @umituz/react-native-google-translate in React Native or Expo apps with automated installation, configuration, and Google Translate integration.

## When to Trigger

- Setup Google Translate, install Google Translate package, translation service, initialize Google Translate
- Google Translate integration, translate text, batch translation, useTranslation hook
- useBatchTranslation, translateObject, googleTranslateService
- Localization automation, translate missing strings, i18n automation
- Multi-language support, language translation, auto-translate

## Installation Steps

1. **Install Package**
   ```bash
   npm install @umituz/react-native-google-translate
   ```

2. **Create Service Initializer**
   Create `src/services/translate/index.ts`:
   ```typescript
   import { googleTranslateService } from "@umituz/react-native-google-translate/services";

   export function initializeTranslate() {
     googleTranslateService.initialize({
       minDelay: 100,
       maxRetries: 3,
       timeout: 10000,
     });
   }

   export { googleTranslateService };
   ```

3. **Initialize in App Entry Point**
   In `App.tsx` or `index.ts`:
   ```typescript
   import { initializeTranslate } from "./services/translate";

   // Call before rendering
   initializeTranslate();
   ```

4. **Create Translation Hook**
   Create `src/hooks/useTranslate.ts`:
   ```typescript
   import { useTranslation } from "@umituz/react-native-google-translate/hooks";

   export function useTranslate() {
     const { translate, isLoading, error } = useTranslation();

     const t = async (text: string, targetLang: string) => {
       const result = await translate(text, targetLang);
       return result.translatedText;
     };

     return { t, isLoading, error };
   }
   ```

5. **Add Batch Translation Helper** (optional)
   Create `src/utils/batchTranslate.ts`:
   ```typescript
   import { googleTranslateService } from "@umituz/react-native-google-translate/services";

   export async function translateLocaleObject(
     source: Record<string, unknown>,
     target: Record<string, unknown>,
     targetLang: string
   ) {
     await googleTranslateService.translateObject(source, target, targetLang);
     return target;
   }
   ```

6. **Create Translation Script** (for development)
   Create `scripts/translate-locales.ts`:
   ```typescript
   import { googleTranslateService } from "@umituz/react-native-google-translate/services";
   import fs from "fs";
   import path from "path";

   googleTranslateService.initialize({ minDelay: 100 });

   async function translateAllLocales() {
     const enUS = JSON.parse(
       fs.readFileSync("locales/en-US.json", "utf-8")
     );

     const targetLanguages = ["tr-TR", "es-ES", "de-DE"];

     for (const lang of targetLanguages) {
       const targetPath = `locales/${lang}.json`;
       const target = fs.existsSync(targetPath)
         ? JSON.parse(fs.readFileSync(targetPath, "utf-8"))
         : {};

       await googleTranslateService.translateObject(enUS, target, lang);

       fs.writeFileSync(targetPath, JSON.stringify(target, null, 2));
       console.log(`✅ Translated ${lang}`);
     }
   }

   translateAllLocales();
   ```

## Usage Examples

### Component Usage

```typescript
import { useTranslate } from "../hooks/useTranslate";

function MyComponent() {
  const { t, isLoading } = useTranslate();

  const handleTranslate = async () => {
    const translated = await t("Hello World", "tr");
    console.log(translated); // "Merhaba Dünya"
  };

  return (
    <button onPress={handleTranslate} disabled={isLoading}>
      Translate
    </button>
  );
}
```

### Batch Translation

```typescript
import { useBatchTranslation } from "@umituz/react-native-google-translate/hooks";

function TranslateScreen() {
  const { translateBatch, isLoading, progress, total } = useBatchTranslation({
    onSuccess: (stats) => {
      alert(`Translated ${stats.successCount}/${stats.totalCount} strings`);
    },
  });

  const handleTranslate = async () => {
    await translateBatch([
      { text: "Welcome", targetLanguage: "tr" },
      { text: "Settings", targetLanguage: "tr" },
      { text: "Profile", targetLanguage: "tr" },
    ]);
  };

  return (
    <button onPress={handleTranslate}>
      {isLoading ? `Translating... ${progress}/${total}` : "Translate All"}
    </button>
  );
}
```

### Auto-Translate Missing Keys

```typescript
import { googleTranslateService } from "../services/translate";
import enUS from "../locales/en-US.json";
import trTR from "../locales/tr-TR.json";

async function syncTranslations() {
  await googleTranslateService.translateObject(enUS, trTR, "tr");
  console.log("✅ Translations synced");
  // Save trTR back to file
}
```

## Configuration Options

```typescript
interface TranslationConfig {
  minDelay?: number;    // Delay between requests (default: 100ms)
  maxRetries?: number;  // Retry attempts (default: 3)
  timeout?: number;     // Request timeout (default: 10000ms)
}
```

## Supported Languages

40+ languages including:
- English variants (en-US, en-GB, en-AU, en-CA)
- European (es-ES, de-DE, fr-FR, it-IT, pt-BR, etc.)
- Asian (ja-JP, ko-KR, zh-CN, zh-TW, th-TH, vi-VN)
- Middle Eastern (ar-SA, tr-TR, he-IL, fa-IR)
- And many more

## Features

- ✅ Rate limiting to avoid API throttling
- ✅ Batch translation with progress tracking
- ✅ Smart text validation (skips brand names, technical keys)
- ✅ Error handling with retry logic
- ✅ TypeScript support
- ✅ React hooks for easy integration
- ✅ Object translation for locale files
- ✅ Translation statistics

## Best Practices

1. **Initialize once** in app entry point
2. **Use hooks** for component-level translation
3. **Batch translate** multiple texts at once
4. **Handle errors** gracefully with onError callback
5. **Show progress** for batch operations
6. **Cache results** to avoid re-translation

## Troubleshooting

**Service not initialized:**
```typescript
// Make sure to call initializeTranslate() in App.tsx
```

**Rate limit errors:**
```typescript
// Increase minDelay in config
googleTranslateService.initialize({ minDelay: 200 });
```

**Timeout errors:**
```typescript
// Increase timeout for large batches
googleTranslateService.initialize({ timeout: 30000 });
```
