import React, {useCallback, useEffect, useRef, useState} from 'react';
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
import {toolById, type OptionValues, type ToolOption} from '@/convert/catalog';
import {convert, inspectFile, type ConvertOptions, type InfoRow} from '@/convert/engine';
import {FileBridge, isCancelled, isPasswordError, type PickedFile} from '@/native/FileBridge';
import {maybeShowInterstitial} from '@/services/ads';
import {useApp} from '@/hooks/AppState';
import {makeStyles, radius, shadow, space, type, useTheme} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Convert'>;

export const ConvertScreen = ({route, navigation}: Props) => {
  const styles = useStyles();
  const {palette, inkGradient} = useTheme();
  const tool = toolById(route.params.toolId);
  const {premium, remaining, recordConversion} = useApp();

  // Set when another app opened a file with us, so the tool arrives ready to run.
  const incoming = route.params.initialFile;
  const [files, setFiles] = useState<PickedFile[]>(incoming ? [incoming] : []);
  const [options, setOptions] = useState<ConvertOptions>(() => ({
    password: '',
    values: defaultValues(tool.options),
  }));
  const [busy, setBusy] = useState(false);
  // A second tap in the same frame as the first lands before `busy` has re-rendered the
  // button disabled, and would start the work twice and spend two conversions.
  const running = useRef(false);
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  // File Info answers on this screen instead of saving anything.
  const [info, setInfo] = useState<InfoRow[] | null>(null);

  // A second file opened while this screen is already up arrives as new params
  // rather than a remount, so it has to be picked up here as well.
  useEffect(() => {
    if (incoming) setFiles([incoming]);
  }, [incoming]);

  const isArchive = tool.id === 'extract-archive';
  // The scanner has no file to choose: it makes its pages with the camera, so the
  // screen offers one button and the usual "choose a file" path is skipped whole.
  const isCapture = tool.capture === true;
  // Unpacking an archive is not converting it, and a button that says the wrong
  // word makes the user wonder what it is about to do to their file.
  const verb = tool.free ? 'Show details' : isArchive ? 'Extract' : isCapture ? 'Open the scanner' : 'Convert';
  // A locked PDF needs the same box a protected ZIP does, or the "password
  // required" message arrives with nowhere to type one.
  const takesPassword = isArchive || tool.id.startsWith('pdf-to-') || tool.lockable === true;
  const values: OptionValues = options.values ?? {};
  const setValue = (key: string, value: string | number | boolean) =>
    setOptions(o => ({...o, values: {...o.values, [key]: value}}));

  const pick = useCallback(async () => {
    try {
      if (tool.multi) {
        const picked = await FileBridge.pickFiles(tool.accept);
        setFiles([...files, ...picked]);
      } else {
        setFiles([await FileBridge.pickFile(tool.accept)]);
      }
    } catch (e) {
      if (!isCancelled(e)) setError((e as Error).message);
    }
  }, [files, tool]);

  const start = useCallback(async () => {
    // Looking is free: no quota, no progress ring, no result file, no history.
    if (tool.free) {
      try {
        setInfo(await inspectFile(files[0], options.password ?? ''));
      } catch (e) {
        if (isPasswordError(e)) setNeedsPassword(true);
        else setError((e as Error).message || 'That file could not be read.');
      }
      return;
    }
    if (!premium && remaining <= 0) {
      setGate(true);
      return;
    }
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setPercent(0);
    setStage('Getting ready');
    try {
      const result = await convert(tool, files, options, (p, label) => {
        setPercent(p);
        setStage(label);
      });
      await recordConversion(tool.id, result.files);
      // Let the ring actually arrive at 100 before the overlay goes. Without this
      // the work finishes first and the arc is dismissed mid-sweep, which is what
      // made a three-quarter ring sit under a figure reading 100.
      await new Promise(resolve => setTimeout(resolve, RING_SETTLE_MS + 90));
      setBusy(false);
      running.current = false;
      navigation.replace('Result', {
        toolId: tool.id,
        files: result.files,
        warning: result.warning,
      });
      // The ad comes after the file is safely saved and the result is on screen.
      maybeShowInterstitial(premium);
    } catch (e) {
      setBusy(false);
      running.current = false;
      if (isPasswordError(e)) {
        setNeedsPassword(true);
        return;
      }
      // Backing out of the scanner is a decision, not a failure, and telling the
      // user it went wrong when they chose to stop is its own small insult.
      if (isCancelled(e)) return;
      setError((e as Error).message || 'That file could not be converted.');
    }
  }, [files, navigation, options, premium, recordConversion, remaining, tool]);

  return (
    <Screen title={tool.title} subtitle={`${tool.from} → ${tool.to}`} footer={<AdBanner />}>
      <View style={[styles.noteCard, shadow(1)]}>
        <FileGlyph ink={tool.ink} label={tool.to.split(' ')[0]} size={38} />
        <Text style={styles.note}>{tool.note}</Text>
      </View>

      {isCapture ? (
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <View style={styles.dropzone}>
            <Text style={styles.dropTitle}>Nothing to choose</Text>
            <Text style={styles.dropHint}>
              The scanner opens the camera, finds the edges of the page and straightens it. Add as
              many pages as you like before you save.
            </Text>
          </View>
        </Animated.View>
      ) : files.length === 0 ? (
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <Pressable accessibilityRole="button" onPress={pick} style={styles.dropzone}>
            <Text style={styles.dropTitle}>Choose a file</Text>
            <Text style={styles.dropHint}>
              {tool.multi ? 'Pick as many as you need.' : `Accepts ${tool.from} files.`}
            </Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.fileList}>
          {files.map((f, i) => (
            <Animated.View
              key={f.uri + i}
              entering={FadeInDown.delay(i * 40).springify().damping(18)}
              exiting={FadeOut}
              style={[styles.fileRow, shadow(1)]}>
              <FileGlyph ink={tool.ink} label={tool.from.split(' ')[0]} size={30} />
              <View style={styles.fileText}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.fileMeta}>{formatSize(f.size)}</Text>
              </View>
              <Pressable
                accessibilityLabel={`Remove ${f.name}`}
                onPress={() => setFiles(files.filter((_, idx) => idx !== i))}
                hitSlop={12}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </Animated.View>
          ))}
          <Pressable onPress={pick} style={styles.addMore}>
            <Text style={styles.addMoreText}>
              {tool.multi ? 'Add another file' : 'Choose a different file'}
            </Text>
          </Pressable>
        </View>
      )}

      {takesPassword && files.length > 0 ? (
        <Animated.View entering={FadeIn} style={styles.options}>
          <Text style={styles.optionLabel}>
            {tool.passwordLabel ?? (isArchive ? 'Password (only if the archive has one)' : 'Password (only if the PDF is locked)')}
          </Text>
          <TextInput
            value={options.password}
            onChangeText={password => setOptions(o => ({...o, password}))}
            placeholder={isArchive ? 'Leave empty for a normal archive' : 'Leave empty if the PDF is not locked'}
            placeholderTextColor={palette.inkFaint}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </Animated.View>
      ) : null}

      {tool.options && files.length > 0
        ? tool.options
            .filter(opt => !opt.show || opt.show(values))
            .map(opt => (
              <Animated.View key={opt.key} entering={FadeIn} style={styles.options}>
                <OptionField opt={opt} values={values} onChange={setValue} />
              </Animated.View>
            ))
        : null}

      <GradientButton
        label={files.length > 1 ? `${verb} ${files.length} files` : verb}
        colors={inkGradient[tool.ink]}
        onPress={start}
        disabled={(files.length === 0 && !isCapture) || busy}
        style={styles.cta}
      />

      {!premium && !tool.free ? (
        <Text style={styles.quotaLine}>
          {remaining > 0
            ? `${remaining} free ${remaining === 1 ? 'conversion' : 'conversions'} left`
            : 'Free conversions used up'}
        </Text>
      ) : null}

      <Modal transparent visible={busy} animationType="fade" onRequestClose={() => {}}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.busy}>
          <ProgressRing percent={percent} ink={tool.ink} />
          <Text style={styles.stage}>{stage}</Text>
          <Text style={styles.stageHint}>
            {isCapture
              ? 'Finish in the scanner and your pages come back here.'
              : 'Keep the app open until this finishes.'}
          </Text>
        </Animated.View>
      </Modal>

      <AppDialog
        visible={!!error}
        title="That did not work"
        message={error ?? ''}
        actions={[{label: 'Close', onPress: () => setError(null), subtle: true}]}
        onDismiss={() => setError(null)}
      />

      <AppDialog
        visible={needsPassword}
        title={isArchive ? 'This archive is locked' : 'This PDF is locked'}
        message="Type the password in the box on this screen, then tap Convert again."
        actions={[{label: 'Got it', subtle: true, onPress: () => setNeedsPassword(false)}]}
        onDismiss={() => setNeedsPassword(false)}
      />

      <AppDialog
        visible={info !== null}
        title="File details"
        message={(info ?? []).map(r => `${r.label}: ${r.value}`).join('\n')}
        actions={[{label: 'Close', onPress: () => setInfo(null), subtle: true}]}
        onDismiss={() => setInfo(null)}
      />

      <QuotaGate
        visible={gate}
        onClose={() => setGate(false)}
        onSeePlans={() => navigation.navigate('Premium')}
      />
    </Screen>
  );
};

const defaultValues = (options: ToolOption[] | undefined): OptionValues =>
  Object.fromEntries((options ?? []).map(o => [o.key, o.kind === 'text' ? o.def ?? '' : o.def]));

/** One of a tool's own settings, drawn with the same chips and fields as the rest of the screen. */
const OptionField = ({
  opt,
  values,
  onChange,
}: {
  opt: ToolOption;
  values: OptionValues;
  onChange: (key: string, value: string | number | boolean) => void;
}) => {
  const styles = useStyles();
  const {palette} = useTheme();
  const value = values[opt.key];

  if (opt.kind === 'switch') {
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{checked: value === true}}
        onPress={() => onChange(opt.key, value !== true)}
        style={styles.switchRow}>
        <Text style={styles.switchLabel}>{opt.label}</Text>
        <View style={[styles.track, value === true && {backgroundColor: palette.success}]}>
          <View style={[styles.thumb, value === true && styles.thumbOn]} />
        </View>
      </Pressable>
    );
  }

  return (
    <View>
      <Text style={styles.optionLabel}>{opt.label}</Text>
      {opt.kind === 'segment' ? (
        <View style={styles.chips}>
          {opt.choices.map(c => {
            const active = value === c.value;
            return (
              <Pressable
                key={String(c.value)}
                accessibilityRole="button"
                accessibilityState={{selected: active}}
                onPress={() => onChange(opt.key, c.value)}
                style={[styles.chip, active && {backgroundColor: palette.ink, borderColor: palette.ink}]}>
                <Text style={[styles.chipText, active && {color: palette.canvas}]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          value={String(value ?? '')}
          onChangeText={t => onChange(opt.key, t)}
          placeholder={opt.placeholder}
          placeholderTextColor={palette.inkFaint}
          secureTextEntry={opt.secret}
          keyboardType={opt.numeric ? 'number-pad' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      )}
    </View>
  );
};

const formatSize = (bytes: number) => {
  if (!bytes) return 'Size unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const useStyles = makeStyles(palette => StyleSheet.create({
  noteCard: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.lg,
  },
  note: {...type.caption, color: palette.inkSoft, flex: 1, lineHeight: 18},
  dropzone: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.inkFaint,
    backgroundColor: palette.surface,
    paddingVertical: space.xxl,
    alignItems: 'center',
  },
  dropTitle: {...type.title, color: palette.ink},
  dropHint: {...type.caption, color: palette.inkFaint, marginTop: 4},
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
  fileName: {...type.section, color: palette.ink},
  fileMeta: {...type.caption, color: palette.inkFaint},
  remove: {...type.caption, color: palette.danger},
  addMore: {paddingVertical: space.md, alignItems: 'center'},
  addMoreText: {...type.caption, color: palette.inkSoft},
  options: {marginTop: space.lg},
  optionLabel: {...type.caption, color: palette.inkSoft, marginBottom: space.sm},
  input: {
    ...type.body,
    color: palette.ink,
    backgroundColor: palette.surface,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: space.sm},
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 9,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.surface,
  },
  chipText: {...type.caption, color: palette.inkSoft},
  switchRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.xs},
  switchLabel: {...type.body, color: palette.ink, flex: 1},
  track: {width: 46, height: 28, borderRadius: 14, backgroundColor: palette.hairline, padding: 3, justifyContent: 'center'},
  thumb: {width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF'},
  thumbOn: {alignSelf: 'flex-end'},
  cta: {marginTop: space.xl},
  quotaLine: {...type.caption, color: palette.inkFaint, textAlign: 'center', marginTop: space.md},
  busy: {
    flex: 1,
    backgroundColor: palette.canvasVeil,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  stage: {...type.title, color: palette.ink},
  stageHint: {...type.caption, color: palette.inkFaint, marginTop: -space.sm},
}));
