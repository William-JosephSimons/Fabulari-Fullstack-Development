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

  // Load the counts displayed on the Super Admin dashboard.
  getDashboardSummary() {
    return this.http.get(`${this.serverUrl}/api/admin/dashboard`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Search and load one page of safe user records.
  getUsers(search: string, skip: number, limit: number) {
    return this.http.get(`${this.serverUrl}/api/admin/users`, {
      headers: this.auth.getAuthHeaders(),
      params: { search, skip, limit },
    });
  }

  // Search and load one page of permanent system bans.
  getSystemBans(search: string, skip: number, limit: number) {
    return this.http.get(`${this.serverUrl}/api/admin/system-bans`, {
      headers: this.auth.getAuthHeaders(),
      params: { search, skip, limit },
    });
  }
}
