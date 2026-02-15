import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  Subject,
  tap,
  throwError,
} from 'rxjs';

import { Router } from '@angular/router';
import { ICustomerLogin, ICustomerLoginResponse, ICustomerProfile, ICustomerSelectCompanyRequest } from '../models/customer-login.interface';
import { CustomerTokenService } from './customer-token.service';
import { environment } from '../../environments/environment';
import { IApiResponse } from '../models/IApiResponse';
import { ICustomerForceLogoutRequest, ICustomerForceLogoutResponse } from '../models/customer-force-logout.interface';
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TripService } from './trip.service';
import { TrackingApiService } from './tracking-api.service';
import { GpsTrackingService } from './gps-tracking.service';

export { BiometryType } from '@capgo/capacitor-native-biometric';

@Injectable({
  providedIn: 'root',
})
export class CustomerAuthService {
  private http = inject(HttpClient);
  private customerTokenService = inject(CustomerTokenService);
  // private cloudTokenService = inject(CloudTokenService);
  // private toastService = inject(ToastService);
  // private socketConnection = inject(SocketConnectionService);
  // private mediaCacheService = inject(MediaCacheService);
  // private notificationWS = inject(NotificationWebSocketService);
  private tripService : TripService = inject(TripService);
  private trackingService : GpsTrackingService = inject(GpsTrackingService);
  private router = inject(Router);

  public currentCustomerSubject = new BehaviorSubject<ICustomerProfile | null>(null);
  currentCustomer$ = this.currentCustomerSubject.asObservable();

  private destroy$ = new Subject<void>();
  private isHandlingForceLogout = false;

  private assignmentChangedSubject = new Subject<{
    taxUserId: string;
    isAssigned: boolean;
    reason?: string;
  }>();
  public assignmentChanged$ = this.assignmentChangedSubject.asObservable();

  constructor() {



    const token = this.customerTokenService.token;
    if (token) {
      this.loadCustomerProfile().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Login inicial que puede requerir selección de company
   */
  login(data: ICustomerLogin): Observable<IApiResponse<ICustomerLoginResponse>> {
    return this.http
      .post<IApiResponse<ICustomerLoginResponse>>(
        `${environment.apiUrl}/auth/client/login`,
        data
      )
      .pipe(
        map((res) => {
          if (res.success && res.data) {
            // Verificar si requiere selección de company
            if (res.data.requiresCompanySelection && res.data.availableCompanies) {
              // No procesar tokens aún, devolver para mostrar selector
              return res;
            }

            // Login directo (una sola company)
            const { tokenRequest, tokenRefresh, customerProfile } = res.data;

            if (tokenRequest && tokenRefresh) {
              this.customerTokenService.setTokens(tokenRequest, tokenRefresh);

              if (customerProfile) {
                this.currentCustomerSubject.next(customerProfile);
              } else {
                this.loadCustomerProfile().subscribe({
                  error: (err) => console.error('Error loading customer profile:', err)
                });
              }
            }

            return res;
          }
          throw new Error(res.message || 'Login failed');
        }),
        catchError((err) => throwError(() => err))
      );
  }

  /**
   * Completar login con company seleccionada
   */
  loginWithCompany(data: ICustomerSelectCompanyRequest): Observable<IApiResponse<ICustomerLoginResponse>> {
    return this.http
      .post<IApiResponse<ICustomerLoginResponse>>(
        `${environment.apiUrl}/auth/client/login/select-company`,
        data
      )
      .pipe(
        map((res) => {
          if (res.success && res.data) {
            const { tokenRequest, tokenRefresh, customerProfile } = res.data;

            if (tokenRequest && tokenRefresh) {
              this.customerTokenService.setTokens(tokenRequest, tokenRefresh);

              if (customerProfile) {
                this.currentCustomerSubject.next(customerProfile);
              } else {
                this.loadCustomerProfile().subscribe({
                  error: (err) => console.error('Error loading customer profile:', err)
                });
              }
            }

            return res;
          }
          throw new Error(res.message || 'Login failed');
        }),
        catchError((err) => throwError(() => err))
      );
  }

  loadCustomerProfile(): Observable<ICustomerProfile | null> {
    if (!this.customerTokenService.token) {
      return of(null);
    }

    return this.http
      .get<IApiResponse<ICustomerProfile>>(
        `${environment.apiUrl}/auth/client/profile`
      )
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            const customer = response.data;
            this.currentCustomerSubject.next(customer);
            return customer;
          }
          return null;
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<boolean> {
    this.clearInMemoryState();

    this.clearClientStorage();

    return this.http.post<boolean>(`${environment.apiUrl}/auth/client/logout`, {}).pipe(
      catchError(error => {
        console.warn('⚠️ Error al notificar logout al servidor (continuando con logout local):', error);
        return of(true);
      }),
      tap(() => {
        this.router.navigate(['/login']);
      })
    );
  }

  /**
 * Limpiar estado en memoria ANTES de limpiar storage
 */
  private clearInMemoryState(): void {
    this.currentCustomerSubject.next(null);

    // Limpiar cache de trips si existe
    if (this.tripService) {
      this.tripService.clearCache();
    }

    // Detener tracking si está activo
    if (this.trackingService) {
      this.trackingService.stopTracking();
    }
  }

  private async clearClientStorage(): Promise<void> {
    try {
      // 1) Capacitor Preferences - limpiar todo
      await Preferences.clear();

      // 2) Web storage - limpiar todo
      localStorage.clear();
      sessionStorage.clear();

      // 3) IndexedDB - limpiar bases de datos (si usas)
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise((resolve, reject) => {
                  const request = indexedDB.deleteDatabase(db.name!);
                  request.onsuccess = () => resolve(true);
                  request.onerror = () => reject(request.error);
                });
              }
              return Promise.resolve();
            })
          );
        } catch (error) {
          console.warn('⚠️ Error limpiando IndexedDB:', error);
        }
      }

      // 4) Cache Storage (PWA / service worker)
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      console.log('✅ Storage limpiado exitosamente');
    } catch (error) {
      console.error('❌ Error limpiando storage:', error);
    }
  }


  // async logout(): Promise<void> {
  //   const currentCustomer = this.currentCustomerSubject.value;
  //   const customerName = currentCustomer
  //     ? `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim()
  //     : this.customerTokenService.getCustomerDisplayNameFromToken();



  //   const localLogout$ = this.http
  //     .post(`${environment.apiUrl}/auth/client/logout`, {})
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error logging out the customer from the main backend.:', error);
  //         return of(null);
  //       })
  //     );



  //   forkJoin({
  //     local: localLogout$
  //   }).subscribe({
  //     next: (results) => {
  //       console.log('Customer logout completed from all services.');
  //     },
  //     error: (error) => {
  //       console.error('Error during customer logout process:', error);


  //     },
  //     complete: () => {
  //       this.customerTokenService.removeTokens();
  //       this.currentCustomerSubject.next(null);

  //       const keysToRemove = Object.keys(localStorage).filter((key) =>
  //         key.startsWith('customer_') ||
  //         key.includes('chat_') ||
  //         key.includes('webrtc_') ||
  //         key.includes('TokenCloud')
  //       );
  //       keysToRemove.forEach((key) => localStorage.removeItem(key));
  //     },
  //   });
  // }


  forceLogout(request: ICustomerForceLogoutRequest): Observable<IApiResponse<ICustomerForceLogoutResponse>> {
    return this.http
      .post<IApiResponse<ICustomerForceLogoutResponse>>(
        `${environment.apiUrl}/auth/client/force-logout`,
        request
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            const count = response.data.revokedSessionsCount;
            console.log(`Force logout successful. Revoked sessions: ${count}`);
          }
        }),
        catchError((error) => {
          console.error('Force logout error:', error);
          return throwError(() => error);
        })
      );
  }

  hasValidSession(): boolean {
    const token = this.customerTokenService.token;
    const customer = this.currentCustomerSubject.value;

    return !!(
      token &&
      this.customerTokenService.isCustomerPortalToken() &&
      customer?.customerId
    );
  }

  isAuthenticated(): boolean {
    const token = this.customerTokenService.token;
    const customer = this.currentCustomerSubject.value;

    return !!(token &&
      this.customerTokenService.isCustomerPortalToken() &&
      customer?.customerId);
  }

  getCurrentCustomer(): ICustomerProfile | null {
    return this.currentCustomerSubject.value;
  }

  /**
   * Verifica si el usuario está logueado
   */
  isLoggedIn(): boolean {
    const token = this.customerTokenService.token;
    if (!token) {
      return false;
    }
    // Verificar que el token no esté expirado
    const decodedToken = this.customerTokenService.decodeToken();
    if (!decodedToken) {
      return false;
    }
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp > currentTime;
  }

  /**
   * Limpia el localStorage antes del login
   * NO borra las credenciales biométricas para permitir login con huella
   */
  clearStorageBeforeLogin(): void {
    const keysToRemove = Object.keys(localStorage).filter((key) =>
      (key.startsWith('customer_') ||
        key.includes('chat_') ||
        key.includes('webrtc_') ||
        key.includes('TokenCloud')) &&
      !key.includes('biometric_')
    );
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    this.customerTokenService.removeTokens();
    this.currentCustomerSubject.next(null);
  }

  /**
   * Verifica si la biometría está disponible en el dispositivo
   * @returns BiometryType si está disponible, null si no
   */
  async checkBiometricAvailability(): Promise<BiometryType | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      if (result.isAvailable) {
        return result.biometryType;
      }
      return null;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return null;
    }
  }

  /**
   * Verifica si el login biométrico está habilitado para el usuario
   */
  async isBiometricLoginEnabled(): Promise<boolean> {
    const enabled = localStorage.getItem('biometric_login_enabled');
    const hasCredentials = localStorage.getItem('biometric_credentials');
    return enabled === 'true' && !!hasCredentials;
  }

  /**
   * Habilita o deshabilita el login biométrico
   */
  async setBiometricLoginEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      const currentCustomer = this.currentCustomerSubject.value;
      const token = this.customerTokenService.token;
      const refreshToken = this.customerTokenService.refreshToken;

      if (token) {
        try {
          // Guardamos los tokens como JSON para poder recuperarlos después
          const credentialsData = JSON.stringify({
            accessToken: token,
            refreshToken: refreshToken || token
          });

          await NativeBiometric.setCredentials({
            username: currentCustomer?.email || this.customerTokenService.getCustomerEmailFromToken() || 'user',
            password: credentialsData,
            server: environment.apiUrl
          });
          localStorage.setItem('biometric_login_enabled', 'true');
          localStorage.setItem('biometric_credentials', 'true');
          console.log('Biometric credentials saved successfully');
        } catch (error) {
          console.error('Error setting biometric credentials:', error);
          throw error;
        }
      }
    } else {
      try {
        await NativeBiometric.deleteCredentials({
          server: environment.apiUrl
        });
      } catch (error) {
        console.error('Error deleting biometric credentials:', error);
      }
      localStorage.removeItem('biometric_login_enabled');
      localStorage.removeItem('biometric_credentials');
    }
  }

  /**
   * Autentica al usuario usando biometría
   * @returns true si la autenticación fue exitosa
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Biometric authentication is only available on native platforms');
    }

    try {
      // verifyIdentity lanza excepción si falla, no retorna valor
      await NativeBiometric.verifyIdentity({
        reason: 'Inicia sesión en TaxPro Mileage',
        title: 'Autenticación biométrica',
        subtitle: 'Usa tu huella digital o Face ID',
        description: 'Verifica tu identidad para acceder a tu cuenta'
      });

      // Si llegamos aquí, la verificación fue exitosa
      const credentials = await NativeBiometric.getCredentials({
        server: environment.apiUrl
      });

      if (credentials && credentials.password) {
        let accessToken: string;
        let refreshToken: string;

        try {
          // Intentar parsear como JSON (nuevo formato)
          const tokensData = JSON.parse(credentials.password);
          accessToken = tokensData.accessToken;
          refreshToken = tokensData.refreshToken;
        } catch {
          // Si falla el parse, es el formato antiguo (solo token)
          accessToken = credentials.password;
          refreshToken = credentials.password;
        }

        // Verificar si el token está expirado
        const isTokenExpired = this.isTokenExpired(accessToken);

        if (isTokenExpired) {
          // Intentar refrescar el token usando el refreshToken
          try {
            const newTokens = await this.refreshTokens(refreshToken);
            if (newTokens) {
              accessToken = newTokens.accessToken;
              refreshToken = newTokens.refreshToken;

              // Actualizar credenciales biométricas con los nuevos tokens
              await this.updateBiometricCredentials(credentials.username, accessToken, refreshToken);
            } else {
              // No se pudo refrescar, el usuario debe hacer login manual
              return false;
            }
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            // El refreshToken también expiró o falló
            return false;
          }
        }

        // Establecer los tokens (frescos o recién refrescados)
        this.customerTokenService.setTokens(accessToken, refreshToken);

        // Cargar el perfil del usuario
        await this.loadCustomerProfile().toPromise();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      throw new Error(error.message || 'No se pudo verificar tu identidad');
    }
  }

  /**
   * Verifica si un token JWT está expirado
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      // Considerar expirado si le quedan menos de 60 segundos
      return payload.exp < (currentTime + 60);
    } catch {
      return true;
    }
  }

  /**
   * Intenta refrescar los tokens usando el refreshToken
   */
  private async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const response = await this.http.post<IApiResponse<{ tokenRequest: string; tokenRefresh: string }>>(
        `${environment.apiUrl}/auth/client/refresh`,
        { refreshToken }
      ).toPromise();

      if (response?.success && response.data) {
        return {
          accessToken: response.data.tokenRequest,
          refreshToken: response.data.tokenRefresh
        };
      }
      return null;
    } catch (error) {
      console.error('Error in refreshTokens:', error);
      return null;
    }
  }

  /**
   * Actualiza las credenciales biométricas con nuevos tokens
   */
  private async updateBiometricCredentials(username: string, accessToken: string, refreshToken: string): Promise<void> {
    try {
      const credentialsData = JSON.stringify({
        accessToken,
        refreshToken
      });

      await NativeBiometric.setCredentials({
        username,
        password: credentialsData,
        server: environment.apiUrl
      });
      console.log('Biometric credentials updated with new tokens');
    } catch (error) {
      console.error('Error updating biometric credentials:', error);
    }
  }

  /**
   * Verifica si hay credenciales biométricas guardadas
   */
  async hasBiometricCredentials(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const credentials = await NativeBiometric.getCredentials({
        server: environment.apiUrl
      });
      return !!(credentials && credentials.password);
    } catch {
      return false;
    }
  }
}
