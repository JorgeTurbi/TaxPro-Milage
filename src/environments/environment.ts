export const environment = {
  // Indica si es entorno de producción
  production: false,

  // ===========================================
  // CONFIGURACIÓN DE API
  // ===========================================
  
  // URL base de la API
  // REEMPLAZAR: Con la URL real de tu API
  apiUrl: 'https://api.tu-dominio.com/api/v1',

  // Endpoints específicos
  endpoints: {
    // Autenticación
    login: '/auth/login',
    logout: '/auth/logout',
    refreshToken: '/auth/refresh',
    userProfile: '/auth/profile',

    // Recorridos (Trips)
    trips: '/trips',
    tripById: '/trips/:id',
    tripsByDateRange: '/trips/range',
    tripStatistics: '/trips/statistics',

    // Millas
    mileageLog: '/mileage/log',
    mileageSummary: '/mileage/summary',
  },

  // ===========================================
  // CONFIGURACIÓN DE GOOGLE MAPS
  // ===========================================
  
  // Clave API de Google Maps
  // REEMPLAZAR: Con tu clave de API de Google Maps
  // Obtener en: https://console.cloud.google.com/apis/credentials
  googleMapsApiKey: 'AIzaSyCEGf9zWOtFVJUtV8BpZj06vvJbitxBOiU',

  // Configuración del mapa por defecto
  mapDefaults: {
    // Ubicación inicial (Centro de USA como ejemplo)
    lat: 39.8283,
    lng: -98.5795,
    zoom: 4,
    // Estilo del mapa
    mapTypeId: 'roadmap',
  },

  // ===========================================
  // CONFIGURACIÓN DE TRACKING GPS
  // ===========================================
  
  gpsConfig: {
    // Intervalo de actualización de posición (ms)
    updateInterval: 5000, // 5 segundos
    
    // Precisión mínima aceptable (metros)
    minimumAccuracy: 50,
    
    // Velocidad mínima para considerar movimiento en auto (m/s)
    // ~8 km/h - para diferenciar de caminar
    minimumSpeedForDriving: 2.2,
    
    // Tiempo sin movimiento para detener tracking automáticamente (ms)
    // 2 minutos
    stopTrackingTimeout: 120000,
    
    // Distancia mínima entre puntos para registrar (metros)
    minimumDistance: 10,
  },

  // ===========================================
  // CONFIGURACIÓN DE ALMACENAMIENTO LOCAL
  // ===========================================
  
  storage: {
    // Clave para token de autenticación
    authTokenKey: 'taxpro_auth_token',
    // Clave para datos de usuario
    userDataKey: 'taxpro_user_data',
    // Clave para configuraciones
    settingsKey: 'taxpro_settings',
    // Clave para tracking temporal
    tempTrackingKey: 'taxpro_temp_tracking',
  },

  // ===========================================
  // CONFIGURACIÓN DE LA APLICACIÓN
  // ===========================================
  
  app: {
    name: 'TaxPro Mileage',
    version: '1.0.0',
    // Moneda para mostrar valores
    currency: 'USD',
    // Tarifa por milla (IRS 2024: $0.67)
    mileageRate: 0.67,
    // Unidad de distancia
    distanceUnit: 'miles', // 'miles' o 'kilometers'
  },

  // ===========================================
  // CONFIGURACIÓN DE DEBUG
  // ===========================================
  
  debug: {
    // Mostrar logs de GPS
    logGps: true,
    // Mostrar logs de API
    logApi: true,
    // Modo simulación GPS (para testing en emulador)
    simulateGps: false,
  }
};
