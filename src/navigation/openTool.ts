import type {NavigationProp, ParamListBase} from '@react-navigation/native';
import type {Tool} from '@/convert/catalog';

/**
 * Opens a tool from wherever it is listed.
 *
 * Making an archive is not a conversion — it takes many files and asks for a format
 * and a password — so it has a screen of its own rather than bending the one-file-in,
 * one-file-out shape of the converters.
 */
export const openTool = (navigation: NavigationProp<ParamListBase>, tool: Tool) => {
  if (tool.id === 'make-archive') return navigation.navigate('MakeArchive');
  // The reader is the viewer, which asks for its own file.
  if (tool.id === 'view-pdf') return navigation.navigate('Viewer', {});
  return navigation.navigate('Convert', {toolId: tool.id});
};
