package com.mps.fileconverter

import android.app.Application
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.cache.MemoryCacheParams
import com.facebook.imagepipeline.core.DownsampleMode
import com.facebook.imagepipeline.core.ImagePipelineConfig
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.shell.MainPackageConfig
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this@MainApplication, MainPackageConfig(imagePipelineConfig()))
                    .packages
                    .apply { add(FileBridgePackage()) }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) load()
    }

    /**
     * React Native's image cache, given a ceiling.
     *
     * Left alone it takes a quarter of the heap limit, which on a large-heap phone
     * is well over a hundred megabytes of decoded bitmaps held on the chance they
     * are asked for again. This app shows a handful of icons and, in the viewer,
     * PDF pages rendered to cache files — re-reading one of those costs a disk read
     * of a few hundred kB, so a large cache buys very little and is exactly the
     * bitmap memory Play now measures.
     *
     * AUTO downsampling decodes to the size the view asked for rather than the size
     * the file happens to be, so a page drawn at 1600 px and shown at 400 does not
     * sit in memory sixteen times larger than it is on screen.
     */
    private fun imagePipelineConfig(): ImagePipelineConfig =
        ImagePipelineConfig.newBuilder(this)
            .setBitmapMemoryCacheParamsSupplier {
                MemoryCacheParams(
                    32 * 1024 * 1024, // the whole cache
                    64,               // entries
                    8 * 1024 * 1024,  // what may sit in the eviction queue
                    16,
                    8 * 1024 * 1024,  // the largest single entry worth caching
                )
            }
            .setDownsampleMode(DownsampleMode.AUTO)
            .build()

    /**
     * What is given back when the app leaves the screen.
     *
     * Play measures memory held in the background, where an app that is only being
     * kept warm has no business holding decoded images at all. TRIM_MEMORY_UI_HIDDEN
     * is the first level that means "the user has gone elsewhere", so everything
     * re-creatable goes at that point: Fresco's bitmaps here, and whatever JS is
     * holding, via an event the viewer listens for.
     */
    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level < TRIM_MEMORY_UI_HIDDEN) return

        if (Fresco.hasBeenInitialized()) {
            try {
                Fresco.getImagePipeline().clearMemoryCaches()
            } catch (_: Exception) {
                // Nothing to clear is not a failure worth reporting.
            }
        }

        val context: ReactContext? = reactNativeHost.reactInstanceManager.currentReactContext
        if (context != null && context.hasActiveReactInstance()) {
            try {
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("memoryTrim", null)
            } catch (_: Exception) {
                // The bridge going away is itself the memory being released.
            }
        }
    }
}
