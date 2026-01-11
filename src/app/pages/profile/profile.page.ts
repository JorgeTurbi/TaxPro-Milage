/**
 * TaxPro Mileage - Página de Perfil
 * ==================================
 * Esta página muestra la información del usuario y configuraciones:
 * - Datos del usuario (nombre, email)
 * - Toggle de autenticación biométrica
 * - Configuración de auto-stop
 * - Propósito por defecto de los viajes
 * - Información de la app
 * - Botón de cerrar sesión
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonAvatar,
  IonCard,
 
  IonCardContent,
  IonNote,
  IonListHeader,

  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  fingerPrintOutline,
  carOutline,
  timeOutline,
  logOutOutline,
  informationCircleOutline,
  shieldCheckmarkOutline,
  settingsOutline,
  chevronForwardOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { GpsTrackingService } from '../../services/gps-tracking.service';
import { User, TripPurpose } from '../../models/interfaces';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonAvatar,
    IonCard,
   
    IonCardContent,
    IonNote,
    IonListHeader,
 
    IonSpinner
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Mi Perfil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Card de Usuario -->
      <ion-card class="user-card">
        <ion-card-content>
          <div class="user-info">
            <ion-avatar class="user-avatar">
              <div class="avatar-placeholder">
                <ion-icon name="person-outline"></ion-icon>
              </div>
            </ion-avatar>
            <div class="user-details">
              <h2>{{ user?.firstName }} {{ user?.lastName }}</h2>
              <p>
                <ion-icon name="mail-outline"></ion-icon>
                {{ user?.email }}
              </p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Sección de Seguridad -->
      <ion-list-header>
        <ion-label>
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          Seguridad
        </ion-label>
      </ion-list-header>
      
      <ion-list inset>
        <ion-item>
          <ion-icon name="finger-print-outline" slot="start" color="primary"></ion-icon>
          <ion-label>
            <h3>Login Biométrico</h3>
            <p>{{ biometryTypeLabel }}</p>
          </ion-label>
          <ion-toggle 
            [checked]="biometricEnabled"
            [disabled]="!biometryAvailable"
            (ionChange)="toggleBiometric($event)"
            slot="end">
          </ion-toggle>
        </ion-item>
      </ion-list>

      <!-- Sección de Configuración de Tracking -->
      <ion-list-header>
        <ion-label>
          <ion-icon name="settings-outline"></ion-icon>
          Configuración de Tracking
        </ion-label>
      </ion-list-header>

      <ion-list inset>
        <!-- Auto-Stop -->
        <ion-item>
          <ion-icon name="time-outline" slot="start" color="primary"></ion-icon>
          <ion-label>
            <h3>Auto-Stop</h3>
            <p>Detener automáticamente al estacionarse</p>
          </ion-label>
          <ion-toggle 
            [checked]="autoStopEnabled"
            (ionChange)="toggleAutoStop($event)"
            slot="end">
          </ion-toggle>
        </ion-item>

        <!-- Tiempo de Auto-Stop -->
        <ion-item [disabled]="!autoStopEnabled">
          <ion-label>
            <h3>Tiempo de espera</h3>
            <p>Tiempo sin movimiento antes de detener</p>
          </ion-label>
          <ion-select 
            [value]="autoStopTimeout"
            (ionChange)="setAutoStopTimeout($event)"
            interface="popover"
            slot="end">
            <ion-select-option [value]="60">1 minuto</ion-select-option>
            <ion-select-option [value]="120">2 minutos</ion-select-option>
            <ion-select-option [value]="180">3 minutos</ion-select-option>
            <ion-select-option [value]="300">5 minutos</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Propósito por Defecto -->
        <ion-item>
          <ion-icon name="car-outline" slot="start" color="primary"></ion-icon>
          <ion-label>
            <h3>Propósito por defecto</h3>
            <p>Se usará al iniciar un nuevo viaje</p>
          </ion-label>
          <ion-select 
            [value]="defaultPurpose"
            (ionChange)="setDefaultPurpose($event)"
            interface="popover"
            slot="end">
            <ion-select-option value="business">Negocios</ion-select-option>
            <ion-select-option value="medical">Médico</ion-select-option>
            <ion-select-option value="charity">Caridad</ion-select-option>
            <ion-select-option value="moving">Mudanza</ion-select-option>
            <ion-select-option value="personal">Personal</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <!-- Sección de Información -->
      <ion-list-header>
        <ion-label>
          <ion-icon name="information-circle-outline"></ion-icon>
          Información
        </ion-label>
      </ion-list-header>

      <ion-list inset>
        <ion-item>
          <ion-label>
            <h3>Versión de la App</h3>
          </ion-label>
          <ion-note slot="end">{{ appVersion }}</ion-note>
        </ion-item>

        <ion-item>
          <ion-label>
            <h3>Tarifa IRS por Milla</h3>
          </ion-label>
          <ion-note slot="end">\${{ mileageRate }}/milla</ion-note>
        </ion-item>

        <ion-item>
          <ion-label>
            <h3>ID de Usuario</h3>
          </ion-label>
          <ion-note slot="end">{{ user?.id || 'N/A' }}</ion-note>
        </ion-item>
      </ion-list>

      <!-- Estadísticas Rápidas -->
      <ion-list-header>
        <ion-label>
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          Estado del Sistema
        </ion-label>
      </ion-list-header>

      <ion-list inset>
        <ion-item>
          <ion-label>
            <h3>GPS</h3>
          </ion-label>
          <ion-note slot="end" [color]="gpsStatus ? 'success' : 'danger'">
            {{ gpsStatus ? 'Disponible' : 'No disponible' }}
          </ion-note>
        </ion-item>

        <ion-item>
          <ion-label>
            <h3>Biometría</h3>
          </ion-label>
          <ion-note slot="end" [color]="biometryAvailable ? 'success' : 'warning'">
            {{ biometryAvailable ? 'Disponible' : 'No disponible' }}
          </ion-note>
        </ion-item>

        <ion-item>
          <ion-label>
            <h3>Conexión API</h3>
          </ion-label>
          <ion-note slot="end" color="success">Conectado</ion-note>
        </ion-item>
      </ion-list>

      <!-- Botón de Cerrar Sesión -->
      <div class="logout-section">
        <ion-button 
          expand="block" 
          color="danger" 
          fill="outline"
          (click)="confirmLogout()"
          [disabled]="isLoggingOut">
          <ion-icon name="log-out-outline" slot="start"></ion-icon>
          <span *ngIf="!isLoggingOut">Cerrar Sesión</span>
          <ion-spinner *ngIf="isLoggingOut" name="crescent"></ion-spinner>
        </ion-button>
      </div>

      <!-- Espacio inferior para el tab bar -->
      <div class="bottom-spacer"></div>
    </ion-content>
  `,
  styles: [`
    .user-card {
      margin: 0 0 20px 0;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
      color: white;
    }

    .user-avatar {
      width: 70px;
      height: 70px;
      --border-radius: 50%;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-placeholder ion-icon {
      font-size: 36px;
      color: white;
    }

    .user-details h2 {
      margin: 0 0 4px 0;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .user-details p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .user-details p ion-icon {
      font-size: 14px;
    }

    ion-list-header {
      margin-top: 16px;
      padding-left: 0;
    }

    ion-list-header ion-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--ion-color-medium);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ion-list-header ion-icon {
      font-size: 18px;
    }

    ion-list[inset] {
      border-radius: 12px;
      margin: 8px 0 16px 0;
    }

    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --min-height: 56px;
    }

    ion-item ion-icon[slot="start"] {
      font-size: 22px;
      margin-right: 16px;
    }

    ion-item h3 {
      font-weight: 500;
      font-size: 1rem;
      margin-bottom: 2px;
    }

    ion-item p {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
    }

    ion-note {
      font-size: 0.9rem;
    }

    ion-select {
      max-width: 140px;
    }

    .logout-section {
      margin: 32px 0;
      padding: 0 16px;
    }

    .logout-section ion-button {
      --border-radius: 12px;
      height: 50px;
      font-weight: 600;
    }

    .bottom-spacer {
      height: 100px;
    }

    /* Colores de estado */
    ion-note[color="success"] {
      color: var(--ion-color-success);
    }

    ion-note[color="warning"] {
      color: var(--ion-color-warning);
    }

    ion-note[color="danger"] {
      color: var(--ion-color-danger);
    }
  `]
})
export class ProfilePage implements OnInit {
  // Servicios inyectados
  private authService = inject(AuthService);
  private gpsService = inject(GpsTrackingService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // Datos del usuario
  user: User | null = null;

  // Configuración de biometría
  biometricEnabled = false;
  biometryAvailable = false;
  biometryTypeLabel = 'No disponible';

  // Configuración de tracking
  autoStopEnabled = true;
  autoStopTimeout = 120; // segundos
  defaultPurpose: TripPurpose = 'business';

  // Estado del sistema
  gpsStatus = false;

  // Info de la app
  appVersion = '1.0.0';
  mileageRate = environment.app.mileageRate;

  // Estados de carga
  isLoggingOut = false;

  constructor() {
    // Registrar iconos
    addIcons({
      personOutline,
      mailOutline,
      fingerPrintOutline,
      carOutline,
      timeOutline,
      logOutOutline,
      informationCircleOutline,
      shieldCheckmarkOutline,
      settingsOutline,
      chevronForwardOutline,
      checkmarkCircleOutline
    });
  }

  async ngOnInit() {
    // Cargar datos del usuario
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    // Cargar configuraciones
    await this.loadSettings();

    // Verificar disponibilidad de sistemas
    await this.checkSystemStatus();
  }

  /**
   * Carga las configuraciones guardadas
   */
  async loadSettings(): Promise<void> {
    try {
      // Biometría habilitada
      const biometricEnabled = await Preferences.get({ key: 'biometric_login_enabled' });
      this.biometricEnabled = biometricEnabled.value === 'true';

      // Auto-stop habilitado
      const autoStop = await Preferences.get({ key: 'auto_stop_enabled' });
      this.autoStopEnabled = autoStop.value !== 'false'; // Por defecto true

      // Timeout de auto-stop
      const timeout = await Preferences.get({ key: 'auto_stop_timeout' });
      this.autoStopTimeout = timeout.value ? parseInt(timeout.value) : 120;

      // Propósito por defecto
      const purpose = await Preferences.get({ key: 'default_trip_purpose' });
      this.defaultPurpose = (purpose.value as TripPurpose) || 'business';

    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    }
  }

  /**
   * Verifica el estado de los sistemas (GPS, biometría)
   */
  async checkSystemStatus(): Promise<void> {
    // Verificar GPS
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const permissions = await Geolocation.checkPermissions();
      this.gpsStatus = permissions.location === 'granted';
    } catch {
      this.gpsStatus = false;
    }

    // Verificar biometría
    try {
      const biometryType = await this.authService.checkBiometricAvailability();
      this.biometryAvailable = biometryType !== null;
      
      if (biometryType) {
        // Determinar label según el tipo
        const { BiometryType } = await import('@capgo/capacitor-native-biometric');
        switch (biometryType) {
          case BiometryType.FACE_ID:
            this.biometryTypeLabel = 'Face ID disponible';
            break;
          case BiometryType.TOUCH_ID:
            this.biometryTypeLabel = 'Touch ID disponible';
            break;
          case BiometryType.FINGERPRINT:
            this.biometryTypeLabel = 'Huella digital disponible';
            break;
          default:
            this.biometryTypeLabel = 'Biometría disponible';
        }
      } else {
        this.biometryTypeLabel = 'No disponible en este dispositivo';
      }
    } catch {
      this.biometryAvailable = false;
      this.biometryTypeLabel = 'No disponible';
    }
  }

  /**
   * Activa/desactiva el login biométrico
   */
  async toggleBiometric(event: any): Promise<void> {
    const enabled = event.detail.checked;
    
    try {
      await this.authService.setBiometricLoginEnabled(enabled);
      this.biometricEnabled = enabled;
      
      await this.showToast(
        enabled 
          ? 'Login biométrico activado' 
          : 'Login biométrico desactivado'
      );
    } catch (error) {
      console.error('Error cambiando configuración biométrica:', error);
      // Revertir el toggle
      this.biometricEnabled = !enabled;
    }
  }

  /**
   * Activa/desactiva el auto-stop
   */
  async toggleAutoStop(event: any): Promise<void> {
    const enabled = event.detail.checked;
    
    await Preferences.set({
      key: 'auto_stop_enabled',
      value: String(enabled)
    });
    
    this.autoStopEnabled = enabled;
    await this.showToast(
      enabled 
        ? 'Auto-stop activado' 
        : 'Auto-stop desactivado'
    );
  }

  /**
   * Establece el tiempo de auto-stop
   */
  async setAutoStopTimeout(event: any): Promise<void> {
    const timeout = event.detail.value;
    
    await Preferences.set({
      key: 'auto_stop_timeout',
      value: String(timeout)
    });
    
    this.autoStopTimeout = timeout;
  }

  /**
   * Establece el propósito por defecto de los viajes
   */
  async setDefaultPurpose(event: any): Promise<void> {
    const purpose = event.detail.value;
    
    await Preferences.set({
      key: 'default_trip_purpose',
      value: purpose
    });
    
    this.defaultPurpose = purpose;
    await this.showToast('Propósito por defecto actualizado');
  }

  /**
   * Muestra confirmación antes de cerrar sesión
   */
  async confirmLogout(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: () => this.logout()
        }
      ]
    });

    await alert.present();
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(): Promise<void> {
    this.isLoggingOut = true;
    
    try {
      // Detener tracking si está activo
      const trackingState = this.gpsService.getCurrentState();
      if (trackingState.isTracking) {
        await this.gpsService.stopTracking();
      }

      // Cerrar sesión
      await this.authService.logout();
      
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      await this.showToast('Error al cerrar sesión', 'danger');
    } finally {
      this.isLoggingOut = false;
    }
  }

  /**
   * Muestra un toast con mensaje
   */
  private async showToast(message: string, color: string = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
