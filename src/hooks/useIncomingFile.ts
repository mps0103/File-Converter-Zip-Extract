import {useEffect} from 'react';
import {Linking} from 'react-native';

import {FileBridge, type PickedFile} from '@/native/FileBridge';
import {resolveFormat, type Format} from '@/convert/preview';
import {navigate} from '@/navigation/navigationRef';
import type {FileKind} from '@/convert/catalog';

/**
 * Opens a file another app handed over — an archive on the Extract tool, anything
 * else in the viewer.
 *
 * The uri arrives through Linking rather than a bridge of our own: for an
 * ACTION_VIEW intent React Native already reports `intent.getData()` from
 * `getInitialURL`, and MainActivity is `singleTask`, so a second file opened while
 * the app is alive comes back through the same listener via onNewIntent.
 *
 * Read permission on that uri is granted to the activity that received the intent
 * and is not durable. Some apps go further and mint a new single-use uri for every
 * share, so the file is copied into this app's own storage on arrival and
 * everything downstream — the viewer, Recent files — works from the copy.
 *
 * The format is resolved rather than read off the name. Apps that share files are
 * inconsistent about what they report: some hand over a display name with no
 * extension, from a provider that answers application/octet-stream for anything it
 * did not create. Judging by name alone meant a spreadsheet sent through a chat app
 * opened the app and then did nothing at all, which looks exactly like a crash.
 */
const MEDIA_EXTENSIONS: Record<string, FileKind> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', heic: 'image', heif: 'image', bmp: 'image', gif: 'image',
  mp3: 'audio', m4a: 'audio', aac: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio', opus: 'audio', amr: 'audio',
  mp4: 'video', mkv: 'video', mov: 'video', webm: 'video', '3gp': 'video', avi: 'video', m4v: 'video',
};

/**
 * What kind of editable file this is: a picture, sound or video, going by the MIME
 * type when the sender gave a real one and by the extension when it gave
 * application/octet-stream, as many file managers do.
 */
const mediaKind = (file: PickedFile): FileKind | null => {
  const major = (file.mime || '').split('/')[0];
  if (major === 'image' || major === 'audio' || major === 'video') return major;
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  return MEDIA_EXTENSIONS[ext] ?? null;
};

export const useIncomingFile = (ready: boolean) => {
  useEffect(() => {
    if (!ready) return;
    let alive = true;

    const handle = async (url: string | null) => {
      if (!url || !alive) return;

      // Copied while the permission that came with the intent is still good. The
      // uri is borrowed: WhatsApp and others hand over a single-use address that is
      // dead within the hour, so anything the app remembers has to be its own copy
      // or it is remembering a locked door.
      //
      // (A copy that fails but whose file can still be described comes back from the
      // native side as the borrowed uri, so that case never reaches the catch below.)
      let file: PickedFile;
      try {
        file = await FileBridge.keepIncoming(url);
      } catch (e) {
        // A bare file path this phone will not let us read: no screen can open it, so
        // say why instead of passing the dead address on to one that shows a blank.
        if ((e as {code?: string})?.code === 'unreadable_file') {
          navigate('Viewer', {notice: (e as Error).message});
          return;
        }
        // keepIncoming only rejects when even asking the sender about the file failed,
        // which is what a revoked or single-use grant looks like. Carrying that address
        // on would open a tool that then fails with a vaguer message, so say it here.
        navigate('Viewer', {
          notice:
            'This file could not be opened. The app that shared it may have stopped sharing it — open it from that app again, or use Choose a file here.',
        });
        return;
      }
      if (!alive) return;

      let format: Format = 'unknown';
      try {
        format = await resolveFormat(file);
      } catch {
        // Unknown is a perfectly good answer: the viewer opens either way and says
        // for itself what it can and cannot read.
      }
      if (!alive) return;

      if (format === 'archive') {
        navigate('Convert', {toolId: 'extract-archive', initialFile: file});
        return;
      }
      // Every path ends in a screen. This handler used to be wrapped in a catch
      // that did nothing, so anything at all going wrong — a provider that would
      // not answer a query, a uri whose grant had already lapsed — left the app
      // sitting on the home screen as though the file had never been tapped. That
      // is indistinguishable from a crash, and it is what people reported.
      // Pictures, sound and video have nothing to read, only things to do to them, and
      // a PDF can be edited as well as read: those go to a screen of the tools that
      // apply, which offers the viewer too for a PDF. Everything else reads as before.
      const kind: FileKind | null = format === 'pdf' ? 'pdf' : mediaKind(file);
      if (kind) {
        navigate('OpenWith', {file, kind});
        return;
      }
      navigate('Viewer', {file});
    };

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', event => handle(event.url));

    return () => {
      alive = false;
      sub.remove();
    };
  }, [ready]);
};
