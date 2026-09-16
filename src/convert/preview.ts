import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import {ArchiveBridge, FileBridge, type PickedFile} from '@/native/FileBridge';
import {b64ToBytes, b64ToText, escapeHtml, stripExtension} from './util';

/**
 * Read-only rendering for the viewer.
 *
 * The body HTML is built by the same code the converters use, so a document looks
 * the same on screen as it does in the PDF the app produces — a viewer that
 * disagreed with its own converter would be worse than no viewer.
 *
 * PDFs are the exception: they are drawn page by page by the native renderer
 * rather than turned into HTML, because their layout is the thing worth seeing.
 */
export type PreviewKind = 'pdf' | 'html' | 'archive' | 'unsupported';

export type ArchiveEntry = {name: string; size: number};

export type Preview =
  | {kind: 'pdf'; pageCount: number}
  | {kind: 'html'; html: string; note?: string}
  | {kind: 'archive'; entries: ArchiveEntry[]}
  | {kind: 'unsupported'};

const EXT = (name: string) => (name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '');

const ARCHIVE_EXT = ['.zip', '.7z', '.rar', '.tar', '.gz', '.tgz', '.bz2', '.xz'];

/** What the viewer can open, keyed off the name first because MIME types lie. */
export const previewKindFor = (file: PickedFile): PreviewKind => {
  const ext = EXT(file.name);
  const mime = (file.mime ?? '').toLowerCase();
  if (ext === '.pdf' || mime === 'application/pdf') return 'pdf';
  if (ARCHIVE_EXT.includes(ext)) return 'archive';
  if (['.docx', '.xlsx', '.csv', '.pptx', '.txt', '.html', '.htm', '.md', '.json', '.xml'].includes(ext)) {
    return 'html';
  }
  if (mime.startsWith('text/')) return 'html';
  return 'unsupported';
};

/**
 * Screen styling, deliberately different from the print stylesheet: this is read
 * on a phone, so the type is larger, the page is not paginated, and tables scroll
 * sideways instead of being squeezed to the page width.
 */
const screenDocument = (body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 16px 14px 40px; background: #FFFFFF; color: #16142A;
         font-family: -apple-system, Roboto, 'Segoe UI', sans-serif;
         font-size: 16px; line-height: 1.6; -webkit-text-size-adjust: 100%; }
  h1 { font-size: 24px; margin: 0 0 12px; letter-spacing: -0.4px; }
  h2 { font-size: 20px; margin: 22px 0 8px; }
  h3 { font-size: 17px; margin: 18px 0 6px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px 20px; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; margin: 0 0 16px; font-size: 14px; }
  th, td { border: 1px solid #C9C5DA; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #EFEDF7; font-weight: 600; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Roboto Mono', monospace;
        font-size: 14px; margin: 0; }
  .sheet-title { font-size: 15px; font-weight: 600; margin: 20px 0 8px; color: #5B5776; }
  .slide { border: 1px solid #E4E1F0; border-radius: 12px; padding: 14px 16px; margin: 0 0 14px; }
  .slide h2 { margin-top: 0; }
  /* A wide sheet must scroll rather than force the whole page sideways. */
  .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
</style></head><body>${body}</body></html>`;

const wordPreview = async (file: PickedFile) => {
  const bytes = b64ToBytes(await FileBridge.readBase64(file.uri));
  const {value, messages} = await mammoth.convertToHtml({
    arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  const dropped = messages.filter(m => m.type === 'warning').length;
  return {
    html: screenDocument(value || '<p><em>This document has no text in it.</em></p>'),
    note: dropped > 8 ? 'Some uncommon formatting was simplified.' : undefined,
  };
};

const sheetPreview = async (file: PickedFile, fromCsv: boolean) => {
  const raw = await FileBridge.readBase64(file.uri);
  const book = fromCsv
    ? XLSX.read(b64ToText(raw), {type: 'string', cellDates: true})
    : XLSX.read(raw, {type: 'base64', cellDates: true});
  const body = book.SheetNames.map(name => {
    const table = XLSX.utils.sheet_to_html(book.Sheets[name], {header: '', footer: ''});
    const title = book.SheetNames.length > 1 ? `<div class="sheet-title">${escapeHtml(name)}</div>` : '';
    return `${title}<div class="scroll">${table}</div>`;
  }).join('');
  return {html: screenDocument(body)};
};

const slidesPreview = async (file: PickedFile) => {
  const zip = await JSZip.loadAsync(b64ToBytes(await FileBridge.readBase64(file.uri)));
  const paths = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (!paths.length) throw new Error('No slides were found inside this file.');

  const sections: string[] = [];
  for (let i = 0; i < paths.length; i++) {
    const xml = await zip.file(paths[i])!.async('string');
    const lines = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1].trim()).filter(Boolean);
    const [heading, ...rest] = lines;
    sections.push(
      `<div class="slide"><h2>${escapeHtml(heading ?? `Slide ${i + 1}`)}</h2>` +
        rest.map(l => `<p>${escapeHtml(l)}</p>`).join('') +
        '</div>',
    );
  }
  return {
    html: screenDocument(sections.join('')),
    note: 'Slide text only — pictures, themes and layouts are not drawn.',
  };
};

const textPreview = async (file: PickedFile) => {
  const text = b64ToText(await FileBridge.readBase64(file.uri));
  const ext = EXT(file.name);
  const isHtml = ext === '.html' || ext === '.htm' || file.mime === 'text/html';
  return {html: screenDocument(isHtml ? text : `<pre>${escapeHtml(text)}</pre>`)};
};

export const buildPreview = async (file: PickedFile, password = ''): Promise<Preview> => {
  const kind = previewKindFor(file);
  const ext = EXT(file.name);

  if (kind === 'pdf') {
    return {kind: 'pdf', pageCount: await FileBridge.pdfPageCount(file.uri, password)};
  }

  if (kind === 'archive') {
    const entries = await ArchiveBridge.listEntries(file.uri, password);
    // Some writers store Windows separators inside the archive; show one shape.
    return {
      kind: 'archive',
      entries: entries.map(e => ({...e, name: e.name.split('\\').join('/')})),
    };
  }

  if (kind === 'html') {
    if (ext === '.docx') return {kind: 'html', ...(await wordPreview(file))};
    if (ext === '.xlsx') return {kind: 'html', ...(await sheetPreview(file, false))};
    if (ext === '.csv') return {kind: 'html', ...(await sheetPreview(file, true))};
    if (ext === '.pptx') return {kind: 'html', ...(await slidesPreview(file))};
    return {kind: 'html', ...(await textPreview(file))};
  }

  return {kind: 'unsupported'};
};

/**
 * The Open-with list in AndroidManifest.xml. The in-app picker deliberately does
 * NOT filter on these: Android's document picker matches on the MIME the providing
 * app reports, and providers disagree. On a real device a .zip offered as
 * application/zip and a .csv offered as text/comma-separated-values were both
 * hidden even though both types were requested. A viewer that refuses to show a
 * file the user can plainly see is worse than one that opens anything and says
 * honestly when it cannot read it, which is what previewKindFor does after a pick.
 */
export const VIEWABLE_MIMES = [
  'text/comma-separated-values',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'text/html',
  'application/zip',
  'application/x-7z-compressed',
  'application/vnd.rar',
  'application/x-tar',
  'application/gzip',
  'application/octet-stream',
];

export const titleFor = (file: PickedFile) => stripExtension(file.name);
