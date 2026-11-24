import type {InkName} from '@/theme';

export type ToolId =
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-text'
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'slides-to-pdf'
  | 'text-to-pdf'
  | 'csv-to-excel'
  | 'excel-to-csv'
  | 'word-to-text'
  | 'image-to-pdf'
  | 'scan-to-pdf'
  | 'extract-archive'
  | 'make-archive'
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-compress'
  | 'pdf-rotate'
  | 'pdf-delete-pages'
  | 'pdf-page-numbers'
  | 'pdf-watermark'
  | 'pdf-protect'
  | 'pdf-unlock'
  | 'pdf-to-images'
  | 'pdf-extract-images'
  | 'pdf-searchable'
  | 'image-convert'
  | 'image-resize'
  | 'image-compress'
  | 'image-crop'
  | 'image-rotate'
  | 'image-flip'
  | 'image-resolution'
  | 'image-grayscale'
  | 'image-ocr'
  | 'video-convert'
  | 'video-compress'
  | 'video-to-audio'
  | 'video-merge'
  | 'video-trim'
  | 'video-rotate'
  | 'video-resolution'
  | 'video-mute'
  | 'audio-convert'
  | 'audio-compress'
  | 'audio-trim'
  | 'audio-merge'
  | 'ringtone'
  | 'audio-volume'
  | 'audio-fade'
  | 'audio-bitrate'
  | 'file-info'
  | 'view-pdf';

type Choice = {value: string | number; label: string};

export type OptionValues = Record<string, string | number | boolean>;

/**
 * One setting a tool asks for on its screen. The screen draws it and hands the
 * collected values to the engine, so a tool states what it needs and nothing more.
 */
export type ToolOption =
  | {kind: 'segment'; key: string; label: string; def: string | number; choices: Choice[]; show?: (v: OptionValues) => boolean}
  | {kind: 'text'; key: string; label: string; def?: string; placeholder?: string; secret?: boolean; numeric?: boolean; show?: (v: OptionValues) => boolean}
  | {kind: 'switch'; key: string; label: string; def: boolean; show?: (v: OptionValues) => boolean};

export type Tool = {
  id: ToolId;
  title: string;
  from: string;
  to: string;
  ink: InkName;
  accept: string[];
  multi?: boolean;
  /**
   * True for a tool whose input is not a file on this phone. The scanner makes its
   * own pages with the camera, so its screen offers a button instead of a picker.
   */
  capture?: boolean;
  /** Shown on the tool screen. Says plainly what survives the conversion. */
  note: string;
  group: 'Scan & pictures' | 'From PDF' | 'To PDF' | 'PDF tools' | 'Image tools' | 'Video tools' | 'Audio tools' | 'Documents & sheets' | 'Archives' | 'More';
  /** Settings the tool asks for on its screen. */
  options?: ToolOption[];
  /**
   * The PDF it opens may be locked, so the screen offers a password box. Tools whose
   * id starts with pdf-to- already get one; this is for the rest.
   */
  lockable?: boolean;
  /**
   * Writes nothing, so it never uses up a free conversion and never appears in the
   * history. Its answer is shown on the screen it ran on.
   */
  free?: boolean;
  /** What the password box is for, when "only if the PDF is locked" is the wrong words. */
  passwordLabel?: string;
};

// Settings shared by several audio and video tools.
const audioFormat = (def: string, only?: string[]): ToolOption => ({
  kind: 'segment',
  key: 'format',
  label: 'Save as',
  def,
  choices: [
    {value: 'mp3', label: 'MP3'},
    {value: 'm4a', label: 'M4A'},
    {value: 'aac', label: 'AAC'},
    {value: 'wav', label: 'WAV'},
  ].filter(c => !only || only.includes(c.value as string)),
});

const audioBitrate = (def: number): ToolOption => ({
  kind: 'segment',
  key: 'bitrate',
  label: 'Bit rate',
  def,
  choices: [64, 96, 128, 160, 192, 256, 320].map(k => ({value: k * 1000, label: `${k}k`})),
  // A WAV is uncompressed, so a bit rate means nothing for it.
  show: v => v.format !== 'wav',
});

const startField: ToolOption = {
  kind: 'text',
  key: 'start',
  label: 'Start at',
  def: '0:00',
  placeholder: 'For example 0:30',
};
const endField: ToolOption = {
  kind: 'text',
  key: 'end',
  label: 'End at (leave empty for the end)',
  placeholder: 'For example 1:45',
};

export const TOOLS: Tool[] = [
  {
    id: 'scan-to-pdf',
    title: 'Scan to PDF',
    from: 'Camera',
    to: 'PDF',
    ink: 'pdf',
    accept: [],
    capture: true,
    group: 'Scan & pictures',
    note: 'Finds the edges of the page, straightens it and cleans it up. Add as many pages as you need, then save them as one PDF. The scanner comes from Google Play services, so the app never needs the camera itself.',
  },
  {
    id: 'image-to-pdf',
    title: 'Images to PDF',
    from: 'JPG / PNG',
    to: 'PDF',
    ink: 'pdf',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Scan & pictures',
    note: 'One picture per A4 page, in the order you add them. Pictures are scaled to print size, so a PDF of camera photos stays small enough to email.',
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    from: 'PDF',
    to: 'DOCX',
    ink: 'word',
    accept: ['application/pdf'],
    group: 'From PDF',
    note: 'Keeps the text, paragraphs and page breaks. Columns, tables and images are not rebuilt, and a scanned PDF has no text to take.',
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF to Excel',
    from: 'PDF',
    to: 'XLSX',
    ink: 'excel',
    accept: ['application/pdf'],
    group: 'From PDF',
    note: 'Works on PDFs where table columns are spaced apart, such as statements and invoices. Check the sheet before you use it.',
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to text',
    from: 'PDF',
    to: 'TXT',
    ink: 'text',
    accept: ['application/pdf'],
    group: 'From PDF',
    note: 'Plain text of every page, in reading order.',
  },
  {
    id: 'word-to-pdf',
    title: 'Word to PDF',
    from: 'DOCX',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    group: 'To PDF',
    note: 'Keeps headings, lists, bold and italic, tables and inline images. Page-exact spacing can shift a little.',
  },
  {
    id: 'excel-to-pdf',
    title: 'Excel to PDF',
    from: 'XLSX / CSV',
    to: 'PDF',
    ink: 'pdf',
    accept: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ],
    group: 'To PDF',
    note: 'Every sheet becomes a table in the PDF. Charts and cell colours are not carried over.',
  },
  {
    id: 'slides-to-pdf',
    title: 'Slides to PDF',
    from: 'PPTX',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    group: 'To PDF',
    note: 'Takes the text of each slide, one slide per page. Layout, pictures and themes are not drawn.',
  },
  {
    id: 'text-to-pdf',
    title: 'Text to PDF',
    from: 'TXT / HTML',
    to: 'PDF',
    ink: 'pdf',
    accept: ['text/plain', 'text/html'],
    group: 'To PDF',
    note: 'Clean typeset pages with automatic page breaks.',
  },
  {
    id: 'csv-to-excel',
    title: 'CSV to Excel',
    from: 'CSV',
    to: 'XLSX',
    ink: 'excel',
    accept: ['text/csv', 'text/comma-separated-values', 'text/plain'],
    group: 'Documents & sheets',
    note: 'Rows and columns land in a real worksheet.',
  },
  {
    id: 'excel-to-csv',
    title: 'Excel to CSV',
    from: 'XLSX',
    to: 'CSV',
    ink: 'text',
    accept: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    group: 'Documents & sheets',
    note: 'Takes the first sheet. Formulas are saved as their last calculated value.',
  },
  {
    id: 'word-to-text',
    title: 'Word to text',
    from: 'DOCX',
    to: 'TXT',
    ink: 'text',
    accept: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    group: 'Documents & sheets',
    note: 'Plain text with the formatting stripped out.',
  },
  {
    id: 'extract-archive',
    title: 'Extract archive',
    from: 'ZIP / 7Z / RAR / TAR',
    to: 'Files',
    ink: 'archive',
    accept: [
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
      'application/octet-stream',
    ],
    group: 'Archives',
    note: 'Opens ZIP, 7Z, TAR, TAR.GZ, TGZ, GZ, BZ2, XZ and older RAR files into a folder inside Downloads. Password-protected ZIPs work once you enter the password. RAR5 archives cannot be opened.',
  },
  {
    id: 'make-archive',
    title: 'Make an archive',
    from: 'Any files',
    to: 'ZIP',
    ink: 'archive',
    accept: ['*/*'],
    multi: true,
    group: 'Archives',
    note: 'Packs whatever you choose into one archive. Only a zip can carry a password — 7z and tar have no encryption this app can write.',
  },

  // ------------------------------------------------------------- PDF tools
  {
    id: 'view-pdf',
    title: 'View PDF',
    from: 'PDF',
    to: 'Reader',
    ink: 'pdf',
    accept: ['application/pdf'],
    group: 'PDF tools',
    note: 'Reads a PDF on your phone as it was laid out, with a page counter, jump to any page, pinch to zoom and Share. Nothing is converted or saved.',
  },
  {
    id: 'pdf-merge',
    title: 'Merge PDFs',
    from: 'PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    multi: true,
    group: 'PDF tools',
    note: 'Joins the PDFs in the order you add them. Bookmarks and form fields do not carry over from the later files, and a locked PDF has to be unlocked first.',
  },
  {
    id: 'pdf-split',
    title: 'Split PDF',
    from: 'PDF',
    to: 'PDF files',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Cuts a PDF into one file per page, one per group of pages, or just the pages you name. Several files go into their own folder in Downloads.',
    options: [
      {
        kind: 'segment',
        key: 'mode',
        label: 'Split into',
        def: 'each',
        choices: [
          {value: 'each', label: 'Every page'},
          {value: 'every', label: 'Groups'},
          {value: 'ranges', label: 'Pick pages'},
        ],
      },
      {kind: 'text', key: 'every', label: 'Pages in each file', def: '2', numeric: true, show: v => v.mode === 'every'},
      {kind: 'text', key: 'ranges', label: 'Pages to keep', placeholder: 'For example 1-3, 6, 9-', show: v => v.mode === 'ranges'},
    ],
  },
  {
    id: 'pdf-compress',
    title: 'Compress PDF',
    from: 'PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Saves the pictures inside the PDF again at lower quality. Text and drawings are untouched, so a PDF that is mostly text will not shrink much — you are told when nothing could be saved.',
    options: [
      {
        kind: 'segment',
        key: 'level',
        label: 'Compression',
        def: 'balanced',
        choices: [
          {value: 'light', label: 'Light'},
          {value: 'balanced', label: 'Balanced'},
          {value: 'strong', label: 'Strong'},
        ],
      },
    ],
  },
  {
    id: 'pdf-rotate',
    title: 'Rotate PDF',
    from: 'PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Turns every page, or only the pages you name, and saves the turn into the file. Nothing else about the pages changes.',
    options: [
      {
        kind: 'segment',
        key: 'degrees',
        label: 'Turn',
        def: 90,
        choices: [
          {value: 90, label: '90° right'},
          {value: 180, label: '180°'},
          {value: 270, label: '90° left'},
        ],
      },
      {kind: 'text', key: 'ranges', label: 'Only these pages (optional)', placeholder: 'All pages'},
    ],
  },
  {
    id: 'pdf-delete-pages',
    title: 'Delete pages',
    from: 'PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Removes the pages you name and keeps the rest in order. Your original file is not changed.',
    options: [{kind: 'text', key: 'ranges', label: 'Pages to delete', placeholder: 'For example 2, 5-7'}],
  },
  {
    id: 'pdf-page-numbers',
    title: 'Page numbers',
    from: 'PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Stamps a plain grey number on every page. It does not move existing text, so a number can land on top of a footer already there.',
    options: [
      {
        kind: 'segment',
        key: 'position',
        label: 'Position',
        def: 'bottom-center',
        choices: [
          {value: 'bottom-left', label: 'Left'},
          {value: 'bottom-center', label: 'Centre'},
          {value: 'bottom-right', label: 'Right'},
          {value: 'top-right', label: 'Top'},
        ],
      },
      {kind: 'text', key: 'start', label: 'First number', def: '1', numeric: true},
    ],
  },
  {
    id: 'pdf-watermark',
    title: 'Add watermark',
    from: 'PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Prints text across every page in light grey. Text only, and only letters and symbols the standard PDF fonts hold, so no emoji or non-Latin scripts. Anyone with a PDF editor can remove it again.',
    options: [
      {kind: 'text', key: 'text', label: 'Watermark text', placeholder: 'For example CONFIDENTIAL'},
      {
        kind: 'segment',
        key: 'opacity',
        label: 'Strength',
        def: 25,
        choices: [
          {value: 15, label: 'Faint'},
          {value: 25, label: 'Light'},
          {value: 40, label: 'Medium'},
          {value: 60, label: 'Strong'},
        ],
      },
      {kind: 'switch', key: 'diagonal', label: 'Run it diagonally', def: true},
    ],
  },
  {
    id: 'pdf-protect',
    title: 'Add password',
    from: 'PDF',
    to: 'Locked PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Encrypts the PDF with AES-128 so it asks for a password to open. If you lose the password there is no way back in, and this app cannot recover it.',
    options: [
      {kind: 'text', key: 'newPassword', label: 'Password to set', placeholder: 'At least 4 characters', secret: true},
      {kind: 'switch', key: 'allowPrint', label: 'Allow printing', def: true},
      {kind: 'switch', key: 'allowCopy', label: 'Allow copying text', def: false},
    ],
  },
  {
    id: 'pdf-unlock',
    title: 'Remove password',
    from: 'Locked PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    passwordLabel: 'Current password of the PDF',
    group: 'PDF tools',
    note: 'Saves an unlocked copy. You need the password that opens the file — this does not break or guess passwords.',
  },
  {
    id: 'pdf-to-images',
    title: 'PDF to pictures',
    from: 'PDF',
    to: 'JPG / PNG',
    ink: 'image',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Draws every page as a picture, into a folder in Downloads. Text stops being text in the result, so it can no longer be selected.',
    options: [
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'jpg',
        choices: [
          {value: 'jpg', label: 'JPG'},
          {value: 'png', label: 'PNG'},
        ],
      },
      {
        kind: 'segment',
        key: 'dpi',
        label: 'Detail',
        def: 150,
        choices: [
          {value: 96, label: 'Screen'},
          {value: 150, label: 'Good'},
          {value: 220, label: 'Print'},
        ],
      },
    ],
  },
  {
    id: 'pdf-extract-images',
    title: 'Extract pictures',
    from: 'PDF',
    to: 'JPG / PNG',
    ink: 'image',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Takes out the pictures stored inside the PDF, not pages drawn as pictures. Very small ones such as lines and bullets are skipped, and anything drawn as vector art is not a picture to take out.',
  },
  {
    id: 'pdf-searchable',
    title: 'Make searchable',
    from: 'Scanned PDF',
    to: 'PDF',
    ink: 'pdf',
    accept: ['application/pdf'],
    lockable: true,
    group: 'PDF tools',
    note: 'Reads the text on each page and lays it invisibly over a picture of the page, so a scan can be searched and copied. The reading happens on your phone with a model that is part of this app, so nothing is uploaded. Latin-script text only; handwriting, columns and tables are read loosely, and the result is usually larger than the original.',
  },
  {
    id: 'image-convert',
    title: 'Image converter',
    from: 'JPG / PNG / WEBP / HEIC',
    to: 'JPG / PNG / WEBP',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Changes the format of every picture you add. A PNG with transparency saved as JPG gets a white background, and photo details such as location and camera are not carried into the new file.',
    options: [
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'jpg',
        choices: [
          {value: 'jpg', label: 'JPG'},
          {value: 'png', label: 'PNG'},
          {value: 'webp', label: 'WEBP'},
        ],
      },
      {
        kind: 'segment',
        key: 'quality',
        label: 'Quality',
        def: 85,
        choices: [
          {value: 50, label: 'Small'},
          {value: 70, label: 'Good'},
          {value: 85, label: 'High'},
          {value: 95, label: 'Best'},
        ],
      },
    ],
  },
  {
    id: 'image-resize',
    title: 'Resize image',
    from: 'Pictures',
    to: 'Pictures',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Scales pictures by a percentage or to an exact size in pixels. Making a picture bigger does not add detail — it only stretches what is there.',
    options: [
      {
        kind: 'segment',
        key: 'by',
        label: 'Resize by',
        def: 'percent',
        choices: [
          {value: 'percent', label: 'Percent'},
          {value: 'pixels', label: 'Pixels'},
        ],
      },
      {
        kind: 'segment',
        key: 'scale',
        label: 'Size',
        def: 50,
        choices: [
          {value: 25, label: '25%'},
          {value: 50, label: '50%'},
          {value: 75, label: '75%'},
          {value: 150, label: '150%'},
          {value: 200, label: '200%'},
        ],
        show: v => v.by === 'percent',
      },
      {kind: 'text', key: 'width', label: 'Width (px)', placeholder: 'Automatic', numeric: true, show: v => v.by === 'pixels'},
      {kind: 'text', key: 'height', label: 'Height (px)', placeholder: 'Automatic', numeric: true, show: v => v.by === 'pixels'},
      {kind: 'switch', key: 'keepAspect', label: 'Keep proportions', def: true, show: v => v.by === 'pixels'},
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'same',
        choices: [
          {value: 'same', label: 'Same'},
          {value: 'jpg', label: 'JPG'},
          {value: 'png', label: 'PNG'},
          {value: 'webp', label: 'WEBP'},
        ],
      },
    ],
  },
  {
    id: 'image-compress',
    title: 'Compress image',
    from: 'Pictures',
    to: 'JPG / WEBP',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Makes pictures smaller on disk by saving them again at lower quality, and optionally at a smaller size. Quality is lost for good, so keep your originals. A PNG is saved as JPG or WEBP, which drops transparency.',
    options: [
      {
        kind: 'segment',
        key: 'quality',
        label: 'Quality',
        def: 70,
        choices: [
          {value: 50, label: 'Small'},
          {value: 70, label: 'Good'},
          {value: 85, label: 'High'},
          {value: 95, label: 'Best'},
        ],
      },
      {
        kind: 'segment',
        key: 'maxEdge',
        label: 'Longest side',
        def: 0,
        choices: [
          {value: 0, label: 'Keep'},
          {value: 2560, label: '2560'},
          {value: 1920, label: '1920'},
          {value: 1280, label: '1280'},
        ],
      },
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'jpg',
        choices: [
          {value: 'jpg', label: 'JPG'},
          {value: 'webp', label: 'WEBP'},
        ],
      },
    ],
  },
  {
    id: 'image-crop',
    title: 'Crop image',
    from: 'Pictures',
    to: 'Pictures',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Cuts each picture to a shape you choose, such as a square or 16:9, and keeps the part you pick. There is no hand-drawn crop box — the shape is fixed and the same cut is applied to every picture.',
    options: [
      {
        kind: 'segment',
        key: 'aspect',
        label: 'Shape',
        def: '1:1',
        choices: [
          {value: '1:1', label: '1:1'},
          {value: '4:3', label: '4:3'},
          {value: '3:4', label: '3:4'},
          {value: '16:9', label: '16:9'},
          {value: '9:16', label: '9:16'},
          {value: '3:2', label: '3:2'},
          {value: '2:3', label: '2:3'},
        ],
      },
      {
        kind: 'segment',
        key: 'anchor',
        label: 'Keep the',
        def: 'center',
        choices: [
          {value: 'center', label: 'Middle'},
          {value: 'top', label: 'Top'},
          {value: 'bottom', label: 'Bottom'},
          {value: 'left', label: 'Left'},
          {value: 'right', label: 'Right'},
        ],
      },
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'same',
        choices: [
          {value: 'same', label: 'Same'},
          {value: 'jpg', label: 'JPG'},
          {value: 'png', label: 'PNG'},
          {value: 'webp', label: 'WEBP'},
        ],
      },
    ],
  },
  {
    id: 'image-rotate',
    title: 'Rotate image',
    from: 'Pictures',
    to: 'Pictures',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Turns pictures a quarter or half turn. Photos taken sideways are already straightened first, so this turns them from how they look, not how the camera stored them.',
    options: [
      {
        kind: 'segment',
        key: 'rotate',
        label: 'Turn',
        def: 90,
        choices: [
          {value: 90, label: '90° right'},
          {value: 180, label: '180°'},
          {value: 270, label: '90° left'},
        ],
      },
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'same',
        choices: [
          {value: 'same', label: 'Same'},
          {value: 'jpg', label: 'JPG'},
          {value: 'png', label: 'PNG'},
          {value: 'webp', label: 'WEBP'},
        ],
      },
    ],
  },
  {
    id: 'image-flip',
    title: 'Flip image',
    from: 'Pictures',
    to: 'Pictures',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Mirrors pictures left to right or top to bottom.',
    options: [
      {
        kind: 'segment',
        key: 'flip',
        label: 'Flip',
        def: 'h',
        choices: [
          {value: 'h', label: 'Left to right'},
          {value: 'v', label: 'Top to bottom'},
        ],
      },
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'same',
        choices: [
          {value: 'same', label: 'Same'},
          {value: 'jpg', label: 'JPG'},
          {value: 'png', label: 'PNG'},
          {value: 'webp', label: 'WEBP'},
        ],
      },
    ],
  },
  {
    id: 'image-resolution',
    title: 'Change resolution',
    from: 'Pictures',
    to: 'Pictures',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Either changes the pixel size to a standard width, or only rewrites the DPI number stored in the file without touching a single pixel. DPI only works for JPG and PNG, and it changes how big a print comes out, not how sharp it is.',
    options: [
      {
        kind: 'segment',
        key: 'mode',
        label: 'Change',
        def: 'pixels',
        choices: [
          {value: 'pixels', label: 'Pixel size'},
          {value: 'dpi', label: 'DPI only'},
        ],
      },
      {
        kind: 'segment',
        key: 'maxEdge',
        label: 'Longest side',
        def: 1920,
        choices: [
          {value: 640, label: '640'},
          {value: 1280, label: 'HD'},
          {value: 1920, label: 'Full HD'},
          {value: 2560, label: '2K'},
          {value: 3840, label: '4K'},
        ],
        show: v => v.mode === 'pixels',
      },
      {
        kind: 'segment',
        key: 'dpi',
        label: 'Dots per inch',
        def: 300,
        choices: [
          {value: 72, label: '72'},
          {value: 96, label: '96'},
          {value: 150, label: '150'},
          {value: 300, label: '300'},
          {value: 600, label: '600'},
        ],
        show: v => v.mode === 'dpi',
      },
    ],
  },
  {
    id: 'image-grayscale',
    title: 'Black & white',
    from: 'Pictures',
    to: 'Pictures',
    ink: 'image',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Turns colour pictures to greys. The original is not changed, and the colour cannot be brought back from the new file.',
    options: [
      {
        kind: 'segment',
        key: 'format',
        label: 'Save as',
        def: 'same',
        choices: [
          {value: 'same', label: 'Same'},
          {value: 'jpg', label: 'JPG'},
          {value: 'png', label: 'PNG'},
          {value: 'webp', label: 'WEBP'},
        ],
      },
    ],
  },
  {
    id: 'image-ocr',
    title: 'Image to text',
    from: 'Pictures',
    to: 'TXT',
    ink: 'text',
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/*'],
    multi: true,
    group: 'Image tools',
    note: 'Reads printed text from pictures on your phone with a model that is part of this app, so nothing is uploaded. Latin-script text only; handwriting, curved text and busy backgrounds are read poorly. Several pictures go into one text file.',
  },
  {
    id: 'video-convert',
    title: 'Video converter',
    from: 'MKV / MOV / WEBM / 3GP',
    to: 'MP4',
    ink: 'slides',
    accept: ['video/*'],
    multi: true,
    options: [
      {
        kind: 'segment',
        key: 'maxHeight',
        label: 'Size',
        def: 0,
        choices: [{value: 0, label: 'Same'}, {value: 480, label: '480p'}, {value: 720, label: '720p'}, {value: 1080, label: '1080p'}],
      },
    ],
    group: 'Video tools',
    note: 'Re-encodes videos as MP4 (H.264 with AAC sound), which plays almost everywhere. Subtitles and extra audio tracks are not carried over. This phone has to be able to read the original format, and long videos can take a few minutes.',
  },
  {
    id: 'video-compress',
    title: 'Compress video',
    from: 'Video',
    to: 'MP4',
    ink: 'slides',
    accept: ['video/*'],
    multi: true,
    options: [
      {
        kind: 'segment',
        key: 'level',
        label: 'Compression',
        def: 'balanced',
        choices: [{value: 'light', label: 'Light'}, {value: 'balanced', label: 'Balanced'}, {value: 'strong', label: 'Strong'}],
      },
    ],
    group: 'Video tools',
    note: 'Makes videos smaller by saving them again at a lower size and bit rate. Quality drops with each step, the result is always MP4, and the original is not changed. Strong is for sending over chat; Light keeps most of the detail.',
  },
  {
    id: 'video-to-audio',
    title: 'Video to audio',
    from: 'Video',
    to: 'MP3 / M4A / WAV',
    ink: 'slides',
    accept: ['video/*'],
    multi: true,
    options: [
      audioFormat('mp3', ['mp3', 'm4a', 'wav']),
      audioBitrate(192000),
    ],
    group: 'Video tools',
    note: 'Takes the sound out of a video and saves it as an audio file. A video with no sound track cannot be converted. WAV is large because it is uncompressed.',
  },
  {
    id: 'video-merge',
    title: 'Merge videos',
    from: 'Videos',
    to: 'MP4',
    ink: 'slides',
    accept: ['video/*'],
    multi: true,
    options: [
      {
        kind: 'segment',
        key: 'frame',
        label: 'Frame size',
        def: 720,
        choices: [{value: 480, label: '480p'}, {value: 720, label: '720p'}, {value: 1080, label: '1080p'}],
      },
      {
        kind: 'segment',
        key: 'orientation',
        label: 'Shape',
        def: 'landscape',
        choices: [{value: 'landscape', label: 'Wide'}, {value: 'portrait', label: 'Tall'}],
      },
    ],
    group: 'Video tools',
    note: 'Joins videos one after another in the order you add them, all fitted into one frame size with black bars where the shapes differ. The result is always MP4, and every clip is re-encoded, so it takes about as long as the clips play.',
  },
  {
    id: 'video-trim',
    title: 'Trim video',
    from: 'Video',
    to: 'MP4',
    ink: 'slides',
    accept: ['video/*'],
    options: [
      startField,
      endField,
    ],
    group: 'Video tools',
    note: 'Keeps the part between the start and end you type, as minutes and seconds. There is no scrubber here — type times like 0:30 or 1:45. The cut is re-encoded, so it is exact but not instant.',
  },
  {
    id: 'video-rotate',
    title: 'Rotate video',
    from: 'Video',
    to: 'MP4',
    ink: 'slides',
    accept: ['video/*'],
    multi: true,
    options: [
      {
        kind: 'segment',
        key: 'rotate',
        label: 'Turn',
        def: 90,
        choices: [{value: 90, label: '90° left'}, {value: 180, label: '180°'}, {value: 270, label: '90° right'}],
      },
    ],
    group: 'Video tools',
    note: 'Turns the picture and saves a new MP4. The original is not changed. The turn is built into the pixels, so players do not need to read a rotation flag.',
  },
  {
    id: 'video-resolution',
    title: 'Change resolution',
    from: 'Video',
    to: 'MP4',
    ink: 'slides',
    accept: ['video/*'],
    multi: true,
    options: [
      {
        kind: 'segment',
        key: 'maxHeight',
        label: 'Height',
        def: 720,
        choices: [{value: 360, label: '360p'}, {value: 480, label: '480p'}, {value: 720, label: '720p'}, {value: 1080, label: '1080p'}, {value: 1440, label: '2K'}, {value: 2160, label: '4K'}],
      },
    ],
    group: 'Video tools',
    note: 'Scales the video to a standard height, keeping its shape. Going up in size does not add detail, and this phone has to be able to encode the size you pick.',
  },
  {
    id: 'video-mute',
    title: 'Mute video',
    from: 'Video',
    to: 'MP4',
    ink: 'slides',
    accept: ['video/*'],
    multi: true,
    group: 'Video tools',
    note: 'Removes the sound and saves a silent MP4. The picture is re-encoded.',
  },
  {
    id: 'audio-convert',
    title: 'Audio converter',
    from: 'MP3 / M4A / WAV / FLAC / OGG',
    to: 'MP3 / M4A / AAC / WAV',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    multi: true,
    options: [
      audioFormat('mp3'),
      audioBitrate(192000),
    ],
    group: 'Audio tools',
    note: 'Converts any sound this phone can play to MP3, M4A, AAC or WAV, at 44.1 kHz stereo. Tags and cover art are not carried over, and a lossy file converted to WAV does not regain quality.',
  },
  {
    id: 'audio-compress',
    title: 'Compress audio',
    from: 'Audio',
    to: 'MP3 / M4A',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    multi: true,
    options: [
      audioFormat('mp3', ['mp3', 'm4a']),
      {
        kind: 'segment',
        key: 'bitrate',
        label: 'Bit rate',
        def: 96000,
        choices: [48, 64, 96, 128, 160].map(k => ({value: k * 1000, label: `${k}k`})),
      },
    ],
    group: 'Audio tools',
    note: 'Makes audio files smaller by saving them again at a lower bit rate. A voice recording stays clear at 64k; music wants 128k or more. Quality that is lost cannot be recovered.',
  },
  {
    id: 'audio-trim',
    title: 'Trim audio',
    from: 'Audio',
    to: 'MP3 / M4A / WAV',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    options: [
      startField,
      endField,
      audioFormat('mp3', ['mp3', 'm4a', 'wav']),
      audioBitrate(192000),
    ],
    group: 'Audio tools',
    note: 'Keeps the part between the start and end you type, as minutes and seconds. An MP3 cut to MP3 is copied without re-encoding, so it loses nothing; any other cut is re-encoded.',
  },
  {
    id: 'audio-merge',
    title: 'Merge audio',
    from: 'Audio',
    to: 'MP3 / M4A / WAV',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    multi: true,
    options: [
      audioFormat('mp3', ['mp3', 'm4a', 'wav']),
      audioBitrate(192000),
    ],
    group: 'Audio tools',
    note: 'Joins audio files one after another in the order you add them, with no gap or crossfade between them. Every file is converted to 44.1 kHz stereo first.',
  },
  {
    id: 'ringtone',
    title: 'Ringtone maker',
    from: 'Song',
    to: 'M4A / MP3',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    options: [
      startField,
      {
        kind: 'segment',
        key: 'length',
        label: 'Length',
        def: 20000,
        choices: [{value: 15000, label: '15 s'}, {value: 20000, label: '20 s'}, {value: 30000, label: '30 s'}, {value: 40000, label: '40 s'}],
      },
      {kind: 'switch', key: 'fade', label: 'Fade in and out', def: true},
      audioFormat('m4a', ['mp3', 'm4a']),
    ],
    group: 'Audio tools',
    note: 'Cuts a short part out of a song to use as a ringtone. This saves the file to Downloads only; to set it as your ringtone, open it from there or pick it in the sound settings of your phone.',
  },
  {
    id: 'audio-volume',
    title: 'Adjust volume',
    from: 'Audio',
    to: 'MP3 / M4A / WAV',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    multi: true,
    options: [
      {
        kind: 'segment',
        key: 'volume',
        label: 'Volume',
        def: 150,
        choices: [{value: 50, label: '50%'}, {value: 75, label: '75%'}, {value: 125, label: '125%'}, {value: 150, label: '150%'}, {value: 200, label: '200%'}, {value: 300, label: '300%'}],
      },
      audioFormat('mp3', ['mp3', 'm4a', 'wav']),
      audioBitrate(192000),
    ],
    group: 'Audio tools',
    note: 'Makes the sound quieter or louder. Turning it up past what the recording allows makes it distort, and that cannot be undone from the new file.',
  },
  {
    id: 'audio-fade',
    title: 'Fade in / out',
    from: 'Audio',
    to: 'MP3 / M4A / WAV',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    multi: true,
    options: [
      {
        kind: 'segment',
        key: 'fadeIn',
        label: 'Fade in',
        def: 3,
        choices: [{value: 0, label: 'None'}, {value: 1, label: '1 s'}, {value: 2, label: '2 s'}, {value: 3, label: '3 s'}, {value: 5, label: '5 s'}, {value: 10, label: '10 s'}],
      },
      {
        kind: 'segment',
        key: 'fadeOut',
        label: 'Fade out',
        def: 3,
        choices: [{value: 0, label: 'None'}, {value: 1, label: '1 s'}, {value: 2, label: '2 s'}, {value: 3, label: '3 s'}, {value: 5, label: '5 s'}, {value: 10, label: '10 s'}],
      },
      audioFormat('mp3', ['mp3', 'm4a', 'wav']),
      audioBitrate(192000),
    ],
    group: 'Audio tools',
    note: 'Ramps the sound up at the start and down at the end, so it does not begin or stop abruptly.',
  },
  {
    id: 'audio-bitrate',
    title: 'Bit rate changer',
    from: 'Audio',
    to: 'MP3 / M4A',
    ink: 'excel',
    accept: ['audio/*', 'video/*'],
    multi: true,
    options: [
      audioFormat('mp3', ['mp3', 'm4a']),
      audioBitrate(192000),
    ],
    group: 'Audio tools',
    note: 'Saves the audio again at the bit rate you pick. Raising it does not bring back quality the file has already lost; it only makes the file bigger.',
  },
  {
    id: 'file-info',
    title: 'File info',
    from: 'Any file',
    to: 'Details',
    ink: 'text',
    accept: ['*/*'],
    free: true,
    lockable: true,
    group: 'More',
    note: 'Shows the name, type and size of any file, plus pages for a PDF, picture size for an image, and length, size and bit rate for audio and video. Nothing is saved and it does not use up a free conversion.',
  },
];

export const GROUPS: Tool['group'][] = [
  'Scan & pictures',
  'From PDF',
  'To PDF',
  'PDF tools',
  'Image tools',
  'Video tools',
  'Audio tools',
  'Documents & sheets',
  'Archives',
  'More',
];

/**
 * The folders on the home screen. A folder opens into the list of its tools.
 *
 * A folder is a set of groups, not a second field on every tool, so a tool still
 * names the one group it belongs to and the dashboard decides how groups are shelved.
 */
export type Folder = {
  id: string;
  title: string;
  blurb: string;
  ink: InkName;
  /** The short label on the folder's glyph. */
  glyph: string;
  groups: Tool['group'][];
};

export const FOLDERS: Folder[] = [
  {id: 'pdf', title: 'PDF tools', blurb: 'Merge, split, compress, lock and read scans', ink: 'pdf', glyph: 'PDF', groups: ['PDF tools']},
  {id: 'to-from-pdf', title: 'To & from PDF', blurb: 'Word, Excel, slides, text and pictures', ink: 'word', glyph: 'PDF', groups: ['To PDF', 'From PDF']},
  {id: 'pictures', title: 'Pictures', blurb: 'Scan, convert, resize, compress and read text', ink: 'image', glyph: 'IMG', groups: ['Scan & pictures', 'Image tools']},
  {id: 'video', title: 'Video', blurb: 'Convert, compress, trim, merge and rotate', ink: 'slides', glyph: 'MP4', groups: ['Video tools']},
  {id: 'audio', title: 'Audio', blurb: 'Convert, trim, merge, ringtones and volume', ink: 'excel', glyph: 'MP3', groups: ['Audio tools']},
  {id: 'documents', title: 'Documents & sheets', blurb: 'CSV, Excel and Word to text and back', ink: 'text', glyph: 'DOC', groups: ['Documents & sheets']},
  {id: 'archives', title: 'Archives', blurb: 'Open and make ZIP, 7Z, TAR and more', ink: 'archive', glyph: 'ZIP', groups: ['Archives']},
  {id: 'more', title: 'More', blurb: 'Look inside any file', ink: 'text', glyph: 'INFO', groups: ['More']},
];

export const toolsInFolder = (folder: Folder) => TOOLS.filter(t => folder.groups.includes(t.group));

/** What kind of file a tool can be pointed at, for the "Open with" screen. */
export type FileKind = 'image' | 'audio' | 'video' | 'pdf';

/**
 * The tools that can take a file of this kind. Tools that take anything (File info)
 * are included; archive tools are not, since they read archives and nothing else.
 */
export const toolsForKind = (kind: FileKind) =>
  TOOLS.filter(
    t =>
      !t.capture &&
      t.id !== 'make-archive' &&
      t.id !== 'extract-archive' &&
      t.id !== 'view-pdf' &&
      t.accept.some(a => a === '*/*' || a === `${kind}/*` || (kind === 'pdf' && a === 'application/pdf')),
  );

export const toolById = (id: ToolId) => TOOLS.find(t => t.id === id)!;

export const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  jpg: 'image/jpeg',
  png: 'image/png',
};
