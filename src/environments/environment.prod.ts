/**
 * TaxPro Mileage - Configuración de Entorno (Producción)
 * =======================================================
 * Este archivo contiene las configuraciones específicas
 * para el entorno de producción.
 */

export const environment = {
  production: true,

  // ===========================================
  // CONFIGURACIÓN DE API - PRODUCCIÓN
  // ===========================================

  apiUrl: 'https://api.taxprosuite.com/api',

  endpoints: {
    login: '/auth/client/login',
    logout: '/auth/client/logout',
    miltilogin: '/auth/client/login/select-company',
    //refreshToken: '/auth/refresh',
    userProfile: '/auth/client/profile',
    trips: '/trips',
    tripById: '/trips/:id',
    tripsByDateRange: '/trips/range',
    tripStatistics: '/trips/statistics',
    mileageLog: '/mileage/log',
    mileageSummary: '/mileage/summary',
  },

  // ===========================================
  // CONFIGURACIÓN DE GOOGLE MAPS - PRODUCCIÓN
  // ===========================================

  googleMapsApiKey: 'AIzaSyCEGf9zWOtFVJUtV8BpZj06vvJbitxBOiU',

  mapDefaults: {
    lat: 39.8283,
    lng: -98.5795,
    zoom: 4,
    mapTypeId: 'roadmap',
  },

  // ===========================================
  // CONFIGURACIÓN DE TRACKING GPS - ACTUALIZADA
  // ===========================================

  gpsConfig: {
    // Intervalo de actualización de posición (ms)
    updateInterval: 5000,

    // Precisión mínima aceptable (metros)
    minimumAccuracy: 50,

    // Velocidad mínima para considerar movimiento en auto (m/s) ~8 km/h
    minimumSpeedForDriving: 2.2,

    // Velocidad para detectar que está conduciendo (m/s) ~15 km/h
    drivingDetectionSpeed: 4.2,

    // Tiempo sin movimiento para detener tracking automáticamente (ms)
    // 5 minutos por defecto
    stopTrackingTimeout: 1200000,

    // Tiempo mínimo de parada antes de considerar finalizar (ms)
    // 2 minutos
    minimumStopTime: 1200000,

    // Distancia mínima entre puntos para registrar (metros)
    minimumDistance: 10,

    // Habilitar detección automática de conducción
    enableDrivingDetection: true,

    // Tiempo de conducción continua para preguntar si iniciar tracking (ms)
    // 30 segundos
    drivingDetectionTime: 30000,
  },

  // ===========================================
  // CONFIGURACIÓN DE ALMACENAMIENTO LOCAL
  // ===========================================

  storage: {
    authTokenKey: 'taxpro_auth_token',
    userDataKey: 'taxpro_user_data',
    settingsKey: 'taxpro_settings',
    tempTrackingKey: 'taxpro_temp_tracking',
  },

  // ===========================================
  // CONFIGURACIÓN DE LA APLICACIÓN
  // ===========================================

  app: {
    name: 'TaxPro Mileage',
    version: '1.0.0',
    currency: 'USD',
    // TARIFA ACTUALIZADA: $0.70 por milla
    mileageRate: 0.70,
    distanceUnit: 'miles',
  },

  // ===========================================
  // DEBUG DESHABILITADO EN PRODUCCIÓN
  // ===========================================

  debug: {
    logGps: false,
    logApi: false,
    simulateGps: false,
  }
};
