import {useEffect} from 'react';
import {Linking} from 'react-native';

import {FileBridge} from '@/native/FileBridge';
import {resolveFormat} from '@/convert/preview';
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
 * and is not durable, so nothing is stored — the file is described and used
 * straight away.
 *
 * The format is resolved rather than read off the name. Apps that share files are
 * inconsistent about what they report: some hand over a display name with no
 * extension, from a provider that answers application/octet-stream for anything it
 * did not create. Judging by name alone meant a spreadsheet sent through a chat app
 * opened the app and then did nothing at all, which looks exactly like a crash.
 */
export const useIncomingFile = (ready: boolean) => {
  useEffect(() => {
    if (!ready) return;
    let alive = true;

    const handle = async (url: string | null) => {
      if (!url || !alive) return;
      try {
        const file = await FileBridge.describeUri(url);
        if (!alive) return;

        const format = await resolveFormat(file);
        if (!alive) return;

        if (format === 'archive') {
          navigate('Convert', {toolId: 'extract-archive', initialFile: file});
          return;
        }
        // Even an unrecognised file goes to the viewer, which says plainly that it
        // cannot read it. Someone who picked this app from the Open with list is
        // owed an answer; landing them on the home screen is not one.
        navigate('Viewer', {file});
      } catch {
        // An unreadable uri is not worth interrupting anyone over; the home screen
        // is already on display and the file can still be picked by hand.
      }
    };

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', event => handle(event.url));

    return () => {
      alive = false;
      sub.remove();
    };
  }, [ready]);
};
