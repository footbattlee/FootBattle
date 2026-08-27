package com.footbattle.app;

import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import java.io.OutputStream;

/** Android-specific integration shell for FootBattle. */
public class MainActivity extends BridgeActivity {
    private final Handler connectivityHandler = new Handler(Looper.getMainLooper());
    private Boolean lastOnlineState = null;
    private boolean connectivityWatcherRunning = false;
    private long lastBackPressedAt = 0L;
    private static final long BACK_EXIT_CONFIRM_WINDOW_MS = 2000L;

    private final Runnable connectivityWatcher = new Runnable() {
        @Override public void run() {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView == null) { scheduleConnectivityCheck(); return; }
            webView.evaluateJavascript("(function(){try{return navigator.onLine ? '1' : '0';}catch(e){return '0';}})();", value -> {
                boolean online = "\"1\"".equals(value) || "1".equals(value);
                if (lastOnlineState != null && !lastOnlineState && online) {
                    webView.postDelayed(() -> { if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().reload(); }, 500);
                }
                lastOnlineState = online;
                scheduleConnectivityCheck();
            });
        }
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        configureWebView(); handleIncomingIntent(getIntent()); startConnectivityWatcher();
    }

    private void configureWebView() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        WebSettings settings = webView.getSettings(); settings.setDomStorageEnabled(true);
        CookieManager cookies = CookieManager.getInstance(); cookies.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) cookies.setAcceptThirdPartyCookies(webView, true);
        cookies.flush(); webView.addJavascriptInterface(new FootBattleAndroidBridge(), "FootBattleAndroid");
    }
    private void startConnectivityWatcher(){ if(connectivityWatcherRunning)return; connectivityWatcherRunning=true; connectivityHandler.removeCallbacks(connectivityWatcher); connectivityHandler.post(connectivityWatcher); }
    private void stopConnectivityWatcher(){ connectivityWatcherRunning=false; connectivityHandler.removeCallbacks(connectivityWatcher); }
    private void scheduleConnectivityCheck(){ if(!connectivityWatcherRunning)return; connectivityHandler.removeCallbacks(connectivityWatcher); connectivityHandler.postDelayed(connectivityWatcher,1500); }
    private String buildShareBody(String text,String url){ StringBuilder body=new StringBuilder(); if(text!=null&&!text.trim().isEmpty())body.append(text.trim()); if(url!=null&&!url.trim().isEmpty()){if(body.length()>0)body.append("\n");body.append(url.trim());} return body.toString(); }

    private final class FootBattleAndroidBridge {
        @JavascriptInterface public void share(String title,String text,String url){ runOnUiThread(()->{ Intent i=new Intent(Intent.ACTION_SEND); i.setType("text/plain"); i.putExtra(Intent.EXTRA_SUBJECT,title==null||title.trim().isEmpty()?"FootBattle":title.trim()); i.putExtra(Intent.EXTRA_TEXT,buildShareBody(text,url)); startActivity(Intent.createChooser(i,"FootBattle ile paylaş")); }); }
        @JavascriptInterface public void shareImage(String title,String text,String url,String dataUrl){ runOnUiThread(()->{ try { if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q||dataUrl==null||dataUrl.trim().isEmpty()){share(title,text,url);return;} String base64Data=dataUrl; int comma=base64Data.indexOf(','); if(comma>=0)base64Data=base64Data.substring(comma+1); byte[] bytes=Base64.decode(base64Data,Base64.DEFAULT); ContentValues values=new ContentValues(); values.put(MediaStore.Images.Media.DISPLAY_NAME,"footbattle-halisaha-"+System.currentTimeMillis()+".png"); values.put(MediaStore.Images.Media.MIME_TYPE,"image/png"); values.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/FootBattle"); values.put(MediaStore.Images.Media.IS_PENDING,1); Uri imageUri=getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values); if(imageUri==null)throw new IllegalStateException("Image URI could not be created"); try(OutputStream output=getContentResolver().openOutputStream(imageUri)){if(output==null)throw new IllegalStateException("Image output stream could not be opened");output.write(bytes);output.flush();} ContentValues ready=new ContentValues();ready.put(MediaStore.Images.Media.IS_PENDING,0);getContentResolver().update(imageUri,ready,null,null); Intent i=new Intent(Intent.ACTION_SEND);i.setType("image/png");i.putExtra(Intent.EXTRA_STREAM,imageUri);i.putExtra(Intent.EXTRA_SUBJECT,title==null||title.trim().isEmpty()?"FootBattle":title.trim());i.putExtra(Intent.EXTRA_TEXT,buildShareBody(text,url));i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(Intent.createChooser(i,"FootBattle ile paylaş")); } catch(Exception error){error.printStackTrace();share(title,text,url);} }); }
    }

    private void handleIncomingIntent(Intent intent){ if(intent==null||intent.getData()==null)return; Uri uri=intent.getData(); String scheme=uri.getScheme(),host=uri.getHost(); if(!"https".equalsIgnoreCase(scheme)||!("playfootbattle.com".equalsIgnoreCase(host)||"www.playfootbattle.com".equalsIgnoreCase(host)))return; WebView webView=getBridge()!=null?getBridge().getWebView():null; if(webView!=null)webView.post(()->webView.loadUrl(uri.toString())); }
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleIncomingIntent(intent);}
    @Override public void onResume(){super.onResume();startConnectivityWatcher();}
    @Override public void onPause(){stopConnectivityWatcher();CookieManager.getInstance().flush();super.onPause();}
    @Override public void onStop(){CookieManager.getInstance().flush();super.onStop();}
    @Override public void onDestroy(){stopConnectivityWatcher();super.onDestroy();}
    @Override public void onBackPressed(){
        WebView webView=getBridge()!=null?getBridge().getWebView():null;
        if(webView!=null&&webView.canGoBack()){
            lastBackPressedAt=0L;
            webView.goBack();
            return;
        }
        long now=System.currentTimeMillis();
        if(now-lastBackPressedAt>BACK_EXIT_CONFIRM_WINDOW_MS){
            lastBackPressedAt=now;
            Toast.makeText(this,"Uygulamadan çıkmak için tekrar geri basın",Toast.LENGTH_SHORT).show();
            return;
        }
        super.onBackPressed();
    }
}
