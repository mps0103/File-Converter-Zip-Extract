package com.mps.fileconverter

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.*
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.graphics.image.JPEGFactory
import java.io.File
import java.io.FileOutputStream

/**
 * Making a PDF out of pictures: ones the user already has, and ones taken now.
 *
 * Both end in the same place — an A4 PDF in Downloads, one picture per page — so
 * they share the page writer. What differs is only where the pictures come from.
 *
 * Nothing here holds a photo at its original size. A modern phone camera makes a
 * 50 megapixel picture, which is 200 MB decoded, and a batch of ten would be the
 * end of the process. Each one is sampled down on the way in to roughly what a
 * 200 dpi page can actually show, and recycled before the next one is opened.
 */
class PdfToolsModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx), ActivityEventListener {

    private var scanPromise: Promise? = null

    init {
        ctx.addActivityEventListener(this)
    }

    override fun getName() = "PdfTools"

    // --------------------------------------------------------- images to pdf

    /**
     * Lays each picture onto its own A4 page, in the order given.
     *
     * The page is always A4 so the result prints and shares like a document rather
     * than like a pile of photos of different shapes. A picture is turned to match
     * the page where that makes it bigger — a landscape photo on a portrait page
     * would otherwise be a stripe across the middle with white above and below.
     */
    @ReactMethod
    fun imagesToPdf(uris: ReadableArray, baseName: String, promise: Promise) {
        if (uris.size() == 0) {
            promise.reject("no_images", "Choose at least one picture.")
            return
        }
        val document = PDDocument()
        try {
            for (i in 0 until uris.size()) {
                val uri = Uri.parse(uris.getString(i) ?: continue)
                val bitmap = decodeSampled(uri)
                    ?: throw IllegalStateException("One of the pictures could not be opened.")
                try {
                    addPage(document, bitmap)
                } finally {
                    // Before the next picture is opened, so only ever one is in memory.
                    bitmap.recycle()
                }
                progress(i + 1, uris.size())
            }

            val name = if (baseName.endsWith(".pdf", true)) baseName else "$baseName.pdf"
            promise.resolve(writeToDownloads(document, name))
        } catch (e: Exception) {
            promise.reject("images_failed", e.message ?: "These pictures could not be made into a PDF.")
        } finally {
            try { document.close() } catch (_: Exception) {}
        }
    }

    private fun addPage(document: PDDocument, bitmap: Bitmap) {
        val landscape = bitmap.width > bitmap.height
        val box = if (landscape) PDRectangle(PDRectangle.A4.height, PDRectangle.A4.width) else PDRectangle.A4
        val page = PDPage(box)
        document.addPage(page)

        // JPEG rather than lossless: a photograph stored losslessly makes a PDF
        // nobody can email. 85 is the usual point where the next percent costs more
        // bytes than it returns in anything the eye can find.
        val image = JPEGFactory.createFromImage(document, bitmap, 0.85f)

        val margin = 24f
        val usableW = box.width - margin * 2
        val usableH = box.height - margin * 2
        val scale = minOf(usableW / bitmap.width, usableH / bitmap.height)
        val drawW = bitmap.width * scale
        val drawH = bitmap.height * scale

        PDPageContentStream(document, page).use { stream ->
            stream.drawImage(image, (box.width - drawW) / 2, (box.height - drawH) / 2, drawW, drawH)
        }
    }

    /**
     * Opens a picture at about the size a page can show it, never at its own size.
     *
     * The header is read first, for nothing but the dimensions, then a whole-number
     * sample size is chosen — 1, 2, 4, 8 — because that is the only kind the
     * decoder can do cheaply. Asking for an exact pixel size instead makes it
     * decode the whole picture and then shrink the copy, which is the very thing
     * being avoided.
     */
    private fun decodeSampled(uri: Uri): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        ctx.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        var sample = 1
        var long = maxOf(bounds.outWidth, bounds.outHeight)
        while (long / 2 >= TARGET_LONG_PX) {
            sample *= 2
            long /= 2
        }

        val options = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.RGB_565 // no transparency survives a JPEG anyway
        }
        val decoded = ctx.contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, options)
        } ?: return null

        return applyExifRotation(uri, decoded)
    }

    /**
     * Phones mark which way up a photo is rather than storing it that way, so a
     * picture taken sideways arrives sideways unless the mark is honoured.
     */
    private fun applyExifRotation(uri: Uri, bitmap: Bitmap): Bitmap {
        val degrees = try {
            ctx.contentResolver.openInputStream(uri)?.use { input ->
                when (ExifInterface(input).getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL,
                )) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                    else -> 0f
                }
            } ?: 0f
        } catch (_: Exception) {
            0f
        }
        if (degrees == 0f) return bitmap

        return try {
            val matrix = Matrix().apply { postRotate(degrees) }
            val turned = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            // createBitmap can hand back the same object when there is nothing to do.
            if (turned != bitmap) bitmap.recycle()
            turned
        } catch (_: OutOfMemoryError) {
            bitmap // Sideways is better than nothing at all.
        }
    }

    // ------------------------------------------------------------- scanning

    /**
     * The document scanner, which is Google Play Services' own.
     *
     * It is worth saying why this is not a camera screen of this app's making: the
     * scanner finds the page edges in the viewfinder, corrects the perspective so a
     * page photographed at an angle comes out square, lets the user redo a shot or
     * add another, and hands back a finished PDF. It also runs in its own process,
     * so this app never asks for camera permission and never holds a frame.
     */
    @ReactMethod
    fun scanToPdf(baseName: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("no_activity", "The app is not on screen.")
            return
        }
        if (scanPromise != null) {
            promise.reject("busy", "A scan is already open.")
            return
        }
        pendingName = baseName
        scanPromise = promise

        val options = GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(true)
            .setPageLimit(PAGE_LIMIT)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_PDF)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build()

        GmsDocumentScanning.getClient(options)
            .getStartScanIntent(activity)
            .addOnSuccessListener { sender ->
                try {
                    activity.startIntentSenderForResult(sender, SCAN_REQUEST, null, 0, 0, 0)
                } catch (e: Exception) {
                    finishScan(null, "The scanner could not be opened.")
                }
            }
            .addOnFailureListener {
                finishScan(
                    null,
                    "The document scanner is not available on this phone. It comes from Google " +
                        "Play services, which this device may not have.",
                )
            }
    }

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != SCAN_REQUEST) return
        if (resultCode != Activity.RESULT_OK || data == null) {
            finishScan(null, if (resultCode == Activity.RESULT_CANCELED) CANCELLED else "The scan did not finish.")
            return
        }
        try {
            val result = GmsDocumentScanningResult.fromActivityResultIntent(data)
            val pdf = result?.getPdf()
            if (pdf == null) {
                finishScan(null, "The scan produced no pages.")
                return
            }
            val name = if (pendingName.endsWith(".pdf", true)) pendingName else "$pendingName.pdf"
            finishScan(copyToDownloads(pdf.getUri(), name), null)
        } catch (e: Exception) {
            finishScan(null, e.message ?: "That scan could not be saved.")
        }
    }

    override fun onNewIntent(intent: Intent?) = Unit

    private fun finishScan(result: WritableMap?, error: String?) {
        val promise = scanPromise ?: return
        scanPromise = null
        pendingName = "Scan"
        if (result != null) promise.resolve(result) else promise.reject("scan_failed", error ?: "The scan failed.")
    }

    // ------------------------------------------------------------- saving

    private fun writeToDownloads(document: PDDocument, fileName: String): WritableMap {
        val staging = File(ctx.cacheDir, "out-${System.currentTimeMillis()}.pdf")
        try {
            FileOutputStream(staging).use { document.save(it) }
            return copyToDownloads(Uri.fromFile(staging), fileName)
        } finally {
            staging.delete()
        }
    }

    /** Streams a file into the public Downloads folder, the same way the converter does. */
    private fun copyToDownloads(source: Uri, fileName: String): WritableMap {
        val mime = "application/pdf"
        val uri: Uri
        val shownPath: String
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val resolver = ctx.contentResolver
            uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Downloads folder is not writable.")
            resolver.openOutputStream(uri)?.use { output ->
                resolver.openInputStream(source)?.use { it.copyTo(output, DEFAULT_BUFFER_SIZE) }
            }
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            shownPath = "Downloads/$fileName"
        } else {
            val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!dir.exists()) dir.mkdirs()
            val out = File(dir, fileName)
            FileOutputStream(out).use { output ->
                ctx.contentResolver.openInputStream(source)?.use { it.copyTo(output, DEFAULT_BUFFER_SIZE) }
            }
            uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".provider", out)
            shownPath = out.absolutePath
        }
        return Arguments.createMap().apply {
            putString("uri", uri.toString())
            putString("path", shownPath)
            putString("name", fileName)
            putString("mime", mime)
        }
    }

    private fun progress(done: Int, total: Int) {
        try {
            val map = Arguments.createMap().apply {
                putInt("done", done)
                putInt("total", total)
                putString("stage", "Adding page $done of $total")
            }
            ctx.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("pdfToolsProgress", map)
        } catch (_: Exception) {
            // A ring that does not move is not a reason to fail the job.
        }
    }

    private var pendingName: String = "Scan"

    companion object {
        /**
         * The long side a picture is sampled down to.
         *
         * A4 at 200 dpi is 1654 by 2339, which is the point where a printed page
         * stops looking better. 2000 leaves room for a picture that is not quite
         * the shape of the page.
         */
        private const val TARGET_LONG_PX = 2000

        private const val PAGE_LIMIT = 30
        private const val SCAN_REQUEST = 7342

        /** Matches what the JS side treats as "the user changed their mind". */
        const val CANCELLED = "cancelled"
    }
}
