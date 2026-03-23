import { useAppStore } from '../stores/app-store';

export function useLicense() {
  const isPro = useAppStore((s) => s.isPro);
  const licenseInfo = useAppStore((s) => s.licenseInfo);

  return {
    isPro,
    plan: licenseInfo?.plan || 'free',
    email: licenseInfo?.email,
    activatedAt: licenseInfo?.activatedAt,
  };
}
