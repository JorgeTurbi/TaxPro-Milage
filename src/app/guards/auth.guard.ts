/**
 * TaxPro Mileage - Guard de Autenticación
 * ========================================
 * Este guard protege las rutas que requieren autenticación.
 * Si el usuario no está autenticado, redirige al login.
 *
 * NOTA: Usa CustomerTokenService en vez de CustomerAuthService
 * para evitar dependencia circular (NG0200) con el interceptor HTTP.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

import { CustomerTokenService } from '../services/customer-token.service';

/**
 * Verifica si el token JWT está vigente
 */
function isTokenValid(tokenService: CustomerTokenService): boolean {
  const token = tokenService.token;
  if (!token) return false;
  const decoded = tokenService.decodeToken();
  if (!decoded) return false;
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp > currentTime;
}

/**
 * Guard funcional de autenticación
 * Verifica si el usuario está autenticado antes de permitir
 * el acceso a una ruta protegida
 */
export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(CustomerTokenService);
  const router = inject(Router);

  const isAuthenticated = isTokenValid(tokenService);

  if (isAuthenticated) {
    return true;
  } else {
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
  const tokenService = inject(CustomerTokenService);
  const router = inject(Router);

  const isAuthenticated = isTokenValid(tokenService);

  if (!isAuthenticated) {
    return true;
  } else {
    return router.createUrlTree(['/tabs/dashboard']);
  }
};
