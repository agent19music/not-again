const { AndroidConfig, withDangerousMod } = require('expo/config-plugins');
const { copyFileSync, mkdirSync } = require('fs');
const { dirname, join } = require('path');

const FONT_SOURCE = 'node_modules/@expo-google-fonts/geist-mono/400Regular/GeistMono_400Regular.ttf';

const LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/streak_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:gravity="center"
  android:orientation="vertical"
  android:padding="16dp">

  <Chronometer
    android:id="@+id/streak_chrono"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:fontFamily="@font/geist_mono"
    android:includeFontPadding="false"
    android:textSize="36sp" />

  <TextView
    android:id="@+id/streak_empty"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:fontFamily="@font/geist_mono"
    android:includeFontPadding="false"
    android:text="00:00:00"
    android:textSize="36sp"
    android:visibility="gone" />

  <TextView
    android:id="@+id/streak_caption"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginTop="4dp"
    android:fontFamily="@font/geist_mono"
    android:includeFontPadding="false"
    android:textSize="13sp" />
</LinearLayout>
`;

function providerSource(androidPackage) {
  return `package ${androidPackage}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Home screen streak. Chronometer is ticked by the launcher, so the count
 * moves while the app is closed. The app only writes a new base when the log changes.
 */
class StreakWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    val views = buildViews(context)
    appWidgetManager.updateAppWidget(appWidgetIds, views)
  }

  companion object {
    private const val PREFS = "expo.modules.widgets"
    private const val PROPS_KEY = "__expo_widgets_StreakWidget_props"

    fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.streak_widget)
      val night = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK ==
        Configuration.UI_MODE_NIGHT_YES
      val background = if (night) 0xFF0A0A0A.toInt() else 0xFFFAFAFA.toInt()
      val digit = if (night) 0xFFE85A6F.toInt() else 0xFFD83C55.toInt()
      val muted = if (night) 0xFFA3A3A3.toInt() else 0xFF737373.toInt()

      views.setInt(R.id.streak_root, "setBackgroundColor", background)
      views.setTextColor(R.id.streak_chrono, digit)
      views.setTextColor(R.id.streak_empty, digit)
      views.setTextColor(R.id.streak_caption, muted)

      val lastOccurredAt = readLastOccurredAt(context)
      val now = System.currentTimeMillis()
      if (lastOccurredAt == null || lastOccurredAt > now) {
        views.setViewVisibility(R.id.streak_chrono, View.GONE)
        views.setViewVisibility(R.id.streak_empty, View.VISIBLE)
        views.setTextViewText(
          R.id.streak_caption,
          if (lastOccurredAt == null) "Nothing logged yet." else "since last goon"
        )
      } else {
        val elapsed = now - lastOccurredAt
        val base = SystemClock.elapsedRealtime() - elapsed
        views.setViewVisibility(R.id.streak_chrono, View.VISIBLE)
        views.setViewVisibility(R.id.streak_empty, View.GONE)
        views.setChronometer(R.id.streak_chrono, base, null, true)
        views.setTextViewText(R.id.streak_caption, "since last goon")
      }

      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pending = PendingIntent.getActivity(
          context,
          0,
          launch,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.streak_root, pending)
      }
      return views
    }

    private fun readLastOccurredAt(context: Context): Long? {
      val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(PROPS_KEY, null) ?: return null
      val value = JSONObject(raw).opt("lastOccurredAt")
      return when (value) {
        is Number -> value.toLong().takeIf { it > 0L }
        else -> null
      }
    }
  }
}
`;
}

function withStreakChronometer(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      const packageName = AndroidConfig.Package.getPackage(config);
      if (!packageName) {
        throw new Error('android.package is required for the streak widget.');
      }

      const layoutPath = join(androidRoot, 'app/src/main/res/layout/streak_widget.xml');
      const fontPath = join(androidRoot, 'app/src/main/res/font/geist_mono.ttf');
      const providerPath = join(
        androidRoot,
        'app/src/main/java',
        ...packageName.split('.'),
        'StreakWidgetProvider.kt'
      );

      mkdirSync(dirname(layoutPath), { recursive: true });
      mkdirSync(dirname(fontPath), { recursive: true });
      mkdirSync(dirname(providerPath), { recursive: true });

      const { writeFileSync } = require('fs');
      writeFileSync(layoutPath, LAYOUT_XML);
      writeFileSync(providerPath, providerSource(packageName));
      copyFileSync(join(projectRoot, FONT_SOURCE), fontPath);

      return config;
    },
  ]);
}

module.exports = withStreakChronometer;
