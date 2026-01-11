/**
 * TaxPro Mileage - Servicio de Trips (Recorridos)
 * =================================================
 * Este servicio maneja todas las operaciones relacionadas
 * con los recorridos:
 * - CRUD de recorridos
 * - Sincronización con la API
 * - Estadísticas
 * - Filtrado y búsqueda
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';

import { environment } from '../../environments/environment';
import {
  Trip,
  TripFilters,
  FinishTripData,
  CreateTripData,
  UserStatistics,
  DailyMileage,
  MonthlyMileage,
  ApiResponse,
  PaginatedResponse
} from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private http = inject(HttpClient);

  // Cache de viajes
  private tripsCache = new BehaviorSubject<Trip[]>([]);
  public trips$ = this.tripsCache.asObservable();

  // Estadísticas
  private statisticsSubject = new BehaviorSubject<UserStatistics | null>(null);
  public statistics$ = this.statisticsSubject.asObservable();

  // Estado de carga
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor() {
    // Cargar trips desde cache local al iniciar
    this.loadTripsFromCache();
  }

  // ===========================================
  // CRUD DE TRIPS
  // ===========================================

  /**
   * Obtiene todos los trips del usuario
   */
  getTrips(filters?: TripFilters): Observable<Trip[]> {
    this.loadingSubject.next(true);

    let params = new HttpParams();
    
    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.purpose) params = params.set('purpose', filters.purpose);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    }

    const url = `${environment.apiUrl}${environment.endpoints.trips}`;

    return this.http.get<PaginatedResponse<Trip>>(url, { params }).pipe(
      tap(response => {
        if (response.success) {
          // Actualizar cache
          this.tripsCache.next(response.data);
          this.saveTripsToCache(response.data);
        }
      }),
      map(response => response.data),
      catchError(error => {
        console.error('❌ Error obteniendo trips:', error);
        // Retornar datos del cache si hay error
        return of(this.tripsCache.value);
      }),
      tap(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Obtiene un trip por su ID
   */
  getTripById(id: string): Observable<Trip | null> {
    // Primero buscar en cache
    const cachedTrip = this.tripsCache.value.find(t => t.id === id);
    
    const url = `${environment.apiUrl}${environment.endpoints.tripById.replace(':id', id)}`;

    return this.http.get<ApiResponse<Trip>>(url).pipe(
      map(response => response.success ? response.data : null),
      catchError(error => {
        console.error('❌ Error obteniendo trip:', error);
        return of(cachedTrip || null);
      })
    );
  }

  /**
   * Obtiene trips por rango de fechas
   */
  getTripsByDateRange(startDate: string, endDate: string): Observable<Trip[]> {
    this.loadingSubject.next(true);

    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    const url = `${environment.apiUrl}${environment.endpoints.tripsByDateRange}`;

    return this.http.get<ApiResponse<Trip[]>>(url, { params }).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ Error obteniendo trips por fecha:', error);
        // Filtrar desde cache
        return of(this.filterTripsFromCache(startDate, endDate));
      }),
      tap(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Crea un nuevo trip (cuando inicia el tracking)
   */
  createTrip(data: CreateTripData): Observable<Trip> {
    const url = `${environment.apiUrl}${environment.endpoints.trips}`;

    const tripData = {
      startLocation: data.startLocation,
      purpose: data.purpose || 'business',
      notes: data.notes || '',
      startTime: new Date().toISOString(),
      status: 'in_progress'
    };

    return this.http.post<ApiResponse<Trip>>(url, tripData).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      tap(trip => {
        console.log('✅ Trip creado:', trip.id);
      }),
      catchError(error => {
        console.error('❌ Error creando trip:', error);
        throw error;
      })
    );
  }

  /**
   * Finaliza un trip y envía todos los datos
   * ESTE ES EL MÉTODO QUE ENVÍA LOS DATOS A LA API
   */
  finishTrip(data: FinishTripData): Observable<Trip> {
    console.log('📤 Enviando datos del recorrido a la API...');

    const url = `${environment.apiUrl}${environment.endpoints.mileageLog}`;

    // Preparar los datos para la API
    // NOTA: Ajusta estos campos según la estructura que espera tu API
    const payload = {
      tripId: data.tripId,
      endTime: new Date().toISOString(),
      endLocation: {
        latitude: data.endLocation.latitude,
        longitude: data.endLocation.longitude,
        altitude: data.endLocation.altitude,
        accuracy: data.endLocation.accuracy
      },
      route: data.route.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
        alt: point.altitude,
        timestamp: point.timestamp,
        speed: point.speed,
        accuracy: point.accuracy
      })),
      statistics: {
        distanceMiles: data.distanceMiles,
        distanceKm: data.distanceKm,
        durationSeconds: data.durationSeconds,
        averageSpeedMph: data.averageSpeedMph,
        maxSpeedMph: data.maxSpeedMph
      },
      status: 'completed'
    };

    if (environment.debug.logApi) {
      console.log('📦 Payload a enviar:', JSON.stringify(payload, null, 2));
    }

    return this.http.post<ApiResponse<Trip>>(url, payload).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      tap(trip => {
        console.log('✅ Recorrido guardado exitosamente:', trip.id);
        console.log(`📊 Distancia: ${data.distanceMiles.toFixed(2)} millas`);
        console.log(`⏱️ Duración: ${Math.floor(data.durationSeconds / 60)} minutos`);
        
        // Actualizar cache local
        this.addTripToCache(trip);
        
        // Refrescar estadísticas
        this.refreshStatistics();
      }),
      catchError(error => {
        console.error('❌ Error enviando datos a la API:', error);
        
        // Guardar localmente para sincronizar después
        this.savePendingTrip(data);
        
        throw error;
      })
    );
  }

  /**
   * Actualiza un trip existente
   */
  updateTrip(id: string, updates: Partial<Trip>): Observable<Trip> {
    const url = `${environment.apiUrl}${environment.endpoints.tripById.replace(':id', id)}`;

    return this.http.put<ApiResponse<Trip>>(url, updates).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      tap(trip => {
        this.updateTripInCache(trip);
      }),
      catchError(error => {
        console.error('❌ Error actualizando trip:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un trip
   */
  deleteTrip(id: string): Observable<boolean> {
    const url = `${environment.apiUrl}${environment.endpoints.tripById.replace(':id', id)}`;

    return this.http.delete<ApiResponse<void>>(url).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          this.removeTripFromCache(id);
        }
      }),
      catchError(error => {
        console.error('❌ Error eliminando trip:', error);
        return of(false);
      })
    );
  }

  // ===========================================
  // ESTADÍSTICAS
  // ===========================================

  /**
   * Obtiene las estadísticas del usuario
   */
  getStatistics(): Observable<UserStatistics> {
    const url = `${environment.apiUrl}${environment.endpoints.tripStatistics}`;

    return this.http.get<ApiResponse<UserStatistics>>(url).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      tap(stats => {
        this.statisticsSubject.next(stats);
        this.saveStatisticsToCache(stats);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo estadísticas:', error);
        // Retornar estadísticas del cache o calculadas localmente
        return from(this.getStatisticsFromCache());
      })
    );
  }

  /**
   * Obtiene millas diarias para el gráfico
   */
  getDailyMileage(days: number = 30): Observable<DailyMileage[]> {
    const url = `${environment.apiUrl}${environment.endpoints.mileageSummary}`;
    const params = new HttpParams().set('days', days.toString());

    return this.http.get<ApiResponse<DailyMileage[]>>(url, { params }).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ Error obteniendo millas diarias:', error);
        return of(this.calculateDailyMileageFromCache(days));
      })
    );
  }

  /**
   * Refresca las estadísticas
   */
  refreshStatistics(): void {
    this.getStatistics().subscribe();
  }

  // ===========================================
  // CACHE LOCAL
  // ===========================================

  /**
   * Carga trips desde el almacenamiento local
   */
  private async loadTripsFromCache(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'trips_cache' });
      if (value) {
        const trips = JSON.parse(value);
        this.tripsCache.next(trips);
      }
    } catch (error) {
      console.error('❌ Error cargando cache de trips:', error);
    }
  }

  /**
   * Guarda trips en el almacenamiento local
   */
  private async saveTripsToCache(trips: Trip[]): Promise<void> {
    try {
      await Preferences.set({
        key: 'trips_cache',
        value: JSON.stringify(trips)
      });
    } catch (error) {
      console.error('❌ Error guardando cache de trips:', error);
    }
  }

  /**
   * Agrega un trip al cache
   */
  private addTripToCache(trip: Trip): void {
    const currentTrips = this.tripsCache.value;
    const updatedTrips = [trip, ...currentTrips];
    this.tripsCache.next(updatedTrips);
    this.saveTripsToCache(updatedTrips);
  }

  /**
   * Actualiza un trip en el cache
   */
  private updateTripInCache(trip: Trip): void {
    const currentTrips = this.tripsCache.value;
    const index = currentTrips.findIndex(t => t.id === trip.id);
    
    if (index !== -1) {
      currentTrips[index] = trip;
      this.tripsCache.next([...currentTrips]);
      this.saveTripsToCache(currentTrips);
    }
  }

  /**
   * Elimina un trip del cache
   */
  private removeTripFromCache(id: string): void {
    const currentTrips = this.tripsCache.value;
    const filteredTrips = currentTrips.filter(t => t.id !== id);
    this.tripsCache.next(filteredTrips);
    this.saveTripsToCache(filteredTrips);
  }

  /**
   * Filtra trips del cache por rango de fechas
   */
  private filterTripsFromCache(startDate: string, endDate: string): Trip[] {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return this.tripsCache.value.filter(trip => {
      const tripDate = new Date(trip.startTime).getTime();
      return tripDate >= start && tripDate <= end;
    });
  }

  /**
   * Guarda estadísticas en cache
   */
  private async saveStatisticsToCache(stats: UserStatistics): Promise<void> {
    try {
      await Preferences.set({
        key: 'statistics_cache',
        value: JSON.stringify(stats)
      });
    } catch (error) {
      console.error('❌ Error guardando estadísticas:', error);
    }
  }

  /**
   * Obtiene estadísticas del cache o calcula desde trips
   */
  private async getStatisticsFromCache(): Promise<UserStatistics> {
    try {
      const { value } = await Preferences.get({ key: 'statistics_cache' });
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del cache:', error);
    }

    // Calcular desde trips locales
    return this.calculateStatisticsFromTrips();
  }

  /**
   * Calcula estadísticas desde los trips en cache
   */
  private calculateStatisticsFromTrips(): UserStatistics {
    const trips = this.tripsCache.value;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const totalMiles = trips.reduce((sum, t) => sum + t.distanceMiles, 0);
    const totalDuration = trips.reduce((sum, t) => sum + t.durationSeconds, 0);

    const tripsThisWeek = trips.filter(t => new Date(t.startTime) >= weekAgo);
    const tripsThisMonth = trips.filter(t => new Date(t.startTime) >= monthAgo);
    const tripsThisYear = trips.filter(t => new Date(t.startTime) >= yearAgo);

    const milesByPurpose = {
      business: trips.filter(t => t.purpose === 'business').reduce((sum, t) => sum + t.distanceMiles, 0),
      medical: trips.filter(t => t.purpose === 'medical').reduce((sum, t) => sum + t.distanceMiles, 0),
      charity: trips.filter(t => t.purpose === 'charity').reduce((sum, t) => sum + t.distanceMiles, 0),
      moving: trips.filter(t => t.purpose === 'moving').reduce((sum, t) => sum + t.distanceMiles, 0),
      personal: trips.filter(t => t.purpose === 'personal').reduce((sum, t) => sum + t.distanceMiles, 0),
    };

    return {
      totalTrips: trips.length,
      totalMiles,
      totalKilometers: totalMiles * 1.60934,
      totalDurationSeconds: totalDuration,
      totalDeductionAmount: totalMiles * environment.app.mileageRate,
      tripsThisWeek: tripsThisWeek.length,
      milesThisWeek: tripsThisWeek.reduce((sum, t) => sum + t.distanceMiles, 0),
      tripsThisMonth: tripsThisMonth.length,
      milesThisMonth: tripsThisMonth.reduce((sum, t) => sum + t.distanceMiles, 0),
      tripsThisYear: tripsThisYear.length,
      milesThisYear: tripsThisYear.reduce((sum, t) => sum + t.distanceMiles, 0),
      averageTripMiles: trips.length > 0 ? totalMiles / trips.length : 0,
      averageTripDuration: trips.length > 0 ? totalDuration / trips.length : 0,
      averageTripsPerWeek: trips.length > 0 ? trips.length / 52 : 0,
      milesByPurpose
    };
  }

  /**
   * Calcula millas diarias desde cache
   */
  private calculateDailyMileageFromCache(days: number): DailyMileage[] {
    const trips = this.tripsCache.value;
    const result: DailyMileage[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTrips = trips.filter(t => 
        t.startTime.split('T')[0] === dateStr
      );
      
      result.push({
        date: dateStr,
        miles: dayTrips.reduce((sum, t) => sum + t.distanceMiles, 0),
        trips: dayTrips.length
      });
    }
    
    return result;
  }

  // ===========================================
  // SINCRONIZACIÓN DE TRIPS PENDIENTES
  // ===========================================

  /**
   * Guarda un trip pendiente de sincronización
   */
  private async savePendingTrip(data: FinishTripData): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'pending_trips' });
      const pendingTrips = value ? JSON.parse(value) : [];
      
      pendingTrips.push({
        ...data,
        savedAt: new Date().toISOString()
      });
      
      await Preferences.set({
        key: 'pending_trips',
        value: JSON.stringify(pendingTrips)
      });
      
      console.log('💾 Trip guardado para sincronización posterior');
    } catch (error) {
      console.error('❌ Error guardando trip pendiente:', error);
    }
  }

  /**
   * Sincroniza trips pendientes
   */
  async syncPendingTrips(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'pending_trips' });
      
      if (!value) return;
      
      const pendingTrips = JSON.parse(value);
      
      if (pendingTrips.length === 0) return;
      
      console.log(`🔄 Sincronizando ${pendingTrips.length} trips pendientes...`);
      
      const successfullySync: number[] = [];
      
      for (let i = 0; i < pendingTrips.length; i++) {
        try {
          await this.finishTrip(pendingTrips[i]).toPromise();
          successfullySync.push(i);
        } catch (error) {
          console.error(`❌ Error sincronizando trip ${i}:`, error);
        }
      }
      
      // Eliminar los sincronizados exitosamente
   const remainingTrips = pendingTrips.filter((_: any, index: number) =>
        !successfullySync.includes(index)
      );
      
      await Preferences.set({
        key: 'pending_trips',
        value: JSON.stringify(remainingTrips)
      });
      
      console.log(`✅ ${successfullySync.length} trips sincronizados`);
      
    } catch (error) {
      console.error('❌ Error sincronizando trips pendientes:', error);
    }
  }

  // ===========================================
  // GETTERS
  // ===========================================

  /**
   * Obtiene los trips recientes (últimos 10)
   */
  getRecentTrips(): Trip[] {
    return this.tripsCache.value.slice(0, 10);
  }

  /**
   * Obtiene las estadísticas actuales
   */
  getCurrentStatistics(): UserStatistics | null {
    return this.statisticsSubject.value;
  }
}
