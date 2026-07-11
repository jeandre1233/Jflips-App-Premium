package com.jflips.pro

import android.os.Bundle
import android.graphics.Color
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.content.res.Configuration
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NativeNotificationPlugin::class.java)
        super.onCreate(savedInstanceState)
        
        val window: Window = window
        
        // Ensure system draws background for status/navigation bars
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION)
        
        // Detect system theme to match system bar style natively on launch
        val nightModeFlags = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        val isDarkMode = nightModeFlags == Configuration.UI_MODE_NIGHT_YES
        
        if (isDarkMode) {
            window.statusBarColor = Color.parseColor("#07090f") // top bar background matching dark mode
            window.navigationBarColor = Color.parseColor("#0d1117") // bottom nav background matching dark mode
            
            // Light system bar icons (white)
            var flags = window.decorView.systemUiVisibility
            flags = flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                flags = flags and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
            }
            window.decorView.systemUiVisibility = flags
        } else {
            window.statusBarColor = Color.parseColor("#f8fafc") // top bar background matching light mode
            window.navigationBarColor = Color.parseColor("#ffffff") // bottom nav background matching light mode
            
            // Dark system bar icons (dark grey)
            var flags = window.decorView.systemUiVisibility
            flags = flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                flags = flags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            }
            window.decorView.systemUiVisibility = flags
        }
    }
}
