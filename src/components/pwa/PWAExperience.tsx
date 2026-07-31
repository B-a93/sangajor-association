import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAExperience() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pwa-prompt-dismissed') === 'true');
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleUpdate = () => setUpdateReady(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleInstall);
    window.addEventListener('pwa-update-ready', handleUpdate);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstall);
      window.removeEventListener('pwa-update-ready', handleUpdate);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  }

  function dismiss() {
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    setDismissed(true);
  }

  return (
    <>
      {!online && <div className="network-status" role="status"><WifiOff size={17} /> You are offline. Some information may be out of date.</div>}
      {updateReady && <button className="update-toast" type="button" onClick={() => window.location.reload()}><RefreshCw size={17} /> Update available — refresh</button>}
      {installPrompt && !dismissed && (
        <aside className="install-prompt" aria-label="Install MySANGAJOR app">
          <Download aria-hidden="true" />
          <div><strong>Take MySANGAJOR with you</strong><span>Install the app for quick, reliable access.</span></div>
          <button className="install-action" type="button" onClick={() => void install()}>Install</button>
          <button className="install-dismiss" type="button" aria-label="Dismiss install suggestion" onClick={dismiss}><X /></button>
        </aside>
      )}
    </>
  );
}
