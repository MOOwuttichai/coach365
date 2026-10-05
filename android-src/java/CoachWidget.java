package com.oofsss.coach365;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * วิดเจ็ตหน้าจอโฮม: อ่านสรุปที่หน้าเว็บเขียนไว้ใน Preferences (SharedPreferences "CapacitorStorage" key "widget")
 * หน้าเว็บส่งแผน 14 วันข้างหน้ามาด้วย ปิดแอปหลายวันวิดเจ็ตก็ยังบอกโปรแกรมของวันนั้นได้
 */
public class CoachWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        RemoteViews v = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, v);
    }

    /** เรียกจาก MainActivity ตอนออกจากแอป ให้วิดเจ็ตแสดงข้อมูลล่าสุดทันที */
    public static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, CoachWidget.class));
        if (ids.length == 0) return;
        RemoteViews v = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, v);
    }

    private static PendingIntent open(Context ctx, String tab, int code) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        i.putExtra("tab", tab);
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String n(int x) {
        return NumberFormat.getIntegerInstance(Locale.US).format(x);
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.coach_widget);
        v.setOnClickPendingIntent(R.id.cw_root, open(ctx, "today", 1));
        v.setOnClickPendingIntent(R.id.cw_act, open(ctx, "train", 2));
        v.setOnClickPendingIntent(R.id.cw_stats, open(ctx, "food", 3));

        Date now = new Date();
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now);
        String hm = new SimpleDateFormat("HH:mm", Locale.US).format(now);

        SharedPreferences sp = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = sp.getString("widget", null);
        JSONObject snap = null, day = null;
        try {
            if (raw != null) {
                snap = new JSONObject(raw);
                day = snap.getJSONObject("days").optJSONObject(today);
            }
        } catch (Exception e) {
            snap = null;
        }

        if (snap == null || day == null) {
            v.setTextViewText(R.id.cw_day, "Coach 365");
            v.setTextViewText(R.id.cw_phase, "");
            v.setTextViewText(R.id.cw_next, "แตะเพื่อเปิดแอป");
            v.setTextViewText(R.id.cw_act, "วิดเจ็ตจะแสดงแผนวันนี้หลังเปิดแอปครั้งแรก");
            v.setTextViewText(R.id.cw_stats, "");
            v.setTextViewText(R.id.cw_foot, "");
            v.setProgressBar(R.id.cw_bar, 1, 0, false);
            return v;
        }

        boolean fresh = today.equals(snap.optString("date"));
        v.setTextViewText(R.id.cw_day, day.optString("label"));
        v.setTextViewText(R.id.cw_phase, day.optString("phase"));
        v.setTextViewText(R.id.cw_act, "💪 " + day.optString("act") + "   🍽 " + day.optString("win"));

        // ทำอะไรต่อ: อันแรกที่ยังไม่ทำและถึงเวลาแล้ว ถ้าไม่มี = อันถัดไป
        int done = 0, count = 0;
        String next = null, upcoming = null;
        JSONArray acts = fresh ? snap.optJSONArray("acts") : null;
        if (acts != null) {
            count = acts.length();
            for (int k = 0; k < acts.length(); k++) {
                JSONArray a = acts.optJSONArray(k);
                if (a == null) continue;
                String t = a.optString(0), title = a.optString(1);
                if (a.optInt(2) == 1) { done++; continue; }
                if (t.compareTo(hm) <= 0 && next == null) next = "ตอนนี้ · " + t + "  " + title;
                if (t.compareTo(hm) > 0 && upcoming == null) upcoming = "ต่อไป " + t + "  " + title;
            }
        }
        if (next == null) next = upcoming;
        if (next == null) next = acts != null && count > 0 ? "วันนี้ครบทุกอย่างแล้ว 🎉" : fresh ? "แตะเพื่อดูแผนวันนี้" : "วันใหม่แล้ว แตะเพื่อเริ่มวันนี้";
        v.setTextViewText(R.id.cw_next, next);

        int eaten = fresh ? snap.optInt("eaten") : 0, prot = fresh ? snap.optInt("prot") : 0, steps = fresh ? snap.optInt("steps") : 0;
        v.setTextViewText(R.id.cw_stats, "🔥 " + n(eaten) + "/" + n(day.optInt("kcal")) + " kcal   🥩 " + prot + "/" + day.optInt("prot")
                + " ก.   👣 " + n(steps) + "/" + n(day.optInt("steps")));

        v.setProgressBar(R.id.cw_bar, Math.max(1, count), done, false);
        String w = snap.isNull("weight") ? "" : String.format(Locale.US, "%.1f กก. · ", snap.optDouble("weight"));
        v.setTextViewText(R.id.cw_foot, (count > 0 ? "เสร็จ " + done + "/" + count + " · " : "") + w + "อัปเดต " + (fresh ? snap.optString("updated") : "เมื่อวาน"));
        return v;
    }
}
