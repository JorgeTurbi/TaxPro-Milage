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
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
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
