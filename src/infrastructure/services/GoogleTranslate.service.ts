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

    const stats: TranslationStats = {
      totalCount: requests.length,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      translatedKeys: [],
    };

    for (const request of requests) {
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
          const request: TranslationRequest = {
            text: enValue,
            targetLanguage,
          };

          const result = await this.translate(request);

          if (result.success && result.translatedText !== enValue) {
            targetObject[key] = result.translatedText;
            stats.successCount++;
            stats.translatedKeys.push({
              key: currentPath,
              from: enValue,
              to: result.translatedText,
            });
          } else if (!result.success) {
            stats.failureCount++;
          } else {
            stats.skippedCount++;
          }
        } else {
          stats.skippedCount++;
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
}

export const googleTranslateService = new GoogleTranslateService();
