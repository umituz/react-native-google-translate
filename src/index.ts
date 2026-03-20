/**
 * @umituz/react-native-google-translate
 * Google Translate integration for React Native applications
 *
 * For better tree-shaking and explicit dependencies, use subpath imports:
 * - @umituz/react-native-google-translate/core - Domain entities and interfaces
 * - @umituz/react-native-google-translate/services - Translation services
 * - @umituz/react-native-google-translate/hooks - React hooks
 *
 * @example
 * ```ts
 * // ✅ RECOMMENDED: Subpath import (better tree-shaking)
 * import { googleTranslateService } from "@umituz/react-native-google-translate/services";
 * import { useTranslation } from "@umituz/react-native-google-translate/hooks";
 *
 * // ✅ ALSO SUPPORTED: Root import (convenience)
 * import { googleTranslateService, useTranslation } from "@umituz/react-native-google-translate";
 * ```
 */

export * from "./domain";
export * from "./infrastructure/services";
export * from "./infrastructure/utils";
export * from "./infrastructure/constants";
export * from "./presentation";
