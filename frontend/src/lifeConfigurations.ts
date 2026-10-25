type Configurations = Record<string, Record<string, number>>;
type RenameResult = { ok: true; configurations: Configurations; selectedName: string } | { ok: false; reason: 'missing' | 'empty' | 'duplicate' };

export function renameLifeConfiguration(configurations: Configurations, selectedName: string, proposedName: string): RenameResult {
  if (!Object.prototype.hasOwnProperty.call(configurations, selectedName)) return { ok: false, reason: 'missing' };
  const name = proposedName.trim();
  if (!name) return { ok: false, reason: 'empty' };
  if (name !== selectedName && Object.prototype.hasOwnProperty.call(configurations, name)) return { ok: false, reason: 'duplicate' };
  return {
    ok: true,
    configurations: Object.fromEntries(Object.entries(configurations).map(([key, levels]) => [key === selectedName ? name : key, levels])),
    selectedName: name,
  };
}

type StoragePort = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };
export function persistRenamedConfiguration(storage: StoragePort, configurations: Configurations, selectedName: string) {
  const previousSelection = storage.getItem('modoCultiva_selectedPreset');
  storage.setItem('modoCultiva_selectedPreset', selectedName);
  try {
    storage.setItem('modoCultiva_presets', JSON.stringify(configurations));
  } catch (error) {
    if (previousSelection === null) storage.removeItem('modoCultiva_selectedPreset');
    else storage.setItem('modoCultiva_selectedPreset', previousSelection);
    throw error;
  }
}
