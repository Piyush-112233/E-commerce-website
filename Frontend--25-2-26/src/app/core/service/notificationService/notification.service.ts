import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: 'coupon' | 'order' | 'promo' | 'general';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: AppNotification[];
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  getAll(): Observable<NotificationsResponse> {
    return this.http.get<NotificationsResponse>(this.apiUrl, { withCredentials: true });
  }

  markRead(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/read/${id}`, {}, { withCredentials: true });
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/read-all`, {}, { withCredentials: true });
  }
}
