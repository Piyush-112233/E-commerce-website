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

      // redirect based on role
      return me.role === 'ADMIN' ? router.createUrlTree(['/admin']) : router.createUrlTree(['/home-success']);
      
    })
  );
};
