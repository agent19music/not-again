import { Toaster as SonnerToaster } from 'sonner';

import { useResolvedScheme } from '@/hooks/use-theme-mode';

export function Toaster() {
  const scheme = useResolvedScheme();

  return <SonnerToaster theme={scheme} richColors position="bottom-center" />;
}
