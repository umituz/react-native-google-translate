/**
 * useTranslation Hook
 * @description React hook for single text translation
 */

import { useCallback, useState } from "react";
import type { TranslationRequest, TranslationResponse } from "../../domain";
import { googleTranslateService } from "../../infrastructure/services";

export interface UseTranslationOptions {
  readonly onSuccess?: (result: TranslationResponse) => void;
  readonly onError?: (error: Error) => void;
}

export interface UseTranslationReturn {
  readonly translate: (text: string, targetLanguage: string) => Promise<TranslationResponse>;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

export function useTranslation(
  options?: UseTranslationOptions
): UseTranslationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const translate = useCallback(
    async (text: string, targetLanguage: string): Promise<TranslationResponse> => {
      if (!text || text.trim().length === 0) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: "en",
          targetLanguage,
          success: false,
          error: "Text is empty",
        };
      }

      if (!targetLanguage || targetLanguage.trim().length === 0) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: "en",
          targetLanguage,
          success: false,
          error: "Target language is empty",
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: TranslationRequest = {
          text,
          targetLanguage,
        };

        const result = await googleTranslateService.translate(request);

        if (result.success) {
          options?.onSuccess?.(result);
        } else {
          const error = new Error(result.error || "Translation failed");
          setError(error);
          options?.onError?.(error);
        }

        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return {
    translate,
    isLoading,
    error,
  };
}
