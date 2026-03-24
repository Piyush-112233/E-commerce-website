import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest-only/guest-guard';

export const authRoutes: Routes = [
    { path: "register", canActivate: [guestGuard], loadComponent: () => import('./pages/register-pages/register-pages').then((c) => c.RegisterPages) },
    // {path: "", loadComponent: () => import('./pages/login-pages/login-pages').then((c) => c.LoginPages)},
    {
        path: "login",
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/login-pages/login-pages').then((c) => c.LoginPages)
    },
    { path: "forgot-password", canActivate: [guestGuard], loadComponent: () => import('./pages/forgot-password/forgot-password').then((c) => c.ForgotPassword) },
    { path: "reset-password/:token", canActivate: [guestGuard], loadComponent: () => import('./pages/reset-password/reset-password').then((c) => c.ResetPassword) }
];
