import React from 'react';
import {ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {palette, space, type} from '@/theme';

/**
 * The widest the content is ever laid out, whatever the screen.
 *
 * Phones never reach it. A tablet, a foldable opened out, or a phone on its side
 * would otherwise stretch a line of text or a row of cards the full width, which
 * is hard to read and looks like a phone app that has been pulled out of shape.
 * Past this width the content stays put and the space falls either side of it.
 */
const CONTENT_MAX_WIDTH = 720;

type Props = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export const Screen = ({title, subtitle, right, scroll = true, footer, children}: Props) => {
  const Body: any = scroll ? ScrollView : View;
  const insets = useSafeAreaInsets();
  // The bottom edge is left off SafeAreaView so a footer can paint its own background
  // all the way down; the navigation bar inset is applied inside it instead. With no
  // footer the body carries the inset so content still clears the buttons.
  const bodyInset = footer ? 0 : insets.bottom;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      <Body
        style={
          scroll
            ? styles.body
            : [styles.body, styles.centred, {paddingBottom: bodyInset}]
        }
        contentContainerStyle={
          scroll
            ? [styles.content, styles.centred, {paddingBottom: space.xxl + bodyInset}]
            : undefined
        }
        showsVerticalScrollIndicator={false}>
        {children}
      </Body>
      {footer ? <View style={{paddingBottom: insets.bottom}}>{footer}</View> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: palette.canvas},
  // Applied to the header and to the body, so the title stays above the content it
  // belongs to rather than drifting off to the left edge of a wide screen.
  centred: {width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center'},
  header: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  headerText: {flex: 1},
  title: {...type.display, color: palette.ink},
  subtitle: {...type.body, color: palette.inkSoft, marginTop: 2},
  body: {flex: 1},
  content: {paddingHorizontal: space.xl, paddingBottom: space.xxl},
});
