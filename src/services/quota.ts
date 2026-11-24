import {KEYS, store} from './storage';
import {getCredits, spendCredit} from './credits';

/**
 * Conversions a new user gets before the paywall appears. Extracting an archive
 * counts as one; viewing never does, because the viewer is free.
 *
 * Every screen that mentions the allowance reads it from here.
 */
export const FREE_CONVERSIONS = 10;

/**
 * The free-allowance epoch. Everyone whose stored epoch is lower than this gets a
 * fresh allowance, once.
 *
 * 2 is the 2.0.0 release: every user, including one who spent their whole allowance
 * on 1.x, starts 2.0.0 with all FREE_CONVERSIONS again. A fresh install is also
 * epoch 2 with nothing used.
 *
 * BUMP THIS ONLY WHEN YOU DELIBERATELY WANT TO HAND EVERYONE A NEW ALLOWANCE. An
 * ordinary release leaves it alone, so updating the app never resets anybody's count.
 * Only the free "used" tally is reset: earned rewarded-ad credits, premium
 * entitlement and history are not touched.
 */
export const QUOTA_EPOCH = 2;

let epochChecked: Promise<void> | null = null;

/**
 * Runs once per app launch, before the first read of the count, and changes anything
 * only when the stored epoch is behind QUOTA_EPOCH — so once per user per epoch, never
 * on every launch. The count is cleared before the epoch is written: if the app dies
 * between the two, the next launch repeats a reset that was already due, which costs
 * nothing, where the other order could lose the reset for good.
 */
const ensureEpoch = (): Promise<void> => {
  if (!epochChecked) {
    epochChecked = (async () => {
      const stored = await store.read<number>(KEYS.quotaEpoch, 0);
      if (stored < QUOTA_EPOCH) {
        await store.write(KEYS.used, 0);
        await store.write(KEYS.quotaEpoch, QUOTA_EPOCH);
      }
    })();
  }
  return epochChecked;
};

export const getUsed = async () => {
  await ensureEpoch();
  return store.read<number>(KEYS.used, 0);
};

export const getRemaining = async (isPremium: boolean) => {
  if (isPremium) return Infinity;
  return Math.max(0, FREE_CONVERSIONS - (await getUsed())) + (await getCredits());
};

export const canConvert = async (isPremium: boolean) => (await getRemaining(isPremium)) > 0;

/** Debug-build testing aid: puts the free tally back to zero. */
export const resetQuota = async () => {
  await ensureEpoch();
  await store.write(KEYS.used, 0);
};

/** Only called after a file has actually been written. A failed run costs nothing. */
export const countConversion = async (isPremium: boolean) => {
  if (isPremium) return;
  const used = await getUsed();
  // The free allowance is spent first; credits are only touched once it is gone,
  // so somebody who watched an ad early still gets the whole free allowance.
  if (used < FREE_CONVERSIONS) {
    await store.write(KEYS.used, used + 1);
    return;
  }
  await spendCredit();
};
