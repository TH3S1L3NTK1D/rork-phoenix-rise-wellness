import { Platform } from 'react-native';

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
  private static instance: PWAManager;
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private installPrompt: PWAInstallPrompt | null = null;

  private constructor() {
    if (Platform.OS === 'web') {
      this.initializeServiceWorker();
      this.setupInstallPromptListener();
    }
  }

  public static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private async initializeServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Phoenix Rise PWA: Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.serviceWorker = registration;
      console.log('Phoenix Rise PWA: Service Worker registered successfully');

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Phoenix Rise PWA: New version available');
              this.notifyUpdate();
            }
          });
        }
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

    } catch (error) {
      console.error('Phoenix Rise PWA: Service Worker registration failed:', error);
    }
  }

  private setupInstallPromptListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as any;
      console.log('Phoenix Rise PWA: Install prompt ready');
    });

    window.addEventListener('appinstalled', () => {
      console.log('Phoenix Rise PWA: App installed successfully');
      this.installPrompt = null;
    });
  }

  public async installApp(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      console.log('Phoenix Rise PWA: Install only available on web platform');
      return false;
    }
    
    if (!this.installPrompt) {
      console.log('Phoenix Rise PWA: No install prompt available');
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const choiceResult = await this.installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('Phoenix Rise PWA: User accepted install');
        return true;
      } else {
        console.log('Phoenix Rise PWA: User dismissed install');
        return false;
      }
    } catch (error) {
      console.error('Phoenix Rise PWA: Install failed:', error);
      return false;
    }
  }

  public isInstallable(): boolean {
    return this.installPrompt !== null;
  }

  public isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    return isStandalone || isInWebAppiOS;
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
      console.log('Phoenix Rise PWA: Notifications not supported on this platform');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission;
      } catch (error) {
        console.error('Phoenix Rise PWA: Failed to request notification permission:', error);
        return 'denied';
      }
    }

    return Notification.permission;
  }

  public async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Platform.OS !== 'web') {
      console.log('Phoenix Rise PWA: Notifications only supported on web platform');
      return;
    }
    
    const permission = await this.requestNotificationPermission();
    
    if (permission !== 'granted') {
      console.log('Phoenix Rise PWA: Notification permission denied');
      return;
    }

    try {
      if (this.serviceWorker) {
        // Use service worker for better notification handling
        this.serviceWorker.showNotification(title, {
          icon: '/assets/images/icon-192.png',
          badge: '/assets/images/icon-72.png',
          ...options,
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          icon: '/assets/images/icon-192.png',
          ...options,
        });
      }
    } catch (error) {
      console.error('Phoenix Rise PWA: Failed to show notification:', error);
    }
  }

  public async scheduleWellnessReminder(time: string, message: string): Promise<void> {
    if (!this.serviceWorker) {
      console.log('Phoenix Rise PWA: Service Worker not available for scheduling');
      return;
    }

    // Store reminder in localStorage for service worker to access
    const reminders = JSON.parse(localStorage.getItem('wellness-reminders') || '[]');
    reminders.push({
      id: Date.now(),
      time,
      message,
      active: true,
    });
    localStorage.setItem('wellness-reminders', JSON.stringify(reminders));

    console.log('Phoenix Rise PWA: Wellness reminder scheduled');
  }

  public async syncOfflineData(): Promise<void> {
    if (Platform.OS !== 'web' || !this.serviceWorker || typeof window === 'undefined') {
      console.log('Phoenix Rise PWA: Background sync not supported on this platform');
      return;
    }

    try {
      // Check if sync is supported
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        await (this.serviceWorker as any).sync.register('wellness-data-sync');
        console.log('Phoenix Rise PWA: Background sync registered');
      } else {
        console.log('Phoenix Rise PWA: Background sync not supported in this browser');
      }
    } catch (error) {
      console.error('Phoenix Rise PWA: Background sync registration failed:', error);
    }
  }

  public async cacheWellnessData(data: any): Promise<void> {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('caches' in window)) {
      console.log('Phoenix Rise PWA: Caching not supported on this platform');
      return;
    }

    try {
      const cache = await caches.open('phoenix-rise-wellness-v1.0.0');
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put('/offline-wellness-data', response);
      console.log('Phoenix Rise PWA: Wellness data cached for offline use');
    } catch (error) {
      console.error('Phoenix Rise PWA: Failed to cache wellness data:', error);
    }
  }

  public async getOfflineWellnessData(): Promise<any> {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('caches' in window)) {
      console.log('Phoenix Rise PWA: Offline data retrieval not supported on this platform');
      return null;
    }

    try {
      const cache = await caches.open('phoenix-rise-wellness-v1.0.0');
      const response = await cache.match('/offline-wellness-data');
      
      if (response) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.error('Phoenix Rise PWA: Failed to get offline wellness data:', error);
      return null;
    }
  }

  private notifyUpdate(): void {
    // You can implement a custom update notification here
    console.log('Phoenix Rise PWA: App update available');
    
    if (typeof window !== 'undefined') {
      const updateAvailable = new CustomEvent('pwa-update-available');
      window.dispatchEvent(updateAvailable);
    }
  }

  public async updateApp(): Promise<void> {
    if (!this.serviceWorker) return;

    const newWorker = this.serviceWorker.waiting;
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  public getAppVersion(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.serviceWorker) {
        resolve('unknown');
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || 'unknown');
      };

      this.serviceWorker.active?.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }
}

// Export singleton instance
export const pwaManager = PWAManager.getInstance();

// Utility functions for easy access
export const installPWA = () => pwaManager.installApp();
export const isPWAInstallable = () => pwaManager.isInstallable();
export const isPWAInstalled = () => pwaManager.isInstalled();
export const showWellnessNotification = (title: string, options?: NotificationOptions) => 
  pwaManager.showNotification(title, options);
export const scheduleWellnessReminder = (time: string, message: string) => 
  pwaManager.scheduleWellnessReminder(time, message);
export const syncWellnessData = () => pwaManager.syncOfflineData();
export const cacheWellnessData = (data: any) => pwaManager.cacheWellnessData(data);
export const getOfflineWellnessData = () => pwaManager.getOfflineWellnessData();