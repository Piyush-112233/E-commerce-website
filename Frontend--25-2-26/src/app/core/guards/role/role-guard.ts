import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthService, Role } from '../../service/authService/auth-service';
import { map, Observable } from 'rxjs';

export const roleGuard: CanMatchFn = (route: Route, segments: UrlSegment[]): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] ?? []) as Role[];

  return auth.loadMe().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/auth/login']);
      }

      if (allowedRoles.length === 0) {
        return true;
      }

      if (allowedRoles.includes(user.role)) {
        return true;
      }

      // Redirect based on role when current route is not allowed.
      if (user.role === 'admin') return true
      else router.createUrlTree(['/admin']);
      if (user.role === 'user' || user.role === 'customer') return router.createUrlTree(['/']);
      return router.createUrlTree(['/auth/login']);
    }),
  );
};
