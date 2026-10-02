import {useEffect} from 'react';
import {Linking} from 'react-native';

import {FileBridge, type PickedFile} from '@/native/FileBridge';
import {resolveFormat, type Format} from '@/convert/preview';
import {navigate} from '@/navigation/navigationRef';

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
/** A last-resort name for a file nothing would describe. */
const nameFromUri = (url: string) => {
  const tail = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');
  return tail || 'file';
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
      // When that fails the borrowed uri is used as it stands. It is worth less —
      // it will not survive in Recent files — but it opens now, and opening now is
      // the thing the user asked for.
      let file: PickedFile;
      try {
        file = await FileBridge.keepIncoming(url);
      } catch {
        file = {uri: url, name: nameFromUri(url), size: 0, mime: ''};
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
