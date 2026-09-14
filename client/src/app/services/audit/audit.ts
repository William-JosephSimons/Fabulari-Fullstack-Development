import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class Audit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly serverUrl = 'http://localhost:3000';

  getAuditLogs(
    actionType: string,
    startDate: string,
    endDate: string
  ) {
    return this.http.get(`${this.serverUrl}/api/audit-logs`, {
      headers: this.auth.getAuthHeaders(),
      params: { actionType, startDate, endDate },
    });
  }
}
