# File Converter & Zip Extract

Offline document and archive converter for Android. React Native + TypeScript, one Kotlin module for the parts that must be native. Every conversion runs on the device — the app works in airplane mode.

## Run it

```bash
npm install && npx react-native run-android
```

Release build:

```bash
cd android && gradlew bundleRelease
```

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
| PDF | Android's own `PdfRenderer`, page by page, so the real layout is shown |
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
  convert/     catalog of tools + the conversion engine
  native/      typed wrapper over the Kotlin bridge
  services/    ads, billing, quota, history, storage
  hooks/       app-wide state (entitlement, quota, history)
  components/  glyphs, dialogs, buttons, progress ring
  screens/     splash, home, convert, result, premium, history, settings
android/app/src/main/java/com/mps/fileconverter/
  FileBridgeModule.kt   SAF picking, MediaStore saving, PDF text + render, image transcode
```

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
3. `src/screens/SettingsScreen.tsx` — hosted privacy policy and terms URLs.
4. `android/app/build.gradle` — bump `versionCode` and `versionName`.

The rest of the release steps are in `docs/PLAY_STORE.md`.

## Design

Palette is "ink on paper, in colour": a quiet paper canvas so each format's ink carries the meaning. The same ink follows a file from the tool card through the progress ring to the result screen. Motion is spring-based and reserved for things the user triggered, plus one orchestrated splash sequence.
