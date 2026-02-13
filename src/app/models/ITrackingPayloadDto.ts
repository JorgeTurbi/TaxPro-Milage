
// tracking-payload.dto.ts

export interface ITrackingPayloadDto {
  isTracking: boolean;
  isPaused: boolean;

  // Lista completa de puntos recorridos
  routePoints: GeoPointDto[];

  // Posición actual (último punto)
  currentPosition?: GeoPositionDto | null;

  // Epoch milliseconds (como 1768708395782)
  startTime: number;
  lastUpdate: number;

  // OJO: en tu ejemplo parece venir en ms (1179992)
  // si lo manejas en segundos, cambia el tipo/uso pero no el tipo
  elapsedTime: number;

  // En tu ejemplo está en 0, pero puede ser decimal
  currentDistance: number;

  // En tu ejemplo está en 0 (m/s o mph según tu lógica)
  currentSpeed: number;
}

export interface GeoPositionDto {
  latitude: number;
  longitude: number;
  accuracy: number;

  // Epoch milliseconds
  timestamp: number;
}

export interface GeoPointDto {
  latitude: number;
  longitude: number;
  accuracy: number;

  // Epoch milliseconds
  timestamp: number;
}
