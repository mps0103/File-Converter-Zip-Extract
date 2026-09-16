import {useEffect} from 'react';
import {Linking} from 'react-native';

import {FileBridge} from '@/native/FileBridge';
import {isArchiveFile} from '@/services/openWith';
import {previewKindFor} from '@/convert/preview';
import {navigate} from '@/navigation/navigationRef';

/**
 * Opens the Extract archive tool on the file another app handed over.
 *
 * The uri arrives through Linking rather than a bridge of our own: for an
 * ACTION_VIEW intent React Native already reports `intent.getData()` from
 * `getInitialURL`, and MainActivity is `singleTask`, so a second archive opened
 * while the app is alive comes back through the same listener via onNewIntent.
 *
 * Read permission on that uri is granted to the activity that received the
 * intent and is not durable, so nothing is stored — the file is described and
 * used straight away, and a failure is left silent rather than greeting someone
 * with an error they did not ask for.
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
        if (isArchiveFile(file)) {
          navigate('Convert', {toolId: 'extract-archive', initialFile: file});
          return;
        }
        if (previewKindFor(file) !== 'unsupported') navigate('Viewer', {file});
      } catch {
        // An unreadable uri is not worth interrupting anyone over; the home
        // screen is already on display and the file can still be picked by hand.
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
