/**
 * TaxPro Mileage - Servicio de Historial de Rutas
 * =================================================
 * Este servicio gestiona las rutas guardadas para:
 * - Almacenar rutas completadas con nombre opcional
 * - Sugerir rutas frecuentes antes de iniciar tracking
 * - Detectar rutas similares basándose en ubicación inicial
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

import { SavedRoute, GpsPoint, TripPurpose } from '../models/interfaces';

const STORAGE_KEY = 'saved_routes_history';
const MAX_SAVED_ROUTES = 20; // Máximo de rutas a guardar
const SIMILARITY_RADIUS_METERS = 500; // Radio para considerar rutas similares

@Injectable({
  providedIn: 'root'
})
export class RouteHistoryService {
  // Cache de rutas guardadas
  private savedRoutesSubject = new BehaviorSubject<SavedRoute[]>([]);
  public savedRoutes$ = this.savedRoutesSubject.asObservable();

  // Sugerencias basadas en ubicación actual
  private suggestionsSubject = new BehaviorSubject<SavedRoute[]>([]);
  public suggestions$ = this.suggestionsSubject.asObservable();

  constructor() {
    this.loadSavedRoutes();
  }

  /**
   * Carga las rutas guardadas desde el almacenamiento local
   */
  private async loadSavedRoutes(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const routes = JSON.parse(value);
        this.savedRoutesSubject.next(routes);
        console.log(`📍 ${routes.length} rutas guardadas cargadas`);
      }
    } catch (error) {
      console.error('❌ Error cargando rutas guardadas:', error);
    }
  }

  /**
   * Guarda una nueva ruta o actualiza una existente
   */
  async saveRoute(
    startLocation: GpsPoint,
    endLocation: GpsPoint,
    purpose: TripPurpose,
    distanceMiles: number,
    durationSeconds: number,
    routeName?: string,
    startAddress?: string,
    endAddress?: string
  ): Promise<SavedRoute> {
    const routes = this.savedRoutesSubject.value;

    // Buscar si ya existe una ruta similar
    const existingIndex = routes.findIndex(r =>
      this.isSimilarRoute(r.startLocation, r.endLocation, startLocation, endLocation)
    );

    let savedRoute: SavedRoute;

    if (existingIndex >= 0) {
      // Actualizar ruta existente
      const existing = routes[existingIndex];
      savedRoute = {
        ...existing,
        name: routeName || existing.name,
        timesUsed: existing.timesUsed + 1,
        lastUsed: new Date().toISOString(),
        // Actualizar promedio de duración
        averageDurationSeconds: Math.round(
          (existing.averageDurationSeconds * existing.timesUsed + durationSeconds) / (existing.timesUsed + 1)
        )
      };
      routes[existingIndex] = savedRoute;
    } else {
      // Crear nueva ruta
      savedRoute = {
        id: this.generateRouteId(),
        name: routeName,
        purpose,
        startLocation,
        endLocation,
        startAddress,
        endAddress,
        distanceMiles,
        averageDurationSeconds: durationSeconds,
        timesUsed: 1,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      routes.unshift(savedRoute);
    }

    // Limitar cantidad de rutas guardadas
    const limitedRoutes = routes.slice(0, MAX_SAVED_ROUTES);

    // Ordenar por uso reciente
    limitedRoutes.sort((a, b) =>
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );

    await this.persistRoutes(limitedRoutes);
    this.savedRoutesSubject.next(limitedRoutes);

    console.log(`✅ Ruta guardada: ${routeName || 'Sin nombre'}`);
    return savedRoute;
  }

  /**
   * Obtiene sugerencias de rutas basadas en la ubicación actual
   */
  async getSuggestions(currentLocation: GpsPoint): Promise<SavedRoute[]> {
    const routes = this.savedRoutesSubject.value;

    // Filtrar rutas que comienzan cerca de la ubicación actual
    const suggestions = routes.filter(route =>
      this.calculateDistanceMeters(currentLocation, route.startLocation) <= SIMILARITY_RADIUS_METERS
    );

    // Ordenar por frecuencia de uso y luego por última vez usada
    suggestions.sort((a, b) => {
      if (b.timesUsed !== a.timesUsed) {
        return b.timesUsed - a.timesUsed;
      }
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });

    // Limitar a las 5 mejores sugerencias
    const topSuggestions = suggestions.slice(0, 5);

    this.suggestionsSubject.next(topSuggestions);
    return topSuggestions;
  }

  /**
   * Obtiene las últimas rutas visitadas (para mostrar al iniciar)
   */
  getRecentRoutes(limit: number = 5): SavedRoute[] {
    const routes = this.savedRoutesSubject.value;
    return routes
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, limit);
  }

  /**
   * Obtiene rutas frecuentes
   */
  getFrequentRoutes(limit: number = 5): SavedRoute[] {
    const routes = this.savedRoutesSubject.value;
    return routes
      .sort((a, b) => b.timesUsed - a.timesUsed)
      .slice(0, limit);
  }

  /**
   * Actualiza el nombre de una ruta
   */
  async updateRouteName(routeId: string, newName: string): Promise<void> {
    const routes = this.savedRoutesSubject.value;
    const index = routes.findIndex(r => r.id === routeId);

    if (index >= 0) {
      routes[index] = { ...routes[index], name: newName };
      await this.persistRoutes(routes);
      this.savedRoutesSubject.next([...routes]);
    }
  }

  /**
   * Elimina una ruta guardada
   */
  async deleteRoute(routeId: string): Promise<void> {
    const routes = this.savedRoutesSubject.value.filter(r => r.id !== routeId);
    await this.persistRoutes(routes);
    this.savedRoutesSubject.next(routes);
  }

  /**
   * Limpia todas las rutas guardadas
   */
  async clearAllRoutes(): Promise<void> {
    await Preferences.remove({ key: STORAGE_KEY });
    this.savedRoutesSubject.next([]);
    this.suggestionsSubject.next([]);
  }

  // ===========================================
  // MÉTODOS PRIVADOS
  // ===========================================

  /**
   * Verifica si dos rutas son similares (mismo origen y destino aproximado)
   */
  private isSimilarRoute(
    start1: GpsPoint,
    end1: GpsPoint,
    start2: GpsPoint,
    end2: GpsPoint
  ): boolean {
    const startSimilar = this.calculateDistanceMeters(start1, start2) <= SIMILARITY_RADIUS_METERS;
    const endSimilar = this.calculateDistanceMeters(end1, end2) <= SIMILARITY_RADIUS_METERS;
    return startSimilar && endSimilar;
  }

  /**
   * Calcula la distancia en metros entre dos puntos GPS
   */
  private calculateDistanceMeters(point1: GpsPoint, point2: GpsPoint): number {
    const R = 6371000; // Radio de la Tierra en metros
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

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistRoutes(routes: SavedRoute[]): Promise<void> {
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(routes)
      });
    } catch (error) {
      console.error('❌ Error guardando rutas:', error);
    }
  }
}
