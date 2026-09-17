# Play listing assets

| File | What it is |
| --- | --- |
| `icon.png` | **The Play Console listing icon.** 512×512, no transparency. |
| `icon-source.png` | The icon artwork everything else is cut from. |
| `splash-source.png` | The splash artwork, copied to `assets/splash.png` for the app to bundle. |
| `launcher-icon.svg` | The old two-sheets vector. No longer the app icon — it survives only as the **monochrome** layer, which themed icons use and which needs flat line art. |
| `screenshots/` | Phone screenshots. Incomplete, stale, and the wrong shape — see below. |

## How the icon is used in the app

The source has **no transparency** — its corners are solid black. So it cannot simply be
dropped in as an adaptive foreground: any mask even slightly wider than the artwork would
show black slivers at the corners.

It is scaled up and centre-cropped instead, which pushes the black outside the canvas.
510 → 432 was measured rather than guessed: the black reaches 7.4% along the diagonal, and
crops smaller than this left some behind. The listing icon uses 604 → 512, the same ratio.

`@color/icon_bg` sits behind the adaptive foreground, for the corners a mask carves off.

The pre-Android-8 icons in `mipmap-*dpi/` are flattened squares, because those devices have
no adaptive icon support and no mask to do the rounding.

An earlier attempt sized the artwork to the 72dp safe zone. That looked wrong: a launcher
mask is wider than the inscribed circle, so the background colour showed as a ring and the
picture read as small and far away. Fill the canvas.

## The splash

`assets/splash.png` is shown full screen by `src/screens/SplashScreen.tsx` with
`resizeMode="cover"`. Phones are taller than the 9:16 the artwork was drawn at, so
letterboxing would band the top and bottom; cover trims the spare margin instead.

`@color/splash_bg` is `#F1F7FD`, the pale blue the artwork fades to at its edges, so the
native splash does not flash a different colour before the picture arrives. The status bar
is dark-on-light to suit it.

## Regenerating

```bash
# adaptive foreground: scale up, centre-crop past the black corners
npx sharp-cli -i store-assets/icon-source.png -o a510.png --format png resize 510 510
npx sharp-cli -i a510.png -o android/app/src/main/res/drawable-nodpi/ic_launcher_art.png \
  --format png extract 39 39 432 432

# listing icon, same ratio
npx sharp-cli -i store-assets/icon-source.png -o a604.png --format png resize 604 604
npx sharp-cli -i a604.png -o store-assets/icon.png --format png extract 46 46 512 512
```

## Still to settle

**The screenshots are the wrong shape for Play.** They are 1260×2800, an aspect ratio of
2.22:1, and Play rejects anything past 2:1. Padding to 1400×2800 keeps every pixel and
satisfies the limit. They also predate the current icon and splash.

**The Word and Excel marks.** Both the icon and the splash carry Microsoft's logos. Play's
impersonation and intellectual property policies cover third-party brand marks in store
artwork.
