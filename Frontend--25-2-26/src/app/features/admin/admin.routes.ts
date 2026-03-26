import { Routes } from "@angular/router";

export const adminRoutes: Routes = [
    {
        path: '', loadComponent: () => import('./dashboard/dashboard').then((c) => c.Dashboard),
        children: [
            {
                path: "categories", loadComponent: () => import("./admin-category/admin-category").then((c) => c.AdminCategory)
            },
            {
                path: "products", loadComponent: () => import("./admin-product/admin-product").then((c) => c.AdminProduct)
            },
            {
                path: 'chat',
                loadComponent: () => import('./chat/chat').then((m) => m.Chat)
            },
        ]
    }
];