import {Platform} from 'react-native';
import * as IAP from 'react-native-iap';
import {KEYS, store} from './storage';

/**
 * Product ids must match the Play Console exactly.
 * Prices are set in the Play Console, never in the app — the app only ever shows
 * the localised price string that Play sends back.
 */
export const SUB_ID = 'premium_monthly';
export const SUB_BASE_PLAN = 'monthly-49';
export const LIFETIME_ID = 'premium_lifetime';

export type Plan = {
  id: string;
  kind: 'subscription' | 'lifetime';
  title: string;
  price: string;
  offerToken?: string;
};

export type Entitlement = {premium: boolean; kind?: 'subscription' | 'lifetime'; since?: number};

let listeners: Array<(e: Entitlement) => void> = [];
let current: Entitlement = {premium: false};

export const onEntitlementChange = (fn: (e: Entitlement) => void) => {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
};

const setEntitlement = async (e: Entitlement) => {
  current = e;
  await store.write(KEYS.entitlement, e);
  listeners.forEach(l => l(e));
};

export const getCachedEntitlement = async (): Promise<Entitlement> => {
  current = await store.read<Entitlement>(KEYS.entitlement, {premium: false});
  return current;
};

let purchaseUpdate: IAP.EmitterSubscription | null = null;
let purchaseError: IAP.EmitterSubscription | null = null;

export const initBilling = async () => {
  if (Platform.OS !== 'android') return;
  await getCachedEntitlement();
  try {
    await IAP.initConnection();
  } catch {
    return; // No Play Services. The free tier keeps working.
  }

  purchaseUpdate = IAP.purchaseUpdatedListener(async purchase => {
    if (!purchase.transactionReceipt) return;
    const kind = purchase.productId === LIFETIME_ID ? 'lifetime' : 'subscription';
    await setEntitlement({premium: true, kind, since: Date.now()});
    try {
      // Acknowledging is required, or Play refunds the purchase after three days.
      await IAP.finishTransaction({purchase, isConsumable: false});
    } catch {
      /* already acknowledged */
    }
  });

  purchaseError = IAP.purchaseErrorListener(() => {
    /* The screen shows its own message; nothing to do here. */
  });

  await restorePurchases();
};

export const endBilling = async () => {
  purchaseUpdate?.remove();
  purchaseError?.remove();
  try {
    await IAP.endConnection();
  } catch {
    /* nothing to close */
  }
};

export const loadPlans = async (): Promise<Plan[]> => {
  const plans: Plan[] = [];
  try {
    const subs = await IAP.getSubscriptions({skus: [SUB_ID]});
    subs.forEach(s => {
      const offer = s.subscriptionOfferDetails?.find(o => o.basePlanId === SUB_BASE_PLAN) ??
        s.subscriptionOfferDetails?.[0];
      plans.push({
        id: s.productId,
        kind: 'subscription',
        title: s.title ?? 'Monthly',
        price: offer?.pricingPhases.pricingPhaseList[0]?.formattedPrice ?? '',
        offerToken: offer?.offerToken,
      });
    });
  } catch {
    /* handled by the caller showing a retry */
  }
  try {
    const products = await IAP.getProducts({skus: [LIFETIME_ID]});
    products.forEach(p =>
      plans.push({id: p.productId, kind: 'lifetime', title: p.title ?? 'One time', price: p.localizedPrice ?? ''}),
    );
  } catch {
    /* handled by the caller showing a retry */
  }
  return plans;
};

export const buy = async (plan: Plan) => {
  if (plan.kind === 'subscription') {
    await IAP.requestSubscription({
      sku: plan.id,
      subscriptionOffers: plan.offerToken ? [{sku: plan.id, offerToken: plan.offerToken}] : undefined,
    });
  } else {
    await IAP.requestPurchase({skus: [plan.id]});
  }
};

/** Called on every launch so a reinstall or a new device keeps what was paid for. */
export const restorePurchases = async (): Promise<Entitlement> => {
  try {
    const purchases = await IAP.getAvailablePurchases();
    const lifetime = purchases.find(p => p.productId === LIFETIME_ID);
    const sub = purchases.find(p => p.productId === SUB_ID);
    if (lifetime || sub) {
      await setEntitlement({premium: true, kind: lifetime ? 'lifetime' : 'subscription', since: Date.now()});
    } else {
      await setEntitlement({premium: false});
    }
  } catch {
    /* Offline restore keeps the cached entitlement. */
  }
  return current;
};

export const manageSubscriptionUrl = `https://play.google.com/store/account/subscriptions?sku=${SUB_ID}&package=com.mps.fileconverter`;
