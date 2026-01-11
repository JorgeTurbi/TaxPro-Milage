/**
 * TaxPro Mileage - Página de Perfil MEJORADA
 * ==========================================
 * Incluye:
 * - Foto de perfil editable
 * - Gestión de vehículos (matrícula, foto, millaje)
 * - Configuración de auto-stop
 * - Ajustes de tracking
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
  IonLabel, IonInput, IonToggle, IonButton, IonIcon, IonAvatar,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect,
  IonSelectOption, IonChip, IonBadge, IonNote, IonSpinner,
  AlertController, ToastController, ActionSheetController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, carOutline, settingsOutline, logOutOutline,
  cameraOutline, createOutline, trashOutline, addOutline,
  speedometerOutline, timeOutline, locationOutline, shieldCheckmarkOutline,
  fingerPrintOutline, informationCircleOutline, briefcaseOutline, imageOutline,
  chevronForwardOutline, checkmarkOutline, closeOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';

import { AuthService } from '../../services/auth.service';
import { GpsTrackingService } from '../../services/gps-tracking.service';
import { User, Vehicle } from '../../models/interfaces';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
    IonLabel, IonToggle, IonButton, IonIcon, IonAvatar,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect,
    IonSelectOption, IonChip, IonNote
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mi Perfil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Sección de Usuario -->
      <div class="profile-header">
        <div class="avatar-container" (click)="changeProfilePhoto()">
          <ion-avatar class="profile-avatar">
            <img [src]="profilePhoto || defaultAvatar" alt="Perfil" />
          </ion-avatar>
          <div class="avatar-edit-badge">
            <ion-icon name="camera-outline"></ion-icon>
          </div>
        </div>
        <h2 class="user-name">{{ user?.firstName }} {{ user?.lastName }}</h2>
        <p class="user-email">{{ user?.email }}</p>
      </div>

      <!-- Vehículos -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="car-outline"></ion-icon>
            Mis Vehículos
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <!-- Lista de vehículos -->
          @if (vehicles.length > 0) {
            @for (vehicle of vehicles; track vehicle.id) {
              <div class="vehicle-card" [class.default]="vehicle.isDefault">
                <div class="vehicle-photo" (click)="changeVehiclePhoto(vehicle)">
                  @if (vehicle.photo) {
                    <img [src]="vehicle.photo" alt="Vehículo" />
                  } @else {
                    <ion-icon name="car-outline"></ion-icon>
                  }
                  <div class="photo-edit">
                    <ion-icon name="camera-outline"></ion-icon>
                  </div>
                </div>
                <div class="vehicle-info">
                  <div class="vehicle-plate">{{ vehicle.plate }}</div>
                  <div class="vehicle-details">
                    @if (vehicle.make || vehicle.model) {
                      <span>{{ vehicle.make }} {{ vehicle.model }}</span>
                    }
                    @if (vehicle.year) {
                      <span> ({{ vehicle.year }})</span>
                    }
                  </div>
                  <div class="vehicle-mileage">
                    <ion-icon name="speedometer-outline"></ion-icon>
                    {{ vehicle.currentMileage | number:'1.0-0' }} millas
                  </div>
                </div>
                <div class="vehicle-actions">
                  @if (vehicle.isDefault) {
                    <ion-chip color="primary">Activo</ion-chip>
                  } @else {
                    <ion-button fill="clear" size="small" (click)="setDefaultVehicle(vehicle)">
                      Usar
                    </ion-button>
                  }
                  <ion-button fill="clear" size="small" (click)="editVehicle(vehicle)">
                    <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                  <ion-button fill="clear" size="small" color="danger" (click)="deleteVehicle(vehicle)">
                    <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </div>
            }
          } @else {
            <div class="empty-vehicles">
              <ion-icon name="car-outline"></ion-icon>
              <p>No hay vehículos registrados</p>
              <p class="hint">Agregar un vehículo es opcional</p>
            </div>
          }

          <ion-button expand="block" fill="outline" (click)="addVehicle()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Agregar Vehículo (Opcional)
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Configuración de Tracking -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="settings-outline"></ion-icon>
            Configuración de Tracking
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <!-- Auto-stop -->
            <ion-item>
              <ion-icon name="time-outline" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h3>Tiempo de Auto-Stop</h3>
                <p>Finalizar viaje después de estar detenido</p>
              </ion-label>
              <ion-select [(ngModel)]="autoStopMinutes" (ionChange)="saveAutoStopSetting()" interface="popover">
                <ion-select-option [value]="2">2 minutos</ion-select-option>
                <ion-select-option [value]="5">5 minutos</ion-select-option>
                <ion-select-option [value]="10">10 minutos</ion-select-option>
                <ion-select-option [value]="15">15 minutos</ion-select-option>
                <ion-select-option [value]="30">30 minutos</ion-select-option>
                <ion-select-option [value]="60">1 hora</ion-select-option>
                <ion-select-option [value]="0">Desactivado (manual)</ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Detección de conducción -->
            <ion-item>
              <ion-icon name="car-outline" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h3>Detectar Conducción</h3>
                <p>Preguntar si iniciar tracking al detectar movimiento</p>
              </ion-label>
              <ion-toggle [(ngModel)]="drivingDetectionEnabled" (ionChange)="saveDrivingDetectionSetting()"></ion-toggle>
            </ion-item>

            <!-- Propósito por defecto -->
            <ion-item>
              <ion-icon name="briefcase-outline" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h3>Propósito por Defecto</h3>
                <p>Para nuevos viajes</p>
              </ion-label>
              <ion-select [(ngModel)]="defaultPurpose" (ionChange)="saveDefaultPurpose()" interface="popover">
                <ion-select-option value="business">Negocios</ion-select-option>
                <ion-select-option value="medical">Médico</ion-select-option>
                <ion-select-option value="charity">Caridad</ion-select-option>
                <ion-select-option value="moving">Mudanza</ion-select-option>
                <ion-select-option value="personal">Personal</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Seguridad -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            Seguridad
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-icon name="finger-print-outline" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h3>Login Biométrico</h3>
                <p>Usar huella o Face ID</p>
              </ion-label>
              <ion-toggle [(ngModel)]="biometricEnabled" (ionChange)="toggleBiometric()"></ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Información -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="information-circle-outline"></ion-icon>
            Información
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>Tarifa IRS por Milla</ion-label>
              <ion-note slot="end">\${{ mileageRate }}/milla</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Versión de la App</ion-label>
              <ion-note slot="end">{{ appVersion }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Cerrar Sesión -->
      <ion-button expand="block" color="danger" fill="outline" (click)="logout()" class="logout-btn">
        <ion-icon name="log-out-outline" slot="start"></ion-icon>
        Cerrar Sesión
      </ion-button>
    </ion-content>
  `,
  styles: [`
    .profile-header {
      text-align: center;
      padding: 24px 16px;
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
      border-radius: 0 0 24px 24px;
      margin: -16px -16px 16px -16px;
      color: white;
    }

    .avatar-container {
      position: relative;
      display: inline-block;
      cursor: pointer;
    }

    .profile-avatar {
      width: 100px;
      height: 100px;
      border: 4px solid white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }

    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-edit-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      background: var(--ion-color-secondary);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }

    .avatar-edit-badge ion-icon {
      font-size: 16px;
      color: white;
    }

    .user-name {
      margin: 16px 0 4px 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .user-email {
      margin: 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }

    ion-card {
      margin: 16px 0;
      border-radius: 16px;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
    }

    ion-card-title ion-icon {
      color: var(--ion-color-primary);
    }

    /* Vehículos */
    .vehicle-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 12px;
      margin-bottom: 12px;
      border: 2px solid transparent;
      flex-wrap: wrap;
    }

    .vehicle-card.default {
      border-color: var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.05);
    }

    .vehicle-photo {
      width: 60px;
      height: 60px;
      min-width: 60px;
      border-radius: 12px;
      background: var(--ion-color-medium-tint);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      cursor: pointer;
    }

    .vehicle-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .vehicle-photo > ion-icon {
      font-size: 28px;
      color: var(--ion-color-medium);
    }

    .vehicle-photo .photo-edit {
      position: absolute;
      bottom: 0;
      right: 0;
      background: rgba(0,0,0,0.6);
      padding: 3px;
      border-radius: 4px 0 0 0;
    }

    .vehicle-photo .photo-edit ion-icon {
      font-size: 12px;
      color: white;
    }

    .vehicle-info {
      flex: 1;
      min-width: 120px;
    }

    .vehicle-plate {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--ion-color-dark);
    }

    .vehicle-details {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
    }

    .vehicle-mileage {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: var(--ion-color-primary);
      margin-top: 4px;
    }

    .vehicle-mileage ion-icon {
      font-size: 14px;
    }

    .vehicle-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .vehicle-actions ion-chip {
      margin: 0;
      font-size: 0.7rem;
      height: 24px;
    }

    .empty-vehicles {
      text-align: center;
      padding: 24px;
      color: var(--ion-color-medium);
    }

    .empty-vehicles ion-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .empty-vehicles .hint {
      font-size: 0.8rem;
      font-style: italic;
    }

    .logout-btn {
      margin: 24px 0;
    }

    ion-item h3 {
      font-weight: 600;
      color: var(--ion-color-dark) !important;
    }

    ion-item p {
      font-size: 0.8rem;
      color: var(--ion-color-medium) !important;
    }
  `]
})
export class ProfilePage implements OnInit {
  private authService = inject(AuthService);
  private gpsService = inject(GpsTrackingService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private actionSheetController = inject(ActionSheetController);
  private loadingController = inject(LoadingController);

  user: User | null = null;
  profilePhoto: string | null = null;
  defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzFhMzY1ZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE4IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0yMCA4NWMwLTIwIDEzLTMwIDMwLTMwczMwIDEwIDMwIDMwIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==';
  
  vehicles: Vehicle[] = [];
  
  autoStopMinutes: number = 5;
  drivingDetectionEnabled: boolean = true;
  defaultPurpose: string = 'business';
  biometricEnabled: boolean = false;
  
  mileageRate = environment.app.mileageRate;
  appVersion = environment.app.version;

  constructor() {
    addIcons({
      personOutline, carOutline, settingsOutline, logOutOutline,
      cameraOutline, createOutline, trashOutline, addOutline,
      speedometerOutline, timeOutline, locationOutline, shieldCheckmarkOutline,
      fingerPrintOutline, informationCircleOutline, briefcaseOutline, imageOutline,
      chevronForwardOutline, checkmarkOutline, closeOutline
    });
  }

  async ngOnInit() {
    await this.loadUserData();
    await this.loadSettings();
    await this.loadVehicles();
  }

  async loadUserData() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
    
    const { value } = await Preferences.get({ key: 'profilePhoto' });
    if (value) {
      this.profilePhoto = value;
    }
  }

  async loadSettings() {
    try {
      const autoStop = await Preferences.get({ key: 'autoStopMinutes' });
      if (autoStop.value) {
        this.autoStopMinutes = parseInt(autoStop.value, 10);
      }

      const drivingDetection = await Preferences.get({ key: 'drivingDetectionEnabled' });
      this.drivingDetectionEnabled = drivingDetection.value !== 'false';

      const purpose = await Preferences.get({ key: 'defaultPurpose' });
      if (purpose.value) {
        this.defaultPurpose = purpose.value;
      }

      const biometric = await Preferences.get({ key: 'biometricEnabled' });
      this.biometricEnabled = biometric.value === 'true';
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  }

  async loadVehicles() {
    try {
      const { value } = await Preferences.get({ key: 'vehicles' });
      if (value) {
        this.vehicles = JSON.parse(value);
      }
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    }
  }

  async saveVehicles() {
    await Preferences.set({
      key: 'vehicles',
      value: JSON.stringify(this.vehicles)
    });
  }

  // ===========================================
  // FOTO DE PERFIL
  // ===========================================

  async changeProfilePhoto() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Cambiar Foto de Perfil',
      buttons: [
        {
          text: 'Tomar Foto',
          icon: 'camera-outline',
          handler: () => this.takePhoto('profile')
        },
        {
          text: 'Elegir de Galería',
          icon: 'image-outline',
          handler: () => this.pickFromGallery('profile')
        },
        {
          text: 'Cancelar',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePhoto(type: 'profile' | 'vehicle', vehicle?: Vehicle) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      const imageData = `data:image/jpeg;base64,${image.base64String}`;
      
      if (type === 'profile') {
        this.profilePhoto = imageData;
        await Preferences.set({ key: 'profilePhoto', value: imageData });
        this.showToast('Foto de perfil actualizada');
      } else if (vehicle) {
        vehicle.photo = imageData;
        await this.saveVehicles();
        this.showToast('Foto del vehículo actualizada');
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
    }
  }

  async pickFromGallery(type: 'profile' | 'vehicle', vehicle?: Vehicle) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos
      });

      const imageData = `data:image/jpeg;base64,${image.base64String}`;
      
      if (type === 'profile') {
        this.profilePhoto = imageData;
        await Preferences.set({ key: 'profilePhoto', value: imageData });
        this.showToast('Foto de perfil actualizada');
      } else if (vehicle) {
        vehicle.photo = imageData;
        await this.saveVehicles();
        this.showToast('Foto del vehículo actualizada');
      }
    } catch (error) {
      console.error('Error seleccionando foto:', error);
    }
  }

  // ===========================================
  // VEHÍCULOS
  // ===========================================

  async addVehicle() {
    const alert = await this.alertController.create({
      header: 'Agregar Vehículo',
      message: 'Todos los campos son opcionales excepto la matrícula',
      inputs: [
        { name: 'plate', type: 'text', placeholder: 'Matrícula/Placa *' },
        { name: 'make', type: 'text', placeholder: 'Marca (ej: Toyota)' },
        { name: 'model', type: 'text', placeholder: 'Modelo (ej: Camry)' },
        { name: 'year', type: 'number', placeholder: 'Año (ej: 2020)' },
        { name: 'currentMileage', type: 'number', placeholder: 'Millaje actual' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (data) => {
            if (!data.plate || data.plate.trim() === '') {
              this.showToast('La matrícula es requerida', 'warning');
              return false;
            }
            
            const newVehicle: Vehicle = {
              id: `vehicle_${Date.now()}`,
              plate: data.plate.trim().toUpperCase(),
              make: data.make?.trim() || undefined,
              model: data.model?.trim() || undefined,
              year: data.year ? parseInt(data.year, 10) : undefined,
              currentMileage: data.currentMileage ? parseInt(data.currentMileage, 10) : 0,
              lastUpdated: new Date().toISOString(),
              isDefault: this.vehicles.length === 0
            };
            
            this.vehicles.push(newVehicle);
            this.saveVehicles();
            this.showToast('Vehículo agregado');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editVehicle(vehicle: Vehicle) {
    const alert = await this.alertController.create({
      header: 'Editar Vehículo',
      inputs: [
        { name: 'plate', type: 'text', placeholder: 'Matrícula/Placa', value: vehicle.plate },
        { name: 'make', type: 'text', placeholder: 'Marca', value: vehicle.make || '' },
        { name: 'model', type: 'text', placeholder: 'Modelo', value: vehicle.model || '' },
        { name: 'year', type: 'number', placeholder: 'Año', value: vehicle.year?.toString() || '' },
        { name: 'currentMileage', type: 'number', placeholder: 'Millaje actual', value: vehicle.currentMileage?.toString() || '0' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            if (!data.plate || data.plate.trim() === '') {
              this.showToast('La matrícula es requerida', 'warning');
              return false;
            }
            
            vehicle.plate = data.plate.trim().toUpperCase();
            vehicle.make = data.make?.trim() || undefined;
            vehicle.model = data.model?.trim() || undefined;
            vehicle.year = data.year ? parseInt(data.year, 10) : undefined;
            vehicle.currentMileage = data.currentMileage ? parseInt(data.currentMileage, 10) : 0;
            vehicle.lastUpdated = new Date().toISOString();
            
            this.saveVehicles();
            this.showToast('Vehículo actualizado');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteVehicle(vehicle: Vehicle) {
    const alert = await this.alertController.create({
      header: 'Eliminar Vehículo',
      message: `¿Estás seguro de eliminar el vehículo ${vehicle.plate}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.vehicles = this.vehicles.filter(v => v.id !== vehicle.id);
            if (vehicle.isDefault && this.vehicles.length > 0) {
              this.vehicles[0].isDefault = true;
            }
            this.saveVehicles();
            this.showToast('Vehículo eliminado');
          }
        }
      ]
    });
    await alert.present();
  }

  async setDefaultVehicle(vehicle: Vehicle) {
    this.vehicles.forEach(v => v.isDefault = false);
    vehicle.isDefault = true;
    await this.saveVehicles();
    this.showToast(`${vehicle.plate} es ahora el vehículo activo`);
  }

  async changeVehiclePhoto(vehicle: Vehicle) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Foto del Vehículo',
      buttons: [
        { text: 'Tomar Foto', icon: 'camera-outline', handler: () => this.takePhoto('vehicle', vehicle) },
        { text: 'Elegir de Galería', icon: 'image-outline', handler: () => this.pickFromGallery('vehicle', vehicle) },
        { text: 'Cancelar', icon: 'close-outline', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  // ===========================================
  // CONFIGURACIÓN
  // ===========================================

  async saveAutoStopSetting() {
    await Preferences.set({ key: 'autoStopMinutes', value: this.autoStopMinutes.toString() });
    this.gpsService.setAutoStopMinutes(this.autoStopMinutes);
    
    if (this.autoStopMinutes === 0) {
      this.showToast('Auto-stop desactivado (solo manual)');
    } else {
      this.showToast(`Auto-stop: ${this.autoStopMinutes} minutos`);
    }
  }

  async saveDrivingDetectionSetting() {
    await Preferences.set({ key: 'drivingDetectionEnabled', value: this.drivingDetectionEnabled.toString() });
    
    if (this.drivingDetectionEnabled) {
      this.gpsService.startDrivingDetection();
      this.showToast('Detección de conducción activada');
    } else {
      this.gpsService.stopDrivingDetection();
      this.showToast('Detección de conducción desactivada');
    }
  }

  async saveDefaultPurpose() {
    await Preferences.set({ key: 'defaultPurpose', value: this.defaultPurpose });
  }

  async toggleBiometric() {
    await Preferences.set({ key: 'biometricEnabled', value: this.biometricEnabled.toString() });
    this.showToast(this.biometricEnabled ? 'Login biométrico activado' : 'Login biométrico desactivado');
  }

  // ===========================================
  // UTILIDADES
  // ===========================================

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar Sesión', role: 'destructive', handler: () => this.authService.logout() }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({ message, duration: 2000, position: 'bottom', color });
    await toast.present();
  }
}
