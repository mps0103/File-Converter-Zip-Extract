import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Pdf from 'react-native-pdf';

import {FileBridge, type PickedFile} from '@/native/FileBridge';
import {makeStyles, radius, space, type, useTheme} from '@/theme';

type Props = {
  file: PickedFile;
  /** Empty for a PDF that is not locked. */
  password: string;
  /** The PDF turned out to be locked, or the password given was wrong. */
  onLocked: () => void;
};

/**
 * The PDF reader: all pages in one scroll, pinch to zoom anywhere, a page counter that
 * jumps to a page, a swipe-page mode, and Share.
 *
 * It is built the way the reader in the PDF Tools by MPS app is built — the same
 * react-native-pdf view, which draws and zooms the pages natively, the same bar and
 * the same jump box — rather than as a list of page pictures with a zoom of our own,
 * which could not pinch smoothly inside a scrolling screen.
 *
 * Not carried over from that app: its Night mode, which relies on a blend mode that
 * only React Native's new architecture has, and this app does not use it.
 */
export const PdfReader = ({file, password, onLocked}: Props) => {
  const styles = useStyles();
  const {palette} = useTheme();
  const {width} = useWindowDimensions();

  // The viewer reads a file on disk. What the picker hands over is a borrowed address
  // that may stop working, so the PDF is copied into this app's own storage first, as
  // the PDF Tools app does with every file it opens.
  const [path, setPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  // Driving the viewer's `page` prop from onPageChanged makes it fight the reader's own
  // scrolling, so only an explicit jump sets this.
  const [targetPage, setTargetPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [horizontal, setHorizontal] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [jumpTo, setJumpTo] = useState('');

  useEffect(() => {
    let alive = true;
    setPath(null);
    setError(null);
    setPage(1);
    setTargetPage(1);
    setPageCount(0);
    (async () => {
      try {
        // Already in this app's own storage (a copy made when the file arrived) is read as
        // it is. Anything else, including a file:// address that points at shared storage,
        // is copied in first: reading shared storage directly would need a storage
        // permission this app does not hold, and that is the only place the old Android
        // versions (9 and older) could have differed.
        const own = file.uri.startsWith('file://') && file.uri.includes('/com.mps.fileconverter/');
        const local = own ? file : await FileBridge.keepIncoming(file.uri);
        if (!alive) return;
        if (!local.uri.startsWith('file://')) {
          setError('This PDF is too large to open here.');
          return;
        }
        setPath(local.uri);
      } catch (e) {
        // The old-file-manager case carries its own explanation; anything else is generic.
        const code = (e as {code?: string})?.code;
        if (alive) setError(code === 'unreadable_file' ? (e as Error).message : 'This PDF could not be opened.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [file.uri]);

  const onError = (e: unknown) => {
    const message = String((e as {message?: string})?.message ?? e);
    // The Android viewer reports a locked file as a password error with no code of its
    // own, so the text is what there is to go on.
    if (/password/i.test(message)) {
      onLocked();
      return;
    }
    setError('This file could not be opened. It may be damaged.');
  };

  return (
    <View style={styles.root}>
      {error ? (
        <View style={styles.centre}>
          <Text style={styles.message}>{error}</Text>
        </View>
      ) : path ? (
        <Pdf
          key={`${password}-${horizontal}`}
          source={{uri: path}}
          password={password || undefined}
          horizontal={horizontal}
          enablePaging={horizontal}
          spacing={horizontal ? 0 : 6}
          minScale={1}
          maxScale={4}
          page={targetPage}
          trustAllCerts={false}
          onLoadComplete={count => setPageCount(count)}
          onPageChanged={p => setPage(p)}
          onError={onError}
          renderActivityIndicator={() => <ActivityIndicator color={palette.inkFaint} />}
          style={[styles.pdf, {width, backgroundColor: palette.canvas}]}
        />
      ) : (
        <View style={styles.centre}>
          <ActivityIndicator color={palette.inkFaint} />
        </View>
      )}

      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to a page"
          onPress={() => setShowJump(true)}
          style={styles.chip}>
          <Text style={styles.chipText}>{pageCount ? `Page ${page} / ${pageCount}` : '—'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setHorizontal(h => !h)} style={styles.chip}>
          <Text style={styles.chipText}>{horizontal ? 'Scroll' : 'Swipe'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => FileBridge.shareFile(file.uri, file.mime || 'application/pdf')}
          style={styles.chip}>
          <Text style={styles.chipText}>Share</Text>
        </Pressable>
      </View>

      <Modal visible={showJump} transparent animationType="fade" onRequestClose={() => setShowJump(false)}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Go to page</Text>
            <TextInput
              value={jumpTo}
              onChangeText={v => setJumpTo(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              autoFocus
              placeholder={`1 to ${pageCount || 1}`}
              placeholderTextColor={palette.inkFaint}
              style={styles.input}
            />
            <View style={styles.row}>
              <Pressable onPress={() => setShowJump(false)} style={[styles.chip, styles.grow]}>
                <Text style={styles.chipText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const target = parseInt(jumpTo, 10);
                  if (target >= 1 && target <= pageCount) {
                    setTargetPage(target);
                    setPage(target);
                  }
                  setJumpTo('');
                  setShowJump(false);
                }}
                style={[styles.chip, styles.grow, styles.primary]}>
                <Text style={[styles.chipText, styles.primaryText]}>Go</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
  root: {flex: 1, minHeight: 360},
  pdf: {flex: 1},
  centre: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl},
  message: {...type.body, color: palette.inkSoft, textAlign: 'center'},
  bar: {
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    backgroundColor: palette.canvas,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  chipText: {...type.section, color: palette.ink},
  scrim: {
    flex: 1,
    backgroundColor: palette.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: palette.surface,
    borderRadius: radius.sheet,
    padding: space.xl,
    gap: space.md,
  },
  cardTitle: {...type.title, color: palette.ink},
  input: {
    ...type.body,
    color: palette.ink,
    backgroundColor: palette.surfaceSunk,
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
  },
  row: {flexDirection: 'row', gap: space.sm, marginTop: space.sm},
  grow: {flex: 1},
  primary: {backgroundColor: palette.ink, borderColor: palette.ink},
  primaryText: {color: palette.canvas},
}));
