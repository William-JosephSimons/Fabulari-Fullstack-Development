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

  saveCurrentUser(user: object): void {
    // Local storage accepts strings, so the user object is converted to JSON.
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  getCurrentUser() {
    const storedUser = localStorage.getItem(this.storageKey);

    // JSON.parse changes the stored string back into a user object.
    return storedUser ? JSON.parse(storedUser) : null;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
}
