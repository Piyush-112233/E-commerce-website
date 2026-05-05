import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebPushService {

  private apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  /**
   * Call this once after user successfully logs in.
   * Flow:
   *   1. Register service worker (sw.js)
   *   2. Ask browser for notification permission
   *   3. Get VAPID public key from backend
   *   4. Subscribe browser to Web Push
   *   5. Save subscription object to backend DB
   */
  async setupPushNotifications(): Promise<void> {
    try {
      // Step 1: Check browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[WebPush] Not supported in this browser');
        return;
      }

      // Step 2: Register the service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[WebPush] Service worker registered ✅');

      // Step 3: Ask user for notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[WebPush] Permission denied by user');
        return;
      }

      // Step 4: Check if already subscribed (avoids re-subscribing on every login)
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Step 5: Fetch VAPID public key from backend
        const { publicKey } = await firstValueFrom(
          this.http.get<{ publicKey: string }>(`${this.apiUrl}/vapid-public-key`)
        );

        // Step 6: Subscribe to Web Push using the VAPID key
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicKey)
        });

        console.log('[WebPush] Browser subscribed to push ✅');
      }

      // Step 7: Save subscription to backend so worker can use it
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/subscribe`,
          { subscription },
          { withCredentials: true }
        )
      );

      console.log('[WebPush] Subscription saved to backend ✅');

    } catch (error) {
      console.error('[WebPush] Setup error:', error);
    }
  }

  /**
   * Converts base64-encoded VAPID public key to Uint8Array.
   * Required by the browser PushManager.subscribe() API.
   */
  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
  }
}
