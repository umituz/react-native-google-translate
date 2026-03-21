/**
 * Infrastructure Services
 * @description Exports all services and utilities
 */

export { googleTranslateService } from "./GoogleTranslate.service";

export {
  shouldSkipWord,
  needsTranslation,
  isValidText,
  getTargetLanguage,
  isEnglishVariant,
  getLanguageDisplayName,
} from "../utils/textValidator.util";

export {
  LANGUAGE_MAP,
  SKIP_WORDS,
  LANGUAGE_NAMES,
} from "../constants/languages.constants";
