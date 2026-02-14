import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  TripPayloadDto,
  TripStatisticsDto,
  GeoPointDto,
  GeoPositionDto,
  TrackingState,
  GpsPoint,
  Trip,
  Vehicle,
  IPersonalData,
} from '../models/interfaces';
import { CustomerTokenService } from './customer-token.service';

@Injectable({
  providedIn: 'root'
})
export class TrackingApiService {
  private http = inject(HttpClient);
  private customerTokenService = inject(CustomerTokenService);

  urlVehicle : string = environment.apiUrl + environment.endpoints.profileVehicle;
  urlGetVehicle : string = environment.apiUrl + environment.endpoints.getProfileVehicle;

  /**
   * Envía el payload completo del trip al backend.
   * Convierte el TrackingState interno al TripPayloadDto que espera el API.
   */
  sendTripPayload(state: TrackingState): Observable<ApiResponse<Trip>> {
    const payload = this.buildTripPayloadDto(state);
    const url = `${environment.apiUrl}${environment.endpoints.mileageLog}`;

    if (environment.debug.logApi) {
      console.log('Payload enviado al API:', JSON.stringify(payload, null, 2));
    }

    return this.http.post<ApiResponse<Trip>>(url, payload).pipe(
      catchError((error) => {
        console.error('Error enviando datos a la API:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Envía las estadísticas finales del trip.
   */
  sendTripStatistics(
    distanceMiles: number,
    distanceKm: number,
    durationSeconds: number,
    totalPoints: number
  ): Observable<ApiResponse<TripStatisticsDto>> {
    const stats: TripStatisticsDto = {
      distanceMiles,
      distanceKm,
      durationSeconds,
      totalPoints,
    };

    const url = `${environment.apiUrl}${environment.endpoints.tripStatistics}`;
    return this.http.post<ApiResponse<TripStatisticsDto>>(url, stats);
  }

  /**
   * Convierte el TrackingState interno al formato TripPayloadDto del backend.
   */
  buildTripPayloadDto(state: TrackingState): TripPayloadDto {
    const decodedToken = this.customerTokenService.decodeToken();

    if (!decodedToken) {
      throw new Error('No se pudo decodificar el token JWT');
    }

    const customerId = decodedToken.nameid;
    const companyId = decodedToken.companyId;

    if (!customerId || !companyId) {
      throw new Error('CustomerId o CompanyId no encontrado en el token');
    }

    if (!state.tripId || !state.purpose) {
      throw new Error('TripId y Purpose son requeridos');
    }

    const routePoints: GeoPointDto[] = state.routePoints.map(p => this.toGeoPointDto(p));

    let currentPosition: GeoPositionDto | undefined;
    if (state.currentPosition) {
      currentPosition = {
        latitude: state.currentPosition.latitude,
        longitude: state.currentPosition.longitude,
        accuracy: state.currentPosition.accuracy ?? 0,
        timestamp: state.currentPosition.timestamp,
      };
    }

    return {
      tripId: state.tripId,
      customerId,
      companyId,
      purpose: state.purpose,
      isTracking: state.isTracking,
      isPaused: state.isPaused,
      routePoints,
      currentPosition,
      startTime: state.startTime ?? Date.now(),
      lastUpdate: state.lastUpdate ?? Date.now(),
      elapsedTime: state.elapsedTime ?? 0,
      currentDistance: state.currentDistance ?? 0,
      currentSpeed: state.currentSpeed ?? 0,
    };
  }

  /**
   * Convierte un GpsPoint interno a GeoPointDto del backend.
   */
  private toGeoPointDto(point: GpsPoint): GeoPointDto {
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy ?? 0,
      timestamp: point.timestamp,
    };
  }

  createVehicleProfile(payload: Vehicle): Observable<boolean> {
    if (payload.plate.length > 0 || payload.plate !== '' || payload.plate !== undefined) {
      return this.http.post<boolean>(this.urlVehicle, payload);
    }

    return of(false);
  }

  getProfileVehicle(data: IPersonalData): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.urlGetVehicle, data);
  }
}
