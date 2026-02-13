/**
 * TaxPro Mileage - Modelos de Datos
 * ==================================
 */

// ===========================================
// MODELOS DE USUARIO Y AUTENTICACIÓN
// ===========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  profilePhoto?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  photo?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  currentMileage: number;
  lastUpdated: string;
  isDefault: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
    expiresAt: string;
  };
}

export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

// ===========================================
// MODELOS DE UBICACIÓN Y GPS
// ===========================================

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// ===========================================
// MODELOS DE RECORRIDOS (TRIPS)
// ===========================================

export type TripStatus = 'in_progress' | 'completed' | 'cancelled';
export type TripPurpose = 'business' | 'medical' | 'charity' | 'moving' | 'personal';

export interface Trip {
  id: string;
  userId: string;
  vehicleId?: string;
  startTime: string;
  endTime?: string;
  status: TripStatus;
  purpose: TripPurpose;
  notes?: string;
  startLocation: GpsPoint;
  endLocation?: GpsPoint;
  route: GpsPoint[];
  distanceMiles: number;
  distanceKm: number;
  durationSeconds: number;
  averageSpeedMph?: number;
  maxSpeedMph?: number;
  startAddress?: string;
  endAddress?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface CreateTripData {
  startLocation: GpsPoint;
  purpose?: TripPurpose;
  notes?: string;
  vehicleId?: string;
}

export interface FinishTripData {
  tripId: string;
  purpose: TripPurpose;
  endLocation: GpsPoint;
  route: GpsPoint[];
  distanceMiles: number;
  distanceKm: number;
  durationSeconds: number;
  averageSpeedMph?: number;
  maxSpeedMph?: number;
}

// ===========================================
// MODELOS DE ESTADÍSTICAS
// ===========================================

export interface UserStatistics {
  totalTrips: number;
  totalMiles: number;
  totalKilometers: number;
  totalDurationSeconds: number;
  totalDeductionAmount: number;
  tripsThisWeek: number;
  milesThisWeek: number;
  tripsThisMonth: number;
  milesThisMonth: number;
  tripsThisYear: number;
  milesThisYear: number;
  averageTripMiles: number;
  averageTripDuration: number;
  averageTripsPerWeek: number;
  milesByPurpose: {
    business: number;
    medical: number;
    charity: number;
    moving: number;
    personal: number;
  };
}

export interface DailyMileage {
  date: string;
  miles: number;
  trips: number;
}

export interface MonthlyMileage {
  month: string;
  miles: number;
  trips: number;
  deduction: number;
}

// ===========================================
// MODELOS DE RESPUESTA DE API
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface TripFilters {
  startDate?: string;
  endDate?: string;
  purpose?: TripPurpose;
  status?: TripStatus;
  minDistance?: number;
  maxDistance?: number;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'distance' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

// ===========================================
// MODELOS DE ESTADO DE TRACKING
// ===========================================

export interface TrackingState {
  tripId?: string;       // ID único del trip (UUID generado al iniciar)
  purpose?: TripPurpose; // Propósito del viaje (business, medical, etc.)
  isTracking: boolean;
  isPaused: boolean;
  currentTrip?: Trip;
  currentPosition?: GpsPoint;
  routePoints: GpsPoint[];
  startTime?: number;
  elapsedTime: number;
  currentDistance: number;
  currentSpeed: number;
  lastUpdate?: number;
}

export interface TrackingSettings {
  autoStopEnabled: boolean;
  autoStopTimeout: number;
  defaultPurpose: TripPurpose;
  showNotifications: boolean;
  keepScreenOn: boolean;
  highAccuracyMode: boolean;
  drivingDetectionEnabled: boolean;
}

// ===========================================
// MODELOS DE COMPARTIR
// ===========================================

export interface ShareTripData {
  tripId: string;
  includeMap: boolean;
  includeStatistics: boolean;
  format: 'link' | 'image' | 'pdf';
}

export interface ShareResult {
  success: boolean;
  shareUrl?: string;
  error?: string;
}

// ===========================================
// DTOs PARA API DE TRACKING (coinciden con backend C#)
// ===========================================

/** Coincide con GeoPointDto del backend */
export interface GeoPointDto {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number; // epoch ms
}

/** Coincide con GeoPositionDto del backend */
export interface GeoPositionDto {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number; // epoch ms
}

/** Coincide con TripPayloadDto del backend */
export interface TripPayloadDto {
  tripId: string;        // UUID único del trip
  customerId: string;    // nameid del JWT (identifica al customer)
  companyId: string;     // companyId del JWT (identifica la company)
  purpose: string;       // Propósito del viaje (business, medical, charity, moving, personal)
  isTracking: boolean;
  isPaused: boolean;
  routePoints: GeoPointDto[];
  currentPosition?: GeoPositionDto;
  startTime: number;   // epoch ms
  lastUpdate: number;   // epoch ms
  elapsedTime: number;  // epoch ms
  currentDistance: number;
  currentSpeed: number;
}

/** Coincide con TripStatisticsDto del backend */
export interface TripStatisticsDto {
  distanceMiles: number;
  distanceKm: number;
  durationSeconds: number;
  totalPoints: number;
}

/** Coincide con LocationDto del backend */
export interface LocationDto {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Coincide con RoutePointDto del backend */
export interface RoutePointDto {
  latitude: number;
  longitude: number;
  timestamp: number; // epoch ms
  accuracy: number;
}

// ===========================================
// TIPOS DE UTILIDAD
// ===========================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
