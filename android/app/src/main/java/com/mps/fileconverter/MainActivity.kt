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
        // auto() picks the icon colour from the phone's own dark mode setting. It
        // is only ever right for the first frame: the app has its own light/dark
        // choice, which may disagree with the phone's, so JavaScript sets the bar
        // style again from the chosen theme as soon as a screen is drawn. This is
        // what stops the gap between the two being a frame of invisible icons.
        //
        // The bars are transparent either way; the screen paints its own colour
        // behind them and pads its content by the insets.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        super.onCreate(null)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
