import type {PickedFile, SavedFile} from '@/native/FileBridge';
import type {ToolId} from '@/convert/catalog';

export type RootStackParamList = {
  Home: undefined;
  /** initialFile is set when the app was opened from another app with a file. */
  Convert: {toolId: ToolId; initialFile?: PickedFile};
  Result: {toolId: ToolId; files: SavedFile[]; warning?: string};
  /** file is set when the app was opened from another app to view something. */
  Viewer: {file?: PickedFile};
  Premium: undefined;
  Settings: undefined;
  History: undefined;
};
