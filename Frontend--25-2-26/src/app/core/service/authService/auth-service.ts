import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, ReplaySubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { authEndpointsContext } from '../../http/auth-http-context';

export type Role = 'admin' | 'user' | 'customer';

export interface MeResponse {
  id: string,
  name?: string,
  email: string,
  role: Role
}

interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message?: string;
  success?: boolean;
}


@Injectable({ providedIn: 'root' })
export class AuthService {
  private meSubject = new ReplaySubject<MeResponse | null>(1);
  $me = this.meSubject.asObservable();

  private _currentUser: MeResponse | null = null;
  private loaded = false;

  constructor(private http: HttpClient, private router: Router) {
    // This updates the local variable whenever the session check completes
    this.$me.subscribe(me => {
      console.log("Auth session updated in memory:", me);
      this._currentUser = me;
    });
  }

  // get api of signup
  getRegisterDetails(name: string, email: string, password: string, role: string) {
    const url = "http://localhost:3000/api/users/signup"
    return this.http.post(url, { name, email, password, role }, { withCredentials: true });
  }

  // get api of login
  getLoginDetails(email: string, password: string) {
    const url = "http://localhost:3000/api/users/login"
    return this.http.post<ApiResponse<any>>(url, { email, password }, {
      withCredentials: true,
      context: authEndpointsContext()
    });
  }

  // get api of forgot-password
  getForgotPassword(email: string) {
    const url = "http://localhost:3000/api/users/forgot-password"
    return this.http.post(url, { email }, { withCredentials: true });
  }

  // get api of reset-password
  getResetPassword(token: string, password: string) {
    const url = `http://localhost:3000/api/users/reset-password/${token}`
    return this.http.post(url, { newPassword: password }, { withCredentials: true })
  }

  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Initializes the user session on app start.
   * Hits the /me endpoint to see if valid cookies exist.
   */
  loadMe(): Observable<MeResponse | null> {
    if (this.loaded) return this.$me;
    this.loaded = true;
    return this.fetchMe();
  }

  /**
   * Refreshes the internal user info.
   */
  refreshMe(): Observable<MeResponse | null> {
    return this.fetchMe();
  }

  private fetchMe(): Observable<MeResponse | null> {
    const url = 'http://localhost:3000/api/users/me';
    return this.http.get<MeResponse | ApiResponse<MeResponse>>(url, { withCredentials: true }).pipe(
      map(res => ('data' in (res as ApiResponse<MeResponse>) ? (res as ApiResponse<MeResponse>).data : (res as MeResponse))),
      tap(me => this.meSubject.next(me)),
      catchError(() => {
        this.meSubject.next(null);
        return of(null);
      })
    );
  }

  // for clear
  clearMe() {
    this.meSubject.next(null);
    this.loaded = false;
  }

  // Add this method to your AuthService if you don't have it
  isAuthenticated(): boolean {
    return !!this._currentUser;
  }

  // Logout: call backend, clear token & state, navigate to login
  logout(): Observable<any> {
    return this.http.post('http://localhost:3000/api/users/logout', {}, { withCredentials: true }).pipe(
      tap(() => {
        this.clearMe();
        this.router.navigateByUrl('/auth/login');
      }),
    )
  };
}
