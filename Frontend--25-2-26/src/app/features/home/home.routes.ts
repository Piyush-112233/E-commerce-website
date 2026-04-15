import { Routes } from "@angular/router";

export const homeRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/home-success' },
  {
    path: 'home-success',
    loadComponent: () => import('./pages/home-pages/home-pages').then((c) => c.HomePages)
  },
  {
    path: 'chat',
    loadComponent: () => import('../chat/pages/chat-page-component/chat-page-component').then((m) => m.ChatPageComponent)
  },
];