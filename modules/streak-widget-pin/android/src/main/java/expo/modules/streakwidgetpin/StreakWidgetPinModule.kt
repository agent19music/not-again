package expo.modules.streakwidgetpin

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StreakWidgetPinModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StreakWidgetPin")

    AsyncFunction("requestPin") {
      val activity = appContext.throwingActivity
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        return@AsyncFunction false
      }

      val manager = AppWidgetManager.getInstance(activity)
      if (!manager.isRequestPinAppWidgetSupported) {
        return@AsyncFunction false
      }

      val provider = ComponentName(activity.packageName, "${activity.packageName}.StreakWidgetProvider")
      // true means the launcher accepted the request, not that the user added it.
      manager.requestPinAppWidget(provider, null, null)
    }.runOnQueue(Queues.MAIN)
  }
}
