import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {AdBanner} from '@/components/AdBanner';
import {AppDialog} from '@/components/AppDialog';
import {GradientButton} from '@/components/GradientButton';
import {buy, loadPlans, manageSubscriptionUrl, type Plan} from '@/services/billing';
import {useApp} from '@/hooks/AppState';
import {palette, premiumGradient, radius, shadow, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;

const BENEFITS = [
  'Unlimited conversions, every format',
  'No banner or full-screen ads',
  'Batch convert as many files as you like',
  'Highest quality page rendering',
];

export const PremiumScreen = ({navigation}: Props) => {
  const {premium, refreshEntitlement} = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const list = await loadPlans();
      setPlans(list);
      setSelected(list.find(p => p.kind === 'subscription')?.id ?? list[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const purchase = async () => {
    const plan = plans.find(p => p.id === selected);
    if (!plan) return;
    try {
      await buy(plan);
      await refreshEntitlement();
    } catch (e) {
      const code = (e as {code?: string}).code;
      if (code !== 'E_USER_CANCELLED') {
        setMessage('The purchase did not go through. Nothing was charged.');
      }
    }
  };

  if (premium) {
    return (
      <Screen title="Premium is on" subtitle="Unlimited conversions, no ads.">
        <View style={[styles.card, shadow(1)]}>
          {BENEFITS.map(b => (
            <Text key={b} style={styles.benefit}>
              {b}
            </Text>
          ))}
        </View>
        <GradientButton
          label="Manage subscription"
          subtle
          colors={premiumGradient}
          onPress={() => Linking.openURL(manageSubscriptionUrl)}
          style={styles.cta}
        />
        <GradientButton
          label="Back to converting"
          colors={premiumGradient}
          onPress={() => navigation.goBack()}
          style={styles.secondary}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Go premium" subtitle="Two ways to unlock everything." footer={<AdBanner />}>
      <View style={[styles.card, shadow(1)]}>
        {BENEFITS.map((b, i) => (
          <Animated.Text
            key={b}
            entering={FadeInDown.delay(i * 60).springify().damping(18)}
            style={styles.benefit}>
            {b}
          </Animated.Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={palette.inkSoft} />
      ) : plans.length === 0 ? (
        <Text style={styles.empty}>
          Plans could not be loaded. Check your connection and open this screen again.
        </Text>
      ) : (
        <View style={styles.plans}>
          {plans.map(plan => {
            const active = selected === plan.id;
            return (
              <Pressable
                key={plan.id}
                accessibilityRole="radio"
                accessibilityState={{selected: active}}
                onPress={() => setSelected(plan.id)}
                style={[styles.plan, active && styles.planActive, shadow(1)]}>
                <View style={styles.planText}>
                  <Text style={styles.planTitle}>
                    {plan.kind === 'subscription' ? 'Monthly' : 'One time'}
                  </Text>
                  <Text style={styles.planMeta}>
                    {plan.kind === 'subscription'
                      ? 'Renews every month. Cancel any time in Play Store.'
                      : 'Pay once. Yours on this Google account forever.'}
                  </Text>
                </View>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <GradientButton
        label="Continue"
        colors={premiumGradient}
        onPress={purchase}
        disabled={!selected}
        style={styles.cta}
      />
      <Pressable onPress={refreshEntitlement} style={styles.restore}>
        <Text style={styles.restoreText}>Restore a previous purchase</Text>
      </Pressable>
      <Text style={styles.legal}>
        Payment is taken by Google Play. A subscription renews until you cancel it in the Play Store.
      </Text>

      <AppDialog
        visible={!!message}
        title="Purchase not completed"
        message={message ?? ''}
        actions={[{label: 'Close', subtle: true, onPress: () => setMessage(null)}]}
        onDismiss={() => setMessage(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {backgroundColor: palette.surface, borderRadius: radius.card, padding: space.lg, gap: space.sm},
  benefit: {...type.body, color: palette.ink},
  loader: {marginTop: space.xl},
  empty: {...type.caption, color: palette.inkSoft, marginTop: space.xl, textAlign: 'center'},
  plans: {marginTop: space.xl, gap: space.md},
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planActive: {borderColor: palette.gold},
  planText: {flex: 1},
  planTitle: {...type.section, fontSize: 17, color: palette.ink},
  planMeta: {...type.caption, color: palette.inkFaint, marginTop: 2},
  planPrice: {...type.title, color: palette.ink},
  cta: {marginTop: space.xl},
  secondary: {marginTop: space.sm},
  restore: {paddingVertical: space.lg, alignItems: 'center'},
  restoreText: {...type.caption, color: palette.inkSoft},
  legal: {...type.caption, color: palette.inkFaint, textAlign: 'center', lineHeight: 17},
});
