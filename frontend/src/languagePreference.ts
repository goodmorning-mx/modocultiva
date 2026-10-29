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

export function normalizeLanguageState<T extends Record<string, unknown>>(state: T, detected: AppLanguage): T & LanguagePreference {
  return { ...state, ...resolveLanguagePreference(state.language, state.languageSource, detected) };
}

/** Old independent value/source keys can disagree. Only this value-bound record
 * (or explicit cloud provenance) establishes which language was actually chosen. */
export function readManualLanguage(raw: string | null): AppLanguage | null {
  try {
    const record = JSON.parse(raw ?? 'null');
    return record?.version === 1 && record.source === 'manual' && APP_LANGUAGES.includes(record.language) ? record.language : null;
  } catch { return null; }
}

export function restoreLanguagePreference(saved: unknown, source: unknown, detected: AppLanguage, manualRecord: string | null): LanguagePreference {
  const preference = resolveLanguagePreference(saved, source, detected);
  const chosen = readManualLanguage(manualRecord);
  return preference.languageSource === 'auto' && chosen ? { language: chosen, languageSource: 'manual' } : preference;
}
