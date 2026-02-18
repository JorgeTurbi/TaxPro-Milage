/**
 * TaxPro Mileage - Interceptor de Autenticación
 * ==============================================
 * Este interceptor agrega automáticamente el token JWT
 * a todas las peticiones HTTP que van hacia la API.
 *
 * También maneja:
 * - Redirección al login si no hay sesión válida
 *
 * NOTA: No inyectar CustomerAuthService aquí para evitar
 * dependencia circular (NG0200). Solo usar CustomerTokenService.
 */

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { CustomerTokenService } from '../services/customer-token.service';
import { environment } from '../../environments/environment';

/**
 * Interceptor funcional de autenticación
 * Se aplica a todas las peticiones HTTP
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const tokenService = inject(CustomerTokenService);
  const router = inject(Router);

  // No interceptar peticiones que no son a nuestra API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // No interceptar la petición de login ni force-logout
  if (req.url.includes(environment.endpoints.login) || req.url.includes('/auth/client/force-logout')) {
    return next(req);
  }

  // Obtener el token actual
  const token = tokenService.token;

  // Si hay token, agregarlo al header
  let authReq = req;
  if (token) {
    authReq = addTokenToRequest(req, token);
  }

  // Ejecutar la petición
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 (no autorizado) o 403 (prohibido), limpiar tokens y redirigir
      if (error.status === 401 || error.status === 403) {
        tokenService.removeTokens();
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
