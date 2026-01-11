/**
 * TaxPro Mileage - Página de Dashboard
 * =====================================
 * Dashboard principal con:
 * - Tarjetas de estadísticas
 * - Gráfico de millas por día
 * - Lista de recorridos recientes
 * - Accesos rápidos
 */

import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonSkeletonText,
  IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  carOutline,
  timeOutline,
  cashOutline,
  trendingUpOutline,
  navigateOutline,
  chevronForwardOutline,
  calendarOutline,
  speedometerOutline
} from 'ionicons/icons';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { TripService } from '../../services/trip.service';
import { GpsTrackingService } from '../../services/gps-tracking.service';
import { User, UserStatistics, Trip, DailyMileage } from '../../models/interfaces';
import { environment } from '../../../environments/environment';

// Registrar componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButton,
    IonSkeletonText,
    IonChip
  ],
  template: `
    <ion-header class="header-gradient">
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <!-- Pull to Refresh -->
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Saludo y nombre del usuario -->
      <div class="dashboard-header">
        <p class="welcome-text">{{ getGreeting() }}</p>
        <h1 class="user-name">{{ user?.firstName || 'Usuario' }}</h1>
      </div>

      <!-- Grid de estadísticas principales -->
      <div class="stats-grid">
        
        <!-- Millas este mes -->
        <div class="stat-card">
          <div class="stat-content">
            @if (isLoading) {
              <ion-skeleton-text [animated]="true" style="width: 80px; height: 32px;"></ion-skeleton-text>
            } @else {
              <div class="stat-value">{{ statistics?.milesThisMonth | number:'1.1-1' }}</div>
            }
            <div class="stat-label">Millas este mes</div>
          </div>
          <ion-icon name="car-outline" class="stat-icon"></ion-icon>
        </div>

        <!-- Recorridos este mes -->
        <div class="stat-card stat-card-secondary">
          <div class="stat-content">
            @if (isLoading) {
              <ion-skeleton-text [animated]="true" style="width: 60px; height: 32px;"></ion-skeleton-text>
            } @else {
              <div class="stat-value">{{ statistics?.tripsThisMonth }}</div>
            }
            <div class="stat-label">Recorridos</div>
          </div>
          <ion-icon name="navigate-outline" class="stat-icon"></ion-icon>
        </div>

        <!-- Deducción estimada -->
        <div class="stat-card stat-card-secondary">
          <div class="stat-content">
            @if (isLoading) {
              <ion-skeleton-text [animated]="true" style="width: 80px; height: 32px;"></ion-skeleton-text>
            } @else {
              <div class="stat-value">{{ getMonthlyDeduction() | currency:'USD':'symbol':'1.2-2' }}</div>
            }
            <div class="stat-label">Deducción est.</div>
          </div>
          <ion-icon name="cash-outline" class="stat-icon"></ion-icon>
        </div>

        <!-- Millas esta semana -->
        <div class="stat-card stat-card-secondary">
          <div class="stat-content">
            @if (isLoading) {
              <ion-skeleton-text [animated]="true" style="width: 60px; height: 32px;"></ion-skeleton-text>
            } @else {
              <div class="stat-value">{{ statistics?.milesThisWeek | number:'1.1-1' }}</div>
            }
            <div class="stat-label">Esta semana</div>
          </div>
          <ion-icon name="trending-up-outline" class="stat-icon"></ion-icon>
        </div>

      </div>

      <!-- Botón de iniciar tracking -->
      <div class="quick-action">
        <ion-button 
          expand="block" 
          class="btn-taxpro btn-start-tracking"
          [routerLink]="['/tabs/tracking']"
        >
          <ion-icon slot="start" name="navigate-outline"></ion-icon>
          @if (isTrackingActive) {
            Ver Tracking Activo
          } @else {
            Iniciar Nuevo Recorrido
          }
        </ion-button>
      </div>

      <!-- Gráfico de millas diarias -->
      <div class="chart-container">
        <h3 class="chart-title">
          <ion-icon name="calendar-outline"></ion-icon>
          Millas últimos 7 días
        </h3>
        <div class="chart-wrapper">
          <canvas #chartCanvas></canvas>
        </div>
      </div>

      <!-- Recorridos recientes -->
      <div class="recent-trips-section">
        <div class="recent-trips-title">
          <h3>
            <ion-icon name="time-outline"></ion-icon>
            Recorridos Recientes
          </h3>
          <a [routerLink]="['/tabs/history']">Ver todos</a>
        </div>

        <ion-list lines="none">
          @if (isLoading) {
            @for (i of [1, 2, 3]; track i) {
              <ion-item class="trip-item">
                <ion-skeleton-text [animated]="true" style="width: 100%; height: 60px;"></ion-skeleton-text>
              </ion-item>
            }
          } @else if (recentTrips.length === 0) {
            <div class="empty-state">
              <ion-icon name="car-outline"></ion-icon>
              <p>No hay recorridos aún</p>
              <small>Inicia tu primer recorrido ahora</small>
            </div>
          } @else {
            @for (trip of recentTrips; track trip.id) {
              <ion-item 
                class="trip-item" 
                [routerLink]="['/trip', trip.id]"
                [detail]="true"
              >
                <div class="trip-icon" slot="start">
                  <ion-icon name="car-outline"></ion-icon>
                </div>
                <ion-label>
                  <h2 class="trip-distance">{{ trip.distanceMiles | number:'1.2-2' }} mi</h2>
                  <p class="trip-date">{{ formatDate(trip.startTime) }}</p>
                  <p class="trip-duration">{{ formatDuration(trip.durationSeconds) }}</p>
                </ion-label>
                <ion-chip slot="end" [color]="getPurposeColor(trip.purpose)">
                  {{ getPurposeLabel(trip.purpose) }}
                </ion-chip>
              </ion-item>
            }
          }
        </ion-list>
      </div>

      <!-- Estadísticas anuales -->
      <div class="yearly-stats">
        <h3 class="section-title">
          <ion-icon name="speedometer-outline"></ion-icon>
          Resumen Anual
        </h3>
        <div class="yearly-stats-grid">
          <div class="yearly-stat">
            <span class="yearly-value">{{ statistics?.totalMiles | number:'1.0-0' }}</span>
            <span class="yearly-label">Millas totales</span>
          </div>
          <div class="yearly-stat">
            <span class="yearly-value">{{ statistics?.totalTrips }}</span>
            <span class="yearly-label">Recorridos</span>
          </div>
          <div class="yearly-stat">
            <span class="yearly-value">{{ statistics?.totalDeductionAmount | currency:'USD':'symbol':'1.0-0' }}</span>
            <span class="yearly-label">Deducción total</span>
          </div>
        </div>
      </div>

      <!-- Espacio inferior para el tab bar -->
      <div style="height: 80px;"></div>

    </ion-content>
  `,
  styles: [`
    .dashboard-header {
      padding: 24px 16px 16px;
      background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
      color: white;
      margin-bottom: -40px;
      padding-bottom: 60px;
    }

    .welcome-text {
      font-size: 0.875rem;
      opacity: 0.8;
      margin: 0 0 4px 0;
    }

    .user-name {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 0 16px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      position: relative;
      overflow: hidden;
    }

    .stat-card:first-child {
      grid-column: span 2;
      background: linear-gradient(135deg, #1a365d 0%, #3182ce 100%);
      color: white;
    }

    .stat-card:first-child .stat-value {
      font-size: 2.5rem;
    }

    .stat-content {
      position: relative;
      z-index: 1;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 4px;
      color: #1a365d;
    }

    .stat-card:first-child .stat-value {
      color: white;
    }

    .stat-label {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .stat-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 3rem;
      opacity: 0.15;
    }

    .stat-card:first-child .stat-icon {
      opacity: 0.2;
    }

    .quick-action {
      padding: 0 16px;
      margin-bottom: 24px;
    }

    .btn-start-tracking {
      --background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
      --border-radius: 16px;
      height: 56px;
      font-size: 1rem;
    }

    .chart-container {
      background: white;
      border-radius: 16px;
      padding: 16px;
      margin: 0 16px 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .chart-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0 0 16px 0;
    }

    .chart-title ion-icon {
      color: #3182ce;
    }

    .chart-wrapper {
      height: 200px;
    }

    .recent-trips-section {
      margin: 0 16px 24px;
    }

    .recent-trips-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .recent-trips-title h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0;
    }

    .recent-trips-title a {
      font-size: 0.875rem;
      color: #3182ce;
      text-decoration: none;
    }

    .trip-item {
      --background: white;
      --border-radius: 12px;
      margin-bottom: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .trip-icon {
      width: 40px;
      height: 40px;
      background: #edf2f7;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
    }

    .trip-icon ion-icon {
      font-size: 1.25rem;
      color: #1a365d;
    }

    .trip-distance {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0;
    }

    .trip-date {
      font-size: 0.875rem;
      color: #718096;
      margin: 4px 0 2px;
    }

    .trip-duration {
      font-size: 0.75rem;
      color: #a0aec0;
      margin: 0;
    }

    ion-chip {
      --background: #edf2f7;
      font-size: 0.7rem;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      background: white;
      border-radius: 12px;
    }

    .empty-state ion-icon {
      font-size: 3rem;
      color: #cbd5e0;
      margin-bottom: 12px;
    }

    .empty-state p {
      color: #718096;
      margin: 0 0 4px;
    }

    .empty-state small {
      color: #a0aec0;
    }

    .yearly-stats {
      background: white;
      border-radius: 16px;
      padding: 16px;
      margin: 0 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0 0 16px 0;
    }

    .yearly-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .yearly-stat {
      text-align: center;
    }

    .yearly-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
      color: #1a365d;
      margin-bottom: 4px;
    }

    .yearly-label {
      font-size: 0.75rem;
      color: #718096;
    }
  `]
})
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private authService = inject(AuthService);
  private tripService = inject(TripService);
  private trackingService = inject(GpsTrackingService);
  private router = inject(Router);

  private subscriptions: Subscription[] = [];
  private chart: Chart | null = null;

  user: User | null = null;
  statistics: UserStatistics | null = null;
  recentTrips: Trip[] = [];
  dailyMileage: DailyMileage[] = [];
  isLoading = true;
  isTrackingActive = false;

  constructor() {
    addIcons({
      carOutline,
      timeOutline,
      cashOutline,
      trendingUpOutline,
      navigateOutline,
      chevronForwardOutline,
      calendarOutline,
      speedometerOutline
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupSubscriptions();
  }

  ngAfterViewInit(): void {
    // Esperar un momento para que el canvas esté listo
    setTimeout(() => {
      this.createChart();
    }, 500);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private setupSubscriptions(): void {
    // Suscribirse al usuario actual
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.user = user;
      })
    );

    // Suscribirse al estado del tracking
    this.subscriptions.push(
      this.trackingService.trackingState$.subscribe(state => {
        this.isTrackingActive = state.isTracking;
      })
    );

    // Suscribirse a las estadísticas
    this.subscriptions.push(
      this.tripService.statistics$.subscribe(stats => {
        this.statistics = stats;
      })
    );
  }

  async loadData(): Promise<void> {
    this.isLoading = true;

    try {
      // Cargar estadísticas
      await this.tripService.getStatistics().toPromise();

      // Cargar recorridos recientes
      this.recentTrips = this.tripService.getRecentTrips();

      // Cargar millas diarias
      const dailyData = await this.tripService.getDailyMileage(7).toPromise();
      this.dailyMileage = dailyData || [];

      // Actualizar gráfico si existe
      if (this.chart) {
        this.updateChart();
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async handleRefresh(event: any): Promise<void> {
    await this.loadData();
    event.target.complete();
  }

  /**
   * Crea el gráfico de millas diarias
   */
  private createChart(): void {
    if (!this.chartCanvas?.nativeElement) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.dailyMileage.map(d => this.formatDayLabel(d.date));
    const data = this.dailyMileage.map(d => d.miles);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Millas',
          data,
          backgroundColor: 'rgba(49, 130, 206, 0.8)',
          borderColor: '#3182ce',
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 24
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1a365d',
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const y = context?.parsed?.y;
                if (typeof y === 'number') {
                  return `${y.toFixed(1)} millas`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#718096',
              font: {
                size: 11
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#edf2f7'
            },
            ticks: {
              color: '#718096',
              font: {
                size: 11
              }
            }
          }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) {
      this.createChart();
      return;
    }

    const labels = this.dailyMileage.map(d => this.formatDayLabel(d.date));
    const data = this.dailyMileage.map(d => d.miles);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;
    this.chart.update();
  }

  // ===========================================
  // UTILIDADES DE FORMATO
  // ===========================================

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getMonthlyDeduction(): number {
    const miles = this.statistics?.milesThisMonth || 0;
    return miles * environment.app.mileageRate;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  formatDayLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  getPurposeLabel(purpose: string): string {
    const labels: Record<string, string> = {
      'business': 'Negocio',
      'medical': 'Médico',
      'charity': 'Caridad',
      'moving': 'Mudanza',
      'personal': 'Personal'
    };
    return labels[purpose] || purpose;
  }

  getPurposeColor(purpose: string): string {
    const colors: Record<string, string> = {
      'business': 'primary',
      'medical': 'danger',
      'charity': 'success',
      'moving': 'warning',
      'personal': 'medium'
    };
    return colors[purpose] || 'medium';
  }
}
