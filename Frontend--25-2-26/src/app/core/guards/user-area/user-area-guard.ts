import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../service/authService/auth-service';
import { map, Observable } from 'rxjs';

/**
 * Admin users must stay under `/admin` only. User/customer (and guests on public home) use `/`.
 */
export const userAreaGuard: CanMatchFn = (): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadMe().pipe(
    map((user) => {
      if (user?.role === 'admin') {
        return router.createUrlTree(['/admin']);
      }
      return true;
    }),
  );
};
