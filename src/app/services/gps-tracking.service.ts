/**
 * TaxPro Mileage - Servicio de GPS y Tracking
 * =============================================
 * Este servicio maneja toda la lógica de tracking GPS:
 * - Obtención de ubicación en tiempo real
 * - Cálculo de distancia recorrida
 * - Detección automática de parada del vehículo
 * - Almacenamiento temporal de rutas
 * - Sincronización con el servidor
 * 
 * IMPORTANTE: Este es el servicio más crítico de la aplicación.
 */

import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, Subscription } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

import { environment } from '../../environments/environment';
import { 
  GpsPoint, 
  TrackingState, 
  Trip, 
  TripPurpose,
  CreateTripData,
  FinishTripData 
} from '../models/interfaces';
import { TripService } from './trip.service';

@Injectable({
  providedIn: 'root'
})
export class GpsTrackingService {
  private tripService = inject(TripService);
  private ngZone = inject(NgZone);

  // Estado del tracking
  private trackingStateSubject = new BehaviorSubject<TrackingState>({
    isTracking: false,
    isPaused: false,
    routePoints: [],
    elapsedTime: 0,
    currentDistance: 0,
    currentSpeed: 0
  });
  public trackingState$ = this.trackingStateSubject.asObservable();

  // ID del watcher de posición
  private watchId: string | null = null;
  
  // Suscripción al timer
  private timerSubscription: Subscription | null = null;
  
  // Subject para detener el tracking
  private stopTracking$ = new Subject<void>();
  
  // Timestamp de la última posición con movimiento
  private lastMovementTime: number = 0;
  
  // Timeout para detección automática de parada
  private autoStopTimeout: ReturnType<typeof setTimeout> | null = null;

  // Configuración
  private readonly config = environment.gpsConfig;

  constructor() {
    // Restaurar estado si había un tracking en curso
    this.restoreTrackingState();
  }

  // ===========================================
  // CONTROL DE TRACKING
  // ===========================================

  /**
   * Inicia el tracking de un nuevo recorrido
   * @param purpose Propósito del viaje (business, personal, etc.)
   */
  async startTracking(purpose: TripPurpose = 'business'): Promise<void> {
    console.log('🚗 Iniciando tracking GPS...');

    try {
      // Verificar y solicitar permisos
      await this.checkAndRequestPermissions();

      // Obtener posición inicial
      const initialPosition = await this.getCurrentPosition();
      
      if (!initialPosition) {
        throw new Error('No se pudo obtener la ubicación inicial');
      }

      const startPoint: GpsPoint = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
        altitude: initialPosition.coords.altitude ?? undefined,
        accuracy: initialPosition.coords.accuracy ?? undefined,
        speed: initialPosition.coords.speed ?? undefined,
        heading: initialPosition.coords.heading ?? undefined,
        timestamp: initialPosition.timestamp
      };

      // Crear el estado inicial del tracking
      const newState: TrackingState = {
        isTracking: true,
        isPaused: false,
        routePoints: [startPoint],
        currentPosition: startPoint,
        startTime: Date.now(),
        elapsedTime: 0,
        currentDistance: 0,
        currentSpeed: 0,
        lastUpdate: Date.now()
      };

      this.trackingStateSubject.next(newState);
      this.lastMovementTime = Date.now();

      // Iniciar el watcher de posición
      await this.startPositionWatcher();

      // Iniciar el timer
      this.startTimer();

      // Guardar estado temporal
      await this.saveTrackingState();

      console.log('✅ Tracking iniciado desde:', startPoint);

    } catch (error) {
      console.error('❌ Error iniciando tracking:', error);
      throw error;
    }
  }

  /**
   * Pausa el tracking actual
   */
  pauseTracking(): void {
    const currentState = this.trackingStateSubject.value;
    
    if (!currentState.isTracking || currentState.isPaused) {
      return;
    }

    console.log('⏸️ Pausando tracking...');
    
    this.trackingStateSubject.next({
      ...currentState,
      isPaused: true
    });

    // Detener el watcher temporalmente
    this.stopPositionWatcher();
    
    // Detener el timer
    this.stopTimer();
  }

  /**
   * Reanuda el tracking pausado
   */
  async resumeTracking(): Promise<void> {
    const currentState = this.trackingStateSubject.value;
    
    if (!currentState.isTracking || !currentState.isPaused) {
      return;
    }

    console.log('▶️ Reanudando tracking...');

    this.trackingStateSubject.next({
      ...currentState,
      isPaused: false
    });

    // Reiniciar el watcher
    await this.startPositionWatcher();
    
    // Reiniciar el timer
    this.startTimer();
    
    this.lastMovementTime = Date.now();
  }

  /**
   * Detiene el tracking y finaliza el recorrido
   * @param autoStopped Si fue detenido automáticamente
   */
  async stopTracking(autoStopped: boolean = false): Promise<Trip | null> {
    const currentState = this.trackingStateSubject.value;
    
    if (!currentState.isTracking) {
      return null;
    }

    console.log(autoStopped ? '🛑 Deteniendo tracking automáticamente...' : '🛑 Deteniendo tracking...');

    // Detener watchers y timers
    this.stopPositionWatcher();
    this.stopTimer();
    this.clearAutoStopTimeout();

    // Emitir señal de parada
    this.stopTracking$.next();

    try {
      // Obtener posición final
      const finalPosition = await this.getCurrentPosition();
      
      let endPoint: GpsPoint;
      
      if (finalPosition) {
        endPoint = {
          latitude: finalPosition.coords.latitude,
          longitude: finalPosition.coords.longitude,
          altitude: finalPosition.coords.altitude ?? undefined,
          accuracy: finalPosition.coords.accuracy ?? undefined,
          speed: finalPosition.coords.speed ?? undefined,
          heading: finalPosition.coords.heading ?? undefined,
          timestamp: finalPosition.timestamp
        };
      } else {
        // Usar la última posición conocida
        endPoint = currentState.routePoints[currentState.routePoints.length - 1];
      }

      // Preparar datos del viaje para enviar a la API
      const tripData: FinishTripData = {
        tripId: currentState.currentTrip?.id || this.generateTripId(),
        endLocation: endPoint,
        route: currentState.routePoints,
        distanceMiles: currentState.currentDistance,
        distanceKm: this.milesToKm(currentState.currentDistance),
        durationSeconds: currentState.elapsedTime,
        averageSpeedMph: this.calculateAverageSpeed(currentState.currentDistance, currentState.elapsedTime),
        maxSpeedMph: this.calculateMaxSpeed(currentState.routePoints)
      };

      // Enviar a la API
      const savedTrip = await this.tripService.finishTrip(tripData).toPromise();

      // Limpiar estado
      this.resetTrackingState();
      await this.clearSavedTrackingState();

      console.log('✅ Tracking finalizado. Distancia:', tripData.distanceMiles.toFixed(2), 'millas');

      return savedTrip || null;

    } catch (error) {
      console.error('❌ Error finalizando tracking:', error);
      
      // Guardar localmente para sincronizar después
      await this.saveTrackingForLaterSync(currentState);
      
      // Limpiar estado de todas formas
      this.resetTrackingState();
      
      throw error;
    }
  }

  /**
   * Cancela el tracking sin guardar
   */
  async cancelTracking(): Promise<void> {
    console.log('❌ Cancelando tracking...');
    
    this.stopPositionWatcher();
    this.stopTimer();
    this.clearAutoStopTimeout();
    this.stopTracking$.next();
    this.resetTrackingState();
    await this.clearSavedTrackingState();
  }

  // ===========================================
  // WATCHER DE POSICIÓN GPS
  // ===========================================

  /**
   * Inicia el watcher que escucha cambios de posición
   */
  private async startPositionWatcher(): Promise<void> {
    console.log('📍 Iniciando watcher de posición...');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    try {
      this.watchId = await Geolocation.watchPosition(options, (position, err) => {
        // Ejecutar dentro de la zona de Angular para detectar cambios
        this.ngZone.run(() => {
          if (err) {
            console.error('❌ Error en watcher GPS:', err);
            return;
          }

          if (position) {
            this.handlePositionUpdate(position);
          }
        });
      });

      console.log('✅ Watcher iniciado con ID:', this.watchId);

    } catch (error) {
      console.error('❌ Error iniciando watcher:', error);
      throw error;
    }
  }

  /**
   * Detiene el watcher de posición
   */
  private async stopPositionWatcher(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
      console.log('✅ Watcher detenido');
    }
  }

  /**
   * Maneja cada actualización de posición
   */
  private handlePositionUpdate(position: Position): void {
    const currentState = this.trackingStateSubject.value;
    
    if (!currentState.isTracking || currentState.isPaused) {
      return;
    }

    const newPoint: GpsPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude ?? undefined,
      accuracy: position.coords.accuracy ?? undefined,
      speed: position.coords.speed ?? undefined,
      heading: position.coords.heading ?? undefined,
      timestamp: position.timestamp
    };

    // Verificar precisión mínima
    if (newPoint.accuracy && newPoint.accuracy > this.config.minimumAccuracy) {
      if (environment.debug.logGps) {
        console.log('⚠️ Precisión insuficiente:', newPoint.accuracy, 'm');
      }
      return;
    }

    // Calcular distancia desde el último punto
    const lastPoint = currentState.routePoints[currentState.routePoints.length - 1];
    const distanceFromLast = this.calculateDistance(lastPoint, newPoint);

    // Solo agregar si hay movimiento significativo
    if (distanceFromLast < this.config.minimumDistance / 1609.34) { // Convertir metros a millas
      return;
    }

    // Calcular velocidad en mph
    const speedMph = (newPoint.speed || 0) * 2.237; // m/s a mph

    // Verificar si está en movimiento (en auto)
    if (speedMph >= this.config.minimumSpeedForDriving * 2.237) {
      this.lastMovementTime = Date.now();
      this.clearAutoStopTimeout();
    } else {
      // Iniciar contador de auto-stop si no hay movimiento
      this.startAutoStopTimer();
    }

    // Actualizar estado
    const updatedRoutePoints = [...currentState.routePoints, newPoint];
    const totalDistance = currentState.currentDistance + distanceFromLast;

    this.trackingStateSubject.next({
      ...currentState,
      routePoints: updatedRoutePoints,
      currentPosition: newPoint,
      currentDistance: totalDistance,
      currentSpeed: speedMph,
      lastUpdate: Date.now()
    });

    // Guardar estado temporal
    this.saveTrackingState();

    if (environment.debug.logGps) {
      console.log(`📍 Nueva posición - Dist: ${totalDistance.toFixed(2)} mi, Vel: ${speedMph.toFixed(1)} mph`);
    }
  }

  // ===========================================
  // DETECCIÓN AUTOMÁTICA DE PARADA
  // ===========================================

  /**
   * Inicia el timer para detección automática de parada
   */
  private startAutoStopTimer(): void {
    if (this.autoStopTimeout) {
      return; // Ya hay un timer activo
    }

    this.autoStopTimeout = setTimeout(() => {
      console.log('⏰ Timeout de inactividad alcanzado');
      this.handleAutoStop();
    }, this.config.stopTrackingTimeout);
  }

  /**
   * Cancela el timer de auto-stop
   */
  private clearAutoStopTimeout(): void {
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
  }

  /**
   * Maneja la parada automática del tracking
   */
  private async handleAutoStop(): Promise<void> {
    const currentState = this.trackingStateSubject.value;
    
    if (!currentState.isTracking) {
      return;
    }

    console.log('🚗💤 Detectada parada del vehículo. Finalizando tracking automáticamente...');

    try {
      await this.stopTracking(true);
    } catch (error) {
      console.error('❌ Error en auto-stop:', error);
    }
  }

  // ===========================================
  // TIMER Y TIEMPO TRANSCURRIDO
  // ===========================================

  /**
   * Inicia el timer que cuenta el tiempo transcurrido
   */
  private startTimer(): void {
    this.timerSubscription = interval(1000).pipe(
      takeUntil(this.stopTracking$)
    ).subscribe(() => {
      const currentState = this.trackingStateSubject.value;
      
      if (currentState.isTracking && !currentState.isPaused) {
        this.trackingStateSubject.next({
          ...currentState,
          elapsedTime: currentState.elapsedTime + 1
        });
      }
    });
  }

  /**
   * Detiene el timer
   */
  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  // ===========================================
  // CÁLCULOS Y UTILIDADES
  // ===========================================

  /**
   * Obtiene la posición actual del dispositivo
   */
  async getCurrentPosition(): Promise<Position | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return position;
    } catch (error) {
      console.error('❌ Error obteniendo posición:', error);
      return null;
    }
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * @returns Distancia en millas
   */
  calculateDistance(point1: GpsPoint, point2: GpsPoint): number {
    const R = 3959; // Radio de la Tierra en millas
    
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) * 
      Math.cos(this.toRad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convierte grados a radianes
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convierte millas a kilómetros
   */
  private milesToKm(miles: number): number {
    return miles * 1.60934;
  }

  /**
   * Calcula la velocidad promedio
   */
  private calculateAverageSpeed(miles: number, seconds: number): number {
    if (seconds === 0) return 0;
    return (miles / seconds) * 3600; // mph
  }

  /**
   * Calcula la velocidad máxima del recorrido
   */
  private calculateMaxSpeed(points: GpsPoint[]): number {
    let maxSpeed = 0;
    
    for (const point of points) {
      if (point.speed) {
        const speedMph = point.speed * 2.237;
        if (speedMph > maxSpeed) {
          maxSpeed = speedMph;
        }
      }
    }
    
    return maxSpeed;
  }

  /**
   * Genera un ID único para el trip
   */
  private generateTripId(): string {
    return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===========================================
  // PERMISOS
  // ===========================================

  /**
   * Verifica y solicita permisos de ubicación
   */
  async checkAndRequestPermissions(): Promise<boolean> {
    try {
      // Verificar permisos actuales
      let permissions = await Geolocation.checkPermissions();
      
      console.log('📍 Estado de permisos:', permissions.location);

      // Si no están concedidos, solicitarlos
      if (permissions.location !== 'granted') {
        permissions = await Geolocation.requestPermissions();
        
        if (permissions.location !== 'granted') {
          throw new Error('Permisos de ubicación denegados');
        }
      }

      console.log('✅ Permisos de ubicación concedidos');
      return true;

    } catch (error) {
      console.error('❌ Error con permisos:', error);
      throw error;
    }
  }

  // ===========================================
  // PERSISTENCIA DE ESTADO
  // ===========================================

  /**
   * Guarda el estado actual del tracking
   */
  private async saveTrackingState(): Promise<void> {
    const state = this.trackingStateSubject.value;
    
    await Preferences.set({
      key: environment.storage.tempTrackingKey,
      value: JSON.stringify(state)
    });
  }

  /**
   * Restaura el estado del tracking (si la app se cerró durante un tracking)
   */
  private async restoreTrackingState(): Promise<void> {
    try {
      const { value } = await Preferences.get({
        key: environment.storage.tempTrackingKey
      });

      if (value) {
        const savedState: TrackingState = JSON.parse(value);
        
        if (savedState.isTracking) {
          console.log('🔄 Restaurando tracking en progreso...');
          
          // Actualizar tiempo transcurrido
          if (savedState.startTime) {
            const elapsedSinceLastUpdate = Math.floor((Date.now() - (savedState.lastUpdate || savedState.startTime)) / 1000);
            savedState.elapsedTime += elapsedSinceLastUpdate;
          }
          
          savedState.isPaused = true; // Pausar hasta que el usuario decida continuar
          this.trackingStateSubject.next(savedState);
        }
      }
    } catch (error) {
      console.error('❌ Error restaurando estado:', error);
    }
  }

  /**
   * Limpia el estado guardado
   */
  private async clearSavedTrackingState(): Promise<void> {
    await Preferences.remove({
      key: environment.storage.tempTrackingKey
    });
  }

  /**
   * Guarda el tracking para sincronizar después (si falló el envío)
   */
  private async saveTrackingForLaterSync(state: TrackingState): Promise<void> {
    try {
      const pendingKey = `pending_trip_${Date.now()}`;
      await Preferences.set({
        key: pendingKey,
        value: JSON.stringify(state)
      });
      console.log('💾 Tracking guardado para sincronización posterior');
    } catch (error) {
      console.error('❌ Error guardando tracking pendiente:', error);
    }
  }

  /**
   * Resetea el estado del tracking
   */
  private resetTrackingState(): void {
    this.trackingStateSubject.next({
      isTracking: false,
      isPaused: false,
      routePoints: [],
      elapsedTime: 0,
      currentDistance: 0,
      currentSpeed: 0
    });
  }

  // ===========================================
  // GETTERS
  // ===========================================

  /**
   * Obtiene el estado actual del tracking
   */
  getCurrentState(): TrackingState {
    return this.trackingStateSubject.value;
  }

  /**
   * Verifica si hay un tracking activo
   */
  isTrackingActive(): boolean {
    return this.trackingStateSubject.value.isTracking;
  }
}
