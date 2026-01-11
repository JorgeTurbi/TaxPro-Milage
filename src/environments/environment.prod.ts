/**
 * TaxPro Mileage - Configuración de Entorno (Producción)
 * =======================================================
 * Este archivo contiene las configuraciones específicas
 * para el entorno de producción.
 * 
 * IMPORTANTE: Reemplaza las URLs y claves con valores de producción.
 */

export const environment = {
  production: true,

  // ===========================================
  // CONFIGURACIÓN DE API - PRODUCCIÓN
  // ===========================================
  
  apiUrl: 'https://api.taxprosuite.com/api/v1',

  endpoints: {
    login: '/auth/login',
    logout: '/auth/logout',
    refreshToken: '/auth/refresh',
    userProfile: '/auth/profile',
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

  googleMapsApiKey: '<GOOGLE_MAPS_API_KEY>',

  mapDefaults: {
    lat: 39.8283,
    lng: -98.5795,
    zoom: 4,
    mapTypeId: 'roadmap',
  },

  // ===========================================
  // CONFIGURACIÓN DE TRACKING GPS
  // ===========================================
  
  gpsConfig: {
    updateInterval: 5000,
    minimumAccuracy: 50,
    minimumSpeedForDriving: 2.2,
    stopTrackingTimeout: 120000,
    minimumDistance: 10,
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
    mileageRate: 0.67,
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
