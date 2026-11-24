# 2.0.1 backlog

Recorded while 2.0.0 is still being tested. Nothing here is changed in 2.0.0.

## Trim video: add a scrubber

Trim video takes the start and end as typed times (0:30, 1:45). It has no scrubber, so
the user cannot see which frame they are cutting at. Add a scrubber with a preview.

## Move "Scan to PDF" and "Images to PDF" into the PDF tools folder

Both tools produce PDFs, so that is where users will look for them. Today both sit in
the "Scan & pictures" folder (`group: 'Scan & pictures'` in `src/convert/catalog.ts`,
tool ids `scan-to-pdf` and `images-to-pdf`). Move them into the PDF tools folder.

Check when doing it: the folder tiles show one tool per folder on the dashboard, so
make sure "Scan & pictures" still has a sensible set of tools and a sensible blurb after
the two leave, and that the store screenshot plan and descriptions in
`docs/PLAY_STORE.md` still match the folders.
