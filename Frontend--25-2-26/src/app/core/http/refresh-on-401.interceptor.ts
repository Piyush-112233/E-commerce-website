import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthRefreshService } from './auth-refresh.service';
import { SEND_CREDENTIALS, SKIP_REFRESH } from './auth-http-context';
import { AuthService } from '../service/authService/auth-service';

// const BACKEND_ORIGIN = 'http://localhost:3000';
// const REFRESH_URL = `${BACKEND_ORIGIN}/api/users/refresh-token`;

export const refreshOn401Interceptor: HttpInterceptorFn = (req, next) => {
  const refreshService = inject(AuthRefreshService);
  const authService = inject(AuthService);

  // 1. Prepare the request (Auto-add withCredentials based on context)
  // const isBackend = req.url.startsWith(BACKEND_ORIGIN);
  const withCreds = req.context.get(SEND_CREDENTIALS);
  const outgoingReq = req.clone({ withCredentials: withCreds });

  return next(outgoingReq).pipe(
    catchError((error: unknown) => {
      // If it's not a 401, or we are explicitly told to skip refresh, just propagate the error.
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (req.context.get(SKIP_REFRESH)) {
        console.warn('401 error on a public/auth API. Skipping automatic refresh.');
        return throwError(() => error);
      }

      /**
       * 2. Perform the Session Refresh.
       * 
       * AuthRefreshService.refreshAccessToken$ uses shareReplay internally,
       * so multiple simultaneous 401s will all wait for the same refresh call.
       */
      return refreshService.refreshAccessToken$().pipe(
        switchMap((newToken) => {
          if (!newToken) {
            localStorage.removeItem('accessToken');
            authService.clearMe();
            // Refresh failed (e.g., refresh token expired)
            return throwError(() => error);
          }

          // 3. Retry the original request (now that cookies are updated)
          return next(outgoingReq);
        }),
        catchError((refreshErr) => {
          localStorage.removeItem('accessToken');
          authService.clearMe();
          // If the refresh call itself fails, propagate that error instead.
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
