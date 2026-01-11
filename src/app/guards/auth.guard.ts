/**
 * TaxPro Mileage - Guard de Autenticación
 * ========================================
 * Este guard protege las rutas que requieren autenticación.
 * Si el usuario no está autenticado, redirige al login.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

/**
 * Guard funcional de autenticación
 * Verifica si el usuario está autenticado antes de permitir
 * el acceso a una ruta protegida
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        // Usuario autenticado, permitir acceso
        console.log('✅ Guard: Usuario autenticado, acceso permitido');
        return true;
      } else {
        // Usuario no autenticado, redirigir al login
        console.log('⛔ Guard: Usuario no autenticado, redirigiendo a login');
        
        // Guardar la URL original para redirigir después del login
        const returnUrl = state.url;
        
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl }
        });
      }
    })
  );
};

/**
 * Guard inverso - redirige a dashboard si ya está autenticado
 * Útil para la página de login
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (!isAuthenticated) {
        // Usuario no autenticado, permitir acceso al login
        return true;
      } else {
        // Usuario ya autenticado, redirigir al dashboard
        console.log('ℹ️ Guard: Usuario ya autenticado, redirigiendo a dashboard');
        return router.createUrlTree(['/tabs/dashboard']);
      }
    })
  );
};
