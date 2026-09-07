/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-theme-mode';

export function useTheme() {
  const scheme = useResolvedScheme();
  return Colors[scheme];
}
