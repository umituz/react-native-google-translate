/**
 * Text Validator Utility
 * @description Validates text for translation eligibility
 */

import { SKIP_WORDS, LANGUAGE_MAP, LANGUAGE_NAMES } from "../constants";

export function shouldSkipWord(word: string): boolean {
  return SKIP_WORDS.has(word);
}

export function needsTranslation(
  value: unknown,
  enValue: unknown
): boolean {
  if (typeof enValue !== "string" || !enValue.trim()) {
    return false;
  }

  if (shouldSkipWord(enValue)) {
    return false;
  }

  // Skip technical keys (e.g., "scenario.xxx.title")
  const isTechnicalKey = enValue.includes(".") && !enValue.includes(" ");
  if (isTechnicalKey) {
    return false;
  }

  // If value is missing or same as English, it needs translation
  if (!value || typeof value !== "string") {
    return true;
  }

  if (value === enValue) {
    const isSingleWord = !enValue.includes(" ") && enValue.length < 20;
    return !isSingleWord;
  }

  // Detect outdated template patterns (e.g., {{appName}}, {{variable}})
  if (typeof value === "string") {
    const hasTemplatePattern = value.includes("{{") && value.includes("}}");
    if (hasTemplatePattern && !enValue.includes("{{")) {
      return true;
    }
  }

  return false;
}

export function isValidText(text: unknown): text is string {
  return typeof text === "string" && text.length > 0;
}

export function getTargetLanguage(langCode: string): string | undefined {
  return LANGUAGE_MAP[langCode];
}

export function isEnglishVariant(langCode: string): boolean {
  const targetLang = getTargetLanguage(langCode);
  return targetLang === "en";
}

export function getLanguageDisplayName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}
