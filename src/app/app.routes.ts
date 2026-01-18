/**
 * TaxPro Mileage - Definición de Rutas
 * =====================================
 * Este archivo define todas las rutas de navegación de la aplicación.
 * 
 * Estructura de navegación:
 * - /login          → Página de inicio de sesión
 * - /tabs           → Contenedor principal con tabs
 *   - /tabs/dashboard  → Dashboard con estadísticas
 *   - /tabs/tracking   → Tracking GPS activo
 *   - /tabs/history    → Historial de recorridos
 *   - /tabs/profile    → Perfil del usuario
 */

import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Ruta raíz - Redirige al login o dashboard según autenticación
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Página de Login (con guard que redirige si ya está autenticado)
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [noAuthGuard]
  },

  // Contenedor principal con Tabs (requiere autenticación)
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    canActivate: [authGuard], // Protección de ruta
    children: [
      // Ruta por defecto dentro de tabs
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Tab: Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
      },

      // Tab: Tracking GPS
      {
        path: 'tracking',
        loadComponent: () => import('./pages/tracking/tracking.page').then(m => m.TrackingPage),
      },

      // Tab: Historial de Recorridos
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history.page').then(m => m.HistoryPage),
      },

      // Tab: Perfil del Usuario
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
      },

      // Tab: Configuración
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
      },
    ]
  },

  // Página de detalle de un recorrido
  {
    path: 'trip/:id',
    loadComponent: () => import('./pages/trip-detail/trip-detail.page').then(m => m.TripDetailPage),
    canActivate: [authGuard],
  },

  // Ruta comodín - Redirige al login para rutas no encontradas
  {
    path: '**',
    redirectTo: 'login'
  }
];
