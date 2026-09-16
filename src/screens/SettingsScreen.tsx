import React from 'react';
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {AdBanner} from '@/components/AdBanner';
import {showPrivacyOptions} from '@/services/ads';
import {useApp} from '@/hooks/AppState';
import {FREE_CONVERSIONS} from '@/services/quota';
import {palette, radius, shadow, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// Published from the repo docs/ folder by GitHub Pages. The .html extension is
// what Jekyll produces from the markdown; without it these 404, and Play rejects
// a listing whose privacy policy link does not resolve.
export const PRIVACY_URL =
  'https://mps0103.github.io/File-Converter-Zip-Extract/privacy-policy.html';
export const TERMS_URL =
  'https://mps0103.github.io/File-Converter-Zip-Extract/terms-of-use.html';
export const SUPPORT_EMAIL = 'info@dealtrix.com';

export const SettingsScreen = ({navigation}: Props) => {
  const {premium, used, refreshEntitlement, testEntitlement, setTestPremium, resetFreeQuota} =
    useApp();

  const rows: Array<{label: string; hint?: string; onPress: () => void}> = [
    {
      label: premium ? 'Premium is active' : 'Go premium',
      hint: premium
        ? 'Unlimited conversions, no ads'
        : `${Math.max(0, FREE_CONVERSIONS - used)} free conversions left`,
      onPress: () => navigation.navigate('Premium'),
    },
    {
      label: 'Restore a purchase',
      hint: 'Use this after reinstalling or changing phone',
      onPress: refreshEntitlement,
    },
    {
      label: 'Ad privacy choices',
      hint: 'Change how ads are personalised',
      onPress: showPrivacyOptions,
    },
    {label: 'Privacy policy', onPress: () => Linking.openURL(PRIVACY_URL)},
    {label: 'Terms of use', onPress: () => Linking.openURL(TERMS_URL)},
    {
      label: 'Contact support',
      hint: SUPPORT_EMAIL,
      onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=File%20Converter%20%26%20Zip%20Extract`),
    },
  ];

  return (
    <Screen title="Settings" footer={<AdBanner />}>
      <View style={styles.offline}>
        <Text style={styles.offlineTitle}>Your files stay on this phone</Text>
        <Text style={styles.offlineText}>
          Converting never uploads anything. The app only uses the internet to show ads and to check
          your purchase with Google Play.
        </Text>
      </View>

      <View style={styles.list}>
        {rows.map(row => (
          <Pressable key={row.label} onPress={row.onPress} style={[styles.row, shadow(1)]}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{row.label}</Text>
              {row.hint ? <Text style={styles.hint}>{row.hint}</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>

      {/*
        __DEV__ is referenced directly rather than through a helper: Metro substitutes
        it with a literal false in a release bundle, so the whole block below is folded
        away at minify time. Behind a function call it would survive as dead weight.
      */}
      {__DEV__ ? (
        <View style={styles.debug}>
          <Text style={styles.debugTitle}>Testing · debug build only</Text>
          <Text style={styles.debugText}>
            Play billing never completes in a local build, so this is the only way to reach the
            premium paths. Never present in a release APK.
          </Text>

          <Pressable
            onPress={() => setTestPremium(premium ? 'free' : 'premium')}
            style={[styles.row, styles.debugRow, shadow(1)]}>
            <View style={styles.rowText}>
              <Text style={styles.label}>
                {premium ? 'Testing as Premium' : 'Testing as Free'}
              </Text>
              <Text style={styles.hint}>
                Tap to switch. Unlimited conversions and no ads while premium is on.
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={resetFreeQuota} style={[styles.row, styles.debugRow, shadow(1)]}>
            <View style={styles.rowText}>
              <Text style={styles.label}>Reset free conversion count</Text>
              <Text style={styles.hint}>
                {`${used} of ${FREE_CONVERSIONS} used — clears the tally so the free tier can be tested again`}
              </Text>
            </View>
          </Pressable>

          {testEntitlement ? (
            <Pressable
              onPress={() => setTestPremium(null)}
              style={[styles.row, styles.debugRow, shadow(1)]}>
              <View style={styles.rowText}>
                <Text style={styles.label}>Use the real Play entitlement</Text>
                <Text style={styles.hint}>Drops the override and goes back to what billing reports</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.version}>File Converter & Zip Extract · version 1.0.1</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  offline: {
    backgroundColor: '#EAF7EE',
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.lg,
  },
  offlineTitle: {...type.section, color: '#0B7A38'},
  offlineText: {...type.caption, color: '#2B6B45', marginTop: 4, lineHeight: 18},
  list: {gap: space.sm},
  row: {backgroundColor: palette.surface, borderRadius: radius.card, padding: space.lg},
  rowText: {gap: 2},
  label: {...type.section, color: palette.ink},
  hint: {...type.caption, color: palette.inkFaint},
  version: {...type.caption, color: palette.inkFaint, textAlign: 'center', marginTop: space.xxl},
  // Deliberately loud: this block must never be mistaken for shipping UI.
  debug: {
    marginTop: space.xxl,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D9A441',
    backgroundColor: '#FFF9EE',
    gap: space.sm,
  },
  debugTitle: {...type.section, color: '#8A5A00'},
  debugText: {...type.caption, color: '#8A5A00', lineHeight: 18, marginBottom: space.xs},
  debugRow: {backgroundColor: palette.surface},
});
