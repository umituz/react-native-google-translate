/**
 * useBatchTranslation Hook
 * @description React hook for batch translation of multiple texts
 */

import { useCallback, useState } from "react";
import type {
  TranslationRequest,
  TranslationStats,
} from "../../domain";
import { googleTranslateService } from "../../infrastructure/services";

export interface UseBatchTranslationOptions {
  readonly onSuccess?: (stats: TranslationStats) => void;
  readonly onError?: (error: Error) => void;
  readonly onProgress?: (current: number, total: number) => void;
}

export interface UseBatchTranslationReturn {
  readonly translateBatch: (
    requests: TranslationRequest[]
  ) => Promise<TranslationStats>;
  readonly translateObject: (
    sourceObject: Record<string, unknown>,
    targetObject: Record<string, unknown>,
    targetLanguage: string
  ) => Promise<TranslationStats>;
  readonly isLoading: boolean;
  readonly progress: number;
  readonly total: number;
  readonly error: Error | null;
}

export function useBatchTranslation(
  options?: UseBatchTranslationOptions
): UseBatchTranslationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const translateBatch = useCallback(
    async (requests: TranslationRequest[]): Promise<TranslationStats> => {
      if (!Array.isArray(requests) || requests.length === 0) {
        return {
          totalCount: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          translatedKeys: [],
        };
      }

      setIsLoading(true);
      setError(null);
      setTotal(requests.length);
      setProgress(0);

      try {
        const stats = await googleTranslateService.translateBatch(requests);

        // Progress is completed
        setProgress(stats.totalCount);
        options?.onProgress?.(stats.totalCount, stats.totalCount);

        if (stats.failureCount > 0) {
          const error = new Error(
            `${stats.failureCount} of ${stats.totalCount} translations failed`
          );
          setError(error);
          options?.onError?.(error);
        } else {
          options?.onSuccess?.(stats);
        }

        return stats;
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

  const translateObject = useCallback(
    async (
      sourceObject: Record<string, unknown>,
      targetObject: Record<string, unknown>,
      targetLanguage: string
    ): Promise<TranslationStats> => {
      if (!sourceObject || typeof sourceObject !== "object") {
        throw new Error("Source object is invalid");
      }

      if (!targetObject || typeof targetObject !== "object") {
        throw new Error("Target object is invalid");
      }

      if (!targetLanguage || targetLanguage.trim().length === 0) {
        throw new Error("Target language is required");
      }

      setIsLoading(true);
      setError(null);

      try {
        const stats: TranslationStats = {
          totalCount: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          translatedKeys: [],
        };

        await googleTranslateService.translateObject(
          sourceObject,
          targetObject,
          targetLanguage,
          "",
          stats
        );

        setTotal(stats.totalCount);
        setProgress(stats.totalCount);

        if (stats.failureCount > 0) {
          const error = new Error(
            `${stats.failureCount} of ${stats.totalCount} translations failed`
          );
          setError(error);
          options?.onError?.(error);
        } else {
          options?.onSuccess?.(stats);
        }

        return stats;
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
    translateBatch,
    translateObject,
    isLoading,
    progress,
    total,
    error,
  };
}
