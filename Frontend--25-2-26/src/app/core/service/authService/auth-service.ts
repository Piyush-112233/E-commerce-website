import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { catchError, map, Observable, of, ReplaySubject, tap } from 'rxjs';
import { Router } from '@angular/router';

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
  constructor(private http: HttpClient, private router: Router) { }
  // get api of signup
  getRegisterDetails(name: string, email: string, password: string, role: string) {
    const url = "http://localhost:3000/api/users/signup"
    return this.http.post(url,
      {
        name,
        email,
        password,
        role
      },
      { withCredentials: true });
  }

  // get api of login
  getLoginDetails(email: string, password: string) {
    const url = "http://localhost:3000/api/users/login"
    return this.http.post(url, {
      email,
      password
    },
      { withCredentials: true });
  }


  // get api of forgot-password
  getForgotPassword(email: string) {
    const url = "http://localhost:3000/api/users/forgot-password"
    return this.http.post(url, {
      email
    },
      { withCredentials: true });
  }

  // get api of reset-password
  getResetPassword(token: string, password: string) {
    const url = `http://localhost:3000/api/users/reset-password/${token}`
    return this.http.post(url, {
      newPassword: password
    },
      { withCredentials: true })
  }


  // getToken() {
  //   return localStorage.getItem('accessToken');
  // }

  // isLoggedIn(): Boolean {
  //   return !!this.getToken();
  // }

  // getUserRole(): string | null {
  //   const token = this.getToken();
  //   if(!token) return null

  //   const decoded: any = jwtDecode(token);
  //   return decoded.role
  // }

  private meSubject = new ReplaySubject<MeResponse | null>(1);
  $me = this.meSubject.asObservable();

  private loaded = false;

  // call when app start guard hit
  loadMe(): Observable<MeResponse | null> {
    if (this.loaded) return this.$me;

    this.loaded = true;
    const url = this.http.get<MeResponse | ApiResponse<MeResponse>>('http://localhost:3000/api/users/me', { withCredentials: true })
    return url.pipe(
      map((res) => ('data' in (res as ApiResponse<MeResponse>) ? (res as ApiResponse<MeResponse>).data : (res as MeResponse))),
      tap(me => this.meSubject.next(me)),
      catchError(() => {
        this.meSubject.next(null);
        return of(null);
      })
    )
  }

  // Use after login/logout to refresh state
  refreshMe(): Observable<MeResponse | null> {
    this.loaded = true;
    const url = this.http.get<MeResponse | ApiResponse<MeResponse>>('http://localhost:3000/api/users/me', { withCredentials: true });
    return url.pipe(
      map((res) => ('data' in (res as ApiResponse<MeResponse>) ? (res as ApiResponse<MeResponse>).data : (res as MeResponse))),
      tap(me => this.meSubject.next(me)),
      catchError(() => {
        this.meSubject.next(null);
        return of(null);
      })
    )
  }

  // for clear
  clearMe() {
    this.loaded = true;
    this.meSubject.next(null);
  }


  // Add this method to your AuthService if you don't have it
  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken'); // or however you store your token
    return !!token;
  }

  // Logout: call backend, clear token & state, navigate to login
  logout(): Observable<any> {
    return this.http.post('http://localhost:3000/api/users/logout', {}, { withCredentials: true }).pipe(
      tap(() => {
        localStorage.removeItem('accessToken');
        this.clearMe();
        this.loaded = false;
        this.router.navigateByUrl('/auth/login');
      }),
      catchError((err) => {
        // Even if API fails, clear local state
        localStorage.removeItem('accessToken');
        this.clearMe();
        this.loaded = false;
        this.router.navigateByUrl('/auth/login');
        return of(null);
      })
    );
  }
}

