import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../../service/authService/auth-service';
import { inject } from '@angular/core';
import { map } from 'rxjs';

export const authGuardGuard: CanMatchFn = (route , state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadMe().pipe(
    map(me => {
      if (me) return true;
      return router.createUrlTree(['/auth/login'], {
        queryParams: {returnUrl: state}
      });
    })
  );
};