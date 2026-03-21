/**
 * Google Translate Service
 * @description Main translation service using Google Translate API
 */

import type {
  TranslationRequest,
  TranslationResponse,
  TranslationStats,
  ITranslationService,
  TranslationServiceConfig,
} from "../../domain";
import { RateLimiter } from "../utils/rateLimit.util";
import {
  shouldSkipWord,
  needsTranslation,
  isValidText,
} from "../utils/textValidator.util";
import {
  GOOGLE_TRANSLATE_API_URL,
  DEFAULT_MIN_DELAY,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT,
} from "../constants";

class GoogleTranslateService implements ITranslationService {
  private config: TranslationServiceConfig | null = null;
  private rateLimiter: RateLimiter | null = null;

  initialize(config: TranslationServiceConfig): void {
    this.config = {
      minDelay: DEFAULT_MIN_DELAY,
      maxRetries: DEFAULT_MAX_RETRIES,
      timeout: DEFAULT_TIMEOUT,
      ...config,
    };
    this.rateLimiter = new RateLimiter(this.config.minDelay);
  }

  isInitialized(): boolean {
    return this.config !== null && this.rateLimiter !== null;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error(
        "GoogleTranslateService is not initialized. Call initialize() first."
      );
    }
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    this.ensureInitialized();

    const { text, targetLanguage, sourceLanguage = "en" } = request;

    if (!isValidText(text) || shouldSkipWord(text)) {
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        success: true,
      };
    }

    if (!targetLanguage || targetLanguage.trim().length === 0) {
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        success: false,
        error: "Invalid target language",
      };
    }

    // After ensureInitialized(), rateLimiter is guaranteed to be non-null
    await this.rateLimiter!.waitForSlot();

    try {
      const translatedText = await this.callTranslateAPI(
        text,
        targetLanguage,
        sourceLanguage
      );

      return {
        originalText: text,
        translatedText,
        sourceLanguage,
        targetLanguage,
        success: true,
      };
    } catch (error) {
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async translateBatch(requests: TranslationRequest[]): Promise<TranslationStats> {
    this.ensureInitialized();

    if (!Array.isArray(requests) || requests.length === 0) {
      return {
        totalCount: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        translatedKeys: [],
      };
    }

    // Use batch API call for better performance
    const batchSize = 50;
    const stats: TranslationStats = {
      totalCount: requests.length,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      translatedKeys: [],
    };

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      // Wait for rate limiter once per batch instead of once per request
      await this.rateLimiter!.waitForSlot();

      try {
        const translations = await this.callTranslateAPIBatch(batch, requests[0].targetLanguage);

        for (let j = 0; j < batch.length; j++) {
          const request = batch[j];
          const translatedText = translations[j];

          if (translatedText && translatedText !== request.text) {
            stats.successCount++;
            stats.translatedKeys.push({
              key: request.text,
              from: request.text,
              to: translatedText,
            });
          } else if (!translatedText) {
            stats.failureCount++;
          } else {
            stats.skippedCount++;
          }
        }
      } catch (error) {
        // Fallback to individual requests on batch failure
        for (const request of batch) {
          const result = await this.translate(request);

          if (result.success) {
            if (result.translatedText === result.originalText) {
              stats.skippedCount++;
            } else {
              stats.successCount++;
              stats.translatedKeys.push({
                key: request.text,
                from: result.originalText,
                to: result.translatedText,
              });
            }
          } else {
            stats.failureCount++;
          }
        }
      }
    }

    return stats;
  }

  async translateObject(
    sourceObject: Record<string, unknown>,
    targetObject: Record<string, unknown>,
    targetLanguage: string,
    path = "",
    stats: TranslationStats = {
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      translatedKeys: [],
    }
  ): Promise<void> {
    if (!sourceObject || typeof sourceObject !== "object") {
      return;
    }

    if (!targetObject || typeof targetObject !== "object") {
      return;
    }

    if (!targetLanguage || targetLanguage.trim().length === 0) {
      return;
    }

    const keys = Object.keys(sourceObject);

    // Collect all texts to translate first
    const textsToTranslate: Array<{key: string; enValue: string; currentPath: string}> = [];

    for (const key of keys) {
      const enValue = sourceObject[key];
      const targetValue = targetObject[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof enValue === "object" && enValue !== null) {
        if (
          !targetObject[key] ||
          typeof targetObject[key] !== "object"
        ) {
          targetObject[key] = {};
        }
        await this.translateObject(
          enValue as Record<string, unknown>,
          targetObject[key] as Record<string, unknown>,
          targetLanguage,
          currentPath,
          stats
        );
      } else if (typeof enValue === "string") {
        stats.totalCount++;

        if (needsTranslation(targetValue, enValue)) {
          textsToTranslate.push({key, enValue, currentPath});
        } else {
          stats.skippedCount++;
        }
      }
    }

    // Batch translate all texts at once
    if (textsToTranslate.length > 0) {
      const batchSize = 50; // Google Translate API can handle ~50 texts at once
      for (let i = 0; i < textsToTranslate.length; i += batchSize) {
        const batch = textsToTranslate.slice(i, i + batchSize);
        const results = await this.translateBatch(
          batch.map(item => ({
            text: item.enValue,
            targetLanguage,
          }))
        );

        // Apply translations
        for (let j = 0; j < batch.length; j++) {
          const {key, enValue, currentPath} = batch[j];
          const translatedKey = results.translatedKeys[j];

          if (translatedKey && translatedKey.from !== enValue) {
            targetObject[key] = translatedKey.to;
            stats.successCount++;
            stats.translatedKeys.push({
              key: currentPath,
              from: enValue,
              to: translatedKey.to,
            });
          } else if (!translatedKey) {
            stats.failureCount++;
          } else {
            stats.skippedCount++;
          }
        }
      }
    }
  }

  private async callTranslateAPI(
    text: string,
    targetLanguage: string,
    sourceLanguage: string
  ): Promise<string> {
    const timeout = this.config?.timeout || DEFAULT_TIMEOUT;
    const encodedText = encodeURIComponent(text);
    const url = `${GOOGLE_TRANSLATE_API_URL}?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodedText}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Type guard for Google Translate API response structure
      if (
        Array.isArray(data) &&
        data.length > 0 &&
        Array.isArray(data[0]) &&
        data[0].length > 0 &&
        Array.isArray(data[0][0]) &&
        typeof data[0][0][0] === "string"
      ) {
        return data[0][0][0];
      }

      return text;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callTranslateAPIBatch(
    requests: TranslationRequest[],
    targetLanguage: string,
    sourceLanguage: string = "en"
  ): Promise<string[]> {
    const timeout = this.config?.timeout || DEFAULT_TIMEOUT;

    // Build batch request URL
    const queryParts = requests.map(req => encodeURIComponent(req.text)).join('&q=');
    const url = `${GOOGLE_TRANSLATE_API_URL}?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${queryParts}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Batch API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Extract translations from batch response
      const translations: string[] = [];

      if (Array.isArray(data) && data.length > 0) {
        for (let i = 0; i < requests.length; i++) {
          if (
            Array.isArray(data[i]) &&
            data[i].length > 0 &&
            Array.isArray(data[i][0]) &&
            typeof data[i][0][0] === "string"
          ) {
            translations.push(data[i][0][0]);
          } else {
            translations.push(requests[i].text); // Fallback to original
          }
        }
      }

      return translations;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const googleTranslateService = new GoogleTranslateService();
