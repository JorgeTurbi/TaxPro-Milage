/**
 * ============================================================
 * HISTORY PAGE - Historial de Recorridos
 * ============================================================
 * 
 * Esta página permite al usuario:
 * - Ver todos sus viajes anteriores
 * - Filtrar por rango de fechas
 * - Filtrar por propósito (negocio, médico, etc.)
 * - Buscar viajes específicos
 * - Ver resumen de estadísticas del período seleccionado
 * - Navegar al detalle de cada viaje
 * 
 * CARACTERÍSTICAS:
 * - Date picker para seleccionar rango de fechas
 * - Filtros por propósito del viaje
 * - Lista con infinite scroll
 * - Pull-to-refresh
 * - Chips con resumen del período
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonLabel,
  IonList, IonChip, IonBadge, IonSearchbar, IonSegment, IonSegmentButton,
  IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent,
  IonDatetime, IonDatetimeButton, IonModal, IonSpinner, IonNote, IonText,
  IonItemSliding, IonItemOptions, IonItemOption, RefresherEventDetail,
  IonButtons, IonSkeletonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, filterOutline, searchOutline, navigateOutline,
  timeOutline, carSportOutline, briefcaseOutline, medkitOutline,
  heartOutline, homeOutline, chevronForwardOutline, trashOutline,
  shareOutline, mapOutline, cashOutline, trendingUpOutline
} from 'ionicons/icons';
import { format, subDays, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

import { TripService } from '../../services/trip.service';
import { Trip, TripPurpose, TripStatus } from '../../models/interfaces';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon,
    IonCard, IonCardContent,  IonItem, IonLabel,
    IonList, IonChip, IonBadge, IonSearchbar, IonSegment, IonSegmentButton,
    IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent,
    IonDatetime, IonDatetimeButton, IonModal, IonNote,
    IonItemSliding, IonItemOptions, IonItemOption, IonButtons, IonSkeletonText
  ],
  template: `
    <!-- ============================================================
         HEADER
         ============================================================ -->
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <ion-icon name="calendar-outline" class="header-icon"></ion-icon>
          Historial
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleFilters()">
            <ion-icon name="filter-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      
      <!-- Barra de búsqueda -->
      <ion-toolbar color="primary">
        <ion-searchbar
          [(ngModel)]="searchQuery"
          placeholder="Buscar viajes..."
          [debounce]="300"
          (ionInput)="onSearchChange()"
          animated>
        </ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="history-content">
      <!-- Pull to refresh -->
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content pullingIcon="chevron-down-circle-outline">
        </ion-refresher-content>
      </ion-refresher>

      <!-- ============================================================
           PANEL DE FILTROS (Colapsable)
           ============================================================ -->
      @if (showFilters()) {
        <div class="filters-panel">
          <!-- Selector de rango de fechas -->
          <div class="date-range-selector">
            <div class="date-field">
              <label>Desde:</label>
              <ion-datetime-button datetime="startDate"></ion-datetime-button>
              <ion-modal [keepContentsMounted]="true">
                <ng-template>
                  <ion-datetime 
                    id="startDate"
                    [(ngModel)]="startDate"
                    presentation="date"
                    [max]="today"
                    (ionChange)="onDateChange()">
                  </ion-datetime>
                </ng-template>
              </ion-modal>
            </div>
            
            <div class="date-field">
              <label>Hasta:</label>
              <ion-datetime-button datetime="endDate"></ion-datetime-button>
              <ion-modal [keepContentsMounted]="true">
                <ng-template>
                  <ion-datetime 
                    id="endDate"
                    [(ngModel)]="endDate"
                    presentation="date"
                    [max]="today"
                    (ionChange)="onDateChange()">
                  </ion-datetime>
                </ng-template>
              </ion-modal>
            </div>
          </div>
          
          <!-- Filtros rápidos de fecha -->
          <div class="quick-filters">
            <ion-chip 
              [outline]="!isQuickFilterActive('today')"
              [color]="isQuickFilterActive('today') ? 'primary' : 'medium'"
              (click)="setQuickFilter('today')">
              Hoy
            </ion-chip>
            <ion-chip 
              [outline]="!isQuickFilterActive('week')"
              [color]="isQuickFilterActive('week') ? 'primary' : 'medium'"
              (click)="setQuickFilter('week')">
              7 días
            </ion-chip>
            <ion-chip 
              [outline]="!isQuickFilterActive('month')"
              [color]="isQuickFilterActive('month') ? 'primary' : 'medium'"
              (click)="setQuickFilter('month')">
              Este mes
            </ion-chip>
            <ion-chip 
              [outline]="!isQuickFilterActive('all')"
              [color]="isQuickFilterActive('all') ? 'primary' : 'medium'"
              (click)="setQuickFilter('all')">
              Todo
            </ion-chip>
          </div>
          
          <!-- Filtro por propósito -->
          <div class="purpose-filter">
            <label>Propósito:</label>
            <ion-segment [(ngModel)]="selectedPurpose" (ionChange)="onPurposeChange()">
              <ion-segment-button value="all">
                <ion-label>Todos</ion-label>
              </ion-segment-button>
              <ion-segment-button value="business">
                <ion-icon name="briefcase-outline"></ion-icon>
              </ion-segment-button>
              <ion-segment-button value="medical">
                <ion-icon name="medkit-outline"></ion-icon>
              </ion-segment-button>
              <ion-segment-button value="charity">
                <ion-icon name="heart-outline"></ion-icon>
              </ion-segment-button>
              <ion-segment-button value="moving">
                <ion-icon name="home-outline"></ion-icon>
              </ion-segment-button>
            </ion-segment>
          </div>
        </div>
      }

      <!-- ============================================================
           RESUMEN DEL PERÍODO
           ============================================================ -->
      <div class="period-summary">
        <div class="summary-item">
          <ion-icon name="navigate-outline" color="primary"></ion-icon>
          <div class="summary-info">
            <span class="summary-value">{{ totalMiles().toFixed(1) }}</span>
            <span class="summary-label">Millas</span>
          </div>
        </div>
        
        <div class="summary-item">
          <ion-icon name="car-sport-outline" color="secondary"></ion-icon>
          <div class="summary-info">
            <span class="summary-value">{{ filteredTrips().length }}</span>
            <span class="summary-label">Viajes</span>
          </div>
        </div>
        
        <div class="summary-item">
          <ion-icon name="cash-outline" color="success"></ion-icon>
          <div class="summary-info">
            <span class="summary-value">\${{ totalDeduction().toFixed(2) }}</span>
            <span class="summary-label">Deducción</span>
          </div>
        </div>
      </div>

      <!-- ============================================================
           LISTA DE VIAJES
           ============================================================ -->
      @if (isLoading()) {
        <!-- Skeleton loading -->
        <div class="trips-loading">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <ion-card class="trip-card skeleton">
              <ion-card-content>
                <div class="skeleton-row">
                  <ion-skeleton-text [animated]="true" style="width: 30%"></ion-skeleton-text>
                  <ion-skeleton-text [animated]="true" style="width: 20%"></ion-skeleton-text>
                </div>
                <ion-skeleton-text [animated]="true" style="width: 60%; height: 20px"></ion-skeleton-text>
                <div class="skeleton-row">
                  <ion-skeleton-text [animated]="true" style="width: 25%"></ion-skeleton-text>
                  <ion-skeleton-text [animated]="true" style="width: 25%"></ion-skeleton-text>
                </div>
              </ion-card-content>
            </ion-card>
          }
        </div>
      } @else if (filteredTrips().length === 0) {
        <!-- Estado vacío -->
        <div class="empty-state">
          <ion-icon name="car-sport-outline"></ion-icon>
          <h3>No hay viajes</h3>
          <p>No se encontraron viajes para los filtros seleccionados.</p>
          <ion-button fill="outline" (click)="resetFilters()">
            Limpiar filtros
          </ion-button>
        </div>
      } @else {
        <!-- Lista de viajes -->
        <ion-list class="trips-list">
          @for (trip of filteredTrips(); track trip.id) {
            <ion-item-sliding>
              <ion-item 
                class="trip-item" 
                [button]="true" 
                (click)="viewTripDetail(trip)"
                [detail]="true">
                
                <!-- Icono del propósito -->
                <div class="trip-purpose-icon" slot="start" [ngClass]="'purpose-' + trip.purpose">
                  <ion-icon [name]="getPurposeIcon(trip.purpose)"></ion-icon>
                </div>
                
                <ion-label>
                  <!-- Fecha y hora -->
                  <h2 class="trip-date">
                    {{ formatDate(trip.startTime) }}
                    <ion-badge [color]="getStatusColor(trip.status)" class="status-badge">
                      {{ getStatusLabel(trip.status) }}
                    </ion-badge>
                  </h2>
                  
                  <!-- Distancia y duración -->
                  <div class="trip-stats">
                    <span class="stat">
                      <ion-icon name="navigate-outline"></ion-icon>
                      {{ trip.distanceMiles.toFixed(2) }} mi
                    </span>
                    <span class="stat">
                      <ion-icon name="time-outline"></ion-icon>
                      {{ formatDuration(trip.durationSeconds || 0) }}
                    </span>
                    <span class="stat deduction">
                      <ion-icon name="cash-outline"></ion-icon>
                      \${{ calculateTripDeduction(trip.distanceMiles || 0) }}
                    </span>
                  </div>
                  
                  <!-- Propósito -->
                  <ion-note color="medium">
                    {{ getPurposeLabel(trip.purpose) }}
                  </ion-note>
                </ion-label>
                
              </ion-item>
              
              <!-- Opciones de deslizamiento -->
              <ion-item-options side="end">
                <ion-item-option color="primary" (click)="shareTrip(trip)">
                  <ion-icon name="share-outline" slot="icon-only"></ion-icon>
                </ion-item-option>
                <ion-item-option color="danger" (click)="deleteTrip(trip)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          }
        </ion-list>
        
        <!-- Infinite scroll -->
        <ion-infinite-scroll (ionInfinite)="loadMore($event)">
          <ion-infinite-scroll-content loadingSpinner="crescent">
          </ion-infinite-scroll-content>
        </ion-infinite-scroll>
      }

    </ion-content>
  `,
  styles: [`
    /* ============================================================
       HEADER
       ============================================================ */
    .header-icon {
      margin-right: 8px;
      vertical-align: middle;
    }

    ion-searchbar {
      --background: rgba(255, 255, 255, 0.15);
      --color: white;
      --placeholder-color: rgba(255, 255, 255, 0.7);
      --icon-color: rgba(255, 255, 255, 0.7);
      --clear-button-color: white;
    }

    /* ============================================================
       PANEL DE FILTROS
       ============================================================ */
    .filters-panel {
      background: white;
      padding: 16px;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }

    .date-range-selector {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }

    .date-field {
      flex: 1;
    }

    .date-field label {
      display: block;
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ion-datetime-button {
      width: 100%;
    }

    ion-datetime-button::part(native) {
      background: var(--ion-color-light);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.9rem;
    }

    .quick-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .quick-filters ion-chip {
      margin: 0;
    }

    .purpose-filter {
      margin-top: 8px;
    }

    .purpose-filter label {
      display: block;
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ion-segment {
      --background: var(--ion-color-light);
    }

    ion-segment-button {
      --indicator-color: var(--ion-color-primary);
      min-width: auto;
    }

    /* ============================================================
       RESUMEN DEL PERÍODO
       ============================================================ */
    .period-summary {
      display: flex;
      justify-content: space-around;
      padding: 16px;
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      margin: 0;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .summary-item ion-icon {
      font-size: 1.5rem;
      background: rgba(255, 255, 255, 0.2);
      padding: 8px;
      border-radius: 8px;
      color: white !important;
    }

    .summary-info {
      display: flex;
      flex-direction: column;
    }

    .summary-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: white;
    }

    .summary-label {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.8);
      text-transform: uppercase;
    }

    /* ============================================================
       LISTA DE VIAJES
       ============================================================ */
    .trips-list {
      background: transparent;
      padding: 8px;
    }

    .trip-item {
      --background: white;
      --border-radius: 12px;
      margin-bottom: 8px;
      --padding-start: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .trip-purpose-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
    }

    .trip-purpose-icon ion-icon {
      font-size: 1.4rem;
      color: white;
    }

    .trip-purpose-icon.purpose-business {
      background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%);
    }

    .trip-purpose-icon.purpose-medical {
      background: linear-gradient(135deg, #c53030 0%, #e53e3e 100%);
    }

    .trip-purpose-icon.purpose-charity {
      background: linear-gradient(135deg, #6b46c1 0%, #805ad5 100%);
    }

    .trip-purpose-icon.purpose-moving {
      background: linear-gradient(135deg, #2b6cb0 0%, #3182ce 100%);
    }

    .trip-purpose-icon.purpose-personal {
      background: linear-gradient(135deg, #718096 0%, #a0aec0 100%);
    }

    .trip-date {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--ion-color-dark);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      font-size: 0.6rem;
      padding: 2px 6px;
      text-transform: uppercase;
    }

    .trip-stats {
      display: flex;
      gap: 16px;
      margin: 6px 0;
    }

    .trip-stats .stat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }

    .trip-stats .stat ion-icon {
      font-size: 0.9rem;
    }

    .trip-stats .stat.deduction {
      color: var(--ion-color-success);
      font-weight: 600;
    }

    /* ============================================================
       SKELETON LOADING
       ============================================================ */
    .trips-loading {
      padding: 8px;
    }

    .trip-card.skeleton {
      margin-bottom: 8px;
    }

    .skeleton-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    /* ============================================================
       ESTADO VACÍO
       ============================================================ */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-state ion-icon {
      font-size: 64px;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      color: var(--ion-color-dark);
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      margin-bottom: 20px;
    }

    /* ============================================================
       RESPONSIVE
       ============================================================ */
    @media (max-width: 380px) {
      .date-range-selector {
        flex-direction: column;
        gap: 8px;
      }
      
      .summary-value {
        font-size: 1rem;
      }
      
      .trip-stats {
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  `]
})
export class HistoryPage implements OnInit {
  // Estado de carga
  isLoading = signal(true);
  
  // Viajes
  allTrips = signal<Trip[]>([]);
  
  // Filtros
  showFilters = signal(true);
  searchQuery = '';
  startDate: string;
  endDate: string;
  today: string;
  selectedPurpose: string = 'all';
  activeQuickFilter: string = 'month';
  
  // Paginación
  currentPage = 1;
  pageSize = 20;
  hasMoreData = true;

  // Computed: viajes filtrados
  filteredTrips = computed(() => {
    let trips = this.allTrips();
    
    // Filtrar por búsqueda
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      trips = trips.filter(trip => 
        trip.purpose?.toLowerCase().includes(query) ||
        this.formatDate(trip.startTime).toLowerCase().includes(query)
      );
    }
    
    // Filtrar por propósito
    if (this.selectedPurpose !== 'all') {
      trips = trips.filter(trip => trip.purpose === this.selectedPurpose);
    }
    
    // Filtrar por fecha
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      
      trips = trips.filter(trip => {
        const tripDate = new Date(trip.startTime);
        return tripDate >= start && tripDate <= end;
      });
    }
    
    return trips;
  });

  // Computed: total de millas
  totalMiles = computed(() => {
    return this.filteredTrips().reduce((sum, trip) => sum + (trip.distanceMiles || 0), 0);
  });

  // Computed: deducción total
  totalDeduction = computed(() => {
    return this.totalMiles() * environment.app.mileageRate;
  });

  constructor(
    private tripService: TripService,
    private router: Router
  ) {
    addIcons({
      calendarOutline, filterOutline, searchOutline, navigateOutline,
      timeOutline, carSportOutline, briefcaseOutline, medkitOutline,
      heartOutline, homeOutline, chevronForwardOutline, trashOutline,
      shareOutline, mapOutline, cashOutline, trendingUpOutline
    });
    
    // Inicializar fechas
    this.today = new Date().toISOString();
    this.endDate = this.today;
    this.startDate = startOfMonth(new Date()).toISOString();
  }

  async ngOnInit() {
    await this.loadTrips();
  }

  /**
   * Cargar viajes desde el servicio
   */
  async loadTrips() {
    this.isLoading.set(true);
    
    try {
      const trips = await firstValueFrom(this.tripService.getTrips());
      this.allTrips.set(trips);
      console.log('📋 Viajes cargados:', trips.length);
    } catch (error) {
      console.error('❌ Error cargando viajes:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Toggle panel de filtros
   */
  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  /**
   * Cambio en búsqueda
   */
  onSearchChange() {
    // El computed se actualiza automáticamente
  }

  /**
   * Cambio en fechas
   */
  onDateChange() {
    this.activeQuickFilter = '';
  }

  /**
   * Cambio en propósito
   */
  onPurposeChange() {
    // El computed se actualiza automáticamente
  }

  /**
   * Establecer filtro rápido de fecha
   */
  setQuickFilter(filter: string) {
    this.activeQuickFilter = filter;
    const now = new Date();
    
    switch (filter) {
      case 'today':
        this.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        this.endDate = this.today;
        break;
      case 'week':
        this.startDate = subDays(now, 7).toISOString();
        this.endDate = this.today;
        break;
      case 'month':
        this.startDate = startOfMonth(now).toISOString();
        this.endDate = endOfMonth(now).toISOString();
        break;
      case 'all':
        this.startDate = new Date('2020-01-01').toISOString();
        this.endDate = this.today;
        break;
    }
  }

  isQuickFilterActive(filter: string): boolean {
    return this.activeQuickFilter === filter;
  }

  /**
   * Limpiar filtros
   */
  resetFilters() {
    this.searchQuery = '';
    this.selectedPurpose = 'all';
    this.setQuickFilter('month');
  }

  /**
   * Pull to refresh
   */
  async handleRefresh(event: CustomEvent<RefresherEventDetail>) {
    await this.loadTrips();
    (event.target as HTMLIonRefresherElement).complete();
  }

  /**
   * Cargar más viajes (infinite scroll)
   */
  async loadMore(event: any) {
    // Simular carga de más datos
    setTimeout(() => {
      event.target.complete();
      
      // Desactivar si no hay más datos
      if (!this.hasMoreData) {
        event.target.disabled = true;
      }
    }, 1000);
  }

  /**
   * Ver detalle del viaje
   */
  viewTripDetail(trip: Trip) {
    this.router.navigate(['/trip', trip.id]);
  }

  /**
   * Compartir viaje
   */
  async shareTrip(trip: Trip) {
    console.log('Compartiendo viaje:', trip.id);
    // Implementar con Capacitor Share plugin
  }

  /**
   * Eliminar viaje
   */
  async deleteTrip(trip: Trip) {
    console.log('Eliminando viaje:', trip.id);
    // Implementar eliminación
  }

  /**
   * ============================================================
   * FUNCIONES DE FORMATO
   * ============================================================
   */
  
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return format(date, "d 'de' MMMM, yyyy - HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  calculateTripDeduction(miles: number): string {
    return (miles * environment.app.mileageRate).toFixed(2);
  }

  getPurposeIcon(purpose: TripPurpose): string {
    const icons: Record<TripPurpose, string> = {
      business: 'briefcase-outline',
      medical: 'medkit-outline',
      charity: 'heart-outline',
      moving: 'home-outline',
      personal: 'car-sport-outline'
    };
    return icons[purpose] || 'car-sport-outline';
  }

  getPurposeLabel(purpose: TripPurpose): string {
    const labels: Record<TripPurpose, string> = {
      business: 'Negocios',
      medical: 'Médico',
      charity: 'Caridad',
      moving: 'Mudanza',
      personal: 'Personal'
    };
    return labels[purpose] || 'Personal';
  }

  getStatusColor(status: TripStatus): string {
    const colors: Record<TripStatus, string> = {
      'in_progress': 'warning',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return colors[status] || 'medium';
  }

  getStatusLabel(status: TripStatus): string {
    const labels: Record<TripStatus, string> = {
      'in_progress': 'En curso',
      'completed': 'Completado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || 'Desconocido';
  }
}
