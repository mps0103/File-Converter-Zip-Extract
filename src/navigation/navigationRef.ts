import {createNavigationContainerRef} from '@react-navigation/native';

import type {RootStackParamList} from './types';

/**
 * Lets the "Open with" handler steer the stack from outside the tree, where
 * there is no screen and so no useNavigation to call.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigate = <T extends keyof RootStackParamList>(
  name: T,
  params: RootStackParamList[T],
) => {
  if (navigationRef.isReady()) navigationRef.navigate(name as never, params as never);
};
