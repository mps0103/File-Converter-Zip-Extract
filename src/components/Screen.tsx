import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, space, type, useTheme} from '@/theme';

/**
 * The widest the content is ever laid out, whatever the screen.
 *
 * Set above what a phone on its side measures — this one is 848dp in landscape —
 * so a turned phone uses the whole width it has. A cap of 720 looked like a
 * mistake there: eighty-odd dp of empty margin down each side of a screen that was
 * short of room already.
 *
 * It bites on a tablet or an opened foldable, which are wider still, and where a
 * line of text run edge to edge is genuinely hard to read.
 */
const CONTENT_MAX_WIDTH = 900;

type Props = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  /**
   * Scroll position, for a screen that needs to know which of its children are in
   * front of the user. The viewer uses it to hold rendered PDF pages only near the
   * screen; everything else can ignore it.
   */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  children: React.ReactNode;
};

export const Screen = ({
  title,
  subtitle,
  right,
  scroll = true,
  footer,
  onScroll,
  children,
}: Props) => {
  const styles = useStyles();
  const {dark} = useTheme();
  const Body: any = scroll ? ScrollView : View;
  const insets = useSafeAreaInsets();
  // The bottom edge is left off SafeAreaView so a footer can paint its own background
  // all the way down; the navigation bar inset is applied inside it instead. With no
  // footer the body carries the inset so content still clears the buttons.
  const bodyInset = footer ? 0 : insets.bottom;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/*
        The bars are transparent, set natively, so only the icons are decided here —
        and they have to be the opposite of whatever the screen is painting behind
        them or they vanish into it.
      */}
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
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
        onScroll={scroll ? onScroll : undefined}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator={false}>
        {children}
      </Body>
      {footer ? <View style={{paddingBottom: insets.bottom}}>{footer}</View> : null}
    </SafeAreaView>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
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
}));
