import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest-only/guest-guard';

export const authRoutes: Routes = [
    { path: "register", loadComponent: () => import('./pages/register-pages/register-pages').then((c) => c.RegisterPages) },
    // {path: "", loadComponent: () => import('./pages/login-pages/login-pages').then((c) => c.LoginPages)},
    {
        path: "login",
        canMatch: [guestGuard],
        loadComponent: () => import('./pages/login-pages/login-pages').then((c) => c.LoginPages)
    },
    { path: "forgot-password", loadComponent: () => import('./pages/forgot-password/forgot-password').then((c) => c.ForgotPassword) },
    { path: "reset-password/:token", loadComponent: () => import('./pages/reset-password/reset-password').then((c) => c.ResetPassword) }
];
