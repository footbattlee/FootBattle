package com.playfootbattle.app;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Android-specific polish for the Capacitor shell.
 *
 * Keeps the existing remote Next.js application intact while fixing native
 * Android behavior discovered during the first physical-device smoke test.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // FootBattle's current mobile UX is portrait-first. Locking orientation
        // prevents the desktop breakpoint/layout from appearing on rotation.
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        // Pan the WebView to the focused input instead of shrinking the whole
        // viewport and lifting the fixed bottom navigation above the keyboard.
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);

            CookieManager cookies = CookieManager.getInstance();
            cookies.setAcceptCookie(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                cookies.setAcceptThirdPartyCookies(webView, true);
            }
            cookies.flush();
        }
    }

    @Override
    protected void onPause() {
        // Supabase SSR/browser auth uses browser cookies. Explicitly flushing
        // them prevents a process kill from losing a freshly-created session.
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onStop() {
        CookieManager.getInstance().flush();
        super.onStop();
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
}
