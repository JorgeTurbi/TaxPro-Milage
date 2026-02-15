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

  apiUrl: 'http://localhost:5000/api',

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
    mileageLog: '/client/tracking/create',
    mileageSummary: '/client/tracking/getMilesLastSevenDays',
    profileVehicle: '/client/tracking/createVehicle',
    getProfileVehicle: '/client/tracking/getVehicle',
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
    mileageRate: 0.7,
    distanceUnit: 'miles',
  },

  // ===========================================
  // DEBUG DESHABILITADO EN PRODUCCIÓN
  // ===========================================

  debug: {
    logGps: false,
    logApi: false,
    simulateGps: false,
  },

  imageDefault: {
    car: `data:image/png;base64,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`
  },

  color: "Blue",
  make: "Mark",
  model: "Model",
  year: new Date().getFullYear(),
};
