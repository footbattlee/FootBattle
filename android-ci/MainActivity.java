package com.playfootbattle.app;

import android.Manifest;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import com.google.firebase.messaging.FirebaseMessaging;

/**
 * Android-specific integration shell for FootBattle.
 *
 * Keeps the existing remote Next.js app intact while adding the native behavior
 * required by the Android release: persistent cookies, Android back navigation,
 * portrait/keyboard polish, exact App Link routing, FCM registration visibility
 * for debug testing and a one-time Crashlytics non-fatal probe.
 */
public class MainActivity extends BridgeActivity {

    private static final int NOTIFICATION_PERMISSION_REQUEST = 1907;
    private static final String PREFS = "footbattle_android_debug";
    private static final String PREF_FCM_SHOWN = "fcm_token_shown_v1";
    private static final String PREF_CRASHLYTICS_SENT = "crashlytics_probe_sent_v1";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN);

        configureWebView();
        handleIncomingIntent(getIntent());
        configureFirebaseDebugChecks();
    }

    private void configureWebView() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;

        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookies.setAcceptThirdPartyCookies(webView, true);
        }
        cookies.flush();
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;

        Uri uri = intent.getData();
        String scheme = uri.getScheme();
        String host = uri.getHost();

        if (!"https".equalsIgnoreCase(scheme) ||
            !("playfootbattle.com".equalsIgnoreCase(host) ||
              "www.playfootbattle.com".equalsIgnoreCase(host))) {
            return;
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.post(() -> webView.loadUrl(uri.toString()));
        }
    }

    private void configureFirebaseDebugChecks() {
        requestNotificationPermissionIfNeeded();

        if (!BuildConfig.DEBUG) return;

        boolean crashlyticsSent = getSharedPreferences(PREFS, MODE_PRIVATE)
            .getBoolean(PREF_CRASHLYTICS_SENT, false);

        if (!crashlyticsSent) {
            FirebaseCrashlytics.getInstance().recordException(
                new RuntimeException("FootBattle Android integration test: non-fatal probe")
            );
            getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putBoolean(PREF_CRASHLYTICS_SENT, true)
                .apply();
        }

        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().isEmpty()) {
                return;
            }

            boolean shown = getSharedPreferences(PREFS, MODE_PRIVATE)
                .getBoolean(PREF_FCM_SHOWN, false);
            if (!shown) {
                showFcmTokenForDebug(task.getResult());
            }
        });
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                NOTIFICATION_PERMISSION_REQUEST
            );
        }
    }

    private void showFcmTokenForDebug(String token) {
        runOnUiThread(() -> new AlertDialog.Builder(this)
            .setTitle("FootBattle Push Test")
            .setMessage("FCM token hazır. Firebase Console'dan test bildirimi göndermek için kopyalayabilirsin.\n\n" + token)
            .setPositiveButton("Kopyala", (dialog, which) -> {
                ClipboardManager clipboard =
                    (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText("FootBattle FCM Token", token));
                Toast.makeText(this, "FCM token kopyalandı", Toast.LENGTH_SHORT).show();
                getSharedPreferences(PREFS, MODE_PRIVATE)
                    .edit()
                    .putBoolean(PREF_FCM_SHOWN, true)
                    .apply();
            })
            .setNegativeButton("Kapat", (dialog, which) -> {
                getSharedPreferences(PREFS, MODE_PRIVATE)
                    .edit()
                    .putBoolean(PREF_FCM_SHOWN, true)
                    .apply();
            })
            .show());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    @Override
    public void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    public void onStop() {
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
