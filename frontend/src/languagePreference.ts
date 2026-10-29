export const APP_LANGUAGES = ['es', 'en', 'zh', 'hi', 'ar', 'it', 'pt', 'ru', 'de', 'fr', 'da'] as const;
export type AppLanguage = typeof APP_LANGUAGES[number];
export type LanguageSource = 'auto' | 'manual';
export type LanguagePreference = { language: AppLanguage; languageSource: LanguageSource };

export function browserLanguage(locales: readonly string[], primary?: string): AppLanguage {
  for (const locale of [...locales, primary]) {
    const base = locale?.trim().toLowerCase().split(/[-_]/)[0];
    if (APP_LANGUAGES.includes(base as AppLanguage)) return base as AppLanguage;
  }
  return 'es';
}

/** A persisted default is not a person's choice. This policy applies equally
 * during startup, account hydration, canonical refresh and account switching. */
export function resolveLanguagePreference(saved: unknown, source: unknown, detected: AppLanguage): LanguagePreference {
  return source === 'manual' && APP_LANGUAGES.includes(saved as AppLanguage)
    ? { language: saved as AppLanguage, languageSource: 'manual' }
    : { language: detected, languageSource: 'auto' };
}

export function normalizeLanguageState<T extends Record<string, unknown>>(state: T, detected: AppLanguage,
  cached?: { language: unknown; languageSource: unknown }): T & LanguagePreference {
  // An old account may lack cloud provenance while its OWN scoped cache still
  // proves the exact same manual choice. Never infer this from another scope.
  const source = state.languageSource === undefined && cached?.languageSource === 'manual' && cached.language === state.language
    ? 'manual' : state.languageSource;
  return { ...state, ...resolveLanguagePreference(state.language, source, detected) };
}
