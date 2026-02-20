import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taxprosuite.mileage',
  appName: 'taxpro-mileage',
  webDir: 'www',

  // Configuración de plugins
  plugins: {
    // Plugin de Geolocalización
    Geolocation: {
      // Solicitar permisos de ubicación precisa
      requestPermissions: true
    },

    // Plugin de Biometría (huella/Face ID) - @capgo/capacitor-native-biometric
    NativeBiometric: {
      // No requiere configuración adicional en capacitor.config.ts
      // La configuración se hace al llamar verifyIdentity()
    },

    // Plugin de Preferencias (almacenamiento local)
    Preferences: {
      // Grupo de preferencias
      group: 'TaxProMileage'
    },

    // Configuración de Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a365d',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },

    // Configuración de la barra de estado
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a365d'
    },

    // Configuración de teclado
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  },

  // Configuración específica para Android
  android: {
    // Permite conexiones HTTP (solo desarrollo)
    allowMixedContent: true,
    // Captura de logs
    loggingBehavior: 'debug',
    // Color de la barra de navegación
    backgroundColor: '#1a365d'
  },

  // Configuración específica para iOS
  ios: {
    // Esquema de la app
    scheme: 'App',
    // Permite scroll
    scrollEnabled: true
  }
};

export default config;
