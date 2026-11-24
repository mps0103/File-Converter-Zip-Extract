# File Converter & Zip Extract

Offline file toolbox for Android: documents, PDFs, pictures, audio, video and archives. React Native + TypeScript, with Kotlin modules for the parts that must be native. Every conversion runs on the device — the app works in airplane mode.

## Run it

```bash
npm install && npx react-native run-android
```

Release build:

```bash
cd android && gradlew bundleRelease
```

The release build generates its own JavaScript bundle. A debug build does not: it loads JavaScript from Metro, so run `npx react-native start` (and `adb reverse tcp:8081 tcp:8081` on a USB phone) before opening a debug APK. There is no bundle checked in or kept in `android/app/src/main/assets`.

Copy `android/keystore.properties.example` to `android/keystore.properties` and point it at your upload key first, otherwise the release build is signed with the debug key and Play will reject it.

## How the conversions work

| Tool | Engine | What survives |
| --- | --- | --- |
| PDF → Word | PDFBox text layer → `docx` | Text, paragraphs, page breaks. Not columns, tables or images. |
| PDF → Excel | PDFBox → column split on wide gaps → SheetJS | Works on spaced tables (statements, invoices). Verify the sheet. |
| PDF → text | PDFBox | Everything in the text layer. |
| Word → PDF | `mammoth` → HTML → WebView print | Headings, lists, bold/italic, tables, inline images. Spacing can shift. |
| Excel/CSV → PDF | SheetJS → HTML tables → WebView print | All sheets as tables. No charts or cell colours. |
| Slides → PDF | `jszip` XML read → HTML → PDF | Slide text only. |
| Text/HTML → PDF | WebView print | Full. |
| CSV ↔ Excel | SheetJS | Full for values; formulas save as last computed value. |
| Word → text | `mammoth` | Text only, by design. |
| Extract archive | zip4j, commons-compress, junrar | ZIP (incl. password), 7Z, TAR, TAR.GZ, TGZ, GZ, BZ2, XZ, RAR4. Not RAR5. |
| Make an archive | zip4j, commons-compress | ZIP (optionally AES-encrypted), 7Z, TAR, TAR.GZ, TAR.BZ2, TAR.XZ. Only ZIP carries a password. |
| Images → PDF, Scan → PDF | Android bitmap decoding, PDFBox, Google's document scanner | One picture per A4 page; the scanner finds page edges and straightens them. |
| **PDF tools** | | |
| Merge, Split, Delete pages, Rotate | PDFBox | Pages and content are kept as they are. Merged bookmarks and form fields of later files are not carried over. |
| Page numbers, Watermark | PDFBox, standard Helvetica | Honours each page's rotation. Watermark text is limited to what the standard PDF fonts hold. |
| Add / remove password | PDFBox (AES-128) | Needs the current password to unlock. Nothing guesses or breaks passwords. |
| Compress PDF | PDFBox + Android bitmap re-encoding | Pictures are re-saved as JPEG; text and drawings are untouched. Falls back to the original if nothing is saved. |
| PDF → pictures | Android `PdfRenderer` | JPG or PNG per page, in a folder in Downloads. |
| Extract pictures | PDFBox | Embedded pictures at their stored size; tiny ones (bullets, rules) are skipped. |
| Make searchable | `PdfRenderer` + ML Kit text recognition (bundled) | Invisible text laid over a picture of each page. Latin script only. |
| **Pictures** | | |
| Convert, Resize, Compress, Crop, Rotate, Flip, Black & white | Android bitmap APIs, ExifInterface | EXIF orientation is applied, so a photo taken sideways comes out upright. Large JPEGs are decoded in bands to bound memory. Crop uses fixed shapes, not a drawn box. |
| Change resolution | Bitmap scaling, JFIF / pHYs rewrite | Pixel size, or only the DPI field (JPG and PNG) with no re-encode. |
| Image → text | ML Kit text recognition (bundled model) | Printed Latin text. Several pictures go into one .txt. |
| **Video** | | |
| Convert, Compress, Resolution, Rotate, Mute, Trim, Merge | AndroidX Media3 Transformer (hardware codecs) | Always MP4 (H.264 + AAC). Needs a phone that can decode the source. Trim takes typed times. |
| Video → audio | MediaCodec pipeline + LAME | MP3, M4A or WAV from the sound track. |
| **Audio** | | |
| Convert, Compress, Bit rate, Volume, Fade, Trim, Merge, Ringtone | MediaCodec decode → resample → encode, LAME for MP3 | MP3, M4A, AAC or WAV at 44.1 kHz stereo. An MP3 trimmed to MP3 is copied without re-encoding. |
| File info | MediaMetadataRetriever, PdfRenderer, bitmap bounds | Name, type, size, pages, picture size, length, bit rate. Free: writes nothing. |

Everything that makes a new file saves into `Downloads/` through MediaStore. Tools that make several files (Split, PDF → pictures, Extract pictures, a batch of pictures) put them in their own folder there.

Archives unpack into `Downloads/<archive name>/`, keeping the folder structure inside. Entry
paths that try to escape that folder are rejected.

The app registers as an "Open with" handler for every format it understands. Tapping a ZIP, 7Z,
RAR, TAR, GZ, TGZ, BZ2 or XZ opens it on the Extract archive tool with the file already loaded;
tapping a PDF, Word file, sheet, deck or text file opens it in the viewer. Each is a pair of intent
filters: one on the MIME types, and one on the file extension, for the many file managers that
report anything they do not recognise as `application/octet-stream`.

**Worth knowing before you promise anything in the listing:** PDF → Word is a text rebuild, not a layout rebuild. No offline library on Android reconstructs a PDF's original layout the way a desktop converter does. A scanned PDF has no text layer at all, so the app detects that and says so instead of writing an empty document. If you later want scanned PDFs to work, the next step is ML Kit text recognition with the bundled model, which is also fully offline.

## Viewing

"View a file" on the home screen opens anything the app can convert, read-only and offline.

| Format | Drawn by |
| --- | --- |
| PDF | `react-native-pdf` (pdfium), the same reader the PDF Tools by MPS app uses: all pages in one scroll, native pinch zoom, a page counter that jumps to a page, Swipe/Scroll modes, Share. No Night mode (it needs React Native's new architecture). |
| Word | `mammoth` to HTML in a WebView — headings, bold/italic, lists, tables, inline images |
| Excel / CSV | SheetJS to HTML tables, every sheet, wide sheets scrolling sideways |
| Slides | Slide text only, one card per slide |
| Text / HTML | As written |
| Archives | Table of contents — names and sizes, nothing unpacked |

Viewing costs nothing: it never touches the free-conversion quota. An archive is the one
exception with an action attached — the viewer offers "Extract all files", which runs the
same extraction the tool screen does and therefore does count.

The viewer builds its HTML with the same code the converters use, so a document on screen
matches the PDF the app would produce from it.

## Layout

```
src/
  convert/     catalog of tools (and the home-screen folders) + the conversion engine
  native/      typed wrapper over the Kotlin bridges
  services/    ads, billing, quota, history, storage
  hooks/       app-wide state (entitlement, quota, history, start-up progress)
  components/  glyphs, dialogs, buttons, progress ring, folder and tool cards, loading bar
  screens/     splash, start-up, home, folder, convert, result, premium, history, settings
android/app/src/main/java/com/mps/fileconverter/
  FileBridgeModule.kt   SAF picking, MediaStore saving, PDF text + render
  ArchiveModule.kt      extract and make archives
  PdfToolsModule.kt     pictures → PDF, document scanner
  PdfEditModule.kt      merge, split, rotate, delete, numbers, watermark, passwords, compress, pictures, OCR
  ImageEditModule.kt    every picture tool and picture OCR
  MediaEditModule.kt    every audio and video tool
  Mp3Encoder.kt         JNI bridge to LAME
  DownloadsWriter.kt    one way of saving a result into Downloads
android/app/src/main/cpp/  LAME 3.100 (LGPL) built as libmp3lame.so, 16 KB page aligned
```

Every native module reports real progress as `{stage, done, total}` events (`archiveProgress`, `pdfEditProgress`, `imageEditProgress`, `mediaEditProgress`). The progress ring shows those values and nothing else. The start-up bar after the splash counts finished start-up steps (plan, usage, history, billing, ads).

## Home screen

The home screen is a set of folders — PDF tools, To & from PDF, Pictures, Video, Audio, Documents & sheets, Archives, More — each opening into its own list of tools. A tool belongs to one `group` in `src/convert/catalog.ts`; `FOLDERS` there decides which groups sit in which folder.

## Open-source notices

The PDF reader is `react-native-pdf` 7.0.5 with `react-native-blob-util` 0.24.10, on the AndroidPdfViewer / pdfium libraries (Apache 2.0 / BSD). Their native libraries are 16 KB page aligned on arm64-v8a and x86_64.

The MP3 encoder is LAME 3.100, licensed LGPL. It is built as its own shared library (`libmp3lame.so`) so it stays separately replaceable; its source and licence are in `android/app/src/main/cpp/lame/`.

## Money

- 10 free conversions, counted only when a file is actually written. A failed conversion costs
  nothing. Extracting an archive counts as one; **viewing is always free** and never counted.
- `premium_monthly` (₹149/month) and `premium_lifetime` (₹1899) through Google Play Billing.
  Both prices live in the Play Console, never in the app — the app only ever shows the localised
  price string Play sends back, so changing them here changes nothing until they are changed there.
- Banner anchored at the bottom of the main screens.
- Full-screen ad at most once every 3 actions — a conversion or a file opened in the viewer —
  and never within 2 minutes of the last one. Never for a premium user.

## Replace before the first upload

1. `src/services/ads.ts` — real banner and interstitial unit ids.
2. `android/app/src/main/AndroidManifest.xml` — real AdMob application id.
3. ~~`src/screens/SettingsScreen.tsx` — hosted privacy policy and terms URLs.~~ Done: served by
   GitHub Pages from `docs/`.
4. `android/app/build.gradle` — bump `versionCode` and `versionName`.

The rest of the release steps are in `docs/PLAY_STORE.md`.

## Design

Palette is "ink on paper, in colour": a quiet paper canvas so each format's ink carries the meaning. The same ink follows a file from the tool card through the progress ring to the result screen. Motion is spring-based and reserved for things the user triggered, plus one orchestrated splash sequence.
