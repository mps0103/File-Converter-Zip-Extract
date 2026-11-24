package com.mps.fileconverter

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.cos.COSBase
import com.tom_roush.pdfbox.cos.COSName
import com.tom_roush.pdfbox.cos.COSStream
import com.tom_roush.pdfbox.io.MemoryUsageSetting
import com.tom_roush.pdfbox.multipdf.PDFMergerUtility
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.encryption.AccessPermission
import com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException
import com.tom_roush.pdfbox.pdmodel.encryption.StandardProtectionPolicy
import com.tom_roush.pdfbox.pdmodel.font.PDType1Font
import com.tom_roush.pdfbox.pdmodel.graphics.image.JPEGFactory
import com.tom_roush.pdfbox.pdmodel.graphics.image.PDImageXObject
import com.tom_roush.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState
import com.tom_roush.pdfbox.pdmodel.graphics.state.RenderingMode
import com.tom_roush.pdfbox.util.Matrix
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.Collections
import java.util.IdentityHashMap
import java.util.UUID
import java.util.concurrent.Executors

/**
 * PDF editing: the tools that take a PDF in and hand a PDF, or a folder of pictures,
 * back. Merge, split, rotate, delete pages, page numbers, watermark, password,
 * compress, PDF to pictures, pull out the pictures, and make a scan searchable.
 *
 * Everything is done by PDFBox, Android's own PdfRenderer and ML Kit's bundled text
 * model — all of it code inside the APK, so none of it needs a connection.
 *
 * Every method resolves with one shape: {files, folder, ...extras}. Work happens on
 * a thread of its own, because a 200-page PDF would otherwise hold up every other
 * native module while it ran. Progress is reported per page or per file as the work
 * really finishes it, through "pdfEditProgress".
 */
class PdfEditModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

    private val worker = Executors.newSingleThreadExecutor()

    init {
        PDFBoxResourceLoader.init(ctx.applicationContext)
    }

    override fun getName() = "PdfEdit"

    @ReactMethod fun addListener(eventName: String) = Unit
    @ReactMethod fun removeListeners(count: Int) = Unit

    override fun invalidate() {
        worker.shutdownNow()
        super.invalidate()
    }

    private fun emit(stage: String, done: Int, total: Int) {
        try {
            val map = Arguments.createMap().apply {
                putString("stage", stage)
                putInt("done", done)
                putInt("total", total)
            }
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("pdfEditProgress", map)
        } catch (_: Exception) {
            // A ring that does not move is not a reason to fail the job.
        }
    }

    /** Something the user can fix, worded for them. */
    private class UserError(message: String) : Exception(message)

    private fun job(promise: Promise, code: String, fallback: String, password: String, body: (File) -> WritableMap) {
        worker.execute {
            val work = File(ctx.cacheDir, "pdfedit_${System.nanoTime()}")
            try {
                work.mkdirs()
                promise.resolve(DownloadsWriter.rollbackOnFailure { body(work) })
            } catch (e: InvalidPasswordException) {
                promise.reject(
                    "password",
                    if (password.isEmpty()) "This PDF is locked. Enter its password to open it."
                    else "That password did not open this PDF.",
                )
            } catch (e: UserError) {
                promise.reject(code, e.message)
            } catch (e: OutOfMemoryError) {
                promise.reject(code, "This PDF is too large to process on this phone.")
            } catch (e: Exception) {
                promise.reject(code, e.message ?: fallback)
            } finally {
                work.deleteRecursively()
            }
        }
    }

    // ------------------------------------------------------------- plumbing

    /** Copies a content uri into the work folder, so PDFBox can open it as a file. */
    private fun stage(uriString: String, work: File, tag: String): File {
        val target = File(work, "$tag.pdf")
        ctx.contentResolver.openInputStream(Uri.parse(uriString)).use { input ->
            input ?: throw UserError("That file could not be opened.")
            FileOutputStream(target).use { input.copyTo(it, DEFAULT_BUFFER_SIZE) }
        }
        return target
    }

    /**
     * PDFBox keeps a document's streams in memory unless told otherwise, so a big scan
     * could use more than the phone's heap. This holds 32 MB in memory and spills the rest
     * to temp files in the app's cache folder (Android's java.io.tmpdir), which PDFBox
     * removes when the document is closed.
     */
    private fun memory() = MemoryUsageSetting.setupMixed(32L * 1024 * 1024)

    private fun open(file: File, password: String): PDDocument = PDDocument.load(file, password, memory())

    private fun saved(doc: PDDocument, work: File, name: String): WritableMap {
        val out = File(work, "out_${System.nanoTime()}.pdf")
        doc.save(out)
        return DownloadsWriter.publish(ctx, out, name, PDF)
    }

    private fun result(files: List<WritableMap>, folder: String = "", extras: WritableMap.() -> Unit = {}): WritableMap {
        val array = Arguments.createArray()
        files.forEach { array.pushMap(it) }
        return Arguments.createMap().apply {
            putArray("files", array)
            putString("folder", if (folder.isEmpty()) "" else "Downloads/$folder")
            extras()
        }
    }

    private fun pdfName(base: String, suffix: String) =
        DownloadsWriter.safeName(base, "document") + (if (suffix.isEmpty()) "" else "-$suffix") + ".pdf"

    /**
     * "1-3, 6, 9-" as zero-based page indexes, in order and without repeats. An open
     * end runs to the last page. Anything outside the document is an error rather
     * than being quietly ignored, since a typo should not silently change the job.
     */
    private fun parsePages(spec: String, count: Int): List<Int> {
        val picked = sortedSetOf<Int>()
        for (raw in spec.split(',', ';', ' ').map { it.trim() }.filter { it.isNotEmpty() }) {
            val bad = UserError("\"$raw\" is not a page or a range. Use something like 1-3, 6, 9-.")
            val parts = raw.split('-')
            if (parts.size > 2) throw bad
            val from = parts[0].ifEmpty { "1" }.toIntOrNull() ?: throw bad
            val to = if (parts.size == 1) from else (parts[1].ifEmpty { count.toString() }.toIntOrNull() ?: throw bad)
            if (from < 1 || to < from) throw bad
            if (to > count) throw UserError("This PDF has $count page${if (count == 1) "" else "s"}, so page $to is not in it.")
            for (p in from..to) picked.add(p - 1)
        }
        if (picked.isEmpty()) throw UserError("Type the pages to use, such as 1-3, 6.")
        return picked.toList()
    }

    /** The page's rotation as 0, 90, 180 or 270, however the file wrote it. */
    private fun turnOf(page: PDPage): Int = ((page.rotation % 360) + 360) % 360

    /**
     * Where a point on the page *as displayed* lies in the page's own coordinates.
     *
     * A PDF stores content upright and has the viewer turn the whole page by its
     * rotation, so text laid out on the displayed page has to be placed, and
     * turned, the opposite way to come out straight. (dx, dy) is measured from the
     * displayed page's bottom-left corner.
     *
     * The maths, for a crop box w wide and h high (the page's own, upright axes) and a
     * point (dx, dy) on the page as shown. /Rotate turns the page clockwise when shown:
     *
     *    turn   shown page is   own x       own y      text is turned by
     *      0      w by h        dx          dy           0 degrees
     *     90      h by w        w - dy      dx          90 degrees
     *    180      w by h        w - dx      h - dy      180 degrees
     *    270      h by w        dy          h - dx      270 degrees
     *
     * Why 90 reads that way: turned clockwise, the page's own bottom-right corner is what
     * the reader sees at the bottom-left. Going up the shown page (dy) therefore goes left
     * along the own bottom edge (w - dy), and going right (dx) goes up the own right edge
     * (dx). 180 and 270 follow the same way. The text is turned by the same angle, so once
     * the viewer rotates the page it reads straight.
     *
     * The crop box does not always start at (0, 0): scans and cropped pages often have a
     * lower-left corner of, say, (12, 30). Everything above is relative to that corner,
     * so it is added back last, in the page's own un-rotated axes — adding it before the
     * rotation would shift the text the wrong way on a turned page.
     */
    private fun toPage(box: PDRectangle, turn: Int, dx: Float, dy: Float): FloatArray {
        val w = box.width
        val h = box.height
        val x: Float
        val y: Float
        when (turn) {
            90 -> { x = w - dy; y = dx }
            180 -> { x = w - dx; y = h - dy }
            270 -> { x = dy; y = h - dx }
            else -> { x = dx; y = dy }
        }
        return floatArrayOf(box.lowerLeftX + x, box.lowerLeftY + y)
    }

    // ----------------------------------------------------------------- merge

    @ReactMethod
    fun merge(uris: ReadableArray, baseName: String, promise: Promise) {
        job(promise, "merge_failed", "These PDFs could not be merged.", "") { work ->
            if (uris.size() < 2) throw UserError("Choose at least two PDFs to merge.")
            val merger = PDFMergerUtility()
            val target = PDDocument(memory())
            val sources = mutableListOf<PDDocument>()
            try {
                for (i in 0 until uris.size()) {
                    emit("Adding PDF ${i + 1} of ${uris.size()}", i, uris.size())
                    val file = stage(uris.getString(i) ?: continue, work, "src$i")
                    val doc = try {
                        open(file, "")
                    } catch (e: InvalidPasswordException) {
                        throw UserError("PDF ${i + 1} is locked. Remove its password first, then merge.")
                    }
                    sources.add(doc)
                    // The sources stay open until the result is saved: PDFBox shares
                    // page content between them rather than copying it.
                    merger.appendDocument(target, doc)
                }
                emit("Saving the merged PDF", uris.size(), uris.size())
                result(listOf(saved(target, work, pdfName(baseName, "merged"))))
            } finally {
                sources.forEach { try { it.close() } catch (_: Exception) {} }
                try { target.close() } catch (_: Exception) {}
            }
        }
    }

    // ----------------------------------------------------------------- split

    /**
     * mode "each": a file per page. "every": a file per [every] pages. "ranges": one
     * file holding just the pages in [ranges].
     */
    @ReactMethod
    fun split(uri: String, password: String, mode: String, every: Int, ranges: String, baseName: String, promise: Promise) {
        job(promise, "split_failed", "This PDF could not be split.", password) { work ->
            emit("Opening the PDF", 0, 1)
            open(stage(uri, work, "src"), password).use { doc ->
                val count = doc.numberOfPages
                val groups: List<List<Int>> = when (mode) {
                    "ranges" -> listOf(parsePages(ranges, count))
                    "every" -> (0 until count).chunked(every.coerceAtLeast(1))
                    else -> (0 until count).map { listOf(it) }
                }
                val files = mutableListOf<WritableMap>()
                val folder = if (groups.size > 1) DownloadsWriter.safeName(baseName, "document") + " pages" else ""
                groups.forEachIndexed { index, pages ->
                    emit("Writing file ${index + 1} of ${groups.size}", index, groups.size)
                    PDDocument().use { part ->
                        pages.forEach { part.importPage(doc.getPage(it)) }
                        val label = when {
                            mode == "ranges" -> "pages"
                            pages.size == 1 -> "page-${pages[0] + 1}"
                            else -> "pages-${pages.first() + 1}-${pages.last() + 1}"
                        }
                        val out = File(work, "part_$index.pdf")
                        part.save(out)
                        files.add(DownloadsWriter.publish(ctx, out, pdfName(baseName, label), PDF, folder))
                        out.delete()
                    }
                }
                emit("Saved", groups.size, groups.size)
                result(files, folder)
            }
        }
    }

    // ----------------------------------------------------- delete and rotate

    @ReactMethod
    fun deletePages(uri: String, password: String, ranges: String, baseName: String, promise: Promise) {
        job(promise, "delete_failed", "Those pages could not be removed.", password) { work ->
            emit("Opening the PDF", 0, 1)
            open(stage(uri, work, "src"), password).use { doc ->
                val drop = parsePages(ranges, doc.numberOfPages)
                if (drop.size >= doc.numberOfPages) throw UserError("That would remove every page.")
                // Highest first, so each removal leaves the earlier indexes where they were.
                drop.reversed().forEachIndexed { i, p ->
                    doc.removePage(p)
                    emit("Removing pages", i + 1, drop.size)
                }
                result(listOf(saved(doc, work, pdfName(baseName, "edited"))))
            }
        }
    }

    @ReactMethod
    fun rotate(uri: String, password: String, degrees: Int, ranges: String, baseName: String, promise: Promise) {
        job(promise, "rotate_failed", "This PDF could not be rotated.", password) { work ->
            emit("Opening the PDF", 0, 1)
            open(stage(uri, work, "src"), password).use { doc ->
                val pages = if (ranges.isBlank()) (0 until doc.numberOfPages).toList() else parsePages(ranges, doc.numberOfPages)
                pages.forEachIndexed { i, p ->
                    val page = doc.getPage(p)
                    page.rotation = (((page.rotation + degrees) % 360) + 360) % 360
                    emit("Turning page ${i + 1} of ${pages.size}", i + 1, pages.size)
                }
                result(listOf(saved(doc, work, pdfName(baseName, "rotated"))))
            }
        }
    }

    // ------------------------------------------------ page numbers, watermark

    @ReactMethod
    fun pageNumbers(uri: String, password: String, position: String, start: Int, baseName: String, promise: Promise) {
        job(promise, "numbers_failed", "Page numbers could not be added.", password) { work ->
            emit("Opening the PDF", 0, 1)
            open(stage(uri, work, "src"), password).use { doc ->
                val font = PDType1Font.HELVETICA
                val size = 10f
                val total = doc.numberOfPages
                for (i in 0 until total) {
                    val page = doc.getPage(i)
                    val box = page.cropBox
                    val turn = turnOf(page)
                    // Laid out on the page as the reader sees it, then mapped back to
                    // the page's own coordinates, so a number sits at the same corner
                    // whether or not the page is turned.
                    val shownW = if (turn % 180 == 0) box.width else box.height
                    val shownH = if (turn % 180 == 0) box.height else box.width
                    val text = (start + i).toString()
                    val width = font.getStringWidth(text) / 1000f * size
                    val dx = when (position) {
                        "bottom-left" -> 36f
                        "bottom-right", "top-right" -> shownW - 36f - width
                        else -> (shownW - width) / 2f
                    }
                    val dy = if (position == "top-right") shownH - 30f else 24f
                    val at = toPage(box, turn, dx, dy)
                    PDPageContentStream(doc, page, PDPageContentStream.AppendMode.APPEND, true, true).use { s ->
                        s.beginText()
                        s.setFont(font, size)
                        s.setNonStrokingColor(0.25f, 0.25f, 0.25f)
                        s.setTextMatrix(Matrix.getRotateInstance(Math.toRadians(turn.toDouble()), at[0], at[1]))
                        s.showText(text)
                        s.endText()
                    }
                    emit("Numbering page ${i + 1} of $total", i + 1, total)
                }
                result(listOf(saved(doc, work, pdfName(baseName, "numbered"))))
            }
        }
    }

    @ReactMethod
    fun watermark(uri: String, password: String, text: String, opacityPercent: Int, diagonal: Boolean, baseName: String, promise: Promise) {
        job(promise, "watermark_failed", "The watermark could not be added.", password) { work ->
            val mark = text.trim()
            if (mark.isEmpty()) throw UserError("Type the watermark text first.")
            emit("Opening the PDF", 0, 1)
            open(stage(uri, work, "src"), password).use { doc ->
                val font = PDType1Font.HELVETICA_BOLD
                val state = PDExtendedGraphicsState().apply {
                    nonStrokingAlphaConstant = opacityPercent.coerceIn(5, 100) / 100f
                }
                val total = doc.numberOfPages
                try {
                    for (i in 0 until total) {
                        val page = doc.getPage(i)
                        val box = page.cropBox
                        val turn = turnOf(page)
                        // Worked out on the page as the reader sees it — its width and
                        // height swap on a sideways page — then mapped back.
                        val shownW = if (turn % 180 == 0) box.width else box.height
                        val shownH = if (turn % 180 == 0) box.height else box.width
                        // Sized so the line spans most of the page's diagonal, or its
                        // width when laid flat, whatever the text and page.
                        val span = if (diagonal) Math.hypot(shownW.toDouble(), shownH.toDouble()) * 0.7 else shownW * 0.75
                        val unit = font.getStringWidth(mark) / 1000f
                        val size = (span / unit).toFloat().coerceIn(12f, 140f)
                        val width = unit * size
                        val angle = if (diagonal) Math.atan2(shownH.toDouble(), shownW.toDouble()) else 0.0
                        val at = toPage(
                            box,
                            turn,
                            (shownW / 2f - Math.cos(angle) * width / 2 + Math.sin(angle) * size * 0.3).toFloat(),
                            (shownH / 2f - Math.sin(angle) * width / 2 - Math.cos(angle) * size * 0.3).toFloat(),
                        )
                        val matrix = Matrix.getRotateInstance(angle + Math.toRadians(turn.toDouble()), at[0], at[1])
                        PDPageContentStream(doc, page, PDPageContentStream.AppendMode.APPEND, true, true).use { s ->
                            s.setGraphicsStateParameters(state)
                            s.beginText()
                            s.setFont(font, size)
                            s.setNonStrokingColor(0.55f, 0.55f, 0.55f)
                            s.setTextMatrix(matrix)
                            s.showText(mark)
                            s.endText()
                        }
                        emit("Marking page ${i + 1} of $total", i + 1, total)
                    }
                } catch (e: IllegalArgumentException) {
                    throw UserError("The watermark can only use letters and symbols the standard PDF fonts have.")
                }
                result(listOf(saved(doc, work, pdfName(baseName, "watermarked"))))
            }
        }
    }

    // -------------------------------------------------------------- passwords

    @ReactMethod
    fun protect(uri: String, password: String, newPassword: String, allowPrint: Boolean, allowCopy: Boolean, baseName: String, promise: Promise) {
        job(promise, "protect_failed", "This PDF could not be locked.", password) { work ->
            if (newPassword.length < 4) throw UserError("Use a password of at least 4 characters.")
            emit("Opening the PDF", 0, 2)
            open(stage(uri, work, "src"), password).use { doc ->
                val permission = AccessPermission().apply {
                    setCanPrint(allowPrint)
                    setCanPrintDegraded(allowPrint)
                    setCanExtractContent(allowCopy)
                    setCanExtractForAccessibility(true)
                }
                // The owner password is random and never shown: whoever has the user
                // password can open the file, and nobody can lift the restrictions.
                val policy = StandardProtectionPolicy(UUID.randomUUID().toString(), newPassword, permission).apply {
                    encryptionKeyLength = 128
                    setPreferAES(true)
                }
                emit("Encrypting", 1, 2)
                doc.protect(policy)
                result(listOf(saved(doc, work, pdfName(baseName, "protected"))))
            }
        }
    }

    @ReactMethod
    fun unlock(uri: String, password: String, baseName: String, promise: Promise) {
        job(promise, "unlock_failed", "This PDF could not be unlocked.", password) { work ->
            emit("Opening the PDF", 0, 2)
            open(stage(uri, work, "src"), password).use { doc ->
                if (!doc.isEncrypted) throw UserError("This PDF has no password.")
                doc.isAllSecurityToBeRemoved = true
                emit("Removing the password", 1, 2)
                result(listOf(saved(doc, work, pdfName(baseName, "unlocked"))))
            }
        }
    }

    // --------------------------------------------------------------- compress

    /** level is "light", "balanced" or "strong". */
    @ReactMethod
    fun compress(uri: String, password: String, level: String, baseName: String, promise: Promise) {
        job(promise, "compress_failed", "This PDF could not be compressed.", password) { work ->
            val quality = when (level) { "light" -> 80; "strong" -> 40; else -> 60 }
            val maxEdge = when (level) { "light" -> 2400; "strong" -> 1100; else -> 1600 }
            val source = stage(uri, work, "src")
            val before = source.length()

            emit("Opening the PDF", 0, 1)
            val out = File(work, "compressed.pdf")
            var rewritten = 0
            open(source, password).use { doc ->
                // One logo or background is often a single image used on every page, so
                // it is re-encoded once and every page pointed at the same result.
                val done = IdentityHashMap<COSBase, PDImageXObject>()
                val kept = Collections.newSetFromMap(IdentityHashMap<COSBase, Boolean>())
                val total = doc.numberOfPages
                for (i in 0 until total) {
                    val resources = doc.getPage(i).resources
                    if (resources != null) {
                        for (name in resources.xObjectNames.toList()) {
                            val image = try { resources.getXObject(name) as? PDImageXObject } catch (_: Exception) { null } ?: continue
                            val stream = image.cosObject
                            if (stream in kept) continue
                            val again = done[stream]
                            if (again != null) {
                                resources.put(name, again)
                                continue
                            }
                            // A picture with transparency would lose it as a JPEG, and a
                            // mask is a different picture, so these are left alone.
                            if (image.isStencil || image.softMask != null || image.mask != null) continue
                            val originalLength = (stream as? COSStream)?.length ?: 0L
                            val replacement = reencode(doc, image, quality, maxEdge) ?: continue
                            val newLength = (replacement.cosObject as? COSStream)?.length ?: 0L
                            if (originalLength > 0 && newLength >= originalLength) {
                                kept.add(stream)
                                continue
                            }
                            resources.put(name, replacement)
                            done[stream] = replacement
                            kept.add(replacement.cosObject)
                            rewritten++
                        }
                    }
                    emit("Compressing page ${i + 1} of $total", i + 1, total)
                }
                doc.save(out)
            }

            // Re-encoding can make a PDF with little to gain larger. The smaller of the
            // two is what is saved, and the screen is told which it was.
            val after = out.length()
            val keepOriginal = after >= before
            val final = if (keepOriginal) source else out
            val published = DownloadsWriter.publish(ctx, final, pdfName(baseName, "compressed"), PDF)
            result(listOf(published)) {
                putDouble("bytesBefore", before.toDouble())
                putDouble("bytesAfter", final.length().toDouble())
                putInt("count", rewritten)
            }
        }
    }

    private fun reencode(doc: PDDocument, image: PDImageXObject, quality: Int, maxEdge: Int): PDImageXObject? {
        val bitmap = try { image.image } catch (_: Exception) { null } ?: return null
        var scaled: Bitmap? = null
        try {
            val longest = maxOf(bitmap.width, bitmap.height)
            scaled = if (longest > maxEdge) {
                val ratio = maxEdge.toFloat() / longest
                Bitmap.createScaledBitmap(bitmap, (bitmap.width * ratio).toInt().coerceAtLeast(1), (bitmap.height * ratio).toInt().coerceAtLeast(1), true)
            } else bitmap
            return JPEGFactory.createFromImage(doc, scaled, quality / 100f)
        } catch (_: Exception) {
            return null
        } finally {
            if (scaled != null && scaled !== bitmap) scaled.recycle()
            bitmap.recycle()
        }
    }

    // ------------------------------------------------------- PDF to pictures

    /**
     * A copy PdfRenderer can open. It cannot open an encrypted file at all, so a
     * locked one is opened by PDFBox, stripped of its encryption and written out.
     */
    private fun renderable(source: File, work: File, password: String): File {
        fun opens(file: File): Boolean = try {
            ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { PdfRenderer(it).close() }
            true
        } catch (_: Exception) {
            false
        }
        if (opens(source)) return source
        val plain = File(work, "plain.pdf")
        open(source, password).use { doc ->
            doc.isAllSecurityToBeRemoved = true
            doc.save(plain)
        }
        return plain
    }

    private fun renderPage(page: PdfRenderer.Page, dpi: Int, maxEdge: Int): Bitmap {
        var w = page.width * dpi / 72f
        var h = page.height * dpi / 72f
        val longest = maxOf(w, h)
        if (longest > maxEdge) {
            val k = maxEdge / longest
            w *= k
            h *= k
        }
        val bitmap = Bitmap.createBitmap(w.toInt().coerceAtLeast(1), h.toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        // A page is transparent wherever nothing is drawn.
        bitmap.eraseColor(Color.WHITE)
        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
        // Every pixel is opaque now. Said out loud, because a bitmap that still claims an
        // alpha channel makes PDFBox write a transparency mask beside the picture: the
        // file doubles in size for a mask that hides nothing, and it is one more thing a
        // PDF viewer can get wrong.
        bitmap.setHasAlpha(false)
        return bitmap
    }

    @ReactMethod
    fun toImages(uri: String, password: String, format: String, dpi: Int, baseName: String, promise: Promise) {
        job(promise, "images_failed", "This PDF could not be turned into pictures.", password) { work ->
            emit("Opening the PDF", 0, 1)
            val file = renderable(stage(uri, work, "src"), work, password)
            val png = format == "png"
            val ext = if (png) "png" else "jpg"
            val folder = DownloadsWriter.safeName(baseName, "document") + " pictures"
            val files = mutableListOf<WritableMap>()
            ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
                PdfRenderer(fd).use { renderer ->
                    val total = renderer.pageCount
                    val digits = total.toString().length.coerceAtLeast(2)
                    for (i in 0 until total) {
                        emit("Drawing page ${i + 1} of $total", i, total)
                        val bitmap = renderer.openPage(i).use { renderPage(it, dpi, 4000) }
                        try {
                            val out = File(work, "page_$i.$ext")
                            FileOutputStream(out).use {
                                bitmap.compress(if (png) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG, 92, it)
                            }
                            val name = "${DownloadsWriter.safeName(baseName, "page")}-${(i + 1).toString().padStart(digits, '0')}.$ext"
                            files.add(DownloadsWriter.publish(ctx, out, name, if (png) "image/png" else "image/jpeg", folder))
                            out.delete()
                        } finally {
                            bitmap.recycle()
                        }
                    }
                    emit("Saved", total, total)
                }
            }
            result(files, folder)
        }
    }

    @ReactMethod
    fun extractImages(uri: String, password: String, baseName: String, promise: Promise) {
        job(promise, "extract_images_failed", "The pictures could not be taken out of this PDF.", password) { work ->
            emit("Opening the PDF", 0, 1)
            open(stage(uri, work, "src"), password).use { doc ->
                val folder = DownloadsWriter.safeName(baseName, "document") + " images"
                val files = mutableListOf<WritableMap>()
                val seen = Collections.newSetFromMap(IdentityHashMap<COSBase, Boolean>())
                val total = doc.numberOfPages
                for (i in 0 until total) {
                    val resources = doc.getPage(i).resources
                    if (resources != null) {
                        for (name in resources.xObjectNames.toList()) {
                            val image = try { resources.getXObject(name) as? PDImageXObject } catch (_: Exception) { null } ?: continue
                            if (!seen.add(image.cosObject)) continue
                            // Rules, bullets and spacer pixels are drawn as pictures too.
                            if (image.width < 24 || image.height < 24) continue
                            val bitmap = try { image.image } catch (_: Exception) { null } ?: continue
                            try {
                                // Photos stay JPEG; anything that may have transparency
                                // stays PNG so it does not gain a black background.
                                val jpeg = image.suffix.equals("jpg", true) || image.suffix.equals("jpeg", true)
                                val ext = if (jpeg) "jpg" else "png"
                                val out = File(work, "img_${files.size}.$ext")
                                FileOutputStream(out).use {
                                    bitmap.compress(if (jpeg) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG, 95, it)
                                }
                                val label = "page-${(i + 1).toString().padStart(2, '0')}-image-${(files.size + 1).toString().padStart(2, '0')}.$ext"
                                files.add(DownloadsWriter.publish(ctx, out, label, if (jpeg) "image/jpeg" else "image/png", folder))
                                out.delete()
                            } finally {
                                bitmap.recycle()
                            }
                        }
                    }
                    emit("Reading page ${i + 1} of $total", i + 1, total)
                }
                if (files.isEmpty()) throw UserError("This PDF has no pictures in it to take out.")
                result(files, folder)
            }
        }
    }

    // ------------------------------------------------------ make searchable

    /**
     * Reads the text of every page with ML Kit's bundled Latin model and writes a new
     * PDF: each page is a picture of the original with the recognised words laid over
     * it, invisible, so the text can be searched, selected and copied.
     *
     * The bundled model — not the Play services one — is the point. It ships in the
     * APK, so nothing is downloaded the first time and no page leaves the phone.
     */
    @ReactMethod
    fun makeSearchable(uri: String, password: String, baseName: String, promise: Promise) {
        job(promise, "ocr_failed", "This PDF could not be made searchable.", password) { work ->
            emit("Opening the PDF", 0, 1)
            val file = renderable(stage(uri, work, "src"), work, password)
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            // Hundreds of page pictures add up, so this one spills to disk too.
            val out = PDDocument(memory())
            var characters = 0
            var emptyPages = 0
            try {
                val font = PDType1Font.HELVETICA
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
                    PdfRenderer(fd).use { renderer ->
                        val total = renderer.pageCount
                        for (i in 0 until total) {
                            emit("Reading page ${i + 1} of $total", i, total)
                            var pageW = 0f
                            var pageH = 0f
                            val bitmap = renderer.openPage(i).use {
                                pageW = it.width.toFloat()
                                pageH = it.height.toFloat()
                                renderPage(it, 200, 3000)
                            }
                            try {
                                val text = Tasks.await(recognizer.process(InputImage.fromBitmap(bitmap, 0)))
                                val page = PDPage(PDRectangle(pageW, pageH))
                                out.addPage(page)
                                val picture = JPEGFactory.createFromImage(out, bitmap, 0.8f)
                                val before = characters
                                val kx = pageW / bitmap.width
                                val ky = pageH / bitmap.height
                                PDPageContentStream(out, page).use { s ->
                                    s.drawImage(picture, 0f, 0f, pageW, pageH)
                                    s.beginText()
                                    s.setRenderingMode(RenderingMode.NEITHER)
                                    for (block in text.textBlocks) {
                                        for (line in block.lines) {
                                            val box = line.boundingBox ?: continue
                                            // The standard font holds Latin-1 only.
                                            val clean = line.text.filter { it.code in 0x20..0x7E || it.code in 0xA0..0xFF }.trim()
                                            if (clean.isEmpty()) continue
                                            val size = (box.height() * ky * 0.85f).coerceIn(4f, 72f)
                                            val natural = font.getStringWidth(clean) / 1000f * size
                                            val wanted = box.width() * kx
                                            if (natural <= 0f) continue
                                            s.setFont(font, size)
                                            s.setHorizontalScaling((wanted / natural * 100f).coerceIn(10f, 400f))
                                            s.setTextMatrix(Matrix.getTranslateInstance(box.left * kx, pageH - box.bottom * ky + size * 0.2f))
                                            s.showText(clean)
                                            characters += clean.length
                                        }
                                    }
                                    s.endText()
                                }
                                if (characters == before) emptyPages++
                            } finally {
                                bitmap.recycle()
                            }
                            emit("Read page ${i + 1} of $total", i + 1, total)
                        }
                    }
                }
                // A file with nothing recognised on any page would be a picture-only copy
                // of the original that looks like a success and searches for nothing, so it
                // is refused here and not written.
                if (characters == 0) {
                    val n = out.numberOfPages
                    throw UserError(
                        "No recognisable text was found on ${if (n == 1) "this page" else "any of the $n pages"}, so there is nothing to make searchable. " +
                            "It may be handwriting, a script other than Latin, or a picture too faint to read.",
                    )
                }
                emit("Saving", 1, 1)
                val info = saved(out, work, pdfName(baseName, "searchable"))
                result(listOf(info)) { putInt("count", characters); putInt("emptyPages", emptyPages) }
            } finally {
                recognizer.close()
                try { out.close() } catch (_: Exception) {}
            }
        }
    }

    companion object {
        private const val PDF = "application/pdf"
    }
}
