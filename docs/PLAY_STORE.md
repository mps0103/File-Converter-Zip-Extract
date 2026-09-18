# Play Console setup — File Converter & Zip Extract

Package: `com.mps.fileconverter` · Category: Tools · Content rating target: Everyone

## 1. Store listing

**App name (30 char max)**
`File Converter: PDF Word Zip`

**Short description (80 char max)**
`Convert PDF, Word, Excel and open ZIP files offline. Nothing is uploaded.`

**Full description**

```
Convert your documents without sending them anywhere.

File Converter & Zip Extract does every conversion on your phone. Turn it on in airplane mode and it still works. Nothing is uploaded, so nothing can leak.

WHAT IT CONVERTS
• PDF to Word, Excel or text
• Word to PDF or plain text
• Excel and CSV to PDF, CSV to Excel, Excel to CSV
• PowerPoint slides to PDF
• Text and HTML to PDF

ARCHIVES
• Open ZIP, 7Z, TAR, TAR.GZ, TGZ, GZ, BZ2, XZ and older RAR files
• Password-protected ZIP files supported
• Everything unpacks into a folder in Downloads

WHERE FILES GO
Every converted file is saved straight to your Downloads folder, with the original left untouched. Open or share it from the app, or find it later in any file manager.

HONEST ABOUT QUALITY
Each tool tells you plainly what carries over before you convert. A scanned PDF has no text inside it to pull out, and we say so instead of handing you an empty file.

FREE AND PREMIUM
Start with a batch of free conversions. Premium removes the limit and every ad, as a monthly subscription or a single one-time payment.

Questions: info@dealtrix.com
```

**Graphics to prepare**
- App icon 512×512 — `assets/play-store-icon-512.png`
- Feature graphic 1024×500
- Phone screenshots, at least 4 (home grid, a tool screen, the progress ring, the result screen)

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
3. `npx tsc --noEmit` and confirm the app runs on a real device in airplane mode.
4. `cd android && gradlew bundleRelease` and upload `android/app/build/outputs/bundle/release/app-release.aab`.
5. Check the release build opens a converted file, shows the paywall at the sixth conversion, and restores a purchase after a reinstall.
