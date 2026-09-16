import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import {AD_UNITS} from '@/services/ads';
import {useApp} from '@/hooks/AppState';
import {palette} from '@/theme';

/** Anchored to the bottom of a screen, never over content the user is reading. */
export const AdBanner = () => {
  const {premium} = useApp();
  if (premium) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{requestNonPersonalizedAdsOnly: false}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: palette.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    paddingVertical: 2,
  },
});
