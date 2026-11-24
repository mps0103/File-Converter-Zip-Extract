# Play Console setup — File Converter & Zip Extract

Package: `com.mps.fileconverter` · Category: Tools · Content rating target: Everyone

## 1. Store listing

**App name (30 char max)**
`File Converter: PDF Word Zip`

**Short description (80 char max, this one is 72)**
`53 offline tools: PDF, image, video, audio and ZIP. Nothing is uploaded.`

**Full description (4000 char max, this one is 2,083)**

```
Convert, edit and compress your files without sending them anywhere.

File Converter & Zip Extract is 53 tools in one app, and every one runs on your phone. Turn on airplane mode and it still works. Nothing is uploaded, so nothing can leak.

Tools are sorted into folders: PDF tools, To & from PDF, Pictures, Video, Audio, Documents & sheets and Archives. Open a photo, song, video or PDF from any app and choose "File Converter" to see only the tools that fit it.

PDF TOOLS
• Merge, split, rotate and delete pages
• Add page numbers and watermarks
• Lock a PDF with a password, or remove one you know
• Compress a PDF, turn pages into pictures, pull out the pictures inside
• Make a scanned PDF searchable — the text is read on your phone
• A built-in reader: pinch to zoom, jump to a page, open locked files

CONVERT DOCUMENTS
• PDF to Word, Excel or text
• Word, Excel, CSV, PowerPoint slides and text to PDF
• Scan paper with the camera, or turn photos into a PDF

PICTURES
• Convert between JPG, PNG, WEBP and HEIC
• Resize, compress, crop, rotate, flip, make black and white
• Change resolution or DPI
• Read text out of a picture

VIDEO
• Convert to MP4, compress, change resolution
• Trim, merge, rotate, mute, or take the sound out as MP3

AUDIO
• Convert between MP3, M4A, AAC and WAV
• Trim, merge, change volume, fade in and out, change bit rate
• Make a ringtone from any song

ARCHIVES
• Open ZIP, 7Z, TAR, TAR.GZ, GZ, BZ2, XZ and older RAR files, including password-protected ZIPs
• Make ZIP, 7Z and TAR archives

WHERE FILES GO
Every result is saved to your Downloads folder, with the original left untouched. Open or share it from the app, or find it later in any file manager.

HONEST ABOUT QUALITY
Each tool says plainly what carries over before you start. If a scan has no readable text, we tell you instead of handing you an empty file. Video and audio need a phone that can read the original format.

FREE AND PREMIUM
Start with 10 free conversions. Premium removes the limit and every ad, monthly or as a single one-time payment.

Questions: info@dealtrix.com
```

**What's new in 2.0.0 (500 char max, this is 454)**

```
2.0.0 is the biggest update yet: 53 tools, all offline.
• New: image tools (convert, resize, compress, crop, rotate, read text)
• New: video tools (convert, compress, trim, merge, rotate, mute)
• New: audio tools (MP3, trim, merge, volume, fade, ringtones)
• New: PDF page numbers, watermark, searchable scans, pictures out of PDFs
• Tools sorted into folders, and a PDF reader that opens locked files
• Open With: send any photo, song, video or PDF here
```

**Graphics to prepare**
- App icon 512×512 — `assets/play-store-icon-512.png`
- Feature graphic 1024×500
- Phone screenshots: 8, in the order below

**Screenshot plan** (portrait, light theme except where noted; use a clean phone with no personal files visible)

| # | Capture | Caption to burn on it |
| --- | --- | --- |
| 1 | Home: the folder grid with the bottom tab bar | 53 tools. Nothing leaves your phone. |
| 2 | PDF tools folder open, tiles showing | Merge, split, lock and read PDFs |
| 3 | A tool screen mid-way: Compress video with its options and a chosen file | Shrink big videos in one tap |
| 4 | Progress ring part-way on a conversion | Works offline — even in airplane mode |
| 5 | Pictures folder (or Convert image with format chips) | Convert, resize and crop photos |
| 6 | Open With screen after sharing a photo or song from a gallery | Open any file straight from any app |
| 7 | PDF reader showing a page with "Page 3 / 12" | Read and zoom PDFs, locked ones too |
| 8 | Result screen: "Saved to Downloads" (dark theme) | Saved to Downloads. Original untouched. |

Captions: 5 to 7 words, white text on a dark band at the top, one idea per screenshot. Avoid ads in frame — capture with a premium test entitlement or on a screen with no banner.

## 2. Products to create

| Type | Product ID | Base plan | Price |
| --- | --- | --- | --- |
| Subscription | `premium_monthly` | `monthly-49` | ₹149 / month |
| One-time product | `premium_lifetime` | — | ₹1899 |

The base plan id stays `monthly-49` because it is matched verbatim by `SUB_BASE_PLAN` in
`src/services/billing.ts`. Renaming it in the Play Console breaks the lookup unless that
constant is changed in the same commit — the digits in it are part of an identifier, not a price.

These ids must match `src/services/billing.ts` exactly, or the paywall loads empty. Activate both products before uploading the build, or internal testers will see no plans.

## 3. Data safety form

| Question | Answer |
| --- | --- |
| Does the app collect or share user data? | Yes |
| Data types collected | Device or other IDs (advertising ID); App activity → app interactions |
| Purpose | Advertising or marketing; Analytics (ad measurement only) |
| Collected or shared? | Shared with Google AdMob |
| Is collection optional? | Yes, in regions where the consent form applies |
| Is data encrypted in transit? | Yes |
| Can users request deletion? | Yes — via the in-app ad privacy choices and by uninstalling |
| Files the user converts | Not collected. Processed on the device only. State this in the review notes. |

## 4. Other console sections

- **Privacy policy URL** — https://mps0103.github.io/File-Converter-Zip-Extract/privacy-policy.html

  Served by GitHub Pages from this repo's `docs/` folder. Jekyll renders each markdown file to
  `.html`, so the extension is part of the address — dropping it gives a 404. The same pair is
  hard-coded in `src/screens/SettingsScreen.tsx`; change one and the other has to follow.

  Terms of use: https://mps0103.github.io/File-Converter-Zip-Extract/terms-of-use.html
- **Ads declaration** — Yes, the app contains ads.
- **Content rating questionnaire** — no sensitive content; declare that ads are shown.
- **Target audience** — 13+. Do not tick the children's section; the app uses an advertising ID.
- **Government apps / financial features** — no.
- **App access** — no login needed; all features reachable without an account.
- **app-ads.txt** — already served from https://mps0103.github.io; add this app's entry if it is not covered.

## 5. Before each upload

1. Replace both test ad unit ids and the AdMob app id with the real ones (`src/services/ads.ts`, `AndroidManifest.xml`).
2. Bump `versionCode` and `versionName` in `android/app/build.gradle` — once, at the end of a batch of changes.
3. `npx tsc --noEmit` and confirm the app runs on a real device in airplane mode, with each folder opened and at least one tool run from every folder.
4. `cd android && gradlew bundleRelease` and upload `android/app/build/outputs/bundle/release/app-release.aab`.
5. Check the release build opens a converted file, shows the paywall when the free conversions run out, and restores a purchase after a reinstall.
6. Confirm `FREE_CONVERSIONS` in `src/services/quota.ts` is back to its real value — it is raised for testing at times.
7. Confirm every `.so` in the bundle is 16 KB aligned (`zipalign -c -P 16` on bundletool's arm64 and x86_64 APKs).
