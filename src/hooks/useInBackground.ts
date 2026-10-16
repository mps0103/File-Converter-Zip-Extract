import {useEffect, useState} from 'react';
import {AppState, DeviceEventEmitter} from 'react-native';

/**
 * True while the app is not the thing on screen.
 *
 * It exists so screens can let go of what they are only holding to look at.
 * Decoded images are the expensive case: a few PDF pages are tens of megabytes of
 * bitmap, and an app sitting in the background has no use for any of it. Google
 * Play measures exactly this from 2027 — memory held while the user is elsewhere —
 * and a page can be drawn again from its cache file in a few milliseconds, so
 * holding one is a bad trade however you look at it.
 *
 * Two sources, because they answer slightly different questions. AppState says the
 * user has left. The native memoryTrim event, sent from MainApplication's
 * onTrimMemory, says Android is short of memory and this process is a candidate —
 * which can happen while the app is still technically foreground.
 */
export const useInBackground = () => {
  const [away, setAway] = useState(false);

  useEffect(() => {
    const state = AppState.addEventListener('change', next => setAway(next !== 'active'));
    const trim = DeviceEventEmitter.addListener('memoryTrim', () => setAway(true));
    return () => {
      state.remove();
      trim.remove();
    };
  }, []);

  return away;
};
