package com.oofsss.coach365;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/** แทน MainActivity ที่ Capacitor สร้าง: เปิดแท็บตามที่แตะในวิดเจ็ต และอัปเดตวิดเจ็ตตอนออกจากแอป */
public class MainActivity extends BridgeActivity {
    private String pendingTab;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        takeTab(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        takeTab(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        openTab(0);
    }

    @Override
    public void onPause() {
        super.onPause();
        CoachWidget.refreshAll(this);
    }

    private void takeTab(Intent i) {
        if (i == null || !i.hasExtra("tab")) return;
        String t = i.getStringExtra("tab");
        i.removeExtra("tab");
        if (t != null && t.matches("[a-z]+")) pendingTab = t;
    }

    // หน้าเว็บโหลดจากเน็ต อาจยังไม่พร้อมตอนเปิดแอปครั้งแรก จึงลองซ้ำทุกครึ่งวินาที (สูงสุด 10 วิ)
    private void openTab(final int tries) {
        if (pendingTab == null || getBridge() == null || getBridge().getWebView() == null) return;
        final String tab = pendingTab;
        getBridge().getWebView().evaluateJavascript(
                "(function(){if(window.Coach&&Coach.show){Coach.show('" + tab + "');return 1}return 0})()",
                r -> {
                    if ("1".equals(r)) pendingTab = null;
                    else if (tries < 20) getBridge().getWebView().postDelayed(() -> openTab(tries + 1), 500);
                });
    }
}
