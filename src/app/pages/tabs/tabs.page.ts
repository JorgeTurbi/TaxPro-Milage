/**
 * TaxPro Mileage - Página de Tabs
 * ================================
 * Contenedor principal con la barra de navegación inferior.
 * Incluye 4 tabs:
 * - Dashboard: Estadísticas y resumen
 * - Tracking: Iniciar/detener tracking GPS
 * - Historial: Ver recorridos anteriores
 * - Perfil: Configuración del usuario
 */

import { Component } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  home,
  navigateOutline,
  navigate,
  timeOutline,
  time,
  personOutline,
  person
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,  
  ],
  template: `
    <ion-tabs>
      <!-- Contenido de los tabs se renderiza aquí automáticamente -->
      
      <!-- Barra de navegación inferior -->
      <ion-tab-bar slot="bottom">
        
        <!-- Tab: Dashboard -->
        <ion-tab-button tab="dashboard">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Inicio</ion-label>
        </ion-tab-button>
        
        <!-- Tab: Tracking GPS -->
        <ion-tab-button tab="tracking">
          <ion-icon name="navigate-outline"></ion-icon>
          <ion-label>Tracking</ion-label>
        </ion-tab-button>
        
        <!-- Tab: Historial -->
        <ion-tab-button tab="history">
          <ion-icon name="time-outline"></ion-icon>
          <ion-label>Historial</ion-label>
        </ion-tab-button>
        
        <!-- Tab: Perfil -->
        <ion-tab-button tab="profile">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
        
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: #ffffff;
      --border: 1px solid #e2e8f0;
      height: 60px;
      padding-bottom: env(safe-area-inset-bottom);
    }

    ion-tab-button {
      --color: #718096;
      --color-selected: #1a365d;
      --ripple-color: rgba(26, 54, 93, 0.1);
    }

    ion-tab-button ion-icon {
      font-size: 1.5rem;
    }

    ion-tab-button ion-label {
      font-size: 0.7rem;
      font-weight: 500;
    }

    ion-tab-button.tab-selected ion-icon {
      color: #1a365d;
    }

    ion-tab-button.tab-selected ion-label {
      color: #1a365d;
      font-weight: 600;
    }

    /* Animación al seleccionar tab */
    ion-tab-button.tab-selected {
      transform: scale(1.05);
      transition: transform 0.2s ease;
    }
  `]
})
export class TabsPage {

  constructor() {
    // Registrar iconos
    addIcons({
      homeOutline,
      home,
      navigateOutline,
      navigate,
      timeOutline,
      time,
      personOutline,
      person
    });
  }
}
