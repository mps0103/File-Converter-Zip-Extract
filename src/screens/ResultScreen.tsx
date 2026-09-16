import React, {useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {AdBanner} from '@/components/AdBanner';
import {FileGlyph} from '@/components/FileGlyph';
import {GradientButton} from '@/components/GradientButton';
import {toolById} from '@/convert/catalog';
import {FileBridge} from '@/native/FileBridge';
import {inkGradient, palette, radius, shadow, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export const ResultScreen = ({route, navigation}: Props) => {
  const {files, warning} = route.params;
  const tool = toolById(route.params.toolId);
  const first = files[0];

  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withDelay(
      80,
      withSequence(withSpring(1.1, {damping: 8, stiffness: 200}), withSpring(1, {damping: 14})),
    );
  }, [pop]);
  const badge = useAnimatedStyle(() => ({
    opacity: pop.value > 0 ? 1 : 0,
    transform: [{scale: pop.value}],
  }));

  return (
    <Screen footer={<AdBanner />}>
      <View style={styles.hero}>
        <Animated.View style={[styles.check, badge]}>
          <Svg width={38} height={38} viewBox="0 0 24 24">
            <Path
              d="m5 12.8 4.4 4.4L19 7.6"
              stroke="#FFFFFF"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
        <Text style={styles.title}>
          {files.length > 1 ? `${files.length} files saved` : 'Saved to Downloads'}
        </Text>
        <Text style={styles.subtitle}>{first.path}</Text>
      </View>

      {warning ? (
        <Animated.View entering={FadeInDown.springify()} style={styles.warning}>
          <Text style={styles.warningText}>{warning}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.list}>
        {files.map((f, i) => (
          <Animated.View
            key={f.uri}
            entering={FadeInDown.delay(i * 50).springify().damping(18)}
            style={[styles.row, shadow(1)]}>
            <FileGlyph ink={tool.ink} label={tool.to.split(' ')[0]} size={32} />
            <Text style={styles.name} numberOfLines={1}>
              {f.name}
            </Text>
            <Pressable onPress={() => FileBridge.shareFile(f.uri, f.mime)} hitSlop={10}>
              <Text style={styles.share}>Share</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <GradientButton
        label="Open file"
        colors={inkGradient[tool.ink]}
        onPress={() => FileBridge.openFile(first.uri, first.mime)}
        style={styles.cta}
      />
      <GradientButton
        label="Convert another"
        subtle
        colors={inkGradient[tool.ink]}
        onPress={() => navigation.popTo('Home')}
        style={styles.secondary}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {alignItems: 'center', paddingTop: space.xxl, paddingBottom: space.xl},
  check: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  title: {...type.display, color: palette.ink, textAlign: 'center'},
  subtitle: {...type.caption, color: palette.inkSoft, marginTop: 6, textAlign: 'center'},
  warning: {
    backgroundColor: '#FFF6E5',
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.lg,
  },
  warningText: {...type.caption, color: '#8A5A00', lineHeight: 18},
  list: {gap: space.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.md,
  },
  name: {...type.section, color: palette.ink, flex: 1},
  share: {...type.caption, color: palette.word},
  cta: {marginTop: space.xl},
  secondary: {marginTop: space.sm},
});
