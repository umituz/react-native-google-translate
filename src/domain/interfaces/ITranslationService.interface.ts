/**
 * Translation Service Interface
 * @description Defines the contract for translation services
 */

import type { TranslationRequest, TranslationResponse, TranslationStats } from "../entities";

export interface TranslationServiceConfig {
  readonly apiKey?: string;
  readonly minDelay?: number;
  readonly maxRetries?: number;
  readonly timeout?: number;
}

export interface ITranslationService {
  initialize(config: TranslationServiceConfig): void;
  isInitialized(): boolean;
  translate(request: TranslationRequest): Promise<TranslationResponse>;
  translateBatch(requests: TranslationRequest[]): Promise<TranslationStats>;
  translateObject(
    sourceObject: Record<string, unknown>,
    targetObject: Record<string, unknown>,
    targetLanguage: string,
    path?: string,
    stats?: TranslationStats
  ): Promise<void>;
}
