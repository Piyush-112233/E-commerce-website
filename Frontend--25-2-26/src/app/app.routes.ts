import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role/role-guard';
import { userAreaGuard } from './core/guards/user-area/user-area-guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  {
    path: 'admin',
    canMatch: [roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  {
    path: '',
    canMatch: [userAreaGuard],
    loadChildren: () => import('./features/home/home.routes').then((m) => m.homeRoutes),
  },
  { path: '**', redirectTo: '' },
];