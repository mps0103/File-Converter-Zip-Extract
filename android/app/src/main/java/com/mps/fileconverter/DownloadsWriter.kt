package com.mps.fileconverter

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import java.io.File

/**
 * Puts a finished file into the public Downloads folder through MediaStore.
 *
 * The tool modules written after the first converters all end the same way, so the
 * step lives here once. The result has the same shape the older modules resolve with
 * (uri, path, name, mime), which is what the JavaScript side already expects.
 */
internal object DownloadsWriter {

    /**
     * What this run has put in Downloads so far, so a run that fails part-way can take
     * its own files back out. Set only inside [rollbackOnFailure]; a worker thread runs
     * one job at a time, so a thread-local is enough.
     */
    private val trail = ThreadLocal<MutableList<() -> Unit>?>()

    /** The same thing for code that cannot be a lambda: begin, then abort or end. */
    fun begin() { trail.set(mutableListOf()) }

    fun abort() {
        trail.get()?.asReversed()?.forEach { undo -> try { undo() } catch (_: Exception) {} }
        trail.remove()
    }

    fun end() { trail.remove() }

    /**
     * Runs [body] and, if it throws, removes every file it published, then rethrows.
     * A split that dies on page 40 or a picture batch that runs out of space leaves
     * nothing behind in Downloads, which matters because the app also counts nothing
     * for a failed run — a half-set of files with no conversion spent would be a
     * strange thing to find later.
     */
    fun <T> rollbackOnFailure(body: () -> T): T {
        val mine = mutableListOf<() -> Unit>()
        trail.set(mine)
        try {
            return body()
        } catch (t: Throwable) {
            mine.asReversed().forEach { undo -> try { undo() } catch (_: Exception) {} }
            throw t
        } finally {
            trail.remove()
        }
    }

    /**
     * @param folder a sub-folder of Downloads, or "" to write straight into it.
     */
    fun publish(
        ctx: ReactApplicationContext,
        file: File,
        displayName: String,
        mime: String,
        folder: String = "",
    ): WritableMap {
        val uri: Uri
        val shown: String

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val relPath = listOf(Environment.DIRECTORY_DOWNLOADS, folder)
                .filter { it.isNotBlank() }.joinToString("/") + "/"
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, displayName)
                put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.RELATIVE_PATH, relPath)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val resolver = ctx.contentResolver
            uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Downloads folder is not writable.")
            trail.get()?.add { resolver.delete(uri, null, null) }
            try {
                val out = resolver.openOutputStream(uri)
                    ?: throw IllegalStateException("Downloads folder is not writable.")
                out.use { o -> file.inputStream().use { it.copyTo(o) } }
            } catch (e: Exception) {
                // The row is still marked pending and holds whatever was written. Drop
                // it rather than leave a broken file in the user's Downloads.
                try { resolver.delete(uri, null, null) } catch (_: Exception) {}
                throw if (e is java.io.IOException)
                    java.io.IOException("The file could not be saved. The phone may be out of free storage.", e)
                else e
            }
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            shown = relPath + displayName
        } else {
            val dir = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                folder,
            )
            dir.mkdirs()
            val out = File(dir, displayName)
            trail.get()?.add { out.delete() }
            try {
                file.copyTo(out, overwrite = true)
            } catch (e: Exception) {
                out.delete()
                throw if (e is java.io.IOException)
                    java.io.IOException("The file could not be saved. The phone may be out of free storage.", e)
                else e
            }
            uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".provider", out)
            shown = out.absolutePath
        }

        return Arguments.createMap().apply {
            putString("uri", uri.toString())
            putString("path", shown)
            putString("name", displayName)
            putString("mime", mime)
        }
    }

    /**
     * Deletes the work folders of runs that never got to clean up after themselves (the
     * app was killed mid-conversion). Only ones over an hour old, so a run in progress is
     * never touched; called once when the app starts, before any run can be.
     */
    fun purgeStaleWork(ctx: ReactApplicationContext) {
        try {
            val cutoff = System.currentTimeMillis() - 60L * 60 * 1000
            ctx.cacheDir.listFiles()?.forEach {
                val ours = it.name.startsWith("pdfedit_") || it.name.startsWith("imgedit_") ||
                    it.name.startsWith("imgocr_") || it.name.startsWith("mediaedit_")
                if (ours && it.lastModified() < cutoff) it.deleteRecursively()
            }
        } catch (_: Exception) {
        }
    }

    /** Strips what a file or folder name cannot hold, without rewriting the rest. */
    fun safeName(name: String, fallback: String): String {
        val cleaned = buildString {
            for (ch in name) {
                when {
                    ch == '\\' || ch == '/' || ch == ':' || ch == '*' || ch == '?' ||
                        ch == '"' || ch == '<' || ch == '>' || ch == '|' -> append('_')
                    ch.code < 0x20 || ch.code == 0x7F -> Unit
                    else -> append(ch)
                }
            }
        }.trim().trimStart('.').trim()
        return cleaned.ifBlank { fallback }
    }
}
