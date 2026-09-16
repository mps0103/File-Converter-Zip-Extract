# Play listing assets

| File | What it is |
| --- | --- |
| `icon.png` | **The Play Console listing icon.** 512×512, no transparency. |
| `icon-source.png` | The artwork everything else is cut from. Keep it: the others are derived. |
| `launcher-icon.svg` | The old two-sheets vector. No longer the app icon — it survives only as the **monochrome** layer, which themed icons use and which needs flat line art. |
| `screenshots/` | Phone screenshots. Incomplete, and the wrong shape — see below. |

## How the icon is used in the app

The artwork keeps its transparency, so it is used the way an adaptive icon is meant
to be: it is the **foreground**, and `@color/icon_bg` (`#0B3FD4`, sampled from the
artwork's own edge) fills in behind it.

The transparent margin is trimmed off first, then the shape is padded back to square
and scaled to fill the whole 432px canvas.

Sizing it to the 72dp safe zone instead was tried and looked wrong: a launcher mask is
wider than that inscribed circle, so the background colour showed as a ring around the
artwork and the picture read as small and far away. This artwork already carries its own
generous margin, so filling the canvas puts its rounded edge where the mask falls, and
the subject still sits nowhere near the crop.

The pre-Android-8 icons in `mipmap-*dpi/` are flattened squares, because those
devices have no adaptive icon support and no mask to do the rounding.

## Regenerating

```bash
# listing icon
npx sharp-cli -i store-assets/icon-source.png -o tmp.png --format png resize 512 512
npx sharp-cli -i tmp.png -o store-assets/icon.png --format png flatten "#0B3FD4"

# adaptive foreground
npx sharp-cli -i store-assets/icon-source.png -o fg.png --format png resize 288 288
npx sharp-cli -i fg.png -o android/app/src/main/res/drawable-nodpi/ic_launcher_art.png \
  --format png extend 72 72 72 72 --background "rgba(0,0,0,0)"
```

## Still to settle

**The screenshots are the wrong shape for Play.** They are 1260×2800, an aspect ratio
of 2.22:1, and Play rejects anything past 2:1. Padding to 1400×2800 keeps every pixel
and satisfies the limit.

**The splash is still the old palette.** `splash_bg` is `#241E52`, a dark purple from
the previous icon, while the icon is now blue. Launch runs purple, then the JS splash,
then the app.
