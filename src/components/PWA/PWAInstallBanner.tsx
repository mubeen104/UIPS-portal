import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner || isInstalled) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-bottom-4 safe-area-inset-bottom z-50 max-w-md mx-auto"
      data-testid="banner-pwa-install"
    >
      <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <Download className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Install App</p>
            <p className="text-xs text-gray-600">Works offline & on home screen</p>
          </div>
        </div>
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex-shrink-0 min-h-9 whitespace-nowrap"
          data-testid="button-install-pwa"
        >
          Install
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-2 text-gray-500 hover:text-gray-700 flex-shrink-0 min-h-9 min-w-9 flex items-center justify-center"
          aria-label="Dismiss"
          data-testid="button-dismiss-pwa"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
