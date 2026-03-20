/**
 * Language Entity
 * @description Language code mappings and metadata
 */

export type LanguageCode = `${string}-${string}`;

export interface LanguageInfo {
  readonly code: LanguageCode;
  readonly name: string;
  readonly targetLanguage: string;
}

export interface LanguageMap {
  readonly [key: string]: string;
}
