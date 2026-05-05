import {
  Component, OnInit, OnDestroy,
  HostListener, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ChatSocketService } from '../chat/services/chat-socket.service';

interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent implements OnInit, OnDestroy {

  notifications: AppNotification[] = [];
  unreadCount = 0;
  isOpen = false;
  isLoading = false;
  shimmerItems = [1, 2, 3];

  private apiUrl = 'http://localhost:3000/api/notifications';
  private sub = new Subscription();

  constructor(
    private http: HttpClient,
    private socketService: ChatSocketService
  ) {}

  ngOnInit() {
    // 1. Load from DB
    this.loadNotifications();

    // 2. Real-time via Socket.IO
    this.sub.add(
      this.socketService.onNewNotification().subscribe((data: AppNotification) => {
        this.notifications.unshift(data);
        this.unreadCount++;
      })
    );
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.bell-wrapper')) {
      this.isOpen = false;
    }
  }

  loadNotifications() {
    this.isLoading = true;
    this.http.get<any>(this.apiUrl, { withCredentials: true }).subscribe({
      next: (res: any) => {
        this.notifications = res.notifications;
        this.unreadCount = res.unreadCount;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('[Bell] Failed to load notifications:', err);
        this.isLoading = false;
      }
    });
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  onNotificationClick(n: AppNotification) {
    if (!n.isRead) this.markRead(n);
    if (n.link) window.location.href = n.link;
    else this.isOpen = false;
  }

  markRead(n: AppNotification) {
    this.http.patch(`${this.apiUrl}/read/${n._id}`, {}, { withCredentials: true })
      .subscribe(() => {
        n.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
  }

  markAllRead(event: Event) {
    event.stopPropagation();
    this.http.patch(`${this.apiUrl}/read-all`, {}, { withCredentials: true })
      .subscribe(() => {
        this.notifications.forEach(n => (n.isRead = true));
        this.unreadCount = 0;
      });
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      coupon: '🎟️', order: '📦', promo: '🔥', general: '🔔'
    };
    return map[type] || '🔔';
  }

  getRelativeTime(dateStr: string): string {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const mins  = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
