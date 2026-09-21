import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, FadeOut} from 'react-native-reanimated';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {AdBanner} from '@/components/AdBanner';
import {AppDialog} from '@/components/AppDialog';
import {QuotaGate} from '@/components/QuotaGate';
import {FileGlyph} from '@/components/FileGlyph';
import {GradientButton} from '@/components/GradientButton';
import {ProgressRing, RING_SETTLE_MS} from '@/components/ProgressRing';
import {
  ArchiveBridge,
  FileBridge,
  isCancelled,
  onArchiveProgress,
  type ArchiveFormat,
  type PickedFile,
} from '@/native/FileBridge';
import {maybeShowInterstitial} from '@/services/ads';
import {useApp} from '@/hooks/AppState';
import {inkGradient, palette, radius, shadow, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MakeArchive'>;

/**
 * The formats the app can write, and whether each can be locked.
 *
 * Only zip is here with a password. 7z encryption cannot be written by the bundled
 * library, and tar has no encryption at all — it is a container, and the .gz, .bz2
 * and .xz that follow it are compressors, not ciphers. Offering a password box that
 * quietly did nothing would be worse than not offering one.
 */
const FORMATS: Array<{id: ArchiveFormat; label: string; hint: string; locks: boolean}> = [
  {id: 'zip', label: 'ZIP', hint: 'Opens anywhere. The only one that takes a password.', locks: true},
  {id: '7z', label: '7Z', hint: 'Smaller than zip, and slower to make.', locks: false},
  {id: 'tar', label: 'TAR', hint: 'Bundles the files without compressing them.', locks: false},
  {id: 'tar.gz', label: 'TAR.GZ', hint: 'Tar, compressed. The usual choice on Linux.', locks: false},
  {id: 'tar.bz2', label: 'TAR.BZ2', hint: 'Smaller than gz, and slower.', locks: false},
  {id: 'tar.xz', label: 'TAR.XZ', hint: 'Smallest of the tars, and slowest.', locks: false},
];

export const MakeArchiveScreen = ({navigation}: Props) => {
  const {premium, remaining, recordConversion} = useApp();

  const [files, setFiles] = useState<PickedFile[]>([]);
  const [format, setFormat] = useState<ArchiveFormat>('zip');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState(false);

  const locks = FORMATS.find(f => f.id === format)?.locks ?? false;

  // The password belongs to the zip, not to the screen. Switching to a format that
  // cannot carry one has to forget it, or it would sit there invisibly and the
  // archive would come out unlocked while the box still held a word.
  useEffect(() => {
    if (!locks && password) setPassword('');
  }, [locks, password]);

  useEffect(() => onArchiveProgress(p => {
    setStage(p.stage);
    setPercent(p.total > 0 ? Math.round((p.done / p.total) * 100) : 0);
  }), []);

  const add = useCallback(async () => {
    try {
      const picked = await FileBridge.pickFiles(['*/*']);
      // Picked twice, the same file would be packed twice under a numbered name.
      setFiles(current => {
        const seen = new Set(current.map(f => f.uri));
        return [...current, ...picked.filter(f => !seen.has(f.uri))];
      });
    } catch (e) {
      if (!isCancelled(e)) setError((e as Error).message);
    }
  }, []);

  const create = useCallback(async () => {
    if (!premium && remaining <= 0) {
      setGate(true);
      return;
    }
    setBusy(true);
    setPercent(0);
    setStage('Getting ready');
    try {
      const saved = await ArchiveBridge.createArchive(
        files.map(f => f.uri),
        format,
        locks ? password : '',
        name.trim() || 'archive',
      );
      await recordConversion('make-archive', [saved]);
      // Let the ring reach 100 before the overlay goes, the same as the converters.
      await new Promise(resolve => setTimeout(resolve, RING_SETTLE_MS + 90));
      setBusy(false);
      navigation.replace('Result', {toolId: 'make-archive', files: [saved]});
      maybeShowInterstitial(premium);
    } catch (e) {
      setBusy(false);
      setError((e as Error).message || 'The archive could not be made.');
    }
  }, [files, format, locks, name, navigation, password, premium, recordConversion, remaining]);

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <Screen
      title="Make an archive"
      subtitle="Pack several files into one"
      footer={<AdBanner />}>
      {files.length === 0 ? (
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <Pressable accessibilityRole="button" onPress={add} style={styles.dropzone}>
            <Text style={styles.dropTitle}>Choose files</Text>
            <Text style={styles.dropHint}>
              Any kind, as many as you like. Hold to select more than one.
            </Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.fileList}>
          {files.map((f, i) => (
            <Animated.View
              key={f.uri}
              entering={FadeInDown.delay(Math.min(i, 6) * 40).springify().damping(18)}
              exiting={FadeOut}
              style={[styles.fileRow, shadow(1)]}>
              <FileGlyph ink="archive" label={extensionOf(f.name)} size={30} />
              <View style={styles.fileText}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.fileMeta}>{formatSize(f.size)}</Text>
              </View>
              <Pressable
                accessibilityLabel={`Remove ${f.name}`}
                onPress={() => setFiles(files.filter(other => other.uri !== f.uri))}
                hitSlop={12}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </Animated.View>
          ))}
          <Pressable onPress={add} style={styles.addMore}>
            <Text style={styles.addMoreText}>Add more files</Text>
          </Pressable>
          <Text style={styles.total}>
            {`${files.length} ${files.length === 1 ? 'file' : 'files'} · ${formatSize(totalSize)} before packing`}
          </Text>
        </View>
      )}

      {files.length > 0 ? (
        <Animated.View entering={FadeIn} style={styles.options}>
          <Text style={styles.optionLabel}>Format</Text>
          <View style={styles.formats}>
            {FORMATS.map(f => (
              <Pressable
                key={f.id}
                onPress={() => setFormat(f.id)}
                style={[styles.chip, format === f.id && styles.chipOn]}>
                <Text style={[styles.chipText, format === f.id && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.formatHint}>{FORMATS.find(f => f.id === format)?.hint}</Text>

          <Text style={styles.optionLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="archive"
            placeholderTextColor={palette.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.optionLabel}>
            {locks ? 'Password (optional)' : 'Password'}
          </Text>
          {locks ? (
            <>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Leave empty for an ordinary zip"
                placeholderTextColor={palette.inkFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Text style={styles.warn}>
                {password
                  ? 'Locked with AES-256. There is no way to open it again without this password — not even here.'
                  : 'A password locks the archive with AES-256.'}
              </Text>
            </>
          ) : (
            <Text style={styles.warn}>
              {`${format.toUpperCase()} cannot be password protected. Choose ZIP if you need one.`}
            </Text>
          )}
        </Animated.View>
      ) : null}

      <GradientButton
        label={files.length > 1 ? `Pack ${files.length} files` : 'Make the archive'}
        colors={inkGradient.archive}
        onPress={create}
        disabled={files.length === 0 || busy}
        style={styles.cta}
      />

      {!premium ? (
        <Text style={styles.quotaLine}>
          {remaining > 0
            ? `${remaining} free ${remaining === 1 ? 'conversion' : 'conversions'} left`
            : 'Free conversions used up'}
        </Text>
      ) : null}

      <Modal transparent visible={busy} animationType="fade" onRequestClose={() => {}}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.busy}>
          <ProgressRing percent={percent} ink="archive" />
          <Text style={styles.stage}>{stage}</Text>
          <Text style={styles.stageHint}>Keep the app open until this finishes.</Text>
        </Animated.View>
      </Modal>

      <AppDialog
        visible={!!error}
        title="That did not work"
        message={error ?? ''}
        actions={[{label: 'Close', onPress: () => setError(null), subtle: true}]}
        onDismiss={() => setError(null)}
      />

      <QuotaGate
        visible={gate}
        onClose={() => setGate(false)}
        onSeePlans={() => {
          setGate(false);
          navigation.navigate('Premium');
        }}
      />
    </Screen>
  );
};

const extensionOf = (fileName: string) =>
  (fileName.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? 'file').slice(0, 4).toUpperCase();

const formatSize = (bytes: number) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

const styles = StyleSheet.create({
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: palette.hairline,
    borderRadius: radius.card,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.xs,
  },
  dropTitle: {...type.section, color: palette.ink},
  dropHint: {...type.caption, color: palette.inkFaint, textAlign: 'center'},
  fileList: {gap: space.sm},
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.md,
  },
  fileText: {flex: 1},
  fileName: {...type.body, color: palette.ink},
  fileMeta: {...type.caption, color: palette.inkFaint},
  remove: {...type.caption, color: '#C81E25'},
  addMore: {paddingVertical: space.md, alignItems: 'center'},
  addMoreText: {...type.body, color: palette.inkSoft},
  total: {...type.caption, color: palette.inkFaint, textAlign: 'center'},
  options: {marginTop: space.lg, gap: space.sm},
  optionLabel: {...type.caption, color: palette.inkSoft, marginTop: space.sm},
  formats: {flexDirection: 'row', flexWrap: 'wrap', gap: space.sm},
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  chipOn: {backgroundColor: palette.ink, borderColor: palette.ink},
  chipText: {...type.caption, color: palette.inkSoft},
  chipTextOn: {color: '#FFFFFF'},
  formatHint: {...type.caption, color: palette.inkFaint},
  input: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.chip,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: palette.ink,
    backgroundColor: palette.surface,
    ...type.body,
  },
  warn: {...type.caption, color: palette.inkFaint},
  cta: {marginTop: space.xl},
  quotaLine: {...type.caption, color: palette.inkFaint, textAlign: 'center', marginTop: space.sm},
  // Copied from ConvertScreen rather than invented: the same wait should look the
  // same wherever it happens, and a dark overlay here made this one screen a
  // stranger to the rest of the app.
  busy: {
    flex: 1,
    backgroundColor: 'rgba(246,245,251,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  stage: {...type.title, color: palette.ink},
  stageHint: {...type.caption, color: palette.inkFaint, marginTop: -space.sm},
});
