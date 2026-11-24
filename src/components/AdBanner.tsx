import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import {AD_UNITS} from '@/services/ads';
import {useApp} from '@/hooks/AppState';
import {makeStyles} from '@/theme';

/**
 * Anchored to the bottom of a screen, never over content the user is reading.
 *
 * Takes no room until an ad has arrived, so a screen with nothing to show does not
 * end in an empty strip.
 */
export const AdBanner = () => {
  const styles = useStyles();
  const {premium} = useApp();
  const [loaded, setLoaded] = useState(false);
  if (premium) return null;

  return (
    <View style={loaded ? styles.wrap : styles.hidden}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{requestNonPersonalizedAdsOnly: false}}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={error => {
          setLoaded(false);
          // Shown in logcat as ReactNativeJS; code 3 is "no fill", 1 an invalid request.
          console.log('[ads] anchored banner failed:', (error as Error & {code?: string})?.code, error?.message);
        }}
      />
    </View>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: palette.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    paddingVertical: 2,
  },
  hidden: {height: 0, overflow: 'hidden', opacity: 0},
}));
