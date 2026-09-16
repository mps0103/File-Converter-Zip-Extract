import type {PickedFile} from '@/native/FileBridge';

/**
 * Deciding whether an incoming "Open with" file is an archive.
 *
 * The name is trusted ahead of the MIME type on purpose: file managers disagree
 * wildly about archive types, and a great many report .7z and .rar as plain
 * application/octet-stream. The extension is the one thing that is consistently
 * right, so it is checked first and the MIME type is only a fallback for the
 * providers that hand over a renamed or extensionless file.
 */
const ARCHIVE_EXTENSIONS = [
  '.zip',
  '.7z',
  '.rar',
  '.tar',
  '.gz',
  '.tgz',
  '.bz2',
  '.xz',
];

// octet-stream is deliberately absent: it means "unknown", not "archive", and
// treating it as one here would send every mystery file to the extract screen.
const ARCHIVE_MIMES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
  'application/x-bzip2',
  'application/x-xz',
];

export const isArchiveFile = (file: PickedFile): boolean => {
  const name = (file.name ?? '').toLowerCase();
  if (ARCHIVE_EXTENSIONS.some(ext => name.endsWith(ext))) return true;
  return ARCHIVE_MIMES.includes((file.mime ?? '').toLowerCase());
};
