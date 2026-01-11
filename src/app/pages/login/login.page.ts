/**
 * TaxPro Mileage - Página de Login
 * =================================
 * Página de inicio de sesión con:
 * - Login con email y contraseña
 * - Autenticación biométrica (huella/Face ID)
 * - Validación de formularios
 * - Manejo de errores
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,

  IonInputPasswordToggle,
  AlertController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  fingerPrint, 
  logInOutline, 
  mailOutline, 
  lockClosedOutline,
  alertCircleOutline
} from 'ionicons/icons';
// import { BiometryType } from '@capacitor-community/biometric-auth';

import { AuthService } from '../../services/auth.service';
import { BiometryType } from '@capgo/capacitor-native-biometric/dist/esm/definitions';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,    
    IonInputPasswordToggle
  ],
  template: `
    <ion-content [fullscreen]="true">
      <div class="login-container">
        
        <!-- Logo de TaxPro Suite -->
        <img 
          src="assets/images/logo.png" 
          alt="TaxPro Suite" 
          class="login-logo"
          (error)="onLogoError($event)"
        />
        
        <!-- Tarjeta de Login -->
        <div class="login-card fade-in">
          
          <!-- Título -->
          <h1 class="login-title">TaxPro Mileage</h1>
          <p class="login-subtitle">Inicia sesión para continuar</p>
          
          <!-- Formulario de Login -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            
            <!-- Campo Email -->
            <ion-input
              class="taxpro-input"
              type="email"
              formControlName="email"
              placeholder="Correo electrónico"
              [clearInput]="true"
              autocomplete="email"
            >
              <ion-icon slot="start" name="mail-outline"></ion-icon>
            </ion-input>
            
            <!-- Error de Email -->
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.errors) {
              <p class="error-text">
                @if (loginForm.get('email')?.errors?.['required']) {
                  El correo es requerido
                }
                @if (loginForm.get('email')?.errors?.['email']) {
                  Ingresa un correo válido
                }
              </p>
            }
            
            <!-- Campo Contraseña -->
            <ion-input
              class="taxpro-input"
              type="password"
              formControlName="password"
              placeholder="Contraseña"
              autocomplete="current-password"
            >
              <ion-icon slot="start" name="lock-closed-outline"></ion-icon>
              <ion-input-password-toggle slot="end"></ion-input-password-toggle>
            </ion-input>
            
            <!-- Error de Contraseña -->
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.errors) {
              <p class="error-text">
                @if (loginForm.get('password')?.errors?.['required']) {
                  La contraseña es requerida
                }
                @if (loginForm.get('password')?.errors?.['minlength']) {
                  Mínimo 6 caracteres
                }
              </p>
            }
            
            <!-- Error General -->
            @if (errorMessage) {
              <div class="error-banner">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <span>{{ errorMessage }}</span>
              </div>
            }
            
            <!-- Botón de Login -->
            <ion-button
              expand="block"
              type="submit"
              class="btn-taxpro"
              [disabled]="isLoading || loginForm.invalid"
            >
              @if (isLoading) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                <ion-icon slot="start" name="log-in-outline"></ion-icon>
                Iniciar Sesión
              }
            </ion-button>
            
          </form>
          
          <!-- Separador -->
          @if (biometryAvailable) {
            <div class="separator">
              <span>o</span>
            </div>
            
            <!-- Botón de Biometría -->
            <div class="biometric-btn" (click)="loginWithBiometrics()">
              <ion-icon name="finger-print"></ion-icon>
              <span>{{ biometryType === 'faceId' ? 'Usar Face ID' : 'Usar huella digital' }}</span>
            </div>
          }
          
        </div>
        
        <!-- Versión de la app -->
        <p class="version-text">v1.0.0</p>
        
      </div>
    </ion-content>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 24px;
      background: linear-gradient(180deg, #1a365d 0%, #2c5282 100%);
    }

    .login-logo {
      width: 100px;
      height: 100px;
      margin-bottom: 32px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      background: white;
      object-fit: contain;
      padding: 10px;
    }

    .login-card {
      background: white;
      border-radius: 24px;
      padding: 32px 24px;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
    }

    .login-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a365d;
      text-align: center;
      margin: 0 0 8px 0;
    }

    .login-subtitle {
      font-size: 0.875rem;
      color: #718096;
      text-align: center;
      margin: 0 0 32px 0;
    }

    .taxpro-input {
      --background: #f7fafc;
      --border-radius: 12px;
      --border-color: #e2e8f0;
      --border-width: 1px;
      --padding-start: 16px;
      --padding-end: 16px;
      --highlight-color-focused: #1a365d;
      margin-bottom: 8px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .taxpro-input ion-icon {
      color: #718096;
      margin-right: 8px;
    }

    .error-text {
      color: #e53e3e;
      font-size: 0.75rem;
      margin: -4px 0 12px 4px;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fed7d7;
      color: #c53030;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.875rem;
    }

    .error-banner ion-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .btn-taxpro {
      --background: linear-gradient(135deg, #1a365d, #3182ce);
      --border-radius: 12px;
      --box-shadow: 0 4px 15px rgba(26, 54, 93, 0.3);
      font-weight: 600;
      text-transform: none;
      height: 48px;
      margin-top: 16px;
    }

    .separator {
      display: flex;
      align-items: center;
      margin: 24px 0;
    }

    .separator::before,
    .separator::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }

    .separator span {
      padding: 0 16px;
      color: #718096;
      font-size: 0.875rem;
    }

    .biometric-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      background: #f7fafc;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .biometric-btn:hover,
    .biometric-btn:active {
      background: #edf2f7;
      border-color: #1a365d;
    }

    .biometric-btn ion-icon {
      font-size: 2.5rem;
      color: #1a365d;
    }

    .biometric-btn span {
      font-size: 0.875rem;
      color: #4a5568;
      font-weight: 500;
    }

    .version-text {
      margin-top: 32px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.75rem;
    }

    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    ion-spinner {
      --color: white;
    }
  `]
})
export class LoginPage implements OnInit {
  // Inyección de dependencias
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);

  // Formulario de login
  loginForm: FormGroup;

  // Estados
  isLoading = false;
  errorMessage = '';
  biometryAvailable = false;
  biometryType: 'fingerprint' | 'faceId' | 'iris' | null = null;

  constructor() {
    // Registrar iconos
    addIcons({
      fingerPrint,
      logInOutline,
      mailOutline,
      lockClosedOutline,
      alertCircleOutline
    });

    // Inicializar formulario
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async ngOnInit(): Promise<void> {
    // Verificar si hay biometría disponible
    await this.checkBiometricAvailability();

    // Si hay sesión activa, redirigir al dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/tabs/dashboard']);
    }
  }

  /**
   * Verifica si hay biometría disponible en el dispositivo
   */
  async checkBiometricAvailability(): Promise<void> {
    try {
      const biometryType = await this.authService.checkBiometricAvailability();
      
      if (biometryType) {
        this.biometryAvailable = true;
        
        // Mapear el tipo de biometría
        switch (biometryType) {
          case BiometryType.FACE_ID:
            this.biometryType = 'faceId';
            break;
          case BiometryType.TOUCH_ID:
          case BiometryType.FINGERPRINT:
            this.biometryType = 'fingerprint';
            break;
          case BiometryType.IRIS_AUTHENTICATION:
            this.biometryType = 'iris';
            break;
          default:
            this.biometryType = 'fingerprint';
        }

        // Verificar si el login biométrico está habilitado
        const biometricEnabled = await this.authService.isBiometricLoginEnabled();
        this.biometryAvailable = biometricEnabled;
      }
    } catch (error) {
      console.log('Biometría no disponible:', error);
      this.biometryAvailable = false;
    }
  }

  /**
   * Maneja el envío del formulario de login
   */
  async onSubmit(): Promise<void> {
    // Validar formulario
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = {
      email: this.loginForm.value.email.trim().toLowerCase(),
      password: this.loginForm.value.password
    };

    try {
      // Intentar login
      await this.authService.login(credentials).toPromise();

      // Preguntar si quiere habilitar biometría
      const biometryType = await this.authService.checkBiometricAvailability();
      if (biometryType) {
        await this.askToEnableBiometrics();
      }

      // Navegar al dashboard
      await this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });

    } catch (error: any) {
      this.errorMessage = error.message || 'Error al iniciar sesión';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Inicia sesión usando biometría
   */
  async loginWithBiometrics(): Promise<void> {
    try {
      const loading = await this.loadingController.create({
        message: 'Verificando...',
        spinner: 'crescent'
      });
      await loading.present();

      const success = await this.authService.authenticateWithBiometrics();

      await loading.dismiss();

      if (success) {
        await this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
      }

    } catch (error: any) {
      await this.loadingController.dismiss();
      
      // Mostrar error
      const alert = await this.alertController.create({
        header: 'Error de autenticación',
        message: error.message || 'No se pudo verificar tu identidad',
        buttons: ['Entendido']
      });
      await alert.present();
    }
  }

  /**
   * Pregunta al usuario si quiere habilitar login biométrico
   */
  async askToEnableBiometrics(): Promise<void> {
    const biometryName = this.biometryType === 'faceId' ? 'Face ID' : 'huella digital';
    
    const alert = await this.alertController.create({
      header: 'Login rápido',
      message: `¿Deseas usar ${biometryName} para iniciar sesión más rápido?`,
      buttons: [
        {
          text: 'No, gracias',
          role: 'cancel'
        },
        {
          text: 'Sí, activar',
          handler: async () => {
            await this.authService.setBiometricLoginEnabled(true);
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Maneja el error si el logo no carga
   */
  onLogoError(event: any): void {
    // Usar un placeholder si el logo no carga
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCBmaWxsPSIjMWEzNjVkIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIi8+PHRleHQgeD0iNTAiIHk9IjU1IiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk08L3RleHQ+PC9zdmc+';
  }
}
