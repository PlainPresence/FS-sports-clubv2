import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSection, setShowSection] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowSection(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowSection(false);
      setDeferredPrompt(null);
    };

    // Check if already installed
    if (!checkIfInstalled()) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
      
      // Show section for mobile devices
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        setShowSection(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
        setShowSection(false);
      } else {
        console.log('User dismissed the install prompt');
      }

      setDeferredPrompt(null);
    } else {
      // Show instructions based on device
      showInstallInstructions();
    }
  };

  const showInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
      alert(`📱 Install FS Sports Club on iPhone/iPad:

1. Tap the Share button (📤) at the bottom
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to install
4. App will appear on your home screen!

Enjoy faster booking and offline access! 🎉`);
    } else {
      alert(`📱 Install FS Sports Club:

1. Look for the install prompt in your browser
2. Tap "Install" or "Add to Home Screen"
3. Confirm installation when prompted
4. App will appear on your home screen!

For manual installation:
- Chrome: Tap 3-dot menu → "Add to Home Screen"
- Samsung Internet: Tap menu → "Add page to"

Enjoy faster booking and offline access! 🎉`);
    }
  };

  if (isInstalled || !showSection) {
    return null;
  }

  return (
    <section className="py-8 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                  <i className="fas fa-mobile-alt text-2xl text-primary"></i>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Install Our Mobile App
                </h2>
                
                <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                  Get the best experience with our mobile app! Install it on your phone for faster booking, 
                  offline access, and push notifications.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-bolt text-primary text-lg"></i>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Faster Loading</h3>
                    <p className="text-sm text-gray-600">Instant access to booking slots</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-wifi-slash text-primary text-lg"></i>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Offline Support</h3>
                    <p className="text-sm text-gray-600">View bookings without internet</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-bell text-primary text-lg"></i>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Push Notifications</h3>
                    <p className="text-sm text-gray-600">Get booking updates instantly</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleInstallClick}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3"
                  >
                    <i className="fas fa-download mr-2"></i>
                    Install App
                  </Button>
                  
                  <Button
                    onClick={showInstallInstructions}
                    variant="outline"
                    size="lg"
                    className="border-primary text-primary hover:bg-primary/10 font-semibold px-8 py-3"
                  >
                    <i className="fas fa-question-circle mr-2"></i>
                    How to Install
                  </Button>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  Works on Android (Chrome/Samsung Internet) and iPhone (Safari)
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
} 