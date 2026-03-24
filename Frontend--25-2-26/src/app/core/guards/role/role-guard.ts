import { inject, Input } from '@angular/core';
import { ActivatedRouteSnapshot, CanMatchFn, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthService, Role } from '../../service/authService/auth-service';
import { map, Observable } from 'rxjs';

export const roleGuard: CanMatchFn = (route: Route, segments: UrlSegment[]): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed = route.data?.['roles'] as string[];

  return auth.loadMe().pipe(
    map(me => {
      if(!me) return router.createUrlTree(['/auth/login']);
      if(allowed.length === 0) return true;

      const ok = allowed.includes(me.role);
      return ok ? true : router.createUrlTree(['/forbidden'])
    })
  )
};
