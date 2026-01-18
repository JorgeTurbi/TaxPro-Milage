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

import { CustomerAuthService } from '../../services/customer-auth.service';
import { GpsTrackingService } from '../../services/gps-tracking.service';
import { User, Vehicle } from '../../models/interfaces';
import { ICustomerProfile } from '../../models/customer-login.interface';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { CustomerTokenService } from '../../services/customer-token.service';

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
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePage implements OnInit {
  private authService = inject(CustomerAuthService);
  private gpsService = inject(GpsTrackingService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private actionSheetController = inject(ActionSheetController);
  private loadingController = inject(LoadingController);
  private router = inject(Router);  
 private customerTokenService = inject(CustomerTokenService);
  user: ICustomerProfile | null = null;
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
    this.authService.currentCustomer$.subscribe((customer: ICustomerProfile | null) => {
      this.user = customer;
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

      // Cargar estado real del biométrico desde el servicio
      this.biometricEnabled = await this.authService.isBiometricLoginEnabled();
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
    try {
      // Usar el servicio de autenticación para manejar la biometría correctamente
      await this.authService.setBiometricLoginEnabled(this.biometricEnabled);
      await Preferences.set({ key: 'biometricEnabled', value: this.biometricEnabled.toString() });
      this.showToast(this.biometricEnabled ? 'Login biométrico activado' : 'Login biométrico desactivado');
    } catch (error) {
      console.error('Error configurando biometría:', error);
      this.biometricEnabled = !this.biometricEnabled; // Revertir cambio
      this.showToast('Error al configurar login biométrico', 'danger');
    }
  }

  // ===========================================
  // UTILIDADES
  // ===========================================

  async logout() {
    const currentCustomer = this.authService.currentCustomerSubject.value;
                  const customerName = currentCustomer
     ? `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim()
     : this.customerTokenService.getCustomerDisplayNameFromToken();
 
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar Sesión', role: 'destructive', handler: () => this.authService.logout().subscribe({
          next: async (item:boolean) => {  
            if(item){
    await this.router.navigate(['/login'], { replaceUrl: true });
            }           
          
          },
          error: async (error) => {
            console.error('Error cerrando sesión:', error);
            await this.showToast('Error cerrando sesión', 'danger');
          },
          complete: () => {
        this.customerTokenService.removeTokens();        
        this.authService .currentCustomerSubject.next(null);

       const keysToRemove = Object.keys(localStorage).filter((key) =>
         key.startsWith('customer_') ||
         key.includes('chat_') ||
          key.includes('webrtc_') ||
         key.includes('TokenCloud')
       );
        keysToRemove.forEach((key) => localStorage.removeItem(key));
  }, 
        }) }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({ message, duration: 2000, position: 'bottom', color });
    await toast.present();
  }
}
