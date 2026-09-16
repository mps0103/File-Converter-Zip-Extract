import React, {useEffect, useState} from 'react';
import {AppDialog} from './AppDialog';
import {FileGlyph} from './FileGlyph';
import {isRewardedReady, showRewarded} from '@/services/ads';
import {FREE_CONVERSIONS} from '@/services/quota';
import {useApp} from '@/hooks/AppState';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSeePlans: () => void;
};

/**
 * What the user meets when the free allowance runs out.
 *
 * Two ways forward, in the order they cost the user: watch an ad for one more
 * conversion, or take a plan — monthly and lifetime both live on the plans screen.
 *
 * The ad button appears only once an ad is actually loaded, because offering one
 * that then fails to appear is worse than not offering it. Readiness is polled
 * while the dialog is open rather than read once: the gate opens the moment the
 * allowance runs out, which is often before the ad has finished loading, and a
 * plain call during render would leave the button hidden for the whole session.
 */
export const QuotaGate = ({visible, onClose, onSeePlans}: Props) => {
  const {credits, earnCredit} = useApp();
  const [watching, setWatching] = useState(false);

  const watch = async () => {
    setWatching(true);
    try {
      const earned = await showRewarded();
      if (earned) {
        await earnCredit();
        onClose();
      }
    } finally {
      setWatching(false);
    }
  };

  const [adReady, setAdReady] = useState(isRewardedReady);

  useEffect(() => {
    if (!visible || adReady) return;
    const timer = setInterval(() => {
      if (isRewardedReady()) setAdReady(true);
    }, 400);
    return () => clearInterval(timer);
  }, [visible, adReady]);

  // Re-checked on every open: an ad is consumed by showing it, so one that was
  // ready last time may not be this time.
  useEffect(() => {
    if (visible) setAdReady(isRewardedReady());
  }, [visible]);

  const canWatch = adReady && !watching;

  const actions = [
    ...(canWatch || watching
      ? [
          {
            label: watching ? 'Loading the ad…' : 'Watch an ad — 1 conversion',
            colors: ['#3ED17F', '#0B7A38'] as [string, string],
            onPress: watching ? () => {} : watch,
          },
        ]
      : []),
    {
      label: 'See premium plans',
      colors: ['#FFC24B', '#FF6B6B'] as [string, string],
      onPress: () => {
        onClose();
        onSeePlans();
      },
    },
    {label: 'Not now', subtle: true, onPress: onClose},
  ];

  return (
    <AppDialog
      visible={visible}
      title={`Your ${FREE_CONVERSIONS} free conversions are used up`}
      message={
        credits > 0
          ? `You have ${credits} earned ${credits === 1 ? 'conversion' : 'conversions'} left. Premium removes the limit and every ad; monthly and lifetime are both on the plans screen.`
          : 'Watch a short ad for one more conversion, or go premium for unlimited conversions and no ads — monthly and lifetime are both on the plans screen. Viewing files stays free either way.'
      }
      icon={<FileGlyph ink="archive" label="PRO" size={46} />}
      actions={actions}
      onDismiss={onClose}
    />
  );
};
