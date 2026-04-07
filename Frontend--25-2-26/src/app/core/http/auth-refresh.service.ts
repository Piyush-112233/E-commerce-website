import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { refreshCallContext } from './auth-http-context';

type ApiResponse<T> = { statusCode: number; data: T; message?: string; success?: boolean };

@Injectable({ providedIn: 'root' })
export class AuthRefreshService {
  private inFlight$?: Observable<string | null>;
  private readonly url = 'http://localhost:3000/api/users/refresh-token';

  constructor(private http: HttpClient) { }

  refreshAccessToken$(): Observable<string | null> {
    if (this.inFlight$) return this.inFlight$;

    this.inFlight$ = this.http
      .post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
        this.url,
        {},
        { withCredentials: true, context: refreshCallContext() }
      )
      .pipe(
        map((res) => res?.data?.accessToken ?? null),
        tap((token) => {
          // if (token) localStorage.setItem('accessToken', token);
          // else localStorage.removeItem('accessToken');
          console.log('Token refreshed successfully Via Cookies');
        }),
        catchError(() => {
          console.warn('Refresh token expired or invalid. User must log in again.');
          return of(null);
        }),
        finalize(() => (this.inFlight$ = undefined)),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.inFlight$;
  }
}
