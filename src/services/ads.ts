import {Platform} from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentStatus,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import {KEYS, store} from './storage';

const isDev = __DEV__;

/**
 * Debug builds use Google's test ids, so ads are safe to tap while developing.
 * Replace the two production ids, and the app id in AndroidManifest.xml, before the first upload.
 */
export const AD_UNITS = {
  banner: isDev ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-2904788540387890/6035784056',
  interstitial: isDev ? TestIds.INTERSTITIAL : 'ca-app-pub-2904788540387890/2096539042',
  rewarded: isDev ? TestIds.REWARDED : 'ca-app-pub-2904788540387890/6052095928',
};

/**
 * Ad pacing rules, kept in one place so they stay honest:
 *  - never for a paying user
 *  - never while a conversion is running, and never on top of a file being saved
 *  - at most one full-screen ad every 3 actions — a conversion or a file opened in
 *    the viewer — and never twice inside 2 minutes
 */
const EVERY_N_CONVERSIONS = 3;
const MIN_GAP_MS = 120_000;

let interstitial: InterstitialAd | null = null;
let loaded = false;

let rewarded: RewardedAd | null = null;
let rewardedLoaded = false;

let started = false;

/**
 * Safe to call more than once. It has to be, because the app can become a free
 * app part way through a session — a subscription lapses, or a refund lands —
 * and the ads then have to start from nothing. Calling it twice used to mean two
 * sets of preloaded ads; the flag makes the second call a no-op instead.
 */
export const initAds = async () => {
  if (Platform.OS !== 'android' || started) return;
  started = true;
  try {
    await requestConsent();
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    preloadInterstitial();
    preloadRewarded();
  } catch {
    // The app is fully usable with no ads at all. Let a later call try again.
    started = false;
  }
};

export const requestConsent = async () => {
  try {
    const info = await AdsConsent.requestInfoUpdate();
    if (
      info.isConsentFormAvailable &&
      info.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }
  } catch {
    /* Consent is only required in some regions; failures must not block the app. */
  }
};

/** Wired to the "Ad privacy choices" row in Settings, which Google requires to stay reachable. */
export const showPrivacyOptions = async () => {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch {
    /* no form for this region */
  }
};

const preloadInterstitial = () => {
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
    requestNonPersonalizedAdsOnly: false,
  });
  loaded = false;
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    preloadInterstitial();
  });
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false;
  });
  interstitial.load();
};

/**
 * A rewarded ad is loaded up front and reloaded after every showing, because it is
 * offered at the moment the free allowance runs out — a spinner there would read
 * as the paywall stalling.
 */
const preloadRewarded = () => {
  rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
    requestNonPersonalizedAdsOnly: false,
  });
  rewardedLoaded = false;
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
  });
  rewarded.addAdEventListener(AdEventType.ERROR, () => {
    rewardedLoaded = false;
  });
  rewarded.load();
};

export const isRewardedReady = () => rewardedLoaded;

/**
 * Resolves true only when Google says the reward was actually earned — closing the
 * ad early resolves false and nothing is granted. The listeners are torn down on
 * the way out so a second showing cannot pay out twice.
 */
export const showRewarded = (): Promise<boolean> =>
  new Promise(resolve => {
    const ad = rewarded;
    if (!ad || !rewardedLoaded) {
      resolve(false);
      return;
    }
    rewardedLoaded = false;
    let earned = false;
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      offEarned();
      offClosed();
      preloadRewarded();
      resolve(value);
    };

    const offEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned));

    try {
      ad.show();
    } catch {
      finish(false);
    }
  });

export const maybeShowInterstitial = async (isPremium: boolean) => {
  if (isPremium) return false;

  const since = await store.read<number>(KEYS.conversionsSinceAd, 0);
  const last = await store.read<number>(KEYS.adsSince, 0);
  const next = since + 1;

  // The count is kept even when no ad can be shown. Returning early without it
  // meant that conversions done while an ad was still loading did not count
  // towards the next one, so the third conversion could arrive with a tally of
  // one and no ad appeared when it was due.
  if (!interstitial || !loaded || next < EVERY_N_CONVERSIONS || Date.now() - last < MIN_GAP_MS) {
    await store.write(KEYS.conversionsSinceAd, next);
    return false;
  }

  try {
    interstitial.show();
    await store.write(KEYS.conversionsSinceAd, 0);
    await store.write(KEYS.adsSince, Date.now());
    return true;
  } catch {
    return false;
  }
};
