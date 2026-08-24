package com.playfootbattle.app;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Android-specific integration shell for FootBattle.
 *
 * Keeps the remote Next.js app intact while adding the native behavior required
 * by the Android release: persistent cookies, Android back navigation, portrait
 * orientation, resize-on-keyboard behavior, exact App Link routing and native sharing.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        configureWebView();
        handleIncomingIntent(getIntent());
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

        webView.addJavascriptInterface(new FootBattleAndroidBridge(), "FootBattleAndroid");
    }

    private final class FootBattleAndroidBridge {
        @JavascriptInterface
        public void share(String title, String text, String url) {
            runOnUiThread(() -> {
                StringBuilder body = new StringBuilder();
                if (text != null && !text.trim().isEmpty()) body.append(text.trim());
                if (url != null && !url.trim().isEmpty()) {
                    if (body.length() > 0) body.append("\n");
                    body.append(url.trim());
                }

                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_SUBJECT,
                    title == null || title.trim().isEmpty() ? "FootBattle" : title.trim());
                shareIntent.putExtra(Intent.EXTRA_TEXT, body.toString());
                startActivity(Intent.createChooser(shareIntent, "FootBattle ile paylaş"));
            });
        }
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
