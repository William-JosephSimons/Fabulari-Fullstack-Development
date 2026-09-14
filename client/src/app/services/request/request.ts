import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class Request {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly serverUrl = 'http://localhost:3000';

  getMyRequests() {
    return this.http.get(`${this.serverUrl}/api/requests/mine`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  getAdminRequests() {
    return this.http.get(`${this.serverUrl}/api/admin/requests`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  getGroupRequests(groupId: string) {
    return this.http.get(`${this.serverUrl}/api/groups/${groupId}/requests`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  decideRequest(requestId: string, decisionDetails: object) {
    return this.http.put(
      `${this.serverUrl}/api/requests/${requestId}/decision`,
      decisionDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }
}
