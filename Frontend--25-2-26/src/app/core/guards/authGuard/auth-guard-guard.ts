import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../../service/authService/auth-service';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

export const authGuardGuard: CanMatchFn = (route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const attemptedUrl = '/' + segments.map(s => s.path).join('/');

  return auth.loadMe().pipe(
    map((me) => {
      if (me) return true;
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: attemptedUrl }
      });
    }),
    // on error, force login
    catchError(() =>
      of(
        router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: attemptedUrl }
        })
      )
    )
  );
};