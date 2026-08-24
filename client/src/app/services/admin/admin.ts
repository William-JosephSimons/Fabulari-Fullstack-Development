import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Admin {
  private readonly http = inject(HttpClient);
  private readonly serverUrl = 'http://localhost:3000';

  getDashboardSummary(userId: string) {
    return this.http.get(`${this.serverUrl}/api/admin/dashboard`, {
      params: { userId },
    });
  }

  getUsers(userId: string) {
    return this.http.get(`${this.serverUrl}/api/admin/users`, {
      params: { userId },
    });
  }

  getSystemBans(userId: string) {
    return this.http.get(`${this.serverUrl}/api/admin/system-bans`, {
      params: { userId },
    });
  }
}
