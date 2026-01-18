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
    IonSpinner, IonToast
  ],
  templateUrl: './tracking.page.html',
  styleUrl: './tracking.page.scss'
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
  private drivingDetectionSubscription?: Subscription;

  // Detección de movimiento
  showDrivingPrompt = signal(false);

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

    // Suscribirse a la detección de conducción
    this.drivingDetectionSubscription = this.gpsTrackingService.drivingDetected$.subscribe(
      async (isDetected) => {
        if (isDetected && !this.trackingState()?.isTracking) {
          console.log('🚗 Conducción detectada, mostrando prompt...');
          await this.showDrivingDetectedAlert();
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
    if (this.drivingDetectionSubscription) {
      this.drivingDetectionSubscription.unsubscribe();
    }
  }

  /**
   * Muestra alerta cuando se detecta conducción
   */
  async showDrivingDetectedAlert() {
    const alert = await this.alertController.create({
      header: '🚗 ¡Movimiento Detectado!',
      message: 'Parece que estás conduciendo. ¿Deseas iniciar el tracking de millas?',
      cssClass: 'driving-detected-alert',
      backdropDismiss: false,
      buttons: [
        {
          text: 'No, gracias',
          role: 'cancel',
          handler: () => {
            console.log('Usuario rechazó iniciar tracking');
          }
        },
        {
          text: 'Sí, iniciar',
          handler: () => {
            // Mostrar selector de propósito
            this.showPurposeSelectorForAutoStart();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Muestra selector de propósito para inicio automático
   */
  async showPurposeSelectorForAutoStart() {
    const alert = await this.alertController.create({
      header: 'Selecciona el Propósito',
      message: '¿Cuál es el propósito de este viaje?',
      inputs: [
        {
          name: 'purpose',
          type: 'radio',
          label: 'Negocios',
          value: 'business',
          checked: true
        },
        {
          name: 'purpose',
          type: 'radio',
          label: 'Médico',
          value: 'medical'
        },
        {
          name: 'purpose',
          type: 'radio',
          label: 'Caridad',
          value: 'charity'
        },
        {
          name: 'purpose',
          type: 'radio',
          label: 'Mudanza',
          value: 'moving'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Iniciar',
          handler: async (purpose) => {
            if (purpose) {
              this.selectedPurpose.set(purpose);
              await this.startTracking();
            }
          }
        }
      ]
    });

    await alert.present();
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
      // Obtener estado antes de detener para mostrar marcador de fin
      const stateBeforeStop = this.trackingState();

      await this.gpsTrackingService.stopTracking();

      // Añadir marcador de fin
      if (stateBeforeStop && stateBeforeStop.routePoints.length > 0) {
        const lastPoint = stateBeforeStop.routePoints[stateBeforeStop.routePoints.length - 1];
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

      // Reiniciar completamente el estado
      this.resetTrackingUI();

    } catch (error: any) {
      console.error('❌ Error deteniendo tracking:', error);
      this.showNotification(error.message || 'Error al finalizar el recorrido', 'danger');
    }
  }

  /**
   * Reinicia la UI del tracking completamente
   */
  private resetTrackingUI() {
    // Limpiar propósito seleccionado
    this.selectedPurpose.set(null);

    // Limpiar marcadores después de un tiempo para que el usuario vea el resultado
    setTimeout(() => {
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
    }, 3000);
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