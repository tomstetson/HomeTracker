/**
 * PWA Service
 * Handles service worker registration and PWA installation
 */

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      console.log('[PWA] Service Worker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('[PWA] New service worker available');
              // Could show a notification to user to refresh
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('[PWA] Service Worker unregistered');
      }
    } catch (error) {
      console.error('[PWA] Service Worker unregistration failed:', error);
    }
  }
}

/**
 * Check if app is installed as PWA
 */
export function isPWAInstalled(): boolean {
  // Check if running in standalone mode (iOS) or if display-mode is standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check if running in standalone mode (Android)
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
}

/**
 * Show install prompt (if available)
 */
export function showInstallPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if beforeinstallprompt event is supported
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install button/prompt
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          resolve(choiceResult.outcome === 'accepted');
          deferredPrompt = null;
        });
      } else {
        resolve(false);
      }
    });
    
    // If no prompt available, resolve false
    setTimeout(() => resolve(false), 100);
  });
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if device is iOS
 */
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

