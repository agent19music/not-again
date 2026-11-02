import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export type PermissionSnapshot = {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
};

export async function getPermissionSnapshot(): Promise<PermissionSnapshot> {
  if (Platform.OS === 'web') {
    return {
      granted: false,
      canAskAgain: false,
      status: Notifications.PermissionStatus.DENIED,
    };
  }
  const settings = await Notifications.getPermissionsAsync();
  return {
    granted: settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
    canAskAgain: settings.canAskAgain,
    status: settings.status,
  };
}

export async function requestNotificationPermission(): Promise<PermissionSnapshot> {
  if (Platform.OS === 'web') return getPermissionSnapshot();
  const settings = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return {
    granted: settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
    canAskAgain: settings.canAskAgain,
    status: settings.status,
  };
}

/** Best-effort open of OS notification settings for this app. */
export async function openNotificationSettings() {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
        {
          extra: {
            'android.provider.extra.APP_PACKAGE': 'com.gooned',
          },
        }
      );
      return;
    }
    await Linking.openSettings();
  } catch {
    await Linking.openSettings();
  }
}

/** Android 12+ exact alarm settings screen when available. */
export async function openExactAlarmSettings() {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM,
        {
          data: 'package:com.gooned',
        }
      );
      return;
    }
    await Linking.openSettings();
  } catch {
    await Linking.openSettings();
  }
}
