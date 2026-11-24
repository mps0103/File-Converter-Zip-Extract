import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {
  getCachedEntitlement,
  initBilling,
  onEntitlementChange,
  restorePurchases,
  type Entitlement,
} from '@/services/billing';
import {initAds} from '@/services/ads';
import {FREE_CONVERSIONS, countConversion, getUsed, resetQuota} from '@/services/quota';
import {addCredit, getCredits} from '@/services/credits';
import {
  addHistory,
  addViewed,
  getHistory,
  clearHistory,
  removeHistory,
  type HistoryItem,
} from '@/services/history';
import {
  getTestEntitlement,
  setTestEntitlement,
  type TestEntitlement,
} from '@/services/testMode';
import type {SavedFile} from '@/native/FileBridge';
import type {ToolId} from '@/convert/catalog';

/**
 * How far the start-up work has really got: whole steps finished out of the steps
 * there are, and the one being worked on. Nothing here is timed — a step is done
 * when the thing it names has finished, or has been given up on after a cap.
 */
export type Startup = {done: number; total: number; label: string};

/**
 * The longest a start-up step may hold the app. Billing and ads both talk to Google
 * and a phone with no signal, or an ad consent form waiting for an answer, would
 * otherwise hold the whole app on this screen. The cap only decides when to stop
 * waiting; it is not progress, and the step still counts as done when it passes.
 */
const BILLING_WAIT_MS = 4000;
const ADS_WAIT_MS = 5000;

/** Most rows one conversion adds to Recent files. */
const MAX_HISTORY_PER_RUN = 5;

const settleWithin = (work: Promise<unknown>, ms: number) =>
  Promise.race([work.catch(() => undefined), new Promise(resolve => setTimeout(resolve, ms))]);

type Ctx = {
  ready: boolean;
  startup: Startup;
  entitlement: Entitlement;
  premium: boolean;
  used: number;
  remaining: number;
  history: HistoryItem[];
  recordConversion: (toolId: ToolId, files: SavedFile[]) => Promise<void>;
  refreshEntitlement: () => Promise<void>;
  wipeHistory: () => Promise<void>;
  /** Removes one row from Recent files. The file on disk is untouched. */
  forgetHistoryItem: (id: string) => Promise<void>;
  /** Conversions earned from rewarded ads, spent after the free allowance. */
  credits: number;
  earnCredit: () => Promise<void>;
  recordView: (file: {name: string; uri: string; mime: string}) => Promise<void>;
  /** Debug builds only; null means the real Play entitlement is in use. */
  testEntitlement: TestEntitlement | null;
  setTestPremium: (value: TestEntitlement | null) => Promise<void>;
  resetFreeQuota: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export const AppStateProvider = ({
  children,
  start = true,
}: {
  children: React.ReactNode;
  /** Held false while the splash is up, so start-up begins when the splash ends. */
  start?: boolean;
}) => {
  const [ready, setReady] = useState(false);
  const [startup, setStartup] = useState<Startup>({done: 0, total: 5, label: 'Getting started'});
  const [entitlement, setEntitlement] = useState<Entitlement>({premium: false});
  const [testEntitlement, setTestState] = useState<TestEntitlement | null>(null);
  const [used, setUsed] = useState(0);
  const [credits, setCredits] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const off = onEntitlementChange(setEntitlement);
    return off;
  }, []);

  useEffect(() => {
    if (!start) return;
    let alive = true;
    const total = 5;
    const report = (done: number, label: string) => alive && setStartup({done, total, label});

    (async () => {
      report(0, 'Checking your plan');
      const [cached, override] = await Promise.all([getCachedEntitlement(), getTestEntitlement()]);
      if (!alive) return;
      setEntitlement(cached);
      setTestState(override);

      report(1, 'Counting your conversions');
      const [usedCount, earned] = await Promise.all([getUsed(), getCredits()]);
      if (!alive) return;
      setUsed(usedCount);
      setCredits(earned);

      report(2, 'Loading recent files');
      const items = await getHistory();
      if (!alive) return;
      setHistory(items);

      report(3, 'Connecting to Google Play');
      await settleWithin(initBilling(), BILLING_WAIT_MS);
      if (!alive) return;

      // The override decides this too, so "testing as premium" starts a session
      // with no ad SDK running at all rather than one that merely hides them.
      report(4, 'Preparing ads');
      if (!(override ? override === 'premium' : cached.premium)) {
        await settleWithin(initAds(), ADS_WAIT_MS);
      }
      if (!alive) return;

      report(5, 'Ready');
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [start]);

  // A debug override shadows whatever billing reported, so every premium gate in
  // the app — banner, interstitial, quota, paywall — follows it from this one spot.
  const premium = testEntitlement ? testEntitlement === 'premium' : entitlement.premium;

  /**
   * Ads are started whenever the app is not premium, not only at launch. Premium
   * can fall away mid-session — a lapsed subscription, a refund, or the debug
   * toggle being switched back — and the startup call is long past by then, so
   * without this the session would run to its end with no ads at all.
   */
  useEffect(() => {
    if (ready && !premium) initAds();
  }, [ready, premium]);

  const recordConversion = useCallback(
    async (toolId: ToolId, files: SavedFile[]) => {
      await countConversion(premium);
      setUsed(await getUsed());
      setCredits(await getCredits());
      setHistory(
        await addHistory(
          // A tool can make hundreds of files (every page of a long PDF as a picture).
          // The list holds 40 rows, so one run must not be able to push out all the rest;
          // the files themselves are all in Downloads.
          files
            .slice(0, MAX_HISTORY_PER_RUN)
            .map(f => ({toolId, name: f.name, path: f.path, uri: f.uri, mime: f.mime})),
        ),
      );
    },
    [premium],
  );

  const refreshEntitlement = useCallback(async () => {
    setEntitlement(await restorePurchases());
  }, []);

  const wipeHistory = useCallback(async () => {
    setHistory(await clearHistory());
  }, []);

  const forgetHistoryItem = useCallback(async (id: string) => {
    setHistory(await removeHistory(id));
  }, []);

  const recordView = useCallback(
    async (file: {name: string; uri: string; mime: string}) => {
      setHistory(await addViewed({name: file.name, uri: file.uri, mime: file.mime, path: ''}));
    },
    [],
  );

  const setTestPremium = useCallback(async (value: TestEntitlement | null) => {
    await setTestEntitlement(value);
    setTestState(value);
  }, []);

  const resetFreeQuota = useCallback(async () => {
    await resetQuota();
    setUsed(await getUsed());
  }, []);

  const earnCredit = useCallback(async () => {
    setCredits(await addCredit());
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      startup,
      entitlement: testEntitlement ? {premium} : entitlement,
      premium,
      used,
      remaining: premium ? Infinity : Math.max(0, FREE_CONVERSIONS - used) + credits,
      history,
      recordConversion,
      refreshEntitlement,
      wipeHistory,
      forgetHistoryItem,
      recordView,
      credits,
      earnCredit,
      testEntitlement,
      setTestPremium,
      resetFreeQuota,
    }),
    [
      ready,
      startup,
      entitlement,
      testEntitlement,
      premium,
      used,
      history,
      recordConversion,
      refreshEntitlement,
      wipeHistory,
      forgetHistoryItem,
      recordView,
      credits,
      earnCredit,
      setTestPremium,
      resetFreeQuota,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp was called outside AppStateProvider.');
  return ctx;
};
