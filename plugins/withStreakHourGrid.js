/**
 * Streak widget, concept C "Hour grid", native side.
 *
 * Android: replaces the expo-widgets Glance provider with a RemoteViews provider
 * that paints the widget into a bitmap (Geist Pixel Square timer, 60-square hour
 * grid, flat confetti frames) and schedules its own next repaint for the next
 * streak minute or confetti frame boundary. The logic is a Kotlin port of
 * src/widgets/hour-grid.ts; keep the two in step.
 *
 * iOS: bundles Geist Pixel Square and Geist Medium into the ExpoWidgetsTarget
 * extension (copy, Resources build phase, UIAppFonts). Runs as a finalized mod
 * so the extension target written by expo-widgets already exists.
 *
 * Both platforms write in finalized mods so expo-widgets output is never
 * clobbered back. Everything is written at prebuild time, so it is CNG safe.
 */
const { AndroidConfig, withFinalizedMod } = require('expo/config-plugins');
const { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');

const PIXEL_FONT = 'assets/fonts/GeistPixel-Square.otf';
const LABEL_FONT = 'node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf';
const IOS_TARGET = 'ExpoWidgetsTarget';
const IOS_FONTS = [
  { source: PIXEL_FONT, file: 'GeistPixel-Square.otf' },
  { source: LABEL_FONT, file: 'Geist-Medium.ttf' },
];

/**
 * Reads Colors from src/constants/theme.ts (the single source of truth) at
 * prebuild. Parsed as text so the plugin needs no TypeScript loader.
 */
function readThemeColors(projectRoot = join(__dirname, '..')) {
  const src = readFileSync(join(projectRoot, 'src/constants/theme.ts'), 'utf8');
  const block = (mode) => {
    const m = src.match(new RegExp(`\\b${mode}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`));
    if (!m) throw new Error(`withStreakHourGrid: Colors.${mode} not found in theme.ts`);
    const out = {};
    for (const [, key, value] of m[1].matchAll(/^\s*(\w+):\s*'([^']+)'/gm)) out[key] = value;
    return out;
  };
  const pick = (c, mode) => {
    const keys = ['background', 'text', 'textSecondary', 'border', 'accent', 'confettiOrange', 'confettiYellow'];
    for (const k of keys) {
      if (!/^#[0-9a-fA-F]{6}$/.test(c[k] ?? '')) throw new Error(`withStreakHourGrid: Colors.${mode}.${k} missing`);
    }
    return Object.fromEntries(keys.map((k) => [k, c[k]]));
  };
  const light = pick(block('light'), 'light');
  const dark = pick(block('dark'), 'dark');
  return { light, dark, confettiExtra: [light.confettiOrange, light.confettiYellow] };
}

const ANDROID_COLORS = readThemeColors();

const LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/streak_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent">

  <ImageView
    android:id="@+id/streak_canvas"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:scaleType="fitXY" />
</FrameLayout>
`;

const argb = (hex) => `0xFF${hex.slice(1).toUpperCase()}.toInt()`;

function providerSource(androidPackage) {
  const L = ANDROID_COLORS.light;
  const D = ANDROID_COLORS.dark;
  const [orange, yellow] = ANDROID_COLORS.confettiExtra;
  return `package ${androidPackage}

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.widget.RemoteViews
import androidx.core.content.res.ResourcesCompat
import org.json.JSONObject
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/** Kotlin port of src/widgets/hour-grid.ts. Keep in step. */
object HourGrid {
  const val MINUTE = 60_000L
  const val HOUR = 3_600_000L
  const val BURST_END_S = 150
  const val DRIFT_END_S = 280
  const val SETTLE_END_S = 300
  const val FRAME_STEP_S = 30
  val BOUNDARIES_S = intArrayOf(30, 60, 90, 120, 150, 180, 210, 240, 270, 280, 300)

  fun elapsed(last: Long?, now: Long): Long = if (last == null) 0L else max(0L, now - last)

  fun phase(ms: Long): String {
    if (ms < HOUR) return "none"
    val into = ((ms % HOUR) / 1000L).toInt()
    return when {
      into < BURST_END_S -> "burst"
      into < DRIFT_END_S -> "drift"
      into < SETTLE_END_S -> "settle"
      else -> "none"
    }
  }

  fun frame(ms: Long): Int {
    val into = ((ms % HOUR) / 1000L).toInt()
    return when (phase(ms)) {
      "burst" -> into / FRAME_STEP_S
      "drift" -> (into - BURST_END_S) / FRAME_STEP_S
      else -> 0
    }
  }

  fun nextChangeAt(last: Long?, now: Long): Long? {
    if (last == null) return null
    if (now < last) return last
    val ms = now - last
    var next = last + (ms / MINUTE + 1) * MINUTE
    if (ms >= HOUR) {
      val hourStart = last + (ms / HOUR) * HOUR
      for (b in BOUNDARIES_S) {
        val at = hourStart + b * 1000L
        if (at > now) {
          next = min(next, at)
          break
        }
      }
    }
    return next
  }

  data class Piece(val x: Double, val y: Double, val w: Int, val h: Int, val rot: Int, val color: Int)

  fun pieces(phase: String, frame: Int, seed: Long): List<Piece> {
    val kind = when (phase) { "burst" -> 1; "drift" -> 2; "settle" -> 3; else -> return emptyList() }
    var s = (abs(seed) * 7919L + kind * 104729L) % 2147483647L
    if (s <= 0L) s += 2147483646L
    fun r(): Double {
      s = (s * 16807L) % 2147483647L
      return s.toDouble() / 2147483647.0
    }
    fun round3(v: Double): Double = Math.round(v * 1000.0) / 1000.0
    val n = when (kind) { 1 -> 36; 2 -> 16; else -> 14 }
    val out = ArrayList<Piece>(n)
    for (i in 0 until n) {
      val size = 4 + floor(r() * 3).toInt()
      val strip = kind != 3 && r() < 0.3
      val rot = floor(r() * 360).toInt()
      var x: Double
      var y: Double
      if (kind == 1) {
        val a = r() * PI * 2
        val d = 0.15 + r() * 0.45
        val p = (frame + 1) / 5.0
        x = 0.5 + cos(a) * d * p
        y = 0.45 + sin(a) * d * 0.7 * p - 0.2 * p + 0.5 * p * p
      } else if (kind == 2) {
        x = r()
        y = ((r() + frame * 0.2) % 1.0) * 1.1 - 0.05
      } else {
        x = 0.03 + r() * 0.92
        y = 0.93 - r() * 0.05
      }
      out.add(Piece(round3(x), round3(y), size, if (strip) Math.round(size * 2.2).toInt() else size, rot, i % 4))
    }
    return out
  }
}

/** Paints one frame of the hour-grid widget. Flat fills only. */
object HourGridRenderer {
  private fun pad2(n: Long) = n.toString().padStart(2, '0')

  fun render(context: Context, wDp: Int, hDp: Int, night: Boolean, last: Long?, now: Long): Bitmap {
    val density = min(context.resources.displayMetrics.density, 2.5f)
    val w = max(wDp, 60).toFloat()
    val h = max(hDp, 60).toFloat()
    val bitmap = Bitmap.createBitmap((w * density).roundToInt(), (h * density).roundToInt(), Bitmap.Config.ARGB_8888)
    val c = Canvas(bitmap)
    c.scale(density, density)

    val bg = if (night) ${argb(D.background)} else ${argb(L.background)}
    val ink = if (night) ${argb(D.text)} else ${argb(L.text)}
    val muted = if (night) ${argb(D.textSecondary)} else ${argb(L.textSecondary)}
    val empty = if (night) ${argb(D.border)} else ${argb(L.border)}
    val accent = if (night) ${argb(D.accent)} else ${argb(L.accent)}
    val palette = intArrayOf(accent, ink, ${argb(orange)}, ${argb(yellow)})

    val clip = Path().apply { addRoundRect(RectF(0f, 0f, w, h), 28f, 28f, Path.Direction.CW) }
    c.clipPath(clip)
    c.drawColor(bg)

    val pixelFace = ResourcesCompat.getFont(context, R.font.geist_pixel_square) ?: Typeface.MONOSPACE
    val labelFace = ResourcesCompat.getFont(context, R.font.geist_medium) ?: Typeface.DEFAULT
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    fun text(face: Typeface, size: Float, color: Int) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      typeface = face; textSize = size; this.color = color
    }
    /** Shrinks the size until the text fits the width. */
    fun fitted(p: Paint, s: String, maxW: Float): Paint {
      while (p.measureText(s) > maxW && p.textSize > 8f) p.textSize -= 1f
      return p
    }
    fun drawTop(p: Paint, s: String, x: Float, top: Float) = c.drawText(s, x, top - p.fontMetrics.ascent, p)
    fun drawBottom(p: Paint, s: String, x: Float, bottom: Float) = c.drawText(s, x, bottom - p.fontMetrics.descent, p)
    fun drawTopRight(p: Paint, s: String, right: Float, top: Float) = drawTop(p, s, right - p.measureText(s), top)
    fun lineH(p: Paint) = p.fontMetrics.descent - p.fontMetrics.ascent

    val logged = last != null
    val ms = HourGrid.elapsed(last, now)
    val secs = ms / 1000L
    val days = secs / 86400L
    val clock = if (logged) pad2((secs % 86400L) / 3600L) + ":" + pad2((secs % 3600L) / 60L) else "00:00"
    val filled = if (logged) ((secs % 3600L) / 60L).toInt() else 0
    val dayLong = if (logged) (if (days == 1L) "1 day" else "$days days") else ""
    val dayShort = if (logged) "\${days}d" else ""
    val caption = if (logged) "since last goon" else "Nothing logged yet."

    fun grid(x: Float, y: Float, cell: Float, gap: Float) {
      for (i in 0 until 60) {
        val cx = x + (i % 10) * (cell + gap)
        val cy = y + (i / 10) * (cell + gap)
        fill.color = if (i < filled) accent else empty
        c.drawRect(cx, cy, cx + cell, cy + cell, fill)
      }
    }
    fun cellFor(maxCell: Float, gap: Float, width: Float) = max(4f, min(maxCell, (width - 9 * gap) / 10f))

    val pad = 16f
    val large = h >= 250f
    val medium = !large && w >= 250f
    if (large) {
      val lbl = text(labelFace, 13f, muted)
      drawTop(lbl, dayLong, pad, pad)
      drawTopRight(lbl, caption, w - pad, pad)
      val timer = fitted(text(pixelFace, 62f, ink), clock, w - 2 * pad)
      val timerTop = pad + lineH(lbl) + 14f
      drawTop(timer, clock, pad, timerTop)
      val gap = 4f
      val cell = cellFor(26f, gap, w - 2 * pad)
      val gridTop = timerTop + lineH(timer) + 18f
      val maxCell = (h - pad - lineH(lbl) - 8f - gridTop - 5 * gap) / 6f
      grid(pad, gridTop, min(cell, max(4f, maxCell)), gap)
      drawBottom(lbl, "This hour", pad, h - pad)
      val frac = text(pixelFace, 18f, muted)
      val count = pad2(filled.toLong()) + "/60"
      drawBottom(frac, count, w - pad - frac.measureText(count), h - pad)
    } else if (medium) {
      val gap = 3f
      val cell = min(11f, (h - 2 * pad - 5 * gap) / 6f)
      val gw = cell * 10 + gap * 9
      val gh = cell * 6 + gap * 5
      grid(w - pad - gw, (h - gh) / 2f, cell, gap)
      val colW = w - 3 * pad - gw
      val lbl = text(labelFace, 13f, muted)
      drawTop(lbl, dayLong, pad, pad)
      drawTop(fitted(lbl, caption, colW), caption, pad, pad + lineH(lbl) + 2f)
      drawBottom(fitted(text(pixelFace, 40f, ink), clock, colW), clock, pad, h - pad)
    } else {
      val gap = 3f
      val cell = cellFor(10f, gap, w - 2 * pad)
      grid(pad, pad, cell, gap)
      val lbl = text(labelFace, 12f, muted)
      drawBottom(lbl, dayShort, pad, h - pad)
      val capW = w - 2 * pad - lbl.measureText(dayShort) - 6f
      val cap = fitted(text(labelFace, 12f, muted), caption, capW)
      drawBottom(cap, caption, w - pad - cap.measureText(caption), h - pad)
      val timer = fitted(text(pixelFace, 40f, ink), clock, w - 2 * pad)
      drawBottom(timer, clock, pad, h - pad - lineH(lbl) - 2f)
    }

    if (logged) {
      val scale = if (!large && !medium) 1.3f else 1.6f
      for (p in HourGrid.pieces(HourGrid.phase(ms), HourGrid.frame(ms), ms / HourGrid.HOUR)) {
        val pw = p.w * scale
        val ph = p.h * scale
        c.save()
        c.translate((p.x * w).toFloat() + pw / 2f, (p.y * h).toFloat() + ph / 2f)
        c.rotate(p.rot.toFloat())
        fill.color = palette[p.color]
        c.drawRect(-pw / 2f, -ph / 2f, pw / 2f, ph / 2f, fill)
        c.restore()
      }
    }
    return bitmap
  }
}

/**
 * Home screen streak, concept C "Hour grid". The launcher cannot animate a
 * RemoteViews widget, so each repaint is a still frame and the provider asks
 * AlarmManager to wake it at the next streak minute or confetti frame.
 */
class StreakWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) updateOne(context, appWidgetManager, id)
    scheduleNext(context)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle
  ) {
    updateOne(context, appWidgetManager, appWidgetId)
  }

  override fun onDisabled(context: Context) {
    alarmManager(context).cancel(tickIntent(context))
  }

  companion object {
    private const val PREFS = "expo.modules.widgets"
    private const val PROPS_KEY = "__expo_widgets_StreakWidget_props"
    private const val TICK_REQUEST = 4207

    fun updateOne(context: Context, manager: AppWidgetManager, id: Int) {
      val options = manager.getAppWidgetOptions(id)
      val portrait = context.resources.configuration.orientation != Configuration.ORIENTATION_LANDSCAPE
      val wDp = options.getInt(
        if (portrait) AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH else AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,
        180
      )
      val hDp = options.getInt(
        if (portrait) AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT else AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
        180
      )
      val night = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK ==
        Configuration.UI_MODE_NIGHT_YES
      val last = readLastOccurredAt(context)
      val now = System.currentTimeMillis()

      val views = RemoteViews(context.packageName, R.layout.streak_widget)
      views.setImageViewBitmap(R.id.streak_canvas, HourGridRenderer.render(context, wDp, hDp, night, last, now))
      views.setContentDescription(R.id.streak_canvas, describe(last, now))

      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pending = PendingIntent.getActivity(
          context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.streak_root, pending)
      }
      manager.updateAppWidget(id, views)
    }

    private fun describe(last: Long?, now: Long): String {
      if (last == null) return "Nothing logged yet."
      val m = HourGrid.elapsed(last, now) / 60_000L
      return "\${m / 1440L} days \${(m % 1440L) / 60L} hours \${m % 60L} minutes since last goon"
    }

    /** Next repaint: the next streak minute or confetti boundary. Non-waking, so a dark screen costs nothing. */
    fun scheduleNext(context: Context) {
      val am = alarmManager(context)
      val pending = tickIntent(context)
      val at = HourGrid.nextChangeAt(readLastOccurredAt(context), System.currentTimeMillis())
      if (at == null) {
        am.cancel(pending)
        return
      }
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
        am.setExact(AlarmManager.RTC, at, pending)
      } else {
        am.setWindow(AlarmManager.RTC, at, 15_000L, pending)
      }
    }

    private fun alarmManager(context: Context) =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun tickIntent(context: Context): PendingIntent {
      val component = ComponentName(context, StreakWidgetProvider::class.java)
      val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(component)
      val intent = Intent(context, StreakWidgetProvider::class.java)
        .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      return PendingIntent.getBroadcast(
        context, TICK_REQUEST, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    private fun readLastOccurredAt(context: Context): Long? {
      val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(PROPS_KEY, null) ?: return null
      val value = runCatching { JSONObject(raw).opt("lastOccurredAt") }.getOrNull()
      return when (value) {
        is Number -> value.toLong().takeIf { it > 0L }
        else -> null
      }
    }
  }
}
`;
}

/**
 * Finalized mod: expo-widgets writes its own Glance StreakWidgetProvider.kt in a
 * dangerous mod, which would overwrite ours, so this runs after every other mod.
 */
function withAndroidHourGrid(config) {
  return withFinalizedMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      const packageName = AndroidConfig.Package.getPackage(config);
      if (!packageName) {
        throw new Error('android.package is required for the streak widget.');
      }
      const res = join(androidRoot, 'app/src/main/res');
      const files = {
        layout: join(res, 'layout/streak_widget.xml'),
        pixel: join(res, 'font/geist_pixel_square.otf'),
        label: join(res, 'font/geist_medium.ttf'),
        provider: join(androidRoot, 'app/src/main/java', ...packageName.split('.'), 'StreakWidgetProvider.kt'),
      };
      for (const file of Object.values(files)) mkdirSync(dirname(file), { recursive: true });

      writeFileSync(files.layout, LAYOUT_XML);
      writeFileSync(files.provider, providerSource(packageName));
      copyFileSync(join(projectRoot, PIXEL_FONT), files.pixel);
      copyFileSync(join(projectRoot, LABEL_FONT), files.label);
      return config;
    },
  ]);
}

/** xcode and @expo/plist are dependencies of @expo/config-plugins; resolve them there (pnpm is strict). */
function requireFromConfigPlugins(name) {
  const expoDir = dirname(require.resolve('expo/package.json'));
  const pluginsDir = dirname(require.resolve('@expo/config-plugins/package.json', { paths: [expoDir] }));
  return require(require.resolve(name, { paths: [pluginsDir] }));
}

/** Adds a file to the extension group and its Resources build phase, once. */
function addResourceToTarget(project, targetName, fileName) {
  const objects = project.hash.project.objects;
  const target = project.pbxTargetByName(targetName);
  const targetUuid = project.findTargetKey(targetName);
  const group = project.pbxGroupByName(targetName);
  if (!target || !targetUuid || !group) {
    throw new Error(`withStreakHourGrid: ${targetName} not found. Is expo-widgets listed before this plugin?`);
  }
  if (group.children.some((child) => child.comment === fileName)) return;

  const fileRef = project.generateUuid();
  objects.PBXFileReference[fileRef] = {
    isa: 'PBXFileReference',
    lastKnownFileType: 'file',
    name: `"${fileName}"`,
    path: `"${fileName}"`,
    sourceTree: '"<group>"',
  };
  objects.PBXFileReference[`${fileRef}_comment`] = fileName;
  group.children.push({ value: fileRef, comment: fileName });

  const buildFile = project.generateUuid();
  objects.PBXBuildFile[buildFile] = { isa: 'PBXBuildFile', fileRef, fileRef_comment: fileName };
  objects.PBXBuildFile[`${buildFile}_comment`] = `${fileName} in Resources`;

  const phases = objects.PBXResourcesBuildPhase ?? {};
  let phase = target.buildPhases
    .map((p) => phases[p.value])
    .find(Boolean);
  if (!phase) {
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);
    const after = objects.PBXResourcesBuildPhase;
    phase = target.buildPhases.map((p) => after[p.value]).find(Boolean);
  }
  phase.files.push({ value: buildFile, comment: `${fileName} in Resources` });
}

function withIosWidgetFonts(config) {
  return withFinalizedMod(config, [
    'ios',
    async (config) => {
      const xcode = requireFromConfigPlugins('xcode');
      const plist = requireFromConfigPlugins('@expo/plist').default;
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;
      const targetDir = join(iosRoot, IOS_TARGET);
      if (!existsSync(targetDir)) {
        throw new Error(`withStreakHourGrid: ${targetDir} missing. Is expo-widgets configured?`);
      }

      for (const font of IOS_FONTS) copyFileSync(join(projectRoot, font.source), join(targetDir, font.file));

      const infoPath = join(targetDir, 'Info.plist');
      const info = plist.parse(readFileSync(infoPath, 'utf8'));
      const fonts = new Set(info.UIAppFonts ?? []);
      for (const font of IOS_FONTS) fonts.add(font.file);
      info.UIAppFonts = [...fonts];
      writeFileSync(infoPath, plist.build(info));

      const projectName = config.modRequest.projectName;
      const pbxPath = join(iosRoot, `${projectName}.xcodeproj`, 'project.pbxproj');
      const project = xcode.project(pbxPath);
      project.parseSync();
      for (const font of IOS_FONTS) addResourceToTarget(project, IOS_TARGET, font.file);
      writeFileSync(pbxPath, project.writeSync());
      return config;
    },
  ]);
}

function withStreakHourGrid(config) {
  return withIosWidgetFonts(withAndroidHourGrid(config));
}

module.exports = withStreakHourGrid;
module.exports.ANDROID_COLORS = ANDROID_COLORS;
module.exports.readThemeColors = readThemeColors;
module.exports.IOS_FONTS = IOS_FONTS;
module.exports.providerSource = providerSource;
module.exports.addResourceToTarget = addResourceToTarget;
