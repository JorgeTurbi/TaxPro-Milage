/**
 * TaxPro Mileage - Página de Dashboard
 * =====================================
 * Dashboard principal con:
 * - Tarjetas de estadísticas
 * - Gráfico de millas por día
 * - Lista de recorridos recientes
 * - Accesos rápidos
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
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
  IonChip,
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
  speedometerOutline,
  searchOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { Chart, registerables } from 'chart.js';
import { Subscription, Observable } from 'rxjs';

import { CustomerAuthService } from '../../services/customer-auth.service';
import { TripService } from '../../services/trip.service';
import { GpsTrackingService } from '../../services/gps-tracking.service';
import {
  User,
  UserStatistics,
  Trip,
  DailyMileage,
  TripProfileData,
  IIRSConfiguration,
} from '../../models/interfaces';
import { ICustomerProfile } from '../../models/customer-login.interface';
import { environment } from '../../../environments/environment';
import { CustomerTokenService } from '../../services/customer-token.service';
import { TrackingApiService } from '../../services/tracking-api.service';
import { Preferences } from '@capacitor/preferences';

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
    IonChip,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private authService = inject(CustomerAuthService);
  private customerTokenService: CustomerTokenService =
    inject(CustomerTokenService);
  private vehicleService: TrackingApiService = inject(TrackingApiService);
  private tripService = inject(TripService);
  private trackingService = inject(GpsTrackingService);
  private router = inject(Router);

  private subscriptions: Subscription[] = [];
  private chart: Chart | null = null;
  monthlyDeduction: number = 0;
  user: ICustomerProfile | null = null;
  statistics: UserStatistics | null = null;
  recentTrips: Trip[] = [];
  dailyMileage: DailyMileage[] = [];
  isLoading = true;
  isTrackingActive = true; // Demo: set to true to show tracking widget

  // Datos de demostración para el widget estilo Uber
  demoTrip: Trip = {
    id: 'demo-1',
    customerid: 'user-1',
    companyid: 'company-1',
    startTime: new Date().toISOString(),
    endTime: new Date(new Date().getTime() + 25 * 60000).toISOString(),
    status: 'Completed',
    purpose: 'business',
    distanceMiles: 8.52,
    distanceKm: 13.71,
    durationSeconds: 1543,
    startLocation: {
      latitude: 37.7749,
      longitude: -122.4194,
      timestamp: Date.now(),
    },
    startAddress: '123 Market St, San Francisco, CA',
    endAddress: '456 Tech Park Blvd, Palo Alto, CA',
    route: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  constructor() {
    addIcons({
      carOutline,
      timeOutline,
      cashOutline,
      trendingUpOutline,
      navigateOutline,
      chevronForwardOutline,
      calendarOutline,
      speedometerOutline,
      searchOutline,
      notificationsOutline,
    });
  }

  ngOnInit(): void {
    const decodedToken = this.customerTokenService.decodeToken();

    if (!decodedToken) {
      throw new Error('No se pudo decodificar el token JWT');
    }

    const customerId = decodedToken.nameid;
    const companyId = decodedToken.companyId;

    if (!customerId || !companyId) {
      throw new Error('CustomerId o CompanyId no encontrado en el token');
    }

    const data = { customerId, companyId };

    this.loadIRSConfiguration(data);
    this.setupSubscriptions();
    this.loadUserProfile();
    this.loadData();
  }

  private loadIRSConfiguration(payload: TripProfileData) {
    this.tripService.getIRSConfiguration(payload).subscribe({
      next: (response: IIRSConfiguration) => {
        Preferences.set({
          key: 'irsConfiguration',
          value: JSON.stringify(response),
        });
        console.log('IRS Configuration:', response);
      },
      error: (error) => {
        console.error('Error al obtener la configuración IRS:', error);
      },
    });
  }

  /**
   * Carga el perfil del usuario si no está disponible
   */
  private loadUserProfile(): void {
    // Si no hay usuario cargado, intentar cargarlo
    if (!this.authService.getCurrentCustomer()) {
      this.authService.loadCustomerProfile().subscribe({
        next: (customer) => {
          console.log('Perfil cargado en dashboard:', customer?.firstName);
        },
        error: (err) => {
          console.error('Error cargando perfil en dashboard:', err);
        },
      });
    }
  }

  // ngAfterViewInit(): void {
  //   // Esperar un momento para que el canvas esté listo
  //   setTimeout(() => {
  //     this.createChart();
  //   }, 500);
  // }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private setupSubscriptions(): void {
    // Suscribirse al usuario actual
    this.subscriptions.push(
      this.authService.currentCustomer$.subscribe(
        (customer: ICustomerProfile | null) => {
          this.user = customer;
        }
      )
    );

    // Suscribirse al estado del tracking
    this.subscriptions.push(
      this.trackingService.trackingState$.subscribe((state) => {
        this.isTrackingActive = state.isTracking;
      })
    );

    // Suscribirse a las estadísticas
    this.subscriptions.push(
      this.tripService.statistics$.subscribe((stats) => {
        this.statistics = stats;
      })
    );
  }

  async loadData(): Promise<void> {
    this.isLoading = true;

    try {
      const decodedToken = this.customerTokenService.decodeToken();

      if (!decodedToken) {
        throw new Error('No se pudo decodificar el token JWT');
      }

      const customerId = decodedToken.nameid;
      const companyId = decodedToken.companyId;

      if (!customerId || !companyId) {
        throw new Error('CustomerId o CompanyId no encontrado en el token');
      }

      const data = { customerId, companyId };

      this.vehicleService.getProfileVehicle(data).subscribe({
        next: (vehicle) => {
          if (vehicle && vehicle.id) {
          }
          const tripProfileData: TripProfileData = {
            customerId: data.customerId,
            companyId: data.companyId,
          };

          this.getStaticSevenDaysMileage(tripProfileData);

          console.log(
            'Cargando estadísticas de millas para los últimos 7 días con:',
            tripProfileData
          );
          console.log('Vehículo perfil cargado:', vehicle);
        },
        error: (error) => {
          console.error('Error cargando vehículo perfil:', error);
        },
      });

      await this.tripService
        .getTrips({
          page: 1,
          limit: 10,
          sortBy: 'date',
          sortOrder: 'desc',
        })
        .toPromise();

      // Cargar estadísticas
      await this.tripService.getStatistics().toPromise();

      // Obtener recorridos recientes del cache (ya poblado)
      this.recentTrips = this.tripService.getRecentTrips();

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

  getStaticSevenDaysMileage(tripProfileData: TripProfileData) {
    this.tripService.getMileSevenDays(tripProfileData).subscribe({
      next: (dailyData: DailyMileage[]) => {
        this.dailyMileage = dailyData;
        console.log(
          'Datos de millas diarias para los últimos 7 días:',
          this.dailyMileage
        );
        this.updateChart();
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
      },
    });
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

    const labels = this.dailyMileage.map((d) => this.formatDayLabel(d.day));
    const data = this.dailyMileage.map((d) => d.miles);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Millas',
            data,
            backgroundColor: 'rgba(49, 130, 206, 0.8)',
            borderColor: '#3182ce',
            borderWidth: 1,
            borderRadius: 8,
            barThickness: 24,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
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
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#718096',
              font: {
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#edf2f7',
            },
            ticks: {
              color: '#718096',
              font: {
                size: 11,
              },
            },
          },
        },
      },
    });
  }

  private updateChart(): void {
    if (!this.chart) {
      this.createChart();
      return;
    }

    const labels = this.dailyMileage.map((d) => this.formatDayLabel(d.day));
    const data = this.dailyMileage.map((d) => d.miles);

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

  async ionViewWillEnter() {
    this.monthlyDeduction = await this.getMonthlyDeduction();
  }

  async getMonthlyDeduction(): Promise<number> {
    const valor = await this.tripService.getStatisticsFromCache();
    console.log('Valor de estadísticas desde cache:==============>', valor);
    const miles = valor.milesThisMonth || 0;
    const { value } = await Preferences.get({ key: 'irsConfiguration' });

    const irsConfiguration: IIRSConfiguration = value
      ? JSON.parse(value)
      : null;
    if (!irsConfiguration) {
      return 0;
    }
    console.log('==========>', miles * Number(irsConfiguration.mileageRate));
    return miles * Number(irsConfiguration.mileageRate);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  // formatDayLabel(dateStr: string): string {
  //   const date = new Date(dateStr);
  //   return date.toLocaleDateString('es-ES', { weekday: 'short' });
  // }

  formatDayLabel(dateStr: string): string {
    // Parse date manually to avoid UTC conversion
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create Date in local timezone (month is 0-indexed)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
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
      business: 'Negocio',
      medical: 'Médico',
      moving: 'Mudanza',
      personal: 'Personal',
    };
    return labels[purpose] || purpose;
  }

  getPurposeColor(purpose: string): string {
    const colors: Record<string, string> = {
      business: 'primary',
      medical: 'danger',
      charity: 'success',
      moving: 'warning',
      personal: 'medium',
    };
    return colors[purpose] || 'medium';
  }
}
