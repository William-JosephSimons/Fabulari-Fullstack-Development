import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Request {
  private readonly http = inject(HttpClient);
  private readonly serverUrl = 'http://localhost:3000';

  getAdminRequests(userId: string) {
    return this.http.get(`${this.serverUrl}/api/admin/requests`, {
      params: { userId },
    });
  }

  decideRequest(requestId: string, decisionDetails: object) {
    return this.http.put(
      `${this.serverUrl}/api/requests/${requestId}/decision`,
      decisionDetails
    );
  }
}
