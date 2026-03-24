import { Routes } from '@angular/router';
import { authGuardGuard } from './core/guards/authGuard/auth-guard-guard';
import { roleGuard } from './core/guards/role/role-guard';

export const routes: Routes = [
  { path: 'login', pathMatch: 'full', redirectTo: 'auth/login' },

  // ✅ auth pages must be reachable without login
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  {
  path: 'admin',
  canMatch: [roleGuard],
  data: { roles: ['admin'] },
  loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
}

  { path: '', loadChildren: () => import('./features/home/home.routes').then((m) => m.homeRoutes) },
];