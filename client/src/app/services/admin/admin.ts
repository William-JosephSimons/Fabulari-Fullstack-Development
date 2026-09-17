import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class Admin {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly serverUrl = 'http://localhost:3000';

  getDashboardSummary() {
    return this.http.get(`${this.serverUrl}/api/admin/dashboard`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  getUsers(search: string, skip: number, limit: number) {
    return this.http.get(`${this.serverUrl}/api/admin/users`, {
      headers: this.auth.getAuthHeaders(),
      params: { search, skip, limit },
    });
  }

  getSystemBans(search: string, skip: number, limit: number) {
    return this.http.get(`${this.serverUrl}/api/admin/system-bans`, {
      headers: this.auth.getAuthHeaders(),
      params: { search, skip, limit },
    });
  }
}
