import { Platform } from 'react-native';

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
  private static instance: PWAManager;
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private installPrompt: PWAInstallPrompt | null = null;
  private updateIntervalId: number | null = null;

  private constructor() {
    if (Platform.OS === 'web') {
      this.initializeServiceWorker();
      this.setupInstallPromptListener();
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible' && this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
          }
        });
      }
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

    if (process.env.NODE_ENV !== 'production') {
      console.log('Phoenix Rise PWA: Skipping service worker in development');
      return;
    }

    try {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs
            .filter((r) => r.active && r.active.scriptURL.endsWith('/sw.js'))
            .map((r) => r.unregister())
        );
        console.log('Phoenix Rise PWA: Unregistered legacy /sw.js');
      } catch (e) {
        console.warn('Phoenix Rise PWA: Failed to check/unregister legacy SW', e);
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      this.serviceWorker = registration;
      console.log('Phoenix Rise PWA: Service Worker registered successfully at /service-worker.js');

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Phoenix Rise PWA: New version available');
              if (process.env.NODE_ENV === 'production') {
                this.notifyUpdate();
              }
            }
          });
        }
      });

      if (process.env.NODE_ENV === 'production') {
        if (this.updateIntervalId) {
          clearInterval(this.updateIntervalId);
          this.updateIntervalId = null;
        }
        this.updateIntervalId = window.setInterval(() => {
          try {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
            registration.update();
          } catch (err) {
            console.log('Phoenix Rise PWA: SW update check skipped', err);
          }
        }, 15 * 60 * 1000);
      }
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
        this.serviceWorker.showNotification(title, {
          icon: '/assets/images/icon-192.png',
          badge: '/assets/images/icon-72.png',
          ...options,
        });
      } else {
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
      const cache = await caches.open('phoenix-rise-wellness-v1.0.1');
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
      const cache = await caches.open('phoenix-rise-wellness-v1.0.1');
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
    console.log('Phoenix Rise PWA: App update available');
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window !== 'undefined') {
      const updateAvailable = new CustomEvent('pwa-update-available');
      window.dispatchEvent(updateAvailable);
    }
  }

  public async updateApp(): Promise<void> {
    if (!this.serviceWorker) return;

    const newWorker = this.serviceWorker.waiting;
    if (newWorker) {
      try {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
      } catch (e) {
        console.warn('Phoenix Rise PWA: Failed to postMessage to SW', e);
      }
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

      this.serviceWorker.active?.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
    });
  }
}

export const pwaManager = PWAManager.getInstance();

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