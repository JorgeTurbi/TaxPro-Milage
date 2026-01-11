/**
 * TaxPro Mileage - Página de Detalle del Viaje
 * =============================================
 * Esta página muestra todos los detalles de un viaje específico:
 * - Mapa con la ruta completa dibujada
 * - Estadísticas detalladas (distancia, tiempo, velocidades)
 * - Información de puntos de inicio y fin
 * - Opción de editar propósito y notas
 * - Compartir el viaje
 * - Eliminar el viaje
 */

import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonChip,
  IonSpinner,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonGrid,
  IonRow,
  IonCol,
  AlertController,
  ToastController,
  LoadingController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  flagOutline,
  timeOutline,
  speedometerOutline,
  navigateOutline,
  calendarOutline,
  cashOutline,
  createOutline,
  trashOutline,
  shareOutline,
  carOutline,
  analyticsOutline,
  chevronBackOutline,
  checkmarkOutline,
  closeOutline,
  mapOutline,
  ellipsisVertical,
  alertCircleOutline
} from 'ionicons/icons';

import { TripService } from '../../services/trip.service';
import { Trip, TripPurpose, GpsPoint } from '../../models/interfaces';
import { Share } from '@capacitor/share';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { environment } from '../../../environments/environment';

// Declaración global para Google Maps
declare const google: any;

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButton,
    IonChip,
    IonSpinner,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonGrid,
    IonRow,
    IonCol
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/history" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Detalle del Viaje</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showActions()" [disabled]="!trip">
            <ion-icon name="ellipsis-vertical"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Cargando viaje...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !isLoading" class="error-container">
        <ion-icon name="alert-circle-outline" color="danger"></ion-icon>
        <h3>Error al cargar</h3>
        <p>{{ error }}</p>
        <ion-button fill="outline" (click)="loadTrip()">
          Reintentar
        </ion-button>
      </div>

      <!-- Trip Content -->
      <div *ngIf="trip && !isLoading" class="trip-content">
        <!-- Mapa con Ruta -->
        <div class="map-container">
          <div #mapElement class="map"></div>
          <div *ngIf="!mapLoaded" class="map-placeholder">
            <ion-icon name="map-outline"></ion-icon>
            <p>Cargando mapa...</p>
          </div>
        </div>

        <!-- Resumen Principal -->
        <ion-card class="summary-card">
          <ion-card-content>
            <div class="summary-header">
              <ion-chip [color]="getPurposeColor(trip.purpose)">
                {{ getPurposeLabel(trip.purpose) }}
              </ion-chip>
              <span class="trip-date">
                {{ formatDate(trip.startTime) }}
              </span>
            </div>

            <div class="main-stats">
              <div class="stat-item primary">
                <span class="stat-value">{{ trip.distanceMiles | number:'1.2-2' }}</span>
                <span class="stat-label">millas</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-value">{{ formatDurationShort(trip.durationSeconds) }}</span>
                <span class="stat-label">duración</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item highlight">
                <span class="stat-value">\${{ calculateDeduction() | number:'1.2-2' }}</span>
                <span class="stat-label">deducción</span>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Detalles de la Ruta -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="navigate-outline"></ion-icon>
              Ruta
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="route-points">
              <div class="route-point start">
                <div class="point-marker start"></div>
                <div class="point-info">
                  <span class="point-label">Inicio</span>
                  <span class="point-time">{{ formatTime(trip.startTime) }}</span>
                  <span class="point-address" *ngIf="startAddress">{{ startAddress }}</span>
                </div>
              </div>
              
              <div class="route-line"></div>
              
              <div class="route-point end">
                <div class="point-marker end"></div>
                <div class="point-info">
                  <span class="point-label">Fin</span>
                  <span class="point-time">{{ formatTime(trip.endTime) }}</span>
                  <span class="point-address" *ngIf="endAddress">{{ endAddress }}</span>
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Estadísticas Detalladas -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="analytics-outline"></ion-icon>
              Estadísticas
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="6">
                  <div class="detail-stat">
                    <ion-icon name="speedometer-outline" color="primary"></ion-icon>
                    <div class="detail-info">
                      <span class="detail-value">{{ trip.averageSpeedMph || 0 | number:'1.1-1' }} mph</span>
                      <span class="detail-label">Velocidad promedio</span>
                    </div>
                  </div>
                </ion-col>
                <ion-col size="6">
                  <div class="detail-stat">
                    <ion-icon name="speedometer-outline" color="danger"></ion-icon>
                    <div class="detail-info">
                      <span class="detail-value">{{ trip.maxSpeedMph || 0 | number:'1.1-1' }} mph</span>
                      <span class="detail-label">Velocidad máxima</span>
                    </div>
                  </div>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col size="6">
                  <div class="detail-stat">
                    <ion-icon name="location-outline" color="secondary"></ion-icon>
                    <div class="detail-info">
                      <span class="detail-value">{{ (trip.route || []).length }}</span>
                      <span class="detail-label">Puntos GPS</span>
                    </div>
                  </div>
                </ion-col>
                <ion-col size="6">
                  <div class="detail-stat">
                    <ion-icon name="navigate-outline" color="tertiary"></ion-icon>
                    <div class="detail-info">
                      <span class="detail-value">{{ (trip.distanceMiles * 1.60934) | number:'1.2-2' }} km</span>
                      <span class="detail-label">Distancia (km)</span>
                    </div>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>

        <!-- Editar Propósito -->
        <ion-card *ngIf="isEditing">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="create-outline"></ion-icon>
              Editar Viaje
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-label position="stacked">Propósito</ion-label>
                <ion-select [(ngModel)]="editPurpose" interface="popover">
                  <ion-select-option value="business">Negocios</ion-select-option>
                  <ion-select-option value="medical">Médico</ion-select-option>
                  <ion-select-option value="charity">Caridad</ion-select-option>
                  <ion-select-option value="moving">Mudanza</ion-select-option>
                  <ion-select-option value="personal">Personal</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-label position="stacked">Notas</ion-label>
                <ion-textarea 
                  [(ngModel)]="editNotes" 
                  placeholder="Agregar notas sobre este viaje..."
                  [rows]="3">
                </ion-textarea>
              </ion-item>
            </ion-list>
            <div class="edit-actions">
              <ion-button fill="outline" (click)="cancelEdit()">
                <ion-icon name="close-outline" slot="start"></ion-icon>
                Cancelar
              </ion-button>
              <ion-button (click)="saveChanges()" [disabled]="isSaving">
                <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                {{ isSaving ? 'Guardando...' : 'Guardar' }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Acciones Rápidas -->
        <div class="quick-actions" *ngIf="!isEditing">
          <ion-button fill="outline" (click)="startEdit()">
            <ion-icon name="create-outline" slot="start"></ion-icon>
            Editar
          </ion-button>
          <ion-button fill="outline" (click)="shareTrip()">
            <ion-icon name="share-outline" slot="start"></ion-icon>
            Compartir
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      padding: 20px;
    }

    .error-container ion-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .error-container h3 {
      margin: 0 0 8px 0;
      color: var(--ion-color-dark);
    }

    .error-container p {
      color: var(--ion-color-medium);
      margin-bottom: 20px;
    }

    .trip-content {
      padding-bottom: 40px;
    }

    /* Mapa */
    .map-container {
      width: 100%;
      height: 250px;
      position: relative;
      background: var(--ion-color-light);
    }

    .map {
      width: 100%;
      height: 100%;
    }

    .map-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-light);
    }

    .map-placeholder ion-icon {
      font-size: 48px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .map-placeholder p {
      color: var(--ion-color-medium);
      margin: 0;
    }

    /* Summary Card */
    .summary-card {
      margin: -30px 16px 16px 16px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      position: relative;
      z-index: 10;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .trip-date {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }

    .main-stats {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }

    .stat-item {
      text-align: center;
      flex: 1;
    }

    .stat-item.primary .stat-value {
      color: var(--ion-color-primary);
      font-size: 2rem;
    }

    .stat-item.highlight .stat-value {
      color: var(--ion-color-success);
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ion-color-dark);
    }

    .stat-label {
      display: block;
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      margin-top: 4px;
    }

    .stat-divider {
      width: 1px;
      height: 40px;
      background: var(--ion-color-light);
    }

    /* Cards */
    ion-card {
      margin: 16px;
      border-radius: 12px;
    }

    ion-card-header {
      padding-bottom: 8px;
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

    /* Route Points */
    .route-points {
      position: relative;
      padding-left: 30px;
    }

    .route-point {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      position: relative;
    }

    .point-marker {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      position: absolute;
      left: -30px;
      top: 16px;
    }

    .point-marker.start {
      background: var(--ion-color-success);
      box-shadow: 0 0 0 4px rgba(56, 161, 105, 0.2);
    }

    .point-marker.end {
      background: var(--ion-color-danger);
      box-shadow: 0 0 0 4px rgba(229, 62, 62, 0.2);
    }

    .route-line {
      position: absolute;
      left: -23px;
      top: 32px;
      bottom: 32px;
      width: 2px;
      background: linear-gradient(to bottom, var(--ion-color-success), var(--ion-color-danger));
    }

    .point-info {
      display: flex;
      flex-direction: column;
    }

    .point-label {
      font-weight: 600;
      color: var(--ion-color-dark);
    }

    .point-time {
      font-size: 0.9rem;
      color: var(--ion-color-primary);
      margin: 2px 0;
    }

    .point-address {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }

    /* Detail Stats */
    .detail-stat {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 12px;
      margin-bottom: 8px;
    }

    .detail-stat ion-icon {
      font-size: 28px;
    }

    .detail-info {
      display: flex;
      flex-direction: column;
    }

    .detail-value {
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--ion-color-dark);
    }

    .detail-label {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }

    /* Edit Actions */
    .edit-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .edit-actions ion-button {
      flex: 1;
    }

    /* Quick Actions */
    .quick-actions {
      display: flex;
      gap: 12px;
      padding: 0 16px;
      margin-top: 8px;
    }

    .quick-actions ion-button {
      flex: 1;
      --border-radius: 12px;
    }
  `]
})
export class TripDetailPage implements OnInit, AfterViewInit {
  // Servicios
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tripService = inject(TripService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private actionSheetController = inject(ActionSheetController);

  // Referencia al elemento del mapa
  @ViewChild('mapElement') mapElement!: ElementRef;

  // Datos del viaje
  trip: Trip | null = null;
  tripId: string = '';

  // Estados
  isLoading = true;
  error: string | null = null;
  mapLoaded = false;
  isEditing = false;
  isSaving = false;

  // Datos de edición
  editPurpose: TripPurpose = 'business';
  editNotes: string = '';

  // Direcciones
  startAddress: string = '';
  endAddress: string = '';

  // Tarifa por milla (desde environment.app.mileageRate)
  private mileageRate = environment.app.mileageRate;

  // Google Maps
  private map: any;
  private routeLine: any;

  constructor() {
    addIcons({
      locationOutline,
      flagOutline,
      timeOutline,
      speedometerOutline,
      navigateOutline,
      calendarOutline,
      cashOutline,
      createOutline,
      trashOutline,
      shareOutline,
      carOutline,
      analyticsOutline,
      chevronBackOutline,
      checkmarkOutline,
      closeOutline,
      mapOutline,
      ellipsisVertical,
      alertCircleOutline
    });
  }

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id') || '';
    
    if (this.tripId) {
      this.loadTrip();
    } else {
      this.error = 'ID de viaje no válido';
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {}

  async loadTrip(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      this.trip = await this.tripService.getTripById(this.tripId).toPromise() || null;
      
      if (this.trip) {
        this.editPurpose = this.trip.purpose;
        this.editNotes = this.trip.notes || '';
        setTimeout(() => this.initMap(), 100);
      } else {
        this.error = 'Viaje no encontrado';
      }
    } catch (err: any) {
      console.error('Error cargando viaje:', err);
      this.error = err.message || 'Error al cargar el viaje';
    } finally {
      this.isLoading = false;
    }
  }

  private initMap(): void {
    if (!this.trip?.route || this.trip.route.length === 0) {
      console.log('No hay ruta para mostrar');
      return;
    }

    try {
      if (typeof google === 'undefined' || !google.maps) {
        console.warn('Google Maps no está disponible');
        return;
      }

      const route = this.trip.route;
      const startPoint = route[0];
      const endPoint = route[route.length - 1];

      const bounds = new google.maps.LatLngBounds();
      route.forEach((point: GpsPoint) => {
        bounds.extend({ lat: point.latitude, lng: point.longitude });
      });

      this.map = new google.maps.Map(this.mapElement.nativeElement, {
        center: bounds.getCenter(),
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        styles: this.getMapStyles()
      });

      this.map.fitBounds(bounds, { padding: 50 });

      const routePath = route.map((point: GpsPoint) => ({
        lat: point.latitude,
        lng: point.longitude
      }));

      this.routeLine = new google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#3182ce',
        strokeOpacity: 1.0,
        strokeWeight: 4
      });

      this.routeLine.setMap(this.map);

      new google.maps.Marker({
        position: { lat: startPoint.latitude, lng: startPoint.longitude },
        map: this.map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#38a169',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        title: 'Inicio'
      });

      new google.maps.Marker({
        position: { lat: endPoint.latitude, lng: endPoint.longitude },
        map: this.map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#e53e3e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        title: 'Fin'
      });

      this.mapLoaded = true;

      this.getAddressFromCoords(startPoint.latitude, startPoint.longitude, 'start');
      this.getAddressFromCoords(endPoint.latitude, endPoint.longitude, 'end');

    } catch (error) {
      console.error('Error inicializando mapa:', error);
    }
  }

  private async getAddressFromCoords(lat: number, lng: number, type: 'start' | 'end'): Promise<void> {
    if (typeof google === 'undefined' || !google.maps) return;

    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address;
        if (type === 'start') {
          this.startAddress = address;
        } else {
          this.endAddress = address;
        }
      }
    });
  }

  private getMapStyles(): any[] {
    return [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] }
    ];
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), "EEEE, d 'de' MMMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  }

  formatTime(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return '';
    }
  }

  formatDurationShort(seconds: number | undefined): string {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  calculateDeduction(): number {
    if (!this.trip?.distanceMiles) return 0;
    return this.trip.distanceMiles * this.mileageRate;
  }

  getPurposeLabel(purpose: TripPurpose | undefined): string {
    const labels: Record<TripPurpose, string> = {
      business: 'Negocios',
      medical: 'Médico',
      charity: 'Caridad',
      moving: 'Mudanza',
      personal: 'Personal'
    };
    return labels[purpose || 'personal'];
  }

  getPurposeColor(purpose: TripPurpose | undefined): string {
    const colors: Record<TripPurpose, string> = {
      business: 'primary',
      medical: 'danger',
      charity: 'success',
      moving: 'warning',
      personal: 'medium'
    };
    return colors[purpose || 'personal'];
  }

  async showActions(): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: 'Opciones',
      buttons: [
        { text: 'Editar', icon: 'create-outline', handler: () => this.startEdit() },
        { text: 'Compartir', icon: 'share-outline', handler: () => this.shareTrip() },
        { text: 'Eliminar', icon: 'trash-outline', role: 'destructive', handler: () => this.confirmDelete() },
        { text: 'Cancelar', icon: 'close-outline', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  startEdit(): void {
    if (this.trip) {
      this.editPurpose = this.trip.purpose;
      this.editNotes = this.trip.notes || '';
      this.isEditing = true;
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  async saveChanges(): Promise<void> {
    if (!this.trip) return;
    this.isSaving = true;

    try {
      await this.tripService.updateTrip(this.trip.id, {
        purpose: this.editPurpose,
        notes: this.editNotes
      }).toPromise();

      this.trip.purpose = this.editPurpose;
      this.trip.notes = this.editNotes;
      this.isEditing = false;
      await this.showToast('Viaje actualizado');
    } catch (error: any) {
      console.error('Error guardando cambios:', error);
      await this.showToast('Error al guardar cambios', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async shareTrip(): Promise<void> {
    if (!this.trip) return;

    const deduction = this.calculateDeduction();
    const text = `📍 TaxPro Mileage - Resumen de Viaje

📅 Fecha: ${this.formatDate(this.trip.startTime)}
🚗 Distancia: ${this.trip.distanceMiles.toFixed(2)} millas
⏱️ Duración: ${this.formatDurationShort(this.trip.durationSeconds)}
🏷️ Propósito: ${this.getPurposeLabel(this.trip.purpose)}
💰 Deducción estimada: $${deduction.toFixed(2)}

Registrado con TaxPro Mileage`;

    try {
      await Share.share({ title: 'Resumen de Viaje', text: text, dialogTitle: 'Compartir viaje' });
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar Viaje',
      message: '¿Estás seguro de que deseas eliminar este viaje? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => this.deleteTrip() }
      ]
    });
    await alert.present();
  }

  async deleteTrip(): Promise<void> {
    if (!this.trip) return;

    const loading = await this.loadingController.create({ message: 'Eliminando viaje...' });
    await loading.present();

    try {
      await this.tripService.deleteTrip(this.trip.id).toPromise();
      await loading.dismiss();
      await this.showToast('Viaje eliminado');
      this.router.navigate(['/tabs/history'], { replaceUrl: true });
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error eliminando viaje:', error);
      await this.showToast('Error al eliminar el viaje', 'danger');
    }
  }

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