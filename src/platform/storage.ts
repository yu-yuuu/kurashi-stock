export type StorageProtection = 'protected' | 'standard' | 'unsupported' | 'unavailable'

// Persistence reduces automatic eviction. Explicit site-data deletion still removes inventory.
export async function protectInventoryStorage(
  storage: Pick<StorageManager, 'persisted' | 'persist'> | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage,
): Promise<StorageProtection> {
  if (!storage?.persisted || !storage.persist) return 'unsupported'
  try {
    if (await storage.persisted()) return 'protected'
    return await storage.persist() ? 'protected' : 'standard'
  } catch {
    // A denied request must never block a local inventory transaction.
    return 'unavailable'
  }
}
