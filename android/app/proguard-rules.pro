# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# The native converter bridge is reached by name from JS.
-keep class com.mps.fileconverter.FileBridgeModule { *; }
-keep class com.mps.fileconverter.FileBridgePackage { *; }

# PDFBox for Android pulls in optional AWT and Bouncy Castle classes it can live without.
-keep class com.tom_roush.pdfbox.** { *; }
-dontwarn java.awt.**
-dontwarn javax.imageio.**
-dontwarn org.bouncycastle.**
-dontwarn org.apache.commons.logging.**

# Archive decoders
-keep class net.lingala.zip4j.** { *; }
-keep class org.apache.commons.compress.** { *; }
-keep class com.github.junrar.** { *; }
-dontwarn org.apache.commons.compress.**
-dontwarn org.brotli.**
-dontwarn com.github.luben.**
-dontwarn org.tukaani.xz.**

# Play Billing
-keep class com.android.vending.billing.** { *; }

# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.**
