import RNHTMLtoPDF from 'react-native-html-to-pdf';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {Document, HeadingLevel, Packer, Paragraph, TextRun} from 'docx';
import {
  ArchiveBridge,
  FileBridge,
  ImageEditBridge,
  MediaEditBridge,
  PdfEditBridge,
  PdfToolsBridge,
  onArchiveProgress,
  onImageEditProgress,
  onMediaEditProgress,
  onPdfEditProgress,
  onPdfToolsProgress,
  type PdfEditResult,
  type PickedFile,
  type SavedFile,
} from '@/native/FileBridge';
import {MIME, type OptionValues, type Tool, type ToolId} from './catalog';
import {
  b64ToBytes,
  b64ToText,
  escapeHtml,
  printableDocument,
  safeName,
  stripExtension,
  textToB64,
} from './util';

export type Progress = (percent: number, label: string) => void;

export type ConvertOptions = {
  /** For a protected ZIP, and for a PDF that is locked. */
  password?: string;
  /** What the tool's own settings were set to, keyed as the catalog names them. */
  values?: OptionValues;
};

export type ConvertResult = {
  files: SavedFile[];
  /** Surfaced on the result screen when the input limited what was possible. */
  warning?: string;
};

const save = (b64: string, base: string, ext: string) =>
  FileBridge.saveToDownloads(b64, safeName(base, ext), MIME[ext] ?? 'application/octet-stream');

const htmlToPdfBase64 = async (html: string, name: string): Promise<string> => {
  const out = await RNHTMLtoPDF.convert({
    html,
    fileName: `tmp_${Date.now()}`,
    directory: 'Documents',
    base64: true,
    padding: 0,
  });
  if (!out?.base64) {
    throw new Error(`${name} could not be laid out as a PDF.`);
  }
  return out.base64;
};

// ----------------------------------------------------------------- from PDF

const pdfToWord = async (file: PickedFile, p: Progress, o: ConvertOptions): Promise<ConvertResult> => {
  p(15, 'Reading the PDF');
  const {pages, pageCount, pagesWithText} = await FileBridge.extractPdfText(file.uri, o.password ?? '');
  if (pagesWithText === 0) {
    throw new Error('This PDF has no text in it — it is a scan or a set of pictures, so there is nothing to pull out.');
  }
  p(45, 'Rebuilding paragraphs');

  const children: Paragraph[] = [];
  pages.forEach((pageText, index) => {
    children.push(
      new Paragraph({
        text: `Page ${index + 1}`,
        heading: HeadingLevel.HEADING_3,
        spacing: {before: index === 0 ? 0 : 320, after: 120},
      }),
    );
    const blocks = pageText.split(/\n\s*\n/).filter(b => b.trim());
    if (!blocks.length) {
      children.push(new Paragraph({children: [new TextRun({text: '[no text on this page]', italics: true})]}));
      return;
    }
    blocks.forEach(block => {
      // Each line in the text layer stays a line. Flattening a block into a single
      // run reads acceptably for prose but destroys anything laid out in rows — a
      // statement or invoice came through as one unbroken paragraph.
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      children.push(
        new Paragraph({
          children: lines.map(
            (line, i) => new TextRun({text: line, size: 22, break: i === 0 ? 0 : 1}),
          ),
          spacing: {after: 140},
        }),
      );
    });
  });

  p(75, 'Writing the document');
  const doc = new Document({sections: [{properties: {}, children}]});
  const b64 = await Packer.toBase64String(doc);
  p(92, 'Saving to Downloads');
  const saved = await save(b64, file.name, 'docx');
  return {
    files: [saved],
    warning:
      pagesWithText < pageCount
        ? `${pageCount - pagesWithText} of ${pageCount} pages were scans, so they came through empty.`
        : undefined,
  };
};

/** Splits a text line wherever two or more spaces sit between values. */
const rowsFromText = (text: string) =>
  text
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim())
    .map(line => line.split(/\s{2,}|\t/).map(cell => cell.trim()));

const pdfToExcel = async (file: PickedFile, p: Progress, o: ConvertOptions): Promise<ConvertResult> => {
  p(15, 'Reading the PDF');
  const {pages, pagesWithText} = await FileBridge.extractPdfText(file.uri, o.password ?? '');
  if (pagesWithText === 0) {
    throw new Error('This PDF has no text in it, so there is nothing to put in a sheet.');
  }
  p(50, 'Finding columns');
  const book = XLSX.utils.book_new();
  let widest = 0;
  pages.forEach((pageText, i) => {
    const rows = rowsFromText(pageText);
    rows.forEach(r => (widest = Math.max(widest, r.length)));
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), `Page ${i + 1}`.slice(0, 31));
  });
  p(85, 'Saving to Downloads');
  const b64 = XLSX.write(book, {bookType: 'xlsx', type: 'base64'});
  const saved = await save(b64, file.name, 'xlsx');
  return {
    files: [saved],
    warning:
      widest < 2
        ? 'The columns in this PDF are not spaced apart, so every line landed in one column.'
        : undefined,
  };
};

const pdfToText = async (file: PickedFile, p: Progress, o: ConvertOptions): Promise<ConvertResult> => {
  p(25, 'Reading the PDF');
  const {pages, pagesWithText} = await FileBridge.extractPdfText(file.uri, o.password ?? '');
  if (pagesWithText === 0) {
    throw new Error('This PDF has no text in it — it is a scan, so there is nothing to pull out.');
  }
  p(70, 'Saving to Downloads');
  const body = pages.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join('\n\n');
  return {files: [await save(textToB64(body), file.name, 'txt')]};
};

// ------------------------------------------------------------------- to PDF

const wordToPdf = async (file: PickedFile, p: Progress): Promise<ConvertResult> => {
  p(20, 'Reading the document');
  const bytes = b64ToBytes(await FileBridge.readBase64(file.uri));
  p(45, 'Laying out the pages');
  const {value: html, messages} = await mammoth.convertToHtml({
    arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  const pdf = await htmlToPdfBase64(printableDocument(html, stripExtension(file.name)), file.name);
  p(88, 'Saving to Downloads');
  const dropped = messages.filter(m => m.type === 'warning').length;
  return {
    files: [await save(pdf, file.name, 'pdf')],
    warning: dropped > 8 ? 'Some uncommon formatting in this document was simplified.' : undefined,
  };
};

const sheetToPdf = async (file: PickedFile, p: Progress): Promise<ConvertResult> => {
  p(20, 'Reading the sheet');
  const raw = await FileBridge.readBase64(file.uri);
  const book = XLSX.read(raw, {type: 'base64'});
  p(50, 'Drawing the tables');
  const body = book.SheetNames.map(name => {
    const table = XLSX.utils.sheet_to_html(book.Sheets[name], {header: '', footer: ''});
    return `<div class="sheet-title">${escapeHtml(name)}</div>${table}`;
  }).join('');
  const pdf = await htmlToPdfBase64(printableDocument(body, stripExtension(file.name)), file.name);
  p(88, 'Saving to Downloads');
  return {files: [await save(pdf, file.name, 'pdf')]};
};

const slidesToPdf = async (file: PickedFile, p: Progress): Promise<ConvertResult> => {
  p(20, 'Opening the deck');
  const zip = await JSZip.loadAsync(b64ToBytes(await FileBridge.readBase64(file.uri)));
  const slidePaths = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (!slidePaths.length) {
    throw new Error('No slides were found inside this file.');
  }
  p(50, 'Collecting slide text');
  const sections: string[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.file(slidePaths[i])!.async('string');
    const lines = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1].trim()).filter(Boolean);
    const [heading, ...rest] = lines;
    sections.push(
      `<div class="slide"><h2>${escapeHtml(heading ?? `Slide ${i + 1}`)}</h2>` +
        rest.map(l => `<p>${escapeHtml(l)}</p>`).join('') +
        '</div>',
    );
  }
  const pdf = await htmlToPdfBase64(printableDocument(sections.join(''), stripExtension(file.name)), file.name);
  p(88, 'Saving to Downloads');
  return {
    files: [await save(pdf, file.name, 'pdf')],
    warning: 'Slide text only — pictures, themes and layouts are not drawn.',
  };
};

const textToPdf = async (file: PickedFile, p: Progress): Promise<ConvertResult> => {
  p(25, 'Reading the file');
  const text = b64ToText(await FileBridge.readBase64(file.uri));
  const isHtml = /\.html?$/i.test(file.name) || file.mime === 'text/html';
  const body = isHtml ? text : `<pre>${escapeHtml(text)}</pre>`;
  p(55, 'Typesetting');
  const pdf = await htmlToPdfBase64(printableDocument(body, stripExtension(file.name)), file.name);
  p(88, 'Saving to Downloads');
  return {files: [await save(pdf, file.name, 'pdf')]};
};

// ------------------------------------------------- sheets, text, archives

const csvToExcel = async (file: PickedFile, p: Progress): Promise<ConvertResult> => {
  p(30, 'Reading the rows');
  const csv = b64ToText(await FileBridge.readBase64(file.uri));
  // Without cellDates a date column is written as a bare serial number shifted by
  // the device timezone: 2026-01-05 reached Excel as 46027.22917. This keeps dates
  // as real dates and leaves amounts numeric.
  const sheet = XLSX.read(csv, {type: 'string', cellDates: true, dateNF: 'yyyy-mm-dd'});
  p(75, 'Saving to Downloads');
  const b64 = XLSX.write(sheet, {bookType: 'xlsx', type: 'base64'});
  return {files: [await save(b64, file.name, 'xlsx')]};
};

const excelToCsv = async (file: PickedFile, p: Progress): Promise<ConvertResult> => {
  p(30, 'Reading the sheet');
  const book = XLSX.read(await FileBridge.readBase64(file.uri), {type: 'base64'});
  const csv = XLSX.utils.sheet_to_csv(book.Sheets[book.SheetNames[0]]);
  p(75, 'Saving to Downloads');
  return {
    files: [await save(textToB64(csv), file.name, 'csv')],
    warning: book.SheetNames.length > 1 ? `Only the first sheet, "${book.SheetNames[0]}", was taken.` : undefined,
  };
};

const wordToText = async (file: PickedFile, p: Progress): Promise<ConvertResult> => {
  p(30, 'Reading the document');
  const bytes = b64ToBytes(await FileBridge.readBase64(file.uri));
  const {value} = await mammoth.extractRawText({
    arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  p(80, 'Saving to Downloads');
  return {files: [await save(textToB64(value), file.name, 'txt')]};
};

const extractArchive = async (
  file: PickedFile,
  p: Progress,
  o: ConvertOptions,
): Promise<ConvertResult> => {
  p(12, 'Opening the archive');
  // The native side reports each entry as it lands, so the ring moves on big archives.
  const off = onArchiveProgress(({stage, done, total}) => {
    const share = total > 0 ? done / total : Math.min(done / 60, 1);
    p(12 + Math.round(share * 80), stage);
  });
  try {
    const result = await ArchiveBridge.extract(file.uri, o.password ?? '');
    return {
      files: result.files,
      warning:
        result.files.length > 12
          ? `${result.files.length} files were unpacked into ${result.folder}.`
          : undefined,
    };
  } finally {
    off();
  }
};

// ------------------------------------------------------------ pictures to PDF

/**
 * Pictures onto pages, laid out natively.
 *
 * None of this passes through JavaScript. A PDF of ten camera photos built the way
 * the other converters work — read each file as base64, hand it to a library, let
 * it draw — would be hundreds of megabytes of strings and bitmaps for a job the
 * native side can stream one picture at a time.
 */
const imagesToPdf = async (files: PickedFile[], p: Progress): Promise<ConvertResult> => {
  p(12, 'Reading the pictures');
  const off = onPdfToolsProgress(({done, total, stage}) => {
    p(12 + Math.round((done / Math.max(total, 1)) * 76), stage);
  });
  try {
    const saved = await PdfToolsBridge.imagesToPdf(
      files.map(f => f.uri),
      stripExtension(files[0].name) || 'Pictures',
    );
    p(94, 'Saving to Downloads');
    return {
      files: [saved],
      warning:
        files.length > 20
          ? `${files.length} pictures were put into one PDF, which may take a moment to open.`
          : undefined,
    };
  } finally {
    off();
  }
};

/**
 * The scanner, which is a screen of its own belonging to Google Play services.
 *
 * The progress ring is told to wait rather than to move: everything between here
 * and the result happens in another app, and this app has no idea how long the
 * user will spend lining up a page.
 */
const scanToPdf = async (p: Progress): Promise<ConvertResult> => {
  p(10, 'Opening the scanner');
  const saved = await PdfToolsBridge.scanToPdf(`Scan ${new Date().toISOString().slice(0, 10)}`);
  p(94, 'Saving to Downloads');
  return {files: [saved]};
};

// ------------------------------------------------------------------ PDF tools

/**
 * Runs one native PDF edit with its progress wired to the ring.
 *
 * The native side reports a page or file at a time as it really finishes it, so the
 * ring is only ever as far along as the work is. Everything that is not a page
 * count — opening, saving — is left to the short stretches either side of 12–92.
 */
const withPdfProgress = async (
  p: Progress,
  run: () => Promise<PdfEditResult>,
): Promise<PdfEditResult> => {
  const off = onPdfEditProgress(({done, total, stage}) => {
    p(12 + Math.round((done / Math.max(total, 1)) * 80), stage);
  });
  try {
    return await run();
  } finally {
    off();
  }
};

const text = (o: ConvertOptions, key: string) => String(o.values?.[key] ?? '').trim();
const whole = (o: ConvertOptions, key: string, fallback: number) => {
  const n = parseInt(text(o, key), 10);
  return Number.isFinite(n) ? n : fallback;
};
const choice = (o: ConvertOptions, key: string, fallback: string | number | boolean) => o.values?.[key] ?? fallback;

const human = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const pdfEdit = async (
  tool: Tool,
  files: PickedFile[],
  p: Progress,
  o: ConvertOptions,
): Promise<ConvertResult> => {
  const file = files[0];
  const uri = file.uri;
  const base = stripExtension(file.name) || 'Document';
  const pw = o.password ?? '';
  p(10, 'Opening the PDF');

  const res = await withPdfProgress(p, async () => {
    switch (tool.id) {
      case 'pdf-merge':
        if (files.length < 2) throw new Error('Choose at least two PDFs to merge.');
        return PdfEditBridge.merge(files.map(f => f.uri), base);
      case 'pdf-split':
        return PdfEditBridge.split(
          uri,
          pw,
          String(choice(o, 'mode', 'each')),
          whole(o, 'every', 2),
          text(o, 'ranges'),
          base,
        );
      case 'pdf-delete-pages':
        return PdfEditBridge.deletePages(uri, pw, text(o, 'ranges'), base);
      case 'pdf-rotate':
        return PdfEditBridge.rotate(uri, pw, Number(choice(o, 'degrees', 90)), text(o, 'ranges'), base);
      case 'pdf-page-numbers':
        return PdfEditBridge.pageNumbers(uri, pw, String(choice(o, 'position', 'bottom-center')), whole(o, 'start', 1), base);
      case 'pdf-watermark':
        return PdfEditBridge.watermark(
          uri,
          pw,
          text(o, 'text'),
          Number(choice(o, 'opacity', 25)),
          choice(o, 'diagonal', true) === true,
          base,
        );
      case 'pdf-protect':
        return PdfEditBridge.protect(
          uri,
          pw,
          String(o.values?.newPassword ?? ''),
          choice(o, 'allowPrint', true) === true,
          choice(o, 'allowCopy', false) === true,
          base,
        );
      case 'pdf-unlock':
        return PdfEditBridge.unlock(uri, pw, base);
      case 'pdf-compress':
        return PdfEditBridge.compress(uri, pw, String(choice(o, 'level', 'balanced')), base);
      case 'pdf-to-images':
        return PdfEditBridge.toImages(uri, pw, String(choice(o, 'format', 'jpg')), Number(choice(o, 'dpi', 150)), base);
      case 'pdf-extract-images':
        return PdfEditBridge.extractImages(uri, pw, base);
      case 'pdf-searchable':
        return PdfEditBridge.makeSearchable(uri, pw, base);
      default:
        throw new Error('That tool is not handled here.');
    }
  });

  p(94, 'Saved to Downloads');
  let warning: string | undefined;
  if (tool.id === 'pdf-compress' && res.bytesBefore != null && res.bytesAfter != null) {
    warning =
      res.bytesAfter >= res.bytesBefore
        ? 'This PDF could not be made any smaller — it is mostly text or already compressed — so the original was saved as it is.'
        : `${human(res.bytesBefore)} → ${human(res.bytesAfter)}, ${Math.round((1 - res.bytesAfter / res.bytesBefore) * 100)}% smaller.`;
  } else if (tool.id === 'pdf-searchable' && (res.emptyPages ?? 0) > 0) {
    // Nothing at all found is refused by the native side; this is the pages in between.
    warning = `${res.emptyPages} page${res.emptyPages === 1 ? '' : 's'} had no recognisable text and ${res.emptyPages === 1 ? 'is' : 'are'} not searchable.`;
  } else if (res.files.length > 12) {
    warning = `${res.files.length} files were saved into ${res.folder}.`;
  }
  return {files: res.files, warning};
};

// ------------------------------------------------------------------ image tools

/** Words added to a file's name so a result never overwrites what it came from. */
const IMAGE_SUFFIX: Partial<Record<ToolId, string>> = {
  'image-convert': 'converted',
  'image-resize': 'resized',
  'image-compress': 'compressed',
  'image-crop': 'cropped',
  'image-rotate': 'rotated',
  'image-flip': 'flipped',
  'image-resolution': 'resolution',
  'image-grayscale': 'bw',
};

/**
 * One native job over every picture. The native side reports each picture as it is
 * really finished, so the ring moves one step per picture and no faster.
 */
const imageEdit = async (
  tool: Tool,
  files: PickedFile[],
  p: Progress,
  o: ConvertOptions,
): Promise<ConvertResult> => {
  const uris = files.map(f => f.uri);
  const base = stripExtension(files[0].name) || 'Pictures';
  const off = onImageEditProgress(({done, total, stage}) => {
    p(12 + Math.round((done / Math.max(total, 1)) * 80), stage);
  });
  p(10, 'Opening the pictures');
  try {
    if (tool.id === 'image-ocr') {
      const res = await ImageEditBridge.recognizeText(uris, base);
      p(94, 'Saved to Downloads');
      return {
        files: res.files,
        warning:
          res.count === 0
            ? 'No text was found. The picture may be handwriting, a script other than Latin, or too blurred to read.'
            : undefined,
      };
    }

    const opts: Record<string, string | number | boolean> = {
      suffix: IMAGE_SUFFIX[tool.id] ?? 'edited',
      folder: `${tool.title} pictures`,
      format: String(choice(o, 'format', 'same')),
    };
    switch (tool.id) {
      case 'image-convert':
        opts.quality = Number(choice(o, 'quality', 85));
        break;
      case 'image-resize':
        if (choice(o, 'by', 'percent') === 'pixels') {
          const w = whole(o, 'width', 0);
          const h = whole(o, 'height', 0);
          if (w <= 0 && h <= 0) throw new Error('Type a width, a height, or both.');
          opts.width = w;
          opts.height = h;
          opts.keepAspect = choice(o, 'keepAspect', true) === true;
        } else {
          opts.scale = Number(choice(o, 'scale', 50));
        }
        break;
      case 'image-compress':
        opts.quality = Number(choice(o, 'quality', 70));
        opts.maxEdge = Number(choice(o, 'maxEdge', 0));
        break;
      case 'image-crop':
        opts.aspect = String(choice(o, 'aspect', '1:1'));
        opts.anchor = String(choice(o, 'anchor', 'center'));
        break;
      case 'image-rotate':
        opts.rotate = Number(choice(o, 'rotate', 90));
        break;
      case 'image-flip':
        opts.flipH = choice(o, 'flip', 'h') === 'h';
        opts.flipV = choice(o, 'flip', 'h') === 'v';
        break;
      case 'image-resolution':
        if (choice(o, 'mode', 'pixels') === 'dpi') {
          opts.dpi = Number(choice(o, 'dpi', 300));
          opts.dpiOnly = true;
        } else {
          opts.maxEdge = Number(choice(o, 'maxEdge', 1920));
        }
        break;
      case 'image-grayscale':
        opts.grayscale = true;
        break;
    }

    const res = await ImageEditBridge.process(uris, opts);
    p(94, 'Saved to Downloads');
    let warning: string | undefined;
    if (tool.id === 'image-compress' && res.bytesBefore && res.bytesAfter != null) {
      warning =
        res.bytesAfter >= res.bytesBefore
          ? 'These pictures were already small, so they did not get smaller.'
          : `${human(res.bytesBefore)} → ${human(res.bytesAfter)}, ${Math.round((1 - res.bytesAfter / res.bytesBefore) * 100)}% smaller.`;
    } else if (res.files.length > 12) {
      warning = `${res.files.length} pictures were saved into ${res.folder}.`;
    }
    return {files: res.files, warning};
  } finally {
    off();
  }
};

// ------------------------------------------------------------ audio and video

type MediaOpts = Record<string, string | number | boolean>;

/** "90", "1:30" or "1:02:03.5" as milliseconds. Empty is 0; nonsense is an error. */
const clockToMs = (raw: string, what: string): number => {
  const t = raw.trim();
  if (!t) return 0;
  if (!/^\d+(\.\d+)?(:\d{1,2}(\.\d+)?){0,2}$/.test(t)) {
    throw new Error(`"${t}" is not a time for ${what}. Use seconds, or minutes and seconds such as 1:30.`);
  }
  const parts = t.split(':').map(Number);
  return Math.round(parts.reduce((total, part) => total * 60 + part, 0) * 1000);
};

const MEDIA_SUFFIX: Partial<Record<ToolId, string>> = {
  'video-convert': 'converted',
  'video-compress': 'compressed',
  'video-to-audio': 'audio',
  'video-merge': 'merged',
  'video-trim': 'trimmed',
  'video-rotate': 'rotated',
  'video-resolution': 'resized',
  'video-mute': 'muted',
  'audio-convert': 'converted',
  'audio-compress': 'compressed',
  'audio-trim': 'trimmed',
  'audio-merge': 'merged',
  ringtone: 'ringtone',
  'audio-volume': 'volume',
  'audio-fade': 'faded',
  'audio-bitrate': 'bitrate',
};

/** Compression levels: the tallest picture kept, and the video bit rate aimed for. */
const VIDEO_LEVELS: Record<string, {maxHeight: number; videoBitrate: number}> = {
  light: {maxHeight: 1080, videoBitrate: 4_000_000},
  balanced: {maxHeight: 720, videoBitrate: 2_000_000},
  strong: {maxHeight: 480, videoBitrate: 900_000},
};

/**
 * Audio and video jobs. Most take one file at a time and are repeated for each file
 * the user added; merging takes them all at once. Progress is the real position of
 * the file being worked on, spread across however many files there are.
 */
const mediaEdit = async (
  tool: Tool,
  files: PickedFile[],
  p: Progress,
  o: ConvertOptions,
): Promise<ConvertResult> => {
  const joins = tool.id === 'video-merge' || tool.id === 'audio-merge';
  if (joins && files.length < 2) throw new Error('Choose at least two files to join.');
  const isVideoJob = tool.id.startsWith('video-') && tool.id !== 'video-to-audio';
  const groups = joins ? [files] : files.map(f => [f]);

  let index = 0;
  const off = onMediaEditProgress(({done, total, stage}) => {
    const share = (index + done / Math.max(total, 1)) / groups.length;
    p(12 + Math.round(share * 80), stage);
  });

  const saved: SavedFile[] = [];
  let before = 0;
  let after = 0;
  try {
    for (index = 0; index < groups.length; index++) {
      const group = groups[index];
      const base = stripExtension(group[0].name) || 'Media';
      const opts: MediaOpts = {baseName: base, suffix: MEDIA_SUFFIX[tool.id] ?? 'edited'};
      const format = String(choice(o, 'format', 'mp3'));
      const bitrate = Number(choice(o, 'bitrate', 192000));
      before += group.reduce((sum, f) => sum + f.size, 0);

      switch (tool.id) {
        case 'video-convert':
          opts.maxHeight = Number(choice(o, 'maxHeight', 0));
          break;
        case 'video-compress': {
          const level = VIDEO_LEVELS[String(choice(o, 'level', 'balanced'))] ?? VIDEO_LEVELS.balanced;
          opts.maxHeight = level.maxHeight;
          opts.videoBitrate = level.videoBitrate;
          break;
        }
        case 'video-merge': {
          const tall = Number(choice(o, 'frame', 720));
          const wide = Math.round((tall * 16) / 9 / 2) * 2;
          const portrait = choice(o, 'orientation', 'landscape') === 'portrait';
          opts.mergeWidth = portrait ? tall : wide;
          opts.mergeHeight = portrait ? wide : tall;
          break;
        }
        case 'video-trim': {
          opts.startMs = clockToMs(text(o, 'start'), 'the start');
          opts.endMs = clockToMs(text(o, 'end'), 'the end');
          if (opts.endMs && opts.endMs <= opts.startMs) throw new Error('The end has to be after the start.');
          break;
        }
        case 'video-rotate':
          opts.rotate = Number(choice(o, 'rotate', 90));
          break;
        case 'video-resolution':
          opts.maxHeight = Number(choice(o, 'maxHeight', 720));
          break;
        case 'video-mute':
          opts.mute = true;
          break;
        case 'video-to-audio':
        case 'audio-convert':
        case 'audio-compress':
        case 'audio-merge':
        case 'audio-bitrate':
          opts.format = format;
          opts.bitrate = bitrate;
          break;
        case 'audio-trim': {
          opts.format = format;
          opts.bitrate = bitrate;
          opts.startMs = clockToMs(text(o, 'start'), 'the start');
          opts.endMs = clockToMs(text(o, 'end'), 'the end');
          if (opts.endMs && opts.endMs <= opts.startMs) throw new Error('The end has to be after the start.');
          break;
        }
        case 'ringtone': {
          const start = clockToMs(text(o, 'start'), 'the start');
          opts.format = format;
          opts.bitrate = 192000;
          opts.startMs = start;
          opts.endMs = start + Number(choice(o, 'length', 20000));
          if (choice(o, 'fade', true) === true) {
            opts.fadeInMs = 1500;
            opts.fadeOutMs = 1500;
          }
          break;
        }
        case 'audio-volume':
          opts.format = format;
          opts.bitrate = bitrate;
          opts.volume = Number(choice(o, 'volume', 150)) / 100;
          break;
        case 'audio-fade':
          opts.format = format;
          opts.bitrate = bitrate;
          opts.fadeInMs = Number(choice(o, 'fadeIn', 3)) * 1000;
          opts.fadeOutMs = Number(choice(o, 'fadeOut', 3)) * 1000;
          break;
      }

      p(12 + Math.round((index / groups.length) * 80), `Opening ${base}`);
      const uris = group.map(f => f.uri);
      const res = isVideoJob ? await MediaEditBridge.video(uris, opts) : await MediaEditBridge.audio(uris, opts);
      saved.push(...res.files);
      after += res.bytesAfter ?? 0;
    }
  } finally {
    off();
  }

  p(94, 'Saved to Downloads');
  let warning: string | undefined;
  if (tool.id === 'video-compress' && before > 0 && after > 0) {
    warning =
      after >= before
        ? 'These videos were already small, so they did not get smaller.'
        : `${human(before)} → ${human(after)}, ${Math.round((1 - after / before) * 100)}% smaller.`;
  } else if (tool.id === 'ringtone') {
    warning = 'Saved to Downloads. Open it from there, or pick it in your phone sound settings, to use it as a ringtone.';
  }
  return {files: saved, warning};
};

// ---------------------------------------------------------------------- info

const clockText = (ms: number) => {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
};

export type InfoRow = {label: string; value: string};

/**
 * What a file is, read without changing or saving anything. Pages for a PDF, size for
 * a picture, length and bit rate for sound and video. A row is left out when the file
 * does not have it rather than shown empty.
 */
export async function inspectFile(file: PickedFile, password: string): Promise<InfoRow[]> {
  const name = file.name;
  const ext = (name.includes('.') ? name.split('.').pop() ?? '' : '').toLowerCase();
  const mime = file.mime || '';
  const rows: InfoRow[] = [
    {label: 'Name', value: name},
    {label: 'Type', value: `${ext ? ext.toUpperCase() : 'Unknown'}${mime ? `  ·  ${mime}` : ''}`},
    {label: 'Size', value: file.size ? `${human(file.size)}  (${Math.round(file.size).toLocaleString()} bytes)` : 'Unknown'},
  ];

  const isPdf = mime === 'application/pdf' || ext === 'pdf';
  const isImage = mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp'].includes(ext);
  const isMedia =
    mime.startsWith('audio/') ||
    mime.startsWith('video/') ||
    ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'amr', 'mp4', 'mkv', 'mov', 'webm', '3gp'].includes(ext);

  if (isPdf) {
    rows.push({label: 'Pages', value: String(await FileBridge.pdfPageCount(file.uri, password))});
  } else if (isImage) {
    try {
      const {width, height} = await ImageEditBridge.dimensions(file.uri);
      if (width > 0 && height > 0) rows.push({label: 'Dimensions', value: `${width} × ${height} px`});
    } catch {
      /* A picture format this phone cannot size still has its name and size. */
    }
  } else if (isMedia) {
    try {
      const m = await MediaEditBridge.probe(file.uri);
      if (m.durationMs > 0) rows.push({label: 'Length', value: clockText(m.durationMs)});
      if (m.hasVideo && m.width > 0) rows.push({label: 'Picture', value: `${m.width} × ${m.height} px`});
      if (m.bitrate > 0) rows.push({label: 'Bit rate', value: `${Math.round(m.bitrate / 1000)} kbps`});
      rows.push({label: 'Tracks', value: [m.hasVideo ? 'Video' : '', m.hasAudio ? 'Audio' : ''].filter(Boolean).join(' + ') || 'None found'});
    } catch {
      /* Not readable as media: the basics above are still true. */
    }
  }
  return rows;
}

// ------------------------------------------------------------------ dispatch

export async function convert(
  tool: Tool,
  files: PickedFile[],
  options: ConvertOptions,
  report: Progress,
): Promise<ConvertResult> {
  // Every handler reports through this, so no tool can show the ring more than full or
  // move it backwards, whatever a native count or a stage boundary does: values are held
  // to 0–100 and only ever rise. (The label still follows the latest stage.)
  let furthest = 0;
  const onProgress: Progress = (pc, label) => {
    furthest = Math.max(furthest, Math.min(100, Math.max(0, Number.isFinite(pc) ? pc : 0)));
    report(furthest, label);
  };
  // The scanner makes its own pages, so it is the one tool that starts with
  // nothing to point at.
  if (!files.length && !tool.capture) {
    throw new Error('Choose a file first.');
  }
  const one = files[0];
  onProgress(5, 'Getting ready');

  // make-archive is deliberately absent: it takes many files, a format and a
  // password, so it has its own screen and calls the native writer directly rather
  // than passing through this one-file-in, one-file-out engine.
  const run: Record<Exclude<ToolId, 'make-archive' | 'file-info' | 'view-pdf'>, () => Promise<ConvertResult>> = {
    'pdf-to-word': () => pdfToWord(one, onProgress, options),
    'pdf-to-excel': () => pdfToExcel(one, onProgress, options),
    'pdf-to-text': () => pdfToText(one, onProgress, options),
    'word-to-pdf': () => wordToPdf(one, onProgress),
    'excel-to-pdf': () => sheetToPdf(one, onProgress),
    'slides-to-pdf': () => slidesToPdf(one, onProgress),
    'text-to-pdf': () => textToPdf(one, onProgress),
    'csv-to-excel': () => csvToExcel(one, onProgress),
    'excel-to-csv': () => excelToCsv(one, onProgress),
    'word-to-text': () => wordToText(one, onProgress),
    'image-to-pdf': () => imagesToPdf(files, onProgress),
    'scan-to-pdf': () => scanToPdf(onProgress),
    'extract-archive': () => extractArchive(one, onProgress, options),
    'pdf-merge': () => pdfEdit(tool, files, onProgress, options),
    'pdf-split': () => pdfEdit(tool, files, onProgress, options),
    'pdf-compress': () => pdfEdit(tool, files, onProgress, options),
    'pdf-rotate': () => pdfEdit(tool, files, onProgress, options),
    'pdf-delete-pages': () => pdfEdit(tool, files, onProgress, options),
    'pdf-page-numbers': () => pdfEdit(tool, files, onProgress, options),
    'pdf-watermark': () => pdfEdit(tool, files, onProgress, options),
    'pdf-protect': () => pdfEdit(tool, files, onProgress, options),
    'pdf-unlock': () => pdfEdit(tool, files, onProgress, options),
    'pdf-to-images': () => pdfEdit(tool, files, onProgress, options),
    'pdf-extract-images': () => pdfEdit(tool, files, onProgress, options),
    'pdf-searchable': () => pdfEdit(tool, files, onProgress, options),
    'image-convert': () => imageEdit(tool, files, onProgress, options),
    'image-resize': () => imageEdit(tool, files, onProgress, options),
    'image-compress': () => imageEdit(tool, files, onProgress, options),
    'image-crop': () => imageEdit(tool, files, onProgress, options),
    'image-rotate': () => imageEdit(tool, files, onProgress, options),
    'image-flip': () => imageEdit(tool, files, onProgress, options),
    'image-resolution': () => imageEdit(tool, files, onProgress, options),
    'image-grayscale': () => imageEdit(tool, files, onProgress, options),
    'image-ocr': () => imageEdit(tool, files, onProgress, options),
    'video-convert': () => mediaEdit(tool, files, onProgress, options),
    'video-compress': () => mediaEdit(tool, files, onProgress, options),
    'video-to-audio': () => mediaEdit(tool, files, onProgress, options),
    'video-merge': () => mediaEdit(tool, files, onProgress, options),
    'video-trim': () => mediaEdit(tool, files, onProgress, options),
    'video-rotate': () => mediaEdit(tool, files, onProgress, options),
    'video-resolution': () => mediaEdit(tool, files, onProgress, options),
    'video-mute': () => mediaEdit(tool, files, onProgress, options),
    'audio-convert': () => mediaEdit(tool, files, onProgress, options),
    'audio-compress': () => mediaEdit(tool, files, onProgress, options),
    'audio-trim': () => mediaEdit(tool, files, onProgress, options),
    'audio-merge': () => mediaEdit(tool, files, onProgress, options),
    ringtone: () => mediaEdit(tool, files, onProgress, options),
    'audio-volume': () => mediaEdit(tool, files, onProgress, options),
    'audio-fade': () => mediaEdit(tool, files, onProgress, options),
    'audio-bitrate': () => mediaEdit(tool, files, onProgress, options),
  };

  const step = run[tool.id as keyof typeof run];
  if (!step) throw new Error('That tool is not handled here.');

  const result = await step();
  onProgress(100, 'Done');
  return result;
}
