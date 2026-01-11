/**
 * TaxPro Mileage - Interceptor de Autenticación
 * ==============================================
 * Este interceptor agrega automáticamente el token JWT
 * a todas las peticiones HTTP que van hacia la API.
 * 
 * También maneja:
 * - Renovación automática del token expirado
 * - Redirección al login si no hay sesión válida
 */

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, from } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Interceptor funcional de autenticación
 * Se aplica a todas las peticiones HTTP
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // No interceptar peticiones que no son a nuestra API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // No interceptar la petición de login
  if (req.url.includes(environment.endpoints.login)) {
    return next(req);
  }

  // No interceptar la petición de refresh token
  if (req.url.includes(environment.endpoints.refreshToken)) {
    return next(req);
  }

  // Obtener el token actual
  const token = authService.getToken();

  // Si hay token, agregarlo al header
  let authReq = req;
  if (token) {
    authReq = addTokenToRequest(req, token);
  }

  // Ejecutar la petición
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 (no autorizado)
      if (error.status === 401) {
        // Intentar refrescar el token
        return from(authService.refreshToken()).pipe(
          switchMap((refreshed) => {
            if (refreshed) {
              // Token refrescado exitosamente, reintentar la petición
              const newToken = authService.getToken();
              if (newToken) {
                const retryReq = addTokenToRequest(req, newToken);
                return next(retryReq);
              }
            }
            
            // No se pudo refrescar, cerrar sesión
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            // Error al refrescar, cerrar sesión
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      // Si el error es 403 (prohibido), también cerrar sesión
      if (error.status === 403) {
        authService.logout();
        router.navigate(['/login']);
      }

      // Para otros errores, simplemente propagarlos
      return throwError(() => error);
    })
  );
};

/**
 * Agrega el token JWT al header de la petición
 */
function addTokenToRequest(
  request: HttpRequest<unknown>,
  token: string
): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}
