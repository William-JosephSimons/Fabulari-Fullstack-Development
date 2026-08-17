import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly serverUrl = 'http://localhost:3000';
  private readonly storageKey = 'currentUser';

  login(loginDetails: object) {
    return this.http.post(`${this.serverUrl}/api/login`, loginDetails);
  }

  register(registrationDetails: object) {
    return this.http.post(`${this.serverUrl}/api/register`, registrationDetails);
  }

  getBootstrapStatus() {
    return this.http.get(`${this.serverUrl}/api/bootstrap-status`);
  }

  createSuperAdmin(setupDetails: object) {
    return this.http.post(`${this.serverUrl}/api/bootstrap`, setupDetails);
  }

  saveCurrentUser(user: object): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  getCurrentUser() {
    const storedUser = localStorage.getItem(this.storageKey);

    return storedUser ? JSON.parse(storedUser) : null;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
}
