import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Audit {
  private readonly http = inject(HttpClient);
  private readonly serverUrl = 'http://localhost:3000';

  getAuditLogs(
    userId: string,
    actionType: string,
    startDate: string,
    endDate: string
  ) {
    return this.http.get(`${this.serverUrl}/api/audit-logs`, {
      params: { userId, actionType, startDate, endDate },
    });
  }
}
