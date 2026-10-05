package com.jflips.pro

import android.content.res.Configuration
import android.os.Bundle
import android.util.Log
import androidx.core.graphics.toColorInt
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        initFirebaseFallback()
        registerPlugin(NativeNotificationPlugin::class.java)
        super.onCreate(savedInstanceState)
        
        // Detect system theme to match system bar style natively on launch
        val nightModeFlags = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        val isDarkMode = nightModeFlags == Configuration.UI_MODE_NIGHT_YES
        
        window.statusBarColor = if (isDarkMode) "#07090f".toColorInt() else "#f8fafc".toColorInt()
        window.navigationBarColor = if (isDarkMode) "#0d1117".toColorInt() else "#ffffff".toColorInt()

        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = !isDarkMode
        insetsController.isAppearanceLightNavigationBars = !isDarkMode
    }

    private fun initFirebaseFallback() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                try {
                    FirebaseApp.initializeApp(this)
                } catch (e: Exception) {
                    Log.w("MainActivity", "Default FirebaseApp init skipped or failed: ${e.message}")
                }
            }
            if (FirebaseApp.getApps(this).isEmpty()) {
                val options = FirebaseOptions.Builder()
                    .setApplicationId("1:100000000000:android:0000000000000000000000")
                    .setApiKey("AIzaSyDummyApiKeyForFirebaseInitFallback00")
                    .setProjectId("jflips-pro-app")
                    .setGcmSenderId("100000000000")
                    .build()
                FirebaseApp.initializeApp(this, options)
                Log.i("MainActivity", "Fallback FirebaseApp initialized successfully")
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Could not initialize FirebaseApp", e)
        }
    }
}
