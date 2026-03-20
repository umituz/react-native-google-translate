# @umituz/react-native-google-translate

Google Translate integration for React Native applications with rate limiting, batch translation, and TypeScript support.

## Features

- 🌍 Multi-language translation using Google Translate API
- ⚡ Rate limiting to avoid API throttling
- 📦 Batch translation support for multiple texts
- 🔍 Smart text validation and skip rules
- 🎯 TypeScript support with full type safety
- 🪝 React hooks for easy integration
- 📊 Translation statistics and progress tracking

## Installation

```bash
npm install @umituz/react-native-google-translate
# or
yarn add @umituz/react-native-google-translate
# or
bun add @umituz/react-native-google-translate
```

## Quick Start

### 1. Initialize the Service

```typescript
import { googleTranslateService } from "@umituz/react-native-google-translate/services";

// Initialize once in your app entry point
googleTranslateService.initialize({
  minDelay: 100, // Minimum delay between requests (ms)
  maxRetries: 3, // Maximum retries on failure
  timeout: 10000, // Request timeout (ms)
});
```

### 2. Use React Hooks

#### Single Translation

```typescript
import { useTranslation } from "@umituz/react-native-google-translate/hooks";

function MyComponent() {
  const { translate, isLoading, error } = useTranslation({
    onSuccess: (result) => {
      console.log(`Translated: ${result.translatedText}`);
    },
    onError: (error) => {
      console.error(`Translation failed: ${error.message}`);
    },
  });

  const handleTranslate = async () => {
    const result = await translate("Hello World", "tr");
    console.log(result.translatedText); // "Merhaba Dünya"
  };

  return (
    <button onClick={handleTranslate} disabled={isLoading}>
      {isLoading ? "Translating..." : "Translate"}
    </button>
  );
}
```

#### Batch Translation

```typescript
import { useBatchTranslation } from "@umituz/react-native-google-translate/hooks";

function TranslateMultiple() {
  const { translateBatch, isLoading, progress, total } = useBatchTranslation({
    onSuccess: (stats) => {
      console.log(`Translated ${stats.successCount} of ${stats.totalCount} texts`);
    },
    onProgress: (current, total) => {
      console.log(`Progress: ${current}/${total}`);
    },
  });

  const handleBatchTranslate = async () => {
    const requests = [
      { text: "Hello", targetLanguage: "tr" },
      { text: "World", targetLanguage: "tr" },
      { text: "Goodbye", targetLanguage: "tr" },
    ];

    const stats = await translateBatch(requests);
    console.log(stats);
  };

  return (
    <div>
      <button onClick={handleBatchTranslate} disabled={isLoading}>
        {isLoading ? `Translating... (${progress}/${total})` : "Translate All"}
      </button>
    </div>
  );
}
```

#### Object Translation

```typescript
import { useBatchTranslation } from "@umituz/react-native-google-translate/hooks";

function TranslateLocaleFile() {
  const { translateObject, isLoading } = useBatchTranslation();

  const handleTranslate = async () => {
    const sourceObject = {
      welcome: { message: "Welcome", title: "Hello" },
      goodbye: "Goodbye",
    };

    const targetObject = {};

    const stats = await translateObject(sourceObject, targetObject, "tr");

    console.log(targetObject);
    // { welcome: { message: "Hoşgeldiniz", title: "Merhaba" }, goodbye: "Hoşça kal" }
  };

  return <button onClick={handleTranslate}>Translate Object</button>;
}
```

### 3. Direct Service Usage

```typescript
import type { TranslationRequest } from "@umituz/react-native-google-translate/core";
import { googleTranslateService } from "@umituz/react-native-google-translate/services";

// Single translation
const request: TranslationRequest = {
  text: "Hello World",
  targetLanguage: "tr",
};

const response = await googleTranslateService.translate(request);
console.log(response.translatedText); // "Merhaba Dünya"

// Batch translation
const requests: TranslationRequest[] = [
  { text: "Hello", targetLanguage: "tr" },
  { text: "World", targetLanguage: "tr" },
];

const stats = await googleTranslateService.translateBatch(requests);
console.log(`Success: ${stats.successCount}, Failed: ${stats.failureCount}`);

// Object translation
const source = { greeting: "Hello", farewell: "Goodbye" };
const target = {};

await googleTranslateService.translateObject(source, target, "tr");
console.log(target); // { greeting: "Merhaba", farewell: "Hoşça kal" }
```

## Supported Languages

The package includes built-in support for 40+ languages:

- Arabic (ar-SA), Bulgarian (bg-BG), Czech (cs-CZ), Danish (da-DK)
- German (de-DE), Greek (el-GR), English variants (en-AU, en-CA, en-GB, en-US)
- Spanish (es-ES, es-MX), Finnish (fi-FI), French (fr-CA, fr-FR)
- Hindi (hi-IN), Croatian (hr-HR), Hungarian (hu-HU), Indonesian (id-ID)
- Italian (it-IT), Japanese (ja-JP), Korean (ko-KR), Malay (ms-MY)
- Dutch (nl-NL), Norwegian (no-NO), Polish (pl-PL), Portuguese (pt-BR, pt-PT)
- Romanian (ro-RO), Russian (ru-RU), Slovak (sk-SK), Slovenian (sl-SI)
- Swedish (sv-SE), Thai (th-TH), Tagalog (tl-PH), Turkish (tr-TR)
- Ukrainian (uk-UA), Vietnamese (vi-VN), Chinese (zh-CN, zh-TW)

## API Reference

### Subpath Exports

- `@umituz/react-native-google-translate/core` - Domain entities and interfaces
- `@umituz/react-native-google-translate/services` - Translation services
- `@umituz/react-native-google-translate/hooks` - React hooks

### Service Configuration

```typescript
interface TranslationServiceConfig {
  apiKey?: string;          // Optional API key for future use
  minDelay?: number;        // Minimum delay between requests (default: 100ms)
  maxRetries?: number;      // Maximum retries on failure (default: 3)
  timeout?: number;         // Request timeout in ms (default: 10000)
}
```

### Translation Types

```typescript
interface TranslationRequest {
  readonly text: string;
  readonly targetLanguage: string;
  readonly sourceLanguage?: string;
}

interface TranslationResponse {
  readonly originalText: string;
  readonly translatedText: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly success: boolean;
  readonly error?: string;
}

interface TranslationStats {
  readonly totalCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly skippedCount: number;
  readonly translatedKeys: TranslationKeyInfo[];
}
```

## Features

### Smart Text Validation

The package automatically skips:
- Technical keys (e.g., "scenario.xxx.title")
- Brand names (Google, Apple, Facebook, etc.)
- Empty or invalid text
- Already translated content

### Rate Limiting

Built-in rate limiting prevents API throttling:
- Configurable delay between requests
- Automatic retry on failure
- Progress tracking for batch operations

### Error Handling

Comprehensive error handling:
- Network errors
- Timeout errors
- Rate limit errors
- Graceful fallback to original text

## License

MIT

## Author

umituz

## Repository

https://github.com/umituz/react-native-google-translate
