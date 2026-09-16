import {KEYS, store} from './storage';

/**
 * Debug-build-only entitlement override.
 *
 * Play billing never completes in a locally built APK: the products do not
 * resolve and `getAvailablePurchases` comes back empty, so the paid half of the
 * app — unlimited conversions, no banner, no interstitial — cannot be reached on
 * a test device at all. This forces it on so those paths can actually be used.
 *
 * Gated on `__DEV__`, which Metro substitutes as a literal `false` when it builds
 * a release bundle; the branches below are then dead code and the stored value is
 * unreadable from a release APK whatever happens to sit in AsyncStorage. It also
 * lives under its own key, well away from the billing cache, so it can never be
 * mistaken for a real purchase or reconciled back to Play.
 */
export type TestEntitlement = 'free' | 'premium';

/** The forced entitlement, or null to defer to real billing. */
export const getTestEntitlement = async (): Promise<TestEntitlement | null> => {
  if (!__DEV__) return null;
  return store.read<TestEntitlement | null>(KEYS.testEntitlement, null);
};

export const setTestEntitlement = async (value: TestEntitlement | null) => {
  if (!__DEV__) return;
  if (value === null) await store.remove(KEYS.testEntitlement);
  else await store.write(KEYS.testEntitlement, value);
};
