import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { ITrackingPayloadDto } from '../models/ITrackingPayloadDto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TrackingApiService {
  private autoSaveSubscription?: Subscription;
  url: string = environment.apiUrl + environment.endpoints.mileageLog;
  constructor(private http: HttpClient) {}

  registerTracking(payload: ITrackingPayloadDto) {
    // Ajusta el endpoint si tu API usa otro path
    return this.http.post(this.url, payload);
  }

  startAutoRegister(
    getPayload: () => ITrackingPayloadDto,
    intervalMs: number = 10000
  ) {
    this.stopAutoRegister();

    this.autoSaveSubscription = interval(intervalMs).subscribe(() => {
      const payload = getPayload();

      // Si no está tracking o está pausado, no enviamos
      if (!payload.isTracking || payload.isPaused) return;

      this.registerTracking(payload).subscribe({
        next: () => console.log('📡 Tracking enviado'),
        error: (err) => console.error('❌ Error enviando tracking', err),
      });
    });
  }

  stopAutoRegister() {
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
      this.autoSaveSubscription = undefined;
    }
  }
}
