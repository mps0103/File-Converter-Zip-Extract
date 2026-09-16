import {NativeEventEmitter, NativeModules} from 'react-native';

export type PickedFile = {
  uri: string;
  name: string;
  size: number;
  mime: string;
};

export type SavedFile = {
  uri: string;
  path: string;
  name: string;
  mime: string;
};

export type PdfText = {
  pageCount: number;
  pagesWithText: number;
  pages: string[];
};

export type ArchiveResult = {
  files: SavedFile[];
  folder: string;
};

export type ArchiveProgress = {stage: string; done: number; total: number};

export type RenderedPage = {base64: string; width: number; height: number};

export type ArchiveEntryInfo = {name: string; size: number};

type Bridge = {
  pickFile(mimeTypes: string[]): Promise<PickedFile>;
  /** Metadata for a uri handed over by an "Open with" intent. */
  describeUri(uri: string): Promise<PickedFile>;
  readBase64(uri: string): Promise<string>;
  saveToDownloads(base64: string, fileName: string, mime: string): Promise<SavedFile>;
  /** password is '' for an ordinary PDF and the key for a locked one. */
  extractPdfText(uri: string, password: string): Promise<PdfText>;
  /** Page image for the viewer, drawn by the framework's PdfRenderer. */
  renderPdfPage(
    uri: string,
    index: number,
    targetWidth: number,
    password: string,
  ): Promise<RenderedPage>;
  pdfPageCount(uri: string, password: string): Promise<number>;
  openFile(uri: string, mime: string): Promise<boolean>;
  shareFile(uri: string, mime: string): Promise<boolean>;
};

type ArchiveBridgeType = {
  extract(uri: string, password: string): Promise<ArchiveResult>;
  /** Table of contents only — nothing is written to Downloads. */
  listEntries(uri: string, password: string): Promise<ArchiveEntryInfo[]>;
};

const missing = () => {
  throw new Error('The converter engine is not linked. Rebuild the app.');
};

export const FileBridge: Bridge =
  (NativeModules.FileBridge as Bridge) ?? new Proxy({} as Bridge, {get: () => missing});

export const ArchiveBridge: ArchiveBridgeType =
  (NativeModules.ArchiveBridge as ArchiveBridgeType) ??
  new Proxy({} as ArchiveBridgeType, {get: () => missing});

/** Fires while a large archive is being unpacked, so the ring keeps moving. */
export const onArchiveProgress = (fn: (p: ArchiveProgress) => void) => {
  const emitter = new NativeEventEmitter(NativeModules.ArchiveBridge);
  const sub = emitter.addListener('archiveProgress', fn);
  return () => sub.remove();
};

export const isCancelled = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as {code?: string}).code === 'cancelled';

export const isPasswordError = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as {code?: string}).code === 'password';
