package com.mps.fileconverter

import android.graphics.Color
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "FileConverterByMPS"

    /** Hands the system splash over to the JS splash without a white flash between them. */
    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        // Android 15 draws every app edge to edge whether it asks to or not, and the
        // attributes that used to colour the bars — android:statusBarColor and
        // android:navigationBarColor — are deprecated and ignored there. Asking for it
        // here instead gets the same transparent bars on Android 7 through 16, so the
        // app looks the same everywhere rather than only on the newest phones.
        //
        // light() means a light bar with dark icons, which is what this app's pale
        // canvas needs. The bars are transparent; the screen paints its own colour
        // behind them and pads its content by the insets.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        super.onCreate(null)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
