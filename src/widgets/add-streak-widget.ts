import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { pushStreakWidget } from './sync-streak-widget';

type WidgetPinModule = {
  requestPin(): Promise<boolean>;
};

/** A request is distinct from installation, which the launcher controls. */
export async function requestStreakWidget(): Promise<'requested' | 'manual'> {
  if (Platform.OS !== 'android') return 'manual';

  const pin = requireOptionalNativeModule<WidgetPinModule>('StreakWidgetPin');
  if (!pin) return 'manual';

  // Store current data before the provider receives its first onUpdate broadcast.
  await pushStreakWidget();
  return (await pin.requestPin()) ? 'requested' : 'manual';
}
