import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {AdBanner} from '@/components/AdBanner';
import {FileGlyph} from '@/components/FileGlyph';
import {buildPreview, previewKindFor, type Preview} from '@/convert/preview';
import {toolById} from '@/convert/catalog';
import {convert} from '@/convert/engine';
import {maybeShowInterstitial} from '@/services/ads';
import {useApp} from '@/hooks/AppState';
import {ProgressRing, RING_SETTLE_MS} from '@/components/ProgressRing';
import {AppDialog} from '@/components/AppDialog';
import {QuotaGate} from '@/components/QuotaGate';
import {FileBridge, isCancelled, isPasswordError, type PickedFile} from '@/native/FileBridge';
import {palette, radius, shadow, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Viewer'>;

const formatSize = (bytes: number) => {
  if (bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** One page of a PDF, drawn natively and only once it is needed. */
const PdfPage = ({
  uri,
  index,
  width,
  password,
}: {
  uri: string;
  index: number;
  width: number;
  password: string;
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    FileBridge.renderPdfPage(uri, index, Math.round(width * 2), password)
      .then(page => {
        if (!alive) return;
        setSrc(`data:image/png;base64,${page.base64}`);
        setRatio(page.height / page.width);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [uri, index, width, password]);

  if (failed) {
    return (
      <View style={[styles.pageFallback, {width, height: width * 1.414}]}>
        <Text style={styles.muted}>Page {index + 1} could not be drawn.</Text>
      </View>
    );
  }
  if (!src) {
    return (
      <View style={[styles.pageFallback, {width, height: width * ratio}]}>
        <ActivityIndicator color={palette.inkFaint} />
      </View>
    );
  }
  return <Image source={{uri: src}} style={[styles.page, {width, height: width * ratio}]} resizeMode="contain" />;
};

/**
 * One page on its own, where it can be pinched about.
 *
 * A page in the list cannot do this: it sits inside the screen's vertical scroll,
 * and a pinch or a drag there is a fight between the two about whose gesture it
 * is. Opening the page on its own leaves nothing to argue with — which is also
 * why every PDF reader does it this way.
 *
 * The page is drawn again at three times the screen width rather than reusing the
 * thumbnail, because zooming into an image rendered for a phone screen only makes
 * the blur bigger.
 */
const PageZoom = ({
  uri,
  index,
  pageCount,
  password,
  onClose,
}: {
  uri: string;
  index: number;
  pageCount: number;
  password: string;
  onClose: () => void;
}) => {
  const {width, height} = useWindowDimensions();
  const [src, setSrc] = useState<string | null>(null);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    let alive = true;
    FileBridge.renderPdfPage(uri, index, Math.round(width * 3), password)
      .then(page => {
        if (!alive) return;
        setSrc(`data:image/png;base64,${page.base64}`);
        setRatio(page.height / page.width);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uri, index, width, password]);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const shown = {width, height: Math.min(height, width * ratio)};

  // Keeps the page from being flung off screen: it may be dragged by however much
  // of it is hanging outside the window at the current zoom, and no further.
  const clamp = (value: number, limit: number) => {
    'worklet';
    return Math.min(limit, Math.max(-limit, value));
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.min(6, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) reset();
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate(e => {
      if (scale.value <= 1) return;
      const maxX = ((scale.value - 1) * shown.width) / 2;
      const maxY = ((scale.value - 1) * shown.height) / 2;
      x.value = clamp(savedX.value + e.translationX, maxX);
      y.value = clamp(savedY.value + e.translationY, maxY);
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.01) {
        reset();
      } else {
        scale.value = withTiming(3);
        savedScale.value = 3;
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [{translateX: x.value}, {translateY: y.value}, {scale: scale.value}],
  }));

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      {/*
        A Modal is a separate native window, and the GestureHandlerRootView wrapping
        the app does not reach inside it — which is why the page appeared but would
        not pinch. The modal needs a root of its own.
      */}
      <GestureHandlerRootView style={styles.zoomRoot}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.zoomStage, style]}>
            {src ? (
              <Image source={{uri: src}} style={shown} resizeMode="contain" />
            ) : (
              <ActivityIndicator color="#FFFFFF" />
            )}
          </Animated.View>
        </GestureDetector>

        <View style={styles.zoomBar}>
          <Text style={styles.zoomLabel}>
            Page {index + 1} of {pageCount}
          </Text>
          <Pressable onPress={onClose} hitSlop={14}>
            <Text style={styles.zoomClose}>Done</Text>
          </Pressable>
        </View>
        <Text style={styles.zoomHint}>Pinch to zoom · double tap to fit</Text>
      </GestureHandlerRootView>
    </Modal>
  );
};

export const ViewerScreen = ({route, navigation}: Props) => {
  const {width} = useWindowDimensions();
  const [file, setFile] = useState<PickedFile | null>(route.params?.file ?? null);
  const [preview, setPreview] = useState<Preview | null>(null);
  // Which sheet of a workbook is on screen. Reset whenever a new file is opened,
  // or sheet three of the last file would be asked for in a file with one.
  const [sheet, setSheet] = useState(0);
  // The page opened on its own to be zoomed, or null when the list is on screen.
  const [zoomPage, setZoomPage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const {premium, remaining, recordConversion, recordView} = useApp();
  const [extracting, setExtracting] = useState(false);
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState('');
  const [gate, setGate] = useState(false);

  const load = useCallback(async (target: PickedFile, pass = '') => {
    setBusy(true);
    setError(null);
    setSheet(0);
    try {
      setPreview(await buildPreview(target, pass));
      setNeedsPassword(false);
      // Only once it has really opened — a file that failed to load is not something
      // anyone wants offered back to them in Recent files.
      recordView(target);
      // Counts towards the same every-third-action pacing the converters use, so
      // three files opened brings one full-screen ad, never one per file.
      maybeShowInterstitial(premium);
    } catch (e) {
      if (isPasswordError(e)) {
        setNeedsPassword(true);
      } else {
        setError((e as Error).message || 'This file could not be opened.');
      }
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }, [recordView, premium]);

  useEffect(() => {
    const incoming = route.params?.file;
    if (incoming) {
      setFile(incoming);
      load(incoming);
    }
  }, [route.params?.file, load]);

  const pick = useCallback(async () => {
    try {
      // See VIEWABLE_MIMES: filtering here hides files the viewer can actually read.
      const picked = await FileBridge.pickFile(['*/*']);
      if (previewKindFor(picked) === 'unsupported') {
        setFile(picked);
        setPreview({kind: 'unsupported'});
        return;
      }
      setFile(picked);
      setPassword('');
      load(picked);
    } catch (e) {
      if (!isCancelled(e)) setError((e as Error).message);
    }
  }, [load]);

  /**
   * Extracting straight from the viewer, rather than sending the user back to the
   * tool screen to pick the same archive a second time. The quota check, the
   * counting and the result screen are the converter's, so an extraction started
   * here is the same event as one started there.
   */
  const extractNow = useCallback(async () => {
    if (!file) return;
    if (!premium && remaining <= 0) {
      setGate(true);
      return;
    }
    setExtracting(true);
    setPercent(0);
    setStage('Getting ready');
    try {
      const tool = toolById('extract-archive');
      const result = await convert(tool, [file], {password}, (pc, label) => {
        setPercent(pc);
        setStage(label);
      });
      await recordConversion(tool.id, result.files);
      // Same reason as the converter: the ring is given time to close the circle.
      await new Promise(resolve => setTimeout(resolve, RING_SETTLE_MS + 90));
      setExtracting(false);
      navigation.navigate('Result', {
        toolId: tool.id,
        files: result.files,
        warning: result.warning,
      });
      maybeShowInterstitial(premium);
    } catch (e) {
      setExtracting(false);
      if (isPasswordError(e)) {
        setNeedsPassword(true);
        return;
      }
      setError((e as Error).message || 'That archive could not be opened.');
    }
  }, [file, navigation, password, premium, recordConversion, remaining]);

  const pageWidth = width - space.xl * 2;

  const body = () => {
    if (busy) {
      return (
        <View style={styles.centre}>
          <ActivityIndicator color={palette.ink} />
          <Text style={styles.muted}>Opening…</Text>
        </View>
      );
    }

    if (needsPassword) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {file && previewKindFor(file) === 'archive'
              ? 'This archive needs a password'
              : 'This file needs a password'}
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={palette.inkFaint}
            secureTextEntry
            style={styles.input}
          />
          <Pressable
            onPress={() => file && load(file, password)}
            style={({pressed}) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Open it</Text>
          </Pressable>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>That did not work</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      );
    }

    if (!file || !preview) {
      return (
        <Pressable accessibilityRole="button" onPress={pick} style={styles.dropzone}>
          <Text style={styles.dropTitle}>Choose a file</Text>
          <Text style={styles.dropHint}>PDF, Word, Excel, CSV, slides, text and archives.</Text>
        </Pressable>
      );
    }

    if (preview.kind === 'unsupported') {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Not a format the viewer opens</Text>
          <Text style={styles.muted}>
            {file.name} is not one of the formats this app can read. Pick a PDF, Word, Excel, CSV,
            slide deck, text file or archive.
          </Text>
        </View>
      );
    }

    if (preview.kind === 'pdf') {
      return (
        <View style={styles.pages}>
          <Text style={styles.zoomTip}>Tap a page to zoom in</Text>
          {Array.from({length: preview.pageCount}, (_, i) => (
            <Pressable key={i} onPress={() => setZoomPage(i)}>
              <Text style={styles.pageLabel}>
                Page {i + 1} of {preview.pageCount}
              </Text>
              <PdfPage uri={file.uri} index={i} width={pageWidth} password={password} />
            </Pressable>
          ))}
          {zoomPage !== null ? (
            <PageZoom
              uri={file.uri}
              index={zoomPage}
              pageCount={preview.pageCount}
              password={password}
              onClose={() => setZoomPage(null)}
            />
          ) : null}
        </View>
      );
    }

    if (preview.kind === 'archive') {
      if (extracting) {
        return (
          <View style={styles.centre}>
            <ProgressRing percent={percent} ink="archive" />
            <Text style={styles.muted}>{stage}</Text>
          </View>
        );
      }
      return (
        <View style={styles.list}>
          <Text style={styles.muted}>
            {preview.entries.length} {preview.entries.length === 1 ? 'file' : 'files'} inside, still
            packed. Extracting saves them into Downloads.
          </Text>
          <Pressable
            onPress={extractNow}
            style={({pressed}) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Extract all files</Text>
          </Pressable>
          {preview.entries.map(entry => (
            <View key={entry.name} style={[styles.entry, shadow(1)]}>
              <FileGlyph ink="archive" label={(entry.name.match(/\.([^.]+)$/)?.[1] ?? '?').toUpperCase()} size={30} />
              <View style={styles.entryText}>
                <Text style={styles.entryName} numberOfLines={2}>
                  {entry.name}
                </Text>
                {entry.size >= 0 ? <Text style={styles.muted}>{formatSize(entry.size)}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (preview.kind === 'sheet') {
      const active = preview.sheets[Math.min(sheet, preview.sheets.length - 1)];
      return (
        <View style={[styles.webWrap, styles.webFill]}>
          <WebView
            key={active.name}
            originWhitelist={['*']}
            source={{html: active.html}}
            style={styles.web}
            javaScriptEnabled={false}
            // Pinch to zoom, so a wide sheet can be pulled back far enough to read.
            setBuiltInZoomControls
            setDisplayZoomControls={false}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={req => req.url === 'about:blank' || req.url.startsWith('data:')}
          />
          {preview.sheets.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabs}
              contentContainerStyle={styles.tabsRow}>
              {preview.sheets.map((sh, i) => (
                <Pressable
                  key={sh.name}
                  onPress={() => setSheet(i)}
                  style={[styles.tab, i === sheet && styles.tabOn]}>
                  <Text style={[styles.tabText, i === sheet && styles.tabTextOn]} numberOfLines={1}>
                    {sh.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      );
    }

    // html
    return (
      <View style={[styles.webWrap, styles.webFill]}>
        <WebView
          originWhitelist={['*']}
          source={{html: preview.html}}
          style={styles.web}
          // No script at all. A .html file arriving from a chat is rendered inert.
          javaScriptEnabled={false}
          setSupportMultipleWindows={false}
          // Nothing in a preview should be able to reach the network or leave the page.
          onShouldStartLoadWithRequest={req => req.url === 'about:blank' || req.url.startsWith('data:')}
        />
      </View>
    );
  };

  const note = preview && preview.kind === 'html' ? preview.note : undefined;

  return (
    <Screen
      title="View a file"
      subtitle={file ? file.name : 'Read it without converting it'}
      scroll={preview?.kind !== 'html' && preview?.kind !== 'sheet'}
      footer={<AdBanner />}>
      {file ? (
        <Pressable onPress={pick} style={styles.swap}>
          <Text style={styles.swapText}>Choose a different file</Text>
        </Pressable>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {body()}
      <QuotaGate
        visible={gate}
        onClose={() => setGate(false)}
        onSeePlans={() => navigation.navigate('Premium')}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  centre: {alignItems: 'center', gap: space.md, paddingVertical: space.xxl},
  muted: {...type.caption, color: palette.inkFaint},
  note: {...type.caption, color: palette.inkSoft, marginBottom: space.md},
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.hairline,
    borderRadius: radius.card,
    paddingVertical: space.xxl,
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surface,
  },
  dropTitle: {...type.title, color: palette.ink},
  dropHint: {...type.caption, color: palette.inkFaint, textAlign: 'center', paddingHorizontal: space.lg},
  swap: {alignSelf: 'center', paddingVertical: space.sm, marginBottom: space.sm},
  swapText: {...type.caption, color: palette.inkSoft, fontWeight: '600'},
  card: {backgroundColor: palette.surface, borderRadius: radius.card, padding: space.lg, gap: space.sm},
  cardTitle: {...type.section, color: palette.ink},
  input: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.chip,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: palette.ink,
  },
  action: {backgroundColor: palette.ink, borderRadius: radius.pill, paddingVertical: space.md, alignItems: 'center'},
  actionText: {...type.section, color: '#FFFFFF'},
  pressed: {opacity: 0.85},
  pages: {gap: space.lg},
  page: {borderRadius: radius.chip, backgroundColor: '#FFFFFF'},
  zoomTip: {...type.caption, color: palette.inkFaint, textAlign: 'center', marginBottom: space.sm},
  zoomRoot: {flex: 1, backgroundColor: '#101018', alignItems: 'center', justifyContent: 'center'},
  zoomStage: {alignItems: 'center', justifyContent: 'center'},
  zoomBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    paddingBottom: space.md,
  },
  zoomLabel: {...type.caption, color: 'rgba(255,255,255,0.75)'},
  zoomClose: {...type.section, color: '#FFFFFF'},
  zoomHint: {
    position: 'absolute',
    bottom: space.xxl,
    ...type.caption,
    color: 'rgba(255,255,255,0.5)',
  },
  pageFallback: {
    borderRadius: radius.chip,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLabel: {...type.caption, color: palette.inkFaint, marginBottom: 6},
  list: {gap: space.sm},
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.md,
  },
  entryText: {flex: 1, gap: 2},
  entryName: {...type.body, color: palette.ink},
  webWrap: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  web: {flex: 1, backgroundColor: '#FFFFFF'},
  // Fills whatever is left between the header and the ad banner. A fixed height
  // here ran past the bottom of the screen, and the sheet tabs went under the
  // banner with it.
  webFill: {flex: 1},
  // The sheet tabs are drawn here rather than inside the page so they keep their
  // size when the sheet is pinched, and stay put when it is scrolled.
  // An explicit height and no shrinking: the WebView beside it is flex:1, and a
  // ScrollView left to size itself was squeezed down to a few pixels.
  tabs: {
    height: 47,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#F2F2F2',
    borderTopWidth: 1,
    borderTopColor: '#C8C8C8',
  },
  tabsRow: {alignItems: 'stretch'},
  tab: {
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#E4E4E4',
    borderRightWidth: 1,
    borderRightColor: '#D4D4D4',
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  tabOn: {backgroundColor: '#FFFFFF', borderTopColor: '#107C41'},
  tabText: {fontSize: 15, color: '#444444', maxWidth: 200},
  tabTextOn: {color: '#107C41', fontWeight: '700'},
});
