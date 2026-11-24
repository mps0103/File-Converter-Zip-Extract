# R8 runs in full mode (android.enableR8.fullMode=true). These rules are written for
# it: a blanket "-keep class some.library.** { *; }" is not caution, it is a hole —
# it stops R8 shrinking or optimising anything in that package. So the only things
# kept whole here are the ones that genuinely cannot be reasoned about statically:
# code reached by name from JavaScript, by reflection, or by another process.

# React Native and Hermes ship their own consumer rules inside react-android's
# proguard.txt, and those rules are better than a blanket keep: they keep every
# native method, every NativeModule implementation, the bridge and the turbomodule
# core, and anything annotated @DoNotStrip. Nothing is added for them here.

# This app's own code. The native modules are instantiated by React Native and then
# reached by name from JavaScript, so neither the classes nor their @ReactMethod
# functions may be renamed or dropped.
-keep class com.mps.fileconverter.** { *; }

# PDFBox for Android loads its glyph lists and encodings as resources by path, and
# picks filter implementations by name out of the PDF, so it is kept whole. It also
# references AWT and Bouncy Castle classes it can live without.
-keep class com.tom_roush.pdfbox.** { *; }
-dontwarn java.awt.**
-dontwarn javax.imageio.**
-dontwarn org.bouncycastle.**
-dontwarn org.apache.commons.logging.**

# PDFBox's JPEG 2000 filter calls an optional decoder that is not bundled. Only
# JPX-encoded images inside a PDF need it, and those are never decoded here: text
# is read by PDFBox and pages are drawn by Android's own PdfRenderer.
-dontwarn com.gemalto.jp2.JP2Decoder
-dontwarn com.gemalto.jp2.JP2Encoder

# slf4j looks for a logging binder at runtime and carries on without one.
-dontwarn org.slf4j.impl.StaticLoggerBinder
-dontwarn org.slf4j.**

# commons-compress chooses a compressor and an archiver by name at runtime, for
# formats this app offers, so it is kept whole. The others are plain code reached
# by direct call and R8 can treat them normally.
-keep class org.apache.commons.compress.** { *; }
-dontwarn org.apache.commons.compress.**
-dontwarn org.brotli.**
-dontwarn com.github.luben.**
-dontwarn org.tukaani.xz.**

# zip4j and junrar carry no consumer rules of their own, so keeping them whole
# blocks nothing that was going to happen anyway. They are the extract feature, the
# release build cannot be exercised for every archive format on every upload, and
# the few hundred kB they cost is a fair price for not finding out in production
# that one of them looked a class up by name.
-keep class net.lingala.zip4j.** { *; }
-keep class com.github.junrar.** { *; }

# Play Billing. The library is reached reflectively by the Play Store app, and its
# listener callbacks are only ever called from there, so it is kept whole.
-keep class com.android.billingclient.** { *; }
-keep class com.android.vending.billing.** { *; }

# The document scanner. Its entry points are static factories, which R8 inlines and
# then reports the class as removed — fine in principle, except that what they hand
# back is implemented inside Google Play services and arrives over IPC, where there
# is nothing for R8 to have reasoned about. The package is small and this is the one
# feature that cannot be exercised without a camera and a Play-services phone, so it
# is kept whole rather than found missing by a user.
-keep class com.google.mlkit.vision.documentscanner.** { *; }

# Google Mobile Ads ships its own consumer rules; a blanket keep only blocked them.
-dontwarn com.google.android.gms.**

# ML Kit text recognition (the bundled model, used by "Make searchable"). Its pieces
# are wired together at start-up by name through MlKitComponentDiscoveryService, which
# reads the registrar class names out of the manifest. The library ships consumer
# rules for this; the keep is a belt for a path that only runs when a user opens a
# scanned PDF, which no startup check will ever exercise.
-keep class com.google.mlkit.vision.text.** { *; }
-keep class com.google.mlkit.vision.common.** { *; }
-keep class com.google.mlkit.common.internal.** { *; }

# PDFBox's font library. pdfbox.** is kept above but fontbox is a package of its own,
# so R8 stripped AFMParser and its neighbours (seen in usage.txt). The standard PDF
# fonts used by Page numbers and Watermark take their metrics from AFM resources
# through it, a path no startup check exercises, so it is kept whole. The size is
# trivial; a release-only crash on those two tools would not be.
-keep class com.tom_roush.fontbox.** { *; }

# Media3 Transformer, for the video tools. It ships consumer rules for itself; this
# only silences warnings about optional pieces of its API that this app never uses.
-dontwarn androidx.media3.**

# LAME's JNI bridge binds Java_com_mps_fileconverter_Mp3Encoder_* by class and method
# name, so the class and its native methods must keep theirs. They already do through
# the com.mps.fileconverter.** rule at the top; this one says why it matters here.
-keepclasseswithmembernames class com.mps.fileconverter.Mp3Encoder { native <methods>; }

# The PDF reader (react-native-pdf, the same one the PDF Tools app uses) and the native
# pdfium library under it. Both are reached from native code and from React Native by
# name, so they are kept whole: this is the reader for every PDF the app opens, and the
# one thing a release-only crash here would take down.
-keep class org.wonday.pdf.** { *; }
-keep class io.legere.pdfiumandroid.** { *; }
-keep class com.shockwave.pdfium.** { *; }
-keep class com.github.barteksc.pdfviewer.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-dontwarn io.legere.pdfiumandroid.**
-dontwarn com.github.barteksc.pdfviewer.**
