/**
 * Translation Entity
 * @description Represents a translation request and response
 */

export interface TranslationRequest {
  readonly text: string;
  readonly targetLanguage: string;
  readonly sourceLanguage?: string;
}

export interface TranslationResponse {
  readonly originalText: string;
  readonly translatedText: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly success: boolean;
  readonly error?: string;
}

export interface TranslationStats {
  totalCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  translatedKeys: TranslationKeyInfo[];
}

export interface TranslationKeyInfo {
  readonly key: string;
  readonly from: string;
  readonly to: string;
}

export type BatchTranslationResult = Record<string, TranslationResponse>;
