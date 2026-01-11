/**
 * TaxPro Mileage - Modelos de Datos
 * ==================================
 * Este archivo contiene todas las interfaces y tipos
 * de datos que se utilizan en la aplicación.
 */

// ===========================================
// MODELOS DE USUARIO Y AUTENTICACIÓN
// ===========================================

/**
 * Datos del usuario autenticado
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

/**
 * Credenciales de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Respuesta del servidor al hacer login
 */
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

/**
 * Token de autenticación almacenado
 */
export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

// ===========================================
// MODELOS DE UBICACIÓN Y GPS
// ===========================================

/**
 * Punto de ubicación GPS
 */
export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number; // m/s
  heading?: number; // grados
  timestamp: number; // Unix timestamp
}

/**
 * Coordenadas simples para Google Maps
 */
export interface LatLng {
  lat: number;
  lng: number;
}

// ===========================================
// MODELOS DE RECORRIDOS (TRIPS)
// ===========================================

/**
 * Estado del recorrido
 */
export type TripStatus = 'in_progress' | 'completed' | 'cancelled';

/**
 * Propósito del recorrido (para deducciones fiscales)
 */
export type TripPurpose = 'business' | 'medical' | 'charity' | 'moving' | 'personal';

/**
 * Recorrido/Viaje completo
 */
export interface Trip {
  id: string;
  userId: string;
  
  // Información del recorrido
  startTime: string; // ISO date string
  endTime?: string;
  status: TripStatus;
  purpose: TripPurpose;
  notes?: string;
  
  // Ubicaciones
  startLocation: GpsPoint;
  endLocation?: GpsPoint;
  route: GpsPoint[]; // Array de puntos del recorrido
  
  // Estadísticas
  distanceMiles: number;
  distanceKm: number;
  durationSeconds: number;
  averageSpeedMph?: number;
  maxSpeedMph?: number;
  
  // Información adicional
  startAddress?: string;
  endAddress?: string;
  
  // Metadatos
  createdAt: string;
  updatedAt: string;
  syncedAt?: string; // Cuándo se sincronizó con el servidor
}

/**
 * Datos para crear un nuevo recorrido
 */
export interface CreateTripData {
  startLocation: GpsPoint;
  purpose?: TripPurpose;
  notes?: string;
}

/**
 * Datos para finalizar un recorrido
 */
export interface FinishTripData {
  tripId: string;
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

/**
 * Resumen de estadísticas del usuario
 */
export interface UserStatistics {
  // Totales
  totalTrips: number;
  totalMiles: number;
  totalKilometers: number;
  totalDurationSeconds: number;
  totalDeductionAmount: number;
  
  // Por período
  tripsThisWeek: number;
  milesThisWeek: number;
  tripsThisMonth: number;
  milesThisMonth: number;
  tripsThisYear: number;
  milesThisYear: number;
  
  // Promedios
  averageTripMiles: number;
  averageTripDuration: number;
  averageTripsPerWeek: number;
  
  // Por propósito
  milesByPurpose: {
    business: number;
    medical: number;
    charity: number;
    moving: number;
    personal: number;
  };
}

/**
 * Datos para gráfico de millas por día
 */
export interface DailyMileage {
  date: string; // YYYY-MM-DD
  miles: number;
  trips: number;
}

/**
 * Datos para gráfico mensual
 */
export interface MonthlyMileage {
  month: string; // YYYY-MM
  miles: number;
  trips: number;
  deduction: number;
}

// ===========================================
// MODELOS DE RESPUESTA DE API
// ===========================================

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

/**
 * Respuesta paginada
 */
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

/**
 * Filtros para buscar recorridos
 */
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

/**
 * Estado actual del tracking GPS
 */
export interface TrackingState {
  isTracking: boolean;
  isPaused: boolean;
  currentTrip?: Trip;
  currentPosition?: GpsPoint;
  routePoints: GpsPoint[];
  startTime?: number;
  elapsedTime: number; // segundos
  currentDistance: number; // millas
  currentSpeed: number; // mph
  lastUpdate?: number;
}

/**
 * Configuración de tracking del usuario
 */
export interface TrackingSettings {
  autoStopEnabled: boolean;
  autoStopTimeout: number; // minutos
  defaultPurpose: TripPurpose;
  showNotifications: boolean;
  keepScreenOn: boolean;
  highAccuracyMode: boolean;
}

// ===========================================
// MODELOS DE COMPARTIR
// ===========================================

/**
 * Datos para compartir un recorrido
 */
export interface ShareTripData {
  tripId: string;
  includeMap: boolean;
  includeStatistics: boolean;
  format: 'link' | 'image' | 'pdf';
}

/**
 * Resultado de compartir
 */
export interface ShareResult {
  success: boolean;
  shareUrl?: string;
  error?: string;
}

// ===========================================
// TIPOS DE UTILIDAD
// ===========================================

/**
 * Estado de carga
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Resultado de operación
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
