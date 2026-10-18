package com.goodmorning.modocultiva;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
    private static final String APP_URL = "https://dev.modocultiva.goodmorning.mx/";
    private WebView webView;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().getHost().endsWith("goodmorning.mx");
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setUserAgentString(webView.getSettings().getUserAgentString() + " ModoCultivaAndroidApp/1.0");
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setSupportZoom(false);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        setContentView(webView);
        if (state == null) webView.loadUrl(APP_URL);
        else webView.restoreState(state);
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
