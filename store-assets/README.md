# Play listing assets

| File | What it is |
| --- | --- |
| `icon.png` | **The Play Console listing icon.** 512×512 PNG, required size. |
| `icon-source.jpg` | The original artwork `icon.png` was made from, kept so it can be re-cut. |
| `launcher-icon.svg` | The icon **currently installed on the device** — a redraw of `android/app/src/main/res/drawable/ic_launcher_foreground.xml`. It is *not* the same artwork as `icon.png`. |
| `screenshots/` | Phone screenshots. Incomplete, and see the caveat below. |

## Two things to settle before uploading

**The store icon and the app icon are different pictures.** `icon.png` is the new
artwork; the launcher icon on the phone is still the two-sheets vector described by
`launcher-icon.svg`. Users see one in the store and a different one on their home
screen. Making them match means rebuilding the adaptive icon from the new artwork,
which is its own job: an adaptive icon needs a separate foreground and background,
and fine detail gets clipped by round and squircle masks.

**The screenshots are the wrong shape for Play.** They are 1260×2800, an aspect
ratio of 2.22:1, and Play rejects anything past 2:1. Padding them to 1400×2800
keeps every pixel of content and satisfies the limit.
