/**
 * ============================================================
 * TRACKING PAGE - Página Principal de Seguimiento GPS
 * ============================================================
 * 
 * Esta página es el corazón de la aplicación. Aquí el usuario:
 * - Ve su ubicación actual en Google Maps
 * - Inicia/Pausa/Detiene el seguimiento de millas
 * - Ve en tiempo real la ruta que está recorriendo
 * - Observa estadísticas del viaje actual (distancia, tiempo, velocidad)
 * 
 * CARACTERÍSTICAS:
 * - Integración con Google Maps API
 * - Dibujo de polyline del recorrido en tiempo real
 * - Marcadores de inicio/fin del viaje
 * - Actualización automática de estadísticas
 * - Selector de propósito del viaje (negocio, médico, etc.)
 * - Detección automática de parada (auto-stop)
 */

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonBadge,
  IonFab, IonFabButton, IonFabList, IonSpinner, IonAlert, IonToast,
  IonActionSheet, IonChip, IonLabel, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  playOutline, pauseOutline, stopOutline, locationOutline, 
  navigateOutline, timeOutline, speedometerOutline, mapOutline,
  carSportOutline, briefcaseOutline, medkitOutline, heartOutline,
  homeOutline, ellipsisHorizontalOutline, refreshOutline, warningOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';

import { GpsTrackingService } from '../../services/gps-tracking.service';
import { TrackingState, TripPurpose, GpsPoint } from '../../models/interfaces';
import { environment } from '../../../environments/environment';

// Declaración de Google Maps (se carga desde script externo)
declare var google: any;

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon,
     IonBadge,
     IonSpinner, IonToast, IonChip, IonLabel
  ],
  template: `
    <!-- ============================================================
         HEADER - Barra superior con título y estado
         ============================================================ -->
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <ion-icon name="car-sport-outline" class="header-icon"></ion-icon>
          Tracking GPS
        </ion-title>
        
        <!-- Badge de estado del tracking -->
        <ion-badge slot="end" [color]="getStatusColor()" class="status-badge">
          {{ getStatusText() }}
        </ion-badge>
      </ion-toolbar>
    </ion-header>

    <ion-content class="tracking-content">
      
      <!-- ============================================================
           MAPA DE GOOGLE - Contenedor principal
           ============================================================ -->
      <div class="map-container">
        <!-- Elemento donde se renderiza Google Maps -->
        <div #mapElement class="map"></div>
        
        <!-- Overlay de carga mientras se inicializa el mapa -->
        @if (isLoadingMap()) {
          <div class="map-loading-overlay">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Cargando mapa...</p>
          </div>
        }
        
        <!-- Mensaje si no hay API key configurada -->
        @if (mapError()) {
          <div class="map-error-overlay">
            <ion-icon name="warning-outline" color="warning"></ion-icon>
            <p>{{ mapError() }}</p>
            <ion-button size="small" (click)="retryLoadMap()">
              <ion-icon name="refresh-outline" slot="start"></ion-icon>
              Reintentar
            </ion-button>
          </div>
        }
      </div>

      <!-- ============================================================
           PANEL DE ESTADÍSTICAS EN TIEMPO REAL
           ============================================================ -->
      <div class="stats-panel" [class.tracking-active]="trackingState()?.isTracking">
        
        <!-- Fila superior: Distancia y Tiempo -->
        <div class="stats-row">
          <!-- Distancia recorrida -->
          <div class="stat-item primary">
            <div class="stat-icon">
              <ion-icon name="navigate-outline"></ion-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatDistance(trackingState()?.currentDistance || 0) }}</span>
              <span class="stat-label">Millas</span>
            </div>
          </div>
          
          <!-- Tiempo transcurrido -->
          <div class="stat-item">
            <div class="stat-icon">
              <ion-icon name="time-outline"></ion-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatTime(trackingState()?.elapsedTime || 0) }}</span>
              <span class="stat-label">Tiempo</span>
            </div>
          </div>
          
          <!-- Velocidad actual -->
          <div class="stat-item">
            <div class="stat-icon">
              <ion-icon name="speedometer-outline"></ion-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatSpeed(trackingState()?.currentSpeed || 0) }}</span>
              <span class="stat-label">MPH</span>
            </div>
          </div>
        </div>

        <!-- Propósito del viaje (solo cuando está activo) -->
        @if (trackingState()?.isTracking && trackingState()?.currentTrip) {
          <div class="trip-purpose-display">
            <ion-chip [color]="getPurposeColor(trackingState()?.currentTrip?.purpose)">
              <ion-icon [name]="getPurposeIcon(trackingState()?.currentTrip?.purpose)"></ion-icon>
              <ion-label>{{ getPurposeLabel(trackingState()?.currentTrip?.purpose) }}</ion-label>
            </ion-chip>
          </div>
        }

        <!-- Estimación de deducción fiscal -->
        @if (trackingState()?.isTracking) {
          <div class="deduction-estimate">
            <span class="deduction-label">Deducción estimada:</span>
            <span class="deduction-value">\${{ calculateDeduction(trackingState()?.currentDistance || 0) }}</span>
          </div>
        }
      </div>

      <!-- ============================================================
           CONTROLES DE TRACKING
           ============================================================ -->
      <div class="controls-container">
        
        <!-- Estado: NO está trackeando - Mostrar botón de INICIAR -->
        @if (!trackingState()?.isTracking) {
          <div class="start-controls">
            <p class="instruction-text">Selecciona el propósito del viaje para comenzar:</p>
            
            <!-- Grid de propósitos -->
            <div class="purpose-grid">
              <button 
                class="purpose-btn" 
                [class.selected]="selectedPurpose() === 'business'"
                (click)="selectPurpose('business')">
                <ion-icon name="briefcase-outline"></ion-icon>
                <span>Negocios</span>
              </button>
              
              <button 
                class="purpose-btn"
                [class.selected]="selectedPurpose() === 'medical'"
                (click)="selectPurpose('medical')">
                <ion-icon name="medkit-outline"></ion-icon>
                <span>Médico</span>
              </button>
              
              <button 
                class="purpose-btn"
                [class.selected]="selectedPurpose() === 'charity'"
                (click)="selectPurpose('charity')">
                <ion-icon name="heart-outline"></ion-icon>
                <span>Caridad</span>
              </button>
              
              <button 
                class="purpose-btn"
                [class.selected]="selectedPurpose() === 'moving'"
                (click)="selectPurpose('moving')">
                <ion-icon name="home-outline"></ion-icon>
                <span>Mudanza</span>
              </button>
            </div>
            
            <!-- Botón grande de INICIAR -->
            <ion-button 
              expand="block" 
              size="large" 
              class="start-btn"
              [disabled]="!selectedPurpose() || isStartingTracking()"
              (click)="startTracking()">
              @if (isStartingTracking()) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
                Iniciando...
              } @else {
                <ion-icon name="play-outline" slot="start"></ion-icon>
                Iniciar Recorrido
              }
            </ion-button>
          </div>
        }
        
        <!-- Estado: ESTÁ trackeando - Mostrar controles de Pausar/Detener -->
        @if (trackingState()?.isTracking) {
          <div class="tracking-controls">
            
            <!-- Botón de PAUSAR / REANUDAR -->
            @if (!trackingState()?.isPaused) {
              <ion-button 
                fill="outline" 
                color="warning" 
                class="control-btn"
                (click)="pauseTracking()">
                <ion-icon name="pause-outline" slot="start"></ion-icon>
                Pausar
              </ion-button>
            } @else {
              <ion-button 
                fill="outline" 
                color="success" 
                class="control-btn"
                (click)="resumeTracking()">
                <ion-icon name="play-outline" slot="start"></ion-icon>
                Reanudar
              </ion-button>
            }
            
            <!-- Botón de DETENER -->
            <ion-button 
              fill="solid" 
              color="danger" 
              class="control-btn"
              (click)="confirmStopTracking()">
              <ion-icon name="stop-outline" slot="start"></ion-icon>
              Finalizar
            </ion-button>
          </div>
          
          <!-- Indicador de pausa -->
          @if (trackingState()?.isPaused) {
            <div class="pause-indicator">
              <ion-icon name="pause-outline"></ion-icon>
              <span>Tracking en pausa</span>
            </div>
          }
        }
      </div>

      <!-- ============================================================
           TOAST PARA NOTIFICACIONES
           ============================================================ -->
      <ion-toast
        [isOpen]="showToast()"
        [message]="toastMessage()"
        [duration]="3000"
        [color]="toastColor()"
        position="top"
        (didDismiss)="showToast.set(false)">
      </ion-toast>

    </ion-content>
  `,
  styles: [`
    /* ============================================================
       ESTILOS DEL HEADER
       ============================================================ */
    .header-icon {
      margin-right: 8px;
      vertical-align: middle;
    }

    .status-badge {
      margin-right: 16px;
      padding: 6px 12px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.7rem;
    }

    /* ============================================================
       CONTENEDOR DEL MAPA
       ============================================================ */
    .map-container {
      position: relative;
      height: 45vh;
      min-height: 300px;
      width: 100%;
      background: var(--ion-color-light);
    }

    .map {
      width: 100%;
      height: 100%;
    }

    .map-loading-overlay,
    .map-error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.95);
      z-index: 10;
    }

    .map-loading-overlay p,
    .map-error-overlay p {
      margin-top: 16px;
      color: var(--ion-color-medium);
      font-size: 0.9rem;
    }

    .map-error-overlay ion-icon {
      font-size: 48px;
    }

    /* ============================================================
       PANEL DE ESTADÍSTICAS
       ============================================================ */
    .stats-panel {
      background: white;
      padding: 16px;
      border-radius: 20px 20px 0 0;
      margin-top: -20px;
      position: relative;
      z-index: 5;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .stats-panel.tracking-active {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-top: 3px solid var(--ion-color-success);
    }

    .stats-row {
      display: flex;
      justify-content: space-around;
      gap: 12px;
    }

    .stat-item {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 12px;
      gap: 10px;
    }

    .stat-item.primary {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      color: white;
    }

    .stat-item.primary .stat-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--ion-color-primary-tint);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ion-color-primary);
      font-size: 1.2rem;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.3rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.7rem;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-item.primary .stat-label {
      color: rgba(255, 255, 255, 0.8);
    }

    /* Propósito del viaje */
    .trip-purpose-display {
      display: flex;
      justify-content: center;
      margin-top: 12px;
    }

    /* Estimación de deducción */
    .deduction-estimate {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 8px 16px;
      background: rgba(56, 161, 105, 0.1);
      border-radius: 8px;
    }

    .deduction-label {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }

    .deduction-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ion-color-success);
    }

    /* ============================================================
       CONTROLES DE TRACKING
       ============================================================ */
    .controls-container {
      padding: 16px;
      background: white;
    }

    .instruction-text {
      text-align: center;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
      font-size: 0.9rem;
    }

    /* Grid de propósitos */
    .purpose-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .purpose-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px 8px;
      background: var(--ion-color-light);
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .purpose-btn ion-icon {
      font-size: 1.5rem;
      color: var(--ion-color-medium);
      margin-bottom: 4px;
    }

    .purpose-btn span {
      font-size: 0.7rem;
      color: var(--ion-color-medium);
      text-align: center;
    }

    .purpose-btn.selected {
      background: var(--ion-color-primary-tint);
      border-color: var(--ion-color-primary);
    }

    .purpose-btn.selected ion-icon,
    .purpose-btn.selected span {
      color: var(--ion-color-primary);
    }

    /* Botón de inicio */
    .start-btn {
      --border-radius: 12px;
      height: 56px;
      font-weight: 600;
      font-size: 1.1rem;
    }

    /* Controles durante tracking */
    .tracking-controls {
      display: flex;
      gap: 12px;
    }

    .control-btn {
      flex: 1;
      --border-radius: 12px;
      height: 50px;
      font-weight: 600;
    }

    /* Indicador de pausa */
    .pause-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
      padding: 10px;
      background: var(--ion-color-warning-tint);
      border-radius: 8px;
      color: var(--ion-color-warning-shade);
      font-weight: 500;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* ============================================================
       RESPONSIVE
       ============================================================ */
    @media (max-width: 380px) {
      .purpose-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .stat-value {
        font-size: 1.1rem;
      }
    }
  `]
})
export class TrackingPage implements OnInit, OnDestroy {
  // Referencias del DOM
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef;
  
  // Estado del mapa
  isLoadingMap = signal(true);
  mapError = signal<string | null>(null);
  
  // Estado del tracking (viene del servicio)
  trackingState = signal<TrackingState | null>(null);
  
  // Propósito seleccionado
  selectedPurpose = signal<TripPurpose | null>(null);
  
  // Estados de UI
  isStartingTracking = signal(false);
  
  // Toast notifications
  showToast = signal(false);
  toastMessage = signal('');
  toastColor = signal('primary');
  
  // Google Maps objects
  private map: any = null;
  private currentPositionMarker: any = null;
  private startMarker: any = null;
  private endMarker: any = null;
  private routePolyline: any = null;
  
  // Subscriptions
  private trackingSubscription?: Subscription;
  
  constructor(
    private gpsTrackingService: GpsTrackingService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    // Registrar iconos de Ionicons
    addIcons({
      playOutline, pauseOutline, stopOutline, locationOutline,
      navigateOutline, timeOutline, speedometerOutline, mapOutline,
      carSportOutline, briefcaseOutline, medkitOutline, heartOutline,
      homeOutline, ellipsisHorizontalOutline, refreshOutline, warningOutline
    });
  }

  async ngOnInit() {
    console.log('🗺️ TrackingPage: Inicializando...');
    
    // Suscribirse al estado del tracking
    this.trackingSubscription = this.gpsTrackingService.trackingState$.subscribe(
      state => {
        console.log('📍 Estado de tracking actualizado:', state);
        this.trackingState.set(state);
        
        // Actualizar el mapa con la nueva posición
        if (state.routePoints.length > 0) {
          this.updateMapWithRoute(state.routePoints);
        }
      }
    );
    
    // Cargar Google Maps
    await this.loadGoogleMaps();
  }

  ngOnDestroy() {
    // Limpiar subscripciones
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
  }

  /**
   * ============================================================
   * CARGA DE GOOGLE MAPS
   * ============================================================
   * Carga dinámicamente el script de Google Maps y luego
   * inicializa el mapa centrado en la ubicación del usuario.
   */
  private async loadGoogleMaps() {
    console.log('🗺️ Cargando Google Maps...');
    this.isLoadingMap.set(true);
    this.mapError.set(null);
    
    const apiKey = environment.googleMapsApiKey;
    
    // Verificar si hay API key configurada
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      this.mapError.set('API Key de Google Maps no configurada. Configúrala en environment.ts');
      this.isLoadingMap.set(false);
      return;
    }
    
    try {
      // Verificar si Google Maps ya está cargado
      if (typeof google !== 'undefined' && google.maps) {
        await this.initializeMap();
        return;
      }
      
      // Cargar script de Google Maps dinámicamente
      await this.loadGoogleMapsScript(apiKey);
      await this.initializeMap();
      
    } catch (error) {
      console.error('❌ Error cargando Google Maps:', error);
      this.mapError.set('Error al cargar el mapa. Verifica tu conexión a internet.');
      this.isLoadingMap.set(false);
    }
  }

  /**
   * Carga el script de Google Maps de forma dinámica
   */
  private loadGoogleMapsScript(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si ya existe el script
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ Script de Google Maps cargado');
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('No se pudo cargar el script de Google Maps'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Inicializa el mapa de Google centrado en la ubicación del usuario
   */
  private async initializeMap() {
    try {
      // Obtener ubicación actual del usuario
      const position = await this.getCurrentPosition();
      
      // Configuración del mapa
      const mapOptions = {
        center: { lat: position.latitude, lng: position.longitude },
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: this.getMapStyles()
      };
      
      // Crear el mapa
      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
      
      // Crear marcador de posición actual
      this.currentPositionMarker = new google.maps.Marker({
        position: { lat: position.latitude, lng: position.longitude },
        map: this.map,
        title: 'Tu ubicación',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3182ce',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });
      
      // Crear polyline para la ruta (vacía inicialmente)
      this.routePolyline = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#1a365d',
        strokeOpacity: 1.0,
        strokeWeight: 4
      });
      this.routePolyline.setMap(this.map);
      
      console.log('✅ Mapa inicializado correctamente');
      this.isLoadingMap.set(false);
      
    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
      this.mapError.set('No se pudo obtener tu ubicación. Verifica los permisos de GPS.');
      this.isLoadingMap.set(false);
    }
  }

  /**
   * Obtiene la posición actual del usuario usando el servicio de GPS
   */
  private getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        reject(new Error('Geolocalización no soportada'));
      }
    });
  }

  /**
   * Estilos personalizados para el mapa (tema TaxPro)
   */
  private getMapStyles() {
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }

  /**
   * Reintentar cargar el mapa
   */
  retryLoadMap() {
    this.loadGoogleMaps();
  }

  /**
   * ============================================================
   * ACTUALIZACIÓN DEL MAPA CON LA RUTA
   * ============================================================
   */
  private updateMapWithRoute(routePoints: GpsPoint[]) {
    if (!this.map || !this.routePolyline || routePoints.length === 0) return;
    
    // Convertir puntos a formato Google Maps
    const path = routePoints.map(point => ({
      lat: point.latitude,
      lng: point.longitude
    }));
    
    // Actualizar polyline
    this.routePolyline.setPath(path);
    
    // Mover marcador de posición actual al último punto
    const lastPoint = path[path.length - 1];
    if (this.currentPositionMarker) {
      this.currentPositionMarker.setPosition(lastPoint);
    }
    
    // Centrar mapa en la posición actual
    this.map.panTo(lastPoint);
    
    // Añadir marcador de inicio si es el primer punto
    if (path.length === 1 && !this.startMarker) {
      this.startMarker = new google.maps.Marker({
        position: path[0],
        map: this.map,
        title: 'Inicio del recorrido',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#38a169"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">A</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32)
        }
      });
    }
  }

  /**
   * ============================================================
   * CONTROLES DE TRACKING
   * ============================================================
   */
  
  /**
   * Seleccionar propósito del viaje
   */
  selectPurpose(purpose: TripPurpose) {
    this.selectedPurpose.set(purpose);
    console.log('🎯 Propósito seleccionado:', purpose);
  }

  /**
   * Iniciar tracking
   */
  async startTracking() {
    const purpose = this.selectedPurpose();
    if (!purpose) {
      this.showNotification('Selecciona un propósito para el viaje', 'warning');
      return;
    }
    
    this.isStartingTracking.set(true);
    
    try {
      await this.gpsTrackingService.startTracking(purpose);
      this.showNotification('¡Tracking iniciado! Buen viaje 🚗', 'success');
      
      // Limpiar marcadores anteriores
      if (this.startMarker) {
        this.startMarker.setMap(null);
        this.startMarker = null;
      }
      if (this.endMarker) {
        this.endMarker.setMap(null);
        this.endMarker = null;
      }
      if (this.routePolyline) {
        this.routePolyline.setPath([]);
      }
      
    } catch (error: any) {
      console.error('❌ Error iniciando tracking:', error);
      this.showNotification(error.message || 'Error al iniciar el tracking', 'danger');
    } finally {
      this.isStartingTracking.set(false);
    }
  }

  /**
   * Pausar tracking
   */
  pauseTracking() {
    this.gpsTrackingService.pauseTracking();
    this.showNotification('Tracking pausado', 'warning');
  }

  /**
   * Reanudar tracking
   */
  resumeTracking() {
    this.gpsTrackingService.resumeTracking();
    this.showNotification('Tracking reanudado', 'success');
  }

  /**
   * Confirmar detención del tracking
   */
  async confirmStopTracking() {
    const alert = await this.alertController.create({
      header: 'Finalizar Recorrido',
      message: '¿Estás seguro de que deseas finalizar este recorrido? Los datos se guardarán automáticamente.',
      cssClass: 'taxpro-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Finalizar',
          role: 'confirm',
          handler: () => this.stopTracking()
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Detener tracking
   */
  async stopTracking() {
    try {
      await this.gpsTrackingService.stopTracking();
      
      // Añadir marcador de fin
      const state = this.trackingState();
      if (state && state.routePoints.length > 0) {
        const lastPoint = state.routePoints[state.routePoints.length - 1];
        this.endMarker = new google.maps.Marker({
          position: { lat: lastPoint.latitude, lng: lastPoint.longitude },
          map: this.map,
          title: 'Fin del recorrido',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#e53e3e"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">B</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32)
          }
        });
      }
      
      this.showNotification('¡Recorrido finalizado y guardado! ✅', 'success');
      this.selectedPurpose.set(null);
      
    } catch (error: any) {
      console.error('❌ Error deteniendo tracking:', error);
      this.showNotification(error.message || 'Error al finalizar el recorrido', 'danger');
    }
  }

  /**
   * ============================================================
   * FUNCIONES DE FORMATO Y UTILIDAD
   * ============================================================
   */
  
  formatDistance(miles: number): string {
    return miles.toFixed(2);
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatSpeed(metersPerSecond: number): string {
    // Convertir m/s a MPH
    const mph = metersPerSecond * 2.237;
    return mph.toFixed(0);
  }

  calculateDeduction(miles: number): string {
    const rate = environment.app.mileageRate;
    return (miles * rate).toFixed(2);
  }

  getStatusColor(): string {
    const state = this.trackingState();
    if (!state?.isTracking) return 'medium';
    if (state.isPaused) return 'warning';
    return 'success';
  }

  getStatusText(): string {
    const state = this.trackingState();
    if (!state?.isTracking) return 'Inactivo';
    if (state.isPaused) return 'Pausado';
    return 'Activo';
  }

  getPurposeIcon(purpose?: TripPurpose): string {
    const icons: Record<TripPurpose, string> = {
      business: 'briefcase-outline',
      medical: 'medkit-outline',
      charity: 'heart-outline',
      moving: 'home-outline',
      personal: 'car-sport-outline'
    };
    return icons[purpose || 'personal'];
  }

  getPurposeLabel(purpose?: TripPurpose): string {
    const labels: Record<TripPurpose, string> = {
      business: 'Negocios',
      medical: 'Médico',
      charity: 'Caridad',
      moving: 'Mudanza',
      personal: 'Personal'
    };
    return labels[purpose || 'personal'];
  }

  getPurposeColor(purpose?: TripPurpose): string {
    const colors: Record<TripPurpose, string> = {
      business: 'primary',
      medical: 'danger',
      charity: 'tertiary',
      moving: 'secondary',
      personal: 'medium'
    };
    return colors[purpose || 'personal'];
  }

  /**
   * Mostrar notificación toast
   */
  private showNotification(message: string, color: string = 'primary') {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.showToast.set(true);
  }
}