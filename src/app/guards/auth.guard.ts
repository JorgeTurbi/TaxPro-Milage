/**
 * TaxPro Mileage - Guard de Autenticación
 * ========================================
 * Este guard protege las rutas que requieren autenticación.
 * Si el usuario no está autenticado, redirige al login.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

import { CustomerAuthService } from '../services/customer-auth.service';

/**
 * Guard funcional de autenticación
 * Verifica si el usuario está autenticado antes de permitir
 * el acceso a una ruta protegida
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(CustomerAuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isLoggedIn();

  if (isAuthenticated) {
    console.log('Guard: Usuario autenticado, acceso permitido');
    return true;
  } else {
    console.log('Guard: Usuario no autenticado, redirigiendo a login');
    const returnUrl = state.url;
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl }
    });
  }
};

/**
 * Guard inverso - redirige a dashboard si ya está autenticado
 * Útil para la página de login
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(CustomerAuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isLoggedIn();

  if (!isAuthenticated) {
    return true;
  } else {
    console.log('Guard: Usuario ya autenticado, redirigiendo a dashboard');
    return router.createUrlTree(['/tabs/dashboard']);
  }
};
