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
  shareOutline, mapOutline, cashOutline, trendingUpOutline, gridOutline
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
    IonCard, IonCardContent, IonItem, IonLabel,
    IonList, IonChip, IonBadge, IonSearchbar, IonSegment, IonSegmentButton,
    IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent,
    IonDatetime, IonDatetimeButton, IonModal, IonNote,
    IonItemSliding, IonItemOptions, IonItemOption, IonButtons, IonSkeletonText
  ],
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss'
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
  viewMode: 'list' | 'calendar' = 'list';

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
      shareOutline, mapOutline, cashOutline, trendingUpOutline, gridOutline
    });

    // Inicializar fechas
    this.today = new Date().toISOString();
    this.endDate = this.today;
    this.startDate = startOfMonth(new Date()).toISOString();
  }

  setViewMode(mode: 'list' | 'calendar') {
    this.viewMode = mode;
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
