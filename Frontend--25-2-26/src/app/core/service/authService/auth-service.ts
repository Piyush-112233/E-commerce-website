import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { catchError, Observable, of, ReplaySubject, tap } from 'rxjs';

export type Role = 'admin' | 'user';

export interface MeResponse {
  id: string,
  email: string,
  role: Role
}


@Injectable({ providedIn: 'root' })


export class AuthService {
  constructor(private http: HttpClient) { }
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
    const url = this.http.get<MeResponse>('http://localhost:3000/api/users/me', { withCredentials: true })
    return url.pipe(
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
    const url = this.http.get<MeResponse>('http://localhost:3000/api/users/me', { withCredentials: true });
    return url.pipe(
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



  // meRefresh(formValue: any) {
  //   return this.http.post('http://localhost:4200/auth/login', { formValue }, { withCredentials: true });
  // }
}

