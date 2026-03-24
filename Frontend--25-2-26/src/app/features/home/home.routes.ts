import { Routes } from "@angular/router";

export const homeRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/home-success' },
  {
    path: 'home-success',
    loadComponent: () => import('./pages/home-pages/home-pages').then((c) => c.HomePages)
  }
];