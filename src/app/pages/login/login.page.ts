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
import { CustomerAuthService, BiometryType } from '../../services/customer-auth.service';


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
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage implements OnInit {
  // Inyección de dependencias
  private authService = inject(CustomerAuthService);
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
    // La redirección si ya está autenticado se maneja con noAuthGuard en las rutas
  }

  /**
   * Verifica si hay biometría disponible en el dispositivo
   */
  async checkBiometricAvailability(): Promise<void> {
    try {
      // Verificar si el hardware biométrico está disponible
      const biometryType = await this.authService.checkBiometricAvailability();

      if (biometryType) {
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

        // Verificar si hay credenciales biométricas guardadas
        const biometricEnabled = await this.authService.isBiometricLoginEnabled();
        this.biometryAvailable = biometricEnabled;

        console.log('Biometría disponible:', this.biometryType, 'Habilitada:', biometricEnabled);
      } else {
        this.biometryAvailable = false;
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

    // Limpiar localStorage antes del login
    this.authService.clearStorageBeforeLogin();

    const credentials = {
      email: this.loginForm.value.email.trim().toLowerCase(),
      password: this.loginForm.value.password
    };

    this.authService.login(credentials).subscribe({
      next: async (response) => {
        console.log('Login exitoso:', response);
        if (response && response.success) {
          // Verificar si hay biometría disponible
          const biometryType = await this.authService.checkBiometricAvailability();
          const biometricEnabled = await this.authService.isBiometricLoginEnabled();

          if (biometryType) {
            if (!biometricEnabled) {
              // Primera vez: preguntar si quiere habilitarla
              this.biometryType = biometryType === BiometryType.FACE_ID ? 'faceId' : 'fingerprint';
              await this.askToEnableBiometrics();
            } else {
              // Ya está habilitada: actualizar tokens guardados con los nuevos
              await this.authService.setBiometricLoginEnabled(true);
              console.log('Tokens biométricos actualizados');
            }
          }

          // Navegar al dashboard
          await this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
        } else {
          this.errorMessage = response?.message || 'Error al iniciar sesión';
        }
      },
      error: (error) => {
        console.error('Error en login:', error);
        this.errorMessage = error?.error?.message || error?.message || 'Error al iniciar sesión';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Inicia sesión usando biometría
   */
  async loginWithBiometrics(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Verificando...',
      spinner: 'crescent'
    });

    try {
      await loading.present();

      const success = await this.authService.authenticateWithBiometrics();

      await loading.dismiss();

      if (success) {
        await this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
      } else {
        // Si no fue exitoso, mostrar mensaje para login manual
        await this.showBiometricExpiredAlert();
      }

    } catch (error: any) {
      await loading.dismiss();

      console.error('Error en login biométrico:', error);

      // Verificar si es un error de token expirado o credenciales inválidas
      if (error.message?.includes('401') || error.message?.includes('expired') || error.message?.includes('invalid')) {
        await this.showBiometricExpiredAlert();
      } else {
        // Otro tipo de error (usuario canceló, etc.)
        const alert = await this.alertController.create({
          header: 'Error de autenticación',
          message: error.message || 'No se pudo verificar tu identidad',
          buttons: ['Entendido']
        });
        await alert.present();
      }
    }
  }

  /**
   * Muestra alerta cuando las credenciales biométricas expiraron
   */
  private async showBiometricExpiredAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Sesión expirada',
      message: 'Tu sesión guardada ha expirado. Por favor, inicia sesión con tu correo y contraseña para actualizar tus credenciales biométricas.',
      buttons: ['Entendido']
    });
    await alert.present();
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
