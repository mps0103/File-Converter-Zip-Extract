import type {PickedFile, SavedFile} from '@/native/FileBridge';
import type {FileKind, ToolId} from '@/convert/catalog';

export type RootStackParamList = {
  Home: undefined;
  /** A file another app handed over: which of the tools should it go to? */
  OpenWith: {file: PickedFile; kind: FileKind};
  /** A folder from the home screen, opened into its tools. */
  Folder: {folderId: string};
  /** initialFile is set when the app was opened from another app with a file. */
  Convert: {toolId: ToolId; initialFile?: PickedFile};
  Result: {toolId: ToolId; files: SavedFile[]; warning?: string};
  /** file is set when the app was opened from another app to view something. */
  Viewer: {file?: PickedFile; /** A reason to show instead of opening anything. */ notice?: string};
  /** Packing files into a new archive, rather than converting one. */
  MakeArchive: undefined;
  Premium: undefined;
  Settings: undefined;
  History: undefined;
};
