import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../service/authService/auth-service';
import { map } from 'rxjs';

// prevent login page when already logged In
export const guestGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadMe().pipe(
    map(me => {
      if(!me) return true;

      // Admin -> /admin only; user/customer -> root (home routes handle / -> home-success)
      return me.role === 'admin'
        ? router.createUrlTree(['/admin'])
        : router.createUrlTree(['/']);
      
    })
  );
};
