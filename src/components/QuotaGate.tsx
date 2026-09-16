import React, {useState} from 'react';
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
 * Three ways forward, in the order they cost the user: watch an ad for one more
 * conversion, or take a plan. The ad button is only offered when an ad is
 * actually loaded — dangling an offer that then fails to appear is worse than
 * not making it.
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

  const canWatch = isRewardedReady() && !watching;

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
